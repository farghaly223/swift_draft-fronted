# 00 — Project Overview

## What Swift Is

Swift is a point-of-sale and inventory management system for a retail business operating in Egypt (spare parts, accessories, and scooters). It consists of two deployable pieces:

| Piece | Name | Location | Role |
|---|---|---|---|
| Backend | `swift_core` | Frappe app inside a bench | Business logic, data, authentication |
| Frontend | `swift-pos-frontend` | Standalone Next.js app | Cashier and storekeeper UI |

The backend is **not** a standalone server. It is a custom app installed into a [Frappe v15](https://frappeframework.com) bench alongside [ERPNext](https://erpnext.com), and it reuses ERPNext's accounting, stock, and document engine rather than reimplementing them. The frontend is a separate Next.js application that talks to the backend exclusively over Frappe's whitelisted-method HTTP API.

> **Note**
> Swift deliberately does **not** use the Frappe Desk UI as its cashier interface. The desk remains available to administrators for configuration and reporting, but cashiers and storekeepers only ever see the Next.js app.

---

## The Business Idea

A retail shop needs three things that generic ERP screens handle badly:

1. **Speed at the counter.** A cashier scans a barcode and the item is in the cart. No form, no save, no navigation.
2. **Cash accountability per shift.** Each cashier opens a shift with a counted cash float and closes it with a counted total. The system reports the expected amount and the difference so cash discrepancies surface immediately rather than at month end.
3. **Correct books without an accountant driving the POS.** Every sale must post real stock movements and real ledger entries, using standard ERPNext accounting, so the financial reports are trustworthy without a reconciliation step.

Swift's design decision that follows from point 3 is the single most important architectural fact in this system:

> **Every POS sale is an ERPNext `Sales Invoice` with `is_pos = 1`, submitted immediately.**
>
> Swift does **not** use ERPNext's `POS Invoice` doctype. A submitted `Sales Invoice` posts its Stock Ledger Entries and GL Entries at submit time, so stock and accounts are correct the instant the sale completes. `POS Invoice` defers both to a consolidation step, which this business does not want.

`POS Opening Entry` and `POS Closing Entry` are still used, but strictly for shift and cash-drawer tracking. They do not post stock, do not post GL entries, and do not create consolidated invoices.

---

## Implemented Features

Everything in this list has been verified against the source. Nothing here is aspirational.

### Authentication and session
- Email/password login against Frappe's user database
- Role-based redirect (cashier → POS, storekeeper → Inventory)
- Cookie-based sessions with CSRF protection on write requests
- Per-device identification via an `X-Device-Id` header and a browser-generated UUID
- Optional single-device enforcement (a cashier can be blocked from opening a second concurrent session)
- Session heartbeat every 30 seconds

### Shift management
- Open a shift with a counted opening cash float, creating a submitted `POS Opening Entry`
- Close a shift with a counted closing amount, creating a submitted `POS Closing Entry`
- Expected cash is computed from cash sales during the shift, reduced by cash expenses recorded during the shift
- Difference (counted minus expected) is reported back to the cashier
- Automatic closing of inactive sessions (implemented; see the caveat in *Known Gaps* below)

### Selling
- Barcode scan to add an item to the cart
- Text search across item code, item name, and barcode
- Cart with quantity editing, subject to available stock
- Payment against the modes of payment configured on the POS Profile
- Change calculation
- Invoice creation as a submitted `Sales Invoice` with `is_pos = 1`
- Receipt printing through Frappe's native print view
- Recording of cash expenses during a shift as Journal Entries, tagged to the shift

### Returns
- Return lookup **by Sales Invoice number only**
- A five-day return window enforced server-side
- Full or partial return, per item and per quantity
- Quantity ceilings that account for prior partial returns
- Stock returned to the warehouse each line was originally sold from
- Serial number preservation on partial returns
- Native ERPNext return documents (a negative-quantity `Sales Invoice` with `is_return = 1`)

### Inventory
- Item list with current stock
- Item creation and editing
- Barcode management (add, validate, remove)
- Stock entries for receiving and adjusting stock
- Excel (`.xlsx`) bulk import with a preview-then-commit workflow
- Excel export of current inventory
- Automatic item creation, barcode generation, supplier creation, and price setting during import
- Arabic-aware text matching during import (invisible-character stripping and Unicode normalization)
- Daily low-stock email alert

### Explicitly Not Implemented

These are stated plainly so nobody searches for them:

| Feature | Status |
|---|---|
| Offline / PWA mode | **Intentionally not implemented.** The frontend requires a live connection to the backend for every operation, including adding items to the cart. |
| Customer-facing display, loyalty, discounts | **Intentionally not implemented.** `allow_discount_change` and `allow_rate_change` are both `0` on the POS Profile. |
| Multi-currency selling | **Intentionally not implemented.** All price lists and the POS Profile are EGP. |
| Automated tests | **Not implemented.** The single test file in the app is empty scaffolding. See `18_Future_Roadmap.md`. |
| Refund to card / payment gateway integration | **Intentionally not implemented.** Returns adjust the ledger; physical refund is handled outside the system. |
| Return by customer, item, or barcode | **Intentionally not implemented.** This is a deliberate business rule, not an oversight. Returns require the invoice number. |

---

## Technology Stack

### Backend

| Component | Version | Source of truth |
|---|---|---|
| Python | ≥ 3.10 | `pyproject.toml` → `requires-python` |
| Frappe Framework | v15 | Bench-managed; `pyproject.toml` comments `frappe~=15.0.0` |
| ERPNext | v15 (matching bench) | Installed app; Swift imports `erpnext.*` modules directly |
| HRMS | Installed | Present in `module_def.json` fixture |
| MariaDB | Bench default for Frappe v15 | Environment-specific |
| Redis | Bench default (cache, queue, socketio) | Environment-specific |
| `swift_core` | 0.0.1 | `swift_core/__init__.py` → `__version__` |

**Backend tooling:** `ruff` (lint + format), `pre-commit`, `flit_core` build backend.

### Frontend

| Package | Version | Purpose |
|---|---|---|
| `next` | 14.2.35 | App Router framework |
| `react` / `react-dom` | ^18 | UI runtime |
| `typescript` | ^5 | Type system (`strict: true`) |
| `zustand` | ^4.5.5 | Client state |
| `@tanstack/react-query` | ^5.52.0 | Server state, caching |
| `@tanstack/react-query-devtools` | ^5.52.0 | Dev-only query inspector |
| `axios` | ^1.7.2 | HTTP client |
| `tailwindcss` | ^3.4.1 | Styling |
| `clsx` + `tailwind-merge` | ^2.1.1 / ^2.4.0 | Class composition |
| `lucide-react` | ^0.428.0 | Icons |
| `eslint` + `eslint-config-next` | ^8 / 14.2.35 | Linting |

---

## Folder Structure

### Backend — `apps/swift_core/`

```
swift_core/
├── pyproject.toml                  Build config, ruff rules, Python floor
├── README.md                       Bench scaffolding (not project docs)
├── license.txt                     MIT
├── .pre-commit-config.yaml         ruff / prettier / eslint hooks
└── swift_core/
    ├── __init__.py                 __version__ = "0.0.1"
    ├── hooks.py                    App metadata, fixtures list, scheduler events
    ├── api.py                      ~2,783 lines — ALL business logic and endpoints
    ├── modules.txt                 Declares one module: "swift"
    ├── patches.txt                 Empty — no migration patches exist
    ├── config/__init__.py          Empty
    ├── templates/                  Empty scaffolding (no web pages served)
    ├── stock/
    │   ├── __init__.py
    │   └── low_stock.py            Daily low-stock email alert
    ├── swift/doctype/swift_pos_settings/
    │   ├── swift_pos_settings.json Single DocType — the config root
    │   ├── swift_pos_settings.py   Controller (no custom logic)
    │   ├── swift_pos_settings.js   Empty scaffolding
    │   └── test_swift_pos_settings.py  Empty scaffolding
    └── fixtures/                   Exported records applied on migrate
        ├── custom_field.json       Sales Invoice → custom_pos_opening_entry
        ├── role.json               Roles
        ├── role_profile.json       Role bundles
        ├── pos_profile.json        "Main POS"
        ├── mode_of_payment.json    Cash, Insta pay, + ERPNext defaults
        ├── item_group.json         Item groups
        ├── price_list.json         Standard Selling, Retail, Wholesale, Standard Buying
        ├── module_def.json         Module definitions
        └── workspace.json          Desk workspaces
```

**The critical structural fact:** `api.py` is a single ~2,783-line module containing every endpoint and every helper. There is no service layer, no separate router, and no per-domain module. This is addressed in `02_Backend.md` and flagged as technical debt in `18_Future_Roadmap.md`.

### Frontend — `swift_draft/front/`

```
front/
├── package.json                    Dependencies and scripts
├── tsconfig.json                   strict: true, path alias @/* → ./src/*
├── next.config.mjs                 Next.js config
├── tailwind.config.ts              Theme (primary color scale)
├── .gitignore                      Excludes api.py and _fix_normalizer.py
├── logo/                           Receipt logo asset
├── api.py                          ⚠ Staging copy — see note below
└── src/
    ├── app/                        Next.js App Router
    │   ├── layout.tsx              Root layout
    │   ├── providers.tsx           QueryClientProvider + ToastContainer
    │   ├── page.tsx                "/" — redirects by role
    │   ├── (auth)/
    │   │   ├── layout.tsx
    │   │   └── login/page.tsx
    │   └── (protected)/
    │       ├── layout.tsx          ProtectedRoute + SessionGate
    │       ├── pos/page.tsx
    │       ├── inventory/page.tsx
    │       └── returns/page.tsx
    ├── components/common/          Spinner, Button, Input, Modal, Toast
    ├── config/
    │   ├── env.ts                  NEXT_PUBLIC_FRAPPE_URL
    │   └── constants.ts            API base path, roles, routes, heartbeat interval
    ├── lib/
    │   ├── axios.ts                Interceptors: device ID, CSRF, form encoding, 401
    │   ├── api.ts                  Typed wrapper over every endpoint
    │   ├── utils.ts                cn, device ID, Frappe error extraction
    │   └── formatting.ts           Currency, date, time
    ├── stores/                     Zustand: auth, cart, posSession, ui
    ├── types/                      api, auth, pos, cart, common
    └── features/
        ├── auth/                   LoginForm, ProtectedRoute, useAuth, authService
        ├── pos/                    ProductGrid, CartPanel, BarcodeScanner,
        │                           PaymentModal, Opening/ClosingCashModal,
        │                           ExpenseModal, useSessionHeartbeat
        ├── inventory/              ItemList, ItemDetail, InventoryTable,
        │                           CreateItem/EditInventoryItem/StockEntry/
        │                           ImportItems modals
        └── returns/                ReturnScreen
```

> **Warning — `front/api.py`**
> The file `front/api.py` is a **staging copy** of the backend `swift_core/api.py`. It is not executed by the frontend and is not part of the Next.js build. It exists because the development workflow edits the backend here and then copies the file into the bench. It is listed in `.gitignore`. When reading backend code, the authoritative file is the one inside the bench, and the two must be kept identical. See `12_Developer_Guide.md`.

---

## Design Philosophy

**Reuse ERPNext; do not reimplement it.** Swift never writes a Stock Ledger Entry or a GL Entry directly. It builds standard ERPNext documents, populates them, and calls `.insert()` and `.submit()`, letting ERPNext's controllers do the accounting. Returns use `erpnext.controllers.sales_and_purchase_return.make_return_doc`. This is why the system's books are correct without Swift containing any accounting code.

**Configuration over hardcoding.** Company, warehouse, price list, cost center, currency, and payment modes are resolved at request time from `Swift POS Settings` and the linked `POS Profile`. No endpoint hardcodes a business value. (Two documented violations exist in `low_stock.py`; see `17_Troubleshooting.md`.)

**No custom transactional doctypes.** Swift adds exactly one DocType — `Swift POS Settings`, a Single used purely as a configuration root. Every transaction is a native ERPNext document. This keeps ERPNext reports, dashboards, and future upgrades working.

**The API is the contract.** The frontend has no direct database access and no server-side rendering of business data. Every screen is driven by whitelisted methods under `swift_core.api`. Permissions are enforced on the server; the frontend's role checks are conveniences, not security.

**Fail loudly on stock.** Negative stock is not permitted. A sale for which stock is insufficient fails at submit time rather than silently going negative.

---

## Version and Release Status

| Field | Value |
|---|---|
| `swift_core` version | `0.0.1` (`swift_core/__init__.py`) |
| Frontend version | `1.0.0` (`package.json`) |
| Maturity | **Pre-1.0 / active development.** Version numbers are inconsistent between the two halves and have not been managed as releases. |
| License | MIT (`license.txt`, `pyproject.toml`) |
| Publisher | moustafa (`moustafa@swift.com`) |
| Automated test coverage | **Zero.** |
| CI | Configured in the bench-scaffolded README but not wired to this repository. |

> **Warning**
> This system has no automated test suite and no migration patches. Both facts materially affect how safely it can be changed. Read `12_Developer_Guide.md` before modifying backend code, and `17_Troubleshooting.md` before deploying.

---

## Implemented Modules

`modules.txt` declares a single Frappe module, `swift`, which contains only `Swift POS Settings`. The functional modules below are organizational, not Frappe modules:

| Functional area | Implemented in | Covered by |
|---|---|---|
| Authentication & session | `api.py` (`login` … `session_close`) | `06_Authentication.md` |
| POS selling | `api.py` (`item_by_barcode`, `item_search`, `create_invoice`) | `07_POS_Workflow.md`, `08_Sales_Workflow.md` |
| Returns | `api.py` (`get_invoice`, `create_return`) | `09_Return_Workflow.md` |
| Inventory & stock | `api.py` (`create_item` … `create_stock_entry`, import/export) | `10_Stock_Workflow.md` |
| Configuration | `Swift POS Settings` + `POS Profile` | `04_Database.md`, `15_Fixtures.md` |
| Alerting | `stock/low_stock.py` | `17_Troubleshooting.md` |

---

## Where to Go Next

| If you want to… | Read |
|---|---|
| Understand how the pieces fit together | `01_System_Architecture.md` |
| Work on backend code | `02_Backend.md`, then `05_API.md` |
| Work on frontend code | `03_Frontend.md` |
| Understand the data model | `04_Database.md` |
| Get it running locally | `11_Deployment.md`, then `12_Developer_Guide.md` |
| Fix something that is broken | `17_Troubleshooting.md` |
