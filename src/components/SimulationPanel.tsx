import { useCallback, useMemo } from 'react';
import { useStore } from '@/store';
import { useSimulationStore } from '@/store/useSimulationStore';
import { runSimulation, type SimulationResult } from '@/utils/simulation';
import type { XrayNodeData } from '@/types';
import { useToastStore } from '@/components/ToastContainer';

const nodeTypeColors: Record<string, string> = {
  inbound: 'text-green-400',
  routing: 'text-blue-400',
  balancer: 'text-purple-400',
  'outbound-terminal': 'text-red-400',
  'outbound-proxy': 'text-orange-400',
};

const nodeTypeBg: Record<string, string> = {
  inbound: 'bg-green-500/10 border-green-500/30',
  routing: 'bg-blue-500/10 border-blue-500/30',
  balancer: 'bg-purple-500/10 border-purple-500/30',
  'outbound-terminal': 'bg-red-500/10 border-red-500/30',
  'outbound-proxy': 'bg-orange-500/10 border-orange-500/30',
};

interface SimulationPanelProps {
  onClose: () => void;
}

export default function SimulationPanel({ onClose }: SimulationPanelProps) {
  const nodes = useStore((s) => s.nodes);
  const edges = useStore((s) => s.edges);
  const selectNode = useStore((s) => s.selectNode);

  const input = useSimulationStore((s) => s.input);
  const result = useSimulationStore((s) => s.result);
  const setInput = useSimulationStore((s) => s.setInput);
  const setResult = useSimulationStore((s) => s.setResult);

  // Get all INPUT tags for the dropdown
  const inboundTags = useMemo(() => {
    return nodes
      .filter((n) => (n.data as XrayNodeData).nodeType === 'inbound')
      .map((n) => {
        const d = n.data as Extract<XrayNodeData, { nodeType: 'inbound' }>;
        return {
          tag: d.tag,
          label: `${d.tag} (${d.protocol}:${d.port})`,
        };
      });
  }, [nodes]);

  // Auto-select first INPUT if none set
  const selectedTag = input.inboundTag || (inboundTags[0]?.tag ?? '');

  const handleRun = useCallback(() => {
    try {
      const simResult = runSimulation(
        { ...input, inboundTag: selectedTag },
        nodes,
        edges
      );
      setResult(simResult);
    } catch (err) {
      useToastStore.getState().addToast({
        level: 'error',
        message: `Simulation error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      });
    }
  }, [input, selectedTag, nodes, edges, setResult]);

  const handleClear = useCallback(() => {
    setResult(null);
  }, [setResult]);

  return (
    <div className="w-80 bg-slate-900 border-l border-slate-700 flex flex-col shrink-0 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-200">Traffic Simulation</h2>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-300 text-lg leading-none"
        >
          &times;
        </button>
      </div>

      {/* Input Form */}
      <div className="px-4 py-3 border-b border-slate-700 space-y-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Test domain / host</label>
          <input
            type="text"
            value={input.domain}
            onChange={(e) => setInput({ domain: e.target.value })}
            placeholder="example.com"
            className="w-full bg-slate-800 border border-slate-600 text-sm text-slate-200 rounded px-2 py-1.5 outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-xs text-slate-400 mb-1">Protocol</label>
            <select
              value={input.protocol}
              onChange={(e) => setInput({ protocol: e.target.value as 'tcp' | 'udp' })}
              className="w-full bg-slate-800 border border-slate-600 text-sm text-slate-200 rounded px-2 py-1.5 outline-none focus:border-blue-500"
            >
              <option value="tcp">TCP</option>
              <option value="udp">UDP</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs text-slate-400 mb-1">Port</label>
            <input
              type="number"
              value={input.port}
              onChange={(e) => setInput({ port: Number(e.target.value) || 443 })}
              min={1}
              max={65535}
              className="w-full bg-slate-800 border border-slate-600 text-sm text-slate-200 rounded px-2 py-1.5 outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Start from INPUT</label>
          <select
            value={selectedTag}
            onChange={(e) => setInput({ inboundTag: e.target.value })}
            className="w-full bg-slate-800 border border-slate-600 text-sm text-slate-200 rounded px-2 py-1.5 outline-none focus:border-blue-500"
          >
            {inboundTags.length === 0 && (
              <option value="">No INPUT nodes</option>
            )}
            {inboundTags.map((ib) => (
              <option key={ib.tag} value={ib.tag}>
                {ib.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleRun}
            disabled={inboundTags.length === 0}
            className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium py-1.5 rounded transition-colors"
          >
            Run Simulation
          </button>
          {result && (
            <button
              onClick={handleClear}
              className="px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm py-1.5 rounded transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {!result && (
          <div className="p-4 text-center text-sm text-slate-500">
            Configure traffic parameters and click "Run Simulation" to trace the path through your graph.
          </div>
        )}
        {result && <SimulationResults result={result} onNodeClick={selectNode} />}
      </div>
    </div>
  );
}

function SimulationResults({
  result,
  onNodeClick,
}: {
  result: SimulationResult;
  onNodeClick: (nodeId: string) => void;
}) {
  return (
    <div className="p-4 space-y-3">
      {/* Status */}
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded text-sm ${
          result.success
            ? 'bg-green-500/10 border border-green-500/30 text-green-400'
            : 'bg-red-500/10 border border-red-500/30 text-red-400'
        }`}
      >
        <span className="font-medium">{result.success ? 'Path Found' : 'No Path'}</span>
      </div>

      {/* Path Steps */}
      {result.path.length > 0 && (
        <div className="space-y-0">
          {result.path.map((step, idx) => (
            <div key={`${step.nodeId}-${idx}`}>
              {/* Step */}
              <button
                onClick={() => onNodeClick(step.nodeId)}
                className={`w-full text-left px-3 py-2 rounded border text-xs transition-colors hover:brightness-125 ${
                  nodeTypeBg[step.nodeType] ?? 'bg-slate-800 border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-mono text-[10px] w-4 shrink-0">
                    {idx + 1}.
                  </span>
                  <span className={`font-medium ${nodeTypeColors[step.nodeType] ?? 'text-slate-300'}`}>
                    {step.tag || '(no tag)'}
                  </span>
                </div>
                <div className="text-slate-400 mt-0.5 ml-6">{step.description}</div>
              </button>

              {/* Arrow between steps */}
              {idx < result.path.length - 1 && (
                <div className="flex justify-center py-0.5">
                  <svg width="12" height="16" viewBox="0 0 12 16" className="text-slate-600">
                    <path d="M6 0 L6 12 M2 9 L6 14 L10 9" stroke="currentColor" strokeWidth="1.5" fill="none" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Explanation */}
      <div className="text-xs text-slate-400 bg-slate-800/50 rounded px-3 py-2 border border-slate-700/50">
        <span className="font-medium text-slate-300">Result: </span>
        {result.explanation}
      </div>

      {/* Final destination */}
      {result.finalOutbound && (
        <div className="text-xs text-slate-500">
          Final OUTPUT: <span className="text-slate-300 font-mono">{result.finalOutbound}</span>
        </div>
      )}
    </div>
  );
}
