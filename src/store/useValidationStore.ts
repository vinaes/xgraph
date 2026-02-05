import { create } from 'zustand';
import type { ValidationResult } from '@/utils/validation';

interface ValidationState {
  result: ValidationResult;
  setResult: (result: ValidationResult) => void;
}

const emptyResult: ValidationResult = {
  valid: true,
  errors: [],
  warnings: [],
  infos: [],
};

export const useValidationStore = create<ValidationState>()((set) => ({
  result: emptyResult,
  setResult: (result) => set({ result }),
}));
