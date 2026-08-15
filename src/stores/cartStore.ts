import { create } from "zustand";
import type { CartItem } from "@/types/cart";

interface CartState {
  items: CartItem[];
  customer: string | null;

  addItem: (item: Omit<CartItem, "qty"> & { qty?: number }) => boolean;
  updateQty: (item_code: string, qty: number) => boolean;
  updateRate: (item_code: string, rate: number) => boolean;
  removeItem: (item_code: string) => void;
  clearCart: () => void;
  setCustomer: (customer: string | null) => void;

  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customer: null,

  // Returns false when the requested qty exceeds stock, so the caller can show
  // a message. The backend enforces this too; this is the immediate feedback.
  addItem: (item) => {
    const state = get();
    const existing = state.items.find((i) => i.item_code === item.item_code);
    const available = item.stock_qty;
    const wanted = (existing?.qty ?? 0) + (item.qty || 1);

    if (available <= 0 || wanted > available) return false;

    if (existing) {
      set({
        items: state.items.map((i) =>
          i.item_code === item.item_code ? { ...i, qty: wanted } : i
        ),
      });
    } else {
      set({ items: [...state.items, { ...item, qty: item.qty || 1 }] });
    }
    return true;
  },

  updateQty: (item_code, qty) => {
    const state = get();
    if (qty <= 0) {
      set({ items: state.items.filter((i) => i.item_code !== item_code) });
      return true;
    }

    const line = state.items.find((i) => i.item_code === item_code);
    if (line && qty > line.stock_qty) return false;

    set({
      items: state.items.map((i) =>
        i.item_code === item_code ? { ...i, qty } : i
      ),
    });
    return true;
  },

  updateRate: (item_code, rate) => {
    if (!Number.isFinite(rate) || rate <= 0) return false;

    set((state) => ({
      items: state.items.map((item) =>
        item.item_code === item_code ? { ...item, rate } : item
      ),
    }));
    return true;
  },

  removeItem: (item_code) => {
    set((state) => ({
      items: state.items.filter((i) => i.item_code !== item_code),
    }));
  },

  clearCart: () => set({ items: [], customer: null }),

  setCustomer: (customer) => set({ customer }),

  getTotal: () => get().items.reduce((sum, i) => sum + i.rate * i.qty, 0),

  getItemCount: () => get().items.reduce((sum, i) => sum + i.qty, 0),
}));
