import QRCode from 'qrcode';
import type { Node } from '@xyflow/react';
import type { XrayNodeData, InboundData, User, TransportSettings } from '@/types';

// ── Client config export: per-user configs + share links + QR codes ──

export interface ClientConfigResult {
  email: string;
  config: object;
  shareLink: string;
  protocol: string;
}

type GraphNode = Node<XrayNodeData>;

function getNodeData(node: GraphNode): XrayNodeData {
  return node.data as XrayNodeData;
}

// ── Share link builders ──

function buildVlessLink(
  user: User,
  data: InboundData,
  serverAddress: string
): string {
  const uuid = user.id || '';
  const transport = data.transport;
  const params = new URLSearchParams();

  params.set('type', transport.network);
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
  serverAddress: string
): string {
  const vmessConfig: Record<string, unknown> = {
    v: '2',
    ps: user.email,
    add: serverAddress,
    port: String(data.port),
    id: user.id || '',
    aid: '0',
    scy: 'auto',
    net: data.transport.network,
    type: 'none',
    tls: data.transport.security === 'tls' ? 'tls' : '',
  };

  if (data.transport.network === 'ws') {
    vmessConfig.path = data.transport.wsSettings?.path || '/';
    if (data.transport.wsSettings?.headers?.Host) {
      vmessConfig.host = data.transport.wsSettings.headers.Host;
    }
  } else if (data.transport.network === 'grpc') {
    vmessConfig.path = data.transport.grpcSettings?.serviceName || '';
  }

  if (data.transport.security === 'tls' && data.transport.tlsSettings?.serverName) {
    vmessConfig.sni = data.transport.tlsSettings.serverName;
  }

  const json = JSON.stringify(vmessConfig);
  return `vmess://${btoa(json)}`;
}

function buildTrojanLink(
  user: User,
  data: InboundData,
  serverAddress: string
): string {
  const password = user.password || '';
  const transport = data.transport;
  const params = new URLSearchParams();

  params.set('type', transport.network);
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
  serverAddress: string
): object {
  const protocol = data.protocol;
  const transport = data.transport;

  const streamSettings: Record<string, unknown> = {
    network: transport.network,
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

export function generateClientConfigs(
  nodes: GraphNode[],
  serverAddress?: string
): ClientConfigResult[] {
  const results: ClientConfigResult[] = [];

  const inboundNodes = nodes.filter((n) => getNodeData(n).nodeType === 'inbound');

  for (const node of inboundNodes) {
    const data = getNodeData(node) as InboundData & { nodeType: 'inbound' };
    const users = data.users || [];
    const addr = serverAddress || 'YOUR_SERVER_IP';

    // Only protocols that support users
    if (!['vless', 'vmess', 'trojan'].includes(data.protocol)) continue;
    if (users.length === 0) continue;

    for (const user of users) {
      let shareLink = '';
      if (data.protocol === 'vless') {
        shareLink = buildVlessLink(user, data, addr);
      } else if (data.protocol === 'vmess') {
        shareLink = buildVmessLink(user, data, addr);
      } else if (data.protocol === 'trojan') {
        shareLink = buildTrojanLink(user, data, addr);
      }

      results.push({
        email: user.email,
        config: buildClientConfig(user, data, addr),
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
