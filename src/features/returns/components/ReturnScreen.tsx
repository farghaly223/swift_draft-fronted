"use client";

import { useState, useRef, FormEvent } from "react";
import { frappeApi } from "@/lib/api";
import { useUIStore } from "@/stores/uiStore";
import { extractFrappeError } from "@/lib/utils";
import { Button } from "@/components/common/Button";
import { formatCurrency } from "@/lib/formatting";
import { Search, RotateCcw, ScanLine } from "lucide-react";

interface ReturnItem {
  item_code: string;
  item_name: string;
  uom: string;
  rate: number;
  amount: number;
  discount_amount: number;
  qty_sold: number;
  qty_returned: number;
  remaining_qty: number;
}

interface ReturnInvoice {
  name: string;
  customer: string;
  customer_name: string;
  posting_date: string;
  posting_time: string;
  currency: string;
  net_total: number;
  total_taxes_and_charges: number;
  discount_amount: number;
  grand_total: number;
  items: ReturnItem[];
}

export function ReturnScreen() {
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoice, setInvoice] = useState<ReturnInvoice | null>(null);
  const [qtyToReturn, setQtyToReturn] = useState<Record<string, number>>({});
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const invoiceInputRef = useRef<HTMLInputElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [barcode, setBarcode] = useState("");

  const showToast = useUIStore((s) => s.showToast);

  const loadInvoice = async (e: FormEvent) => {
    e.preventDefault();
    const name = invoiceNo.trim();
    if (!name) return;

    setIsLoading(true);
    try {
      const { data } = await frappeApi.getInvoice(name);
      setInvoice(data);
      setQtyToReturn({});
      setReason("");
      // Barcode scanning only makes sense once an invoice is on screen.
      setTimeout(() => barcodeInputRef.current?.focus(), 0);
    } catch (err) {
      setInvoice(null);
      showToast(extractFrappeError(err), "error");
    } finally {
      setIsLoading(false);
    }
  };

  const setQty = (item: ReturnItem, qty: number) => {
    // Clamp in the UI so the cashier sees the ceiling immediately. The server
    // re-clamps against ERPNext's own remaining qty, which is authoritative.
    const clamped = Math.max(0, Math.min(qty, item.remaining_qty));
    setQtyToReturn((prev) => ({ ...prev, [item.item_code]: clamped }));
  };

  // Scanning resolves against the loaded invoice rather than the item API.
  // item_by_barcode rejects out-of-stock items with a 409 (api.py:480), which is
  // correct when selling but would block returning a sold-out item. The invoice
  // already carries every line that can legally be returned.
  const handleScan = (e: FormEvent) => {
    e.preventDefault();
    const scanned = barcode.trim();
    if (!scanned || !invoice) return;

    const match = invoice.items.find(
      (i) => i.item_code.toLowerCase() === scanned.toLowerCase(),
    );

    if (!match) {
      showToast(`${scanned} is not on invoice ${invoice.name}`, "error");
    } else if (match.remaining_qty <= 0) {
      showToast(`${match.item_name} is already fully returned`, "warning");
    } else {
      const current = qtyToReturn[match.item_code] ?? 0;
      if (current >= match.remaining_qty) {
        showToast(
          `Only ${match.remaining_qty} ${match.uom} of ${match.item_name} can be returned`,
          "warning",
        );
      } else {
        setQty(match, current + 1);
        showToast(`Added ${match.item_name}`, "success", 1500);
      }
    }

    setBarcode("");
    barcodeInputRef.current?.focus();
  };

  const selected = invoice
    ? invoice.items
        .filter((i) => (qtyToReturn[i.item_code] ?? 0) > 0)
        .map((i) => ({ item_code: i.item_code, qty: qtyToReturn[i.item_code] }))
    : [];

  const refundTotal = invoice
    ? invoice.items.reduce(
        (sum, i) => sum + (qtyToReturn[i.item_code] ?? 0) * i.rate,
        0,
      )
    : 0;

  const submitReturn = async () => {
    if (!invoice || selected.length === 0) return;

    setIsSubmitting(true);
    try {
      const { data } = await frappeApi.createReturn(
        invoice.name,
        selected,
        reason.trim() || undefined,
      );
      showToast(`Return ${data.return_invoice} created`, "success");
      // Reset to a clean slate; the invoice's remaining quantities have changed.
      setInvoice(null);
      setInvoiceNo("");
      setQtyToReturn({});
      setReason("");
      invoiceInputRef.current?.focus();
    } catch (err) {
      showToast(extractFrappeError(err), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-100 overflow-hidden">
      {/* Invoice lookup — the only entry point into a return */}
      <div className="bg-white border-b border-gray-200 p-4 shrink-0">
        <form onSubmit={loadInvoice} className="flex gap-2 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              ref={invoiceInputRef}
              type="text"
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
              placeholder="Enter full invoice number or last 5 digits"
              autoFocus
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Load
          </Button>
        </form>
      </div>

      {!invoice ? (
        <div className="flex-1 flex items-center justify-center text-center px-6">
          <div>
            <RotateCcw className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              Enter the invoice number from the customer&apos;s receipt to begin a return.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Returns are accepted within 5 days of purchase.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Invoice header */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-xs text-gray-400">Invoice</div>
                <div className="font-semibold text-gray-900">{invoice.name}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Date</div>
                <div className="text-gray-700">{invoice.posting_date}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Customer</div>
                <div className="text-gray-700">
                  {invoice.customer_name || invoice.customer}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Grand Total</div>
                <div className="font-semibold text-gray-900">
                  {formatCurrency(invoice.grand_total, invoice.currency)}
                </div>
              </div>
            </div>

            {/* Barcode scan */}
            <form onSubmit={handleScan} className="relative">
              <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={barcodeInputRef}
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Scan item barcode to add to return..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </form>

            {/* Items */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Item</th>
                    <th className="text-right px-3 py-2 font-medium">Rate</th>
                    <th className="text-right px-3 py-2 font-medium">Sold</th>
                    <th className="text-right px-3 py-2 font-medium">Returned</th>
                    <th className="text-right px-3 py-2 font-medium">Remaining</th>
                    <th className="text-right px-4 py-2 font-medium w-32">To Return</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoice.items.map((item) => (
                    <tr
                      key={item.item_code}
                      className={item.remaining_qty <= 0 ? "opacity-50" : ""}
                    >
                      <td className="px-4 py-2">
                        <div className="text-gray-900">{item.item_name}</div>
                        <div className="text-xs text-gray-400">{item.item_code}</div>
                      </td>
                      <td className="px-3 py-2 text-right text-gray-600">
                        {formatCurrency(item.rate, invoice.currency)}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-600">
                        {item.qty_sold}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-600">
                        {item.qty_returned}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-gray-900">
                        {item.remaining_qty}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <input
                          type="number"
                          min={0}
                          max={item.remaining_qty}
                          step="any"
                          disabled={item.remaining_qty <= 0}
                          value={qtyToReturn[item.item_code] ?? ""}
                          onChange={(e) =>
                            setQty(item, parseFloat(e.target.value) || 0)
                          }
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Reason + submit */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for return (optional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <div className="flex items-center justify-between gap-4">
                <div className="text-sm text-gray-600">
                  Refund total:{" "}
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(refundTotal, invoice.currency)}
                  </span>
                </div>
                <Button
                  variant="danger"
                  size="lg"
                  disabled={selected.length === 0}
                  isLoading={isSubmitting}
                  onClick={submitReturn}
                >
                  <RotateCcw className="h-4 w-4" /> Process Return
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
