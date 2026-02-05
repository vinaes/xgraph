import { useEffect, useRef } from 'react';
import { useStore } from '@/store';
import {
  saveToLocalStorage,
  loadFromLocalStorage,
  addRecentProject,
  loadUiPrefs,
  saveUiPrefs,
  type SerializedProject,
} from '@/utils/storage';

const AUTOSAVE_INTERVAL = 30_000; // 30 seconds

function getSerializedProject(): SerializedProject {
  const state = useStore.getState();
  return {
    id: state.id,
    name: state.name,
    version: state.version,
    mode: state.mode,
    metadata: {
      createdAt: state.metadata.createdAt,
      updatedAt: new Date().toISOString(),
    },
    nodes: state.nodes,
    edges: state.edges,
    servers: state.servers,
  };
}

export function useAutoSave() {
  const hasRestored = useRef(false);

  // Restore saved state on mount (once)
  useEffect(() => {
    if (hasRestored.current) return;
    hasRestored.current = true;

    // Restore project
    const saved = loadFromLocalStorage();
    if (saved && saved.nodes && saved.nodes.length > 0) {
      useStore.getState().importProject({
        id: saved.id,
        name: saved.name,
        version: saved.version,
        mode: saved.mode,
        metadata: saved.metadata,
        nodes: saved.nodes,
        edges: saved.edges,
        servers: saved.servers,
      });
    }

    // Restore UI prefs
    const prefs = loadUiPrefs();
    if (prefs) {
      const state = useStore.getState();
      if (prefs.inspectorOpen !== state.inspectorOpen) state.toggleInspector();
      if (prefs.paletteOpen !== state.paletteOpen) state.togglePalette();
    }
  }, []);

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const project = getSerializedProject();
      saveToLocalStorage(project);
      addRecentProject(project);
    }, AUTOSAVE_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  // Save UI prefs when they change
  const inspectorOpen = useStore((s) => s.inspectorOpen);
  const paletteOpen = useStore((s) => s.paletteOpen);

  useEffect(() => {
    saveUiPrefs({ inspectorOpen, paletteOpen });
  }, [inspectorOpen, paletteOpen]);

  // Save on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      const project = getSerializedProject();
      saveToLocalStorage(project);
      addRecentProject(project);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);
}
