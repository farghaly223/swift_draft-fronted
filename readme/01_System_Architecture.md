# 01 — System Architecture

## The Big Picture

Swift is a two-process system. A Next.js application renders the entire user interface and holds no business logic; a Frappe app holds all business logic and owns the database. They communicate over HTTP with cookie-based sessions.

```mermaid
graph TB
    subgraph Browser["Browser — Cashier / Storekeeper"]
        UI["Next.js 14 App Router<br/>React 18 + Zustand + TanStack Query"]
        LS["localStorage<br/>device UUID only"]
    end

    subgraph FrappeHost["Frappe Host"]
        WS["Werkzeug / Gunicorn"]
        FW["Frappe Framework v15<br/>auth, permissions, ORM"]
        SC["swift_core.api<br/>30 whitelisted methods"]
        EN["ERPNext v15<br/>stock + accounting controllers"]
        SCH["Scheduler<br/>daily low-stock alert"]
    end

    DB[("MariaDB")]
    RD[("Redis<br/>cache / queue")]

    UI -->|"HTTPS + sid cookie<br/>+ X-Frappe-CSRF-Token<br/>+ X-Device-Id"| WS
    UI -->|"window.open /printview"| WS
    LS -.->|"read on each request"| UI
    WS --> FW --> SC --> EN
    EN --> DB
    FW --> DB
    FW --> RD
    SCH --> DB
```

**Two properties of this diagram matter most.**

First, the arrow from `swift_core.api` to ERPNext is one-directional and total: Swift calls ERPNext controllers, and ERPNext writes to the database. Swift itself performs almost no direct writes to transactional tables. Second, printing bypasses the frontend entirely — the browser opens Frappe's own print view on the Frappe origin, which is why receipt assets resolve correctly.

---

## Backend Architecture

### Application Structure

`swift_core` is a standard Frappe app with a deliberately flat interior.

```
swift_core/
├── hooks.py       ← Frappe reads this to discover the app
├── api.py         ← every endpoint and every helper (~2,783 lines)
├── stock/
│   └── low_stock.py
└── swift/doctype/swift_pos_settings/
```

`hooks.py` is almost entirely commented-out boilerplate. Only two declarations are active:

```python
fixtures = [
    {"dt": "Role"}, {"dt": "Role Profile"}, {"dt": "Workspace"},
    {"dt": "Module Def"}, {"dt": "Item Group"}, {"dt": "Price List"},
    {"dt": "Mode of Payment"}, {"dt": "POS Profile"},
    {"dt": "Custom Field", "filters": [["dt", "in", ["Sales Invoice"]]]},
]

scheduler_events = {
    "daily": ["swift_core.stock.low_stock.check_low_stock"]
}
```

There are **no document event hooks**. Swift does not subscribe to `on_submit`, `validate`, or any other ERPNext document lifecycle event. All behaviour is initiated by an HTTP request. This is important when debugging: if something happens to a document, an API call caused it, not a hook.

### There Is No Service Layer

This is the single most consequential structural fact about the backend, and it should be understood before reading any code.

`api.py` contains three kinds of function, interleaved in one file:

| Kind | Marker | Count | Reachable from HTTP |
|---|---|---|---|
| Endpoints | `@frappe.whitelist()` | 30 | Yes |
| Private helpers | leading `_` | ~30 | No |
| Shared resolvers | no underscore, not whitelisted | several | No |

There is no `services/`, no `controllers/`, no per-domain module. Business logic lives directly inside the endpoint functions, with common concerns factored into helpers in the same file.

> **Note**
> This is not a recommendation — it is a description. Splitting `api.py` is listed as technical debt in `18_Future_Roadmap.md`. Until that happens, treat "the backend" and "`api.py`" as synonyms.

### Layered View of a Request

Even without a service layer, every write endpoint follows the same internal sequence. Understanding this five-step shape makes all 30 endpoints readable:

```mermaid
graph LR
    A["1. Role gate<br/>require_role()"] --> B["2. Config resolve<br/>resolve_config()"]
    B --> C["3. Input validation<br/>frappe.throw on bad input"]
    C --> D["4. Build ERPNext doc<br/>get_doc / make_return_doc"]
    D --> E["5. insert + submit<br/>ERPNext posts SLE + GL"]
```

1. **Role gate.** `require_role("Swift Cashier")` or `_require_any_role(...)` raises `frappe.PermissionError` before anything else happens.
2. **Config resolve.** `resolve_config()` reads `Swift POS Settings`, follows the link to the `POS Profile`, and returns company, warehouse, price list, currency, cost center, and payment modes. No business value is hardcoded.
3. **Input validation.** Explicit `frappe.throw()` calls with translated messages.
4. **Document construction.** A native ERPNext document is built in memory.
5. **Submit.** `.insert()` then `.submit()`. ERPNext's controllers post the Stock Ledger Entries and GL Entries.

### Configuration Resolution

Configuration is a two-hop lookup, and both hops are required:

```mermaid
graph LR
    S["Swift POS Settings<br/>(Single DocType)"] -->|default_pos_profile| P["POS Profile<br/>'Main POS'"]
    S -->|default_company| C["Company"]
    S -->|default_price_list| L["Price List"]
    P -->|warehouse| W["Warehouse"]
    P -->|cost_center| CC["Cost Center"]
    P -->|payments| M["Modes of Payment"]
    P -->|currency| CU["Currency"]
```

`Swift POS Settings` is a Frappe **Single** — one row, no name, edited in the desk. It holds six fields; the three `reqd` links are the entry point to everything else. See `04_Database.md`.

> **Warning**
> The warehouse resolved from the POS Profile is `Stores - S`, which in the reference configuration is a **group** warehouse. Group warehouses cannot hold stock. Swift works around this at runtime by resolving a real leaf warehouse per line (`_sale_warehouse`). This workaround, and the bug it once caused on returns, is documented in `09_Return_Workflow.md` and `17_Troubleshooting.md`.

### Security Model

Three independent layers, all server-side:

| Layer | Mechanism | Enforced by |
|---|---|---|
| Authentication | `sid` session cookie | Frappe |
| CSRF | `X-Frappe-CSRF-Token` header on writes | Frappe |
| Authorization | `require_role()` / `_require_any_role()` at the top of each endpoint | `swift_core` |

Frappe's own DocType permission system is a fourth layer, but Swift partially bypasses it with `ignore_permissions=True` on specific document operations. The rationale — and why that is defensible here — is explained in `02_Backend.md` and `14_Permissions.md`.

---

## Frontend Architecture

### Component Hierarchy

```mermaid
graph TD
    RL["app/layout.tsx<br/>root"] --> PR["providers.tsx<br/>QueryClientProvider + ToastContainer"]
    PR --> AG["(auth) group"]
    PR --> PG["(protected) group"]

    AG --> LP["login/page.tsx → LoginForm"]

    PG --> PRT["ProtectedRoute<br/>authenticated?"]
    PRT --> SG["SessionGate<br/>cashier has open shift?"]
    SG --> POS["pos/page.tsx"]
    SG --> INV["inventory/page.tsx"]
    SG --> RET["returns/page.tsx"]

    POS --> BS["BarcodeScanner"]
    POS --> PGrid["ProductGrid"]
    POS --> CP["CartPanel"]
    POS --> PM["PaymentModal"]
    POS --> EM["ExpenseModal"]
    POS --> CCM["ClosingCashModal"]
    SG -.->|"no open shift"| OCM["OpeningCashModal"]

    INV --> IT["InventoryTable"]
    INV --> IIM["ImportItemsModal"]
    INV --> CIM["CreateItemModal"]
    INV --> EIM["EditInventoryItemModal"]
    INV --> SEM["StockEntryModal"]

    RET --> RS["ReturnScreen"]
```

The `(protected)` layout composes two gates in sequence. `ProtectedRoute` answers "is there a valid session?" by calling `me()`. `SessionGate` then answers, **for cashiers only**, "is there an open shift?" — and if not, it renders `OpeningCashModal` non-dismissibly over a blocking spinner. A cashier physically cannot reach the POS screen without opening a shift. Storekeepers skip the second gate entirely.

### State Management

State is split across two systems by ownership, which is the cleanest thing about the frontend:

| System | Owns | Stores / keys |
|---|---|---|
| **Zustand** | Client-only state | `authStore`, `cartStore`, `posSessionStore`, `uiStore` |
| **TanStack Query** | Server-owned state | `["item_search", …]`, inventory queries |

**No Zustand store uses `persist` middleware.** Nothing survives a page reload except the device UUID in `localStorage`. Auth state is rehydrated by calling `me()` on mount. This is correct for a cookie-based system: the cookie is the source of truth, and a stale client-side "logged in" flag can never contradict it.

Query defaults (`providers.tsx`):

```ts
staleTime: 5 * 60 * 1000,   // 5 minutes
gcTime:   10 * 60 * 1000,   // 10 minutes
retry: 1,
refetchOnWindowFocus: false,
```

`refetchOnWindowFocus: false` is deliberate for a POS: a cashier switching windows must not trigger a refetch that reorders the product grid mid-transaction.

### Data Fetching

Every request goes through one axios instance (`lib/axios.ts`) wrapped by one typed module (`lib/api.ts`). No component calls `fetch` or constructs a URL. The axios instance applies four transformations:

```mermaid
sequenceDiagram
    participant C as Component
    participant A as lib/api.ts
    participant X as axios interceptor
    participant F as Frappe

    C->>A: frappeApi.createInvoice({...})
    A->>X: POST /api/method/swift_core.api.create_invoice
    Note over X: 1. attach X-Device-Id
    Note over X: 2. fetch + attach CSRF token (writes only)
    Note over X: 3. encode body as x-www-form-urlencoded
    X->>F: HTTP request + sid cookie
    F-->>X: {"message": {...}}
    Note over X: 4. unwrap .message
    X-->>A: response.data = {...}
    A-->>C: typed result
```

Two details are worth internalising:

**Form encoding.** Frappe whitelisted methods expect `application/x-www-form-urlencoded`, not JSON. The request interceptor converts object bodies into `URLSearchParams`, `JSON.stringify`-ing any nested object or array. This is why `items` and `payments` arrive at the backend as JSON strings and every endpoint that accepts them calls `json.loads` on a string input.

**Response unwrapping.** Frappe wraps every whitelisted return value in `{"message": ...}`. The response interceptor strips that wrapper, so `response.data` is the payload itself.

### Error Handling

`extractFrappeError()` (`lib/utils.ts`) normalises Frappe's several error shapes into one string, in priority order:

1. `_server_messages` — a JSON-encoded array of JSON-encoded objects (Frappe's `frappe.throw` format). Double-parsed.
2. `exception` — first line, with the leading exception class stripped.
3. `message` — if a plain string.
4. `statusText`, then generic fallbacks.

The response interceptor additionally handles two statuses globally:

- **400 with `/csrf/i` in the body** → clear the cached token, fetch a fresh one, retry **once**. The match is deliberately narrow: Frappe returns 400 for ordinary validation failures too, and a blanket 400 retry would double-submit invoices.
- **401** → clear the token, clear `authStore`, hard-redirect to `/login`.

---

## The Request/Response Cycle

A complete round trip, using invoice creation as the example:

```mermaid
sequenceDiagram
    participant U as Cashier
    participant R as React
    participant Z as Zustand cartStore
    participant Q as axios
    participant W as Frappe HTTP
    participant P as swift_core.api
    participant E as ERPNext
    participant D as MariaDB

    U->>R: Confirm Payment
    R->>Z: read items, customer
    R->>Q: frappeApi.createInvoice(payload)
    Q->>Q: X-Device-Id, CSRF, urlencode
    Q->>W: POST …api.create_invoice
    W->>W: validate sid cookie + CSRF
    W->>P: dispatch to whitelisted method
    P->>P: require_role("Swift Cashier")
    P->>P: resolve_config()
    P->>P: validate items, resolve warehouses
    P->>E: Sales Invoice(is_pos=1).insert()
    P->>E: .submit()
    E->>D: INSERT Stock Ledger Entry
    E->>D: INSERT GL Entry
    E->>D: UPDATE Bin
    E-->>P: submitted doc
    P-->>W: {"message": {invoice, grand_total, …}}
    W-->>Q: 200 JSON
    Q->>Q: unwrap .message
    Q-->>R: typed InvoiceResult
    R->>U: show total + change
    U->>R: New Sale
    R->>W: window.open(/printview?…&format=Swift)
    R->>Z: clearCart()
    R->>Q: invalidateQueries(["item_search"])
```

On failure at any server step, Frappe rolls back the transaction, returns a non-2xx with `_server_messages`, `extractFrappeError` unwraps it, and the modal shows the message with the cart intact so the cashier can retry.

---

## Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant L as LoginForm
    participant S as authStore
    participant A as api.login
    participant F as Frappe

    U->>L: email + password
    L->>S: login(email, password)
    S->>S: setCsrfToken(null)
    S->>A: POST api.login (allow_guest)
    A->>F: frappe.local.login_manager.authenticate()
    F-->>A: session established, sid cookie
    A-->>S: {user, role, full_name, sid}
    S->>S: setCsrfToken(null) — new session, new token
    S->>S: isAuthenticated = true
    S->>U: router.push(getRedirectForRole(role))
```

`login` is the only `allow_guest` endpoint and the only one exempt from the CSRF interceptor — it necessarily runs before a session exists. The CSRF token is cleared twice, before and after, because a new session invalidates any token cached from a previous one (including one from a Frappe desk session in another tab).

Role determines the landing route:

| Role | Redirect |
|---|---|
| `Swift Cashier` | `/pos` |
| `Swift Storekeeper` | `/inventory` |
| anything else | `/login` |

Full detail in `06_Authentication.md`.

---

## POS Flow

```mermaid
stateDiagram-v2
    [*] --> LoggedIn
    LoggedIn --> ShiftClosed: role = Swift Cashier
    ShiftClosed --> ShiftOpen: session_open(amount)<br/>POS Opening Entry submitted
    ShiftOpen --> Selling
    Selling --> Selling: scan / search / add to cart
    Selling --> Paying: Confirm Payment
    Paying --> Selling: create_invoice → Sales Invoice submitted
    Selling --> Expense: record cash expense
    Expense --> Selling: Journal Entry tagged [POS:<opening>]
    Selling --> ShiftClosed: session_close(counted)<br/>POS Closing Entry submitted
    ShiftClosed --> [*]
```

A heartbeat fires every 30 seconds while a shift is open (`useSessionHeartbeat`), keeping the session's last-activity timestamp current. Full detail in `07_POS_Workflow.md`.

## Sales Flow

The sale is one submitted document, and ERPNext does the posting:

```mermaid
graph LR
    A["create_invoice"] --> B["Sales Invoice<br/>is_pos=1, update_stock=1"]
    B --> C["submit()"]
    C --> D["Stock Ledger Entry<br/>qty out"]
    C --> E["GL Entry<br/>Dr Cash / Cr Income<br/>Dr COGS / Cr Stock"]
    C --> F["Bin.actual_qty updated"]
    C --> G["Payment applied<br/>invoice marked Paid"]
```

Detail in `08_Sales_Workflow.md`.

## Return Flow

```mermaid
graph LR
    A["get_invoice(SI number)"] --> B{"submitted?<br/>≤ 5 days?<br/>qty remaining?"}
    B -->|no| X["throw"]
    B -->|yes| C["operator selects items + qty"]
    C --> D["create_return"]
    D --> E["make_return_doc()"]
    E --> F["set_warehouse = None<br/>per-row warehouse from original"]
    F --> G["clamp qty, trim serials"]
    G --> H["submit → negative SI<br/>is_return = 1"]
    H --> I["stock returned<br/>GL reversed"]
```

Returns are keyed on invoice number only. The `set_warehouse = None` step is not cosmetic: without it, ERPNext pushes the POS Profile's group warehouse down onto every row and the Stock Ledger Entry is rejected. Detail in `09_Return_Workflow.md`.

## Inventory Flow

```mermaid
graph TD
    A["Storekeeper"] --> B["Manual: create/edit item, barcodes, stock entry"]
    A --> C["Bulk: upload .xlsx"]
    C --> D["inventory_import_preview<br/>parse, normalize, validate, dedupe"]
    D --> E{"operator reviews"}
    E -->|confirm| F["inventory_import_commit"]
    F --> G["create/update Item"]
    F --> H["generate barcode if missing"]
    F --> I["create Supplier if missing"]
    F --> J["set Item Price"]
    F --> K["Stock Reconciliation per item<br/>absolute qty, idempotent"]
    A --> L["inventory_export → .xlsx"]
```

Import is deliberately two-phase: preview computes and validates everything without writing, and commit re-does the work transactionally with a per-item savepoint so one bad row cannot abort the batch. Detail in `10_Stock_Workflow.md`.

## Print Flow

```mermaid
sequenceDiagram
    participant R as PaymentModal
    participant B as Browser
    participant F as Frappe

    R->>B: window.open(FRAPPE_URL/printview?<br/>doctype=Sales Invoice&name=…<br/>&trigger_print=1&format=Swift)
    B->>F: GET printview (sid cookie sent)
    F-->>B: rendered HTML + letterhead assets
    B->>B: injected window.print()
    B->>B: window closes itself
```

The receipt is **not** rendered by React. It is Frappe's own print view, opened as a real window on the Frappe origin. Two reasons, both learned from failures:

1. **Origin.** Letterhead assets are stored root-relative (`/files/...`). Inside an iframe on `localhost:3000` they resolve against the wrong host and the logo breaks.
2. **Viewport width.** The browser derives print scale from layout width. A narrow popup produced a different scale than the desk's full-width print page, so fonts and receipt size came out wrong.

`trigger_print=1` makes Frappe inject `window.print()` and a self-close. Detail in `16_Printing.md`.

---

## Architectural Constraints

These are enforced rules for anyone extending the system. Violating them breaks the guarantees above.

| Constraint | Reason |
|---|---|
| Do not create custom transactional DocTypes | Native documents keep ERPNext reporting and upgrades working |
| Do not write Stock Ledger Entries or GL Entries directly | ERPNext controllers own posting; manual writes desynchronise the books |
| Do not bypass ERPNext validation | Validation is what prevents negative stock and unbalanced entries |
| Do not enable "Allow Negative Stock" | A sale with insufficient stock must fail |
| Do not hardcode company, warehouse, price list, UOM, or item group | All must resolve from configuration |
| Do not use raw SQL unless unavoidable | The ORM applies permissions and keeps the cache coherent |
| Keep `POS Opening/Closing Entry` for shifts only | They must not post stock, GL, payments, or consolidated invoices |
