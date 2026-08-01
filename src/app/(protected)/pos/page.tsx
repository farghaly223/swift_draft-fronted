"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { usePosSessionStore } from "@/stores/posSessionStore";
import { useCartStore } from "@/stores/cartStore";
import { useUIStore } from "@/stores/uiStore";
import { useSessionHeartbeat } from "@/features/pos/hooks/useSessionHeartbeat";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { frappeApi } from "@/lib/api";
import { Button } from "@/components/common/Button";
import { BarcodeScanner } from "@/features/pos/components/BarcodeScanner";
import { ProductGrid } from "@/features/pos/components/ProductGrid";
import { CartPanel } from "@/features/pos/components/CartPanel";
import { PaymentModal } from "@/features/pos/components/PaymentModal";
import { ClosingCashModal } from "@/features/pos/components/ClosingCashModal";
import { ExpenseModal } from "@/features/pos/components/ExpenseModal";
import { formatDateTime, formatCurrency } from "@/lib/formatting";
import { ShoppingCart, Receipt } from "lucide-react";

export default function PosPage() {
  const { fullName } = useAuthStore();
  const { openingEntry, openingTime, openingAmount } = usePosSessionStore();
  const { logout } = useAuth();
  const setLoggingOut = useUIStore((s) => s.setLoggingOut);
  const itemCount = useCartStore((s) => s.getItemCount());

  const [showClosingModal, setShowClosingModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentModes, setPaymentModes] = useState<string[]>(["Cash"]);
  const [expenseAccounts, setExpenseAccounts] = useState<{ name: string; account_name: string }[]>([]);
  const [currency, setCurrency] = useState("USD");

  useSessionHeartbeat();

  useEffect(() => {
    frappeApi.posConfig().then(({ data }) => {
      if (data?.payment_modes?.length) {
        setPaymentModes(data.payment_modes);
      }
      if (data?.expense_accounts?.length) {
        setExpenseAccounts(data.expense_accounts);
      }
      if (data?.currency) {
        setCurrency(data.currency);
      }
    }).catch(() => {});
  }, []);

  const handleShiftClosed = async () => {
    setLoggingOut(true);
    setShowClosingModal(false);
    await logout();
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-2 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-gray-900">SWIFT POS</h1>
          <span className="text-xs text-gray-400 hidden sm:inline">
            {fullName} • {openingEntry}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 hidden md:inline">
            Opened: {openingTime ? formatDateTime(openingTime) : "—"}
          </span>
          <Button variant="secondary" size="sm" onClick={() => setShowExpenseModal(true)}>
            <Receipt className="h-4 w-4" /> Expense
          </Button>
          <Button variant="danger" size="sm" onClick={() => setShowClosingModal(true)}>
            End Shift
          </Button>
        </div>
      </header>

      {/* Main area: product panel + cart */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Search + Products */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="p-3 border-b border-gray-200 bg-white">
            <BarcodeScanner />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search items by name or code..."
              className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div className="flex-1 overflow-y-auto bg-gray-50">
            <ProductGrid searchQuery={searchQuery} />
          </div>
        </div>

        {/* Right: Cart */}
        <div className="w-80 lg:w-96 border-l border-gray-200 bg-gray-50 flex flex-col shrink-0">
          <div className="flex items-center gap-2 px-4 py-3 bg-white border-b border-gray-200">
            <ShoppingCart className="h-4 w-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-700">Cart</h2>
            {itemCount > 0 && (
              <span className="ml-auto bg-primary-600 text-white text-xs font-bold rounded-full px-2 py-0.5">
                {itemCount}
              </span>
            )}
          </div>
          <div className="flex-1 overflow-hidden p-3">
            <CartPanel onCheckout={() => setShowPaymentModal(true)} />
          </div>
        </div>
      </div>

      {/* Modals */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        paymentModes={paymentModes}
      />
      <ClosingCashModal
        isOpen={showClosingModal}
        onClose={() => setShowClosingModal(false)}
        onClosed={handleShiftClosed}
      />
      <ExpenseModal
        isOpen={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        expenseAccounts={expenseAccounts}
        currency={currency}
      />
    </div>
  );
}
