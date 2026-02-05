import type { XrayNodeData, RoutingData, BalancerData, EdgeData } from '@/types';
import type { XrayNode, XrayEdge } from '@/store';

// ── Simulation Input ──

export interface SimulationInput {
  domain: string;
  protocol: 'tcp' | 'udp';
  port: number;
  inboundTag: string;
}

// ── Simulation Step ──

export interface SimulationStep {
  nodeId: string;
  tag: string;
  nodeType: string;
  description: string;
}

// ── Simulation Result ──

export interface SimulationResult {
  success: boolean;
  path: SimulationStep[];
  highlightNodeIds: string[];
  highlightEdgeIds: string[];
  finalOutbound: string | null;
  explanation: string;
}

// ── Routing Rule Matching ──

function matchDomainRule(rule: string, domain: string): boolean {
  const lower = domain.toLowerCase();

  if (rule.startsWith('regexp:')) {
    try {
      const regex = new RegExp(rule.slice(7), 'i');
      return regex.test(lower);
    } catch {
      return false;
    }
  }

  if (rule.startsWith('domain:')) {
    const target = rule.slice(7).toLowerCase();
    return lower === target || lower.endsWith('.' + target);
  }

  if (rule.startsWith('full:')) {
    return lower === rule.slice(5).toLowerCase();
  }

  if (rule.startsWith('geosite:')) {
    // Simplified geosite matching — in a real implementation this would
    // reference a geosite database. We match common patterns.
    const geo = rule.slice(8).toLowerCase();
    if (geo === 'google') return /google\.|youtube\.|gmail\.|gstatic\./i.test(lower);
    if (geo === 'facebook') return /facebook\.|fb\.|instagram\.|whatsapp\./i.test(lower);
    if (geo === 'twitter') return /twitter\.|x\.com|twimg\./i.test(lower);
    if (geo === 'cn' || geo === 'geolocation-cn') return /\.cn$|baidu\.|qq\.|taobao\.|alibaba\./i.test(lower);
    if (geo === 'category-ads' || geo === 'category-ads-all') return false; // can't match ads by domain alone
    // For other geosite values, don't match (conservative)
    return false;
  }

  // Plain domain (treated as suffix match)
  const target = rule.toLowerCase();
  return lower === target || lower.endsWith('.' + target);
}

function matchIpRule(_rule: string, _domain: string): boolean {
  // IP-based rules can't be matched against a domain name in simulation.
  // In a real xray, sniffing would resolve the domain first.
  // For geoip rules, we can't resolve DNS client-side.
  // Return false — IP rules only match if we have an IP input.
  return false;
}

function matchPortRule(rule: string, port: number): boolean {
  // Port rule can be "80", "80-443", "80,443,8080"
  const parts = rule.split(',');
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.includes('-')) {
      const [start, end] = trimmed.split('-').map(Number);
      if (!isNaN(start!) && !isNaN(end!) && port >= start! && port <= end!) return true;
    } else {
      if (Number(trimmed) === port) return true;
    }
  }
  return false;
}

function matchProtocolRule(rules: string[], protocol: string): boolean {
  return rules.some((r) => r.toLowerCase() === protocol.toLowerCase());
}

function doesRoutingMatch(routing: RoutingData, input: SimulationInput, sourceInboundTag: string): boolean {
  // Check inboundTag filter
  if (routing.inboundTag && routing.inboundTag !== sourceInboundTag) {
    return false;
  }

  let hasRules = false;
  let matched = true;

  // Domain rules (OR logic — any match is sufficient)
  if (routing.domain && routing.domain.length > 0) {
    hasRules = true;
    const domainMatch = routing.domain.some((rule) => matchDomainRule(rule, input.domain));
    if (!domainMatch) matched = false;
  }

  // IP rules
  if (routing.ip && routing.ip.length > 0) {
    hasRules = true;
    const ipMatch = routing.ip.some((rule) => matchIpRule(rule, input.domain));
    if (!ipMatch && !routing.domain?.length) matched = false;
  }

  // Port rules
  if (routing.port) {
    hasRules = true;
    if (!matchPortRule(routing.port, input.port)) matched = false;
  }

  // Protocol rules
  if (routing.protocol && routing.protocol.length > 0) {
    hasRules = true;
    if (!matchProtocolRule(routing.protocol, input.protocol)) matched = false;
  }

  // Network filter
  if (routing.network) {
    hasRules = true;
    if (routing.network !== input.protocol) matched = false;
  }

  // If no rules defined, it's a catch-all (matches everything)
  if (!hasRules) return true;

  return matched;
}

// ── Simulation Engine ──

function getOutgoingEdges(nodeId: string, edges: XrayEdge[]): XrayEdge[] {
  return edges
    .filter((e) => e.source === nodeId)
    .sort((a, b) => {
      const pa = (a.data as EdgeData | undefined)?.priority ?? 999;
      const pb = (b.data as EdgeData | undefined)?.priority ?? 999;
      return pa - pb;
    });
}

function getNodeById(nodeId: string, nodes: XrayNode[]): XrayNode | undefined {
  return nodes.find((n) => n.id === nodeId);
}

function describeNode(node: XrayNode): string {
  const d = node.data as XrayNodeData;
  switch (d.nodeType) {
    case 'device':
      return `Device (${d.connectionType})`;
    case 'inbound': {
      return `${d.protocol.toUpperCase()} INPUT :${d.port}`;
    }
    case 'routing': {
      const rules: string[] = [];
      if (d.domain?.length) rules.push(`domain: ${d.domain.slice(0, 2).join(', ')}${d.domain.length > 2 ? '...' : ''}`);
      if (d.ip?.length) rules.push(`ip: ${d.ip.slice(0, 2).join(', ')}${d.ip.length > 2 ? '...' : ''}`);
      if (d.port) rules.push(`port: ${d.port}`);
      if (d.protocol?.length) rules.push(`proto: ${d.protocol.join(', ')}`);
      if (d.network) rules.push(`net: ${d.network}`);
      return rules.length > 0 ? `Routing [${rules.join('; ')}]` : 'Routing [catch-all]';
    }
    case 'balancer':
      return `Balancer (${d.strategy})`;
    case 'outbound-terminal':
      return `${d.protocol.charAt(0).toUpperCase() + d.protocol.slice(1)} OUTPUT (terminal)`;
    case 'outbound-proxy':
      return `OUTPUT ${d.protocol.toUpperCase()} → ${d.serverAddress || '?'}:${d.serverPort || '?'}`;
  }
}

export function runSimulation(
  input: SimulationInput,
  nodes: XrayNode[],
  edges: XrayEdge[]
): SimulationResult {
  const path: SimulationStep[] = [];
  const highlightNodeIds: string[] = [];
  const highlightEdgeIds: string[] = [];
  const visited = new Set<string>();

  // Find starting inbound node by tag
  const startNode = nodes.find((n) => {
    const d = n.data as XrayNodeData;
    return d.nodeType === 'inbound' && d.tag === input.inboundTag;
  });

  if (!startNode) {
    return {
      success: false,
      path: [],
      highlightNodeIds: [],
      highlightEdgeIds: [],
      finalOutbound: null,
      explanation: `INPUT "${input.inboundTag}" not found.`,
    };
  }

  // Start tracing
  let currentNode: XrayNode | undefined = startNode;

  while (currentNode) {
    if (visited.has(currentNode.id)) {
      const cycleData = currentNode.data as XrayNodeData;
      path.push({
        nodeId: currentNode.id,
        tag: 'tag' in cycleData ? cycleData.tag : ('name' in cycleData ? cycleData.name : currentNode.id),
        nodeType: cycleData.nodeType,
        description: 'Cycle detected — stopping.',
      });
      return {
        success: false,
        path,
        highlightNodeIds,
        highlightEdgeIds,
        finalOutbound: null,
        explanation: 'Traffic entered a cycle. This is likely a misconfiguration.',
      };
    }

    visited.add(currentNode.id);
    const data = currentNode.data as XrayNodeData;
    highlightNodeIds.push(currentNode.id);

    path.push({
      nodeId: currentNode.id,
      tag: 'tag' in data ? data.tag : ('name' in data ? data.name : currentNode.id),
      nodeType: data.nodeType,
      description: describeNode(currentNode),
    });

    // Terminal outbound — end of path
    if (data.nodeType === 'outbound-terminal') {
      let action = 'Unknown';
      if (data.protocol === 'freedom') action = 'Direct connection to internet';
      else if (data.protocol === 'blackhole') action = 'Traffic blocked';
      else if (data.protocol === 'dns') action = 'DNS query forwarded';

      return {
        success: true,
        path,
        highlightNodeIds,
        highlightEdgeIds,
        finalOutbound: data.tag,
        explanation: `${action} via "${data.tag}".`,
      };
    }

    // Proxy outbound — follow chain to next inbound, or end here
    if (data.nodeType === 'outbound-proxy') {
      const outgoing = getOutgoingEdges(currentNode.id, edges);
      if (outgoing.length > 0) {
        const nextEdge = outgoing[0]!;
        const nextNode = getNodeById(nextEdge.target, nodes);
        if (nextNode) {
          const nextData = nextNode.data as XrayNodeData;
          if (nextData.nodeType === 'inbound') {
            highlightEdgeIds.push(nextEdge.id);
            // Continue tracing from the chained inbound — the loop
            // will process it normally (add to path, visited, etc.)
            currentNode = nextNode;
            continue;
          }
        }
      }

      return {
        success: true,
        path,
        highlightNodeIds,
        highlightEdgeIds,
        finalOutbound: data.tag,
        explanation: `Traffic forwarded to ${data.serverAddress || '?'}:${data.serverPort || '?'} via "${data.tag}".`,
      };
    }

    // Inbound or routing or balancer — find next hop
    const outgoing = getOutgoingEdges(currentNode.id, edges);

    if (outgoing.length === 0) {
      return {
        success: false,
        path,
        highlightNodeIds,
        highlightEdgeIds,
        finalOutbound: null,
        explanation: `Dead end at "${data.tag}" — no outgoing connections.`,
      };
    }

    // For inbound nodes: follow all edges (first routing that matches, or first direct)
    if (data.nodeType === 'inbound') {
      let nextEdge: XrayEdge | null = null;

      for (const edge of outgoing) {
        const targetNode = getNodeById(edge.target, nodes);
        if (!targetNode) continue;
        const targetData = targetNode.data as XrayNodeData;

        if (targetData.nodeType === 'routing') {
          // Check if routing matches
          if (doesRoutingMatch(targetData as RoutingData, input, data.tag)) {
            nextEdge = edge;
            break;
          }
        } else {
          // Direct connection to outbound/balancer — use as fallback
          if (!nextEdge) nextEdge = edge;
        }
      }

      if (!nextEdge) {
        return {
          success: false,
          path,
          highlightNodeIds,
          highlightEdgeIds,
          finalOutbound: null,
          explanation: `No routing rule matched for ${input.domain}:${input.port} (${input.protocol}) from "${data.tag}".`,
        };
      }

      highlightEdgeIds.push(nextEdge.id);
      currentNode = getNodeById(nextEdge.target, nodes);
      continue;
    }

    // For routing nodes: the routing already matched to get here,
    // now follow to the outbound/balancer it points to
    if (data.nodeType === 'routing') {
      const nextEdge = outgoing[0]!;
      highlightEdgeIds.push(nextEdge.id);
      currentNode = getNodeById(nextEdge.target, nodes);
      continue;
    }

    // For balancer nodes: pick one outbound based on strategy
    if (data.nodeType === 'balancer') {
      const balancerData = data as BalancerData;

      // Find outgoing edges that go to outbound nodes matching the selector
      const validTargets = outgoing.filter((edge) => {
        const targetNode = getNodeById(edge.target, nodes);
        if (!targetNode) return false;
        const targetData = targetNode.data as XrayNodeData;
        if (balancerData.selector.length === 0) return true;
        return balancerData.selector.some(
          (sel) => targetData.tag === sel || targetData.tag.includes(sel)
        );
      });

      if (validTargets.length === 0) {
        // Fall back to any outgoing edge
        const nextEdge = outgoing[0]!;
        highlightEdgeIds.push(nextEdge.id);
        currentNode = getNodeById(nextEdge.target, nodes);
        continue;
      }

      // Select based on strategy
      let selectedEdge: XrayEdge;
      switch (balancerData.strategy) {
        case 'random':
          selectedEdge = validTargets[Math.floor(Math.random() * validTargets.length)]!;
          break;
        case 'roundRobin':
          selectedEdge = validTargets[0]!; // simplified — always first in simulation
          break;
        case 'leastPing':
          selectedEdge = validTargets[0]!; // simplified — can't measure ping client-side
          break;
        default:
          selectedEdge = validTargets[0]!;
      }

      const selectedTarget = getNodeById(selectedEdge.target, nodes);
      if (selectedTarget) {
        path[path.length - 1]!.description += ` → selected: ${(selectedTarget.data as XrayNodeData).tag}`;
      }

      highlightEdgeIds.push(selectedEdge.id);
      currentNode = getNodeById(selectedEdge.target, nodes);
      continue;
    }

    // Shouldn't reach here
    break;
  }

  return {
    success: false,
    path,
    highlightNodeIds,
    highlightEdgeIds,
    finalOutbound: null,
    explanation: 'Simulation ended unexpectedly.',
  };
}
