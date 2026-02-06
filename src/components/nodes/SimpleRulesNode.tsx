import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { SimpleRulesData } from '@/types';
import ValidationBadge from './ValidationBadge';

type SimpleRulesNodeData = { nodeType: 'simple-rules' } & SimpleRulesData;

function SimpleRulesNode({ id, data, selected }: NodeProps & { data: SimpleRulesNodeData }) {
  const nodeData = data as SimpleRulesNodeData;
  const ruleCount = nodeData.rules?.length ?? 0;
  return (
    <div
      className={`relative rounded-lg shadow-lg border-2 min-w-[160px] transition-[box-shadow,border-color] duration-200 ${
        selected ? 'border-white ring-2 ring-white/30' : 'border-blue-500/50 hover:border-blue-400 hover:shadow-[0_0_12px_rgba(59,130,246,0.3)]'
      }`}
      style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #172554 100%)' }}
      title={`Rules — ${nodeData.label}\n${ruleCount} rule${ruleCount !== 1 ? 's' : ''}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-blue-500/30">
        <span className="text-lg">📋</span>
        <span className="font-semibold text-sm text-blue-200">RULES</span>
      </div>

      {/* Body */}
      <div className="px-3 py-2 space-y-1">
        <div className="text-xs text-blue-300/80 truncate">
          {nodeData.label}
        </div>
        <div className="flex gap-1">
          <span className="text-[10px] bg-blue-800/60 text-blue-200 px-1.5 py-0.5 rounded">
            {ruleCount} rule{ruleCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <ValidationBadge nodeId={id} />

      {/* Input handle (left) */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-blue-300"
      />
      {/* Output handle (right) */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-blue-300"
      />
    </div>
  );
}

export default memo(SimpleRulesNode);
