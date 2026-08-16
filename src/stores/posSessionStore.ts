import { create } from "zustand";
import { frappeApi } from "@/lib/api";
import { extractFrappeError } from "@/lib/utils";

interface PosSessionState {
  openingEntry: string | null;
  openingTime: string | null;
  openingAmount: number | null;
  isSessionOpen: boolean;
  isChecking: boolean;
  isOpening: boolean;
  error: string | null;

  checkCurrentSession: () => Promise<void>;
  openSession: (amount: number) => Promise<void>;
  closeSession: (closingAmount: number) => Promise<{
    closing_entry: string;
    expected_amount: number;
    total_expenses: number;
    invoices: number;
    items_sold: number;
    total_sales: number;
    cash_received: number;
    instapay_received: number;
    other_payments: number;
    opening_cash: number;
    payment_totals: Record<string, number>;
    difference: number;
  }>;
  clearSession: () => void;
  clearError: () => void;
}

const initialState = {
  openingEntry: null,
  openingTime: null,
  openingAmount: null,
  isSessionOpen: false,
  isChecking: false,
  isOpening: false,
  error: null,
};

export const usePosSessionStore = create<PosSessionState>((set) => ({
  ...initialState,

  checkCurrentSession: async () => {
    set({ isChecking: true, error: null });
    try {
      const { data } = await frappeApi.sessionCurrent();
      if (data.exists) {
        set({
          openingEntry: data.opening_entry!,
          openingTime: data.opening_time!,
          openingAmount: data.opening_amount!,
          isSessionOpen: true,
          isChecking: false,
        });
      } else {
        set({ isSessionOpen: false, isChecking: false });
      }
    } catch (err) {
      set({ isChecking: false, error: extractFrappeError(err) });
    }
  },

  openSession: async (amount) => {
    set({ isOpening: true, error: null });
    try {
      const { data } = await frappeApi.sessionOpen(amount);
      set({
        openingEntry: data.opening_entry,
        openingTime: data.period_start_date,
        openingAmount: amount,
        isSessionOpen: true,
        isOpening: false,
      });
    } catch (err) {
      set({ isOpening: false, error: extractFrappeError(err) });
      throw err;
    }
  },

  closeSession: async (closingAmount) => {
    set({ error: null });
    try {
      const { data } = await frappeApi.sessionClose(closingAmount);
      return {
        closing_entry: data.closing_entry,
        expected_amount: data.expected_amount,
        total_expenses: data.total_expenses,
        invoices: data.invoices,
        items_sold: data.items_sold,
        total_sales: data.total_sales,
        cash_received: data.cash_received,
        instapay_received: data.instapay_received,
        other_payments: data.other_payments,
        opening_cash: data.opening_cash,
        payment_totals: data.payment_totals,
        difference: data.difference,
      };
    } catch (err) {
      set({ error: extractFrappeError(err) });
      throw err;
    }
  },

  clearSession: () => {
    set(initialState);
  },

  clearError: () => {
    set({ error: null });
  },
}));
