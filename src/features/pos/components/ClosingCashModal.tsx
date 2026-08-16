"use client";

import { useState, FormEvent } from "react";
import { usePosSessionStore } from "@/stores/posSessionStore";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { formatCurrency } from "@/lib/formatting";

interface ClosingCashModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClosed: () => void;
}

export function ClosingCashModal({ isOpen, onClose, onClosed }: ClosingCashModalProps) {
  const { closeSession, error, clearError } = usePosSessionStore();
  const setLoggingOut = useUIStore((s) => s.setLoggingOut);
  const [amount, setAmount] = useState("");
  const [validationError, setValidationError] = useState("");
  const [isClosing, setIsClosing] = useState(false);
  const fullName = useAuthStore((s) => s.fullName);
  const [result, setResult] = useState<{
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
    difference: number;
  } | null>(null);

  const printSummary = () => {
    if (!result) return;
    const money = (value: number) => `${Number(value || 0).toFixed(2)} EGP`;
    const win = window.open("", "swift_shift_closing", "width=420,height=760");
    if (!win) return;
    win.document.write(`<!doctype html><html><head><title>Shift Closing</title><style>@page{size:80mm auto;margin:0}html,body{margin:0;padding:0;width:80mm;font:12px monospace}.receipt{width:72mm;margin:0 auto;padding:3mm 0}.center{text-align:center}.line{border-top:1px dashed #000;margin:6px 0}table{width:100%;border-collapse:collapse}td:last-child{text-align:right}.total{font-size:15px;font-weight:bold}</style></head><body><div class="receipt"><div class="center total">SHIFT CLOSING</div><div class="center">${result.closing_entry}</div><div class="line"></div><table><tr><td>Cashier</td><td>${fullName || ""}</td></tr><tr><td>Invoices</td><td>${result.invoices}</td></tr><tr><td>Items Sold</td><td>${result.items_sold}</td></tr><tr class="total"><td>Total Sales</td><td>${money(result.total_sales)}</td></tr></table><div class="line"></div><b>Payment Summary</b><table><tr><td>Cash</td><td>${money(result.cash_received)}</td></tr><tr><td>InstaPay</td><td>${money(result.instapay_received)}</td></tr>${result.other_payments ? `<tr><td>Other</td><td>${money(result.other_payments)}</td></tr>` : ""}</table><div class="line"></div><table><tr><td>Expenses</td><td>${money(result.total_expenses)}</td></tr><tr><td>Opening Cash</td><td>${money(result.opening_cash)}</td></tr><tr><td>Expected Closing</td><td>${money(result.expected_amount)}</td></tr><tr><td>Actual Closing</td><td>${money(Number(amount))}</td></tr><tr class="total"><td>Difference</td><td>${money(result.difference)}</td></tr></table><div class="line"></div><div class="center">Thank you</div></div><script>window.onload=function(){window.print();window.close()}</script></body></html>`);
    win.document.close();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    setValidationError("");

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      setValidationError("Please enter a valid amount (0 or more).");
      return;
    }

    setIsClosing(true);
    try {
      const data = await closeSession(numAmount);
      setResult(data);
    } catch {
      setIsClosing(false);
    }
  };

  const handleDone = () => {
    setLoggingOut(true);
    printSummary();
    setResult(null);
    setAmount("");
    onClosed();
  };

  if (result) {
    return (
      <Modal isOpen={isOpen} onClose={() => {}} title="Shift Closed" showCloseButton={false} closeOnOverlayClick={false}>
        <div className="space-y-4">
          <div className="rounded-md bg-green-50 border border-green-200 p-4 space-y-2">
            <p className="text-sm text-green-800 font-medium">POS Closing Entry created successfully.</p>
            <p className="text-sm text-green-700">Entry: {result.closing_entry}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="text-gray-500">Expected Cash:</div>
            <div className="text-right font-medium">{formatCurrency(result.expected_amount)}</div>
            {result.total_expenses > 0 && (
              <>
                <div className="text-gray-500">Expenses (deducted):</div>
                <div className="text-right font-medium text-amber-600">−{formatCurrency(result.total_expenses)}</div>
              </>
            )}
            <div className="text-gray-500">Counted Cash:</div>
            <div className="text-right font-medium">{formatCurrency(parseFloat(amount))}</div>
            <div className="text-gray-500 border-t pt-2">Difference:</div>
            <div className={`text-right font-medium border-t pt-2 ${result.difference === 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(result.difference)}
            </div>
          </div>
          <Button variant="primary" size="lg" className="w-full" onClick={handleDone}>
            Done — Log Out
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Close Shift" showCloseButton={true} closeOnOverlayClick={false}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-gray-600">
          Count the cash in the register and enter the total below to close your shift.
        </p>

        <Input
          label="Closing Cash Amount"
          type="number"
          placeholder="0.00"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setValidationError("");
          }}
          error={validationError}
          disabled={isClosing}
          autoFocus
        />

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <Button type="button" variant="secondary" size="lg" className="flex-1" onClick={onClose} disabled={isClosing}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" size="lg" isLoading={isClosing} className="flex-1">
            Close Shift
          </Button>
        </div>
      </form>
    </Modal>
  );
}
