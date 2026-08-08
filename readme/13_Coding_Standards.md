# 13 — Coding Standards

These are the conventions the existing code follows, plus the rules enforced by tooling. Where the codebase is inconsistent, this document says so rather than pretending otherwise.

---

## Enforced Automatically

| Tool | Config | Scope |
|---|---|---|
| Ruff (lint) | `pyproject.toml` | Python |
| Ruff (format) | `pyproject.toml` | Python |
| Ruff (isort) | `.pre-commit-config.yaml` | Python imports |
| Prettier | `.pre-commit-config.yaml` | Non-Python files |
| ESLint | `.pre-commit-config.yaml`, `eslint-config-next` | TypeScript / JS |
| TypeScript | `tsconfig.json`, `strict: true` | Frontend |
| pre-commit hooks | `.pre-commit-config.yaml` | Repo-wide sanity checks |

Everything below that is not enforced by these tools is convention — followed by the existing code and expected of new code.

---

## Python

### Formatting

From `pyproject.toml`:

```toml
[tool.ruff]
line-length = 110
target-version = "py310"

[tool.ruff.format]
quote-style = "double"
indent-style = "tab"
```

| Rule | Value |
|---|---|
| Indentation | **Tabs**, not spaces |
| Quotes | **Double** |
| Line length | 110 |
| Python target | 3.10 |

> **Warning**
> Tab indentation is unusual and easy to break. Configure your editor to insert tabs for `.py` files in this project, or `ruff format` will rewrite every line you touch and produce an unreadable diff.

### Lint Rules

```toml
select = ["F", "E", "W", "I", "UP", "B", "RUF"]
ignore = [
    "B017", "B018", "B023", "B904", "E101", "E402", "E501", "E741",
    "F401", "F403", "F405", "F722", "W191",
]
```

Two ignores matter in practice:

- **`E501` (line length) is ignored** despite `line-length = 110`. The formatter wraps where it can; long strings and translated messages are left alone.
- **`F401` (unused import) is ignored.** This is a Frappe-ecosystem convention — apps re-export names through `__init__.py`. It also means dead imports accumulate silently.

### Running It

```bash
ruff check swift_core/
ruff format swift_core/
ruff check --select=I --fix swift_core/   # sort imports
```

### Naming

| Kind | Convention | Example |
|---|---|---|
| Public endpoint | `snake_case`, no prefix | `create_invoice`, `item_by_barcode` |
| Private helper | `_snake_case` | `_available_qty`, `_resolve_warehouse` |
| Module constant | `UPPER_SNAKE_CASE` | `RETURN_WINDOW_DAYS`, `EXPORT_COLUMNS` |
| Class | `PascalCase` | `SwiftPOSSettings` |
| Local variable | `snake_case` | `grand_total`, `stock_warnings` |

**The leading underscore is meaningful here**, not decorative: it marks a function as *not* whitelisted. Every `_`-prefixed function in `api.py` is internal. Every unprefixed one is (or should be) an HTTP endpoint. Keep that invariant — it is the fastest way to audit the attack surface.

Endpoint names follow `<noun>_<verb>` or `<verb>_<noun>` grouped by domain:

```
session_current   session_open   session_close   session_heartbeat
item_by_barcode   item_search    create_item     update_item
inventory_import_preview   inventory_import_commit   inventory_export
```

Group new endpoints with their existing family rather than inventing a new prefix.

### Imports

Ruff's isort rule (`I`) enforces ordering: stdlib, third-party, first-party, with blank lines between groups.

```python
import frappe
from frappe import _
from frappe.utils import flt, cint, nowdate, date_diff
```

`from frappe import _` is required in every module that raises user-facing messages.

### Function Shape

Every endpoint follows the same five steps. Deviating makes review harder.

```python
@frappe.whitelist(methods=["POST"])
def create_something(arg=None):
	require_role("Swift Storekeeper")          # 1. gate
	if not arg:                                 # 2. validate
		frappe.throw(_("arg is required."))
	config = resolve_config()                   # 3. config
	doc = frappe.new_doc("Something")           # 4. work
	doc.company = config["company"]
	doc.insert(ignore_permissions=True)
	return {"name": doc.name}                   # 5. plain dict
```

**All parameters default to `None`.** Frappe passes arguments from form-encoded bodies and query strings; a missing key must not raise `TypeError` before your validation runs. Validate explicitly inside the body.

### Error Messages

```python
frappe.throw(_("Item {0} is out of stock.").format(item_code))
```

- Wrap every user-facing string in `_()` for translation
- Use `{0}` placeholders with `.format()`, not f-strings — f-strings cannot be extracted for translation
- Write messages the cashier can act on: `"Item {0} is out of stock."` not `"validation failed"`
- Set an explicit status code where the default 417 would be misleading:

```python
frappe.local.response.http_status_code = 409
frappe.throw(_("No active POS session — open a shift first."))
```

### Numeric Handling

Always coerce through Frappe's utilities. Values arriving over HTTP are strings.

```python
from frappe.utils import flt, cint

qty = flt(row.get("qty"))       # float, None-safe
count = cint(row.get("count"))  # int, None-safe
```

Never `float(x)` or `int(x)` on request data — both raise on `None` and on empty strings.

### Comments

The existing code comments **why**, not **what**. The best example in the codebase, at the top of `create_invoice`:

```python
# Sales Invoice, not POS Invoice: POSInvoice.on_submit omits update_stock_ledger()
# and make_gl_entries() entirely...
```

That comment prevents a future developer from "simplifying" the code back into a broken state. Write comments like that. Do not write comments that restate the line below them.

Docstrings on helpers are one line, imperative:

```python
def _available_qty(item_code, warehouse):
	"""Return actual_qty for the item across leaf warehouses under `warehouse`."""
```

> **Warning**
> Two docstrings in the codebase are currently wrong: `api.py`'s module docstring references a module path that no longer exists (`swift_pos.api.v1.api`), and `auto_close_inactive_sessions` claims it runs "every 5 minutes via cron" when it is not registered in `scheduler_events` at all. A stale docstring is worse than no docstring. If you change behaviour, change the docstring in the same commit.

---

## TypeScript

### Compiler

`tsconfig.json`:

```json
{
  "strict": true,
  "moduleResolution": "bundler",
  "paths": { "@/*": ["./src/*"] }
}
```

`strict: true` is non-negotiable. Do not add `// @ts-ignore` or `any` to get past it — if the type is genuinely unknown, model it with `unknown` and narrow.

### Formatting

Prettier defaults (no override file): 2-space indent, double quotes, semicolons, trailing commas where valid.

### Naming

| Kind | Convention | Example |
|---|---|---|
| Component | `PascalCase`, file matches | `PaymentModal.tsx` |
| Hook | `useCamelCase` | `useDebounce` |
| Store | `useXStore` | `useCartStore`, `useAuthStore` |
| Type / interface | `PascalCase` | `SessionOpenResponse` |
| Constant | `UPPER_SNAKE_CASE` | `HEARTBEAT_INTERVAL_MS` |
| Function / variable | `camelCase` | `handleDone`, `isSubmitting` |
| Boolean | `is`/`has`/`can` prefix | `isLoading`, `hasSession` |

Server-derived fields keep their **snake_case** names in TypeScript types:

```ts
export interface Invoice {
  grand_total: number;
  posting_date: string;
  custom_pos_opening_entry: string;
}
```

Do not camelCase them. A translation layer would be one more place for the field-name drift that already caused the `total_expenses` and `period_start_time` defects.

### Imports

Always use the `@/` alias:

```ts
import { frappeApi } from "@/lib/api";
import { useCartStore } from "@/stores/cartStore";
```

Never `../../lib/api`.

> **Warning**
> `lib/axios.ts` uses a CommonJS `require("@/stores/authStore")` inside the 401 handler to break a circular import. It works under the Next.js bundler but is inconsistent with the ESM style used everywhere else. Do not copy that pattern. If you hit a cycle, restructure the modules.

### Client Components

Every file with hooks, state, or event handlers needs the directive on line 1:

```tsx
"use client";
```

This app has **no server components that fetch data**. Auth is a cookie scoped to the Frappe origin, unreachable from the Next.js server.

### Component Shape

```tsx
"use client";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function PaymentModal({ isOpen, onClose }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const items = useCartStore((s) => s.items);

  if (!isOpen) return null;

  return <div>...</div>;
}
```

Named exports for components; `default export` only for Next.js `page.tsx` and `layout.tsx`, where the framework requires it.

### Zustand Selectors

Always select the narrowest slice:

```ts
const items = useCartStore((s) => s.items);        // ✅ re-renders on items only
const store = useCartStore();                      // ❌ re-renders on any change
```

> **Note**
> No store uses `persist` middleware. All client state is lost on refresh, by design — the source of truth is the server. Do not add `persist` to a store holding cart or session data; a stale persisted cart after a submitted invoice would cause double-selling.

### Error Handling

Every catch block in the UI goes through the shared extractor:

```ts
try {
  const { data } = await frappeApi.createInvoice(payload);
} catch (err) {
  showToast(extractFrappeError(err), "error");
}
```

`extractFrappeError` unwraps Frappe's `_server_messages` (a JSON string containing JSON strings), then falls back to `exception`, `message`, and `statusText`. Never surface a raw `AxiosError` — it reads as `"Request failed with status code 417"`, which tells the cashier nothing.

### Styling

Tailwind utility classes inline. Merge conditionals with `cn()`:

```tsx
<button className={cn("rounded px-4 py-2", isActive && "bg-blue-600 text-white")} />
```

`cn()` wraps `clsx` + `tailwind-merge`, so later classes correctly override earlier ones. Do not concatenate class strings by hand — Tailwind conflicts resolve unpredictably.

No CSS modules, no styled-components, no inline `style` objects except for genuinely dynamic values (computed pixel offsets).

---

## Folder Organisation

### Backend

```
swift_core/
├── api.py                    ← all 30 endpoints + helpers
├── hooks.py                  ← fixtures, scheduler_events
├── patches.txt               ← empty
├── modules.txt               ← "swift"
├── fixtures/                 ← 9 exported JSON files
├── stock/
│   └── low_stock.py          ← scheduled job
└── swift/doctype/
    └── swift_pos_settings/   ← the only DocType
```

New backend code goes into `api.py` unless it is a scheduled job or a DocType controller.

> **Note**
> A single 2,783-line `api.py` is not a pattern to admire — it is technical debt recorded in `18_Future_Roadmap.md`. But splitting it changes every endpoint's import path and is a separate, deliberate refactor. Until that happens, adding to it is the consistent choice. Do not create a parallel module structure for one new endpoint.

### Frontend

```
src/
├── app/
│   ├── (protected)/          ← route group; auth + session gate
│   │   ├── layout.tsx
│   │   ├── pos/page.tsx
│   │   ├── inventory/page.tsx
│   │   └── returns/page.tsx
│   ├── login/page.tsx
│   ├── layout.tsx
│   └── providers.tsx
├── features/                 ← domain code
│   ├── pos/{components,hooks}
│   ├── inventory/{components,hooks}
│   └── returns/components
├── components/common/        ← domain-agnostic UI
├── stores/                   ← Zustand
├── lib/                      ← axios, api, utils, formatting
├── config/                   ← constants, env
└── types/                    ← shared types
```

**The rule:** anything that names a business concept belongs in `features/<domain>/`. Only genuinely reusable UI (spinner, modal shell, toast) belongs in `components/common/`.

Do not create a `features/<domain>/` folder with a single file that only one page uses — put it in the page's own folder until a second consumer appears.

---

## Security Rules

These are requirements, not suggestions. Read `06_Authentication.md` and `14_Permissions.md` alongside this section.

### 1. Role Gate Before `ignore_permissions`

```python
@frappe.whitelist(methods=["POST"])
def create_item(...):
	require_role("Swift Storekeeper")     # ← the only real control
	...
	item.insert(ignore_permissions=True)  # ← DocType check now bypassed
```

Every write endpoint uses `ignore_permissions=True` because Swift roles do not hold ERPNext DocType permissions. The role gate is therefore **the entire authorization model**. An endpoint with `ignore_permissions` and no gate is exploitable by any authenticated user.

**Review checklist item #1: does every whitelisted function begin with a role gate?**

### 2. No Raw SQL for User Input

Use the ORM. It parameterises, applies permissions, and keeps the document cache coherent.

```python
# ✅
frappe.get_all("Item", filters={"item_code": item_code}, fields=["item_name"])

# ❌ — string interpolation into SQL
frappe.db.sql(f"SELECT item_name FROM tabItem WHERE item_code = '{item_code}'")
```

If raw SQL is genuinely unavoidable (aggregate reporting), parameterise:

```python
frappe.db.sql("SELECT ... WHERE item_code = %s", (item_code,))
```

Never `%`-format or f-string a value into a query.

### 3. Validate Every Input

Whitelisted functions are reachable by any authenticated user with the right role. Assume every argument is hostile.

```python
if not item_code:
	frappe.throw(_("item_code is required."))
qty = flt(qty)
if qty <= 0:
	frappe.throw(_("Quantity must be greater than zero."))
```

Parse JSON arguments explicitly and check the result's shape:

```python
if isinstance(items, str):
	items = frappe.parse_json(items)
if not items:
	frappe.throw(_("At least one item is required."))
```

### 4. Never Interpolate Into HTML

```python
# ❌ — the pattern currently in stock/low_stock.py
message = f"<tr><td>{item.item_name}</td><td>{item.actual_qty}</td></tr>"
```

An item named `<script>...` becomes executable content in the recipient's email client. Use `frappe.render_template` with an escaping template, or escape explicitly. This defect is recorded in `17_Troubleshooting.md` and `18_Future_Roadmap.md`.

### 5. XSS in React

React escapes interpolated values by default. The only way to introduce XSS is `dangerouslySetInnerHTML` — which appears nowhere in this codebase. Keep it that way.

### 6. No Secrets in Source

`env.ts` reads `NEXT_PUBLIC_FRAPPE_URL` — a public URL, correctly public. **`NEXT_PUBLIC_*` variables are compiled into the browser bundle.** Never put an API key, password, or token behind that prefix.

Frappe secrets live in `site_config.json`, which is not committed. `front/api.py` is gitignored precisely because it is a working copy that could accumulate local values.

### 7. Do Not Hardcode Business Values

```python
# ❌
warehouse = "Stores - S"

# ✅
config = resolve_config()
warehouse = config["warehouse"]
```

Company, warehouse, price list, item group, UOM, POS profile, and mode of payment all come from `Swift POS Settings` or the `POS Profile`. A hardcoded value is a bug that only appears on the second deployment.

### 8. Do Not Bypass ERPNext Accounting

Prohibited without exception:

- Writing `Stock Ledger Entry` rows directly
- Writing `GL Entry` rows directly
- Setting `allow_negative_stock`
- Calling `db_set` to change `docstatus`
- Custom accounting logic that duplicates what ERPNext already does

Submit the document and let ERPNext post. See `01_System_Architecture.md`.

### 9. CSRF

Handled centrally in `lib/axios.ts` — the interceptor fetches and attaches `X-Frappe-CSRF-Token` on every write. Do not call `fetch()` directly for a write; it will bypass the interceptor and fail with a 400.

---

## Git

### Commit Messages

Imperative mood, present tense, scoped:

```
fix(returns): use per-row warehouse instead of set_warehouse

The group warehouse on POS Profile cannot hold stock, so return
credits were failing validation at submit. Map each return row to
the warehouse the original line was sold from.
```

- Subject line under ~72 characters
- Blank line, then body explaining **why**
- Prefix with a scope when it clarifies: `fix(returns)`, `feat(import)`, `docs`
- Reference the symptom the change fixes — the next person searching the log will search for the symptom, not the fix

### What Not to Commit

`.gitignore` covers `api.py` and `_fix_normalizer.py` (unquoted, so the patterns match correctly), plus `node_modules`, `.next`, `.env*.local`.

Never commit: `site_config.json`, backups, `.env.local`, IDE folders, or the frontend build output.

### Branches

Work on a branch, merge to `main` when the verification checklist passes. `main` is what gets deployed.

### Pre-commit

```bash
pre-commit install      # once
pre-commit run --all-files
```

Configured hooks: `trailing-whitespace`, `check-merge-conflict`, `check-ast`, `check-json`, `check-toml`, `check-yaml`, `debug-statements`, ruff (isort/lint/format), prettier, eslint.

`check-ast` and `debug-statements` are the two that catch real mistakes — a syntax error in `api.py` and a forgotten `breakpoint()`.

---

## Code Review Checklist

### Security — every item, every review

- [ ] Every new whitelisted function begins with a role gate
- [ ] No `ignore_permissions=True` without a gate above it
- [ ] No raw SQL with interpolated user input
- [ ] All inputs validated; JSON arguments parsed and shape-checked
- [ ] Numbers coerced with `flt`/`cint`, not `float`/`int`
- [ ] No user data interpolated into HTML strings
- [ ] No secrets, and nothing sensitive behind `NEXT_PUBLIC_*`
- [ ] `methods=[...]` declared and correct

### Correctness

- [ ] No hardcoded company, warehouse, price list, UOM, or item group
- [ ] No direct `Stock Ledger Entry` or `GL Entry` writes
- [ ] `allow_negative_stock` untouched
- [ ] Documents submitted through ERPNext, not manipulated after
- [ ] Status codes set where 417 would mislead (409 for conflicts, 404 for missing)
- [ ] TypeScript response types match the Python `return` statement field-for-field

### Quality

- [ ] No new custom DocType
- [ ] No duplicated helper — check whether one already exists in `api.py`
- [ ] Existing components, hooks, stores, and utilities reused rather than reimplemented
- [ ] Naming matches the surrounding code; `_` prefix used correctly
- [ ] Comments explain *why*; docstrings updated if behaviour changed
- [ ] User-facing strings wrapped in `_()` with `{0}` placeholders

### Verification

- [ ] `npm run type-check` passes
- [ ] `npm run build` passes
- [ ] `python -m py_compile api.py` passes
- [ ] `front/api.py` and the bench copy are identical
- [ ] Manually exercised in the UI
- [ ] Relevant `11_Deployment.md` checklist items re-run

> **Warning**
> There is no automated test suite. Every one of these checks is manual, and skipping them is how regressions reach production. Treat the checklist as part of the change, not paperwork after it.
