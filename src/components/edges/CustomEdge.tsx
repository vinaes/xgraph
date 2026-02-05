import { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';
import type { EdgeData, TransportSettings } from '@/types';
import { useSimulationStore } from '@/store/useSimulationStore';
import { useStore } from '@/store';

function useEdgeHighlight(edgeSource: string, edgeTarget: string, edgeId: string) {
  const simResult = useSimulationStore((s) => s.result);
  const hoveredNodeId = useStore((s) => s.hoveredNodeId);

  // Simulation takes priority
  if (simResult) {
    const highlighted = simResult.highlightEdgeIds.includes(edgeId);
    return { highlighted, dimmed: !highlighted, hoverConnected: false };
  }

  // Hover highlighting
  if (hoveredNodeId) {
    const isConnected = edgeSource === hoveredNodeId || edgeTarget === hoveredNodeId;
    return { highlighted: false, dimmed: !isConnected, hoverConnected: isConnected };
  }

  return { highlighted: false, dimmed: false, hoverConnected: false };
}

function formatTransportLabel(transport?: TransportSettings): string | null {
  if (!transport) return null;
  const network = transport.network;
  const security = transport.security;
  if (network === 'raw' && security === 'none') return null;
  const netLabel = network === 'raw' ? 'raw' : network;
  return security && security !== 'none' ? `${netLabel}+${security}` : netLabel;
}

export const DefaultEdge = memo(function DefaultEdge(props: EdgeProps) {
  const {
    id,
    source,
    target,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    selected,
    data,
  } = props;

  const edgeData = data as EdgeData | undefined;
  const transportLabel = formatTransportLabel(edgeData?.transport);
  const displayLabel = edgeData?.label
    ? (transportLabel ? `${edgeData.label} · ${transportLabel}` : edgeData.label)
    : transportLabel;
  const { highlighted, dimmed, hoverConnected } = useEdgeHighlight(source, target, id);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  let stroke = selected ? '#3b82f6' : '#475569';
  let strokeWidth = selected ? 2.5 : 2;
  let opacity = 1;

  if (highlighted) {
    stroke = '#10b981';
    strokeWidth = 3;
  } else if (hoverConnected) {
    stroke = '#94a3b8';
    strokeWidth = 2.5;
  } else if (dimmed) {
    opacity = 0.2;
  }

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke,
          strokeWidth,
          opacity,
          transition: 'stroke 0.2s, stroke-width 0.2s, opacity 0.2s',
        }}
        markerEnd={highlighted ? 'url(#arrow-simulation)' : 'url(#arrow-default)'}
      />
      {displayLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              opacity: dimmed ? 0.2 : 1,
            }}
            className="text-[10px] bg-slate-800/90 border border-slate-600 text-slate-300 px-1.5 py-0.5 rounded whitespace-nowrap"
          >
            {displayLabel}
          </div>
        </EdgeLabelRenderer>
      )}
      {edgeData?.priority !== undefined && !displayLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              opacity: dimmed ? 0.2 : 1,
            }}
            className="text-[9px] bg-slate-700/80 text-slate-400 w-5 h-5 rounded-full flex items-center justify-center font-mono"
          >
            {edgeData.priority}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

export const ConditionalEdge = memo(function ConditionalEdge(props: EdgeProps) {
  const {
    id,
    source,
    target,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    selected,
    data,
  } = props;

  const edgeData = data as EdgeData | undefined;
  const transportLabel = formatTransportLabel(edgeData?.transport);
  const displayLabel = edgeData?.label
    ? (transportLabel ? `${edgeData.label} · ${transportLabel}` : edgeData.label)
    : transportLabel;
  const { highlighted, dimmed, hoverConnected } = useEdgeHighlight(source, target, id);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  let stroke = selected ? '#3b82f6' : '#6366f1';
  let strokeWidth = selected ? 2.5 : 2;
  let opacity = 1;

  if (highlighted) {
    stroke = '#10b981';
    strokeWidth = 3;
  } else if (hoverConnected) {
    stroke = '#94a3b8';
    strokeWidth = 2.5;
  } else if (dimmed) {
    opacity = 0.2;
  }

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke,
          strokeWidth,
          strokeDasharray: '6 4',
          opacity,
          transition: 'stroke 0.2s, stroke-width 0.2s, opacity 0.2s',
        }}
        markerEnd={highlighted ? 'url(#arrow-simulation)' : 'url(#arrow-conditional)'}
      />
      {displayLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              opacity: dimmed ? 0.2 : 1,
            }}
            className="text-[10px] bg-indigo-900/80 border border-indigo-600/50 text-indigo-300 px-1.5 py-0.5 rounded whitespace-nowrap"
          >
            {displayLabel}
          </div>
        </EdgeLabelRenderer>
      )}
      {edgeData?.priority !== undefined && !displayLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              opacity: dimmed ? 0.2 : 1,
            }}
            className="text-[9px] bg-indigo-800/80 text-indigo-300 w-5 h-5 rounded-full flex items-center justify-center font-mono"
          >
            {edgeData.priority}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

// SVG arrow marker definitions — render these once inside the ReactFlow component
export function EdgeMarkerDefs() {
  return (
    <svg style={{ position: 'absolute', width: 0, height: 0 }}>
      <defs>
        <marker
          id="arrow-default"
          viewBox="0 0 10 10"
          refX="10"
          refY="5"
          markerWidth="8"
          markerHeight="8"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#475569" />
        </marker>
        <marker
          id="arrow-conditional"
          viewBox="0 0 10 10"
          refX="10"
          refY="5"
          markerWidth="8"
          markerHeight="8"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#6366f1" />
        </marker>
        <marker
          id="arrow-simulation"
          viewBox="0 0 10 10"
          refX="10"
          refY="5"
          markerWidth="8"
          markerHeight="8"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
        </marker>
      </defs>
    </svg>
  );
}
