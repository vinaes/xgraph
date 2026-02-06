import { type DragEvent, useState, useMemo } from 'react';
import { useStore } from '@/store';
import type { Server } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface PaletteItem {
  nodeType: string;
  label: string;
  icon: string;
  protocol?: string;
}

const deviceItems: PaletteItem[] = [
  { nodeType: 'device', label: 'Device', icon: '💻' },
];

const inboundItems: PaletteItem[] = [
  { nodeType: 'inbound', label: 'VLESS', icon: '⚡', protocol: 'vless' },
  { nodeType: 'inbound', label: 'VMess', icon: '🔷', protocol: 'vmess' },
  { nodeType: 'inbound', label: 'Trojan', icon: '🐴', protocol: 'trojan' },
  { nodeType: 'inbound', label: 'Shadowsocks', icon: '🔮', protocol: 'shadowsocks' },
  { nodeType: 'inbound', label: 'HTTP', icon: '🌐', protocol: 'http' },
  { nodeType: 'inbound', label: 'SOCKS', icon: '🧦', protocol: 'socks' },
  { nodeType: 'inbound', label: 'Dokodemo', icon: '🚪', protocol: 'dokodemo-door' },
];

const routingItems: PaletteItem[] = [
  { nodeType: 'routing', label: 'Routing Rule', icon: '🔀' },
  { nodeType: 'balancer', label: 'Balancer', icon: '⚖️' },
];

const outboundTerminalItems: PaletteItem[] = [
  { nodeType: 'outbound-terminal', label: 'Freedom', icon: '🌍', protocol: 'freedom' },
  { nodeType: 'outbound-terminal', label: 'Blackhole', icon: '🚫', protocol: 'blackhole' },
  { nodeType: 'outbound-terminal', label: 'DNS', icon: '📡', protocol: 'dns' },
];

const outboundProxyItems: PaletteItem[] = [
  { nodeType: 'outbound-proxy', label: 'VLESS', icon: '⚡', protocol: 'vless' },
  { nodeType: 'outbound-proxy', label: 'VMess', icon: '🔷', protocol: 'vmess' },
  { nodeType: 'outbound-proxy', label: 'Trojan', icon: '🐴', protocol: 'trojan' },
  { nodeType: 'outbound-proxy', label: 'Shadowsocks', icon: '🔮', protocol: 'shadowsocks' },
  { nodeType: 'outbound-proxy', label: 'HTTP', icon: '🌐', protocol: 'http' },
  { nodeType: 'outbound-proxy', label: 'SOCKS', icon: '🧦', protocol: 'socks' },
];

const simpleServerItems: PaletteItem[] = [
  { nodeType: 'simple-server', label: 'Server', icon: '🖥️' },
];

const simpleRulesItems: PaletteItem[] = [
  { nodeType: 'simple-rules', label: 'Rules', icon: '📋' },
];

const simpleTerminalItems: PaletteItem[] = [
  { nodeType: 'simple-internet', label: 'Internet', icon: '🌍' },
  { nodeType: 'simple-block', label: 'Block', icon: '🚫' },
];

function onDragStart(event: DragEvent, item: PaletteItem) {
  event.dataTransfer.setData('application/xray-node', JSON.stringify(item));
  event.dataTransfer.effectAllowed = 'move';
}

function PaletteSection({
  title,
  color,
  items,
}: {
  title: string;
  color: string;
  items: PaletteItem[];
}) {
  return (
    <div className="mb-4">
      <h3 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${color}`}>
        {title}
      </h3>
      <div className="space-y-1">
        {items.map((item, idx) => (
          <div
            key={`${item.nodeType}-${item.protocol || idx}`}
            draggable
            onDragStart={(e) => onDragStart(e, item)}
            className="flex items-center gap-2 px-2 py-1.5 rounded cursor-grab hover:bg-slate-700/50 transition-colors text-sm text-slate-300 active:cursor-grabbing"
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface PaletteProps {
  onOpenTemplates?: () => void;
}

export default function Palette({ onOpenTemplates }: PaletteProps) {
  const mode = useStore((s) => s.mode);
  const servers = useStore((s) => s.servers);
  const addServer = useStore((s) => s.addServer);
  const deleteServer = useStore((s) => s.deleteServer);
  const [showAddServer, setShowAddServer] = useState(false);
  const [serverName, setServerName] = useState('');
  const [serverHost, setServerHost] = useState('');
  const [search, setSearch] = useState('');

  const filterItems = useMemo((): {
    device: PaletteItem[];
    server?: PaletteItem[];
    rules?: PaletteItem[];
    inbound?: PaletteItem[];
    routing?: PaletteItem[];
    terminal: PaletteItem[];
    proxy?: PaletteItem[];
  } | null => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    const filter = (items: PaletteItem[]) =>
      items.filter((item) =>
        item.label.toLowerCase().includes(q) ||
        item.nodeType.toLowerCase().includes(q) ||
        (item.protocol && item.protocol.toLowerCase().includes(q))
      );
    if (mode === 'simple') {
      return {
        device: filter(deviceItems),
        server: filter(simpleServerItems),
        rules: filter(simpleRulesItems),
        terminal: filter(simpleTerminalItems),
      };
    }
    return {
      device: filter(deviceItems),
      inbound: filter(inboundItems),
      routing: filter(routingItems),
      terminal: filter(outboundTerminalItems),
      proxy: filter(outboundProxyItems),
    };
  }, [search, mode]);

  function handleAddServer() {
    if (!serverName.trim() || !serverHost.trim()) return;
    const server: Server = {
      id: uuidv4(),
      name: serverName.trim(),
      host: serverHost.trim(),
      sshPort: 22,
    };
    addServer(server);
    setServerName('');
    setServerHost('');
    setShowAddServer(false);
  }

  return (
    <div className="w-60 bg-slate-900 border-r border-slate-700 flex flex-col shrink-0 overflow-hidden">
      <div className="p-3 border-b border-slate-700">
        <h2 className="text-sm font-semibold text-slate-300">Palette</h2>
      </div>

      <div className="px-3 pt-2 pb-1">
        <div className="relative">
          <input
            type="text"
            placeholder="Filter nodes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 pl-7 text-slate-200 outline-none focus:border-blue-500 placeholder-slate-500 transition-colors"
          />
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-[10px]">
            /
          </span>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
            >
              x
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {/* Templates section */}
        {!search && (
          <div className="mb-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-2 text-slate-400">
              Templates
            </h3>
            <button
              onClick={onOpenTemplates}
              className="w-full flex items-center gap-2 px-2 py-2 rounded bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 hover:border-slate-600 transition-colors text-sm text-slate-300"
            >
              <span className="text-blue-400 text-xs">+</span>
              <span>Browse Templates</span>
              <span className="ml-auto text-xs text-slate-500">13</span>
            </button>
          </div>
        )}

        {/* Servers section */}
        {!search && mode === 'advanced' && (
          <div className="mb-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-2 text-slate-400">
              Servers
            </h3>
            {servers.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-700/50 text-sm text-slate-300 group"
              >
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="truncate flex-1">{s.name}</span>
                <button
                  onClick={() => deleteServer(s.id)}
                  className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                >
                  x
                </button>
              </div>
            ))}
            {showAddServer ? (
              <div className="space-y-1 mt-1">
                <input
                  type="text"
                  placeholder="Name"
                  value={serverName}
                  onChange={(e) => setServerName(e.target.value)}
                  className="w-full text-xs bg-slate-800 border border-slate-600 rounded px-2 py-1 text-slate-200 outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="Host (IP or domain)"
                  value={serverHost}
                  onChange={(e) => setServerHost(e.target.value)}
                  className="w-full text-xs bg-slate-800 border border-slate-600 rounded px-2 py-1 text-slate-200 outline-none focus:border-blue-500"
                />
                <div className="flex gap-1">
                  <button
                    onClick={handleAddServer}
                    className="flex-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded px-2 py-1"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setShowAddServer(false)}
                    className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddServer(true)}
                className="w-full text-xs text-slate-500 hover:text-blue-400 px-2 py-1 text-left"
              >
                + Add Server
              </button>
            )}
          </div>
        )}

        {/* Node types */}
        {mode === 'simple' ? (
          <>
            {(filterItems ? filterItems.device : deviceItems).length > 0 && (
              <PaletteSection title="Device" color="text-cyan-400" items={filterItems ? filterItems.device : deviceItems} />
            )}
            {(filterItems?.server ?? simpleServerItems).length > 0 && (
              <PaletteSection title="Server" color="text-indigo-400" items={filterItems?.server ?? simpleServerItems} />
            )}
            {(filterItems?.rules ?? simpleRulesItems).length > 0 && (
              <PaletteSection title="Routing" color="text-blue-400" items={filterItems?.rules ?? simpleRulesItems} />
            )}
            {(filterItems ? filterItems.terminal : simpleTerminalItems).length > 0 && (
              <PaletteSection title="Terminal" color="text-emerald-400" items={filterItems ? filterItems.terminal : simpleTerminalItems} />
            )}
            {filterItems && filterItems.device.length === 0 && (filterItems.server?.length ?? 0) === 0 && (filterItems.rules?.length ?? 0) === 0 && filterItems.terminal.length === 0 && (
              <div className="text-xs text-slate-500 text-center py-4">
                No nodes match &quot;{search}&quot;
              </div>
            )}
          </>
        ) : (
          <>
            {(filterItems ? filterItems.device : deviceItems).length > 0 && (
              <PaletteSection title="Device" color="text-cyan-400" items={filterItems ? filterItems.device : deviceItems} />
            )}
            {(filterItems?.inbound ?? inboundItems).length > 0 && (
              <PaletteSection title="INPUT" color="text-node-inbound" items={filterItems?.inbound ?? inboundItems} />
            )}
            {(filterItems?.routing ?? routingItems).length > 0 && (
              <PaletteSection title="Routing" color="text-node-routing" items={filterItems?.routing ?? routingItems} />
            )}
            {(filterItems ? filterItems.terminal : outboundTerminalItems).length > 0 && (
              <PaletteSection title="OUTPUT (Terminal)" color="text-node-terminal" items={filterItems ? filterItems.terminal : outboundTerminalItems} />
            )}
            {(filterItems?.proxy ?? outboundProxyItems).length > 0 && (
              <PaletteSection title="OUTPUT (Proxy)" color="text-node-proxy" items={filterItems?.proxy ?? outboundProxyItems} />
            )}
            {filterItems && filterItems.device.length === 0 && (filterItems.inbound?.length ?? 0) === 0 && (filterItems.routing?.length ?? 0) === 0 && filterItems.terminal.length === 0 && (filterItems.proxy?.length ?? 0) === 0 && (
              <div className="text-xs text-slate-500 text-center py-4">
                No nodes match &quot;{search}&quot;
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
