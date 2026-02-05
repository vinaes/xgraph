import { useState, useEffect, useCallback } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { useStore } from '@/store';
import Header from '@/components/Header';
import Palette from '@/components/Palette';
import Canvas from '@/components/Canvas';
import Inspector from '@/components/Inspector';
import Footer from '@/components/Footer';
import ExportDialog from '@/components/ExportDialog';
import ImportDialog from '@/components/ImportDialog';
import ToastContainer from '@/components/ToastContainer';
import { useValidation } from '@/hooks/useValidation';
import { useAutoSave } from '@/hooks/useAutoSave';
import {
  saveProjectFile,
  openProjectFile,
  saveToLocalStorage,
  addRecentProject,
  type SerializedProject,
} from '@/utils/storage';
import { undo, redo } from '@/store/useHistoryStore';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useToastStore } from '@/components/ToastContainer';
import TemplateGallery from '@/components/TemplateGallery';
import SimulationPanel from '@/components/SimulationPanel';
import { useSimulationStore } from '@/store/useSimulationStore';
import ErrorBoundary from '@/components/ErrorBoundary';

function getProjectData(): SerializedProject {
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

function AppContent() {
  const paletteOpen = useStore((s) => s.paletteOpen);
  const inspectorOpen = useStore((s) => s.inspectorOpen);
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [confirmNewOpen, setConfirmNewOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const simulationActive = useSimulationStore((s) => s.active);
  const setSimulationActive = useSimulationStore((s) => s.setActive);
  const resetSimulation = useSimulationStore((s) => s.reset);

  // Run validation on every node/edge change (debounced)
  useValidation();

  // Auto-save every 30 seconds + restore on mount
  useAutoSave();

  // Keyboard shortcuts
  const handleKeyboard = useCallback(async (e: KeyboardEvent) => {
    // Skip shortcuts when typing in input/textarea
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    const isMod = e.ctrlKey || e.metaKey;

    // Non-modifier shortcuts
    if (!isMod) {
      switch (e.key) {
        case 'Delete':
        case 'Backspace': {
          const state = useStore.getState();
          // Check for multi-selected nodes first
          const selectedNodes = state.nodes.filter((n) => n.selected);
          if (selectedNodes.length > 1) {
            state.deleteSelectedNodes();
          } else if (state.selectedNodeId) {
            state.deleteNode(state.selectedNodeId);
          } else if (state.selectedEdgeId) {
            state.deleteEdge(state.selectedEdgeId);
          }
          break;
        }
      }
      return;
    }

    switch (e.key.toLowerCase()) {
      case 'z':
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        break;
      case 'y':
        e.preventDefault();
        redo();
        break;
      case 'd': {
        e.preventDefault();
        const state = useStore.getState();
        if (state.selectedNodeId) {
          state.duplicateNode(state.selectedNodeId);
        }
        break;
      }
      case 's': {
        e.preventDefault();
        const project = getProjectData();
        const saved = await saveProjectFile(project);
        if (saved) {
          saveToLocalStorage(project);
          addRecentProject(project);
          useToastStore.getState().addToast({ level: 'success', message: 'Project saved' });
        }
        break;
      }
      case 'o': {
        e.preventDefault();
        const project = await openProjectFile();
        if (project) {
          useStore.getState().importProject({
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
        break;
      }
      case 'n':
        e.preventDefault();
        if (useStore.getState().nodes.length > 0) {
          setConfirmNewOpen(true);
        } else {
          useStore.getState().newProject();
        }
        break;
      case 'e':
        e.preventDefault();
        setExportOpen(true);
        break;
      case 'a':
        e.preventDefault();
        useStore.getState().selectAllNodes();
        break;
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [handleKeyboard]);

  return (
    <div className="h-screen flex flex-col bg-slate-950">
      <Header
        onExport={() => setExportOpen(true)}
        onImport={() => setImportOpen(true)}
        onSimulate={() => setSimulationActive(!simulationActive)}
        simulationActive={simulationActive}
      />
      <div className="flex-1 flex overflow-hidden">
        {paletteOpen && <Palette onOpenTemplates={() => setTemplatesOpen(true)} />}
        <Canvas />
        {inspectorOpen && !simulationActive && <Inspector />}
        {simulationActive && (
          <SimulationPanel onClose={() => resetSimulation()} />
        )}
      </div>
      <Footer />
      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} />
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
      <ToastContainer />
      <TemplateGallery open={templatesOpen} onClose={() => setTemplatesOpen(false)} />
      <ConfirmDialog
        open={confirmNewOpen}
        title="New Project"
        message="This will discard your current project. Any unsaved changes will be lost."
        confirmLabel="New Project"
        danger
        onConfirm={() => {
          setConfirmNewOpen(false);
          useStore.getState().newProject();
        }}
        onCancel={() => setConfirmNewOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary fallbackMessage="Xray Graph Builder crashed">
      <ReactFlowProvider>
        <AppContent />
      </ReactFlowProvider>
    </ErrorBoundary>
  );
}
