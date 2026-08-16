"use client";

import { useEffect, useState } from "react";
import { frappeApi } from "@/lib/api";

type User = { email: string; full_name: string; role_profile_name: string; custom_customer_search_access?: number };

export function EmployeeCustomerPermissions() {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { frappeApi.managerListUsers().then(({ data }) => setUsers(data)).catch(() => setError("Unable to load employee permissions.")); }, []);
  async function toggle(user: string, enabled: boolean) {
    try { await frappeApi.managerSetCustomerSearchAccess(user, enabled); setUsers((rows) => rows.map((row) => row.email === user ? { ...row, custom_customer_search_access: enabled ? 1 : 0 } : row)); }
    catch { setError("Unable to update Customer Search access."); }
  }
  return <section className="rounded-lg border bg-white p-5"><h2 className="font-semibold">Employee customer permissions</h2><p className="mb-3 text-sm text-slate-500">Customer Search is available only to enabled users.</p>{error && <p className="mb-2 text-sm text-red-700">{error}</p>}<div className="grid gap-2 sm:grid-cols-2">{users.map((user) => <label key={user.email} className="flex items-center justify-between rounded border p-3 text-sm"><span><strong>{user.full_name}</strong><span className="block text-xs text-slate-500">{user.email} · {user.role_profile_name}</span></span><input type="checkbox" checked={Boolean(user.custom_customer_search_access)} onChange={(e) => toggle(user.email, e.target.checked)} /></label>)}</div></section>;
}
