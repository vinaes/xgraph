import { v4 as uuidv4 } from 'uuid';
import type { XrayNode, XrayEdge } from '@/store/useStore';
import type {
  InboundData,
  RoutingData,
  BalancerData,
  OutboundData,
  TransportSettings,
  ProjectMode,
} from '@/types';
import { defaultTransport } from '@/types/schemas';

// ── Xray Config JSON Types (matching exportConfig.ts) ──

interface XrayInbound {
  tag: string;
  protocol: string;
  listen?: string;
  port?: number;
  settings?: Record<string, unknown>;
  sniffing?: { enabled: boolean; destOverride?: string[] };
  streamSettings?: Record<string, unknown>;
}

interface XrayOutbound {
  tag: string;
  protocol: string;
  settings?: Record<string, unknown>;
  streamSettings?: Record<string, unknown>;
}

interface XrayRoutingRule {
  type?: string;
  domain?: string[];
  ip?: string[];
  port?: string;
  protocol?: string[];
  network?: string;
  inboundTag?: string[];
  outboundTag?: string;
  balancerTag?: string;
}

interface XrayBalancer {
  tag: string;
  selector: string[];
  strategy?: { type: string };
}

interface XrayConfig {
  log?: { loglevel?: string };
  inbounds?: XrayInbound[];
  outbounds?: XrayOutbound[];
  routing?: {
    domainStrategy?: string;
    rules?: XrayRoutingRule[];
    balancers?: XrayBalancer[];
  };
}

// ── Import Result ──

export interface ImportSummary {
  inboundCount: number;
  outboundCount: number;
  routingCount: number;
  balancerCount: number;
  edgeCount: number;
  warnings: string[];
  mode: ProjectMode;
}

export interface ImportResult {
  nodes: XrayNode[];
  edges: XrayEdge[];
  mode: ProjectMode;
  summary: ImportSummary;
}

// ── Terminal vs Proxy protocol classification ──

const TERMINAL_PROTOCOLS = new Set(['freedom', 'blackhole', 'dns']);
const INBOUND_PROTOCOLS = new Set([
  'http', 'socks', 'vless', 'vmess', 'trojan', 'shadowsocks', 'dokodemo-door',
]);

// ── StreamSettings → TransportSettings parser ──

function parseTransport(stream?: Record<string, unknown>): TransportSettings {
  if (!stream) return { ...defaultTransport };

  const network = (stream.network as string) || 'tcp';
  const mappedNetwork = network === 'tcp' ? 'raw' : network;
  const security = (stream.security as string) || 'none';
  const transport: TransportSettings = {
    network: (['raw', 'ws', 'grpc', 'xhttp'].includes(mappedNetwork) ? mappedNetwork : 'raw') as TransportSettings['network'],
    security: (['none', 'tls', 'reality'].includes(security) ? security : 'none') as TransportSettings['security'],
  };

  if (network === 'ws' && stream.wsSettings) {
    const ws = stream.wsSettings as Record<string, unknown>;
    transport.wsSettings = {
      path: (ws.path as string) || undefined,
      headers: (ws.headers as Record<string, string>) || undefined,
    };
  }

  if (network === 'grpc' && stream.grpcSettings) {
    const grpc = stream.grpcSettings as Record<string, unknown>;
    transport.grpcSettings = {
      serviceName: (grpc.serviceName as string) || undefined,
      multiMode: grpc.multiMode as boolean | undefined,
    };
  }

  if (network === 'xhttp' && stream.xhttpSettings) {
    const xhttp = stream.xhttpSettings as Record<string, unknown>;
    transport.xhttpSettings = {
      path: (xhttp.path as string) || undefined,
      host: (xhttp.host as string) || undefined,
    };
  }

  if (security === 'tls' && stream.tlsSettings) {
    const tls = stream.tlsSettings as Record<string, unknown>;
    transport.tlsSettings = {
      serverName: (tls.serverName as string) || undefined,
      alpn: (tls.alpn as string[]) || undefined,
      fingerprint: (tls.fingerprint as string) || undefined,
    };
  }

  if (security === 'reality' && stream.realitySettings) {
    const reality = stream.realitySettings as Record<string, unknown>;
    transport.realitySettings = {
      serverName: (reality.serverName as string) || undefined,
      fingerprint: (reality.fingerprint as string) || undefined,
      publicKey: (reality.publicKey as string) || undefined,
      shortId: (reality.shortId as string) || undefined,
      spiderX: (reality.spiderX as string) || undefined,
    };
  }

  return transport;
}

// ── Inbound parser ──

function parseInboundUsers(settings: Record<string, unknown> | undefined, protocol: string) {
  if (!settings) return [];
  const clients = settings.clients as Array<Record<string, unknown>> | undefined;
  if (!clients) return [];

  return clients.map((c) => ({
    email: (c.email as string) || '',
    ...(protocol === 'trojan'
      ? { password: (c.password as string) || '' }
      : { id: (c.id as string) || '' }),
    ...(c.level !== undefined ? { level: c.level as number } : {}),
  }));
}

function parseInbound(inbound: XrayInbound): InboundData {
  const protocol = INBOUND_PROTOCOLS.has(inbound.protocol) ? inbound.protocol : 'vless';
  return {
    tag: inbound.tag || `input-${uuidv4().slice(0, 4)}`,
    protocol: protocol as InboundData['protocol'],
    listen: inbound.listen || '0.0.0.0',
    port: inbound.port || 443,
    sniffing: inbound.sniffing?.enabled ?? false,
    users: parseInboundUsers(inbound.settings, protocol),
    transport: parseTransport(inbound.streamSettings),
  };
}

// ── Outbound parser ──

function extractOutboundAddress(settings: Record<string, unknown> | undefined, protocol: string): { serverAddress?: string; serverPort?: number } {
  if (!settings) return {};

  // VLESS/VMess use vnext[].address/port
  if (protocol === 'vless' || protocol === 'vmess') {
    const vnext = settings.vnext as Array<Record<string, unknown>> | undefined;
    if (vnext && vnext.length > 0) {
      return {
        serverAddress: (vnext[0]!.address as string) || undefined,
        serverPort: (vnext[0]!.port as number) || undefined,
      };
    }
  }

  // Trojan/Shadowsocks/HTTP/SOCKS use servers[].address/port
  const servers = settings.servers as Array<Record<string, unknown>> | undefined;
  if (servers && servers.length > 0) {
    return {
      serverAddress: (servers[0]!.address as string) || undefined,
      serverPort: (servers[0]!.port as number) || undefined,
    };
  }

  return {};
}

function parseOutbound(outbound: XrayOutbound): OutboundData {
  const protocol = outbound.protocol || 'freedom';
  const addr = extractOutboundAddress(outbound.settings, protocol);
  const isTerminal = TERMINAL_PROTOCOLS.has(protocol);

  return {
    tag: outbound.tag || `output-${uuidv4().slice(0, 4)}`,
    protocol: protocol as OutboundData['protocol'],
    ...(isTerminal ? {} : addr),
    transport: isTerminal ? undefined : parseTransport(outbound.streamSettings),
  };
}

// ── Routing rule → RoutingData parser ──

function parseRoutingRule(rule: XrayRoutingRule, index: number): RoutingData {
  return {
    tag: `rule-${index + 1}`,
    domain: rule.domain,
    ip: rule.ip,
    port: rule.port,
    protocol: rule.protocol,
    network: (rule.network === 'tcp' || rule.network === 'udp') ? rule.network : undefined,
    inboundTag: rule.inboundTag && rule.inboundTag.length > 0 ? rule.inboundTag[0] : undefined,
  };
}

// ── Auto-layout: hierarchical left-to-right ──

function autoLayout(nodes: XrayNode[], edges: XrayEdge[]): void {
  // Layer nodes by type (left → right flow)
  const layers: Record<string, number> = {
    inbound: 0,
    routing: 1,
    balancer: 2,
    'outbound-proxy': 3,
    'outbound-terminal': 3,
  };

  // Group nodes by layer
  const layerGroups = new Map<number, XrayNode[]>();
  for (const node of nodes) {
    const layer = layers[node.type || ''] ?? 1;
    const group = layerGroups.get(layer) || [];
    group.push(node);
    layerGroups.set(layer, group);
  }

  const LAYER_SPACING = 300;
  const NODE_SPACING = 150;
  const START_X = 50;
  const START_Y = 50;

  // Position nodes in each layer
  for (const [layer, group] of layerGroups.entries()) {
    const x = START_X + layer * LAYER_SPACING;
    const totalHeight = group.length * NODE_SPACING;
    const startY = START_Y + Math.max(0, (4 * NODE_SPACING - totalHeight) / 2);

    for (let i = 0; i < group.length; i++) {
      group[i]!.position = { x, y: startY + i * NODE_SPACING };
    }
  }

  // Refine: for routing nodes, try to position near their connected inbound
  const edgesBySource = new Map<string, XrayEdge[]>();
  for (const edge of edges) {
    const list = edgesBySource.get(edge.source) || [];
    list.push(edge);
    edgesBySource.set(edge.source, list);
  }
}

// ── Mode auto-detection ──

function detectMode(config: XrayConfig): ProjectMode {
  const outbounds = config.outbounds || [];
  // If there are proxy outbounds (not just freedom/blackhole/dns), likely infrastructure
  const hasProxyOutbound = outbounds.some((o) => !TERMINAL_PROTOCOLS.has(o.protocol));
  // If there are multiple inbounds with different ports, likely infrastructure
  const inbounds = config.inbounds || [];
  const uniquePorts = new Set(inbounds.map((i) => i.port));

  if (hasProxyOutbound && inbounds.length > 1 && uniquePorts.size > 1) {
    return 'infrastructure';
  }
  return 'client';
}

// ── Main import function ──

export function importXrayConfig(
  jsonString: string,
  options: {
    createRoutingNodes?: boolean;
    autoLayout?: boolean;
    forceMode?: ProjectMode | null;
  } = {}
): ImportResult {
  const {
    createRoutingNodes = true,
    autoLayout: doAutoLayout = true,
    forceMode = null,
  } = options;

  // Parse and validate
  let config: XrayConfig;
  try {
    config = JSON.parse(jsonString) as XrayConfig;
  } catch {
    throw new Error('Invalid JSON: could not parse the file.');
  }

  // Basic structure validation
  if (!config.inbounds && !config.outbounds) {
    throw new Error('Invalid xray config: must have inbounds or outbounds.');
  }

  const nodes: XrayNode[] = [];
  const edges: XrayEdge[] = [];
  const warnings: string[] = [];
  const tagToNodeId = new Map<string, string>();

  // ── 1. Parse inbounds ──
  for (const inbound of config.inbounds || []) {
    if (!INBOUND_PROTOCOLS.has(inbound.protocol)) {
      warnings.push(`Unknown inbound protocol "${inbound.protocol}" (skipped)`);
      continue;
    }

    const nodeId = uuidv4();
    const data = parseInbound(inbound);
    tagToNodeId.set(data.tag, nodeId);

    nodes.push({
      id: nodeId,
      type: 'inbound',
      position: { x: 0, y: 0 },
      data: { nodeType: 'inbound', ...data },
    });
  }

  // ── 2. Parse outbounds ──
  for (const outbound of config.outbounds || []) {
    const protocol = outbound.protocol || 'freedom';
    const isTerminal = TERMINAL_PROTOCOLS.has(protocol);

    const nodeId = uuidv4();
    const data = parseOutbound(outbound);
    tagToNodeId.set(data.tag, nodeId);

    nodes.push({
      id: nodeId,
      type: isTerminal ? 'outbound-terminal' : 'outbound-proxy',
      position: { x: 0, y: 0 },
      data: {
        nodeType: isTerminal ? 'outbound-terminal' : 'outbound-proxy',
        ...data,
      },
    });
  }

  // ── 3. Parse balancers ──
  for (const balancer of config.routing?.balancers || []) {
    const nodeId = uuidv4();
    const data: BalancerData = {
      tag: balancer.tag,
      strategy: (balancer.strategy?.type as BalancerData['strategy']) || 'random',
      selector: balancer.selector || [],
    };
    tagToNodeId.set(data.tag, nodeId);

    nodes.push({
      id: nodeId,
      type: 'balancer',
      position: { x: 0, y: 0 },
      data: { nodeType: 'balancer', ...data },
    });

    // Create edges from balancer to selected outbounds
    for (const selectorPattern of balancer.selector) {
      // Selector can be exact tag or prefix match
      for (const [tag, targetNodeId] of tagToNodeId.entries()) {
        if (tag === selectorPattern || tag.startsWith(selectorPattern)) {
          const targetNode = nodes.find((n) => n.id === targetNodeId);
          if (targetNode && (targetNode.type === 'outbound-terminal' || targetNode.type === 'outbound-proxy')) {
            edges.push({
              id: uuidv4(),
              source: nodeId,
              target: targetNodeId,
            });
          }
        }
      }
    }
  }

  // ── 4. Parse routing rules ──
  const rules = config.routing?.rules || [];
  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i]!;

    if (createRoutingNodes) {
      // Create a routing node for each rule
      const routeNodeId = uuidv4();
      const routeData = parseRoutingRule(rule, i);

      nodes.push({
        id: routeNodeId,
        type: 'routing',
        position: { x: 0, y: 0 },
        data: { nodeType: 'routing', ...routeData },
      });

      // Edge from inbound → routing (if inboundTag specified)
      if (rule.inboundTag) {
        for (const inTag of rule.inboundTag) {
          const inNodeId = tagToNodeId.get(inTag);
          if (inNodeId) {
            edges.push({
              id: uuidv4(),
              source: inNodeId,
              target: routeNodeId,
            });
          }
        }
      }

      // Edge from routing → outbound/balancer
      if (rule.outboundTag) {
        const outNodeId = tagToNodeId.get(rule.outboundTag);
        if (outNodeId) {
          edges.push({
            id: uuidv4(),
            source: routeNodeId,
            target: outNodeId,
          });
        } else {
          warnings.push(`Routing rule ${i + 1}: outboundTag "${rule.outboundTag}" not found`);
        }
      }
      if (rule.balancerTag) {
        const balNodeId = tagToNodeId.get(rule.balancerTag);
        if (balNodeId) {
          edges.push({
            id: uuidv4(),
            source: routeNodeId,
            target: balNodeId,
          });
        } else {
          warnings.push(`Routing rule ${i + 1}: balancerTag "${rule.balancerTag}" not found`);
        }
      }
    } else {
      // Without routing nodes: create direct inbound → outbound edges
      if (rule.outboundTag && rule.inboundTag) {
        for (const inTag of rule.inboundTag) {
          const inNodeId = tagToNodeId.get(inTag);
          const outNodeId = tagToNodeId.get(rule.outboundTag);
          if (inNodeId && outNodeId) {
            edges.push({
              id: uuidv4(),
              source: inNodeId,
              target: outNodeId,
            });
          }
        }
      }
    }
  }

  // ── 5. Auto-layout ──
  if (doAutoLayout) {
    autoLayout(nodes, edges);
  }

  // ── 6. Detect mode ──
  const mode = forceMode || detectMode(config);

  // ── 7. Warning for advanced features ──
  if (rules.some((r) => r.type && r.type !== 'field')) {
    warnings.push('Advanced routing rule types may need manual adjustment');
  }

  const routingCount = nodes.filter((n) => n.type === 'routing').length;
  const balancerCount = nodes.filter((n) => n.type === 'balancer').length;
  const inboundCount = nodes.filter((n) => n.type === 'inbound').length;
  const outboundCount = nodes.filter((n) => n.type === 'outbound-terminal' || n.type === 'outbound-proxy').length;

  return {
    nodes,
    edges,
    mode,
    summary: {
      inboundCount,
      outboundCount,
      routingCount,
      balancerCount,
      edgeCount: edges.length,
      warnings,
      mode,
    },
  };
}

// ── Import .xray-graph project file ──

export interface XrayGraphProject {
  version: string;
  name?: string;
  mode?: string;
  servers?: Array<Record<string, unknown>>;
  nodes?: Array<Record<string, unknown>>;
  edges?: Array<Record<string, unknown>>;
  metadata?: { createdAt?: string; updatedAt?: string };
}

export function importProjectFile(jsonString: string): {
  name: string;
  mode: ProjectMode;
  nodes: XrayNode[];
  edges: XrayEdge[];
  servers: Array<{ id: string; name: string; host: string; sshPort: number; sshUser?: string }>;
  metadata: { createdAt: string; updatedAt: string };
} {
  let project: XrayGraphProject;
  try {
    project = JSON.parse(jsonString) as XrayGraphProject;
  } catch {
    throw new Error('Invalid JSON: could not parse the project file.');
  }

  if (!project.version) {
    throw new Error('Invalid .xray-graph file: missing version field.');
  }

  const now = new Date().toISOString();

  return {
    name: project.name || 'Imported Project',
    mode: (['client', 'infrastructure', 'hybrid'].includes(project.mode || '')
      ? project.mode as ProjectMode
      : 'client'),
    nodes: (project.nodes || []) as unknown as XrayNode[],
    edges: (project.edges || []) as unknown as XrayEdge[],
    servers: ((project.servers || []) as Array<Record<string, unknown>>).map((s) => ({
      id: (s.id as string) || uuidv4(),
      name: (s.name as string) || 'Server',
      host: (s.host as string) || '',
      sshPort: (s.sshPort as number) || 22,
      sshUser: (s.sshUser as string) || undefined,
    })),
    metadata: {
      createdAt: project.metadata?.createdAt || now,
      updatedAt: project.metadata?.updatedAt || now,
    },
  };
}
