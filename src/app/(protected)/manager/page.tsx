"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, CalendarDays, CircleDollarSign, Package, Plus, Printer, RefreshCw, Wallet } from "lucide-react";
import { frappeApi } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/common/Button";
import { formatCurrency } from "@/lib/formatting";

type Cashier = { cashier: string; invoices: number; items: number; sales: number; received: number };
type Invoice = { name: string; posting_time?: string; customer?: string; cashier: string; grand_total: number; paid_amount: number; status: string };
type OutOfStockItem = { item_code: string; item_name: string; qty: number };
type Summary = {
  sales: { total: number; items: number; invoices: number; received: number };
  monthly: { sales: number; items: number; invoices: number; received: number };
  expenses: number;
  inventory: { value: number; items: number; qty: number };
  stock_movement: { entered: number; left: number; value_difference: number };
  cashiers: Cashier[];
  monthly_cashiers: Array<{ cashier: string; invoices: number; sales: number; received: number }>;
  invoices: Invoice[];
  out_of_stock: OutOfStockItem[];
};

const today = () => new Date().toISOString().slice(0, 10);

function ManagerDetails({ summary }: { summary: Summary }) {
  return <div className="space-y-6">
    <section className="rounded-lg border bg-white p-5"><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Monthly sales by cashier</h2><span className="text-sm text-slate-500">Month to selected date</span></div>{summary.monthly_cashiers?.length ? <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="border-b text-xs uppercase text-slate-500"><tr><th className="px-2 py-3">Cashier</th><th className="px-2 py-3 text-right">Invoices</th><th className="px-2 py-3 text-right">Total sales</th><th className="px-2 py-3 text-right">Money received</th></tr></thead><tbody>{summary.monthly_cashiers.map((cashier) => <tr key={cashier.cashier} className="border-b last:border-0"><td className="px-2 py-3 font-medium">{cashier.cashier}</td><td className="px-2 py-3 text-right">{cashier.invoices}</td><td className="px-2 py-3 text-right font-semibold">{formatCurrency(cashier.sales, "EGP")}</td><td className="px-2 py-3 text-right">{formatCurrency(cashier.received, "EGP")}</td></tr>)}</tbody></table></div> : <p className="text-sm text-slate-500">No submitted cashier sales for this month.</p>}</section>
    <section className="rounded-lg border bg-white p-5"><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Sales invoices</h2><span className="text-sm text-slate-500">{summary.invoices?.length ?? 0} submitted invoices</span></div>{summary.invoices?.length ? <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="border-b text-xs uppercase text-slate-500"><tr><th className="px-2 py-3">Invoice</th><th className="px-2 py-3">Time</th><th className="px-2 py-3">Customer</th><th className="px-2 py-3">Cashier</th><th className="px-2 py-3 text-right">Total</th><th className="px-2 py-3 text-right">Paid</th><th className="px-2 py-3">Status</th></tr></thead><tbody>{summary.invoices.map((invoice) => <tr key={invoice.name} className="border-b last:border-0"><td className="px-2 py-3 font-medium">{invoice.name}</td><td className="px-2 py-3">{invoice.posting_time || "-"}</td><td className="px-2 py-3">{invoice.customer || "Walk-in customer"}</td><td className="px-2 py-3">{invoice.cashier}</td><td className="px-2 py-3 text-right">{formatCurrency(invoice.grand_total, "EGP")}</td><td className="px-2 py-3 text-right">{formatCurrency(invoice.paid_amount, "EGP")}</td><td className="px-2 py-3">{invoice.status}</td></tr>)}</tbody></table></div> : <p className="text-sm text-slate-500">No submitted sales invoices for this date.</p>}</section>
    <section className="rounded-lg border bg-white p-5"><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Out of stock</h2><span className="text-sm text-slate-500">{summary.out_of_stock?.length ?? 0} items</span></div>{summary.out_of_stock?.length ? <div className="overflow-x-auto"><table className="w-full min-w-[500px] text-left text-sm"><thead className="border-b text-xs uppercase text-slate-500"><tr><th className="px-2 py-3">Item code</th><th className="px-2 py-3">Item name</th><th className="px-2 py-3 text-right">Available quantity</th></tr></thead><tbody>{summary.out_of_stock.map((item) => <tr key={item.item_code} className="border-b last:border-0"><td className="px-2 py-3 font-medium">{item.item_code}</td><td className="px-2 py-3">{item.item_name}</td><td className="px-2 py-3 text-right text-red-700">{item.qty}</td></tr>)}</tbody></table></div> : <p className="text-sm text-slate-500">All active stock items have quantity available.</p>}</section>
  </div>;
}

export default function ManagerPage() {
  const router = useRouter();
  const role = useAuthStore((s) => s.role);
  const [date, setDate] = useState(today());
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userOpen, setUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({ full_name: "", email: "", phone: "", password: "", user_type: "cashier" as "cashier" | "storekeeper" });
  const [credentials, setCredentials] = useState<{ user: string } | null>(null);
  const [users, setUsers] = useState<Array<{ email: string; full_name: string; phone: string; role_profile_name: string }>>([]);
  const [editUser, setEditUser] = useState<{ current_email: string; email: string; password: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await frappeApi.managerDashboardSummary(date, date);
      setSummary(data);
    } catch {
      setError("Unable to load the manager summary.");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { if (role === "swift manager") load(); }, [load, role]);

  const cards = useMemo(() => summary ? [
    ["Today's Sales", summary.sales.total, CircleDollarSign],
    ["Money Received", summary.sales.received, Wallet],
    ["Expenses", summary.expenses, CircleDollarSign],
    ["Net Sales", summary.sales.total - summary.expenses, BarChart3],
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
      <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-slate-500" /><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded border px-3 py-2 text-sm" /><Button variant="secondary" size="sm" onClick={load}><RefreshCw className="h-4 w-4" /> Refresh</Button><Button variant="secondary" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print day</Button><Button size="sm" onClick={openUsers}><Plus className="h-4 w-4" /> Manage users</Button></div>
    </header>
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <section><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Selected day</h2><span className="text-sm text-slate-500">{date === today() ? "Today" : date}</span></div><div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">{cards.map(([label, value, Icon]) => <div key={label} className="rounded-lg border bg-white p-4 shadow-sm"><Icon className="mb-3 h-5 w-5 text-emerald-600" /><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-xl font-bold">{loading ? "..." : label === "Items Sold" ? value : formatCurrency(value, "EGP")}</p></div>)}</div></section>
      <section className="grid gap-4 md:grid-cols-4"><div className="rounded-lg border bg-white p-5 md:col-span-2"><p className="text-sm text-slate-500">Monthly sales through selected date</p><p className="mt-2 text-3xl font-bold">{summary ? formatCurrency(summary.monthly.sales, "EGP") : "..."}</p></div><div className="rounded-lg border bg-white p-5"><p className="text-sm text-slate-500">Monthly invoices</p><p className="mt-2 text-3xl font-bold">{summary?.monthly.invoices ?? "..."}</p></div><div className="rounded-lg border bg-white p-5"><p className="text-sm text-slate-500">Monthly items sold</p><p className="mt-2 text-3xl font-bold">{summary?.monthly.items ?? "..."}</p></div></section>
      <section className="grid gap-6 lg:grid-cols-2"><div className="rounded-lg border bg-white p-5"><h2 className="mb-4 font-semibold">Sales by cashier</h2>{summary?.cashiers?.length ? <div className="space-y-3">{summary.cashiers.map((c) => <div key={c.cashier}><div className="flex justify-between text-sm"><span>{c.cashier}</span><strong>{formatCurrency(c.sales, "EGP")}</strong></div><div className="mt-1 h-2 rounded bg-slate-100"><div className="h-2 rounded bg-emerald-500" style={{ width: `${Math.min(100, (c.sales / Math.max(...summary.cashiers.map((x) => x.sales), 1)) * 100)}%` }} /></div><p className="mt-1 text-xs text-slate-500">{c.invoices} invoices · {c.items} items · received {formatCurrency(c.received, "EGP")}</p></div>)}</div> : <p className="text-sm text-slate-500">No submitted sales for this date.</p>}</div><div className="rounded-lg border bg-white p-5"><h2 className="mb-4 font-semibold">Stock movement</h2><div className="grid grid-cols-2 gap-4"><div><p className="text-sm text-slate-500">Entered stock</p><p className="text-3xl font-bold text-emerald-700">{summary?.stock_movement.entered ?? "..."}</p></div><div><p className="text-sm text-slate-500">Left stock</p><p className="text-3xl font-bold text-red-700">{summary?.stock_movement.left ?? "..."}</p></div></div><div className="mt-6"><Button variant="secondary" size="sm" onClick={() => router.push("/inventory")}>Open inventory</Button></div></div></section>
    </div>
    {userOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">{credentials ? <div className="space-y-4"><h2 className="text-lg font-semibold">User created</h2><div className="rounded bg-slate-100 p-4 text-sm"><p><strong>Login email:</strong> {credentials.user}</p></div><p className="text-sm text-slate-500">The user can sign in using this email and the password you entered.</p><div className="flex justify-end"><Button onClick={() => setCredentials(null)}>Continue</Button></div></div> : editUser ? <form onSubmit={updateUser} className="space-y-4"><h2 className="text-lg font-semibold">Edit user login</h2><input required type="email" value={editUser.email} onChange={(e) => setEditUser({ ...editUser, email: e.target.value })} className="w-full rounded border p-2" /><input minLength={8} type="password" autoComplete="new-password" placeholder="New password (leave blank to keep current)" value={editUser.password} onChange={(e) => setEditUser({ ...editUser, password: e.target.value })} className="w-full rounded border p-2" /><div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setEditUser(null)}>Back</Button><Button type="submit">Save changes</Button></div></form> : <div className="space-y-5"><form onSubmit={createUser} className="space-y-3"><h2 className="text-lg font-semibold">Add user</h2><input required placeholder="Full name" value={newUser.full_name} onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })} className="w-full rounded border p-2" /><input required type="email" placeholder="Login email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} className="w-full rounded border p-2" /><input required type="tel" placeholder="Phone number" value={newUser.phone} onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })} className="w-full rounded border p-2" /><input required minLength={8} type="password" autoComplete="new-password" placeholder="Password (at least 8 characters)" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className="w-full rounded border p-2" /><select value={newUser.user_type} onChange={(e) => setNewUser({ ...newUser, user_type: e.target.value as "cashier" | "storekeeper" })} className="w-full rounded border p-2"><option value="cashier">Cashier</option><option value="storekeeper">Storekeeper</option></select><div className="flex justify-end"><Button type="submit">Create user</Button></div></form><div className="border-t pt-4"><h3 className="mb-2 font-semibold">Existing users</h3><div className="space-y-2">{users.map((u) => <div key={u.email} className="flex items-center justify-between rounded border p-3 text-sm"><div><strong>{u.full_name}</strong><p className="text-slate-500">{u.email} · {u.role_profile_name}</p></div><Button variant="secondary" size="sm" onClick={() => setEditUser({ current_email: u.email, email: u.email, password: "" })}>Edit login</Button></div>)}</div></div><div className="flex justify-end"><Button variant="secondary" onClick={() => setUserOpen(false)}>Close</Button></div></div>}</div></div>}
    {summary && <ManagerDetails summary={summary} />}
  </main>;
}
