import { useState, useCallback, useRef } from 'react';
import { useStore } from '@/store';
import {
  importXrayConfig,
  importProjectFile,
  type ImportSummary,
} from '@/utils/importConfig';
import type { ProjectMode } from '@/types';
import { useToastStore } from '@/components/ToastContainer';

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
}

type ImportTab = 'config' | 'project';
type ModeOption = 'auto' | 'simple' | 'advanced';

export default function ImportDialog({ open, onClose }: ImportDialogProps) {
  const importProject = useStore((s) => s.importProject);

  const [tab, setTab] = useState<ImportTab>('config');
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Config import options
  const [createRoutingNodes, setCreateRoutingNodes] = useState(true);
  const [autoLayout, setAutoLayout] = useState(true);
  const [modeOption, setModeOption] = useState<ModeOption>('auto');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setError(null);
    setSummary(null);
    setDragOver(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const processFile = useCallback(async (file: File) => {
    reset();

    const text = await file.text();

    try {
      if (tab === 'project' || file.name.endsWith('.xray-graph')) {
        // Import .xray-graph project file
        const project = importProjectFile(text);
        importProject({
          name: project.name,
          mode: project.mode,
          nodes: project.nodes,
          edges: project.edges,
          servers: project.servers,
          metadata: project.metadata,
        });
        setSummary({
          inboundCount: project.nodes.filter((n) => n.type === 'inbound').length,
          outboundCount: project.nodes.filter((n) => n.type === 'outbound-terminal' || n.type === 'outbound-proxy').length,
          routingCount: project.nodes.filter((n) => n.type === 'routing').length,
          balancerCount: project.nodes.filter((n) => n.type === 'balancer').length,
          edgeCount: project.edges.length,
          warnings: [],
          mode: project.mode,
        });
      } else {
        // Import xray config.json
        const forceMode: ProjectMode | null =
          modeOption === 'auto' ? null : modeOption;

        const result = importXrayConfig(text, {
          createRoutingNodes,
          autoLayout,
          forceMode,
        });

        importProject({
          name: file.name.replace(/\.json$/i, ''),
          mode: result.mode,
          nodes: result.nodes,
          edges: result.edges,
          servers: [],
        });

        setSummary(result.summary);
      }
      useToastStore.getState().addToast({ level: 'success', message: 'Import successful' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error during import';
      setError(msg);
      useToastStore.getState().addToast({ level: 'error', message: `Import failed: ${msg}` });
    }
  }, [tab, modeOption, createRoutingNodes, autoLayout, importProject, reset]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // Reset input so the same file can be selected again
    e.target.value = '';
  }, [processFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  if (!open) return null;

  const tabs: { id: ImportTab; label: string }[] = [
    { id: 'config', label: 'Xray Config' },
    { id: 'project', label: 'Project File' },
  ];

  const accept = tab === 'config' ? '.json' : '.xray-graph,.json';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-[560px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">Import</h2>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white transition-colors text-xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-slate-700 px-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); reset(); }}
              className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto px-6 py-4 space-y-4">
          {/* Summary (shown after successful import) */}
          {summary ? (
            <ImportSummaryView summary={summary} onClose={handleClose} />
          ) : (
            <>
              {/* Drop zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  dragOver
                    ? 'border-blue-400 bg-blue-400/10'
                    : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={accept}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="text-3xl mb-2">
                  {tab === 'config' ? '{ }' : '[ ]'}
                </div>
                <div className="text-sm text-slate-300 mb-1">
                  {tab === 'config'
                    ? 'Select config.json file'
                    : 'Select .xray-graph file'}
                </div>
                <div className="text-xs text-slate-500">
                  or drag & drop here
                </div>
              </div>

              {/* Config import options */}
              {tab === 'config' && (
                <div className="space-y-3">
                  <div className="text-xs text-slate-400 font-medium">Options</div>

                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createRoutingNodes}
                      onChange={(e) => setCreateRoutingNodes(e.target.checked)}
                      className="rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    Create routing nodes from rules
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoLayout}
                      onChange={(e) => setAutoLayout(e.target.checked)}
                      className="rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    Auto-layout nodes
                  </label>

                  <div>
                    <div className="text-xs text-slate-400 mb-1.5">Mode</div>
                    <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
                      {([
                        { id: 'auto', label: 'Auto-detect' },
                        { id: 'simple', label: 'Simple' },
                        { id: 'advanced', label: 'Advanced' },
                      ] as const).map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => setModeOption(opt.id)}
                          className={`flex-1 px-3 py-1.5 text-xs rounded-md transition-colors ${
                            modeOption === opt.id
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-400 hover:text-white hover:bg-slate-700'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Project import info */}
              {tab === 'project' && (
                <div className="text-xs text-slate-500 bg-slate-800/50 rounded-lg p-3 space-y-1">
                  <p className="text-slate-400">After import:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>All nodes and connections will be restored</li>
                    <li>Server information will be loaded</li>
                    <li>Project settings will be applied</li>
                  </ul>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-300">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-slate-700">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            {summary ? 'Done' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Import Summary sub-component ──

function ImportSummaryView({ summary, onClose }: { summary: ImportSummary; onClose: () => void }) {
  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-white">Import Summary</div>

      <div className="bg-slate-800/50 rounded-lg p-4 space-y-2">
        {summary.inboundCount > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-green-400">&#10003;</span>
            <span className="text-slate-300">
              Created {summary.inboundCount} INPUT node{summary.inboundCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}
        {summary.outboundCount > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-green-400">&#10003;</span>
            <span className="text-slate-300">
              Created {summary.outboundCount} OUTPUT node{summary.outboundCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}
        {summary.routingCount > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-green-400">&#10003;</span>
            <span className="text-slate-300">
              Created {summary.routingCount} routing node{summary.routingCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}
        {summary.balancerCount > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-green-400">&#10003;</span>
            <span className="text-slate-300">
              Created {summary.balancerCount} balancer node{summary.balancerCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}
        {summary.edgeCount > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-green-400">&#10003;</span>
            <span className="text-slate-300">
              Created {summary.edgeCount} connection{summary.edgeCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs">
          <span className="text-blue-400">&#9432;</span>
          <span className="text-slate-400">
            Mode: {summary.mode === 'simple' ? 'Simple' : 'Advanced'}
          </span>
        </div>
      </div>

      {summary.warnings.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 space-y-1.5">
          {summary.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <span className="text-amber-400 mt-0.5">&#9888;</span>
              <span className="text-amber-300">{w}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
        >
          OK
        </button>
      </div>
    </div>
  );
}
