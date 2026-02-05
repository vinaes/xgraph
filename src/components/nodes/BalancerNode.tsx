import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { BalancerData } from '@/types';
import ValidationBadge from './ValidationBadge';

type BalancerNodeData = { nodeType: 'balancer' } & BalancerData;

const strategyLabels: Record<string, string> = {
  random: 'Random',
  leastPing: 'Least Ping',
  roundRobin: 'Round Robin',
};

function BalancerNode({ id, data, selected }: NodeProps & { data: BalancerNodeData }) {
  const nodeData = data as BalancerNodeData;
  return (
    <div
      className={`relative rounded-lg shadow-lg border-2 min-w-[170px] transition-[box-shadow,border-color] duration-200 ${
        selected ? 'border-white ring-2 ring-white/30' : 'border-node-balancer/50 hover:border-node-balancer hover:shadow-[0_0_12px_rgba(168,85,247,0.3)]'
      }`}
      style={{ background: 'linear-gradient(135deg, #581c87 0%, #3b0764 100%)' }}
      title={`Balancer — ${nodeData.tag || 'unnamed'}\nStrategy: ${strategyLabels[nodeData.strategy] || nodeData.strategy}${nodeData.selector.length ? `\nTargets: ${nodeData.selector.length}` : ''}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-node-balancer/30">
        <span className="text-lg">⚖️</span>
        <span className="font-semibold text-sm text-purple-200">Balancer</span>
        <span className="ml-auto text-xs bg-node-balancer/30 text-purple-100 px-2 py-0.5 rounded-full">
          {strategyLabels[nodeData.strategy] || nodeData.strategy}
        </span>
      </div>

      {/* Body */}
      <div className="px-3 py-2 space-y-1">
        <div className="text-xs text-purple-300/80 truncate">
          {nodeData.tag || 'unnamed'}
        </div>
        {nodeData.selector.length > 0 && (
          <div className="text-[10px] text-purple-300/60">
            {nodeData.selector.length} target{nodeData.selector.length > 1 ? 's' : ''}
          </div>
        )}
      </div>

      <ValidationBadge nodeId={id} />

      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-node-balancer !border-2 !border-purple-300"
      />
      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-node-balancer !border-2 !border-purple-300"
      />
    </div>
  );
}

export default memo(BalancerNode);
