import { useState, useMemo, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from '@/store';
import { useValidationStore } from '@/store/useValidationStore';
import type { XrayNodeData, DeviceData, InboundData, RoutingData, BalancerData, OutboundData, User, TransportSettings, EdgeData } from '@/types';
import { defaultTransport } from '@/types';

const inputClass = 'w-full text-sm bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-slate-200 outline-none focus:border-blue-500';
const monoInputClass = `${inputClass} font-mono`;
const labelClass = 'block text-xs text-slate-400 mb-1';

// ── Protocols that support user management ──

const USER_PROTOCOLS = ['vless', 'vmess', 'trojan'] as const;
type UserProtocol = typeof USER_PROTOCOLS[number];

function supportsUsers(protocol: string): protocol is UserProtocol {
  return USER_PROTOCOLS.includes(protocol as UserProtocol);
}

function isUuidProtocol(protocol: string): boolean {
  return protocol === 'vless' || protocol === 'vmess';
}

// ── Device Properties Tab ──

function DevicePropertiesTab({ data, onChange }: { data: DeviceData; onChange: (d: Partial<DeviceData>) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <label className={labelClass}>Name</label>
        <input
          type="text"
          value={data.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Connection Type</label>
        <select
          value={data.connectionType}
          onChange={(e) => onChange({ connectionType: e.target.value as DeviceData['connectionType'] })}
          className={inputClass}
        >
          {['tun2socks', 'socks', 'http'].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ── Inbound Properties Tab ──

function InboundPropertiesTab({ data, onChange }: { data: InboundData; onChange: (d: Partial<InboundData>) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <label className={labelClass}>Tag</label>
        <input
          type="text"
          value={data.tag}
          onChange={(e) => onChange({ tag: e.target.value })}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Protocol</label>
        <select
          value={data.protocol}
          onChange={(e) => onChange({ protocol: e.target.value as InboundData['protocol'] })}
          className={inputClass}
        >
          {['vless', 'vmess', 'trojan', 'shadowsocks', 'http', 'socks', 'dokodemo-door'].map(
            (p) => (
              <option key={p} value={p}>{p}</option>
            )
          )}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelClass}>Listen</label>
          <input
            type="text"
            value={data.listen}
            onChange={(e) => onChange({ listen: e.target.value })}
            className={monoInputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Port</label>
          <input
            type="number"
            value={data.port}
            onChange={(e) => onChange({ port: parseInt(e.target.value) || 0 })}
            className={monoInputClass}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="sniffing"
          checked={data.sniffing || false}
          onChange={(e) => onChange({ sniffing: e.target.checked })}
          className="rounded"
        />
        <label htmlFor="sniffing" className="text-xs text-slate-400">Enable Sniffing</label>
      </div>
    </div>
  );
}

// ── Transport Panel (edge-level) ──

function TransportTab({ transport, onChange, disabled }: {
  transport: TransportSettings;
  onChange: (t: TransportSettings) => void;
  disabled?: boolean;
}) {
  const updateTransport = (updates: Partial<TransportSettings>) => {
    onChange({ ...transport, ...updates });
  };

  return (
    <div className={`space-y-3 ${disabled ? 'opacity-60 pointer-events-none' : ''}`}>
      <div>
        <label className={labelClass}>Transport</label>
        <select
          value={transport.network}
          onChange={(e) => updateTransport({ network: e.target.value as TransportSettings['network'] })}
          className={inputClass}
          disabled={disabled}
        >
          {['raw', 'ws', 'grpc', 'xhttp'].map((n) => (
            <option key={n} value={n}>{n.toUpperCase()}</option>
          ))}
        </select>
      </div>

      {/* WebSocket settings */}
      {transport.network === 'ws' && (
        <div className="space-y-2 pl-2 border-l-2 border-slate-700">
          <div className="text-xs text-slate-500 font-medium">WebSocket</div>
          <div>
            <label className={labelClass}>Path</label>
            <input
              type="text"
              value={transport.wsSettings?.path || ''}
              onChange={(e) => updateTransport({
                wsSettings: { ...transport.wsSettings, path: e.target.value || undefined },
              })}
              placeholder="/ws"
              className={monoInputClass}
              disabled={disabled}
            />
          </div>
          <div>
            <label className={labelClass}>Host Header</label>
            <input
              type="text"
              value={transport.wsSettings?.headers?.Host || ''}
              onChange={(e) => updateTransport({
                wsSettings: {
                  ...transport.wsSettings,
                  headers: e.target.value ? { ...transport.wsSettings?.headers, Host: e.target.value } : undefined,
                },
              })}
              placeholder="example.com"
              className={monoInputClass}
              disabled={disabled}
            />
          </div>
        </div>
      )}

      {/* gRPC settings */}
      {transport.network === 'grpc' && (
        <div className="space-y-2 pl-2 border-l-2 border-slate-700">
          <div className="text-xs text-slate-500 font-medium">gRPC</div>
          <div>
            <label className={labelClass}>Service Name</label>
            <input
              type="text"
              value={transport.grpcSettings?.serviceName || ''}
              onChange={(e) => updateTransport({
                grpcSettings: { ...transport.grpcSettings, serviceName: e.target.value || undefined },
              })}
              placeholder="GunService"
              className={monoInputClass}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="grpc-multi"
              checked={transport.grpcSettings?.multiMode || false}
              onChange={(e) => updateTransport({
                grpcSettings: { ...transport.grpcSettings, multiMode: e.target.checked },
              })}
              className="rounded"
              disabled={disabled}
            />
            <label htmlFor="grpc-multi" className="text-xs text-slate-400">Multi Mode</label>
          </div>
        </div>
      )}

      {/* XHTTP settings */}
      {transport.network === 'xhttp' && (
        <div className="space-y-2 pl-2 border-l-2 border-slate-700">
          <div className="text-xs text-slate-500 font-medium">XHTTP</div>
          <div>
            <label className={labelClass}>Path</label>
            <input
              type="text"
              value={transport.xhttpSettings?.path || ''}
              onChange={(e) => updateTransport({
                xhttpSettings: { ...transport.xhttpSettings, path: e.target.value || undefined },
              })}
              placeholder="/"
              className={monoInputClass}
              disabled={disabled}
            />
          </div>
          <div>
            <label className={labelClass}>Host</label>
            <input
              type="text"
              value={transport.xhttpSettings?.host || ''}
              onChange={(e) => updateTransport({
                xhttpSettings: { ...transport.xhttpSettings, host: e.target.value || undefined },
              })}
              placeholder="example.com"
              className={monoInputClass}
              disabled={disabled}
            />
          </div>
        </div>
      )}

      {/* Security */}
      <div>
        <label className={labelClass}>Security</label>
        <select
          value={transport.security}
          onChange={(e) => updateTransport({ security: e.target.value as TransportSettings['security'] })}
          className={inputClass}
          disabled={disabled}
        >
          {['none', 'tls', 'reality'].map((s) => (
            <option key={s} value={s}>{s === 'none' ? 'None' : s.toUpperCase()}</option>
          ))}
        </select>
      </div>

      {/* TLS settings */}
      {transport.security === 'tls' && (
        <div className="space-y-2 pl-2 border-l-2 border-slate-700">
          <div className="text-xs text-slate-500 font-medium">TLS</div>
          <div>
            <label className={labelClass}>Server Name (SNI)</label>
            <input
              type="text"
              value={transport.tlsSettings?.serverName || ''}
              onChange={(e) => updateTransport({
                tlsSettings: { ...transport.tlsSettings, serverName: e.target.value || undefined },
              })}
              placeholder="example.com"
              className={monoInputClass}
              disabled={disabled}
            />
          </div>
          <div>
            <label className={labelClass}>ALPN</label>
            <input
              type="text"
              value={(transport.tlsSettings?.alpn || []).join(', ')}
              onChange={(e) => updateTransport({
                tlsSettings: {
                  ...transport.tlsSettings,
                  alpn: e.target.value ? e.target.value.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
                },
              })}
              placeholder="h2, http/1.1"
              className={monoInputClass}
              disabled={disabled}
            />
          </div>
          <div>
            <label className={labelClass}>Fingerprint</label>
            <select
              value={transport.tlsSettings?.fingerprint || ''}
              onChange={(e) => updateTransport({
                tlsSettings: { ...transport.tlsSettings, fingerprint: e.target.value || undefined },
              })}
              className={inputClass}
              disabled={disabled}
            >
              <option value="">None</option>
              {['chrome', 'firefox', 'safari', 'randomized'].map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Reality settings */}
      {transport.security === 'reality' && (
        <div className="space-y-2 pl-2 border-l-2 border-slate-700">
          <div className="text-xs text-slate-500 font-medium">Reality</div>
          <div>
            <label className={labelClass}>Server Name</label>
            <input
              type="text"
              value={transport.realitySettings?.serverName || ''}
              onChange={(e) => updateTransport({
                realitySettings: { ...transport.realitySettings, serverName: e.target.value || undefined },
              })}
              placeholder="www.microsoft.com"
              className={monoInputClass}
              disabled={disabled}
            />
          </div>
          <div>
            <label className={labelClass}>Fingerprint</label>
            <select
              value={transport.realitySettings?.fingerprint || ''}
              onChange={(e) => updateTransport({
                realitySettings: { ...transport.realitySettings, fingerprint: e.target.value || undefined },
              })}
              className={inputClass}
              disabled={disabled}
            >
              <option value="">None</option>
              {['chrome', 'firefox', 'safari', 'randomized'].map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Public Key</label>
            <input
              type="text"
              value={transport.realitySettings?.publicKey || ''}
              onChange={(e) => updateTransport({
                realitySettings: { ...transport.realitySettings, publicKey: e.target.value || undefined },
              })}
              className={monoInputClass}
              disabled={disabled}
            />
          </div>
          <div>
            <label className={labelClass}>Short ID</label>
            <input
              type="text"
              value={transport.realitySettings?.shortId || ''}
              onChange={(e) => updateTransport({
                realitySettings: { ...transport.realitySettings, shortId: e.target.value || undefined },
              })}
              className={monoInputClass}
              disabled={disabled}
            />
          </div>
          <div>
            <label className={labelClass}>SpiderX</label>
            <input
              type="text"
              value={transport.realitySettings?.spiderX || ''}
              onChange={(e) => updateTransport({
                realitySettings: { ...transport.realitySettings, spiderX: e.target.value || undefined },
              })}
              placeholder="/"
              className={monoInputClass}
              disabled={disabled}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Users Tab ──

function UsersTab({ data, onChange }: { data: InboundData; onChange: (d: Partial<InboundData>) => void }) {
  const users = data.users || [];
  const isUuid = isUuidProtocol(data.protocol);

  const addUser = () => {
    const newUser: User = {
      email: `user${users.length + 1}@example.com`,
      ...(isUuid ? { id: uuidv4() } : { password: '' }),
    };
    onChange({ users: [...users, newUser] });
  };

  const removeUser = (index: number) => {
    onChange({ users: users.filter((_, i) => i !== index) });
  };

  const updateUser = (index: number, updates: Partial<User>) => {
    onChange({
      users: users.map((u, i) => (i === index ? { ...u, ...updates } : u)),
    });
  };

  const regenerateUuid = (index: number) => {
    updateUser(index, { id: uuidv4() });
  };

  if (!supportsUsers(data.protocol)) {
    return (
      <div className="flex items-center justify-center h-32">
        <p className="text-xs text-slate-500 text-center">
          User management is not available for {data.protocol} protocol.
          <br />
          Supported: VLESS, VMess, Trojan
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-slate-400">
          {users.length} user{users.length !== 1 ? 's' : ''}
        </div>
        <button
          onClick={addUser}
          className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded hover:bg-slate-800 transition-colors"
        >
          + Add User
        </button>
      </div>

      {users.length === 0 && (
        <div className="text-center py-6 text-xs text-slate-500 border border-dashed border-slate-700 rounded">
          No users configured.
          <br />
          Click "Add User" to create one.
        </div>
      )}

      {users.map((user, i) => (
        <div
          key={i}
          className="bg-slate-800/50 border border-slate-700 rounded p-2.5 space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-mono">#{i + 1}</span>
            <button
              onClick={() => removeUser(i)}
              className="text-[11px] text-slate-500 hover:text-red-400 transition-colors"
            >
              Remove
            </button>
          </div>

          <div>
            <label className={labelClass}>Email</label>
            <input
              type="text"
              value={user.email}
              onChange={(e) => updateUser(i, { email: e.target.value })}
              placeholder="user@example.com"
              className={inputClass}
            />
          </div>

          {isUuid ? (
            <div>
              <label className={labelClass}>UUID</label>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={user.id || ''}
                  onChange={(e) => updateUser(i, { id: e.target.value })}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className={`flex-1 text-[11px] bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-slate-200 outline-none focus:border-blue-500 font-mono`}
                />
                <button
                  onClick={() => regenerateUuid(i)}
                  title="Generate new UUID"
                  className="px-2 py-1 text-[11px] text-slate-400 hover:text-blue-400 bg-slate-800 border border-slate-600 rounded hover:border-blue-500 transition-colors"
                >
                  Gen
                </button>
              </div>
            </div>
          ) : (
            <div>
              <label className={labelClass}>Password</label>
              <input
                type="text"
                value={user.password || ''}
                onChange={(e) => updateUser(i, { password: e.target.value })}
                placeholder="Enter password"
                className={monoInputClass}
              />
            </div>
          )}

          <div>
            <label className={labelClass}>Level</label>
            <input
              type="number"
              value={user.level ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                updateUser(i, { level: val === '' ? undefined : parseInt(val) });
              }}
              min={0}
              max={255}
              placeholder="0"
              className={inputClass}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── JSON Preview Tab ──

function JsonPreviewTab({ nodeData }: { nodeData: XrayNodeData }) {
  const [copied, setCopied] = useState(false);

  const json = useMemo(() => {
    const { nodeType: _, ...rest } = nodeData;
    return JSON.stringify(rest, null, 2);
  }, [nodeData]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs text-slate-400">Node Data (JSON)</div>
        <button
          onClick={handleCopy}
          className="text-[11px] text-slate-500 hover:text-blue-400 transition-colors"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div className="bg-slate-950 border border-slate-800 rounded overflow-auto max-h-[60vh]">
        <pre className="p-3 text-[11px] text-slate-300 font-mono leading-relaxed whitespace-pre-wrap break-all">
          {json}
        </pre>
      </div>
    </div>
  );
}

// ── Routing Inspector (single-tab, no tabs needed) ──

const predefinedDomains = [
  { value: 'geosite:category-ads', label: 'Ads (category-ads)' },
  { value: 'geosite:category-ads-all', label: 'All Ads (category-ads-all)' },
  { value: 'geosite:cn', label: 'China (cn)' },
  { value: 'geosite:geolocation-cn', label: 'China sites (geolocation-cn)' },
  { value: 'geosite:geolocation-!cn', label: 'Non-China sites (geolocation-!cn)' },
  { value: 'geosite:tld-cn', label: 'China TLDs (tld-cn)' },
  { value: 'geosite:tld-!cn', label: 'Non-China TLDs (tld-!cn)' },
  { value: 'geosite:google', label: 'Google' },
  { value: 'geosite:apple', label: 'Apple' },
  { value: 'geosite:microsoft', label: 'Microsoft' },
  { value: 'geosite:facebook', label: 'Facebook' },
  { value: 'geosite:twitter', label: 'Twitter' },
  { value: 'geosite:telegram', label: 'Telegram' },
];

const predefinedIPs = [
  { value: 'geoip:private', label: 'Private (127.0.0.1, 10.x, etc.)' },
  { value: 'geoip:cn', label: 'China' },
  { value: 'geoip:!cn', label: 'Non-China (!cn)' },
  { value: 'geoip:ru', label: 'Russia' },
  { value: 'geoip:us', label: 'United States' },
  { value: 'geoip:de', label: 'Germany' },
  { value: 'geoip:nl', label: 'Netherlands' },
  { value: 'geoip:jp', label: 'Japan' },
  { value: 'geoip:sg', label: 'Singapore' },
  { value: 'geoip:gb', label: 'United Kingdom' },
  { value: 'geoip:fr', label: 'France' },
  { value: 'geoip:ua', label: 'Ukraine' },
];

function RoutingInspector({ data, onChange }: { data: RoutingData; onChange: (d: Partial<RoutingData>) => void }) {
  const addDomain = (val: string) => {
    const current = data.domain || [];
    if (!current.includes(val)) onChange({ domain: [...current, val] });
  };
  const addIP = (val: string) => {
    const current = data.ip || [];
    if (!current.includes(val)) onChange({ ip: [...current, val] });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className={labelClass}>Tag</label>
        <input
          type="text"
          value={data.tag}
          onChange={(e) => onChange({ tag: e.target.value })}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Domains (one per line)</label>
        <select
          value=""
          onChange={(e) => { if (e.target.value) addDomain(e.target.value); }}
          className={`${inputClass} mb-1 text-slate-400`}
        >
          <option value="">+ Add predefined geosite...</option>
          {predefinedDomains.map((d) => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>
        <textarea
          value={(data.domain || []).join('\n')}
          onChange={(e) =>
            onChange({ domain: e.target.value.split('\n').filter(Boolean) })
          }
          rows={3}
          placeholder="geosite:google&#10;domain:example.com&#10;regexp:\.ru$"
          className={`${monoInputClass} resize-none`}
        />
      </div>
      <div>
        <label className={labelClass}>IPs (one per line)</label>
        <select
          value=""
          onChange={(e) => { if (e.target.value) addIP(e.target.value); }}
          className={`${inputClass} mb-1 text-slate-400`}
        >
          <option value="">+ Add predefined geoip...</option>
          {predefinedIPs.map((d) => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>
        <textarea
          value={(data.ip || []).join('\n')}
          onChange={(e) =>
            onChange({ ip: e.target.value.split('\n').filter(Boolean) })
          }
          rows={3}
          placeholder="geoip:private&#10;geoip:ru&#10;1.2.3.0/24"
          className={`${monoInputClass} resize-none`}
        />
      </div>
      <div>
        <label className={labelClass}>Port</label>
        <input
          type="text"
          value={data.port || ''}
          onChange={(e) => onChange({ port: e.target.value || undefined })}
          placeholder="e.g. 80,443 or 1000-2000"
          className={monoInputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Network</label>
        <select
          value={data.network || ''}
          onChange={(e) => onChange({ network: (e.target.value || undefined) as RoutingData['network'] })}
          className={inputClass}
        >
          <option value="">Any</option>
          <option value="tcp">TCP</option>
          <option value="udp">UDP</option>
        </select>
      </div>
      <div>
        <label className={labelClass}>INPUT Tag</label>
        <input
          type="text"
          value={data.inboundTag || ''}
          onChange={(e) => onChange({ inboundTag: e.target.value || undefined })}
          className={inputClass}
        />
      </div>
    </div>
  );
}

// ── Balancer Inspector ──

function BalancerInspector({ data, onChange }: { data: BalancerData; onChange: (d: Partial<BalancerData>) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <label className={labelClass}>Tag</label>
        <input
          type="text"
          value={data.tag}
          onChange={(e) => onChange({ tag: e.target.value })}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Strategy</label>
        <select
          value={data.strategy}
          onChange={(e) => onChange({ strategy: e.target.value as BalancerData['strategy'] })}
          className={inputClass}
        >
          <option value="random">Random</option>
          <option value="leastPing">Least Ping</option>
          <option value="roundRobin">Round Robin</option>
        </select>
      </div>
      <div>
        <label className={labelClass}>Selectors (one per line)</label>
        <textarea
          value={data.selector.join('\n')}
          onChange={(e) =>
            onChange({ selector: e.target.value.split('\n').filter(Boolean) })
          }
          rows={3}
          placeholder="outbound tag patterns"
          className={`${monoInputClass} resize-none`}
        />
      </div>
    </div>
  );
}

// ── Outbound Properties Tab ──

function OutboundPropertiesTab({ data, onChange }: { data: OutboundData; onChange: (d: Partial<OutboundData>) => void }) {
  const isTerminal = ['freedom', 'blackhole', 'dns'].includes(data.protocol);
  return (
    <div className="space-y-3">
      <div>
        <label className={labelClass}>Tag</label>
        <input
          type="text"
          value={data.tag}
          onChange={(e) => onChange({ tag: e.target.value })}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Protocol</label>
        <div className="text-sm text-slate-300 bg-slate-800 border border-slate-700 rounded px-2 py-1.5 uppercase">
          {data.protocol}
        </div>
      </div>
      {!isTerminal && (
        <>
          <div>
            <label className={labelClass}>Server Address</label>
            <input
              type="text"
              value={data.serverAddress || ''}
              onChange={(e) => onChange({ serverAddress: e.target.value })}
              placeholder="IP or domain"
              className={monoInputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Server Port</label>
            <input
              type="number"
              value={data.serverPort || ''}
              onChange={(e) => onChange({ serverPort: parseInt(e.target.value) || undefined })}
              className={monoInputClass}
            />
          </div>
        </>
      )}
    </div>
  );
}

// ── Validation Panel ──

function NodeValidationPanel({ nodeId }: { nodeId: string }) {
  const result = useValidationStore((s) => s.result);
  const issues = [
    ...result.errors.filter((i) => i.nodeId === nodeId),
    ...result.warnings.filter((i) => i.nodeId === nodeId),
  ];

  if (issues.length === 0) return null;

  const levelColors: Record<string, string> = {
    error: 'bg-red-900/50 border-red-700 text-red-300',
    warning: 'bg-yellow-900/50 border-yellow-700 text-yellow-300',
  };

  return (
    <div className="mt-3 space-y-1.5">
      <div className="text-xs text-slate-400 font-medium">Validation</div>
      {issues.map((issue, i) => (
        <div
          key={i}
          className={`text-[11px] px-2 py-1.5 rounded border ${levelColors[issue.level] || ''}`}
        >
          {issue.message}
        </div>
      ))}
    </div>
  );
}

// ── Tab definitions ──

type TabId = 'properties' | 'users' | 'json';

interface TabDef {
  id: TabId;
  label: string;
}

function getTabsForNode(nodeData: XrayNodeData): TabDef[] {
  if (nodeData.nodeType === 'device') {
    return [{ id: 'properties', label: 'Props' }];
  }
  if (nodeData.nodeType === 'inbound') {
    return [
      { id: 'properties', label: 'Props' },
      { id: 'users', label: 'Users' },
      { id: 'json', label: 'JSON' },
    ];
  }
  if (nodeData.nodeType === 'outbound-proxy') {
    return [
      { id: 'properties', label: 'Props' },
      { id: 'json', label: 'JSON' },
    ];
  }
  // Routing, Balancer, Terminal — just properties + JSON
  return [
    { id: 'properties', label: 'Props' },
    { id: 'json', label: 'JSON' },
  ];
}

// ── Node type labels ──

const nodeTypeLabels: Record<string, { label: string; color: string }> = {
  device: { label: 'Device', color: 'text-cyan-400' },
  inbound: { label: 'INPUT', color: 'text-node-inbound' },
  routing: { label: 'Routing', color: 'text-node-routing' },
  balancer: { label: 'Balancer', color: 'text-node-balancer' },
  'outbound-terminal': { label: 'OUTPUT (Terminal)', color: 'text-node-terminal' },
  'outbound-proxy': { label: 'OUTPUT (Proxy)', color: 'text-node-proxy' },
};

// ── Edge Inspector ──

function EdgeInspector({ edgeId }: { edgeId: string }) {
  const edges = useStore((s) => s.edges);
  const nodes = useStore((s) => s.nodes);
  const updateEdgeData = useStore((s) => s.updateEdgeData);
  const deleteEdge = useStore((s) => s.deleteEdge);

  const edge = edges.find((e) => e.id === edgeId);
  if (!edge) return null;

  const edgeData = (edge.data || {}) as EdgeData;
  const edgeType = edge.type || 'default';

  const sourceNode = nodes.find((n) => n.id === edge.source);
  const targetNode = nodes.find((n) => n.id === edge.target);
  const getServerId = (n: typeof sourceNode) => {
    if (!n) return undefined;
    const data = n.data as Record<string, unknown>;
    return typeof data.serverId === 'string' ? data.serverId : undefined;
  };
  const sourceServerId = getServerId(sourceNode);
  const targetServerId = getServerId(targetNode);
  const isInternalEdge = sourceServerId === targetServerId;
  const transport = edgeData.transport || { ...defaultTransport };

  useEffect(() => {
    if (!edgeData.transport) {
      updateEdgeData(edgeId, { ...edgeData, transport: { ...defaultTransport } });
    }
    if (edgeData.transport?.network === 'tcp') {
      updateEdgeData(edgeId, {
        ...edgeData,
        transport: { ...edgeData.transport, network: 'raw' },
      });
    }
  }, [edgeId, edgeData, updateEdgeData]);

  useEffect(() => {
    if (!isInternalEdge) return;
    if (edgeData.transport?.network !== 'raw' || edgeData.transport?.security !== 'none') {
      updateEdgeData(edgeId, { ...edgeData, transport: { network: 'raw', security: 'none' } });
    }
  }, [edgeId, edgeData, isInternalEdge, updateEdgeData]);
  const getNodeLabel = (n: typeof sourceNode) => {
    if (!n) return '';
    const d = n.data as XrayNodeData;
    return d.nodeType === 'device' ? d.name : ('tag' in d ? d.tag : n.id);
  };
  const sourceTag = sourceNode ? getNodeLabel(sourceNode) : edge.source;
  const targetTag = targetNode ? getNodeLabel(targetNode) : edge.target;

  return (
    <div className="w-72 bg-slate-900 border-l border-slate-700 flex flex-col shrink-0 overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-slate-700 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-300">Inspector</h2>
          <span className="text-xs text-slate-500">Connection</span>
        </div>
        <button
          onClick={() => deleteEdge(edgeId)}
          className="text-xs text-slate-500 hover:text-red-400 px-2 py-1 rounded hover:bg-slate-800 transition-colors"
        >
          Delete
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Connection info */}
        <div className="bg-slate-800/50 rounded p-2.5 space-y-1">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">From</div>
          <div className="text-xs text-slate-300 font-mono">{sourceTag}</div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-2">To</div>
          <div className="text-xs text-slate-300 font-mono">{targetTag}</div>
        </div>

        {/* Edge type */}
        <div>
          <label className={labelClass}>Type</label>
          <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => updateEdgeData(edgeId, edgeData, 'default')}
              className={`flex-1 px-3 py-1.5 text-xs rounded-md transition-colors ${
                edgeType === 'default'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              Default
            </button>
            <button
              onClick={() => updateEdgeData(edgeId, edgeData, 'conditional')}
              className={`flex-1 px-3 py-1.5 text-xs rounded-md transition-colors ${
                edgeType === 'conditional'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              Conditional
            </button>
          </div>
        </div>

        {/* Transport */}
        <div>
          <label className={labelClass}>Transport</label>
          <div className="text-[10px] text-slate-500 mb-2">
            {isInternalEdge
              ? 'Internal edge (same server group) — transport is fixed to RAW.'
              : 'Cross-group edge — choose transport + security for the network hop.'}
          </div>
          <TransportTab
            transport={transport}
            onChange={(t) => updateEdgeData(edgeId, { ...edgeData, transport: t })}
            disabled={isInternalEdge}
          />
        </div>

        {/* Label */}
        <div>
          <label className={labelClass}>Label</label>
          <input
            type="text"
            value={edgeData.label || ''}
            onChange={(e) => updateEdgeData(edgeId, { ...edgeData, label: e.target.value || undefined })}
            placeholder="e.g. direct, block, proxy"
            className={inputClass}
          />
        </div>

        {/* Priority */}
        <div>
          <label className={labelClass}>Priority</label>
          <input
            type="number"
            value={edgeData.priority ?? ''}
            onChange={(e) => {
              const val = e.target.value;
              updateEdgeData(edgeId, { ...edgeData, priority: val === '' ? undefined : parseInt(val) });
            }}
            min={0}
            placeholder="e.g. 1, 2, 3"
            className={inputClass}
          />
          <div className="text-[10px] text-slate-500 mt-1">
            Lower number = higher priority in routing
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Inspector ──

export default function Inspector() {
  const selectedNodeId = useStore((s) => s.selectedNodeId);
  const selectedEdgeId = useStore((s) => s.selectedEdgeId);
  const nodes = useStore((s) => s.nodes);
  const servers = useStore((s) => s.servers);
  const updateNodeData = useStore((s) => s.updateNodeData);
  const deleteNode = useStore((s) => s.deleteNode);
  const deleteSelectedNodes = useStore((s) => s.deleteSelectedNodes);
  const [activeTab, setActiveTab] = useState<TabId>('properties');

  const multiSelectedNodes = nodes.filter((n) => n.selected);
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  // Show multi-selection info when multiple nodes are selected
  if (multiSelectedNodes.length > 1) {
    return (
      <div className="w-72 bg-slate-900 border-l border-slate-700 flex flex-col shrink-0">
        <div className="p-3 border-b border-slate-700">
          <h2 className="text-sm font-semibold text-slate-300">Inspector</h2>
          <span className="text-xs text-blue-400">{multiSelectedNodes.length} nodes selected</span>
        </div>
        <div className="p-4 space-y-3">
          <div className="space-y-1">
            {multiSelectedNodes.map((n) => {
              const nd = n.data as XrayNodeData;
              return (
                <div key={n.id} className="text-xs text-slate-400 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${
                    nd.nodeType === 'device' ? 'bg-cyan-500' :
                    nd.nodeType === 'inbound' ? 'bg-green-500' :
                    nd.nodeType === 'routing' ? 'bg-blue-500' :
                    nd.nodeType === 'balancer' ? 'bg-purple-500' :
                    nd.nodeType === 'outbound-terminal' ? 'bg-red-500' :
                    'bg-orange-500'
                  }`} />
                  <span className="truncate">{nd.nodeType === 'device' ? nd.name : ('tag' in nd ? nd.tag : '(no tag)') || '(no tag)'}</span>
                </div>
              );
            })}
          </div>
          <button
            onClick={deleteSelectedNodes}
            className="w-full text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded px-3 py-2 transition-colors"
          >
            Delete {multiSelectedNodes.length} nodes
          </button>
        </div>
      </div>
    );
  }

  // Show edge inspector if an edge is selected
  if (selectedEdgeId && !selectedNode) {
    return <EdgeInspector edgeId={selectedEdgeId} />;
  }

  if (!selectedNode) {
    return (
      <div className="w-72 bg-slate-900 border-l border-slate-700 flex flex-col shrink-0">
        <div className="p-3 border-b border-slate-700">
          <h2 className="text-sm font-semibold text-slate-300">Inspector</h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-xs text-slate-500 text-center">
            Select a node or edge to edit its properties
          </p>
        </div>
      </div>
    );
  }

  const nodeData = selectedNode.data as XrayNodeData;
  const typeInfo = nodeTypeLabels[nodeData.nodeType] || { label: 'Unknown', color: 'text-slate-400' };
  const tabs = getTabsForNode(nodeData);

  // Reset to properties if current tab isn't available for this node type
  const currentTab = tabs.find((t) => t.id === activeTab) ? activeTab : 'properties';

  function handleChange(updates: Partial<XrayNodeData>) {
    updateNodeData(selectedNode!.id, updates);
  }

  function renderTabContent() {
    switch (currentTab) {
      case 'properties':
        if (nodeData.nodeType === 'device') {
          return <DevicePropertiesTab data={nodeData} onChange={handleChange} />;
        }
        if (nodeData.nodeType === 'inbound') {
          return <InboundPropertiesTab data={nodeData} onChange={handleChange} />;
        }
        if (nodeData.nodeType === 'routing') {
          return <RoutingInspector data={nodeData} onChange={handleChange} />;
        }
        if (nodeData.nodeType === 'balancer') {
          return <BalancerInspector data={nodeData} onChange={handleChange} />;
        }
        if (nodeData.nodeType === 'outbound-terminal' || nodeData.nodeType === 'outbound-proxy') {
          return <OutboundPropertiesTab data={nodeData} onChange={handleChange} />;
        }
        return null;

      case 'users':
        if (nodeData.nodeType === 'inbound') {
          return <UsersTab data={nodeData} onChange={handleChange} />;
        }
        return null;

      case 'json':
        return <JsonPreviewTab nodeData={nodeData} />;

      default:
        return null;
    }
  }

  return (
    <div className="w-72 bg-slate-900 border-l border-slate-700 flex flex-col shrink-0 overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-slate-700 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-300">Inspector</h2>
          <span className={`text-xs ${typeInfo.color}`}>{typeInfo.label}</span>
        </div>
        <button
          onClick={() => deleteNode(selectedNode!.id)}
          className="text-xs text-slate-500 hover:text-red-400 px-2 py-1 rounded hover:bg-slate-800 transition-colors"
        >
          Delete
        </button>
      </div>

      {/* Server assignment */}
      {servers.length > 0 && (
        <div className="px-3 py-2 border-b border-slate-700 bg-slate-800/30">
          <label className="block text-[10px] text-slate-500 mb-1">Server</label>
          <select
            value={(nodeData as Record<string, unknown>).serverId as string || ''}
            onChange={(e) => handleChange({ serverId: e.target.value || undefined } as Partial<XrayNodeData>)}
            className="w-full text-xs bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-300 outline-none focus:border-blue-500"
          >
            <option value="">Unassigned</option>
            {servers.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.host})</option>
            ))}
          </select>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-700 bg-slate-900">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-2 py-2 text-[11px] font-medium transition-colors ${
              currentTab === tab.id
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {renderTabContent()}
        {currentTab === 'properties' && (
          <NodeValidationPanel nodeId={selectedNode!.id} />
        )}
      </div>
    </div>
  );
}
