import { z } from 'zod';

// ── Transport Settings ──

export const WsSettingsSchema = z.object({
  path: z.string().optional(),
  headers: z.record(z.string()).optional(),
});

export const GrpcSettingsSchema = z.object({
  serviceName: z.string().optional(),
  multiMode: z.boolean().optional(),
});

export const XhttpSettingsSchema = z.object({
  path: z.string().optional(),
  host: z.string().optional(),
});

export const TlsSettingsSchema = z.object({
  serverName: z.string().optional(),
  alpn: z.array(z.string()).optional(),
  fingerprint: z.string().optional(),
});

export const RealitySettingsSchema = z.object({
  serverName: z.string().optional(),
  fingerprint: z.string().optional(),
  publicKey: z.string().optional(),
  shortId: z.string().optional(),
  spiderX: z.string().optional(),
});

export const TransportSettingsSchema = z.object({
  network: z.enum(['raw', 'ws', 'grpc', 'xhttp']),
  wsSettings: WsSettingsSchema.optional(),
  grpcSettings: GrpcSettingsSchema.optional(),
  xhttpSettings: XhttpSettingsSchema.optional(),
  security: z.enum(['none', 'tls', 'reality']),
  tlsSettings: TlsSettingsSchema.optional(),
  realitySettings: RealitySettingsSchema.optional(),
});

// ── User ──

export const UserSchema = z.object({
  email: z.string(),
  id: z.string().uuid().optional(),
  password: z.string().optional(),
  level: z.number().min(0).max(255).optional(),
});

// ── Inbound protocols ──

export const InboundProtocol = z.enum([
  'http', 'socks', 'vless', 'vmess', 'trojan', 'shadowsocks', 'dokodemo-door',
]);

// ── Outbound protocols ──

export const OutboundProtocol = z.enum([
  'freedom', 'blackhole', 'dns', 'http', 'socks', 'vless', 'vmess', 'trojan', 'shadowsocks',
]);

export const TerminalProtocol = z.enum(['freedom', 'blackhole', 'dns']);
export const ProxyProtocol = z.enum(['http', 'socks', 'vless', 'vmess', 'trojan', 'shadowsocks']);

// ── Node Data ──

export const InboundDataSchema = z.object({
  tag: z.string().min(1),
  protocol: InboundProtocol,
  listen: z.string().default('0.0.0.0'),
  port: z.number().min(1).max(65535),
  sniffing: z.boolean().optional(),
  users: z.array(UserSchema).optional(),
  // Legacy: transport moved to edges
  transport: TransportSettingsSchema.optional(),
  serverId: z.string().optional(),
});

export const RoutingDataSchema = z.object({
  tag: z.string().min(1),
  domain: z.array(z.string()).optional(),
  ip: z.array(z.string()).optional(),
  port: z.string().optional(),
  protocol: z.array(z.string()).optional(),
  network: z.enum(['tcp', 'udp']).optional(),
  inboundTag: z.string().optional(),
  serverId: z.string().optional(),
});

export const BalancerDataSchema = z.object({
  tag: z.string().min(1),
  strategy: z.enum(['random', 'leastPing', 'roundRobin']),
  selector: z.array(z.string()),
  serverId: z.string().optional(),
});

export const OutboundDataSchema = z.object({
  tag: z.string().min(1),
  protocol: OutboundProtocol,
  serverAddress: z.string().optional(),
  serverPort: z.number().min(1).max(65535).optional(),
  settings: z.any().optional(),
  // Legacy: transport moved to edges
  transport: TransportSettingsSchema.optional(),
  serverId: z.string().optional(),
});

// ── Device Data ──

export const DeviceConnectionType = z.enum(['tun2socks', 'socks', 'http']);

export const DeviceDataSchema = z.object({
  name: z.string().default('My Device'),
  connectionType: DeviceConnectionType.default('socks'),
});

// ── Simple Mode Node Data ──

export const SimpleServerProtocol = z.enum(['vless', 'vmess', 'trojan', 'shadowsocks']);

export const SimpleServerDataSchema = z.object({
  name: z.string().default('Server'),
  host: z.string().default(''),
  port: z.number().min(1).max(65535).default(443),
  protocol: SimpleServerProtocol.default('vless'),
  uuid: z.string().optional(),
  password: z.string().optional(),
  network: z.enum(['raw', 'ws', 'grpc', 'xhttp']).default('raw'),
  security: z.enum(['none', 'tls', 'reality']).default('none'),
  sni: z.string().optional(),
  fingerprint: z.string().optional(),
  alpn: z.string().optional(),
  wsPath: z.string().optional(),
  wsHost: z.string().optional(),
  grpcServiceName: z.string().optional(),
  xhttpPath: z.string().optional(),
  xhttpHost: z.string().optional(),
  realityPublicKey: z.string().optional(),
  realityShortId: z.string().optional(),
  realitySpiderX: z.string().optional(),
});

export const SimpleInternetDataSchema = z.object({
  label: z.string().default('Internet'),
});

export const SimpleBlockDataSchema = z.object({
  label: z.string().default('Block'),
});

export const SimpleRuleCondition = z.object({
  type: z.enum(['domain', 'geosite', 'geoip', 'all']),
  value: z.string().default(''),
});

export const SimpleRulesDataSchema = z.object({
  label: z.string().default('Rules'),
  rules: z.array(SimpleRuleCondition).default([]),
});

// ── Node Types ──

export const NodeType = z.enum([
  'device', 'inbound', 'routing', 'balancer', 'outbound-terminal', 'outbound-proxy',
  'simple-server', 'simple-internet', 'simple-block', 'simple-rules',
]);

// ── Server ──

export const ServerSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  host: z.string().min(1),
  sshPort: z.number().min(1).max(65535).default(22),
  sshUser: z.string().optional(),
});

// ── Edge ──

export const EdgeDataSchema = z.object({
  priority: z.number().optional(),
  label: z.string().optional(),
  transport: TransportSettingsSchema.optional(),
});

export const EdgeType = z.enum(['default', 'conditional']);

// ── Project ──

export const ProjectMode = z.enum(['simple', 'advanced']);

export const ProjectMetadataSchema = z.object({
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const XrayProjectSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  version: z.string(),
  mode: ProjectMode,
  servers: z.array(ServerSchema),
  metadata: ProjectMetadataSchema,
});

// ── Inferred Types ──

export type TransportSettings = z.infer<typeof TransportSettingsSchema>;
export type WsSettings = z.infer<typeof WsSettingsSchema>;
export type GrpcSettings = z.infer<typeof GrpcSettingsSchema>;
export type XhttpSettings = z.infer<typeof XhttpSettingsSchema>;
export type TlsSettings = z.infer<typeof TlsSettingsSchema>;
export type RealitySettings = z.infer<typeof RealitySettingsSchema>;
export type User = z.infer<typeof UserSchema>;
export type InboundData = z.infer<typeof InboundDataSchema>;
export type RoutingData = z.infer<typeof RoutingDataSchema>;
export type BalancerData = z.infer<typeof BalancerDataSchema>;
export type OutboundData = z.infer<typeof OutboundDataSchema>;
export type Server = z.infer<typeof ServerSchema>;
export type EdgeData = z.infer<typeof EdgeDataSchema>;
export type ProjectMetadata = z.infer<typeof ProjectMetadataSchema>;
export type DeviceData = z.infer<typeof DeviceDataSchema>;
export type DeviceConnectionType = z.infer<typeof DeviceConnectionType>;
export type SimpleServerData = z.infer<typeof SimpleServerDataSchema>;
export type SimpleInternetData = z.infer<typeof SimpleInternetDataSchema>;
export type SimpleBlockData = z.infer<typeof SimpleBlockDataSchema>;
export type SimpleRuleCondition = z.infer<typeof SimpleRuleCondition>;
export type SimpleRulesData = z.infer<typeof SimpleRulesDataSchema>;
export type XrayProject = z.infer<typeof XrayProjectSchema>;
export type NodeType = z.infer<typeof NodeType>;
export type ProjectMode = z.infer<typeof ProjectMode>;

// ── Graph Node Data (union for React Flow) ──

export type XrayNodeData =
  | ({ nodeType: 'device' } & DeviceData)
  | ({ nodeType: 'inbound' } & InboundData)
  | ({ nodeType: 'routing' } & RoutingData)
  | ({ nodeType: 'balancer' } & BalancerData)
  | ({ nodeType: 'outbound-terminal' } & OutboundData)
  | ({ nodeType: 'outbound-proxy' } & OutboundData)
  | ({ nodeType: 'simple-server' } & SimpleServerData)
  | ({ nodeType: 'simple-internet' } & SimpleInternetData)
  | ({ nodeType: 'simple-block' } & SimpleBlockData)
  | ({ nodeType: 'simple-rules' } & SimpleRulesData);

// ── Defaults ──

export const defaultTransport: TransportSettings = {
  network: 'raw',
  security: 'none',
};

export function createDefaultInboundData(protocol: InboundData['protocol'] = 'vless'): InboundData {
  return {
    tag: '',
    protocol,
    listen: '0.0.0.0',
    port: 443,
  };
}

export function createDefaultRoutingData(): RoutingData {
  return {
    tag: '',
  };
}

export function createDefaultBalancerData(): BalancerData {
  return {
    tag: '',
    strategy: 'random',
    selector: [],
  };
}

export function createDefaultDeviceData(): DeviceData {
  return {
    name: 'My Device',
    connectionType: 'socks',
  };
}

export function createDefaultOutboundData(
  protocol: OutboundData['protocol'] = 'freedom'
): OutboundData {
  return {
    tag: '',
    protocol,
  };
}

export function createDefaultSimpleServerData(): SimpleServerData {
  return {
    name: 'Server',
    host: '',
    port: 443,
    protocol: 'vless',
    network: 'raw',
    security: 'none',
  };
}

export function createDefaultSimpleInternetData(): SimpleInternetData {
  return {
    label: 'Internet',
  };
}

export function createDefaultSimpleBlockData(): SimpleBlockData {
  return {
    label: 'Block',
  };
}

export function createDefaultSimpleRulesData(): SimpleRulesData {
  return {
    label: 'Rules',
    rules: [],
  };
}
