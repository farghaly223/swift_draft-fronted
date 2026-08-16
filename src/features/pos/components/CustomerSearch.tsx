"use client";

import { useEffect, useState } from "react";
import { frappeApi } from "@/lib/api";
import { useCartStore } from "@/stores/cartStore";

export function CustomerSearch() {
  const setCustomer = useCartStore((state) => state.setCustomer);
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<Array<{ name: string; customer_name: string; mobile_no?: string }>>([]);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  useEffect(() => {
    frappeApi.customerSearchAccess("").then(() => setEnabled(true)).catch(() => setEnabled(false));
  }, []);
  async function search() {
    try { const { data } = await frappeApi.customerSearchAccess(query); setRows(data.customers || []); setEnabled(true); }
    catch { setEnabled(false); setRows([]); }
  }
  if (enabled !== true) return null;
  return <div className="rounded-lg border bg-white p-3"><div className="flex gap-2"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Customer mobile, number, or name" className="min-w-0 flex-1 rounded border px-3 py-2 text-sm" /><button type="button" onClick={search} className="rounded bg-slate-800 px-3 py-2 text-sm text-white">Search</button></div>{rows.length > 0 && <div className="mt-2 space-y-1">{rows.map((row) => <button type="button" key={row.name} onClick={() => { setCustomer(row.name); setRows([]); }} className="block w-full rounded border p-2 text-left text-sm hover:bg-slate-50">{row.customer_name} · {row.mobile_no || row.name}</button>)}</div>}</div>;
}
