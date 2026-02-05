import type { XrayNodeData } from '@/types';

/**
 * Template definition — describes a pre-built graph configuration.
 * Nodes use placeholder IDs that get replaced with real UUIDs on apply.
 */

export interface TemplateNode {
  id: string; // placeholder ID
  type: string;
  position: { x: number; y: number };
  data: XrayNodeData;
}

export interface TemplateEdge {
  source: string; // placeholder ID
  target: string; // placeholder ID
  type?: 'default' | 'conditional';
}

export type TemplateDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';
export type TemplateCategory = 'Basic' | 'Routing' | 'Infrastructure' | 'Advanced';

export interface Template {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  difficulty: TemplateDifficulty;
  tags: string[];
  nodes: TemplateNode[];
  edges: TemplateEdge[];
  /** What will be created — shown in preview */
  summary: string[];
}

// ── Basic Templates ──

const simpleVpn: Template = {
  id: 'simple-vpn',
  name: 'Simple VPN',
  description: 'Direct VLESS connection with no transport encryption. Quick start for testing.',
  category: 'Basic',
  difficulty: 'Beginner',
  tags: ['vless', 'basic', 'quick-start'],
  nodes: [
    {
      id: 'in1',
      type: 'inbound',
      position: { x: 0, y: 100 },
      data: {
        nodeType: 'inbound',
        tag: 'vless-in',
        protocol: 'vless',
        listen: '0.0.0.0',
        port: 443,
        transport: { network: 'tcp', security: 'none' },
      },
    },
    {
      id: 'out1',
      type: 'outbound-terminal',
      position: { x: 400, y: 100 },
      data: {
        nodeType: 'outbound-terminal',
        tag: 'direct',
        protocol: 'freedom',
      },
    },
  ],
  edges: [{ source: 'in1', target: 'out1' }],
  summary: ['1 VLESS Inbound (port 443)', '1 Freedom Outbound (direct)'],
};

const secureVpn: Template = {
  id: 'secure-vpn',
  name: 'Secure VPN',
  description: 'VLESS with TLS encryption for secure connections. Recommended for production.',
  category: 'Basic',
  difficulty: 'Beginner',
  tags: ['vless', 'tls', 'secure'],
  nodes: [
    {
      id: 'in1',
      type: 'inbound',
      position: { x: 0, y: 100 },
      data: {
        nodeType: 'inbound',
        tag: 'vless-tls-in',
        protocol: 'vless',
        listen: '0.0.0.0',
        port: 443,
        transport: {
          network: 'tcp',
          security: 'tls',
          tlsSettings: { serverName: 'example.com' },
        },
      },
    },
    {
      id: 'out1',
      type: 'outbound-terminal',
      position: { x: 400, y: 100 },
      data: {
        nodeType: 'outbound-terminal',
        tag: 'direct',
        protocol: 'freedom',
      },
    },
  ],
  edges: [{ source: 'in1', target: 'out1' }],
  summary: ['1 VLESS Inbound with TLS (port 443)', '1 Freedom Outbound'],
};

const stealthVpn: Template = {
  id: 'stealth-vpn',
  name: 'Stealth VPN',
  description: 'VLESS + XHTTP + Reality for maximum DPI protection. Masquerades as legitimate traffic.',
  category: 'Basic',
  difficulty: 'Beginner',
  tags: ['vless', 'reality', 'xhttp', 'stealth', 'anti-dpi'],
  nodes: [
    {
      id: 'in1',
      type: 'inbound',
      position: { x: 0, y: 100 },
      data: {
        nodeType: 'inbound',
        tag: 'vless-reality-in',
        protocol: 'vless',
        listen: '0.0.0.0',
        port: 443,
        transport: {
          network: 'xhttp',
          security: 'reality',
          xhttpSettings: { path: '/xhttp' },
          realitySettings: {
            serverName: 'www.google.com',
            fingerprint: 'chrome',
          },
        },
      },
    },
    {
      id: 'out1',
      type: 'outbound-terminal',
      position: { x: 400, y: 100 },
      data: {
        nodeType: 'outbound-terminal',
        tag: 'direct',
        protocol: 'freedom',
      },
    },
  ],
  edges: [{ source: 'in1', target: 'out1' }],
  summary: ['1 VLESS Inbound with Reality + XHTTP', '1 Freedom Outbound'],
};

// ── Routing Templates ──

const geoRouting: Template = {
  id: 'geo-routing',
  name: 'Geo-routing',
  description: 'Route domestic traffic directly, send international traffic through proxy. Optimizes performance for local sites.',
  category: 'Routing',
  difficulty: 'Intermediate',
  tags: ['routing', 'geo', 'split'],
  nodes: [
    {
      id: 'in1',
      type: 'inbound',
      position: { x: 0, y: 150 },
      data: {
        nodeType: 'inbound',
        tag: 'vless-in',
        protocol: 'vless',
        listen: '0.0.0.0',
        port: 443,
        transport: { network: 'tcp', security: 'tls', tlsSettings: { serverName: 'example.com' } },
      },
    },
    {
      id: 'rule1',
      type: 'routing',
      position: { x: 250, y: 50 },
      data: {
        nodeType: 'routing',
        tag: 'domestic-rule',
        ip: ['geoip:ru', 'geoip:private'],
      },
    },
    {
      id: 'rule2',
      type: 'routing',
      position: { x: 250, y: 250 },
      data: {
        nodeType: 'routing',
        tag: 'international-rule',
      },
    },
    {
      id: 'out1',
      type: 'outbound-terminal',
      position: { x: 500, y: 50 },
      data: {
        nodeType: 'outbound-terminal',
        tag: 'direct',
        protocol: 'freedom',
      },
    },
    {
      id: 'out2',
      type: 'outbound-proxy',
      position: { x: 500, y: 250 },
      data: {
        nodeType: 'outbound-proxy',
        tag: 'proxy-out',
        protocol: 'vless',
        serverAddress: 'proxy.example.com',
        serverPort: 443,
        transport: { network: 'tcp', security: 'tls', tlsSettings: { serverName: 'proxy.example.com' } },
      },
    },
  ],
  edges: [
    { source: 'in1', target: 'rule1' },
    { source: 'in1', target: 'rule2' },
    { source: 'rule1', target: 'out1' },
    { source: 'rule2', target: 'out2' },
  ],
  summary: ['1 VLESS Inbound', '2 Routing Rules (domestic + international)', '1 Freedom + 1 Proxy Outbound'],
};

const splitTunneling: Template = {
  id: 'split-tunneling',
  name: 'Split-tunneling',
  description: 'Route specific domains through proxy, all other traffic goes direct. Useful for accessing geo-restricted content.',
  category: 'Routing',
  difficulty: 'Intermediate',
  tags: ['routing', 'split', 'domain'],
  nodes: [
    {
      id: 'in1',
      type: 'inbound',
      position: { x: 0, y: 150 },
      data: {
        nodeType: 'inbound',
        tag: 'socks-in',
        protocol: 'socks',
        listen: '127.0.0.1',
        port: 1080,
        transport: { network: 'tcp', security: 'none' },
      },
    },
    {
      id: 'rule1',
      type: 'routing',
      position: { x: 250, y: 50 },
      data: {
        nodeType: 'routing',
        tag: 'proxy-domains',
        domain: ['geosite:google', 'geosite:youtube', 'geosite:netflix'],
      },
    },
    {
      id: 'rule2',
      type: 'routing',
      position: { x: 250, y: 250 },
      data: {
        nodeType: 'routing',
        tag: 'direct-all',
      },
    },
    {
      id: 'out1',
      type: 'outbound-proxy',
      position: { x: 500, y: 50 },
      data: {
        nodeType: 'outbound-proxy',
        tag: 'proxy-out',
        protocol: 'vless',
        serverAddress: 'proxy.example.com',
        serverPort: 443,
        transport: { network: 'ws', security: 'tls', wsSettings: { path: '/ws' }, tlsSettings: { serverName: 'proxy.example.com' } },
      },
    },
    {
      id: 'out2',
      type: 'outbound-terminal',
      position: { x: 500, y: 250 },
      data: {
        nodeType: 'outbound-terminal',
        tag: 'direct',
        protocol: 'freedom',
      },
    },
  ],
  edges: [
    { source: 'in1', target: 'rule1' },
    { source: 'in1', target: 'rule2' },
    { source: 'rule1', target: 'out1' },
    { source: 'rule2', target: 'out2' },
  ],
  summary: ['1 SOCKS Inbound (localhost:1080)', '2 Routing Rules (domain-based)', '1 Proxy + 1 Direct Outbound'],
};

const appRouting: Template = {
  id: 'app-routing',
  name: 'App-based Routing',
  description: 'Route traffic by protocol type. HTTP/HTTPS through proxy, BitTorrent blocked, everything else direct.',
  category: 'Routing',
  difficulty: 'Intermediate',
  tags: ['routing', 'protocol', 'app'],
  nodes: [
    {
      id: 'in1',
      type: 'inbound',
      position: { x: 0, y: 150 },
      data: {
        nodeType: 'inbound',
        tag: 'socks-in',
        protocol: 'socks',
        listen: '127.0.0.1',
        port: 1080,
        transport: { network: 'tcp', security: 'none' },
      },
    },
    {
      id: 'rule1',
      type: 'routing',
      position: { x: 250, y: 0 },
      data: {
        nodeType: 'routing',
        tag: 'http-traffic',
        protocol: ['http', 'tls'],
      },
    },
    {
      id: 'rule2',
      type: 'routing',
      position: { x: 250, y: 150 },
      data: {
        nodeType: 'routing',
        tag: 'bittorrent-block',
        protocol: ['bittorrent'],
      },
    },
    {
      id: 'rule3',
      type: 'routing',
      position: { x: 250, y: 300 },
      data: {
        nodeType: 'routing',
        tag: 'other-direct',
      },
    },
    {
      id: 'out1',
      type: 'outbound-proxy',
      position: { x: 500, y: 0 },
      data: {
        nodeType: 'outbound-proxy',
        tag: 'proxy-out',
        protocol: 'vless',
        serverAddress: 'proxy.example.com',
        serverPort: 443,
        transport: { network: 'tcp', security: 'tls', tlsSettings: { serverName: 'proxy.example.com' } },
      },
    },
    {
      id: 'out2',
      type: 'outbound-terminal',
      position: { x: 500, y: 150 },
      data: {
        nodeType: 'outbound-terminal',
        tag: 'block',
        protocol: 'blackhole',
      },
    },
    {
      id: 'out3',
      type: 'outbound-terminal',
      position: { x: 500, y: 300 },
      data: {
        nodeType: 'outbound-terminal',
        tag: 'direct',
        protocol: 'freedom',
      },
    },
  ],
  edges: [
    { source: 'in1', target: 'rule1' },
    { source: 'in1', target: 'rule2' },
    { source: 'in1', target: 'rule3' },
    { source: 'rule1', target: 'out1' },
    { source: 'rule2', target: 'out2' },
    { source: 'rule3', target: 'out3' },
  ],
  summary: ['1 SOCKS Inbound', '3 Routing Rules (HTTP/BitTorrent/other)', '1 Proxy + 1 Blackhole + 1 Freedom'],
};

// ── Infrastructure Templates ──

const twoServerChain: Template = {
  id: 'two-server-chain',
  name: 'Two-server Chain',
  description: 'Entry server proxies to exit server. Separates traffic entry point from exit point.',
  category: 'Infrastructure',
  difficulty: 'Intermediate',
  tags: ['chain', 'multi-server', 'infrastructure'],
  nodes: [
    {
      id: 'in1',
      type: 'inbound',
      position: { x: 0, y: 100 },
      data: {
        nodeType: 'inbound',
        tag: 'entry-vless',
        protocol: 'vless',
        listen: '0.0.0.0',
        port: 443,
        transport: { network: 'ws', security: 'tls', wsSettings: { path: '/ws' }, tlsSettings: { serverName: 'entry.example.com' } },
      },
    },
    {
      id: 'proxy1',
      type: 'outbound-proxy',
      position: { x: 300, y: 100 },
      data: {
        nodeType: 'outbound-proxy',
        tag: 'to-exit',
        protocol: 'vless',
        serverAddress: 'exit.example.com',
        serverPort: 443,
        transport: { network: 'tcp', security: 'tls', tlsSettings: { serverName: 'exit.example.com' } },
      },
    },
    {
      id: 'in2',
      type: 'inbound',
      position: { x: 500, y: 100 },
      data: {
        nodeType: 'inbound',
        tag: 'exit-vless',
        protocol: 'vless',
        listen: '0.0.0.0',
        port: 443,
        transport: { network: 'tcp', security: 'tls', tlsSettings: { serverName: 'exit.example.com' } },
      },
    },
    {
      id: 'out1',
      type: 'outbound-terminal',
      position: { x: 800, y: 100 },
      data: {
        nodeType: 'outbound-terminal',
        tag: 'freedom',
        protocol: 'freedom',
      },
    },
  ],
  edges: [
    { source: 'in1', target: 'proxy1' },
    { source: 'in2', target: 'out1' },
  ],
  summary: ['Entry server: VLESS Inbound (WS+TLS) → Proxy Outbound', 'Exit server: VLESS Inbound → Freedom'],
};

const threeServerChain: Template = {
  id: 'three-server-chain',
  name: 'Three-server Chain',
  description: 'Entry → Relay → Exit chain for maximum privacy. Traffic passes through 3 servers.',
  category: 'Infrastructure',
  difficulty: 'Advanced',
  tags: ['chain', 'multi-server', 'privacy', 'infrastructure'],
  nodes: [
    {
      id: 'in1',
      type: 'inbound',
      position: { x: 0, y: 100 },
      data: {
        nodeType: 'inbound',
        tag: 'entry-in',
        protocol: 'vless',
        listen: '0.0.0.0',
        port: 443,
        transport: { network: 'ws', security: 'tls', wsSettings: { path: '/ws' }, tlsSettings: { serverName: 'entry.example.com' } },
      },
    },
    {
      id: 'proxy1',
      type: 'outbound-proxy',
      position: { x: 250, y: 100 },
      data: {
        nodeType: 'outbound-proxy',
        tag: 'to-relay',
        protocol: 'vless',
        serverAddress: 'relay.example.com',
        serverPort: 443,
        transport: { network: 'tcp', security: 'tls', tlsSettings: { serverName: 'relay.example.com' } },
      },
    },
    {
      id: 'in2',
      type: 'inbound',
      position: { x: 400, y: 100 },
      data: {
        nodeType: 'inbound',
        tag: 'relay-in',
        protocol: 'vless',
        listen: '0.0.0.0',
        port: 443,
        transport: { network: 'tcp', security: 'tls', tlsSettings: { serverName: 'relay.example.com' } },
      },
    },
    {
      id: 'proxy2',
      type: 'outbound-proxy',
      position: { x: 600, y: 100 },
      data: {
        nodeType: 'outbound-proxy',
        tag: 'to-exit',
        protocol: 'vless',
        serverAddress: 'exit.example.com',
        serverPort: 443,
        transport: { network: 'tcp', security: 'tls', tlsSettings: { serverName: 'exit.example.com' } },
      },
    },
    {
      id: 'in3',
      type: 'inbound',
      position: { x: 750, y: 100 },
      data: {
        nodeType: 'inbound',
        tag: 'exit-in',
        protocol: 'vless',
        listen: '0.0.0.0',
        port: 443,
        transport: { network: 'tcp', security: 'tls', tlsSettings: { serverName: 'exit.example.com' } },
      },
    },
    {
      id: 'out1',
      type: 'outbound-terminal',
      position: { x: 950, y: 100 },
      data: {
        nodeType: 'outbound-terminal',
        tag: 'freedom',
        protocol: 'freedom',
      },
    },
  ],
  edges: [
    { source: 'in1', target: 'proxy1' },
    { source: 'in2', target: 'proxy2' },
    { source: 'in3', target: 'out1' },
  ],
  summary: ['Entry: VLESS WS+TLS → Relay', 'Relay: VLESS TLS → Exit', 'Exit: VLESS TLS → Freedom'],
};

const loadBalanced: Template = {
  id: 'load-balanced',
  name: 'Load Balanced',
  description: 'Distribute traffic across multiple exit servers using a balancer with round-robin strategy.',
  category: 'Infrastructure',
  difficulty: 'Intermediate',
  tags: ['balancer', 'load-balance', 'infrastructure'],
  nodes: [
    {
      id: 'in1',
      type: 'inbound',
      position: { x: 0, y: 150 },
      data: {
        nodeType: 'inbound',
        tag: 'vless-in',
        protocol: 'vless',
        listen: '0.0.0.0',
        port: 443,
        transport: { network: 'tcp', security: 'tls', tlsSettings: { serverName: 'entry.example.com' } },
      },
    },
    {
      id: 'bal1',
      type: 'balancer',
      position: { x: 250, y: 150 },
      data: {
        nodeType: 'balancer',
        tag: 'lb',
        strategy: 'roundRobin',
        selector: ['exit-'],
      },
    },
    {
      id: 'out1',
      type: 'outbound-proxy',
      position: { x: 500, y: 50 },
      data: {
        nodeType: 'outbound-proxy',
        tag: 'exit-1',
        protocol: 'vless',
        serverAddress: 'exit1.example.com',
        serverPort: 443,
        transport: { network: 'tcp', security: 'tls', tlsSettings: { serverName: 'exit1.example.com' } },
      },
    },
    {
      id: 'out2',
      type: 'outbound-proxy',
      position: { x: 500, y: 150 },
      data: {
        nodeType: 'outbound-proxy',
        tag: 'exit-2',
        protocol: 'vless',
        serverAddress: 'exit2.example.com',
        serverPort: 443,
        transport: { network: 'tcp', security: 'tls', tlsSettings: { serverName: 'exit2.example.com' } },
      },
    },
    {
      id: 'out3',
      type: 'outbound-proxy',
      position: { x: 500, y: 250 },
      data: {
        nodeType: 'outbound-proxy',
        tag: 'exit-3',
        protocol: 'vless',
        serverAddress: 'exit3.example.com',
        serverPort: 443,
        transport: { network: 'tcp', security: 'tls', tlsSettings: { serverName: 'exit3.example.com' } },
      },
    },
    {
      id: 'exit-in1',
      type: 'inbound',
      position: { x: 750, y: 150 },
      data: {
        nodeType: 'inbound',
        tag: 'exit-vless',
        protocol: 'vless',
        listen: '0.0.0.0',
        port: 443,
        transport: { network: 'tcp', security: 'tls', tlsSettings: { serverName: 'exit.example.com' } },
      },
    },
    {
      id: 'freedom1',
      type: 'outbound-terminal',
      position: { x: 1000, y: 150 },
      data: {
        nodeType: 'outbound-terminal',
        tag: 'freedom',
        protocol: 'freedom',
      },
    },
  ],
  edges: [
    { source: 'in1', target: 'bal1' },
    { source: 'bal1', target: 'out1' },
    { source: 'bal1', target: 'out2' },
    { source: 'bal1', target: 'out3' },
    { source: 'exit-in1', target: 'freedom1' },
  ],
  summary: ['1 VLESS Inbound (TLS)', '1 Balancer (round-robin)', '3 Proxy Outbounds (exit servers)', 'Exit server: VLESS Inbound → Freedom'],
};

const geoDistributed: Template = {
  id: 'geo-distributed',
  name: 'Geo-distributed',
  description: 'Servers in different countries with geo-based routing. Users are routed to the nearest exit.',
  category: 'Infrastructure',
  difficulty: 'Advanced',
  tags: ['geo', 'distributed', 'infrastructure', 'routing'],
  nodes: [
    {
      id: 'in1',
      type: 'inbound',
      position: { x: 0, y: 150 },
      data: {
        nodeType: 'inbound',
        tag: 'vless-in',
        protocol: 'vless',
        listen: '0.0.0.0',
        port: 443,
        transport: { network: 'tcp', security: 'tls', tlsSettings: { serverName: 'entry.example.com' } },
      },
    },
    {
      id: 'rule1',
      type: 'routing',
      position: { x: 250, y: 50 },
      data: {
        nodeType: 'routing',
        tag: 'eu-traffic',
        ip: ['geoip:de', 'geoip:fr', 'geoip:nl'],
      },
    },
    {
      id: 'rule2',
      type: 'routing',
      position: { x: 250, y: 250 },
      data: {
        nodeType: 'routing',
        tag: 'us-traffic',
      },
    },
    {
      id: 'out1',
      type: 'outbound-proxy',
      position: { x: 500, y: 50 },
      data: {
        nodeType: 'outbound-proxy',
        tag: 'exit-eu',
        protocol: 'vless',
        serverAddress: 'eu.example.com',
        serverPort: 443,
        transport: { network: 'tcp', security: 'tls', tlsSettings: { serverName: 'eu.example.com' } },
      },
    },
    {
      id: 'out2',
      type: 'outbound-proxy',
      position: { x: 500, y: 250 },
      data: {
        nodeType: 'outbound-proxy',
        tag: 'exit-us',
        protocol: 'vless',
        serverAddress: 'us.example.com',
        serverPort: 443,
        transport: { network: 'tcp', security: 'tls', tlsSettings: { serverName: 'us.example.com' } },
      },
    },
    {
      id: 'exit-eu-in',
      type: 'inbound',
      position: { x: 750, y: 50 },
      data: {
        nodeType: 'inbound',
        tag: 'eu-inbound',
        protocol: 'vless',
        listen: '0.0.0.0',
        port: 443,
        transport: { network: 'tcp', security: 'tls', tlsSettings: { serverName: 'eu.example.com' } },
      },
    },
    {
      id: 'exit-us-in',
      type: 'inbound',
      position: { x: 750, y: 250 },
      data: {
        nodeType: 'inbound',
        tag: 'us-inbound',
        protocol: 'vless',
        listen: '0.0.0.0',
        port: 443,
        transport: { network: 'tcp', security: 'tls', tlsSettings: { serverName: 'us.example.com' } },
      },
    },
    {
      id: 'freedom-eu',
      type: 'outbound-terminal',
      position: { x: 1000, y: 50 },
      data: {
        nodeType: 'outbound-terminal',
        tag: 'freedom-eu',
        protocol: 'freedom',
      },
    },
    {
      id: 'freedom-us',
      type: 'outbound-terminal',
      position: { x: 1000, y: 250 },
      data: {
        nodeType: 'outbound-terminal',
        tag: 'freedom-us',
        protocol: 'freedom',
      },
    },
  ],
  edges: [
    { source: 'in1', target: 'rule1' },
    { source: 'in1', target: 'rule2' },
    { source: 'rule1', target: 'out1' },
    { source: 'rule2', target: 'out2' },
    { source: 'exit-eu-in', target: 'freedom-eu' },
    { source: 'exit-us-in', target: 'freedom-us' },
  ],
  summary: ['1 VLESS Inbound', '2 Geo-routing Rules (EU + US)', '2 Proxy Outbounds → 2 Exit servers with Freedom'],
};

// ── Advanced Templates ──

const cdnReady: Template = {
  id: 'cdn-ready',
  name: 'CDN-ready',
  description: 'WebSocket + TLS configured for Cloudflare CDN. Traffic appears as normal HTTPS through CDN.',
  category: 'Advanced',
  difficulty: 'Intermediate',
  tags: ['cdn', 'cloudflare', 'websocket', 'tls'],
  nodes: [
    {
      id: 'in1',
      type: 'inbound',
      position: { x: 0, y: 100 },
      data: {
        nodeType: 'inbound',
        tag: 'vless-ws-in',
        protocol: 'vless',
        listen: '0.0.0.0',
        port: 443,
        transport: {
          network: 'ws',
          security: 'tls',
          wsSettings: { path: '/ws', headers: { Host: 'cdn.example.com' } },
          tlsSettings: { serverName: 'cdn.example.com' },
        },
      },
    },
    {
      id: 'out1',
      type: 'outbound-terminal',
      position: { x: 400, y: 100 },
      data: {
        nodeType: 'outbound-terminal',
        tag: 'direct',
        protocol: 'freedom',
      },
    },
  ],
  edges: [{ source: 'in1', target: 'out1' }],
  summary: ['1 VLESS Inbound (WebSocket + TLS, CDN headers)', '1 Freedom Outbound'],
};

const fallbackChain: Template = {
  id: 'fallback-chain',
  name: 'Fallback Chain',
  description: 'Primary proxy with backup servers. If primary fails, traffic automatically routes to backups.',
  category: 'Advanced',
  difficulty: 'Advanced',
  tags: ['fallback', 'redundancy', 'reliability'],
  nodes: [
    {
      id: 'in1',
      type: 'inbound',
      position: { x: 0, y: 150 },
      data: {
        nodeType: 'inbound',
        tag: 'vless-in',
        protocol: 'vless',
        listen: '0.0.0.0',
        port: 443,
        transport: { network: 'tcp', security: 'tls', tlsSettings: { serverName: 'entry.example.com' } },
      },
    },
    {
      id: 'bal1',
      type: 'balancer',
      position: { x: 250, y: 150 },
      data: {
        nodeType: 'balancer',
        tag: 'failover',
        strategy: 'leastPing',
        selector: ['exit-'],
      },
    },
    {
      id: 'out1',
      type: 'outbound-proxy',
      position: { x: 500, y: 50 },
      data: {
        nodeType: 'outbound-proxy',
        tag: 'exit-primary',
        protocol: 'vless',
        serverAddress: 'primary.example.com',
        serverPort: 443,
        transport: { network: 'tcp', security: 'tls', tlsSettings: { serverName: 'primary.example.com' } },
      },
    },
    {
      id: 'out2',
      type: 'outbound-proxy',
      position: { x: 500, y: 150 },
      data: {
        nodeType: 'outbound-proxy',
        tag: 'exit-backup1',
        protocol: 'vless',
        serverAddress: 'backup1.example.com',
        serverPort: 443,
        transport: { network: 'tcp', security: 'tls', tlsSettings: { serverName: 'backup1.example.com' } },
      },
    },
    {
      id: 'out3',
      type: 'outbound-proxy',
      position: { x: 500, y: 250 },
      data: {
        nodeType: 'outbound-proxy',
        tag: 'exit-backup2',
        protocol: 'vless',
        serverAddress: 'backup2.example.com',
        serverPort: 443,
        transport: { network: 'tcp', security: 'tls', tlsSettings: { serverName: 'backup2.example.com' } },
      },
    },
    {
      id: 'exit-in1',
      type: 'inbound',
      position: { x: 750, y: 150 },
      data: {
        nodeType: 'inbound',
        tag: 'exit-vless',
        protocol: 'vless',
        listen: '0.0.0.0',
        port: 443,
        transport: { network: 'tcp', security: 'tls', tlsSettings: { serverName: 'exit.example.com' } },
      },
    },
    {
      id: 'freedom1',
      type: 'outbound-terminal',
      position: { x: 1000, y: 150 },
      data: {
        nodeType: 'outbound-terminal',
        tag: 'freedom',
        protocol: 'freedom',
      },
    },
  ],
  edges: [
    { source: 'in1', target: 'bal1' },
    { source: 'bal1', target: 'out1' },
    { source: 'bal1', target: 'out2' },
    { source: 'bal1', target: 'out3' },
    { source: 'exit-in1', target: 'freedom1' },
  ],
  summary: ['1 VLESS Inbound', '1 Balancer (leastPing failover)', '3 Proxy Outbounds (primary + 2 backups)', 'Exit server: VLESS Inbound → Freedom'],
};

const multiProtocol: Template = {
  id: 'multi-protocol',
  name: 'Multi-protocol',
  description: 'Multiple inbound protocols on one server. Supports VLESS, VMess, and Trojan simultaneously.',
  category: 'Advanced',
  difficulty: 'Advanced',
  tags: ['multi-protocol', 'vless', 'vmess', 'trojan'],
  nodes: [
    {
      id: 'in1',
      type: 'inbound',
      position: { x: 0, y: 0 },
      data: {
        nodeType: 'inbound',
        tag: 'vless-in',
        protocol: 'vless',
        listen: '0.0.0.0',
        port: 443,
        transport: { network: 'tcp', security: 'tls', tlsSettings: { serverName: 'example.com' } },
      },
    },
    {
      id: 'in2',
      type: 'inbound',
      position: { x: 0, y: 130 },
      data: {
        nodeType: 'inbound',
        tag: 'vmess-in',
        protocol: 'vmess',
        listen: '0.0.0.0',
        port: 8443,
        transport: { network: 'ws', security: 'tls', wsSettings: { path: '/vmess' }, tlsSettings: { serverName: 'example.com' } },
      },
    },
    {
      id: 'in3',
      type: 'inbound',
      position: { x: 0, y: 260 },
      data: {
        nodeType: 'inbound',
        tag: 'trojan-in',
        protocol: 'trojan',
        listen: '0.0.0.0',
        port: 2083,
        transport: { network: 'tcp', security: 'tls', tlsSettings: { serverName: 'example.com' } },
      },
    },
    {
      id: 'out1',
      type: 'outbound-terminal',
      position: { x: 400, y: 130 },
      data: {
        nodeType: 'outbound-terminal',
        tag: 'direct',
        protocol: 'freedom',
      },
    },
  ],
  edges: [
    { source: 'in1', target: 'out1' },
    { source: 'in2', target: 'out1' },
    { source: 'in3', target: 'out1' },
  ],
  summary: ['3 Inbounds: VLESS (443), VMess (8443), Trojan (2083)', '1 Freedom Outbound'],
};

// ── Export all templates ──

export const allTemplates: Template[] = [
  // Basic
  simpleVpn,
  secureVpn,
  stealthVpn,
  // Routing
  geoRouting,
  splitTunneling,
  appRouting,
  // Infrastructure
  twoServerChain,
  threeServerChain,
  loadBalanced,
  geoDistributed,
  // Advanced
  cdnReady,
  fallbackChain,
  multiProtocol,
];

export const templateCategories: TemplateCategory[] = ['Basic', 'Routing', 'Infrastructure', 'Advanced'];

export function getTemplatesByCategory(category: TemplateCategory): Template[] {
  return allTemplates.filter((t) => t.category === category);
}

const difficultyColors: Record<TemplateDifficulty, string> = {
  Beginner: 'text-green-400 bg-green-400/10',
  Intermediate: 'text-yellow-400 bg-yellow-400/10',
  Advanced: 'text-red-400 bg-red-400/10',
};

export function getDifficultyColor(difficulty: TemplateDifficulty): string {
  return difficultyColors[difficulty];
}
