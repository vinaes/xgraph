import { useState, useCallback, useRef, useMemo, type DragEvent, type MouseEvent as ReactMouseEvent } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  SelectionMode,
  type Connection,
  type NodeMouseHandler,
  type EdgeMouseHandler,
  type Edge,
  type OnSelectionChangeFunc,
} from '@xyflow/react';
import { v4 as uuidv4 } from 'uuid';
import { useStore, type XrayNode } from '@/store';
import { nodeTypes } from '@/components/nodes';
import {
  createDefaultDeviceData,
  createDefaultInboundData,
  createDefaultRoutingData,
  createDefaultBalancerData,
  createDefaultOutboundData,
  type XrayNodeData,
  type EdgeData,
} from '@/types';
import { isValidConnection, findNodeById } from '@/utils/connectionRules';
import { DefaultEdge, ConditionalEdge, EdgeMarkerDefs } from '@/components/edges/CustomEdge';
import ContextMenu, { type MenuItem } from '@/components/ContextMenu';
import { undo, redo, canUndo, canRedo } from '@/store/useHistoryStore';
import { useSimulationStore } from '@/store/useSimulationStore';
import ServerGroupOverlay from '@/components/ServerGroupOverlay';

const edgeTypes = {
  default: DefaultEdge,
  conditional: ConditionalEdge,
};

const defaultEdgeOpts = { type: 'default' as const };

const nodeColorMap: Record<string, string> = {
  device: '#06b6d4',
  inbound: '#22c55e',
  routing: '#3b82f6',
  balancer: '#a855f7',
  'outbound-terminal': '#ef4444',
  'outbound-proxy': '#f97316',
};

interface ContextMenuState {
  x: number;
  y: number;
  items: MenuItem[];
}

export default function Canvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const rawNodes = useStore((s) => s.nodes);
  const edges = useStore((s) => s.edges);
  const hoveredNodeId = useStore((s) => s.hoveredNodeId);
  const setHoveredNode = useStore((s) => s.setHoveredNode);
  const simResult = useSimulationStore((s) => s.result);

  // Build set of node IDs connected to hovered node (direct neighbors)
  const connectedNodeIds = useMemo(() => {
    if (!hoveredNodeId) return null;
    const connected = new Set<string>();
    connected.add(hoveredNodeId);
    for (const edge of edges) {
      if (edge.source === hoveredNodeId) connected.add(edge.target);
      if (edge.target === hoveredNodeId) connected.add(edge.source);
    }
    return connected;
  }, [hoveredNodeId, edges]);

  // Apply simulation highlighting OR hover highlighting to nodes
  const nodes = useMemo(() => {
    // Simulation takes priority
    if (simResult) {
      const highlightSet = new Set(simResult.highlightNodeIds);
      return rawNodes.map((node) => {
        const isHighlighted = highlightSet.has(node.id);
        const isDimmed = !isHighlighted;
        return {
          ...node,
          style: {
            ...node.style,
            opacity: isDimmed ? 0.2 : 1,
            transition: 'opacity 0.3s, filter 0.3s',
            ...(isHighlighted ? { filter: 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.5))' } : {}),
          },
        };
      });
    }

    // Hover highlighting
    if (connectedNodeIds) {
      return rawNodes.map((node) => {
        const isConnected = connectedNodeIds.has(node.id);
        return {
          ...node,
          style: {
            ...node.style,
            opacity: isConnected ? 1 : 0.3,
            transition: 'opacity 0.2s, filter 0.2s',
            ...(node.id === hoveredNodeId
              ? { filter: 'drop-shadow(0 0 6px rgba(148, 163, 184, 0.4))' }
              : {}),
          },
        };
      });
    }

    return rawNodes;
  }, [rawNodes, simResult, connectedNodeIds, hoveredNodeId]);
  const onNodesChange = useStore((s) => s.onNodesChange);
  const onEdgesChange = useStore((s) => s.onEdgesChange);
  const onConnect = useStore((s) => s.onConnect);
  const addNode = useStore((s) => s.addNode);
  const selectNode = useStore((s) => s.selectNode);
  const selectEdge = useStore((s) => s.selectEdge);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  // Shared node creation helper — used by context menu, double-click, and drag-drop
  const createQuickNode = useCallback(
    (dropX: number, dropY: number, nodeType: string, protocol?: string) => {
      let data: XrayNodeData;
      switch (nodeType) {
        case 'device':
          data = {
            nodeType: 'device',
            ...createDefaultDeviceData(),
          };
          break;
        case 'inbound':
          data = {
            nodeType: 'inbound',
            ...createDefaultInboundData(protocol as 'vless'),
            tag: `inbound-${protocol}-${Date.now().toString(36)}`,
          };
          break;
        case 'routing':
          data = {
            nodeType: 'routing',
            ...createDefaultRoutingData(),
            tag: `rule-${Date.now().toString(36)}`,
          };
          break;
        case 'balancer':
          data = {
            nodeType: 'balancer',
            ...createDefaultBalancerData(),
            tag: `balancer-${Date.now().toString(36)}`,
          };
          break;
        case 'outbound-terminal':
          data = {
            nodeType: 'outbound-terminal',
            ...createDefaultOutboundData(protocol as 'freedom'),
            tag: `${protocol}-${Date.now().toString(36)}`,
          };
          break;
        case 'outbound-proxy':
          data = {
            nodeType: 'outbound-proxy',
            ...createDefaultOutboundData(protocol as 'vless'),
            tag: `proxy-${protocol}-${Date.now().toString(36)}`,
          };
          break;
        default:
          return;
      }

      const newNode: XrayNode = {
        id: uuidv4(),
        type: nodeType,
        position: { x: dropX, y: dropY },
        data,
      };
      addNode(newNode);
    },
    [addNode]
  );

  // Build quick-add menu items for a given canvas position
  const buildQuickAddItems = useCallback(
    (dropX: number, dropY: number): MenuItem[] => [
      {
        label: 'Add Device',
        onClick: () => createQuickNode(dropX, dropY, 'device'),
      },
      { label: '', onClick: () => {}, separator: true },
      {
        label: 'Add VLESS Inbound',
        onClick: () => createQuickNode(dropX, dropY, 'inbound', 'vless'),
      },
      {
        label: 'Add VMess Inbound',
        onClick: () => createQuickNode(dropX, dropY, 'inbound', 'vmess'),
      },
      {
        label: 'Add Trojan Inbound',
        onClick: () => createQuickNode(dropX, dropY, 'inbound', 'trojan'),
      },
      { label: '', onClick: () => {}, separator: true },
      {
        label: 'Add Routing Rule',
        onClick: () => createQuickNode(dropX, dropY, 'routing'),
      },
      {
        label: 'Add Balancer',
        onClick: () => createQuickNode(dropX, dropY, 'balancer'),
      },
      { label: '', onClick: () => {}, separator: true },
      {
        label: 'Add Freedom',
        onClick: () => createQuickNode(dropX, dropY, 'outbound-terminal', 'freedom'),
      },
      {
        label: 'Add Blackhole',
        onClick: () => createQuickNode(dropX, dropY, 'outbound-terminal', 'blackhole'),
      },
      {
        label: 'Add Proxy Outbound',
        onClick: () => createQuickNode(dropX, dropY, 'outbound-proxy', 'vless'),
      },
    ],
    [createQuickNode]
  );

  const handleNodeMouseEnter: NodeMouseHandler<XrayNode> = useCallback(
    (_, node) => {
      setHoveredNode(node.id);
    },
    [setHoveredNode]
  );

  const handleNodeMouseLeave: NodeMouseHandler<XrayNode> = useCallback(
    () => {
      setHoveredNode(null);
    },
    [setHoveredNode]
  );

  const handleNodeClick: NodeMouseHandler<XrayNode> = useCallback(
    (event, node) => {
      // Shift+click is handled by React Flow's native multi-select
      if (!event.shiftKey) {
        selectNode(node.id);
      }
      closeContextMenu();
    },
    [selectNode, closeContextMenu]
  );

  const handleEdgeClick: EdgeMouseHandler<Edge<EdgeData>> = useCallback(
    (_, edge) => {
      selectEdge(edge.id);
      closeContextMenu();
    },
    [selectEdge, closeContextMenu]
  );

  const handlePaneClick = useCallback(() => {
    selectNode(null);
    closeContextMenu();
  }, [selectNode, closeContextMenu]);

  // Sync React Flow's multi-select with our store for Inspector
  const handleSelectionChange: OnSelectionChangeFunc = useCallback(
    ({ nodes: selectedNodes }) => {
      if (selectedNodes.length > 0) {
        // Show the first selected node in Inspector
        selectNode(selectedNodes[0]!.id);
      }
    },
    [selectNode]
  );

  // Context menu for nodes
  const handleNodeContextMenu: NodeMouseHandler<XrayNode> = useCallback(
    (event, node) => {
      event.preventDefault();
      selectNode(node.id);

      const state = useStore.getState();
      const items: MenuItem[] = [
        {
          label: 'Duplicate',
          shortcut: 'Ctrl+D',
          onClick: () => state.duplicateNode(node.id),
        },
        { label: '', onClick: () => {}, separator: true },
        {
          label: 'Delete',
          shortcut: 'Del',
          danger: true,
          onClick: () => state.deleteNode(node.id),
        },
      ];

      setContextMenu({ x: event.clientX, y: event.clientY, items });
    },
    [selectNode]
  );

  // Context menu for edges
  const handleEdgeContextMenu: EdgeMouseHandler<Edge<EdgeData>> = useCallback(
    (event, edge) => {
      event.preventDefault();
      selectEdge(edge.id);

      const state = useStore.getState();
      const items: MenuItem[] = [
        {
          label: edge.type === 'conditional' ? 'Make Default' : 'Make Conditional',
          onClick: () => {
            const newType = edge.type === 'conditional' ? 'default' : 'conditional';
            state.updateEdgeData(edge.id, {}, newType);
          },
        },
        { label: '', onClick: () => {}, separator: true },
        {
          label: 'Delete Edge',
          shortcut: 'Del',
          danger: true,
          onClick: () => state.deleteEdge(edge.id),
        },
      ];

      setContextMenu({ x: event.clientX, y: event.clientY, items });
    },
    [selectEdge]
  );

  // Context menu for empty canvas (right-click)
  const handlePaneContextMenu = useCallback(
    (event: ReactMouseEvent | MouseEvent) => {
      event.preventDefault();

      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!bounds) return;

      const dropX = event.clientX - bounds.left;
      const dropY = event.clientY - bounds.top;

      const items: MenuItem[] = [
        ...buildQuickAddItems(dropX, dropY),
        { label: '', onClick: () => {}, separator: true },
        {
          label: 'Undo',
          shortcut: 'Ctrl+Z',
          disabled: !canUndo(),
          onClick: () => undo(),
        },
        {
          label: 'Redo',
          shortcut: 'Ctrl+Shift+Z',
          disabled: !canRedo(),
          onClick: () => redo(),
        },
      ];

      setContextMenu({ x: event.clientX, y: event.clientY, items });
    },
    [buildQuickAddItems]
  );

  // Double-click on canvas → quick add menu
  const handleDoubleClick = useCallback(
    (event: ReactMouseEvent) => {
      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!bounds) return;

      const dropX = event.clientX - bounds.left;
      const dropY = event.clientY - bounds.top;

      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        items: buildQuickAddItems(dropX, dropY),
      });
    },
    [buildQuickAddItems]
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      const sourceNode = findNodeById(rawNodes, connection.source);
      const targetNode = findNodeById(rawNodes, connection.target);
      if (!sourceNode || !targetNode) return;

      const result = isValidConnection(sourceNode, targetNode);
      if (!result.valid) return;

      onConnect(connection);
    },
    [onConnect, rawNodes]
  );

  const handleDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();

      const dataStr = event.dataTransfer.getData('application/xray-node');
      if (!dataStr) return;

      const item = JSON.parse(dataStr) as {
        nodeType: string;
        protocol?: string;
      };

      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!bounds) return;

      const dropX = event.clientX - bounds.left;
      const dropY = event.clientY - bounds.top;

      createQuickNode(dropX, dropY, item.nodeType, item.protocol);
    },
    [createQuickNode]
  );

  return (
    <div
      ref={reactFlowWrapper}
      className="flex-1 h-full relative"
      onDoubleClick={(e) => {
        // Only trigger on pane background, not on nodes or controls
        const target = e.target as HTMLElement;
        const isPane = target.classList.contains('react-flow__pane')
          || target.classList.contains('react-flow__background')
          || target.closest('.react-flow__pane');
        if (isPane && !target.closest('.react-flow__node') && !target.closest('.react-flow__edge')) {
          handleDoubleClick(e);
        }
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onNodeClick={handleNodeClick}
        onNodeMouseEnter={handleNodeMouseEnter}
        onNodeMouseLeave={handleNodeMouseLeave}
        onEdgeClick={handleEdgeClick}
        onPaneClick={handlePaneClick}
        onSelectionChange={handleSelectionChange}
        onNodeContextMenu={handleNodeContextMenu}
        onEdgeContextMenu={handleEdgeContextMenu}
        onPaneContextMenu={handlePaneContextMenu}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOpts}
        selectionOnDrag
        panOnDrag={[1, 2]}
        selectionMode={SelectionMode.Partial}
        multiSelectionKeyCode="Shift"
        fitView
        snapToGrid
        snapGrid={[16, 16]}
        proOptions={{ hideAttribution: true }}
        className="bg-slate-950"
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#334155" />
        <ServerGroupOverlay />
        <Controls
          className="!bg-slate-800 !border-slate-700 !rounded-lg !shadow-lg [&>button]:!bg-slate-800 [&>button]:!border-slate-700 [&>button]:!text-slate-400 [&>button:hover]:!bg-slate-700"
        />
        <MiniMap
          nodeColor={(node) => {
            const nt = (node.data as XrayNodeData)?.nodeType;
            return nodeColorMap[nt] || '#64748b';
          }}
          maskColor="rgba(15, 23, 42, 0.8)"
          className="!bg-slate-900 !border-slate-700 !rounded-lg"
        />
        <EdgeMarkerDefs />
      </ReactFlow>
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={closeContextMenu}
        />
      )}
    </div>
  );
}
