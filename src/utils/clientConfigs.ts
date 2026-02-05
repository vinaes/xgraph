import QRCode from 'qrcode';
import type { Node, Edge } from '@xyflow/react';
import type { XrayNodeData, InboundData, User, TransportSettings, EdgeData } from '@/types';
import { defaultTransport } from '@/types';

// ── Client config export: per-user configs + share links + QR codes ──

export interface ClientConfigResult {
  email: string;
  config: object;
  shareLink: string;
  protocol: string;
}

type GraphNode = Node<XrayNodeData>;
type GraphEdge = Edge<EdgeData>;

function getNodeData(node: GraphNode): XrayNodeData {
  return node.data as XrayNodeData;
}

// ── Share link builders ──

function buildVlessLink(
  user: User,
  data: InboundData,
  serverAddress: string,
  transport: TransportSettings
): string {
  const uuid = user.id || '';
  const params = new URLSearchParams();

  params.set('type', transport.network === 'raw' ? 'tcp' : transport.network);
  params.set('security', transport.security);

  if (transport.network === 'ws') {
    params.set('path', transport.wsSettings?.path || '/');
    if (transport.wsSettings?.headers?.Host) {
      params.set('host', transport.wsSettings.headers.Host);
    }
  } else if (transport.network === 'grpc') {
    params.set('serviceName', transport.grpcSettings?.serviceName || '');
    if (transport.grpcSettings?.multiMode) {
      params.set('mode', 'multi');
    }
  } else if (transport.network === 'xhttp') {
    params.set('path', transport.xhttpSettings?.path || '/');
    if (transport.xhttpSettings?.host) {
      params.set('host', transport.xhttpSettings.host);
    }
  }

  appendSecurityParams(params, transport);

  const encoded = `${uuid}@${serverAddress}:${data.port}?${params.toString()}`;
  return `vless://${encoded}#${encodeURIComponent(user.email)}`;
}

function buildVmessLink(
  user: User,
  data: InboundData,
  serverAddress: string,
  transport: TransportSettings
): string {
  const vmessConfig: Record<string, unknown> = {
    v: '2',
    ps: user.email,
    add: serverAddress,
    port: String(data.port),
    id: user.id || '',
    aid: '0',
    scy: 'auto',
    net: transport.network === 'raw' ? 'tcp' : transport.network,
    type: 'none',
    tls: transport.security === 'tls' ? 'tls' : '',
  };

  if (transport.network === 'ws') {
    vmessConfig.path = transport.wsSettings?.path || '/';
    if (transport.wsSettings?.headers?.Host) {
      vmessConfig.host = transport.wsSettings.headers.Host;
    }
  } else if (transport.network === 'grpc') {
    vmessConfig.path = transport.grpcSettings?.serviceName || '';
  }

  if (transport.security === 'tls' && transport.tlsSettings?.serverName) {
    vmessConfig.sni = transport.tlsSettings.serverName;
  }

  const json = JSON.stringify(vmessConfig);
  return `vmess://${btoa(json)}`;
}

function buildTrojanLink(
  user: User,
  data: InboundData,
  serverAddress: string,
  transport: TransportSettings
): string {
  const password = user.password || '';
  const params = new URLSearchParams();

  params.set('type', transport.network === 'raw' ? 'tcp' : transport.network);
  params.set('security', transport.security);

  if (transport.network === 'ws') {
    params.set('path', transport.wsSettings?.path || '/');
    if (transport.wsSettings?.headers?.Host) {
      params.set('host', transport.wsSettings.headers.Host);
    }
  } else if (transport.network === 'grpc') {
    params.set('serviceName', transport.grpcSettings?.serviceName || '');
  }

  appendSecurityParams(params, transport);

  const encoded = `${encodeURIComponent(password)}@${serverAddress}:${data.port}?${params.toString()}`;
  return `trojan://${encoded}#${encodeURIComponent(user.email)}`;
}

function appendSecurityParams(params: URLSearchParams, transport: TransportSettings) {
  if (transport.security === 'tls' && transport.tlsSettings) {
    if (transport.tlsSettings.serverName) {
      params.set('sni', transport.tlsSettings.serverName);
    }
    if (transport.tlsSettings.fingerprint) {
      params.set('fp', transport.tlsSettings.fingerprint);
    }
    if (transport.tlsSettings.alpn && transport.tlsSettings.alpn.length > 0) {
      params.set('alpn', transport.tlsSettings.alpn.join(','));
    }
  }
  if (transport.security === 'reality' && transport.realitySettings) {
    if (transport.realitySettings.serverName) {
      params.set('sni', transport.realitySettings.serverName);
    }
    if (transport.realitySettings.fingerprint) {
      params.set('fp', transport.realitySettings.fingerprint);
    }
    if (transport.realitySettings.publicKey) {
      params.set('pbk', transport.realitySettings.publicKey);
    }
    if (transport.realitySettings.shortId) {
      params.set('sid', transport.realitySettings.shortId);
    }
    if (transport.realitySettings.spiderX) {
      params.set('spx', transport.realitySettings.spiderX);
    }
  }
}

// ── Build minimal xray client config for a single user ──

function buildClientConfig(
  user: User,
  data: InboundData,
  serverAddress: string,
  transport: TransportSettings
): object {
  const protocol = data.protocol;

  const streamSettings: Record<string, unknown> = {
    network: transport.network === 'raw' ? 'tcp' : transport.network,
    security: transport.security,
  };

  if (transport.network === 'ws' && transport.wsSettings) {
    streamSettings.wsSettings = transport.wsSettings;
  }
  if (transport.network === 'grpc' && transport.grpcSettings) {
    streamSettings.grpcSettings = transport.grpcSettings;
  }
  if (transport.network === 'xhttp' && transport.xhttpSettings) {
    streamSettings.xhttpSettings = transport.xhttpSettings;
  }
  if (transport.security === 'tls' && transport.tlsSettings) {
    streamSettings.tlsSettings = transport.tlsSettings;
  }
  if (transport.security === 'reality' && transport.realitySettings) {
    streamSettings.realitySettings = transport.realitySettings;
  }

  let outboundSettings: Record<string, unknown>;

  if (protocol === 'vless') {
    outboundSettings = {
      vnext: [{
        address: serverAddress,
        port: data.port,
        users: [{ id: user.id || '', encryption: 'none', email: user.email }],
      }],
    };
  } else if (protocol === 'vmess') {
    outboundSettings = {
      vnext: [{
        address: serverAddress,
        port: data.port,
        users: [{ id: user.id || '', security: 'auto', email: user.email }],
      }],
    };
  } else if (protocol === 'trojan') {
    outboundSettings = {
      servers: [{
        address: serverAddress,
        port: data.port,
        password: user.password || '',
        email: user.email,
      }],
    };
  } else {
    outboundSettings = {};
  }

  return {
    log: { loglevel: 'warning' },
    inbounds: [
      {
        tag: 'socks-in',
        protocol: 'socks',
        listen: '127.0.0.1',
        port: 1080,
        settings: { auth: 'noauth', udp: true },
      },
      {
        tag: 'http-in',
        protocol: 'http',
        listen: '127.0.0.1',
        port: 1081,
      },
    ],
    outbounds: [
      {
        tag: 'proxy',
        protocol,
        settings: outboundSettings,
        streamSettings,
      },
      {
        tag: 'direct',
        protocol: 'freedom',
      },
    ],
    routing: {
      domainStrategy: 'AsIs',
      rules: [
        { type: 'field', outboundTag: 'proxy', network: 'tcp,udp' },
      ],
    },
  };
}

// ── Main export function ──

function isCrossGroupEdge(edge: GraphEdge, nodeServerMap: Map<string, string | undefined>): boolean {
  const sourceServer = nodeServerMap.get(edge.source);
  const targetServer = nodeServerMap.get(edge.target);
  return sourceServer !== targetServer;
}

function getInboundTransport(
  inboundId: string,
  edges: GraphEdge[],
  nodeServerMap: Map<string, string | undefined>
): TransportSettings | undefined {
  for (const edge of edges) {
    if (edge.target !== inboundId) continue;
    if (!isCrossGroupEdge(edge, nodeServerMap)) continue;
    const transport = edge.data?.transport;
    if (transport) return transport;
  }
  return undefined;
}

export function generateClientConfigs(
  nodes: GraphNode[],
  edges: GraphEdge[],
  serverAddress?: string
): ClientConfigResult[] {
  const results: ClientConfigResult[] = [];

  const inboundNodes = nodes.filter((n) => getNodeData(n).nodeType === 'inbound');
  const nodeServerMap = new Map(
    nodes.map((n) => {
      const data = n.data as Record<string, unknown>;
      const serverId = typeof data.serverId === 'string' ? data.serverId : undefined;
      return [n.id, serverId] as const;
    })
  );

  for (const node of inboundNodes) {
    const data = getNodeData(node) as InboundData & { nodeType: 'inbound' };
    const users = data.users || [];
    const addr = serverAddress || 'YOUR_SERVER_IP';
    const transport = getInboundTransport(node.id, edges, nodeServerMap) || data.transport || { ...defaultTransport };

    // Only protocols that support users
    if (!['vless', 'vmess', 'trojan'].includes(data.protocol)) continue;
    if (users.length === 0) continue;

    for (const user of users) {
      let shareLink = '';
      if (data.protocol === 'vless') {
        shareLink = buildVlessLink(user, data, addr, transport);
      } else if (data.protocol === 'vmess') {
        shareLink = buildVmessLink(user, data, addr, transport);
      } else if (data.protocol === 'trojan') {
        shareLink = buildTrojanLink(user, data, addr, transport);
      }

      results.push({
        email: user.email,
        config: buildClientConfig(user, data, addr, transport),
        shareLink,
        protocol: data.protocol,
      });
    }
  }

  return results;
}

// ── Subscription file (base64) ──

export function generateSubscription(clientConfigs: ClientConfigResult[]): string {
  const links = clientConfigs.map((c) => c.shareLink).join('\n');
  return btoa(links);
}

// ── QR Code generation ──

export async function generateQrDataUrl(shareLink: string): Promise<string> {
  return QRCode.toDataURL(shareLink, {
    width: 256,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  });
}

export async function generateQrPngBlob(shareLink: string): Promise<Blob> {
  const dataUrl = await generateQrDataUrl(shareLink);
  const resp = await fetch(dataUrl);
  return resp.blob();
}
