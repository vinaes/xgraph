import { create } from 'zustand';
import type { SimulationInput, SimulationResult } from '@/utils/simulation';

interface SimulationState {
  active: boolean;
  input: SimulationInput;
  result: SimulationResult | null;

  setActive: (active: boolean) => void;
  setInput: (input: Partial<SimulationInput>) => void;
  setResult: (result: SimulationResult | null) => void;
  reset: () => void;
}

const defaultInput: SimulationInput = {
  domain: 'example.com',
  protocol: 'tcp',
  port: 443,
  inboundTag: '',
};

export const useSimulationStore = create<SimulationState>()((set) => ({
  active: false,
  input: { ...defaultInput },
  result: null,

  setActive: (active) => set({ active, result: active ? undefined as unknown as SimulationResult | null : null }),
  setInput: (partial) => set((s) => ({ input: { ...s.input, ...partial } })),
  setResult: (result) => set({ result }),
  reset: () => set({ active: false, input: { ...defaultInput }, result: null }),
}));
