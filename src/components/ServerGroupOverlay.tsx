import { memo, useMemo } from 'react';
import { useViewport } from '@xyflow/react';
import { useStore } from '@/store';
import type { XrayNodeData } from '@/types';

const NODE_WIDTH = 180;
const NODE_HEIGHT = 90;
const PADDING = 24;
const HEADER_HEIGHT = 28;

const serverColors = [
  { border: '#3b82f6', bg: 'rgba(59, 130, 246, 0.04)', text: '#93c5fd' },
  { border: '#a855f7', bg: 'rgba(168, 85, 247, 0.04)', text: '#d8b4fe' },
  { border: '#f97316', bg: 'rgba(249, 115, 22, 0.04)', text: '#fdba74' },
  { border: '#22c55e', bg: 'rgba(34, 197, 94, 0.04)', text: '#86efac' },
  { border: '#ef4444', bg: 'rgba(239, 68, 68, 0.04)', text: '#fca5a5' },
  { border: '#eab308', bg: 'rgba(234, 179, 8, 0.04)', text: '#fde047' },
];

export default memo(function ServerGroupOverlay() {
  const nodes = useStore((s) => s.nodes);
  const servers = useStore((s) => s.servers);
  const mode = useStore((s) => s.mode);
  const { x, y, zoom } = useViewport();

  const groups = useMemo(() => {
    if (mode !== 'advanced' || servers.length === 0) return [];

    const serverMap = new Map(servers.map((s) => [s.id, s]));
    const nodesByServer = new Map<string, { minX: number; minY: number; maxX: number; maxY: number }>();

    for (const node of nodes) {
      const data = node.data as XrayNodeData;
      const sid = (data as Record<string, unknown>).serverId as string | undefined;
      if (!sid || !serverMap.has(sid)) continue;

      const bounds = nodesByServer.get(sid);
      const nx = node.position.x;
      const ny = node.position.y;
      const nr = nx + NODE_WIDTH;
      const nb = ny + NODE_HEIGHT;

      if (bounds) {
        bounds.minX = Math.min(bounds.minX, nx);
        bounds.minY = Math.min(bounds.minY, ny);
        bounds.maxX = Math.max(bounds.maxX, nr);
        bounds.maxY = Math.max(bounds.maxY, nb);
      } else {
        nodesByServer.set(sid, { minX: nx, minY: ny, maxX: nr, maxY: nb });
      }
    }

    return Array.from(nodesByServer.entries()).map(([serverId, bounds], idx) => {
      const server = serverMap.get(serverId)!;
      const color = serverColors[idx % serverColors.length]!;
      return {
        serverId,
        name: server.name,
        host: server.host,
        color,
        x: bounds.minX - PADDING,
        y: bounds.minY - PADDING - HEADER_HEIGHT,
        width: bounds.maxX - bounds.minX + 2 * PADDING,
        height: bounds.maxY - bounds.minY + 2 * PADDING + HEADER_HEIGHT,
      };
    });
  }, [nodes, servers, mode]);

  if (groups.length === 0) return null;

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        overflow: 'visible',
        zIndex: 0,
      }}
    >
      <g transform={`translate(${x}, ${y}) scale(${zoom})`}>
        {groups.map((group) => (
          <g key={group.serverId}>
            <rect
              x={group.x}
              y={group.y}
              width={group.width}
              height={group.height}
              rx={8}
              ry={8}
              fill={group.color.bg}
              stroke={group.color.border}
              strokeWidth={1.5 / zoom}
              strokeDasharray={`${6 / zoom} ${4 / zoom}`}
              opacity={0.8}
            />
            <text
              x={group.x + 10}
              y={group.y + 18}
              fill={group.color.text}
              fontSize={11 / zoom}
              fontFamily="system-ui, -apple-system, sans-serif"
              fontWeight="600"
              opacity={0.9}
            >
              {group.name}
            </text>
            <text
              x={group.x + 10 + group.name.length * 7 / zoom + 8}
              y={group.y + 18}
              fill={group.color.text}
              fontSize={9 / zoom}
              fontFamily="monospace"
              opacity={0.5}
            >
              {group.host}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
});
