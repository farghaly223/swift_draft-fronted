"use client";

import { useCartStore } from "@/stores/cartStore";
import { useUIStore } from "@/stores/uiStore";
import { formatCurrency } from "@/lib/formatting";
import { Button } from "@/components/common/Button";
import { Trash2, Plus, Minus } from "lucide-react";

interface Props {
  onCheckout: () => void;
}

export function CartPanel({ onCheckout }: Props) {
  const items = useCartStore((s) => s.items);
  const updateQty = useCartStore((s) => s.updateQty);
  const updateRate = useCartStore((s) => s.updateRate);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);
  const getTotal = useCartStore((s) => s.getTotal);
  const showToast = useUIStore((s) => s.showToast);

  const total = getTotal();

  if (items.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          Cart is empty
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {items.map((item) => (
          <div key={item.item_code} className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="flex justify-between items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{item.item_name}</p>
                <p className="text-xs text-gray-400">{item.item_code}</p>
                <p className="text-sm font-semibold text-primary-600 mt-0.5">
                  {formatCurrency(item.rate)} × {item.qty} = {formatCurrency(item.rate * item.qty)}
                </p>
              </div>
              <button
                onClick={() => removeItem(item.item_code)}
                className="text-gray-300 hover:text-red-500 transition-colors p-1"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2">
              <label
                htmlFor={`rate-${item.item_code}`}
                className="block text-xs font-medium text-gray-500 mb-1"
              >
                Unit price for this sale
                {item.minimum_rate > 0 && (
                  <span className="font-normal"> (minimum {formatCurrency(item.minimum_rate)})</span>
                )}
              </label>
              <input
                id={`rate-${item.item_code}`}
                type="number"
                min={Math.max(0.01, item.minimum_rate)}
                step="0.01"
                defaultValue={item.rate}
                onBlur={(event) => {
                  const rate = Number(event.target.value);
                  if (rate < item.minimum_rate) {
                    event.target.value = String(item.rate);
                    showToast(
                      `Price cannot be below ${formatCurrency(item.minimum_rate)}`,
                      "warning",
                    );
                    return;
                  }
                  if (!updateRate(item.item_code, rate)) {
                    event.target.value = String(item.rate);
                    showToast("Unit price must be greater than zero", "warning");
                  }
                }}
                className="w-full h-9 rounded-md border border-gray-300 px-2 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => updateQty(item.item_code, item.qty - 1)}
                className="w-7 h-7 rounded-md border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-8 text-center text-sm font-medium">{item.qty}</span>
              <button
                disabled={item.qty >= item.stock_qty}
                onClick={() => {
                  if (!updateQty(item.item_code, item.qty + 1)) {
                    showToast(
                      `Only ${item.stock_qty} ${item.uom} of ${item.item_name} in stock`,
                      "warning",
                    );
                  }
                }}
                className="w-7 h-7 rounded-md border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                <Plus className="h-3 w-3" />
              </button>
              <span className="text-xs text-gray-400 ml-1">
                {item.stock_qty} in stock
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-200 pt-3 mt-3 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-base font-semibold text-gray-700">Total</span>
          <span className="text-xl font-bold text-primary-600">{formatCurrency(total)}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={clearCart} className="flex-1 text-gray-500">
            Clear
          </Button>
          <Button variant="primary" size="md" onClick={onCheckout} className="flex-2 flex-1">
            Charge {formatCurrency(total)}
          </Button>
        </div>
      </div>
    </div>
  );
}
