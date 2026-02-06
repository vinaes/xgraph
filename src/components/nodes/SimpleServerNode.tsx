import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { SimpleServerData } from '@/types';
import ValidationBadge from './ValidationBadge';

type SimpleServerNodeData = { nodeType: 'simple-server' } & SimpleServerData;

const protocolIcons: Record<string, string> = {
  vless: '⚡',
  vmess: '🔷',
  trojan: '🐴',
  shadowsocks: '🔮',
};

function SimpleServerNode({ id, data, selected }: NodeProps & { data: SimpleServerNodeData }) {
  const nodeData = data as SimpleServerNodeData;
  return (
    <div
      className={`relative rounded-lg shadow-lg border-2 min-w-[180px] transition-[box-shadow,border-color] duration-200 ${
        selected ? 'border-white ring-2 ring-white/30' : 'border-indigo-500/50 hover:border-indigo-400 hover:shadow-[0_0_12px_rgba(99,102,241,0.3)]'
      }`}
      style={{ background: 'linear-gradient(135deg, #312e81 0%, #1e1b4b 100%)' }}
      title={`Server — ${nodeData.name}\n${nodeData.host}:${nodeData.port}\nProtocol: ${nodeData.protocol}\nNetwork: ${nodeData.network} | Security: ${nodeData.security}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-indigo-500/30">
        <span className="text-lg">🖥️</span>
        <span className="font-semibold text-sm text-indigo-200">SERVER</span>
      </div>

      {/* Body */}
      <div className="px-3 py-2 space-y-1">
        <div className="text-xs text-indigo-300/80 truncate">
          {nodeData.name}
        </div>
        <div className="text-[10px] font-mono text-indigo-200/70 truncate">
          {nodeData.host}:{nodeData.port}
        </div>
        <div className="flex gap-1 flex-wrap">
          <span className="text-[10px] bg-indigo-800/60 text-indigo-200 px-1.5 py-0.5 rounded">
            {protocolIcons[nodeData.protocol] || '📡'} {nodeData.protocol}
          </span>
          <span className="text-[10px] bg-indigo-800/60 text-indigo-200 px-1.5 py-0.5 rounded">
            {nodeData.network}
          </span>
          {nodeData.security !== 'none' && (
            <span className="text-[10px] bg-indigo-800/60 text-indigo-200 px-1.5 py-0.5 rounded">
              🔒 {nodeData.security}
            </span>
          )}
        </div>
      </div>

      <ValidationBadge nodeId={id} />

      {/* Input handle (left) */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-indigo-500 !border-2 !border-indigo-300"
      />
      {/* Output handle (right) */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-indigo-500 !border-2 !border-indigo-300"
      />
    </div>
  );
}

export default memo(SimpleServerNode);
