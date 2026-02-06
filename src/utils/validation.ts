import type { Node, Edge } from '@xyflow/react';
import type { XrayNodeData, DeviceData, InboundData, RoutingData, BalancerData, OutboundData, TransportSettings, EdgeData, SimpleServerData, SimpleRulesData } from '@/types';

// ── Types ──

export type ValidationLevel = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  level: ValidationLevel;
  nodeId?: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  infos: ValidationIssue[];
}

type GraphNode = Node<XrayNodeData>;
type GraphEdge = Edge;

// ── Helpers ──

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IP_RE = /^(?:\d{1,3}\.){3}\d{1,3}$/;
const PORT_RANGE_RE = /^(\d+(-\d+)?)(,\d+(-\d+)?)*$/;

function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port >= 1 && port <= 65535;
}

function isValidIP(ip: string): boolean {
  if (ip === '0.0.0.0' || ip === '127.0.0.1') return true;
  if (!IP_RE.test(ip)) return false;
  return ip.split('.').every((octet) => {
    const n = parseInt(octet);
    return n >= 0 && n <= 255;
  });
}

// ── Node Validation ──

function validateInbound(node: GraphNode, data: InboundData, issues: ValidationIssue[]): void {
  const id = node.id;

  if (!data.tag || data.tag.trim() === '') {
    issues.push({ level: 'error', nodeId: id, message: 'INPUT node requires a tag' });
  }

  if (!isValidPort(data.port)) {
    issues.push({ level: 'error', nodeId: id, message: `Invalid port: ${data.port}. Must be 1-65535` });
  }

  if (data.listen && data.listen !== '0.0.0.0' && !isValidIP(data.listen)) {
    issues.push({ level: 'warning', nodeId: id, message: `Listen address "${data.listen}" may not be a valid IP` });
  }

  // Protocols that require users
  const needsUsers = ['vless', 'vmess', 'trojan'];
  if (needsUsers.includes(data.protocol)) {
    if (!data.users || data.users.length === 0) {
      issues.push({ level: 'warning', nodeId: id, message: `${data.protocol} INPUT has no users configured` });
    } else {
      data.users.forEach((user, i) => {
        if (['vless', 'vmess'].includes(data.protocol) && user.id && !UUID_RE.test(user.id)) {
          issues.push({ level: 'error', nodeId: id, message: `User ${i + 1} has invalid UUID: "${user.id}"` });
        }
        if (data.protocol === 'trojan' && (!user.password || user.password.trim() === '')) {
          issues.push({ level: 'error', nodeId: id, message: `User ${i + 1} requires a password for Trojan` });
        }
      });
    }
  }

}

function validateRouting(node: GraphNode, data: RoutingData, issues: ValidationIssue[]): void {
  const id = node.id;

  if (!data.tag || data.tag.trim() === '') {
    issues.push({ level: 'error', nodeId: id, message: 'Routing node requires a tag' });
  }

  const hasRules =
    (data.domain && data.domain.length > 0) ||
    (data.ip && data.ip.length > 0) ||
    data.port ||
    data.inboundTag ||
    data.network ||
    (data.protocol && data.protocol.length > 0);

  if (!hasRules) {
    issues.push({ level: 'warning', nodeId: id, message: 'Routing node has no rules defined' });
  }

  if (data.port && !PORT_RANGE_RE.test(data.port)) {
    issues.push({ level: 'error', nodeId: id, message: `Invalid port format: "${data.port}". Use "80,443" or "1000-2000"` });
  }
}

function validateBalancer(node: GraphNode, data: BalancerData, issues: ValidationIssue[]): void {
  const id = node.id;

  if (!data.tag || data.tag.trim() === '') {
    issues.push({ level: 'error', nodeId: id, message: 'Balancer node requires a tag' });
  }

  if (!data.selector || data.selector.length === 0) {
    issues.push({ level: 'warning', nodeId: id, message: 'Balancer has no selectors — connections will define targets' });
  }
}

function validateOutbound(node: GraphNode, data: OutboundData, nodeType: string, issues: ValidationIssue[]): void {
  const id = node.id;

  if (!data.tag || data.tag.trim() === '') {
    issues.push({ level: 'error', nodeId: id, message: 'OUTPUT node requires a tag' });
  }

  // Proxy outbounds require server address and port
  if (nodeType === 'outbound-proxy') {
    if (!data.serverAddress || data.serverAddress.trim() === '') {
      issues.push({ level: 'error', nodeId: id, message: 'Proxy OUTPUT requires a server address' });
    }
    if (!data.serverPort || !isValidPort(data.serverPort)) {
      issues.push({ level: 'error', nodeId: id, message: 'Proxy OUTPUT requires a valid server port (1-65535)' });
    }
  }
}

function validateSimpleServer(node: GraphNode, data: SimpleServerData, issues: ValidationIssue[]): void {
  const id = node.id;

  if (!data.host || data.host.trim() === '') {
    issues.push({ level: 'error', nodeId: id, message: 'Server requires a host address' });
  }

  if (!isValidPort(data.port)) {
    issues.push({ level: 'error', nodeId: id, message: `Invalid port: ${data.port}. Must be 1-65535` });
  }

  // UUID required for vless/vmess
  if (['vless', 'vmess'].includes(data.protocol)) {
    if (!data.uuid || data.uuid.trim() === '') {
      issues.push({ level: 'warning', nodeId: id, message: `${data.protocol} server should have a UUID configured` });
    } else if (!UUID_RE.test(data.uuid)) {
      issues.push({ level: 'error', nodeId: id, message: `Invalid UUID: "${data.uuid}"` });
    }
  }

  // Password required for trojan/shadowsocks
  if (['trojan', 'shadowsocks'].includes(data.protocol)) {
    if (!data.password || data.password.trim() === '') {
      issues.push({ level: 'warning', nodeId: id, message: `${data.protocol} server should have a password configured` });
    }
  }

  // Reality checks
  if (data.security === 'reality') {
    if (!['raw', 'xhttp'].includes(data.network)) {
      issues.push({ level: 'error', nodeId: id, message: `Reality security only works with RAW or XHTTP transport (currently: ${data.network})` });
    }
    if (!data.realityPublicKey) {
      issues.push({ level: 'error', nodeId: id, message: 'Reality security requires a public key' });
    }
  }

  // TLS checks
  if (data.security === 'tls') {
    if (!data.sni) {
      issues.push({ level: 'warning', nodeId: id, message: 'TLS security should have an SNI configured' });
    }
  }

  // WebSocket path
  if (data.network === 'ws' && !data.wsPath) {
    issues.push({ level: 'warning', nodeId: id, message: 'WebSocket transport should have a path configured' });
  }

  // gRPC service name
  if (data.network === 'grpc' && !data.grpcServiceName) {
    issues.push({ level: 'warning', nodeId: id, message: 'gRPC transport should have a service name configured' });
  }
}

function validateSimpleRules(_node: GraphNode, data: SimpleRulesData, issues: ValidationIssue[]): void {
  const id = _node.id;

  if (!data.rules || data.rules.length === 0) {
    issues.push({ level: 'warning', nodeId: id, message: 'Rules node has no rules defined — will match nothing' });
  } else {
    data.rules.forEach((rule, i) => {
      if (rule.type !== 'all' && (!rule.value || rule.value.trim() === '')) {
        issues.push({ level: 'error', nodeId: id, message: `Rule ${i + 1} (${rule.type}) has no value` });
      }
    });
  }
}

// ── Transport Validation ──

function validateTransport(nodeId: string, transport: TransportSettings, issues: ValidationIssue[]): void {
  // Reality only works with RAW (TCP) or XHTTP
  if (transport.security === 'reality' && !['raw', 'xhttp'].includes(transport.network)) {
    issues.push({
      level: 'error',
      nodeId,
      message: `Reality security only works with RAW or XHTTP transport (currently: ${transport.network})`,
    });
  }

  // WebSocket with TLS should have a path
  if (transport.network === 'ws') {
    if (!transport.wsSettings?.path) {
      issues.push({ level: 'warning', nodeId, message: 'WebSocket transport should have a path configured' });
    }
  }

  // gRPC requires serviceName
  if (transport.network === 'grpc') {
    if (!transport.grpcSettings?.serviceName) {
      issues.push({ level: 'warning', nodeId, message: 'gRPC transport should have a serviceName configured' });
    }
  }

  // TLS should have serverName
  if (transport.security === 'tls') {
    if (!transport.tlsSettings?.serverName) {
      issues.push({ level: 'warning', nodeId, message: 'TLS security should have a serverName configured' });
    }
  }

  // Reality requires publicKey and shortId
  if (transport.security === 'reality') {
    if (!transport.realitySettings?.publicKey) {
      issues.push({ level: 'error', nodeId, message: 'Reality security requires a publicKey' });
    }
    if (!transport.realitySettings?.shortId) {
      issues.push({ level: 'warning', nodeId, message: 'Reality security should have a shortId configured' });
    }
    if (!transport.realitySettings?.serverName) {
      issues.push({ level: 'warning', nodeId, message: 'Reality security should have a serverName configured' });
    }
  }
}

// ── Structural Validation ──

function validateStructure(nodes: GraphNode[], edges: GraphEdge[], issues: ValidationIssue[]): void {
  // Check for duplicate tags
  const tags = new Map<string, string[]>();
  nodes.forEach((node) => {
    const data = node.data as XrayNodeData;
    const tag = 'tag' in data ? data.tag : undefined;
    if (tag && tag.trim() !== '') {
      const existing = tags.get(tag) || [];
      existing.push(node.id);
      tags.set(tag, existing);
    }
  });

  tags.forEach((nodeIds, tag) => {
    if (nodeIds.length > 1) {
      nodeIds.forEach((id) => {
        issues.push({ level: 'error', nodeId: id, message: `Duplicate tag: "${tag}"` });
      });
    }
  });

  // Check for port conflicts (INPUT nodes on same server with same port)
  const portMap = new Map<string, string[]>();
  nodes.forEach((node) => {
    const data = node.data as XrayNodeData;
    if (data.nodeType === 'inbound') {
      const key = `${data.port}`;
      const existing = portMap.get(key) || [];
      existing.push(node.id);
      portMap.set(key, existing);
    }
  });

  portMap.forEach((nodeIds, port) => {
    if (nodeIds.length > 1) {
      nodeIds.forEach((id) => {
        issues.push({ level: 'error', nodeId: id, message: `Port conflict: port ${port} used by multiple INPUT nodes` });
      });
    }
  });

  // Check that INPUT nodes have at least one outgoing connection
  const inboundNodes = nodes.filter((n) => (n.data as XrayNodeData).nodeType === 'inbound');
  inboundNodes.forEach((node) => {
    const hasOutgoing = edges.some((e) => e.source === node.id);
    if (!hasOutgoing) {
      issues.push({ level: 'warning', nodeId: node.id, message: 'INPUT node has no outgoing connections' });
    }
  });

  // Check that INPUT nodes have an upstream OUTPUT connecting to them
  inboundNodes.forEach((node) => {
    const hasDeviceOrProxy = edges.some((e) => {
      if (e.target !== node.id) return false;
      const sourceNode = nodes.find((n) => n.id === e.source);
      if (!sourceNode) return false;
      const st = (sourceNode.data as XrayNodeData).nodeType;
      return st === 'outbound-proxy';
    });
    if (!hasDeviceOrProxy) {
      issues.push({
        level: 'warning',
        nodeId: node.id,
        message: 'No upstream OUTPUT connects to this INPUT. It\'s OK if you\'re just planning the infrastructure side.',
      });
    }
  });

  // Check Device→OUTPUT protocol compatibility
  const deviceNodes = nodes.filter((n) => (n.data as XrayNodeData).nodeType === 'device');
  deviceNodes.forEach((device) => {
    const deviceData = device.data as { nodeType: 'device' } & DeviceData;
    const connType = deviceData.connectionType;

    // Find OUTPUT nodes this device connects to
    const deviceEdges = edges.filter((e) => e.source === device.id);
    deviceEdges.forEach((edge) => {
      const targetNode = nodes.find((n) => n.id === edge.target);
      if (!targetNode) return;
      const targetData = targetNode.data as XrayNodeData;
      if (targetData.nodeType !== 'outbound-proxy') return;

      const outboundData = targetData as OutboundData;
      const outboundProtocol = outboundData.protocol;
      const requiredProtocol = connType === 'http' ? 'http' : 'socks'; // tun2socks and socks both require SOCKS OUTPUT

      if (outboundProtocol !== requiredProtocol) {
        issues.push({
          level: 'error',
          nodeId: device.id,
          message: `Device with "${connType}" connection must connect to a "${requiredProtocol}" OUTPUT, but "${outboundData.tag}" uses "${outboundProtocol}"`,
        });
        issues.push({
          level: 'error',
          nodeId: targetNode.id,
          message: `OUTPUT protocol "${outboundProtocol}" is incompatible with connected device using "${connType}". Expected "${requiredProtocol}"`,
        });
      }
    });
  });

  // Check that terminal outbound nodes have at least one incoming connection
  const terminalNodes = nodes.filter((n) => (n.data as XrayNodeData).nodeType === 'outbound-terminal');
  terminalNodes.forEach((node) => {
    const hasIncoming = edges.some((e) => e.target === node.id);
    if (!hasIncoming) {
      issues.push({ level: 'warning', nodeId: node.id, message: 'Terminal OUTPUT has no incoming connections' });
    }
  });

  // Check that proxy outbound nodes have at least one incoming connection
  const proxyNodes = nodes.filter((n) => (n.data as XrayNodeData).nodeType === 'outbound-proxy');
  proxyNodes.forEach((node) => {
    const hasIncoming = edges.some((e) => e.target === node.id);
    if (!hasIncoming) {
      issues.push({ level: 'warning', nodeId: node.id, message: 'Proxy OUTPUT has no incoming connections' });
    }
  });

  // Check that proxy outbound nodes that are dead-ends (no outgoing edge to another inbound) get a warning
  proxyNodes.forEach((node) => {
    const hasOutgoing = edges.some((e) => e.source === node.id);
    if (!hasOutgoing) {
      issues.push({
        level: 'warning',
        nodeId: node.id,
        message: 'Proxy OUTPUT is a dead-end — no connection to a downstream INPUT node. In infrastructure mode, connect it to an INPUT on the exit server.',
      });
    }
  });

  // Check that simple-server nodes have at least one incoming connection
  const simpleServerNodes = nodes.filter((n) => (n.data as XrayNodeData).nodeType === 'simple-server');
  simpleServerNodes.forEach((node) => {
    const hasIncoming = edges.some((e) => e.target === node.id);
    if (!hasIncoming) {
      issues.push({ level: 'warning', nodeId: node.id, message: 'Server has no incoming connections' });
    }
  });

  // Check that simple terminal nodes have at least one incoming connection
  const simpleTerminalNodes = nodes.filter((n) => {
    const nt = (n.data as XrayNodeData).nodeType;
    return nt === 'simple-internet' || nt === 'simple-block';
  });
  simpleTerminalNodes.forEach((node) => {
    const hasIncoming = edges.some((e) => e.target === node.id);
    if (!hasIncoming) {
      issues.push({ level: 'warning', nodeId: node.id, message: 'Terminal node has no incoming connections' });
    }
  });

  // Check that every INPUT can reach at least one TERMINAL OUTPUT (freedom/blackhole/dns)
  // Proxy outbounds are NOT considered endpoints — traffic must eventually reach a terminal node
  const terminalIds = new Set(
    nodes
      .filter((n) => (n.data as XrayNodeData).nodeType === 'outbound-terminal')
      .map((n) => n.id)
  );

  inboundNodes.forEach((inbound) => {
    if (!canReachOutbound(inbound.id, edges, terminalIds, new Set())) {
      issues.push({
        level: 'warning',
        nodeId: inbound.id,
        message: 'INPUT node cannot reach any terminal OUTPUT (Freedom/Blackhole/DNS). Traffic has no final destination.',
      });
    }
  });

  // Check for simple cycles (not proxy chains)
  detectCycles(nodes, edges, issues);
}

function canReachOutbound(
  nodeId: string,
  edges: GraphEdge[],
  outboundIds: Set<string>,
  visited: Set<string>
): boolean {
  if (outboundIds.has(nodeId)) return true;
  if (visited.has(nodeId)) return false;
  visited.add(nodeId);

  const outgoing = edges.filter((e) => e.source === nodeId);
  return outgoing.some((e) => canReachOutbound(e.target, edges, outboundIds, visited));
}

function detectCycles(nodes: GraphNode[], edges: GraphEdge[], issues: ValidationIssue[]): void {
  // Simple DFS cycle detection — skip outbound-proxy→inbound edges (valid proxy chains)
  const adjacency = new Map<string, string[]>();
  const nodeTypes = new Map<string, string>();

  nodes.forEach((n) => {
    adjacency.set(n.id, []);
    nodeTypes.set(n.id, (n.data as XrayNodeData).nodeType);
  });

  edges.forEach((e) => {
    const sourceType = nodeTypes.get(e.source);
    const targetType = nodeTypes.get(e.target);
    // Skip proxy chain edges (outbound-proxy → inbound) — these are intentional
    if (sourceType === 'outbound-proxy' && targetType === 'inbound') return;
    adjacency.get(e.source)?.push(e.target);
  });

  const visited = new Set<string>();
  const inStack = new Set<string>();

  function dfs(nodeId: string): boolean {
    if (inStack.has(nodeId)) return true; // cycle found
    if (visited.has(nodeId)) return false;

    visited.add(nodeId);
    inStack.add(nodeId);

    const neighbors = adjacency.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (dfs(neighbor)) {
        issues.push({
          level: 'error',
          nodeId,
          message: 'Cycle detected in graph — traffic would loop indefinitely',
        });
        return true;
      }
    }

    inStack.delete(nodeId);
    return false;
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      dfs(node.id);
    }
  }
}

// ── Config Validation ──

function validateConfig(nodes: GraphNode[], _edges: GraphEdge[], issues: ValidationIssue[]): void {
  // Check that tag references in routing inboundTag actually exist
  const allTags = new Set<string>();
  nodes.forEach((n) => {
    const data = n.data as XrayNodeData;
    if ('tag' in data && data.tag) allTags.add(data.tag);
  });

  nodes.forEach((n) => {
    const data = n.data as XrayNodeData;
    if (data.nodeType === 'routing' && data.inboundTag) {
      if (!allTags.has(data.inboundTag)) {
        issues.push({
          level: 'warning',
          nodeId: n.id,
          message: `Routing references inboundTag "${data.inboundTag}" which doesn't match any INPUT tag`,
        });
      }
    }
  });

  // Check balancer selector tags exist
  nodes.forEach((n) => {
    const data = n.data as XrayNodeData;
    if (data.nodeType === 'balancer' && data.selector.length > 0) {
      data.selector.forEach((sel) => {
        // Selectors can be prefix patterns, so check if any tag starts with the selector
        const matches = Array.from(allTags).some((tag) => tag.startsWith(sel));
        if (!matches) {
          issues.push({
            level: 'warning',
            nodeId: n.id,
            message: `Balancer selector "${sel}" doesn't match any OUTPUT tag`,
          });
        }
      });
    }
  });
}

// ── Main Validate Function ──

export function validateGraph(nodes: GraphNode[], edges: GraphEdge[]): ValidationResult {
  const issues: ValidationIssue[] = [];

  // Node-level validation
  nodes.forEach((node) => {
    const data = node.data as XrayNodeData;
    switch (data.nodeType) {
      case 'inbound':
        validateInbound(node, data, issues);
        break;
      case 'routing':
        validateRouting(node, data, issues);
        break;
      case 'balancer':
        validateBalancer(node, data, issues);
        break;
      case 'outbound-terminal':
      case 'outbound-proxy':
        validateOutbound(node, data, data.nodeType, issues);
        break;
      case 'simple-server':
        validateSimpleServer(node, data as unknown as SimpleServerData, issues);
        break;
      case 'simple-rules':
        validateSimpleRules(node, data as unknown as SimpleRulesData, issues);
        break;
    }
  });

  // Edge-level transport validation (cross-group edges)
  const nodeServerMap = new Map(
    nodes.map((n) => {
      const d = n.data as Record<string, unknown>;
      return [n.id, typeof d.serverId === 'string' ? d.serverId : undefined] as const;
    })
  );
  edges.forEach((edge) => {
    const srcServer = nodeServerMap.get(edge.source);
    const tgtServer = nodeServerMap.get(edge.target);
    if (srcServer === tgtServer) return; // internal edge, no transport to validate
    const transport = (edge.data as EdgeData | undefined)?.transport;
    if (transport) {
      // Use edge ID for the issue, but also tag source node so the badge shows
      validateTransport(edge.source, transport, issues);
    }
  });

  // Structural validation
  validateStructure(nodes, edges, issues);

  // Config-level validation
  validateConfig(nodes, edges, issues);

  const errors = issues.filter((i) => i.level === 'error');
  const warnings = issues.filter((i) => i.level === 'warning');
  const infos = issues.filter((i) => i.level === 'info');

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    infos,
  };
}

// Get validation issues for a specific node
export function getNodeValidationStatus(
  nodeId: string,
  result: ValidationResult
): { level: ValidationLevel | 'valid'; count: number } {
  const nodeErrors = result.errors.filter((i) => i.nodeId === nodeId);
  const nodeWarnings = result.warnings.filter((i) => i.nodeId === nodeId);

  if (nodeErrors.length > 0) return { level: 'error', count: nodeErrors.length };
  if (nodeWarnings.length > 0) return { level: 'warning', count: nodeWarnings.length };
  return { level: 'valid', count: 0 };
}
