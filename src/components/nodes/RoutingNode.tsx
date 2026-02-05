import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { RoutingData } from '@/types';
import ValidationBadge from './ValidationBadge';

type RoutingNodeData = { nodeType: 'routing' } & RoutingData;

function getRuleSummary(data: RoutingNodeData): string {
  if (data.domain && data.domain.length > 0) return data.domain[0]!;
  if (data.ip && data.ip.length > 0) return data.ip[0]!;
  if (data.inboundTag) return `tag:${data.inboundTag}`;
  if (data.port) return `port:${data.port}`;
  if (data.network) return data.network;
  return 'no rules';
}

function RoutingNode({ id, data, selected }: NodeProps & { data: RoutingNodeData }) {
  const nodeData = data as RoutingNodeData;
  const summary = getRuleSummary(nodeData);
  const ruleCount =
    (nodeData.domain?.length || 0) +
    (nodeData.ip?.length || 0) +
    (nodeData.port ? 1 : 0) +
    (nodeData.inboundTag ? 1 : 0);

  return (
    <div
      className={`relative rounded-lg shadow-lg border-2 min-w-[170px] transition-[box-shadow,border-color] duration-200 ${
        selected ? 'border-white ring-2 ring-white/30' : 'border-node-routing/50 hover:border-node-routing hover:shadow-[0_0_12px_rgba(59,130,246,0.3)]'
      }`}
      style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #172554 100%)' }}
      title={`Routing Rule — ${nodeData.tag || 'unnamed'}\n${ruleCount} rule${ruleCount !== 1 ? 's' : ''}: ${summary}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-node-routing/30">
        <span className="text-lg">🔀</span>
        <span className="font-semibold text-sm text-blue-200">Routing</span>
        {ruleCount > 0 && (
          <span className="ml-auto text-xs bg-node-routing/30 text-blue-100 px-2 py-0.5 rounded-full">
            {ruleCount} rule{ruleCount > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="px-3 py-2 space-y-1">
        <div className="text-xs text-blue-300/80 truncate">
          {nodeData.tag || 'unnamed'}
        </div>
        <div className="text-[10px] bg-blue-800/60 text-blue-200 px-1.5 py-0.5 rounded truncate">
          {summary}
        </div>
      </div>

      <ValidationBadge nodeId={id} />

      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-node-routing !border-2 !border-blue-300"
      />
      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-node-routing !border-2 !border-blue-300"
      />
    </div>
  );
}

export default memo(RoutingNode);
