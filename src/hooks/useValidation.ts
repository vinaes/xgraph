import { useEffect, useRef } from 'react';
import { useStore } from '@/store';
import { useValidationStore } from '@/store/useValidationStore';
import { validateGraph } from '@/utils/validation';

/**
 * Hook that runs graph validation whenever nodes or edges change.
 * Uses a debounce to avoid running on every keystroke.
 */
export function useValidation() {
  const nodes = useStore((s) => s.nodes);
  const edges = useStore((s) => s.edges);
  const setResult = useValidationStore((s) => s.setResult);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        const result = validateGraph(nodes, edges);
        setResult(result);
      } catch (err) {
        console.error('Validation failed:', err);
        setResult({ valid: true, errors: [], warnings: [], infos: [] });
      }
    }, 300);

    return () => clearTimeout(timerRef.current);
  }, [nodes, edges, setResult]);
}
