import { useStore } from '@/store';
import { useValidationStore } from '@/store/useValidationStore';

export default function Footer() {
  const nodes = useStore((s) => s.nodes);
  const edges = useStore((s) => s.edges);
  const servers = useStore((s) => s.servers);
  const result = useValidationStore((s) => s.result);

  const errorCount = result.errors.length;
  const warningCount = result.warnings.length;

  let statusDot = 'bg-green-500';
  let statusText = 'Valid';
  if (errorCount > 0) {
    statusDot = 'bg-red-500';
    statusText = `${errorCount} error${errorCount > 1 ? 's' : ''}`;
  } else if (warningCount > 0) {
    statusDot = 'bg-yellow-500';
    statusText = `${warningCount} warning${warningCount > 1 ? 's' : ''}`;
  } else if (nodes.length === 0) {
    statusDot = 'bg-slate-500';
    statusText = 'Empty';
  }

  return (
    <footer className="h-8 bg-slate-900 border-t border-slate-700 flex items-center px-4 gap-4 text-xs text-slate-500 shrink-0">
      <span className="flex items-center gap-1">
        <span className={`w-2 h-2 rounded-full ${statusDot}`} />
        {statusText}
      </span>
      {errorCount > 0 && (
        <span className="text-red-400">{errorCount} error{errorCount > 1 ? 's' : ''}</span>
      )}
      {warningCount > 0 && (
        <span className="text-yellow-400">{warningCount} warning{warningCount > 1 ? 's' : ''}</span>
      )}
      <div className="w-px h-4 bg-slate-700" />
      <span>{nodes.length} nodes</span>
      <span>{edges.length} edges</span>
      {servers.length > 0 && <span>{servers.length} servers</span>}
      <div className="flex-1" />
      <span className="text-slate-600">MADE BY </span>
      <a href="https://vinaes.co" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors font-semibold">
        VINAES.CO
      </a>
      <span className="text-slate-600"> OGs</span>
    </footer>
  );
}
