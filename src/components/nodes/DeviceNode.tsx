import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { DeviceData } from '@/types';
import ValidationBadge from './ValidationBadge';

const connectionIcons: Record<string, string> = {
  tun2socks: '🔌',
  socks: '🧦',
  http: '🌐',
};

type DeviceNodeData = { nodeType: 'device' } & DeviceData;

function DeviceNode({ id, data, selected }: NodeProps & { data: DeviceNodeData }) {
  const nodeData = data as DeviceNodeData;
  return (
    <div
      className={`relative rounded-lg shadow-lg border-2 min-w-[160px] transition-[box-shadow,border-color] duration-200 ${
        selected ? 'border-white ring-2 ring-white/30' : 'border-cyan-500/50 hover:border-cyan-400 hover:shadow-[0_0_12px_rgba(6,182,212,0.3)]'
      }`}
      style={{ background: 'linear-gradient(135deg, #164e63 0%, #0e3a4a 100%)' }}
      title={`Device — ${nodeData.name}\nConnection: ${nodeData.connectionType}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-cyan-500/30">
        <span className="text-lg">💻</span>
        <span className="font-semibold text-sm text-cyan-200">
          DEVICE
        </span>
      </div>

      {/* Body */}
      <div className="px-3 py-2 space-y-1">
        <div className="text-xs text-cyan-300/80 truncate">
          {nodeData.name}
        </div>
        <div className="flex gap-1">
          <span className="text-[10px] bg-cyan-800/60 text-cyan-200 px-1.5 py-0.5 rounded">
            {connectionIcons[nodeData.connectionType] || '🔌'} {nodeData.connectionType}
          </span>
        </div>
      </div>

      <ValidationBadge nodeId={id} />

      {/* Output handle only (right) — device connects TO inbound */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-cyan-500 !border-2 !border-cyan-300"
      />
    </div>
  );
}

export default memo(DeviceNode);
