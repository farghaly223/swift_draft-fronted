"use client";

import { useState, useEffect, FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCartStore } from "@/stores/cartStore";
import { useUIStore } from "@/stores/uiStore";
import { frappeApi } from "@/lib/api";
import { extractFrappeError } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatting";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/common/Button";
import { env } from "@/config/env";

interface InvoiceResult {
  invoice: string;
  grand_total: number;
  net_total: number;
  taxes: { description: string; tax_amount: number; rate: number }[];
  stock_warnings?: string[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  paymentModes: string[];
}

export function PaymentModal({ isOpen, onClose, paymentModes }: Props) {
  const items = useCartStore((s) => s.items);
  const customer = useCartStore((s) => s.customer);
  const getTotal = useCartStore((s) => s.getTotal);
  const clearCart = useCartStore((s) => s.clearCart);
  const showToast = useUIStore((s) => s.showToast);
  const queryClient = useQueryClient();

  const cartTotal = getTotal();
  const defaultMode = paymentModes[0] || "Cash";

  const [selectedMode, setSelectedMode] = useState(defaultMode);
  const [amountGiven, setAmountGiven] = useState(String(cartTotal.toFixed(2)));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<InvoiceResult | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAmountGiven(String(cartTotal.toFixed(2)));
      setError("");
      setResult(null);
      setSelectedMode(defaultMode);
    }
  }, [isOpen]);

  const grandTotal = result?.grand_total ?? cartTotal;
  const change = Math.max(0, parseFloat(amountGiven || "0") - grandTotal);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const { data } = await frappeApi.createInvoice({
        items: items.map((i) => ({ item_code: i.item_code, qty: i.qty, rate: i.rate })),
        payments: [{ mode_of_payment: selectedMode, amount: cartTotal }],
        customer: customer || undefined,
      });
      setResult(data);
      setAmountGiven(String((data.grand_total).toFixed(2)));
    } catch (err) {
      setError(extractFrappeError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Opens printview in a real window on the Frappe origin, exactly as clicking
  // Print from the desk does. Two things depend on that:
  //
  // 1. Origin. Assets in the letterhead are stored root-relative (/files/...),
  //    so they only resolve when the printing context is the Frappe host. An
  //    iframe inside this app resolved them against localhost:3000 and rendered
  //    a broken image.
  // 2. Viewport width. The browser lays the document out at the window's width
  //    and derives the print scale from that layout. A narrow popup produced a
  //    different scale than Frappe's full-width print page, so the same format
  //    printed at the wrong font and receipt size. Opening at the same size as
  //    the desk print page is what makes the output identical.
  //
  // trigger_print=1 makes Frappe inject window.print() plus a self-close into
  // the document, so the window prints and disappears on its own.
  const printReceipt = (invoiceName: string) => {
    const printUrl = `${env.FRAPPE_URL}/printview?doctype=Sales%20Invoice&name=${encodeURIComponent(invoiceName)}&trigger_print=1&format=Swift&no_letterhead=0`;

    window.open(printUrl, "swift_receipt");
  };

  const handleDone = () => {
    // Print before the modal unmounts, so New Sale both prints and resets.
    if (result) printReceipt(result.invoice);
    clearCart();
    onClose();
    // Stock changed as a result of this sale. Refetching in the background keeps
    // the grid's qty and the disabled/out-of-stock states correct without a
    // full page reload, which would drop the cashier's session state.
    queryClient.invalidateQueries({ queryKey: ["item_search"] });
    showToast("Invoice created successfully", "success");
  };

  if (result) {
    return (
      <Modal isOpen={isOpen} onClose={handleDone} title="Payment Complete" maxWidth="sm">
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <p className="text-green-800 font-semibold text-lg">Payment Received</p>
            <p className="text-green-600 text-sm mt-1">{result.invoice}</p>
          </div>

          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Net Total</span>
              <span>{formatCurrency(result.net_total)}</span>
            </div>
            {result.taxes.map((t, i) => (
              <div key={i} className="flex justify-between text-gray-600">
                <span>{t.description} ({t.rate}%)</span>
                <span>{formatCurrency(t.tax_amount)}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold text-base border-t pt-2 mt-2">
              <span>Grand Total</span>
              <span className="text-primary-600">{formatCurrency(result.grand_total)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Amount Given</span>
              <span>{formatCurrency(parseFloat(amountGiven))}</span>
            </div>
            {change > 0 && (
              <div className="flex justify-between font-semibold text-green-700 bg-green-50 rounded px-2 py-1">
                <span>Change</span>
                <span>{formatCurrency(change)}</span>
              </div>
            )}
          </div>

          {result.stock_warnings && result.stock_warnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-amber-800 text-xs font-semibold mb-1">⚠ Low Stock Warning</p>
              {result.stock_warnings.map((w, i) => (
                <p key={i} className="text-amber-700 text-xs">{w}</p>
              ))}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button variant="primary" size="lg" className="flex-1" onClick={handleDone}>
              New Sale
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Payment" maxWidth="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-3 space-y-1 max-h-40 overflow-y-auto">
          {items.map((item) => (
            <div key={item.item_code} className="flex justify-between text-sm">
              <span className="text-gray-700">{item.item_name} × {item.qty}</span>
              <span className="font-medium">{formatCurrency(item.rate * item.qty)}</span>
            </div>
          ))}
        </div>

        <div className="flex justify-between text-lg font-bold border-t pt-2">
          <span>Cart Total</span>
          <span className="text-primary-600">{formatCurrency(cartTotal)}</span>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
          <div className="flex gap-2 flex-wrap">
            {paymentModes.map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setSelectedMode(mode)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                  selectedMode === mode
                    ? "bg-primary-600 text-white border-primary-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount Given</label>
          <input
            type="number"
            min={cartTotal}
            step="0.01"
            value={amountGiven}
            onChange={(e) => setAmountGiven(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500"
            autoFocus
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" size="lg" className="flex-1" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="lg" isLoading={isSubmitting} className="flex-1">
            Confirm Payment
          </Button>
        </div>
      </form>
    </Modal>
  );
}
