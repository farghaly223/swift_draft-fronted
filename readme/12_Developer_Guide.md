# 12 — Developer Guide

## Before You Change Anything

Three facts about this project determine how you should work in it.

**1. There are no tests.** The only test file is empty scaffolding. Nothing will catch a regression except you and the verification checklist in `11_Deployment.md`.

**2. The backend is one file.** `api.py` is ~2,783 lines holding every endpoint and helper. Expect merge conflicts if two people work at once.

**3. Backend edits go through a staging copy.** See below. Getting this wrong wastes hours.

---

## The Two-Copy Workflow

> **Warning — Read This First**
>
> `front/api.py` is a **staging copy** of the backend `swift_core/api.py`. It is Python, it sits in the frontend directory, it is gitignored, and **it is not executed by anything**.
>
> The authoritative file is:
> ```
> <bench>/apps/swift_core/swift_core/api.py
> ```
>
> Editing the staging copy changes nothing until you copy it into the bench and restart:
>
> 1. Edit `front/api.py`
> 2. Copy to `<bench>/apps/swift_core/swift_core/api.py`
> 3. `bench restart`
>
> Skip step 2 and you are testing old code while reading new code — the most confusing failure mode this project offers. Skip step 3 and the old module stays loaded in memory.
>
> **Before any deployment, diff the two files.** They must be identical.

From Windows, the bench copy is reachable only via UNC:

```
\\wsl.localhost\Ubuntu\home\sasa\frappe_docker\development\frappe-bench\apps\swift_core\swift_core\api.py
```

A bare `/home/sasa/...` path does not resolve from Windows tooling.

---

## Running Locally

### Backend

```bash
cd $PATH_TO_YOUR_BENCH
bench start
```

Serves on `http://localhost:8000`. Python changes usually hot-reload under `bench start`; when in doubt, `bench restart`.

### Frontend

```bash
cd <frontend-directory>
npm install
npm run dev
```

Serves on `http://localhost:3000`. `env.ts` defaults to `http://localhost:8000`, so no `.env.local` is needed locally.

### Verify Both

```bash
curl -i "http://localhost:8000/api/method/swift_core.api.me"
```

`403` = app loaded and routed correctly. `404` = `swift_core` is not installed on the site.

### Useful Bench Commands

```bash
bench --site <site> console      # Python REPL with frappe loaded
bench --site <site> mariadb      # SQL shell
bench --site <site> clear-cache
bench restart
bench doctor                     # queue and scheduler health
```

`bench console` is the fastest way to test a helper against real data:

```python
>>> from swift_core.api import resolve_config, _available_qty
>>> resolve_config()
>>> _available_qty("ITEM-001", "swift")
```

---

## Adding a Backend Endpoint

Worked example: an endpoint returning the invoices for a shift.

### 1. Write the Function

Add it to `api.py`, in the section matching its domain. Follow the five-step shape every endpoint uses:

```python
@frappe.whitelist(methods=["GET"])
def shift_summary(opening_entry=None):
	# 1. Role gate — ALWAYS first
	require_role("Swift Cashier")

	# 2. Input validation
	if not opening_entry:
		frappe.throw(_("opening_entry is required."))

	# 3. Config resolution — never hardcode business values
	config = resolve_config()

	# 4. Work, via the ORM
	invoices = frappe.get_all(
		"Sales Invoice",
		filters={
			"custom_pos_opening_entry": opening_entry,
			"docstatus": 1,
			"company": config["company"],
		},
		fields=["name", "grand_total", "is_return"],
	)

	# 5. Return a plain dict — Frappe wraps it in {"message": ...}
	return {
		"opening_entry": opening_entry,
		"count": len(invoices),
		"total": sum(flt(i.grand_total) for i in invoices),
	}
```

### 2. Rules That Are Not Optional

| Rule | Why |
|---|---|
| **Role gate first, always** | The security model depends on it — see below |
| Use `resolve_config()` for business values | Never hardcode company, warehouse, price list, UOM, item group |
| Declare `methods=[...]` | Otherwise any verb is accepted |
| Parse JSON string arguments | Form encoding delivers nested values as strings |
| Use the ORM, not raw SQL | Applies permissions, keeps the cache coherent |
| Never write `Stock Ledger Entry` or `GL Entry` | ERPNext owns posting |
| Return a plain dict or list | Frappe serialises it |

**Parsing structured arguments:**

```python
if isinstance(items, str):
	items = frappe.parse_json(items)
```

**Overriding the status code** — `frappe.throw` defaults to 417:

```python
frappe.local.response.http_status_code = 409
frappe.throw(_("No active POS session — open a shift first."))
```

> **Warning — The One Rule That Matters Most**
> If your endpoint calls `ignore_permissions=True`, it **must** have a role gate above it. `ignore_permissions` skips the DocType permission check; the role gate is then the only thing standing between an authenticated user and that operation. An endpoint with `ignore_permissions` and no gate is a privilege-escalation hole reachable by any logged-in user.

### 3. Deploy and Test

```bash
# copy front/api.py → bench, then:
bench restart

curl -i -b "sid=<session>" \
  "http://localhost:8000/api/method/swift_core.api.shift_summary?opening_entry=POS-OPE-2026-00042"
```

Then verify the gate rejects the wrong role:

```bash
curl -i -b "sid=<storekeeper_session>" \
  "http://localhost:8000/api/method/swift_core.api.shift_summary?opening_entry=X"
```

Expect `403`.

### 4. No Registration Step

Frappe derives the URL from the module path. `@frappe.whitelist()` is the entire registration. There is no route table to update.

---

## Wiring an Endpoint into the Frontend

### 1. Add the Typed Wrapper

`src/lib/api.ts` — every call goes through this module:

```ts
shiftSummary: (opening_entry: string) =>
  apiClient.get(`${API_BASE_PATH}.shift_summary`, { params: { opening_entry } }),
```

Conventions visible in the existing file:

| Case | Pattern |
|---|---|
| GET with params | `{ params: {...} }`, or a template string for a single value |
| POST | `apiClient.post(path, payloadObject)` — the interceptor form-encodes it |
| DELETE with a body | `apiClient.delete(path, { data: {...} })` |
| File upload | Build `FormData`; the interceptor passes it through untouched |
| Binary response | `{ responseType: "blob" }` — required, or the unwrapper corrupts it |

### 2. Add Types

`src/types/pos.ts` (or the matching domain file), then re-export from `src/types/api.ts`:

```ts
export interface ShiftSummary {
  opening_entry: string;
  count: number;
  total: number;
}
```

> **Note**
> Two existing defects come from types drifting from the server's actual response (`total_expenses`, `period_start_time`). Copy the field names from the Python `return` statement, not from what seems reasonable.

### 3. Call It

Reads go through TanStack Query:

```ts
const { data, isLoading } = useQuery({
  queryKey: ["shift_summary", openingEntry],
  queryFn: async () => (await frappeApi.shiftSummary(openingEntry)).data,
});
```

Writes are direct `async` calls with local loading state — the established pattern in this codebase:

```ts
const [isSubmitting, setIsSubmitting] = useState(false);

const submit = async () => {
  setIsSubmitting(true);
  try {
    const { data } = await frappeApi.someWrite(payload);
    showToast("Done", "success");
  } catch (err) {
    showToast(extractFrappeError(err), "error");
  } finally {
    setIsSubmitting(false);
  }
};
```

Always surface errors through `extractFrappeError` — it unwraps Frappe's `_server_messages` into readable text.

**After a mutation that changes stock, invalidate:**

```ts
queryClient.invalidateQueries({ queryKey: ["item_search"] });
```

---

## Adding a Frontend Page

### 1. Create the Route

Protected pages live under `src/app/(protected)/`:

```
src/app/(protected)/reports/page.tsx
```

The `(protected)` group applies `ProtectedRoute` + `SessionGate` automatically. Route groups do not appear in the URL — this is `/reports`.

```tsx
"use client";

import { ShiftReport } from "@/features/reports/components/ShiftReport";

export default function ReportsPage() {
  return <ShiftReport />;
}
```

Every interactive file needs `"use client"`. There is no server-side data fetching in this app — auth is a cookie on the Frappe origin, which a Next.js server component cannot use.

### 2. Add the Route Constant

`src/config/constants.ts`:

```ts
export const ROUTES = {
  LOGIN: "/login",
  POS: "/pos",
  INVENTORY: "/inventory",
  REPORTS: "/reports",
} as const;
```

> **Note**
> `/returns` was added without a constant and is navigated to by literal string. Do not repeat that.

### 3. Build the Feature

```
src/features/reports/
├── components/ShiftReport.tsx
└── hooks/useShiftSummary.ts     (if needed)
```

Domain code goes in `features/<domain>/`; only domain-agnostic components go in `components/common/`.

### 4. Restrict by Role If Needed

The protected layout does **not** pass `allowedRoles`, so any authenticated user can load any protected page. For a role-specific page, wrap it:

```tsx
<ProtectedRoute allowedRoles={["Swift Cashier"]}>
  <ShiftReport />
</ProtectedRoute>
```

Remember this is **UX only**. The backend gate is the real control.

### 5. Verify

```bash
npm run type-check
npm run build
```

---

## Creating a Print Format

> **Warning**
> Print formats are **not** version-controlled in this project. There is no `Print Format` fixture, so anything you create here exists only in that site's database and must be recreated manually elsewhere. See `15_Fixtures.md`.

1. Desk → **Print Format** → New
2. Set **DocType** (`Sales Invoice` for receipts) and a name
3. Build the layout — the existing `Swift` format is a Custom HTML format
4. Configure a **Letter Head** for the logo
5. Save

Use it from the frontend by passing the name:

```ts
const printUrl = `${env.FRAPPE_URL}/printview?doctype=Sales%20Invoice&name=${encodeURIComponent(name)}&trigger_print=1&format=Swift&no_letterhead=0`;
window.open(printUrl, "swift_receipt");
```

Always open on the **Frappe origin** in a real window. Rendering in an iframe on the app origin breaks letterhead asset paths and changes the print scale. See `16_Printing.md`.

**To version-control formats**, add to `hooks.py`:

```python
{"dt": "Print Format", "filters": [["name", "in", ["Swift"]]]},
```

then `bench --site <site> export-fixtures`. Filter it — an unfiltered export captures every format on the site.

---

## Adding a Fixture

### 1. Create the Record

Create it in the desk first.

### 2. Register the DocType

`hooks.py`:

```python
fixtures = [
    ...
    {"dt": "Print Format", "filters": [["name", "in", ["Swift"]]]},
]
```

> **Warning — Always Filter**
> An unfiltered entry exports **every record of that DocType on the site**. Swift's existing fixtures demonstrate the problem: `role.json` contains ~60 roles and `module_def.json` contains 36 module definitions belonging to frappe, erpnext, and hrms. Migrating overwrites records this app does not own. Do not add to that.

### 3. Export

```bash
bench --site <site-name> export-fixtures
```

Writes JSON into `swift_core/fixtures/`.

### 4. Review the Diff

```bash
cd apps/swift_core && git diff fixtures/
```

Check for unrelated records swept in and for environment-specific values (account names, company abbreviations) that will not exist elsewhere.

### 5. Commit and Apply

```bash
bench --site <site-name> migrate
```

Full detail and the overwrite semantics are in `15_Fixtures.md`.

---

## Database Migrations

### There Are No Patches

```
[pre_model_sync]
[post_model_sync]
```

`patches.txt` is empty. **No data migration has ever been written or run for this app.** The first one will be untested territory.

### Writing One

1. Create `swift_core/patches/v0_0_1/your_patch.py`:

```python
import frappe

def execute():
	"""One-line description of what this fixes and why."""
	# idempotent — safe to run twice
	frappe.db.sql("...")  # prefer the ORM where possible
```

2. Register it in `patches.txt` under `[post_model_sync]`:

```
swift_core.patches.v0_0_1.your_patch
```

3. Run:

```bash
bench --site <site-name> migrate
```

**Requirements:** patches must be idempotent (Frappe records execution, but re-runs happen during restores and debugging), and must be tested against a restored copy of production data before deployment.

### Schema Changes

Changing `Swift POS Settings` requires `developer_mode = 1`; edits then write back to the DocType JSON, which must be committed.

> **Warning**
> Do not create new custom DocTypes. Swift's architecture depends on every transaction being a native ERPNext document. See `01_System_Architecture.md`.

---

## Debugging

### Backend

```bash
tail -f logs/web.error.log
tail -f logs/worker.error.log
```

Desk → **Error Log** holds unhandled exceptions with full tracebacks.

Inside an endpoint:

```python
frappe.log_error(message=str(payload), title="create_invoice debug")
```

Test helpers interactively:

```bash
bench --site <site> console
```

### Frontend

Browser DevTools Network tab, checking:

| Check | Expected |
|---|---|
| `X-Device-Id` present | On every request |
| `X-Frappe-CSRF-Token` present | On POST / PUT / DELETE |
| Cookies sent | `sid` on every request |
| Response shape | `{"message": ...}` before unwrapping |

React Query Devtools are mounted in development only and show cache state and query keys.

### Reading Error Codes

| Code | Meaning | First check |
|---|---|---|
| 400 | Bad request or CSRF | Is the token attached? |
| 403 | Not authenticated, or role gate | Which role does the session hold? |
| 404 | Named record missing | Is `swift_core` installed? Does the record exist? |
| 405 | Wrong verb | Does `methods=[...]` match? |
| 409 | Business conflict | Out of stock, no shift, device clash |
| **417** | **Any `frappe.throw`** | Read `_server_messages` |
| 500 | Unhandled exception | Error Log |

**417 is the default for every validation failure** — it does not indicate anything unusual. Read the message, not the code.

---

## Verification Before Committing

There are no tests, so this is mandatory.

```bash
# Frontend
npm run type-check      # must pass — strict mode
npm run lint
npm run build

# Backend
python -m py_compile api.py     # syntax check at minimum
```

Then exercise what you touched through the UI, plus the relevant items from the `11_Deployment.md` checklist.

> **Warning**
> `npm run type-check` and `python -m py_compile` have **not** been run against the current working tree in the session that produced this documentation. Defects listed in `03_Frontend.md` were found by reading source. Run both before deploying.

---

## Deploying to Production

```bash
# 1. Back up first — always
bench --site <site-name> backup --with-files

# 2. Confirm the staging copy matches the bench copy
diff front/api.py <bench>/apps/swift_core/swift_core/api.py

# 3. Backend
cd apps/swift_core && git pull && cd ../..
bench --site <site-name> migrate      # only if fixtures/schema changed
bench restart

# 4. Frontend
npm install && npm run type-check && npm run build
# restart the Node process

# 5. Verify
```

Then run the post-deployment checklist in `11_Deployment.md`. Steps 9 (partial return), 14 (import), 16 (export), and 17 (search) have all broken before.

### Rollback

```bash
cd apps/swift_core && git checkout <previous-commit> && cd ../..
bench restart
```

If a migration changed data, restore the backup instead — reverting code does not undo data changes.

---

## Common Mistakes

| Mistake | Symptom | Fix |
|---|---|---|
| Edited `front/api.py`, did not copy to bench | Change has no effect | Copy, then `bench restart` |
| Copied but did not restart | Old code still serving | `bench restart` |
| Added an endpoint without a role gate | Any authenticated user can call it | Add `require_role()` |
| `ignore_permissions` without a gate | **Privilege escalation** | Add the gate |
| Hardcoded a warehouse or company | Breaks on another site | Use `resolve_config()` |
| Forgot `responseType: "blob"` | Corrupt download | Add it |
| Unfiltered fixture | Overwrites unrelated site records | Add `filters` |
| Assumed a response field exists | `undefined` at runtime | Read the Python `return` |
| Used a bare `/home/...` path from Windows | File not found | Use `\\wsl.localhost\Ubuntu\...` |
| Ran `bench migrate` without a backup | Fixtures overwrote site data | Back up first |
