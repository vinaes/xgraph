import { create } from 'zustand';

export interface Toast {
  id: string;
  level: 'error' | 'warning' | 'success' | 'info';
  message: string;
}

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
    // Auto-remove after 4 seconds
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 4000);
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

const levelStyles: Record<string, string> = {
  error: 'bg-red-900/90 border-red-500 text-red-100',
  warning: 'bg-yellow-900/90 border-yellow-500 text-yellow-100',
  success: 'bg-green-900/90 border-green-500 text-green-100',
  info: 'bg-blue-900/90 border-blue-500 text-blue-100',
};

const levelIcons: Record<string, string> = {
  error: '✕',
  warning: '⚠',
  success: '✓',
  info: 'ℹ',
};

function ToastItem({ toast }: { toast: Toast }) {
  const removeToast = useToastStore((s) => s.removeToast);

  return (
    <div
      className={`flex items-start gap-2 px-3 py-2 rounded-lg border shadow-lg text-sm animate-slide-in ${
        levelStyles[toast.level] || levelStyles.info
      }`}
    >
      <span className="font-bold text-xs mt-0.5">{levelIcons[toast.level]}</span>
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={() => removeToast(toast.id)}
        className="text-xs opacity-60 hover:opacity-100 ml-2"
      >
        ✕
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-12 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
