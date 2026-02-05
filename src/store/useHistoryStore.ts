import { useStore, type XrayNode, type XrayEdge } from './useStore';
import type { Server } from '@/types';

interface HistorySnapshot {
  nodes: XrayNode[];
  edges: XrayEdge[];
  servers: Server[];
}

interface HistoryState {
  past: HistorySnapshot[];
  future: HistorySnapshot[];
  _lastSnapshot: HistorySnapshot | null;
  _paused: boolean;
}

const MAX_HISTORY = 50;

const historyState: HistoryState = {
  past: [],
  future: [],
  _lastSnapshot: null,
  _paused: false,
};

function takeSnapshot(): HistorySnapshot {
  const { nodes, edges, servers } = useStore.getState();
  return {
    nodes: JSON.parse(JSON.stringify(nodes)),
    edges: JSON.parse(JSON.stringify(edges)),
    servers: JSON.parse(JSON.stringify(servers)),
  };
}

function snapshotsEqual(a: HistorySnapshot, b: HistorySnapshot): boolean {
  return (
    JSON.stringify(a.nodes) === JSON.stringify(b.nodes) &&
    JSON.stringify(a.edges) === JSON.stringify(b.edges) &&
    JSON.stringify(a.servers) === JSON.stringify(b.servers)
  );
}

/** Push the current state as a checkpoint before a mutation */
export function pushHistory(): void {
  if (historyState._paused) return;

  const snapshot = takeSnapshot();

  // Don't push duplicate snapshots
  if (historyState._lastSnapshot && snapshotsEqual(snapshot, historyState._lastSnapshot)) {
    return;
  }

  historyState.past.push(snapshot);
  if (historyState.past.length > MAX_HISTORY) {
    historyState.past.shift();
  }

  // Clear future on new action (standard undo behavior)
  historyState.future = [];
  historyState._lastSnapshot = snapshot;
}

export function undo(): void {
  const snapshot = historyState.past.pop();
  if (!snapshot) return;

  // Save current state to future
  const current = takeSnapshot();
  historyState.future.push(current);

  // Restore past state
  historyState._paused = true;
  useStore.setState({
    nodes: snapshot.nodes,
    edges: snapshot.edges,
    servers: snapshot.servers,
    selectedNodeId: null,
    selectedEdgeId: null,
  });
  historyState._paused = false;
  historyState._lastSnapshot = snapshot;
}

export function redo(): void {
  const snapshot = historyState.future.pop();
  if (!snapshot) return;

  // Save current state to past
  const current = takeSnapshot();
  historyState.past.push(current);

  // Restore future state
  historyState._paused = true;
  useStore.setState({
    nodes: snapshot.nodes,
    edges: snapshot.edges,
    servers: snapshot.servers,
    selectedNodeId: null,
    selectedEdgeId: null,
  });
  historyState._paused = false;
  historyState._lastSnapshot = snapshot;
}

export function canUndo(): boolean {
  return historyState.past.length > 0;
}

export function canRedo(): boolean {
  return historyState.future.length > 0;
}

export function clearHistory(): void {
  historyState.past = [];
  historyState.future = [];
  historyState._lastSnapshot = null;
}

/** Pause history tracking (e.g., during import/restore) */
export function pauseHistory(): void {
  historyState._paused = true;
}

export function resumeHistory(): void {
  historyState._paused = false;
  historyState._lastSnapshot = takeSnapshot();
}

export function getHistoryLength(): { past: number; future: number } {
  return { past: historyState.past.length, future: historyState.future.length };
}
