import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { SimpleBlockData } from '@/types';
import ValidationBadge from './ValidationBadge';

type SimpleBlockNodeData = { nodeType: 'simple-block' } & SimpleBlockData;

function SimpleBlockNode({ id, data, selected }: NodeProps & { data: SimpleBlockNodeData }) {
  const nodeData = data as SimpleBlockNodeData;
  return (
    <div
      className={`relative rounded-lg shadow-lg border-2 min-w-[150px] transition-[box-shadow,border-color] duration-200 ${
        selected ? 'border-white ring-2 ring-white/30' : 'border-red-500/50 hover:border-red-400 hover:shadow-[0_0_12px_rgba(239,68,68,0.3)]'
      }`}
      style={{ background: 'linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%)' }}
      title={`Block — ${nodeData.label}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-red-500/30">
        <span className="text-lg">🚫</span>
        <span className="font-semibold text-sm text-red-200">BLOCK</span>
      </div>

      {/* Body */}
      <div className="px-3 py-2">
        <div className="text-xs text-red-300/80 truncate">
          {nodeData.label}
        </div>
      </div>

      <ValidationBadge nodeId={id} />

      {/* Input handle only — terminal node has no output */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-red-500 !border-2 !border-red-300"
      />
    </div>
  );
}

export default memo(SimpleBlockNode);
