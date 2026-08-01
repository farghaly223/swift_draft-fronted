import { create } from "zustand";
import type { ToastType } from "@/types/api";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

interface UIState {
  showOpeningCashModal: boolean;
  isLoggingOut: boolean;
  toasts: Toast[];

  openOpeningCashModal: () => void;
  closeOpeningCashModal: () => void;
  setLoggingOut: (v: boolean) => void;
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

let toastCounter = 0;

export const useUIStore = create<UIState>((set) => ({
  showOpeningCashModal: false,
  isLoggingOut: false,
  toasts: [],

  openOpeningCashModal: () => set({ showOpeningCashModal: true }),
  closeOpeningCashModal: () => set({ showOpeningCashModal: false }),
  setLoggingOut: (v) => set({ isLoggingOut: v }),

  showToast: (message, type = "info", duration = 3000) => {
    const id = `toast-${++toastCounter}`;
    set((state) => ({
      toasts: [...state.toasts, { id, message, type, duration }],
    }));
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));
