"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, CalendarDays, CircleDollarSign, LogOut, Package, Plus, Printer, RefreshCw, Search, Wallet, X } from "lucide-react";
import { frappeApi } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { Button } from "@/components/common/Button";
import { formatCurrency } from "@/lib/formatting";
import { ManagerExpenseManagement } from "@/features/pos/components/ManagerExpenseManagement";
import { EmployeeCustomerPermissions } from "@/features/pos/components/EmployeeCustomerPermissions";

type Cashier = { cashier: string; invoices: number; items: number; sales: number; received: number };
type Invoice = { name: string; posting_time?: string; customer?: string; cashier: string; grand_total: number; paid_amount: number; status: string };
type OutOfStockItem = { item_code: string; item_name: string; qty: number };
type InvoiceDetail = Invoice & { posting_date: string; customer_name?: string; currency: string; total_qty: number; net_total: number; total_taxes_and_charges: number; discount_amount: number; outstanding_amount: number; remarks?: string; is_return: number; return_against?: string; items: Array<{ item_code: string; item_name: string; qty: number; uom: string; rate: number; discount_percentage: number; amount: number; warehouse?: string }>; payments: Array<{ mode_of_payment: string; amount: number }>; taxes: Array<{ description: string; rate: number; tax_amount: number }> };
type Summary = {
  sales: { total: number; returns: number; net: number; items: number; invoices: number; received: number };
  profit: { revenue: number; cogs: number; operating_expenses: number; net_profit: number; margin: number };
  monthly: { sales: number; items: number; invoices: number; received: number; profit?: { revenue: number; cogs: number; operating_expenses: number; net_profit: number } };
  expenses: number;
  inventory: { value: number; items: number; qty: number };
  stock_movement: { entered: number; left: number; value_difference: number };
  cashiers: Cashier[];
  monthly_cashiers: Array<{ cashier: string; invoices: number; sales: number; received: number }>;
  invoices: Invoice[];
  out_of_stock: OutOfStockItem[];
};

const today = () => new Date().toISOString().slice(0, 10);

function InvoiceLookup() {
  const [query, setQuery] = useState("");
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function searchInvoice(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await frappeApi.managerGetInvoice(query.trim());
      setInvoice(data);
    } catch {
      setInvoice(null);
      setError("Invoice not found. Enter the full number or exactly the last five digits.");
    } finally {
      setLoading(false);
    }
  }

  return <section className="rounded-lg border bg-white p-5"><h2 className="mb-3 font-semibold">Find an invoice</h2><form onSubmit={searchInvoice} className="flex flex-wrap gap-2"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Full invoice number or last 5 digits" className="min-w-64 flex-1 rounded border px-3 py-2 text-sm" maxLength={140} /><Button type="submit" disabled={loading}><Search className="h-4 w-4" /> {loading ? "Searching..." : "Search"}</Button></form>{error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    {invoice && <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"><div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl"><div className="mb-5 flex items-start justify-between gap-3"><div><p className="text-xs uppercase text-slate-500">Sales invoice</p><h2 className="text-xl font-bold">{invoice.name}</h2><p className="text-sm text-slate-500">{invoice.posting_date} {invoice.posting_time} · {invoice.status}{invoice.is_return ? " · Return" : ""}</p></div><Button variant="secondary" size="sm" onClick={() => setInvoice(null)} title="Close"><X className="h-4 w-4" /></Button></div><div className="grid gap-3 rounded border bg-slate-50 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4"><div><span className="text-slate-500">Customer</span><p className="font-medium">{invoice.customer_name || invoice.customer}</p></div><div><span className="text-slate-500">Cashier</span><p className="font-medium">{invoice.cashier}</p></div><div><span className="text-slate-500">Total quantity</span><p className="font-medium">{invoice.total_qty}</p></div><div><span className="text-slate-500">Grand total</span><p className="font-medium">{formatCurrency(invoice.grand_total, invoice.currency)}</p></div>{invoice.return_against && <div><span className="text-slate-500">Return against</span><p className="font-medium">{invoice.return_against}</p></div>}</div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="border-b text-xs uppercase text-slate-500"><tr><th className="px-2 py-3">Item</th><th className="px-2 py-3 text-right">Quantity</th><th className="px-2 py-3">UOM</th><th className="px-2 py-3 text-right">Rate</th><th className="px-2 py-3 text-right">Discount</th><th className="px-2 py-3 text-right">Amount</th></tr></thead><tbody>{invoice.items.map((item, index) => <tr key={`${item.item_code}-${index}`} className="border-b"><td className="px-2 py-3"><strong>{item.item_name}</strong><p className="text-xs text-slate-500">{item.item_code}</p></td><td className="px-2 py-3 text-right">{item.qty}</td><td className="px-2 py-3">{item.uom}</td><td className="px-2 py-3 text-right">{formatCurrency(item.rate, invoice.currency)}</td><td className="px-2 py-3 text-right">{item.discount_percentage}%</td><td className="px-2 py-3 text-right">{formatCurrency(item.amount, invoice.currency)}</td></tr>)}</tbody></table></div><div className="mt-5 grid gap-5 sm:grid-cols-2"><div><h3 className="mb-2 font-semibold">Payments</h3>{invoice.payments.length ? invoice.payments.map((payment, index) => <div key={`${payment.mode_of_payment}-${index}`} className="flex justify-between border-b py-2 text-sm"><span>{payment.mode_of_payment}</span><strong>{formatCurrency(payment.amount, invoice.currency)}</strong></div>) : <p className="text-sm text-slate-500">No payment rows recorded.</p>}</div><div className="space-y-2 text-sm"><div className="flex justify-between"><span>Net total</span><strong>{formatCurrency(invoice.net_total, invoice.currency)}</strong></div><div className="flex justify-between"><span>Taxes</span><strong>{formatCurrency(invoice.total_taxes_and_charges, invoice.currency)}</strong></div><div className="flex justify-between"><span>Discount</span><strong>{formatCurrency(invoice.discount_amount, invoice.currency)}</strong></div><div className="flex justify-between border-t pt-2 text-base"><span>Grand total</span><strong>{formatCurrency(invoice.grand_total, invoice.currency)}</strong></div><div className="flex justify-between"><span>Paid</span><strong>{formatCurrency(invoice.paid_amount, invoice.currency)}</strong></div><div className="flex justify-between"><span>Outstanding</span><strong>{formatCurrency(invoice.outstanding_amount, invoice.currency)}</strong></div></div></div>{invoice.remarks && <div className="mt-5 rounded border p-3 text-sm"><span className="text-slate-500">Remarks</span><p>{invoice.remarks}</p></div>}</div></div>}
  </section>;
}

function CustomerManagement() {
  const [query, setQuery] = useState("");
  const [customers, setCustomers] = useState<Array<{ name: string; customer_name: string; mobile_no?: string; custom_governorate?: string; invoice_count?: number; total_purchases?: number; last_invoice_date?: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function search(e: React.FormEvent) { e.preventDefault(); setLoading(true); try { const { data } = await frappeApi.managerCustomerSearch(query); setCustomers(data.customers || []); } finally { setLoading(false); } }
  async function exportCustomers() { setExporting(true); setError(null); try { const response = await frappeApi.managerExportCustomers(); const blob = response.data instanceof Blob ? response.data : new Blob([response.data]); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `customers_backup_${new Date().toISOString().slice(0, 7)}.xlsx`; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url); } catch { setError("Unable to export customers. Please try again."); } finally { setExporting(false); } }
  return <section className="rounded-lg border bg-white p-5"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">Customers</h2><Button variant="secondary" size="sm" onClick={exportCustomers} isLoading={exporting}>Export Customers</Button></div>{error && <p className="mb-3 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</p>}<form onSubmit={search} className="mb-4 flex gap-2"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search mobile, customer ID, or name" className="min-w-0 flex-1 rounded border px-3 py-2 text-sm" /><Button type="submit" isLoading={loading}><Search className="h-4 w-4" /> Search</Button></form>{customers.length ? <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b text-xs uppercase text-slate-500"><tr><th className="px-2 py-3">Customer</th><th className="px-2 py-3">Mobile</th><th className="px-2 py-3">Governorate</th><th className="px-2 py-3 text-right">Invoices</th><th className="px-2 py-3 text-right">Total purchases</th><th className="px-2 py-3">Last invoice</th></tr></thead><tbody>{customers.map((customer) => <tr key={customer.name} className="border-b last:border-0"><td className="px-2 py-3"><strong>{customer.customer_name}</strong><p className="text-xs text-slate-500">{customer.name}</p></td><td className="px-2 py-3">{customer.mobile_no || "-"}</td><td className="px-2 py-3">{customer.custom_governorate || "-"}</td><td className="px-2 py-3 text-right">{customer.invoice_count || 0}</td><td className="px-2 py-3 text-right">{formatCurrency(customer.total_purchases || 0, "EGP")}</td><td className="px-2 py-3">{customer.last_invoice_date || "-"}</td></tr>)}</tbody></table></div> : <p className="text-sm text-slate-500">Search to view customers.</p>}</section>;
}

function ManagerDetails({ summary }: { summary: Summary }) {
  return <div className="space-y-6">
    <CustomerManagement />
    <InvoiceLookup />
    <section className="rounded-lg border bg-white p-5"><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Monthly sales by cashier</h2><span className="text-sm text-slate-500">Month to selected date</span></div>{summary.monthly_cashiers?.length ? <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="border-b text-xs uppercase text-slate-500"><tr><th className="px-2 py-3">Cashier</th><th className="px-2 py-3 text-right">Invoices</th><th className="px-2 py-3 text-right">Total sales</th><th className="px-2 py-3 text-right">Money received</th></tr></thead><tbody>{summary.monthly_cashiers.map((cashier) => <tr key={cashier.cashier} className="border-b last:border-0"><td className="px-2 py-3 font-medium">{cashier.cashier}</td><td className="px-2 py-3 text-right">{cashier.invoices}</td><td className="px-2 py-3 text-right font-semibold">{formatCurrency(cashier.sales, "EGP")}</td><td className="px-2 py-3 text-right">{formatCurrency(cashier.received, "EGP")}</td></tr>)}</tbody></table></div> : <p className="text-sm text-slate-500">No submitted cashier sales for this month.</p>}</section>
    <section className="rounded-lg border bg-white p-5"><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Sales invoices</h2><span className="text-sm text-slate-500">{summary.invoices?.length ?? 0} submitted invoices</span></div>{summary.invoices?.length ? <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="border-b text-xs uppercase text-slate-500"><tr><th className="px-2 py-3">Invoice</th><th className="px-2 py-3">Time</th><th className="px-2 py-3">Customer</th><th className="px-2 py-3">Cashier</th><th className="px-2 py-3 text-right">Total</th><th className="px-2 py-3 text-right">Paid</th><th className="px-2 py-3">Status</th></tr></thead><tbody>{summary.invoices.map((invoice) => <tr key={invoice.name} className="border-b last:border-0"><td className="px-2 py-3 font-medium">{invoice.name}</td><td className="px-2 py-3">{invoice.posting_time || "-"}</td><td className="px-2 py-3">{invoice.customer || "Walk-in customer"}</td><td className="px-2 py-3">{invoice.cashier}</td><td className="px-2 py-3 text-right">{formatCurrency(invoice.grand_total, "EGP")}</td><td className="px-2 py-3 text-right">{formatCurrency(invoice.paid_amount, "EGP")}</td><td className="px-2 py-3">{invoice.status}</td></tr>)}</tbody></table></div> : <p className="text-sm text-slate-500">No submitted sales invoices for this date.</p>}</section>
    <section className="rounded-lg border bg-white p-5"><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Out of stock</h2><span className="text-sm text-slate-500">{summary.out_of_stock?.length ?? 0} items</span></div>{summary.out_of_stock?.length ? <div className="overflow-x-auto"><table className="w-full min-w-[500px] text-left text-sm"><thead className="border-b text-xs uppercase text-slate-500"><tr><th className="px-2 py-3">Item code</th><th className="px-2 py-3">Item name</th><th className="px-2 py-3 text-right">Available quantity</th></tr></thead><tbody>{summary.out_of_stock.map((item) => <tr key={item.item_code} className="border-b last:border-0"><td className="px-2 py-3 font-medium">{item.item_code}</td><td className="px-2 py-3">{item.item_name}</td><td className="px-2 py-3 text-right text-red-700">{item.qty}</td></tr>)}</tbody></table></div> : <p className="text-sm text-slate-500">All active stock items have quantity available.</p>}</section>
  </div>;
}

export default function ManagerPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const role = useAuthStore((s) => s.role);
  const [date, setDate] = useState(today());
  const [endDate, setEndDate] = useState(today());
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userOpen, setUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({ full_name: "", email: "", phone: "", password: "", user_type: "cashier" as "cashier" | "storekeeper" });
  const [credentials, setCredentials] = useState<{ user: string } | null>(null);
  const [users, setUsers] = useState<Array<{ email: string; full_name: string; phone: string; role_profile_name: string; custom_customer_search_access?: number }>>([]);
  const [editUser, setEditUser] = useState<{ current_email: string; email: string; password: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await frappeApi.managerDashboardSummary(date, endDate);
      setSummary(data);
    } catch {
      setError("Unable to load the manager summary.");
    } finally {
      setLoading(false);
    }
  }, [date, endDate]);

  useEffect(() => { if (role === "swift manager") load(); }, [load, role]);

  const cards = useMemo(() => summary ? [
    ["Today's Net Sales", summary.sales.net, CircleDollarSign],
    ["Money Received", summary.sales.received, Wallet],
    ["Expenses", summary.expenses, CircleDollarSign],
    ["Net Profit", summary.profit.net_profit, BarChart3],
    ["Inventory Value", summary.inventory.value, Package],
    ["Items Sold", summary.sales.items, Package],
  ] as const : [], [summary]);

  if (role !== "swift manager") return null;

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const { data } = await frappeApi.managerCreateUser(newUser);
      setCredentials(data);
      setNewUser({ full_name: "", email: "", phone: "", password: "", user_type: "cashier" });
      const list = await frappeApi.managerListUsers();
      setUsers(list.data);
    } catch {
      setError("Unable to create the user. Check the phone number and try again.");
    }
  }

  async function openUsers() {
    setError(null);
    try { const { data } = await frappeApi.managerListUsers(); setUsers(data); setUserOpen(true); setCredentials(null); }
    catch { setError("Unable to load users."); }
  }

  async function updateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser) return;
    try {
      await frappeApi.managerUpdateUser(editUser);
      setEditUser(null);
      const { data } = await frappeApi.managerListUsers();
      setUsers(data);
    } catch { setError("Unable to update this user."); }
  }

  return <main className="min-h-screen bg-slate-50 text-slate-900">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-white px-6 py-4">
      <div><p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Swift Manager</p><h1 className="text-2xl font-bold">Business overview</h1></div>
      <div className="flex flex-wrap items-center gap-2"><CalendarDays className="h-4 w-4 text-slate-500" /><input aria-label="From date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded border px-3 py-2 text-sm" /><input aria-label="To date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded border px-3 py-2 text-sm" /><Button variant="secondary" size="sm" onClick={load}><RefreshCw className="h-4 w-4" /> Refresh</Button><Button variant="secondary" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print period</Button><Button size="sm" onClick={openUsers}><Plus className="h-4 w-4" /> Manage users</Button><Button variant="danger" size="sm" onClick={logout}><LogOut className="h-4 w-4" /> Logout</Button></div>
    </header>
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <ManagerExpenseManagement onCreated={load} />
      <EmployeeCustomerPermissions />
      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <section><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Selected day</h2><span className="text-sm text-slate-500">{date === today() ? "Today" : date}</span></div><div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">{cards.map(([label, value, Icon]) => <div key={label} className="rounded-lg border bg-white p-4 shadow-sm"><Icon className="mb-3 h-5 w-5 text-emerald-600" /><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-xl font-bold">{loading ? "..." : label === "Items Sold" ? value : formatCurrency(value, "EGP")}</p></div>)}</div></section>
      {summary && <section className="rounded-lg border bg-white p-5"><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Profit performance</h2><span className="text-sm text-slate-500">ERPNext accounting data</span></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"><div><p className="text-xs text-slate-500">Revenue</p><p className="text-xl font-bold">{formatCurrency(summary.profit.revenue, "EGP")}</p></div><div><p className="text-xs text-slate-500">Returns</p><p className="text-xl font-bold text-amber-700">-{formatCurrency(summary.sales.returns, "EGP")}</p></div><div><p className="text-xs text-slate-500">COGS</p><p className="text-xl font-bold">{formatCurrency(summary.profit.cogs, "EGP")}</p></div><div><p className="text-xs text-slate-500">Operating expenses</p><p className="text-xl font-bold">{formatCurrency(summary.profit.operating_expenses, "EGP")}</p></div><div><p className="text-xs text-slate-500">Net profit / margin</p><p className="text-xl font-bold text-emerald-700">{formatCurrency(summary.profit.net_profit, "EGP")} <span className="text-sm">({summary.profit.margin.toFixed(2)}%)</span></p></div></div></section>}
      <section className="grid gap-4 md:grid-cols-4"><div className="rounded-lg border bg-white p-5 md:col-span-2"><p className="text-sm text-slate-500">Monthly sales through selected date</p><p className="mt-2 text-3xl font-bold">{summary ? formatCurrency(summary.monthly.sales, "EGP") : "..."}</p></div><div className="rounded-lg border bg-white p-5"><p className="text-sm text-slate-500">Monthly invoices</p><p className="mt-2 text-3xl font-bold">{summary?.monthly.invoices ?? "..."}</p></div><div className="rounded-lg border bg-white p-5"><p className="text-sm text-slate-500">Monthly items sold</p><p className="mt-2 text-3xl font-bold">{summary?.monthly.items ?? "..."}</p></div></section>
      <section className="grid gap-6 lg:grid-cols-2"><div className="rounded-lg border bg-white p-5"><h2 className="mb-4 font-semibold">Sales by cashier</h2>{summary?.cashiers?.length ? <div className="space-y-3">{summary.cashiers.map((c) => <div key={c.cashier}><div className="flex justify-between text-sm"><span>{c.cashier}</span><strong>{formatCurrency(c.sales, "EGP")}</strong></div><div className="mt-1 h-2 rounded bg-slate-100"><div className="h-2 rounded bg-emerald-500" style={{ width: `${Math.min(100, (c.sales / Math.max(...summary.cashiers.map((x) => x.sales), 1)) * 100)}%` }} /></div><p className="mt-1 text-xs text-slate-500">{c.invoices} invoices · {c.items} items · received {formatCurrency(c.received, "EGP")}</p></div>)}</div> : <p className="text-sm text-slate-500">No submitted sales for this date.</p>}</div><div className="rounded-lg border bg-white p-5"><h2 className="mb-4 font-semibold">Stock movement</h2><div className="grid grid-cols-2 gap-4"><div><p className="text-sm text-slate-500">Entered stock</p><p className="text-3xl font-bold text-emerald-700">{summary?.stock_movement.entered ?? "..."}</p></div><div><p className="text-sm text-slate-500">Left stock</p><p className="text-3xl font-bold text-red-700">{summary?.stock_movement.left ?? "..."}</p></div></div><div className="mt-6"><Button variant="secondary" size="sm" onClick={() => router.push("/inventory")}>Open inventory</Button></div></div></section>
    </div>
    {userOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">{credentials ? <div className="space-y-4"><h2 className="text-lg font-semibold">User created</h2><div className="rounded bg-slate-100 p-4 text-sm"><p><strong>Login email:</strong> {credentials.user}</p></div><p className="text-sm text-slate-500">The user can sign in using this email and the password you entered.</p><div className="flex justify-end"><Button onClick={() => setCredentials(null)}>Continue</Button></div></div> : editUser ? <form onSubmit={updateUser} className="space-y-4"><h2 className="text-lg font-semibold">Edit user login</h2><input required type="email" value={editUser.email} onChange={(e) => setEditUser({ ...editUser, email: e.target.value })} className="w-full rounded border p-2" /><input minLength={8} type="password" autoComplete="new-password" placeholder="New password (leave blank to keep current)" value={editUser.password} onChange={(e) => setEditUser({ ...editUser, password: e.target.value })} className="w-full rounded border p-2" /><div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setEditUser(null)}>Back</Button><Button type="submit">Save changes</Button></div></form> : <div className="space-y-5"><form onSubmit={createUser} className="space-y-3"><h2 className="text-lg font-semibold">Add user</h2><input required placeholder="Full name" value={newUser.full_name} onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })} className="w-full rounded border p-2" /><input required type="email" placeholder="Login email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} className="w-full rounded border p-2" /><input required type="tel" placeholder="Phone number" value={newUser.phone} onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })} className="w-full rounded border p-2" /><input required minLength={8} type="password" autoComplete="new-password" placeholder="Password (at least 8 characters)" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className="w-full rounded border p-2" /><select value={newUser.user_type} onChange={(e) => setNewUser({ ...newUser, user_type: e.target.value as "cashier" | "storekeeper" })} className="w-full rounded border p-2"><option value="cashier">Cashier</option><option value="storekeeper">Storekeeper</option></select><div className="flex justify-end"><Button type="submit">Create user</Button></div></form><div className="border-t pt-4"><h3 className="mb-2 font-semibold">Existing users</h3><div className="space-y-2">{users.map((u) => <div key={u.email} className="flex items-center justify-between rounded border p-3 text-sm"><div><strong>{u.full_name}</strong><p className="text-slate-500">{u.email} · {u.role_profile_name}</p></div><Button variant="secondary" size="sm" onClick={() => setEditUser({ current_email: u.email, email: u.email, password: "" })}>Edit login</Button></div>)}</div></div><div className="flex justify-end"><Button variant="secondary" onClick={() => setUserOpen(false)}>Close</Button></div></div>}</div></div>}
    {summary && <ManagerDetails summary={summary} />}
  </main>;
}
