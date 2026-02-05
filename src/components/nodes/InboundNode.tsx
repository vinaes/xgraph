import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { InboundData } from '@/types';
import ValidationBadge from './ValidationBadge';

const protocolIcons: Record<string, string> = {
  http: '🌐',
  socks: '🧦',
  vless: '⚡',
  vmess: '🔷',
  trojan: '🐴',
  shadowsocks: '🔮',
  'dokodemo-door': '🚪',
};

type InboundNodeData = { nodeType: 'inbound' } & InboundData;

function InboundNode({ id, data, selected }: NodeProps & { data: InboundNodeData }) {
  const nodeData = data as InboundNodeData;
  return (
    <div
      className={`relative rounded-lg shadow-lg border-2 min-w-[180px] transition-[box-shadow,border-color] duration-200 ${
        selected ? 'border-white ring-2 ring-white/30' : 'border-node-inbound/50 hover:border-node-inbound hover:shadow-[0_0_12px_rgba(34,197,94,0.3)]'
      }`}
      style={{ background: 'linear-gradient(135deg, #166534 0%, #14532d 100%)' }}
      title={`${nodeData.protocol.toUpperCase()} INPUT — ${nodeData.tag || 'unnamed'}\nPort: ${nodeData.port}${nodeData.users?.length ? `\nUsers: ${nodeData.users.length}` : ''}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-node-inbound/30">
        <span className="text-lg">{protocolIcons[nodeData.protocol] || '📡'}</span>
        <span className="font-semibold text-sm text-green-200 uppercase">{nodeData.protocol}</span>
        <span className="text-[10px] text-green-300/80 tracking-widest">INPUT</span>
        <span className="ml-auto text-xs bg-node-inbound/30 text-green-100 px-2 py-0.5 rounded-full font-mono">
          :{nodeData.port}
        </span>
      </div>

      {/* Body */}
      <div className="px-3 py-2 space-y-1">
        <div className="text-xs text-green-300/80 truncate">
          {nodeData.tag || 'unnamed'}
        </div>

        {/* Badges */}
        {nodeData.users && nodeData.users.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            <span className="text-[10px] bg-green-800/60 text-green-200 px-1.5 py-0.5 rounded">
              👤 {nodeData.users.length}
            </span>
          </div>
        )}
      </div>

      <ValidationBadge nodeId={id} />

      {/* Input handle (left) - for OUTPUT→INPUT connections */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-node-inbound !border-2 !border-green-300"
      />
      {/* Output handle (right) */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-node-inbound !border-2 !border-green-300"
      />
    </div>
  );
}

export default memo(InboundNode);
