import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { OutboundData } from '@/types';
import ValidationBadge from './ValidationBadge';

type ProxyNodeData = { nodeType: 'outbound-proxy' } & OutboundData;

const protocolIcons: Record<string, string> = {
  http: '🌐',
  socks: '🧦',
  vless: '⚡',
  vmess: '🔷',
  trojan: '🐴',
  shadowsocks: '🔮',
};

const transportBadge: Record<string, string> = {
  ws: '〰️',
  grpc: '📦',
  xhttp: '⚡',
};

const securityBadge: Record<string, string> = {
  tls: '🔒',
  reality: '🎭',
};

function OutboundProxyNode({ id, data, selected }: NodeProps & { data: ProxyNodeData }) {
  const nodeData = data as ProxyNodeData;
  const serverAddr = nodeData.serverAddress
    ? `${nodeData.serverAddress}:${nodeData.serverPort || '?'}`
    : 'no server';

  return (
    <div
      className={`relative rounded-lg shadow-lg border-2 min-w-[180px] transition-[box-shadow,border-color] duration-200 ${
        selected ? 'border-white ring-2 ring-white/30' : 'border-node-proxy/50 hover:border-node-proxy hover:shadow-[0_0_12px_rgba(249,115,22,0.3)]'
      }`}
      style={{ background: 'linear-gradient(135deg, #9a3412 0%, #7c2d12 100%)' }}
      title={`${nodeData.protocol.toUpperCase()} Proxy — ${nodeData.tag || 'unnamed'}\nServer: ${serverAddr}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-node-proxy/30">
        <span className="text-lg">{protocolIcons[nodeData.protocol] || '🔒'}</span>
        <span className="font-semibold text-sm text-orange-200 uppercase">
          {nodeData.protocol}
        </span>
      </div>

      {/* Body */}
      <div className="px-3 py-2 space-y-1">
        <div className="text-xs text-orange-300/80 truncate">
          {nodeData.tag || 'unnamed'}
        </div>
        <div className="text-[10px] bg-orange-800/60 text-orange-200 px-1.5 py-0.5 rounded truncate font-mono">
          {serverAddr}
        </div>

        {/* Badges */}
        <div className="flex gap-1 flex-wrap">
          {nodeData.transport?.network && nodeData.transport.network !== 'tcp' && (
            <span className="text-[10px] bg-orange-800/60 text-orange-200 px-1.5 py-0.5 rounded">
              {transportBadge[nodeData.transport.network] || ''} {nodeData.transport.network}
            </span>
          )}
          {nodeData.transport?.security && nodeData.transport.security !== 'none' && (
            <span className="text-[10px] bg-orange-800/60 text-orange-200 px-1.5 py-0.5 rounded">
              {securityBadge[nodeData.transport.security] || ''} {nodeData.transport.security}
            </span>
          )}
        </div>
      </div>

      <ValidationBadge nodeId={id} />

      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-node-proxy !border-2 !border-orange-300"
      />
      {/* Output handle — proxy nodes can connect to inbound on another server */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-node-proxy !border-2 !border-orange-300"
      />
    </div>
  );
}

export default memo(OutboundProxyNode);
