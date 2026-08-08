# 05 — API Reference

## Conventions

Everything in this section applies to **all 30 endpoints**. It is not repeated per endpoint.

### Base URL

```
{FRAPPE_HOST}/api/method/swift_core.api.{function_name}
```

`FRAPPE_HOST` is **environment-specific**. Locally it is typically `http://localhost:8000`; in production it is your Frappe site's HTTPS origin. The frontend reads it from `NEXT_PUBLIC_FRAPPE_URL`.

There is no API version segment in the path.

### Request Encoding

Write requests must be `application/x-www-form-urlencoded`, **not JSON**. This is a Frappe requirement. Nested values (arrays, objects) must be JSON-encoded strings within form fields:

```
items=[{"item_code":"ITEM-001","qty":2,"rate":150}]&payments=[{"mode_of_payment":"Cash","amount":300}]
```

The frontend's axios interceptor does this automatically. Direct API consumers must do it themselves.

### Response Envelope

Frappe wraps every successful return value:

```json
{ "message": { "...": "actual payload" } }
```

All examples below show the **payload only** — the contents of `message`. The frontend's response interceptor strips the envelope.

### Authentication

Every endpoint except `login` requires a valid `sid` session cookie. Send cookies with every request (`withCredentials: true` in axios).

Write requests (POST/PUT/DELETE) additionally require the `X-Frappe-CSRF-Token` header. Obtain it from `/api/method/frappe.sessions.get_csrf_token`.

### Standard Headers

| Header | When | Value |
|---|---|---|
| `Cookie: sid=…` | All except `login` | Session cookie |
| `X-Frappe-CSRF-Token` | POST/PUT/DELETE except `login` | CSRF token |
| `X-Device-Id` | All | Client-generated UUID |
| `Content-Type` | POST/PUT/DELETE | `application/x-www-form-urlencoded` |

### Universal Error Shape

Frappe returns errors as:

```json
{
  "exception": "frappe.exceptions.ValidationError: Item ITEM-999 not found.",
  "exc_type": "ValidationError",
  "_server_messages": "[\"{\\\"message\\\": \\\"Item ITEM-999 not found.\\\", \\\"title\\\": \\\"Message\\\"}\"]"
}
```

`_server_messages` carries the human-readable text and is what clients should display.

### Universal Status Codes

| Code | Meaning | Raised by |
|---|---|---|
| `200` | Success | — |
| `400` | Bad request / CSRF failure | Frappe |
| `401` | Invalid credentials | `login` only |
| `403` | Not authenticated, or role gate failed | Frappe / `require_role` |
| `404` | Named record not found | Explicit in endpoint |
| `405` | Wrong HTTP method | Frappe |
| `409` | Business conflict (out of stock, no shift, device clash) | Explicit in endpoint |
| **`417`** | **`frappe.throw()` — any validation failure** | Frappe default |
| `500` | Unhandled exception | Frappe |

> **Note — Why 417**
> Frappe returns **HTTP 417 Expectation Failed** for every `frappe.throw()` that does not explicitly set a status code. This is unusual but it is Frappe's documented behaviour. Most validation errors in this API therefore arrive as 417, not 400. Endpoints that override it (404, 409) are called out individually below.

### Permission Summary

| Gate | Endpoints |
|---|---|
| *(guest)* | `login` |
| Authenticated only | `logout`, `me` |
| `Swift Cashier` | `session_current`, `session_open`, `session_heartbeat`, `session_close`, `item_by_barcode`, `item_search`, `create_invoice`, `create_return`, `get_invoice`, `session_invoices`, `create_expense` |
| `Swift Storekeeper` | `create_item`, `update_item`, `validate_barcode`, `add_item_barcode`, `remove_item_barcode`, `add_serial_number`, `create_stock_entry`, `get_stock_entry`, `list_warehouses`, `list_import_warehouses`, `list_item_groups`, `list_suppliers`, `inventory_import_preview`, `inventory_import_commit`, `inventory_list`, `inventory_export`, `update_inventory_item` |
| Either role | `get_item`, `pos_config` |

`System Manager` and `Administrator` satisfy every gate.

---

# Authentication

## `login`

Authenticates a user and establishes a session.

| | |
|---|---|
| **Method** | `POST` |
| **Route** | `/api/method/swift_core.api.login` |
| **Permission** | **Guest** — the only unauthenticated endpoint |
| **Source** | `api.py:94` |

### Parameters

| Name | Type | Required |
|---|---|---|
| `email` | string | Yes |
| `password` | string | Yes |

### Request

```http
POST /api/method/swift_core.api.login
Content-Type: application/x-www-form-urlencoded

email=cashier@swift.com&password=<password>
```

### Success — `200`

```json
{
  "user": "cashier@swift.com",
  "role": "Swift Cashier",
  "full_name": "Ahmed Hassan",
  "sid": "a1b2c3d4e5f6..."
}
```

Frappe sets the `sid` cookie on this response.

### Errors

| Code | Condition | Message |
|---|---|---|
| `417` | Missing email or password | `Email and password are required.` |
| `401` | Wrong credentials | `Invalid credentials.` |
| `417` | Valid user, but no Swift role | `User has no Swift role assigned (Cashier/Storekeeper).` |

### Business Logic

1. Both parameters required.
2. `frappe.auth.LoginManager().authenticate()` then `.post_login()` — Swift implements no password handling of its own.
3. Reads `frappe.get_roles()` and resolves a **single** role: `Swift Cashier` wins if present, else `Swift Storekeeper`, else `None`.
4. A user with neither role is **rejected even though their credentials are valid**. They cannot use the app.

> **Note**
> `role` is one string, not a list. A user holding both Swift roles is reported as `Swift Cashier`, and the frontend will route them to `/pos`. There is no UI for a dual-role user.

### Workflow Impact

Creates a Frappe session. Does **not** open a POS shift — cashiers must then call `session_open`.

---

## `logout`

| | |
|---|---|
| **Method** | `POST` · **Route** `…api.logout` · **Permission** Authenticated · **Source** `api.py:122` |

### Success — `200`

```json
{ "success": true }
```

Calls `frappe.local.login_manager.logout()` and commits. Invalidates the session and clears the cookie. Does **not** close an open POS shift — a cashier who logs out mid-shift still has an open `POS Opening Entry`.

**Errors:** `403` if not authenticated.

---

## `me`

Returns the current identity. Used by the frontend to rehydrate auth state on page load.

| | |
|---|---|
| **Method** | `GET` · **Route** `…api.me` · **Permission** Authenticated · **Source** `api.py:129` |

### Success — `200`

```json
{
  "user": "cashier@swift.com",
  "role": "Swift Cashier",
  "full_name": "Ahmed Hassan"
}
```

`role` may be `null` for an authenticated user with no Swift role. Unlike `login`, this does **not** throw — the frontend treats `null` as "not a Swift user" and `getRedirectForRole` sends them to `/login`.

**Errors:** `403` if not authenticated. This is the expected response for a logged-out visitor and is handled silently by `checkAuth`.

---

# Session Management

## `session_current`

| | |
|---|---|
| **Method** | `GET` · **Route** `…api.session_current` · **Permission** `Swift Cashier` · **Source** `api.py:157` |

### Success — no open shift

```json
{ "exists": false }
```

### Success — open shift

```json
{
  "exists": true,
  "opening_entry": "POS-OPE-2026-00042",
  "opening_time": "2026-08-02 09:15:33.482910",
  "opening_amount": 500.0
}
```

`opening_amount` is taken from `balance_details[0].opening_amount`, defaulting to `0` when the table is empty.

### Business Logic

Queries `POS Opening Entry` for `user = <session user>`, `status = "Open"`, `docstatus = 1`. This drives `SessionGate` — a `false` result renders the non-dismissible opening modal.

**Errors:** `403` if not a cashier.

---

## `session_open`

Opens a shift.

| | |
|---|---|
| **Method** | `POST` · **Route** `…api.session_open` · **Permission** `Swift Cashier` · **Source** `api.py:176` |

### Parameters

| Name | Type | Required | Constraint |
|---|---|---|---|
| `opening_amount` | number | Yes | ≥ 0 |

### Request

```http
POST /api/method/swift_core.api.session_open
Content-Type: application/x-www-form-urlencoded
X-Device-Id: 3f9c1e2a-...

opening_amount=500
```

### Success — `200`

```json
{
  "opening_entry": "POS-OPE-2026-00042",
  "period_start_date": "2026-08-02 09:15:33.482910",
  "status": "Open"
}
```

If a shift is already open for this user, the endpoint returns `session_current()`'s payload instead — shape `{exists, opening_entry, opening_time, opening_amount}`.

> **Warning — Response Shape Is Not Stable**
> On the reconnect path the response has **different keys** (`opening_time` rather than `period_start_date`, plus `exists`). Clients must tolerate both. This is also the source of a frontend defect: `posSessionStore` reads `data.period_start_date` while the TypeScript type declares `period_start_time`. See `03_Frontend.md`.

### Errors

| Code | Condition | Message |
|---|---|---|
| `417` | `opening_amount` omitted | `opening_amount is required.` |
| `417` | Negative amount | `opening_amount must be zero or positive.` |
| `409` | Open shift on another device | `An active session already exists on another device.` |
| `417` | POS Profile has no payment mode | `POS Profile has no Mode of Payment configured.` |
| `403` | Not a cashier | — |

### Business Logic

1. Validate the amount.
2. **Reconnect guard** — an existing open shift returns that shift rather than erroring or duplicating.
3. Load settings, POS Profile, and `X-Device-Id`.
4. **Multi-device guard** — if `allow_multi_device_session = 0`, reject when an open shift exists with a different `custom_device_id`.
5. Build `POS Opening Entry`: `period_start_date = now`, company/profile from config, `user` forced to the session user, one `balance_details` row for the profile's first payment mode, `custom_device_id` set.
6. `insert(ignore_permissions=True)` then `submit()`.

`user` is forced server-side, so a cashier cannot open a shift as somebody else.

### Workflow Impact

Unblocks the POS screen. Every subsequent `create_invoice` links to this entry via `custom_pos_opening_entry`.

---

## `session_heartbeat`

| | |
|---|---|
| **Method** | `POST` · **Route** `…api.session_heartbeat` · **Permission** `Swift Cashier` · **Source** `api.py:241` |

### Parameters

| Name | Type | Required | Allowed values |
|---|---|---|---|
| `opening_entry` | string | No | — |
| `state` | string | No (default `"idle"`) | `cart_active`, `payment_open`, `idle` |

### Success — `200`

```json
{ "acknowledged": true }
```

### Errors

| Code | Condition | Message |
|---|---|---|
| `417` | Invalid state | `Invalid state value.` |
| `417` | No session, or name mismatch | `No matching active session.` |

Writes `custom_last_heartbeat` and `custom_heartbeat_state` with `update_modified=False`, so heartbeats do not churn the document's modified timestamp.

> **Warning**
> The heartbeat's only consumer is `auto_close_inactive_sessions()`, which is **not scheduled**. The endpoint works and is called every 30 seconds by the frontend, but currently has **no functional effect**. See `17_Troubleshooting.md`.

---

## `session_close`

Closes a shift and reconciles cash.

| | |
|---|---|
| **Method** | `POST` · **Route** `…api.session_close` · **Permission** `Swift Cashier` · **Source** `api.py:345` |

### Parameters

| Name | Type | Required | Constraint |
|---|---|---|---|
| `closing_amount` | number | Yes | ≥ 0 |

### Success — `200`

```json
{
  "closing_entry": "POS-CLO-2026-00038",
  "expected_amount": 1450.0,
  "difference": -50.0,
  "status": "Closed"
}
```

`difference` = counted − expected. Negative means the drawer is short.

### Errors

| Code | Condition |
|---|---|
| `417` | `closing_amount` missing or negative |
| `417` | No open shift for this user |
| `403` | Not a cashier |
| `417` | ERPNext validation failure on the closing entry |

### Business Logic

1. Validate amount; require an open shift.
2. `_build_closing_from_opening()`:
   - Sum cash from submitted `Sales Invoice` records linked via `custom_pos_opening_entry`.
   - Subtract Journal Entries tagged `[POS:<opening_name>]` in `user_remark`.
   - Fill `payment_reconciliation` with expected vs counted.
   - Leave `pos_transactions` **empty** — populating it would trigger POS-Invoice consolidation and double-post stock and GL.
3. Submit the closing entry; the opening's status becomes `Closed`.

> **Warning**
> The response does **not** include `total_expenses`, but `ClosingCashModal` reads it to render the "Expenses (deducted)" row. That row therefore never appears. The `difference` shown is correct; only the explanation is missing. See `03_Frontend.md`.

### Workflow Impact

Ends the shift. The frontend logs the cashier out afterwards.

---

# Selling

## `item_by_barcode`

| | |
|---|---|
| **Method** | `GET` · **Route** `…api.item_by_barcode` · **Permission** `Swift Cashier` · **Source** `api.py:451` |

### Parameters

| Name | Type | Required |
|---|---|---|
| `barcode` | string | Yes |

### Request

```http
GET /api/method/swift_core.api.item_by_barcode?barcode=6221031492013
```

### Success — `200`

```json
{
  "item_code": "ITEM-001",
  "item_name": "Brake Pad Set",
  "rate": 250.0,
  "uom": "Nos",
  "stock_qty": 14.0,
  "image": "/files/brake-pad.jpg"
}
```

### Errors

| Code | Condition |
|---|---|
| `404` | No item owns that barcode |
| `417` | Item is disabled |
| `403` | Not a cashier |

`rate` resolves from the configured price list; `stock_qty` is summed across the company's leaf warehouses. `image` may be `null`.

### Workflow Impact

The primary path for adding items at the counter. `stock_qty` is what `cartStore.addItem` clamps against.

---

## `item_search`

| | |
|---|---|
| **Method** | `GET` · **Route** `…api.item_search` · **Permission** `Swift Cashier` · **Source** `api.py:499` |

### Parameters

| Name | Type | Required | Notes |
|---|---|---|---|
| `q` | string | No | Matches item code, item name, or barcode |

### Success — `200`

```json
[
  {
    "item_code": "ITEM-001",
    "item_name": "Brake Pad Set",
    "rate": 250.0,
    "uom": "Nos",
    "stock_qty": 14.0,
    "image": "/files/brake-pad.jpg"
  },
  {
    "item_code": "ITEM-002",
    "item_name": "Oil Filter",
    "rate": 85.0,
    "uom": "Nos",
    "stock_qty": 0.0,
    "image": null
  }
]
```

Returns an **array** (possibly empty), not an object. Disabled items are excluded; zero-stock items are included so the grid can show them as unavailable.

Cached by TanStack Query under `["item_search", q]` and invalidated after every sale.

---

## `create_invoice`

**The most important endpoint in the system.** Creates and submits the sale.

| | |
|---|---|
| **Method** | `POST` · **Route** `…api.create_invoice` · **Permission** `Swift Cashier` · **Source** `api.py:532` |

### Parameters

| Name | Type | Required | Notes |
|---|---|---|---|
| `items` | JSON array | Yes | `[{item_code, qty, rate?}]` |
| `payments` | JSON array | Yes | `[{mode_of_payment, amount?}]` |
| `customer` | string | No | Defaults to `POS Profile.customer` |

### Request

```http
POST /api/method/swift_core.api.create_invoice
Content-Type: application/x-www-form-urlencoded
X-Frappe-CSRF-Token: <token>

items=[{"item_code":"ITEM-001","qty":2,"rate":250},{"item_code":"ITEM-002","qty":1,"rate":85}]&payments=[{"mode_of_payment":"Cash","amount":585}]
```

### Success — `200`

```json
{
  "invoice": "ACC-SINV-2026-00187",
  "grand_total": 585.0,
  "net_total": 585.0,
  "taxes": [],
  "status": "Paid",
  "stock_warnings": []
}
```

With taxes configured:

```json
{
  "invoice": "ACC-SINV-2026-00188",
  "grand_total": 672.75,
  "net_total": 585.0,
  "taxes": [
    { "description": "VAT 15%", "tax_amount": 87.75, "rate": 15.0 }
  ],
  "status": "Paid",
  "stock_warnings": []
}
```

### Errors

| Code | Condition | Message |
|---|---|---|
| `417` | Empty `items` | `items array cannot be empty.` |
| `417` | Empty `payments` | `payments array cannot be empty.` |
| **`409`** | No open shift | `No active POS session — open a shift first.` |
| `417` | Line missing fields | `Each item requires item_code and qty.` |
| `417` | Non-positive qty | `Quantity must be greater than zero.` |
| `404` | Unknown item | `Item {0} not found.` |
| `417` | Disabled item | `Item {0} is disabled.` |
| **`409`** | Zero stock | `{0} is out of stock.` |
| **`409`** | Insufficient stock | `Only {0} of {1} available in stock.` |
| **`409`** | Stock split across warehouses | `{0} has {1} in stock but not in a single warehouse. Transfer stock before selling.` |
| `417` | Payment missing mode | `Each payment requires mode_of_payment.` |
| `417` | ERPNext validation failure | varies |
| `403` | Not a cashier | — |

### Business Logic

1. Parse JSON arrays; reject empty.
2. **Require an open shift** → `409`.
3. `resolve_config()`.
4. Build `Sales Invoice`: `is_pos=1`, `update_stock=1`, `custom_pos_opening_entry`, `set_warehouse` from config.
5. **Aggregate requested quantities per item across lines** — two lines of 3 cannot together sell 5 when only 5 exist. This aggregation is why the same item on multiple lines is handled correctly.
6. Per line: verify the item exists and is enabled; check availability; resolve a **leaf** warehouse holding the full quantity via `_sale_warehouse`.
7. `set_missing_values()` then `calculate_taxes_and_totals()`.
8. Append **one** payment row with `amount = grand_total`.
9. `insert(ignore_permissions=True)` then `submit()` — ERPNext posts Stock Ledger Entries, GL Entries, and updates Bins.
10. Collect `stock_warnings` for any item whose Bin at the configured warehouse is negative.

> **Warning — Payment Handling**
> Only `payments[0].mode_of_payment` is used, and the amount is **overridden to `grand_total`**. Any client-supplied amount is discarded, and additional payment rows are ignored. **Split payments across multiple modes are not supported.** The override is deliberate: the client sends a pre-tax cart total, which would not match the post-tax grand total.

> **Note — Rate Handling**
> `rate` is passed as `flt(row.get("rate") or 0) or None`. A falsy rate becomes `None`, letting ERPNext resolve the price from the price list. A client cannot sell below list price by sending `0`, but **can** send an arbitrary non-zero rate. Since `allow_rate_change = 0` on the POS Profile, ERPNext may reject it — but the API does not independently verify the rate matches the price list.

### Workflow Impact

Posts stock and accounting immediately. See `08_Sales_Workflow.md`.

---

## `get_invoice`

Loads an invoice for the Return screen, with per-item returnable quantities.

| | |
|---|---|
| **Method** | `GET` · **Route** `…api.get_invoice` · **Permission** `Swift Cashier` · **Source** `api.py:808` |

### Parameters

| Name | Type | Required |
|---|---|---|
| `invoice_name` | string | Yes |

### Success — `200`

```json
{
  "name": "ACC-SINV-2026-00187",
  "customer": "Walk-in Customer",
  "customer_name": "Walk-in Customer",
  "posting_date": "2026-07-30",
  "posting_time": "14:22:08",
  "currency": "EGP",
  "net_total": 585.0,
  "total_taxes_and_charges": 0.0,
  "discount_amount": 0.0,
  "grand_total": 585.0,
  "items": [
    {
      "item_code": "ITEM-001",
      "item_name": "Brake Pad Set",
      "uom": "Nos",
      "rate": 250.0,
      "amount": 500.0,
      "discount_amount": 0.0,
      "qty_sold": 2.0,
      "qty_returned": 0.0,
      "remaining_qty": 2.0
    }
  ]
}
```

### Errors

| Code | Condition | Message |
|---|---|---|
| `404` | Not found | `Invoice {0} not found.` |
| `417` | Draft | `Invoice {0} is a draft and cannot be returned.` |
| `417` | Cancelled | `Invoice {0} is cancelled and cannot be returned.` |
| `417` | Is itself a return | `{0} is itself a return and cannot be returned.` |
| `417` | Older than 5 days | `Invoice {0} is {1} days old. Returns are only accepted within {2} days.` |
| `403` | Not a cashier | — |

### Business Logic

Delegates policy to `_returnable_invoice()`, shared with `create_return`, so the screen can never offer a return the submit would refuse. Remaining quantities come from ERPNext's `make_return_doc`, which accounts for prior returns.

**Not restricted to the caller's own shift** — deliberately. A return is presented days later by whichever cashier is on duty; an ownership check rejected virtually every genuine return. The five-day policy is the control that matters.

> **Warning — Known Defect**
> Line 820 builds `remaining` keyed by `item_code`:
> ```python
> remaining = {row.item_code: abs(flt(row.qty)) for row in returnable.items}
> ```
> When the same item appears on **two lines** of one invoice, the second overwrites the first, so `remaining_qty` and `qty_returned` are wrong for that item. The equivalent bug was fixed in `create_return` by summing per item, so **the submit path clamps correctly** — the screen displays a wrong ceiling but cannot over-return. See `09_Return_Workflow.md`.

---

## `create_return`

| | |
|---|---|
| **Method** | `POST` · **Route** `…api.create_return` · **Permission** `Swift Cashier` · **Source** `api.py:676` |

### Parameters

| Name | Type | Required | Notes |
|---|---|---|---|
| `invoice_name` | string | Yes | Original Sales Invoice |
| `items` | JSON array | No | `[{item_code, qty}]`. **Omit for a full return.** |
| `reason` | string | No | Written to `remarks` |

### Request — partial

```http
POST /api/method/swift_core.api.create_return
Content-Type: application/x-www-form-urlencoded

invoice_name=ACC-SINV-2026-00187&items=[{"item_code":"ITEM-001","qty":1}]&reason=Customer changed mind
```

### Request — full

```http
invoice_name=ACC-SINV-2026-00187&reason=Defective
```

### Success — `200`

```json
{
  "return_invoice": "ACC-SINV-2026-00191",
  "status": "Return"
}
```

### Errors

| Code | Condition | Message |
|---|---|---|
| `404` / `417` | Policy failure | *(all `_returnable_invoice` messages)* |
| `417` | Fully returned already | `Invoice {0} has already been fully returned.` |
| `417` | Over-return | `Cannot return {0} of {1}. Only {2} remaining.` |
| `417` | No matching items | `None of the requested items match the original invoice.` |
| `417` | ERPNext validation failure | e.g. group warehouse, serial mismatch |
| `403` | Not a cashier | — |

### Business Logic

1. Re-check the policy via `_returnable_invoice()` — the window is re-validated at submit time, not trusted from page load.
2. `make_return_doc("Sales Invoice", invoice_name)` produces a negative-qty return document.
3. **Clear `set_warehouse`** and restore each row's warehouse from the original invoice, keyed by `sales_invoice_item` (row name, not item code).
4. Compute remaining qty **summed per item** across rows.
5. For a partial return, spread each requested quantity across that item's rows in order, trimming `serial_no` to match the reduced quantity.
6. Set `remarks` from `reason`.
7. `insert(ignore_permissions=True)` then `submit()`.

> **Warning — Why Step 3 Exists**
> `make_return_doc` copies `set_warehouse` from the original invoice, where it holds the configured POS warehouse — a **group** node. ERPNext pushes that value onto every row during validation, overwriting the correct per-row warehouses, and the Stock Ledger Entry is then rejected with `Group node warehouse is not allowed to select for transactions` (HTTP 417). Clearing `set_warehouse` is what fixes it.

### Workflow Impact

Returns stock to the warehouse each line was sold from and reverses the accounting. See `09_Return_Workflow.md`.

---

## `session_invoices`

| | |
|---|---|
| **Method** | `GET` · **Route** `…api.session_invoices` · **Permission** `Swift Cashier` · **Source** `api.py:851` |

**Parameters:** `opening_entry` (string, required).

Returns submitted Sales Invoices linked to that shift. **Not called by the frontend** — supported API with no UI.

---

## `create_expense`

Records cash removed from the drawer during a shift.

| | |
|---|---|
| **Method** | `POST` · **Route** `…api.create_expense` · **Permission** `Swift Cashier` · **Source** `api.py:1249` |

### Parameters

| Name | Type | Required |
|---|---|---|
| `amount` | number | Yes |
| `expense_account` | string | Yes |
| `remarks` | string | No |

### Success — `200`

Returns the created Journal Entry name and amount.

### Errors

| Code | Condition |
|---|---|
| `417` | Missing/invalid amount, missing account, no open shift |
| `403` | Not a cashier |

### Business Logic

Creates a Journal Entry debiting the expense account and crediting cash, with `user_remark` prefixed **`[POS:<opening_entry>]`**. That tag is the only link between the expense and the shift; `session_close` matches on it to reduce expected cash.

> **Warning**
> Removing or editing the `[POS:...]` prefix breaks cash reconciliation for that shift.

---

# Items and Stock

## `create_item`

| | |
|---|---|
| **Method** | `POST` · **Route** `…api.create_item` · **Permission** `Swift Storekeeper` · **Source** `api.py:871` |

### Parameters

| Name | Type | Required | Notes |
|---|---|---|---|
| `item_name` | string | Yes | — |
| `item_group` | string | No | Config-resolved if omitted |
| `uom` | string | No | Config-resolved if omitted |
| `opening_stock` | number | No | Default `0` |
| `warehouse` | string | No | Config-resolved if omitted |
| `item_code` | string | No | Generated if omitted |
| `barcodes` | JSON array | No | Strings |
| `valuation_rate` | number | No | — |
| `selling_price` | number | No | Creates an Item Price |

### Success — `200`

Returns the created item's code and name.

### Errors

| Code | Condition |
|---|---|
| `417` | Missing `item_name`; duplicate barcode; duplicate item code |
| `403` | Not a storekeeper |

Creates the `Item`, appends barcodes, optionally sets an Item Price on the configured price list, and optionally posts opening stock.

---

## `update_item`

| | |
|---|---|
| **Method** | `PUT` · **Route** `…api.update_item` · **Permission** `Swift Storekeeper` · **Source** `api.py:949` |

**Parameters:** `item_code` (required) plus arbitrary `**fields`.

> **Warning — Allow-List**
> Only these are writable:
> ```python
> EDITABLE_ITEM_FIELDS = ("item_name", "item_group", "description", "disabled")
> ```
> Any other field is **silently ignored** — no error is returned. A client attempting to set `valuation_rate` receives `200` and no change. This is deliberate mass-assignment protection, but the silence can confuse API consumers.

---

## `get_item`

| | |
|---|---|
| **Method** | `GET` · **Route** `…api.get_item` · **Permission** **Either role** · **Source** `api.py:987` |

**Parameters:** `item_code` (required). Returns item detail with stock and price. `404` if not found.

---

## `validate_barcode`

| | |
|---|---|
| **Method** | `GET` · **Route** `…api.validate_barcode` · **Permission** `Swift Storekeeper` · **Source** `api.py:1024` |

**Parameters:** `barcode` (required). Reports whether the barcode is free or which item owns it. Used before assignment so the user gets a clear message rather than a database uniqueness error.

---

## `add_item_barcode` / `remove_item_barcode`

| | Add | Remove |
|---|---|---|
| **Method** | `POST` | `DELETE` |
| **Source** | `api.py:1033` | `api.py:1051` |
| **Permission** | `Swift Storekeeper` | `Swift Storekeeper` |

Both take `item_code` and `barcode`. Add fails with `417` if the barcode belongs to another item (barcodes are globally unique).

---

## `add_serial_number`

| | |
|---|---|
| **Method** | `POST` · **Route** `…api.add_serial_number` · **Permission** `Swift Storekeeper` · **Source** `api.py:1067` |

**Parameters:** `item_code`, `serial_no`. Creates a Serial No record. **Not called by the frontend.**

---

## `create_stock_entry`

| | |
|---|---|
| **Method** | `POST` · **Route** `…api.create_stock_entry` · **Permission** `Swift Storekeeper` · **Source** `api.py:1099` |

### Parameters

| Name | Type | Required |
|---|---|---|
| `stock_entry_type` | string | Yes |
| `items` | JSON array | Yes |

### Errors

| Code | Condition |
|---|---|
| `417` | Missing type or items; **group warehouse selected**; ERPNext validation failure |
| `403` | Not a storekeeper |

Validates group warehouses explicitly at line 1141 — the precedent the return path originally lacked. Creates and submits a `Stock Entry`, which posts Stock Ledger Entries.

---

## `get_stock_entry`

| | |
|---|---|
| **Method** | `GET` · **Route** `…api.get_stock_entry` · **Permission** `Swift Storekeeper` · **Source** `api.py:1156` |

**Parameters:** `name`. **Not called by the frontend.**

---

# Reference Data

## `list_warehouses`

`GET` · `Swift Storekeeper` · `api.py:1166`

Returns all warehouses.

> **Warning**
> **No company filter.** On a multi-company site this exposes warehouses belonging to other companies. `list_import_warehouses` does filter. Recorded in `18_Future_Roadmap.md`.

## `list_import_warehouses`

`GET` · `Swift Storekeeper` · `api.py:1172`

Company-filtered warehouses suitable for import targets.

## `list_item_groups`

`GET` · `Swift Storekeeper` · `api.py:1206`

## `list_suppliers`

`GET` · `Swift Storekeeper` · `api.py:1212`

## `pos_config`

`GET` · **Either role** · `api.py:1227`

### Success — `200`

```json
{
  "company": "swift",
  "pos_profile": "Main POS",
  "price_list": "Standard Selling",
  "warehouse": "Stores - S",
  "currency": "EGP",
  "cost_center": "Main - S",
  "payment_modes": ["Cash", "Insta pay"]
}
```

`payment_modes` populates the payment method buttons. `currency` is returned but, per `03_Frontend.md`, is not passed to `formatCurrency` — so the UI displays `$` despite this correct value.

---

# Inventory Management

## `inventory_import_preview`

Phase 1 of import. Parses and validates **without writing**.

| | |
|---|---|
| **Method** | `POST` (multipart file upload) · **Route** `…api.inventory_import_preview` · **Permission** `Swift Storekeeper` · **Source** `api.py:2114` |

### Parameters

The file arrives as a Frappe file upload, read by `_read_uploaded_xlsx()`.

| Constraint | Value |
|---|---|
| Format | `.xlsx` **only** |
| Max size | **10 MB** |

### Success — `200`

Returns parsed rows with resolved values, per-row validation results, and duplicate-collapse information.

### Errors

| Code | Condition |
|---|---|
| `417` | Not `.xlsx`; over 10 MB; unreadable; no recognisable columns |
| `403` | Not a storekeeper |

**Writes nothing.** Safe to call repeatedly.

## `inventory_import_commit`

Phase 2. Applies the import.

| | |
|---|---|
| **Method** | `POST` · **Route** `…api.inventory_import_commit` · **Permission** `Swift Storekeeper` · **Source** `api.py:2408` |

Re-parses and re-validates, then for each row: creates or updates the Item, generates a barcode if absent, ensures the Supplier, sets the Item Price, and reconciles stock to an **absolute** quantity via a per-item `Stock Reconciliation` wrapped in a savepoint.

> **Note**
> Per-item savepoints mean one failing item does not abort the batch. `EmptyStockReconciliationItemsError` is caught and treated as **success** — it means the quantity already matched. Because quantities are absolute rather than deltas, re-running the same file is idempotent.

See `10_Stock_Workflow.md`.

## `inventory_list`

`GET` · `Swift Storekeeper` · `api.py:2660`

| Name | Type | Default |
|---|---|---|
| `search` | string | — |
| `supplier` | string | — |
| `barcode` | string | — |
| `limit` | int | `100` |
| `start` | int | `0` |

Offset pagination over `_inventory_rows`.

## `inventory_export`

`GET` · `Swift Storekeeper` · `api.py:2667`

Same filters as `inventory_list`, minus pagination. Returns a binary `.xlsx` **outside** the JSON envelope:

```python
frappe.local.response.filename = ...
frappe.local.response.filecontent = ...
frappe.local.response.type = "binary"
```

> **Warning**
> Because the response type is `binary`, a bare `frappe.throw()` inside this endpoint produces a malformed response that surfaces as **HTTP 417 with no usable body** — the historic export failure. Error paths here must set the status explicitly rather than relying on `throw`. A comment in the source documents this.

Clients must handle a binary body, not JSON.

## `update_inventory_item`

`PUT` · `Swift Storekeeper` · `api.py:2706`

Updates an item from the inventory table, including price and supplier. Broader than `update_item`, which is restricted to four fields.

---

## Endpoints With No Frontend Caller

Fully implemented, permission-gated, and callable — but unused by the UI:

| Endpoint | Purpose |
|---|---|
| `session_invoices` | Invoices for a shift |
| `add_serial_number` | Register a serial number |
| `get_stock_entry` | Fetch a stock entry |

These are supported API surface. Treat them as stable when writing an alternative client.
