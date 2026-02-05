import { useState, useCallback } from 'react';
import { useStore } from '@/store';
import {
  saveProjectFile,
  openProjectFile,
  saveToLocalStorage,
  addRecentProject,
  type SerializedProject,
} from '@/utils/storage';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useToastStore } from '@/components/ToastContainer';

interface HeaderProps {
  onExport?: () => void;
  onImport?: () => void;
  onSimulate?: () => void;
  simulationActive?: boolean;
}

export default function Header({ onExport, onImport, onSimulate, simulationActive }: HeaderProps) {
  const name = useStore((s) => s.name);
  const nodes = useStore((s) => s.nodes);
  const setProjectName = useStore((s) => s.setProjectName);
  const newProject = useStore((s) => s.newProject);
  const importProject = useStore((s) => s.importProject);
  const togglePalette = useStore((s) => s.togglePalette);
  const toggleInspector = useStore((s) => s.toggleInspector);
  const [confirmNewOpen, setConfirmNewOpen] = useState(false);

  const getProjectData = useCallback((): SerializedProject => {
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
  }, []);

  const handleSave = useCallback(async () => {
    const project = getProjectData();
    const saved = await saveProjectFile(project);
    if (saved) {
      saveToLocalStorage(project);
      addRecentProject(project);
      useToastStore.getState().addToast({ level: 'success', message: 'Project saved' });
    }
  }, [getProjectData]);

  const handleOpen = useCallback(async () => {
    const project = await openProjectFile();
    if (project) {
      importProject({
        id: project.id,
        name: project.name,
        version: project.version,
        mode: project.mode,
        metadata: project.metadata,
        nodes: project.nodes,
        edges: project.edges,
        servers: project.servers,
      });
      useToastStore.getState().addToast({ level: 'success', message: `Opened "${project.name}"` });
    }
  }, [importProject]);

  return (
    <header className="h-12 bg-slate-900 border-b border-slate-700 flex items-center px-4 gap-4 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-lg font-bold text-blue-400">Xray</span>
        <span className="text-sm text-slate-400">Graph Builder</span>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-slate-700" />

      {/* Project name */}
      <input
        type="text"
        value={name}
        onChange={(e) => setProjectName(e.target.value)}
        className="bg-transparent text-sm text-slate-200 border-none outline-none w-40 hover:bg-slate-800 px-2 py-1 rounded transition-colors"
      />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={togglePalette}
          className="px-2 py-1 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="Toggle Palette"
        >
          Palette
        </button>
        <button
          onClick={toggleInspector}
          className="px-2 py-1 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="Toggle Inspector"
        >
          Inspector
        </button>
        <div className="w-px h-6 bg-slate-700" />
        <button
          onClick={() => {
            if (nodes.length > 0) {
              setConfirmNewOpen(true);
            } else {
              newProject();
            }
          }}
          className="px-3 py-1 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="New Project (Ctrl+N)"
        >
          New
        </button>
        <button
          onClick={handleOpen}
          className="px-3 py-1 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="Open Project (Ctrl+O)"
        >
          Open
        </button>
        <button
          onClick={handleSave}
          className="px-3 py-1 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="Save Project (Ctrl+S)"
        >
          Save
        </button>
        <button
          onClick={onImport}
          className="px-3 py-1 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
        >
          Import
        </button>
        <button
          onClick={onSimulate}
          className={`px-3 py-1 text-xs rounded transition-colors ${
            simulationActive
              ? 'text-emerald-300 bg-emerald-600/30 hover:bg-emerald-600/40 ring-1 ring-emerald-500/50'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Simulate Traffic"
        >
          Simulate
        </button>
        <button
          onClick={onExport}
          className="px-3 py-1 text-xs text-white bg-blue-600 hover:bg-blue-500 rounded transition-colors"
        >
          Export
        </button>
      </div>
      <ConfirmDialog
        open={confirmNewOpen}
        title="New Project"
        message="This will discard your current project. Any unsaved changes will be lost."
        confirmLabel="New Project"
        danger
        onConfirm={() => {
          setConfirmNewOpen(false);
          newProject();
        }}
        onCancel={() => setConfirmNewOpen(false)}
      />
    </header>
  );
}
