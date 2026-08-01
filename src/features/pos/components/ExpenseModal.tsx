"use client";

import { useState, FormEvent } from "react";
import { frappeApi } from "@/lib/api";
import { extractFrappeError } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { formatCurrency } from "@/lib/formatting";
import { CheckCircle } from "lucide-react";

interface ExpenseAccount {
  name: string;
  account_name: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  expenseAccounts: ExpenseAccount[];
  currency?: string;
}

interface ExpenseResult {
  payment_entry: string;
  amount: number;
  expense_account: string;
}

export function ExpenseModal({ isOpen, onClose, expenseAccounts, currency = "USD" }: Props) {
  const showToast = useUIStore((s) => s.showToast);
  const [amount, setAmount] = useState("");
  const [expenseAccount, setExpenseAccount] = useState("");
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ExpenseResult | null>(null);

  const reset = () => {
    setAmount("");
    setExpenseAccount("");
    setRemarks("");
    setError("");
    setResult(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError("Enter a valid amount."); return; }
    if (!expenseAccount) { setError("Select an expense account."); return; }

    setIsSubmitting(true);
    try {
      const { data } = await frappeApi.createExpense({
        amount: amt,
        expense_account: expenseAccount,
        remarks: remarks.trim() || undefined,
      });
      setResult(data);
      showToast(`Expense ${data.payment_entry} recorded`, "success");
    } catch (err) {
      setError(extractFrappeError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Post-submit receipt view
  if (result) {
    const accountName = expenseAccounts.find((a) => a.name === result.expense_account)?.account_name || result.expense_account;
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Expense Recorded" maxWidth="sm">
        <div className="text-center space-y-4 py-2">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
          <div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(result.amount, currency)}</p>
            <p className="text-sm text-gray-500 mt-1">{accountName}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
            <p>Payment Entry: <span className="font-mono font-medium">{result.payment_entry}</span></p>
          </div>
          <Button variant="primary" size="lg" className="w-full" onClick={handleClose}>
            Done
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Record Expense" maxWidth="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Amount"
          type="number"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          disabled={isSubmitting}
          autoFocus
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Expense Account</label>
          <select
            value={expenseAccount}
            onChange={(e) => setExpenseAccount(e.target.value)}
            disabled={isSubmitting}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
          >
            <option value="">Select account...</option>
            {expenseAccounts.map((a) => (
              <option key={a.name} value={a.name}>{a.account_name}</option>
            ))}
          </select>
        </div>

        <Input
          label="Remarks (optional)"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="e.g. Office supplies, Cleaning"
          disabled={isSubmitting}
        />

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
        )}

        <div className="flex gap-3">
          <Button type="button" variant="secondary" size="lg" className="flex-1" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="lg" isLoading={isSubmitting} className="flex-1">
            Record Expense
          </Button>
        </div>
      </form>
    </Modal>
  );
}
