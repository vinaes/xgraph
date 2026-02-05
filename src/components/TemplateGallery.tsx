import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from '@/store';
import {
  allTemplates,
  templateCategories,
  getDifficultyColor,
  type Template,
  type TemplateCategory,
} from '@/utils/templates';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useToastStore } from '@/components/ToastContainer';

const categoryColors: Record<TemplateCategory, string> = {
  Basic: 'border-green-500/30',
  Routing: 'border-blue-500/30',
  Infrastructure: 'border-purple-500/30',
  Advanced: 'border-orange-500/30',
};

const categoryIcons: Record<TemplateCategory, string> = {
  Basic: 'B',
  Routing: 'R',
  Infrastructure: 'I',
  Advanced: 'A',
};

interface TemplateGalleryProps {
  open: boolean;
  onClose: () => void;
}

export default function TemplateGallery({ open, onClose }: TemplateGalleryProps) {
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'All'>('All');
  const [preview, setPreview] = useState<Template | null>(null);
  const [confirmApply, setConfirmApply] = useState<Template | null>(null);
  const nodes = useStore((s) => s.nodes);

  const filteredTemplates =
    selectedCategory === 'All'
      ? allTemplates
      : allTemplates.filter((t) => t.category === selectedCategory);

  const applyTemplate = useCallback(
    (template: Template) => {
      try {
        const store = useStore.getState();

        // Map placeholder IDs to real UUIDs
        const idMap = new Map<string, string>();
        template.nodes.forEach((n) => {
          idMap.set(n.id, uuidv4());
        });

        // Offset positions to not overlap existing nodes
        const offsetX = nodes.length > 0 ? 100 : 0;
        const offsetY = nodes.length > 0 ? 100 : 0;

        // Create nodes with real IDs
        const newNodes = template.nodes.map((n) => ({
          id: idMap.get(n.id)!,
          type: n.type,
          position: { x: n.position.x + offsetX, y: n.position.y + offsetY },
          data: JSON.parse(JSON.stringify(n.data)),
        }));

        // Create edges with real IDs
        const newEdges = template.edges.map((e) => ({
          id: uuidv4(),
          source: idMap.get(e.source)!,
          target: idMap.get(e.target)!,
          type: e.type || 'default',
        }));

        // Add all nodes and edges
        newNodes.forEach((node) => store.addNode(node));
        newEdges.forEach((edge) => {
          store.onConnect({
            source: edge.source,
            target: edge.target,
            sourceHandle: null,
            targetHandle: null,
          });
          // Set edge type if conditional
          if (edge.type === 'conditional') {
            const state = useStore.getState();
            const createdEdge = state.edges[state.edges.length - 1];
            if (createdEdge) {
              store.updateEdgeData(createdEdge.id, {}, 'conditional');
            }
          }
        });

        setPreview(null);
        onClose();
        useToastStore.getState().addToast({ level: 'success', message: `Applied "${template.name}" template` });
      } catch (err) {
        useToastStore.getState().addToast({
          level: 'error',
          message: `Template failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        });
      }
    },
    [nodes, onClose]
  );

  const handleApply = useCallback(
    (template: Template) => {
      if (nodes.length > 0) {
        setConfirmApply(template);
      } else {
        applyTemplate(template);
      }
    },
    [nodes, applyTemplate]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-[720px] max-h-[80vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div>
            <h2 className="text-lg font-semibold text-white">Templates</h2>
            <p className="text-xs text-slate-400 mt-0.5">Pre-built graph configurations for common use cases</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg leading-none"
          >
            x
          </button>
        </div>

        {/* Category filter */}
        <div className="flex gap-1 px-5 pt-3 pb-2">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              selectedCategory === 'All'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All ({allTemplates.length})
          </button>
          {templateCategories.map((cat) => {
            const count = allTemplates.filter((t) => t.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>

        {/* Template grid */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          <div className="grid grid-cols-2 gap-3">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onPreview={() => setPreview(template)}
                onApply={() => handleApply(template)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Preview dialog */}
      {preview && (
        <TemplatePreview
          template={preview}
          onClose={() => setPreview(null)}
          onApply={() => handleApply(preview)}
        />
      )}

      {/* Confirm apply when nodes exist */}
      <ConfirmDialog
        open={confirmApply !== null}
        title="Apply Template"
        message="Template nodes will be added to your existing graph. Continue?"
        confirmLabel="Apply Template"
        onConfirm={() => {
          if (confirmApply) applyTemplate(confirmApply);
          setConfirmApply(null);
        }}
        onCancel={() => setConfirmApply(null)}
      />
    </div>
  );
}

function TemplateCard({
  template,
  onPreview,
  onApply,
}: {
  template: Template;
  onPreview: () => void;
  onApply: () => void;
}) {
  const diffColor = getDifficultyColor(template.difficulty);

  return (
    <div
      className={`bg-slate-800 border ${categoryColors[template.category]} rounded-lg p-3 hover:border-slate-500 transition-colors cursor-pointer group`}
      onClick={onPreview}
    >
      {/* Mini preview */}
      <div className="h-16 bg-slate-900/50 rounded mb-2 flex items-center justify-center relative overflow-hidden">
        <MiniGraph template={template} />
        <div className="absolute top-1 right-1">
          <span className="text-[10px] font-bold text-slate-600">
            {categoryIcons[template.category]}
          </span>
        </div>
      </div>

      {/* Info */}
      <h3 className="text-sm font-medium text-slate-200 mb-0.5">{template.name}</h3>
      <p className="text-xs text-slate-400 line-clamp-2 mb-2">{template.description}</p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${diffColor}`}>
          {template.difficulty}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onApply();
          }}
          className="text-xs text-blue-400 hover:text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          Apply
        </button>
      </div>
    </div>
  );
}

/** Tiny SVG representation of template graph */
function MiniGraph({ template }: { template: Template }) {
  // Compute bounds
  const nodes = template.nodes;
  if (nodes.length === 0) return null;

  const minX = Math.min(...nodes.map((n) => n.position.x));
  const maxX = Math.max(...nodes.map((n) => n.position.x));
  const minY = Math.min(...nodes.map((n) => n.position.y));
  const maxY = Math.max(...nodes.map((n) => n.position.y));

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const padding = 12;
  const svgW = 200;
  const svgH = 48;

  const nodeColors: Record<string, string> = {
    inbound: '#22c55e',
    routing: '#3b82f6',
    balancer: '#a855f7',
    'outbound-terminal': '#ef4444',
    'outbound-proxy': '#f97316',
  };

  const scale = (x: number, y: number) => ({
    cx: padding + ((x - minX) / rangeX) * (svgW - 2 * padding),
    cy: padding + ((y - minY) / rangeY) * (svgH - 2 * padding),
  });

  return (
    <svg width={svgW} height={svgH} className="text-slate-600">
      {/* Edges */}
      {template.edges.map((edge, i) => {
        const src = nodes.find((n) => n.id === edge.source);
        const tgt = nodes.find((n) => n.id === edge.target);
        if (!src || !tgt) return null;
        const s = scale(src.position.x, src.position.y);
        const t = scale(tgt.position.x, tgt.position.y);
        return (
          <line
            key={i}
            x1={s.cx}
            y1={s.cy}
            x2={t.cx}
            y2={t.cy}
            stroke="#475569"
            strokeWidth={1}
            strokeDasharray={edge.type === 'conditional' ? '3,2' : undefined}
          />
        );
      })}
      {/* Nodes */}
      {nodes.map((node) => {
        const pos = scale(node.position.x, node.position.y);
        return (
          <circle
            key={node.id}
            cx={pos.cx}
            cy={pos.cy}
            r={4}
            fill={nodeColors[node.type] || '#64748b'}
            opacity={0.8}
          />
        );
      })}
    </svg>
  );
}

function TemplatePreview({
  template,
  onClose,
  onApply,
}: {
  template: Template;
  onClose: () => void;
  onApply: () => void;
}) {
  const diffColor = getDifficultyColor(template.difficulty);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-slate-800 border border-slate-600 rounded-lg shadow-2xl w-[480px] mx-4">
        {/* Preview graph */}
        <div className="h-32 bg-slate-900 rounded-t-lg flex items-center justify-center border-b border-slate-700">
          <MiniGraph template={template} />
        </div>

        <div className="p-5">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-white">{template.name}</h3>
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${diffColor}`}>
              {template.difficulty}
            </span>
          </div>
          <p className="text-sm text-slate-400 mb-4">{template.description}</p>

          {/* Tags */}
          <div className="flex flex-wrap gap-1 mb-4">
            {template.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* What will be created */}
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              What will be created
            </h4>
            <ul className="space-y-1">
              {template.summary.map((line, i) => (
                <li key={i} className="text-sm text-slate-400 flex items-start gap-2">
                  <span className="text-slate-500 mt-0.5">-</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Stats */}
          <div className="flex gap-4 mb-5 text-xs text-slate-500">
            <span>{template.nodes.length} nodes</span>
            <span>{template.edges.length} edges</span>
            <span>{template.category}</span>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onApply}
              className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-500 rounded transition-colors"
            >
              Apply Template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
