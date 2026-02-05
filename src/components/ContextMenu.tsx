import { useEffect, useRef, useCallback } from 'react';

export interface MenuItem {
  label: string;
  shortcut?: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside or escape
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Adjust position to keep menu in viewport
  const adjustedPosition = useCallback(() => {
    const menu = menuRef.current;
    if (!menu) return { left: x, top: y };

    const rect = menu.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = x;
    let top = y;

    if (x + rect.width > vw) left = vw - rect.width - 8;
    if (y + rect.height > vh) top = vh - rect.height - 8;
    if (left < 0) left = 8;
    if (top < 0) top = 8;

    return { left, top };
  }, [x, y]);

  const pos = adjustedPosition();

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[180px] bg-slate-800 border border-slate-600 rounded-lg shadow-xl py-1 text-sm"
      style={{ left: pos.left, top: pos.top }}
    >
      {items.map((item, i) => {
        if (item.separator) {
          return <div key={i} className="border-t border-slate-700 my-1" />;
        }
        return (
          <button
            key={i}
            onClick={() => {
              if (!item.disabled) {
                item.onClick();
                onClose();
              }
            }}
            disabled={item.disabled}
            className={`w-full text-left px-3 py-1.5 flex items-center justify-between gap-4 transition-colors ${
              item.disabled
                ? 'text-slate-600 cursor-not-allowed'
                : item.danger
                  ? 'text-red-400 hover:bg-red-500/20'
                  : 'text-slate-200 hover:bg-slate-700'
            }`}
          >
            <span>{item.label}</span>
            {item.shortcut && (
              <span className="text-xs text-slate-500">{item.shortcut}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
