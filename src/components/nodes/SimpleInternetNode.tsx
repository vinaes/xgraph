import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { SimpleInternetData } from '@/types';
import ValidationBadge from './ValidationBadge';

type SimpleInternetNodeData = { nodeType: 'simple-internet' } & SimpleInternetData;

function SimpleInternetNode({ id, data, selected }: NodeProps & { data: SimpleInternetNodeData }) {
  const nodeData = data as SimpleInternetNodeData;
  return (
    <div
      className={`relative rounded-lg shadow-lg border-2 min-w-[150px] transition-[box-shadow,border-color] duration-200 ${
        selected ? 'border-white ring-2 ring-white/30' : 'border-emerald-500/50 hover:border-emerald-400 hover:shadow-[0_0_12px_rgba(16,185,129,0.3)]'
      }`}
      style={{ background: 'linear-gradient(135deg, #14532d 0%, #052e16 100%)' }}
      title={`Internet — ${nodeData.label}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-emerald-500/30">
        <span className="text-lg">🌍</span>
        <span className="font-semibold text-sm text-emerald-200">INTERNET</span>
      </div>

      {/* Body */}
      <div className="px-3 py-2">
        <div className="text-xs text-emerald-300/80 truncate">
          {nodeData.label}
        </div>
      </div>

      <ValidationBadge nodeId={id} />

      {/* Input handle only — terminal node has no output */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-emerald-300"
      />
    </div>
  );
}

export default memo(SimpleInternetNode);
