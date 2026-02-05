import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { OutboundData } from '@/types';
import ValidationBadge from './ValidationBadge';

type TerminalNodeData = { nodeType: 'outbound-terminal' } & OutboundData;

const terminalIcons: Record<string, string> = {
  freedom: '🌍',
  blackhole: '🚫',
  dns: '📡',
};

const terminalLabels: Record<string, string> = {
  freedom: 'Freedom',
  blackhole: 'Blackhole',
  dns: 'DNS',
};

function OutboundTerminalNode({ id, data, selected }: NodeProps & { data: TerminalNodeData }) {
  const nodeData = data as TerminalNodeData;
  return (
    <div
      className={`relative rounded-lg shadow-lg border-2 min-w-[150px] transition-[box-shadow,border-color] duration-200 ${
        selected ? 'border-white ring-2 ring-white/30' : 'border-node-terminal/50 hover:border-node-terminal hover:shadow-[0_0_12px_rgba(239,68,68,0.3)]'
      }`}
      style={{ background: 'linear-gradient(135deg, #991b1b 0%, #7f1d1d 100%)' }}
      title={`${terminalLabels[nodeData.protocol] || nodeData.protocol} — ${nodeData.tag || 'unnamed'}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-node-terminal/30">
        <span className="text-lg">{terminalIcons[nodeData.protocol] || '⬛'}</span>
        <span className="font-semibold text-sm text-red-200">
          {terminalLabels[nodeData.protocol] || nodeData.protocol}
        </span>
      </div>

      {/* Body */}
      <div className="px-3 py-2">
        <div className="text-xs text-red-300/80 truncate">
          {nodeData.tag || 'unnamed'}
        </div>
      </div>

      <ValidationBadge nodeId={id} />

      {/* Input handle only — terminal nodes have no output */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-node-terminal !border-2 !border-red-300"
      />
    </div>
  );
}

export default memo(OutboundTerminalNode);
