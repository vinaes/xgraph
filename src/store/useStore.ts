import { create } from 'zustand';
import {
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from '@xyflow/react';
import { v4 as uuidv4 } from 'uuid';
import type {
  XrayNodeData,
  Server,
  ProjectMode,
  ProjectMetadata,
  EdgeData,
} from '@/types';
import { defaultTransport } from '@/types';
import { pushHistory, clearHistory, pauseHistory, resumeHistory } from './useHistoryStore';

export type XrayNode = Node<XrayNodeData>;
export type XrayEdge = Edge<EdgeData>;

interface ProjectState {
  // Project metadata
  id: string;
  name: string;
  version: string;
  mode: ProjectMode;
  metadata: ProjectMetadata;

  // Graph data
  nodes: XrayNode[];
  edges: XrayEdge[];

  // Servers
  servers: Server[];

  // UI state
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  hoveredNodeId: string | null;
  inspectorOpen: boolean;
  paletteOpen: boolean;
}

interface ImportProjectData {
  id?: string;
  name: string;
  version?: string;
  mode: ProjectMode;
  metadata?: { createdAt: string; updatedAt: string };
  nodes: XrayNode[];
  edges: XrayEdge[];
  servers: Server[];
}

interface ProjectActions {
  // Node operations
  onNodesChange: OnNodesChange<XrayNode>;
  onEdgesChange: OnEdgesChange<XrayEdge>;
  onConnect: OnConnect;
  addNode: (node: XrayNode) => void;
  updateNodeData: (nodeId: string, data: Partial<XrayNodeData>) => void;
  deleteNode: (nodeId: string) => void;
  duplicateNode: (nodeId: string) => void;

  // Edge operations
  deleteEdge: (edgeId: string) => void;
  updateEdgeData: (edgeId: string, data: Partial<EdgeData>, edgeType?: string) => void;

  // Server operations
  addServer: (server: Server) => void;
  updateServer: (serverId: string, updates: Partial<Server>) => void;
  deleteServer: (serverId: string) => void;

  // Selection
  selectNode: (nodeId: string | null) => void;
  selectEdge: (edgeId: string | null) => void;

  // Hover
  setHoveredNode: (nodeId: string | null) => void;

  // Multi-select operations
  deleteSelectedNodes: () => void;
  selectAllNodes: () => void;

  // UI
  toggleInspector: () => void;
  togglePalette: () => void;

  // Mode
  setMode: (mode: ProjectMode) => void;

  // Project
  setProjectName: (name: string) => void;
  newProject: () => void;
  importProject: (data: ImportProjectData) => void;
}

const createInitialState = (): ProjectState => ({
  id: uuidv4(),
  name: 'Untitled Project',
  version: '1.0.0',
  mode: 'client',
  metadata: {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  nodes: [],
  edges: [],
  servers: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  hoveredNodeId: null,
  inspectorOpen: true,
  paletteOpen: true,
});

export const useStore = create<ProjectState & ProjectActions>()((set, get) => ({
  ...createInitialState(),

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) });
  },

  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },

  onConnect: (connection) => {
    pushHistory();
    set({
      edges: addEdge(
        {
          ...connection,
          data: { transport: { ...defaultTransport } } as EdgeData,
        },
        get().edges
      ),
    });
  },

  addNode: (node) => {
    pushHistory();
    set({ nodes: [...get().nodes, node] });
  },

  updateNodeData: (nodeId, data) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...data } as XrayNodeData }
          : node
      ),
    });
  },

  duplicateNode: (nodeId) => {
    const node = get().nodes.find((n) => n.id === nodeId);
    if (!node) return;
    pushHistory();
    const newId = uuidv4();
    const newNode: XrayNode = {
      ...node,
      id: newId,
      position: { x: node.position.x + 50, y: node.position.y + 50 },
      data: {
        ...node.data,
        ...('tag' in node.data ? { tag: `${(node.data as XrayNodeData & { tag: string }).tag}-copy` } : {}),
        ...('name' in node.data && node.data.nodeType === 'device' ? { name: `${node.data.name} (copy)` } : {}),
      } as XrayNodeData,
      selected: false,
    };
    set({ nodes: [...get().nodes, newNode], selectedNodeId: newId, selectedEdgeId: null });
  },

  deleteNode: (nodeId) => {
    pushHistory();
    set({
      nodes: get().nodes.filter((n) => n.id !== nodeId),
      edges: get().edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      selectedNodeId: get().selectedNodeId === nodeId ? null : get().selectedNodeId,
    });
  },

  deleteEdge: (edgeId) => {
    pushHistory();
    set({
      edges: get().edges.filter((e) => e.id !== edgeId),
      selectedEdgeId: get().selectedEdgeId === edgeId ? null : get().selectedEdgeId,
    });
  },

  updateEdgeData: (edgeId, data, edgeType) => {
    set({
      edges: get().edges.map((edge) =>
        edge.id === edgeId
          ? {
              ...edge,
              ...(edgeType !== undefined ? { type: edgeType } : {}),
              data: { ...(edge.data as EdgeData), ...data } as EdgeData,
            }
          : edge
      ),
    });
  },

  addServer: (server) => {
    pushHistory();
    set({ servers: [...get().servers, server] });
  },

  updateServer: (serverId, updates) => {
    set({
      servers: get().servers.map((s) =>
        s.id === serverId ? { ...s, ...updates } : s
      ),
    });
  },

  deleteServer: (serverId) => {
    pushHistory();
    set({
      servers: get().servers.filter((s) => s.id !== serverId),
      nodes: get().nodes.filter((n) => {
        const data = n.data as XrayNodeData;
        return !('serverId' in data) || (data as Record<string, unknown>).serverId !== serverId;
      }),
    });
  },

  selectNode: (nodeId) => {
    set({ selectedNodeId: nodeId, selectedEdgeId: null });
  },

  selectEdge: (edgeId) => {
    set({ selectedEdgeId: edgeId, selectedNodeId: null });
  },

  setHoveredNode: (nodeId) => {
    set({ hoveredNodeId: nodeId });
  },

  deleteSelectedNodes: () => {
    const selectedIds = get().nodes.filter((n) => n.selected).map((n) => n.id);
    if (selectedIds.length === 0) return;
    pushHistory();
    const idSet = new Set(selectedIds);
    set({
      nodes: get().nodes.filter((n) => !idSet.has(n.id)),
      edges: get().edges.filter((e) => !idSet.has(e.source) && !idSet.has(e.target)),
      selectedNodeId: null,
    });
  },

  selectAllNodes: () => {
    set({
      nodes: get().nodes.map((n) => ({ ...n, selected: true })),
      selectedNodeId: get().nodes.length > 0 ? get().nodes[0]!.id : null,
      selectedEdgeId: null,
    });
  },

  toggleInspector: () => {
    set({ inspectorOpen: !get().inspectorOpen });
  },

  togglePalette: () => {
    set({ paletteOpen: !get().paletteOpen });
  },

  setMode: (mode) => {
    set({ mode });
  },

  setProjectName: (name) => {
    set({ name });
  },

  newProject: () => {
    clearHistory();
    set(createInitialState());
  },

  importProject: (data) => {
    pauseHistory();
    clearHistory();
    const now = new Date().toISOString();
    const normalizedEdges = data.edges.map((e) => {
      const edgeData = (e.data || {}) as EdgeData;
      if (edgeData.transport) return e;
      return {
        ...e,
        data: { ...edgeData, transport: { ...defaultTransport } },
      };
    });
    set({
      id: data.id || uuidv4(),
      name: data.name,
      version: data.version || '1.0.0',
      mode: data.mode,
      metadata: data.metadata || { createdAt: now, updatedAt: now },
      nodes: data.nodes,
      edges: normalizedEdges,
      servers: data.servers,
      selectedNodeId: null,
      selectedEdgeId: null,
    });
    resumeHistory();
  },
}));
