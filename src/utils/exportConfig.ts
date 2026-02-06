import type { Node, Edge } from '@xyflow/react';
import type {
  XrayNodeData,
  InboundData,
  RoutingData,
  BalancerData,
  OutboundData,
  TransportSettings,
  Server,
  User,
  EdgeData,
  SimpleServerData,
  SimpleRulesData,
} from '@/types';

// Keep ProjectMode as optional param type for backwards compat
type ProjectMode = string;

// ── Xray Config JSON Types ──

interface XrayInbound {
  tag: string;
  protocol: string;
  listen: string;
  port: number;
  settings: Record<string, unknown>;
  sniffing?: { enabled: boolean; destOverride: string[] };
  streamSettings?: Record<string, unknown>;
}

interface XrayOutbound {
  tag: string;
  protocol: string;
  settings?: Record<string, unknown>;
  streamSettings?: Record<string, unknown>;
  proxySettings?: { tag: string };
}

interface XrayRoutingRule {
  type: 'field';
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
  log: { loglevel: string };
  inbounds: XrayInbound[];
  outbounds: XrayOutbound[];
  routing: {
    domainStrategy: string;
    rules: XrayRoutingRule[];
    balancers?: XrayBalancer[];
  };
}

export interface ExportResult {
  filename: string;
  config: XrayConfig;
}

// ── Transport/StreamSettings Builder ──

export function buildStreamSettings(transport?: TransportSettings): Record<string, unknown> {
  if (!transport) return {};
  const network = transport.network === 'raw' ? 'tcp' : transport.network;
  const stream: Record<string, unknown> = {
    network,
    security: transport.security,
  };

  if (transport.network === 'ws' && transport.wsSettings) {
    stream.wsSettings = {
      ...(transport.wsSettings.path && { path: transport.wsSettings.path }),
      ...(transport.wsSettings.headers &&
        Object.keys(transport.wsSettings.headers).length > 0 && {
          headers: transport.wsSettings.headers,
        }),
    };
  }

  if (transport.network === 'grpc' && transport.grpcSettings) {
    stream.grpcSettings = {
      ...(transport.grpcSettings.serviceName && {
        serviceName: transport.grpcSettings.serviceName,
      }),
      ...(transport.grpcSettings.multiMode !== undefined && {
        multiMode: transport.grpcSettings.multiMode,
      }),
    };
  }

  if (transport.network === 'xhttp' && transport.xhttpSettings) {
    stream.xhttpSettings = {
      ...(transport.xhttpSettings.path && { path: transport.xhttpSettings.path }),
      ...(transport.xhttpSettings.host && { host: transport.xhttpSettings.host }),
    };
  }

  if (transport.security === 'tls' && transport.tlsSettings) {
    stream.tlsSettings = {
      ...(transport.tlsSettings.serverName && {
        serverName: transport.tlsSettings.serverName,
      }),
      ...(transport.tlsSettings.alpn &&
        transport.tlsSettings.alpn.length > 0 && {
          alpn: transport.tlsSettings.alpn,
        }),
      ...(transport.tlsSettings.fingerprint && {
        fingerprint: transport.tlsSettings.fingerprint,
      }),
    };
  }

  if (transport.security === 'reality' && transport.realitySettings) {
    stream.realitySettings = {
      ...(transport.realitySettings.serverName && {
        serverName: transport.realitySettings.serverName,
      }),
      ...(transport.realitySettings.fingerprint && {
        fingerprint: transport.realitySettings.fingerprint,
      }),
      ...(transport.realitySettings.publicKey && {
        publicKey: transport.realitySettings.publicKey,
      }),
      ...(transport.realitySettings.shortId && {
        shortId: transport.realitySettings.shortId,
      }),
      ...(transport.realitySettings.spiderX && {
        spiderX: transport.realitySettings.spiderX,
      }),
    };
  }

  // Omit default tcp/none to keep config clean
  if (stream.network === 'tcp' && stream.security === 'none') {
    const keys = Object.keys(stream);
    if (keys.length === 2) return {};
  }

  return stream;
}

// ── Inbound Settings Builder ──

function buildInboundSettings(data: InboundData): Record<string, unknown> {
  const settings: Record<string, unknown> = {};

  switch (data.protocol) {
    case 'vless': {
      const clients = (data.users ?? []).map((u: User) => ({
        id: u.id,
        email: u.email,
        ...(u.level !== undefined && { level: u.level }),
      }));
      settings.clients = clients.length > 0 ? clients : [{ id: '', email: 'default' }];
      settings.decryption = 'none';
      break;
    }
    case 'vmess': {
      const clients = (data.users ?? []).map((u: User) => ({
        id: u.id,
        email: u.email,
        ...(u.level !== undefined && { level: u.level }),
      }));
      settings.clients = clients.length > 0 ? clients : [{ id: '', email: 'default' }];
      break;
    }
    case 'trojan': {
      const clients = (data.users ?? []).map((u: User) => ({
        password: u.password,
        email: u.email,
        ...(u.level !== undefined && { level: u.level }),
      }));
      settings.clients = clients.length > 0 ? clients : [{ password: '', email: 'default' }];
      break;
    }
    case 'shadowsocks':
      settings.method = 'aes-256-gcm';
      settings.password = '';
      break;
    case 'socks':
      settings.auth = 'noauth';
      break;
    case 'http':
      break;
    case 'dokodemo-door':
      settings.followRedirect = true;
      break;
  }

  return settings;
}

// ── Outbound Settings Builder ──

function buildOutboundSettings(data: OutboundData): Record<string, unknown> | undefined {
  switch (data.protocol) {
    case 'freedom':
      return { domainStrategy: 'UseIP' };
    case 'blackhole':
      return { response: { type: 'none' } };
    case 'dns':
      return {};
    case 'vless':
      return {
        vnext: [
          {
            address: data.serverAddress || '',
            port: data.serverPort || 443,
            users: [{ id: '', encryption: 'none' }],
          },
        ],
      };
    case 'vmess':
      return {
        vnext: [
          {
            address: data.serverAddress || '',
            port: data.serverPort || 443,
            users: [{ id: '', security: 'auto' }],
          },
        ],
      };
    case 'trojan':
      return {
        servers: [
          {
            address: data.serverAddress || '',
            port: data.serverPort || 443,
            password: '',
          },
        ],
      };
    case 'shadowsocks':
      return {
        servers: [
          {
            address: data.serverAddress || '',
            port: data.serverPort || 443,
            method: 'aes-256-gcm',
            password: '',
          },
        ],
      };
    case 'http':
    case 'socks':
      return {
        servers: [
          {
            address: data.serverAddress || '',
            port: data.serverPort || 1080,
          },
        ],
      };
    default:
      return undefined;
  }
}

// ── Graph Traversal Helpers ──

type GraphNode = Node<XrayNodeData>;
type GraphEdge = Edge;

function getNodeData(node: GraphNode): XrayNodeData {
  return node.data as XrayNodeData;
}

function getOutgoingEdges(nodeId: string, edges: GraphEdge[]): GraphEdge[] {
  return edges.filter((e) => e.source === nodeId);
}

function findTargetNode(nodeId: string, nodes: GraphNode[]): GraphNode | undefined {
  return nodes.find((n) => n.id === nodeId);
}

function getServerId(node: GraphNode | undefined): string | undefined {
  if (!node) return undefined;
  const data = node.data as Record<string, unknown>;
  return typeof data.serverId === 'string' ? data.serverId : undefined;
}

function isCrossGroupEdge(edge: GraphEdge, nodeServerMap: Map<string, string | undefined>): boolean {
  const sourceServer = nodeServerMap.get(edge.source);
  const targetServer = nodeServerMap.get(edge.target);
  return sourceServer !== targetServer;
}

function getIncomingTransport(
  nodeId: string,
  edges: GraphEdge[],
  nodeServerMap: Map<string, string | undefined>
): TransportSettings | undefined {
  for (const edge of edges) {
    if (edge.target !== nodeId) continue;
    if (!isCrossGroupEdge(edge, nodeServerMap)) continue;
    const transport = (edge.data as EdgeData | undefined)?.transport;
    if (transport) return transport;
  }
  return undefined;
}

function getOutgoingTransport(
  nodeId: string,
  edges: GraphEdge[],
  nodeServerMap: Map<string, string | undefined>
): TransportSettings | undefined {
  for (const edge of edges) {
    if (edge.source !== nodeId) continue;
    if (!isCrossGroupEdge(edge, nodeServerMap)) continue;
    const transport = (edge.data as EdgeData | undefined)?.transport;
    if (transport) return transport;
  }
  return undefined;
}

// ── Routing Rule Builder ──

function buildRoutingRules(
  nodes: GraphNode[],
  edges: GraphEdge[]
): { rules: XrayRoutingRule[]; balancers: XrayBalancer[] } {
  const rules: XrayRoutingRule[] = [];
  const balancers: XrayBalancer[] = [];

  // Find routing nodes and build rules from their outgoing edges
  const routingNodes = nodes.filter((n) => getNodeData(n).nodeType === 'routing');
  const balancerNodes = nodes.filter((n) => getNodeData(n).nodeType === 'balancer');

  // Process balancer nodes
  for (const balNode of balancerNodes) {
    const balData = getNodeData(balNode) as BalancerData & { nodeType: 'balancer' };
    const outEdges = getOutgoingEdges(balNode.id, edges);

    // Selector can be explicit tags or derived from connected outbound nodes
    const selector: string[] = [...balData.selector];
    for (const edge of outEdges) {
      const target = findTargetNode(edge.target, nodes);
      if (target) {
        const targetData = getNodeData(target);
        if (
          targetData.nodeType === 'outbound-terminal' ||
          targetData.nodeType === 'outbound-proxy'
        ) {
          if (!selector.includes(targetData.tag)) {
            selector.push(targetData.tag);
          }
        }
      }
    }

    balancers.push({
      tag: balData.tag,
      selector,
      ...(balData.strategy !== 'random' && { strategy: { type: balData.strategy } }),
    });
  }

  // Process routing nodes
  for (const routeNode of routingNodes) {
    const routeData = getNodeData(routeNode) as RoutingData & { nodeType: 'routing' };
    const outEdges = getOutgoingEdges(routeNode.id, edges);

    for (const edge of outEdges) {
      const target = findTargetNode(edge.target, nodes);
      if (!target) continue;

      const targetData = getNodeData(target);
      const rule: XrayRoutingRule = { type: 'field' };

      // Add routing conditions from the routing node data
      if (routeData.domain && routeData.domain.length > 0) {
        rule.domain = routeData.domain;
      }
      if (routeData.ip && routeData.ip.length > 0) {
        rule.ip = routeData.ip;
      }
      if (routeData.port) {
        rule.port = routeData.port;
      }
      if (routeData.protocol && routeData.protocol.length > 0) {
        rule.protocol = routeData.protocol;
      }
      if (routeData.network) {
        rule.network = routeData.network;
      }
      if (routeData.inboundTag) {
        rule.inboundTag = [routeData.inboundTag];
      }

      // Set target
      if (targetData.nodeType === 'balancer') {
        rule.balancerTag = targetData.tag;
      } else if (
        targetData.nodeType === 'outbound-terminal' ||
        targetData.nodeType === 'outbound-proxy'
      ) {
        rule.outboundTag = targetData.tag;
      } else if (targetData.nodeType === 'routing') {
        // Routing → Routing: the downstream routing will generate its own rules.
        // We skip this edge to avoid duplicate rules.
        continue;
      }

      rules.push(rule);
    }
  }

  // Build direct inbound→outbound rules (bypassing routing)
  const inboundNodes = nodes.filter((n) => getNodeData(n).nodeType === 'inbound');
  for (const inNode of inboundNodes) {
    const outEdges = getOutgoingEdges(inNode.id, edges);
    for (const edge of outEdges) {
      const target = findTargetNode(edge.target, nodes);
      if (!target) continue;
      const targetData = getNodeData(target);

      // Direct inbound→outbound (no routing node in between)
      if (
        targetData.nodeType === 'outbound-terminal' ||
        targetData.nodeType === 'outbound-proxy'
      ) {
        const inData = getNodeData(inNode) as InboundData & { nodeType: 'inbound' };
        rules.push({
          type: 'field',
          inboundTag: [inData.tag],
          outboundTag: targetData.tag,
        });
      }
    }
  }

  return { rules, balancers };
}

// ── Main Export Function ──

export function exportConfig(
  nodes: GraphNode[],
  edges: GraphEdge[],
  servers: Server[],
  mode?: ProjectMode
): ExportResult[] {
  if (mode === 'simple') {
    return exportSimpleConfig(nodes, edges);
  }

  // Filter out device nodes — UI-only, not part of xray config
  const configNodes = nodes.filter((n) => getNodeData(n).nodeType !== 'device');
  const nodeServerMap = new Map(nodes.map((n) => [n.id, getServerId(n)]));

  const serverMap = new Map(servers.map((s) => [s.id, s]));

  // Group nodes by serverId
  const nodesByServer = new Map<string, GraphNode[]>();
  const unassigned: GraphNode[] = [];

  for (const node of configNodes) {
    const serverId = (node.data as Record<string, unknown>).serverId as string | undefined;
    if (serverId && serverMap.has(serverId)) {
      const group = nodesByServer.get(serverId) || [];
      group.push(node);
      nodesByServer.set(serverId, group);
    } else {
      unassigned.push(node);
    }
  }

  // If no nodes are assigned to any server, export single config with all nodes
  if (nodesByServer.size === 0) {
    return [buildSingleConfig(configNodes, edges, edges, nodeServerMap, 'config.json')];
  }

  const results: ExportResult[] = [];

  // Build a config for each server
  for (const [serverId, serverNodes] of nodesByServer) {
    const server = serverMap.get(serverId)!;
    const serverNodeIds = new Set(serverNodes.map((n) => n.id));
    // Only include edges where both endpoints are on this server
    const serverEdges = edges.filter(
      (e) => serverNodeIds.has(e.source) && serverNodeIds.has(e.target)
    );
    const safeName = server.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
    results.push(buildSingleConfig(serverNodes, serverEdges, edges, nodeServerMap, `${safeName}_config.json`));
  }

  // Unassigned nodes go into a separate config
  if (unassigned.length > 0) {
    const unassignedIds = new Set(unassigned.map((n) => n.id));
    const unassignedEdges = edges.filter(
      (e) => unassignedIds.has(e.source) && unassignedIds.has(e.target)
    );
    results.push(buildSingleConfig(unassigned, unassignedEdges, edges, nodeServerMap, 'unassigned_config.json'));
  }

  return results;
}

function buildSingleConfig(
  nodes: GraphNode[],
  edges: GraphEdge[],
  allEdges: GraphEdge[],
  nodeServerMap: Map<string, string | undefined>,
  filename: string
): ExportResult {
  // Build inbounds
  const inbounds: XrayInbound[] = [];
  const inboundNodes = nodes.filter((n) => getNodeData(n).nodeType === 'inbound');

  for (const node of inboundNodes) {
    const data = getNodeData(node) as InboundData & { nodeType: 'inbound' };
    const edgeTransport = getIncomingTransport(node.id, allEdges, nodeServerMap);
    const streamSettings = buildStreamSettings(edgeTransport || data.transport);

    const inbound: XrayInbound = {
      tag: data.tag,
      protocol: data.protocol,
      listen: data.listen,
      port: data.port,
      settings: buildInboundSettings(data),
    };

    if (data.sniffing) {
      inbound.sniffing = {
        enabled: true,
        destOverride: ['http', 'tls'],
      };
    }

    if (Object.keys(streamSettings).length > 0) {
      inbound.streamSettings = streamSettings;
    }

    inbounds.push(inbound);
  }

  // Build outbounds
  const outbounds: XrayOutbound[] = [];
  const outboundNodes = nodes.filter(
    (n) =>
      getNodeData(n).nodeType === 'outbound-terminal' ||
      getNodeData(n).nodeType === 'outbound-proxy'
  );

  for (const node of outboundNodes) {
    const data = getNodeData(node) as OutboundData & {
      nodeType: 'outbound-terminal' | 'outbound-proxy';
    };

    const outbound: XrayOutbound = {
      tag: data.tag,
      protocol: data.protocol,
    };

    const settings = buildOutboundSettings(data);
    if (settings) {
      outbound.settings = settings;
    }

    const edgeTransport = data.nodeType === 'outbound-proxy'
      ? getOutgoingTransport(node.id, allEdges, nodeServerMap)
      : undefined;
    const streamSettings = buildStreamSettings(edgeTransport || data.transport);
    if (Object.keys(streamSettings).length > 0) {
      outbound.streamSettings = streamSettings;
    }

    outbounds.push(outbound);
  }

  // Build routing
  const { rules, balancers } = buildRoutingRules(nodes, edges);

  const config: XrayConfig = {
    log: { loglevel: 'warning' },
    inbounds,
    outbounds,
    routing: {
      domainStrategy: 'AsIs',
      rules,
      ...(balancers.length > 0 && { balancers }),
    },
  };

  return { filename, config };
}

// ── Simple Mode Helpers ──

function buildSimpleTransport(data: SimpleServerData): TransportSettings {
  const transport: TransportSettings = {
    network: data.network,
    security: data.security,
  };

  if (data.network === 'ws') {
    transport.wsSettings = {
      path: data.wsPath,
      headers: data.wsHost ? { Host: data.wsHost } : undefined,
    };
  }

  if (data.network === 'grpc') {
    transport.grpcSettings = { serviceName: data.grpcServiceName };
  }

  if (data.network === 'xhttp') {
    transport.xhttpSettings = { path: data.xhttpPath, host: data.xhttpHost };
  }

  if (data.security === 'tls') {
    transport.tlsSettings = {
      serverName: data.sni,
      fingerprint: data.fingerprint,
      alpn: data.alpn
        ? data.alpn.split(',').map((s) => s.trim()).filter(Boolean)
        : undefined,
    };
  }

  if (data.security === 'reality') {
    transport.realitySettings = {
      serverName: data.sni,
      fingerprint: data.fingerprint,
      publicKey: data.realityPublicKey,
      shortId: data.realityShortId,
      spiderX: data.realitySpiderX,
    };
  }

  return transport;
}

function buildSimpleOutbound(data: SimpleServerData, tag: string): XrayOutbound {
  const outbound: XrayOutbound = {
    tag,
    protocol: data.protocol,
  };

  // Build settings based on protocol
  switch (data.protocol) {
    case 'vless':
      outbound.settings = {
        vnext: [{
          address: data.host,
          port: data.port,
          users: [{ id: data.uuid || '', encryption: 'none' }],
        }],
      };
      break;
    case 'vmess':
      outbound.settings = {
        vnext: [{
          address: data.host,
          port: data.port,
          users: [{ id: data.uuid || '', security: 'auto' }],
        }],
      };
      break;
    case 'trojan':
      outbound.settings = {
        servers: [{
          address: data.host,
          port: data.port,
          password: data.password || '',
        }],
      };
      break;
    case 'shadowsocks':
      outbound.settings = {
        servers: [{
          address: data.host,
          port: data.port,
          method: 'aes-256-gcm',
          password: data.password || '',
        }],
      };
      break;
  }

  const stream = buildStreamSettings(buildSimpleTransport(data));
  if (Object.keys(stream).length > 0) {
    outbound.streamSettings = stream;
  }

  return outbound;
}

// ── Simple Mode Export ──

export function exportSimpleConfig(
  nodes: GraphNode[],
  edges: GraphEdge[]
): ExportResult[] {
  const outbounds: XrayOutbound[] = [];
  const rules: XrayRoutingRule[] = [];
  let hasBlock = false;
  let hasDirect = false;

  // Map node IDs to their data for quick lookup
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Resolve what outbound tag a target node maps to
  function resolveOutboundTag(targetNode: GraphNode): string | undefined {
    const data = getNodeData(targetNode);
    switch (data.nodeType) {
      case 'simple-server':
        return `proxy-${targetNode.id}`;
      case 'simple-internet':
        return 'direct';
      case 'simple-block':
        return 'block';
      default:
        return undefined;
    }
  }

  // Collect server nodes and build their outbounds
  const serverNodes = nodes.filter((n) => getNodeData(n).nodeType === 'simple-server');
  for (const node of serverNodes) {
    const data = getNodeData(node) as SimpleServerData & { nodeType: 'simple-server' };
    const tag = `proxy-${node.id}`;

    // Check if this server chains to another server
    const serverOutEdges = getOutgoingEdges(node.id, edges);
    let chainTarget: GraphNode | undefined;
    for (const edge of serverOutEdges) {
      const target = nodeMap.get(edge.target);
      if (target && getNodeData(target).nodeType === 'simple-server') {
        chainTarget = target;
        break;
      }
    }

    if (chainTarget) {
      // Server → Server chain: first server is the outbound proxy on the client.
      // Second server gets its own config file (server config with inbound + freedom outbound).
      const outbound = buildSimpleOutbound(data, tag);
      outbound.proxySettings = { tag: `proxy-${chainTarget.id}` };
      outbounds.push(outbound);
    } else {
      outbounds.push(buildSimpleOutbound(data, tag));
    }
  }

  // Check for internet and block nodes
  const internetNodes = nodes.filter((n) => getNodeData(n).nodeType === 'simple-internet');
  const blockNodes = nodes.filter((n) => getNodeData(n).nodeType === 'simple-block');

  if (internetNodes.length > 0) hasDirect = true;
  if (blockNodes.length > 0) hasBlock = true;

  // Process rules nodes
  const rulesNodes = nodes.filter((n) => getNodeData(n).nodeType === 'simple-rules');
  for (const rulesNode of rulesNodes) {
    const rulesData = getNodeData(rulesNode) as SimpleRulesData & { nodeType: 'simple-rules' };
    const rulesOutEdges = getOutgoingEdges(rulesNode.id, edges);

    // Find the target outbound tag for this rules node
    let outboundTag: string | undefined;
    for (const edge of rulesOutEdges) {
      const target = nodeMap.get(edge.target);
      if (target) {
        outboundTag = resolveOutboundTag(target);
        if (outboundTag) break;
      }
    }

    if (!outboundTag) continue;

    // Mark direct/block usage from rules targets
    if (outboundTag === 'direct') hasDirect = true;
    if (outboundTag === 'block') hasBlock = true;

    for (const condition of rulesData.rules) {
      const rule: XrayRoutingRule = { type: 'field', outboundTag };

      switch (condition.type) {
        case 'domain':
          rule.domain = [`domain:${condition.value}`];
          break;
        case 'geosite':
          rule.domain = [`geosite:${condition.value}`];
          break;
        case 'geoip':
          rule.ip = [`geoip:${condition.value}`];
          break;
        case 'all':
          // Catch-all: no conditions, just outboundTag
          break;
      }

      rules.push(rule);
    }
  }

  // Build standard outbounds for direct and block
  if (hasDirect) {
    outbounds.push({
      tag: 'direct',
      protocol: 'freedom',
      settings: { domainStrategy: 'UseIP' },
    });
  }

  if (hasBlock) {
    outbounds.push({
      tag: 'block',
      protocol: 'blackhole',
      settings: { response: { type: 'none' } },
    });
  }

  // If no explicit rules, add a default route to the first proxy (or direct)
  if (rules.length === 0 && outbounds.length > 0) {
    // The first outbound is the default; xray uses the first outbound as the default
    // so no explicit routing rule is needed.
  }

  // Build the client config
  const inbounds: XrayInbound[] = [
    {
      tag: 'socks-in',
      protocol: 'socks',
      listen: '127.0.0.1',
      port: 1080,
      settings: { auth: 'noauth', udp: true },
      sniffing: { enabled: true, destOverride: ['http', 'tls'] },
    },
  ];

  const config: XrayConfig = {
    log: { loglevel: 'warning' },
    inbounds,
    outbounds,
    routing: {
      domainStrategy: 'AsIs',
      rules,
    },
  };

  const results: ExportResult[] = [{ filename: 'config.json', config }];

  // Generate server configs for chained servers (Server → Server)
  for (const node of serverNodes) {
    const serverOutEdges = getOutgoingEdges(node.id, edges);
    for (const edge of serverOutEdges) {
      const target = nodeMap.get(edge.target);
      if (target && getNodeData(target).nodeType === 'simple-server') {
        // The target server in the chain needs its own server-side config
        const targetData = getNodeData(target) as SimpleServerData & { nodeType: 'simple-server' };
        const safeName = targetData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
        const serverInbound: XrayInbound = {
          tag: 'inbound',
          protocol: targetData.protocol,
          listen: '0.0.0.0',
          port: targetData.port,
          settings: buildInboundSettingsFromSimple(targetData),
        };

        const serverTransport = buildStreamSettings(buildSimpleTransport(targetData));
        if (Object.keys(serverTransport).length > 0) {
          serverInbound.streamSettings = serverTransport;
        }

        const serverConfig: XrayConfig = {
          log: { loglevel: 'warning' },
          inbounds: [serverInbound],
          outbounds: [
            {
              tag: 'direct',
              protocol: 'freedom',
              settings: { domainStrategy: 'UseIP' },
            },
          ],
          routing: {
            domainStrategy: 'AsIs',
            rules: [],
          },
        };

        results.push({ filename: `${safeName}_server_config.json`, config: serverConfig });
      }
    }
  }

  return results;
}

// Build inbound settings from SimpleServerData for chained server configs
function buildInboundSettingsFromSimple(data: SimpleServerData): Record<string, unknown> {
  switch (data.protocol) {
    case 'vless':
      return {
        clients: [{ id: data.uuid || '', email: 'default' }],
        decryption: 'none',
      };
    case 'vmess':
      return {
        clients: [{ id: data.uuid || '', email: 'default' }],
      };
    case 'trojan':
      return {
        clients: [{ password: data.password || '', email: 'default' }],
      };
    case 'shadowsocks':
      return {
        method: 'aes-256-gcm',
        password: data.password || '',
      };
    default:
      return {};
  }
}

// ── Export as downloadable JSON string ──

export function configToJson(config: XrayConfig): string {
  return JSON.stringify(config, null, 2);
}
