# Phase 3 — Custom POS Frontend Development Plan

## Objective
Build a production-ready POS frontend that:
- Connects to Frappe backend (Phase 2 setup).
- Replaces Desk for cashiers completely.
- Mirrors Loyverse speed/simplicity.
- Handles: barcode scan, cart, payment, receipt, returns.

---

## Tech Stack

**Frontend Framework:** Vue 3 (or React if you prefer)
- Lightweight, fast, Frappe-friendly ecosystem.
- Can run standalone or embedded.

**Build Tool:** Vite (latest, fastest)

**Styling:** Tailwind CSS

**HTTP Client:** Axios

**State Management:** Pinia (Vue) or Redux (React)

**Deployment:** Frappe Bench (custom folder) or separate server

**Database:** None (all data from Frappe API)

---

## Project Structure

```
frappe-bench/apps/swift-pos-frontend/
├── src/
│   ├── components/
│   │   ├── Navbar.vue
│   │   ├── ProductGrid.vue
│   │   ├── CartSidebar.vue
│   │   ├── PaymentModal.vue
│   │   ├── ReceiptModal.vue
│   │   └── BarcodeInput.vue
│   ├── pages/
│   │   ├── Login.vue
│   │   ├── Dashboard.vue (home)
│   │   ├── POS.vue (main)
│   │   └── Returns.vue
│   ├── store/
│   │   ├── cartStore.js (cart state)
│   │   ├── posStore.js (POS session)
│   │   └── authStore.js (login)
│   ├── services/
│   │   ├── frappe-api.js (all API calls)
│   │   └── barcode.js (barcode logic)
│   ├── App.vue
│   └── main.js
├── public/
├── package.json
├── vite.config.js
└── README.md
```

---

## Database Schema (Use from Frappe)

**Read-only (no writes from frontend):**
- `Item` (id, name, item_code, barcode, item_group, uom, disabled)
- `Item Price` (name, item_code, price_list, price_list_rate)
- `Price List` (name, enabled)
- `Warehouse` (name, disabled)
- `Mode of Payment` (name)
- `Customer` (name, customer_name, email, mobile_no)
- `POS Profile` (name, company, warehouse, price_list, default_payment_mode)

**Write (via API only):**
- `POS Opening Entry` (created by API)
- `POS Invoice` (created by API)
- `POS Closing Entry` (created by API)

---

## Phase 3 Breakdown

### Phase 3.1 — Setup & Infrastructure (3-5 days)

**Tasks:**
1. Create new folder `swift-pos-frontend/` in `frappe-bench/apps/`.
2. Init Vue 3 + Vite project.
3. Install dependencies: axios, pinia, tailwind.
4. Setup folder structure above.
5. Configure Frappe API base URL in `.env`.
6. Create `frappe-api.js` service (empty skeleton, will populate later).
7. Setup basic routing (Login → Dashboard → POS).
8. Test: Can you access your Frappe instance API? (`GET /api/resource/Item`)

**Deliverable:** Runnable Vue app that loads without errors.

---

### Phase 3.2 — Authentication (2-3 days)

**Tasks:**
1. **Login page:** Username + password fields.
2. **API call:** POST `/api/method/frappe.client.get_value` or use Frappe's standard login endpoint.
3. **Token storage:** Save token in localStorage or session.
4. **Auth guard:** Redirect to login if no token.
5. **Logout:** Clear token and redirect.

**API Endpoint to consume:**
```
POST /api/resource/User
(standard Frappe auth)
```

**Deliverable:** Login/logout works. Redirects protected pages.

---

### Phase 3.3 — POS Opening (3-4 days)

**Tasks:**
1. After login, show "POS Opening" screen.
2. Fields needed:
   - Select Warehouse (dropdown, fetch from API)
   - Select POS Profile (dropdown)
   - Opening Float (amount cashier starts with)
   - Optional: Select Price List (or auto from POS Profile)
3. **Create POS Opening Entry** via API: `POST /api/resource/POS Opening Entry`
   - Response: `opening_id` (use this for all transactions today)
   - Store in Pinia state.
4. On success: redirect to Main POS screen.

**Frappe API calls needed:**
- `GET /api/resource/Warehouse?filters=[["disabled","=",0]]`
- `GET /api/resource/POS Profile`
- `POST /api/resource/POS Opening Entry` (create)

**Deliverable:** Opening screen works, creates POS Opening Entry, moves to POS main.

---

### Phase 3.4 — Product Grid & Search (4-5 days)

**Tasks:**
1. **Product Grid:** Display items in grid (4-6 columns).
   - Show: Image (if available), Item Name, Price, Stock Level.
2. **Search/Filter:**
   - Input field: Search by name or barcode in real-time.
   - Filter by Item Group (tabs or dropdown).
3. **Fetch Items:**
   - `GET /api/resource/Item?filters=[["disabled","=",0]]&fields=["name","item_code","item_group","barcode","image"]`
   - Cache in Pinia state.
4. **Fetch Prices:**
   - For selected Price List, fetch `GET /api/resource/Item Price?filters=[["price_list","=","Retail"]]`
   - Join with Item data.
5. **Click item:** Add to cart (Phase 3.5).

**UI Tips:**
- Grid responsive (mobile: 2 cols, desktop: 6 cols).
- Search debounce (300ms) to avoid API spam.
- Show stock level color-coded (red if <5).

**Deliverable:** Product grid loads, filters work, prices display correctly.

---

### Phase 3.5 — Cart Workflow (5-6 days) ⭐ CRITICAL

**Tasks:**
1. **Add to Cart:**
   - Click item → add to Pinia `cartStore`.
   - If already in cart: increment qty.
   - Store: `{ item_code, item_name, qty, unit_price, discount }`
2. **Cart Sidebar (right panel):**
   - List cart items.
   - Qty spinner (++/-- buttons).
   - Remove button (×).
   - Line total: `qty × unit_price - discount`.
   - **Cart totals:**
     - Subtotal
     - Taxes (auto-calculated, see Phase 3.8)
     - **Grand Total**
3. **Cart Actions:**
   - Clear cart (restart button).
   - Discount button (per-item or global, Phase 3.8).
4. **Keyboard shortcuts:**
   - Qty input: Auto-focus on item add.
   - Delete key: Remove last item (optional, nice-to-have).

**Frappe integration:**
- No API calls here; cart is purely frontend state.
- Will use cart data later to create Sales Invoice.

**Deliverable:** Cart fully functional. Add/remove/modify qty works. Totals calculate correctly.

---

### Phase 3.6 — Barcode Input & Scan Simulation (3-4 days)

**Tasks:**
1. **Barcode Input Field:**
   - Hidden input that captures barcode text.
   - On Enter key: search Item by barcode.
   - API: `GET /api/resource/Item?filters=[["barcode","=","123456"]]`
   - If found: add to cart automatically.
   - If not found: show alert "Item not found."
2. **Simulation (for testing without physical gun):**
   - Manual text input (type "12345" + press Enter).
   - Or: Add a "Mock Scan" button in dev mode (dropdown with preset barcodes).
3. **Auto-focus:** After item added, refocus barcode input for next scan.

**Deliverable:** Barcode scan (simulated) works. Item added to cart. Ready for physical gun later (same logic).

---

### Phase 3.7 — Customer Selection (2-3 days)

**Tasks:**
1. Optional customer lookup:
   - Input field: Search by name/mobile.
   - `GET /api/resource/Customer?filters=[["customer_name","like","%Ali%"]]`
2. Default: Use "Walk-in Customer" from Frappe setup.
3. Show selected customer in cart header.

**Deliverable:** Customer selection (optional) works. Walk-in default applied.

---

### Phase 3.8 — Discounts (3-4 days)

**Tasks:**
1. **Item-level discount:**
   - Discount button per item in cart → modal.
   - Input: Discount % or fixed amount.
   - Auto-calculate line total.
2. **Invoice-level discount:**
   - Discount button on cart → apply to Grand Total.
3. **Store discount in cartStore.**
4. **Taxes:** Auto-apply taxes (from Sales Taxes and Charges Template in Phase 2).
   - Fetch tax template: `GET /api/resource/Sales Taxes and Charges Template`
   - Calculate: `(Subtotal - Discounts) × Tax %`
   - Show in totals.

**Deliverable:** Discounts applied correctly. Taxes calculated. Totals update real-time.

---

### Phase 3.9 — Payment Modal (4-5 days) ⭐ CRITICAL

**Tasks:**
1. **Payment button:** Opens modal showing:
   - Grand Total (read-only).
   - Payment methods (from POS Profile: Cash, Card, Wallet, etc.).
   - For each method: Amount input (auto-filled with total, editable).
   - "Split payment" support (multiple methods same transaction).
2. **Payment Logic:**
   - Validate: Sum of amounts = Grand Total.
   - If overpayment (cash): show change amount.
   - Button: "Confirm Payment" → Create Sales Invoice (Phase 3.10).
3. **Payment Method Validation:**
   - Cash: Always allowed.
   - Card: Show dummy "Processing..." (or integrate payment gateway later).
   - Wallet: Deduct from customer wallet (future integration).

**Deliverable:** Payment modal works. Multiple payment methods. Change calculated. Validation works.

---

### Phase 3.10 — Create Sales Invoice (5-6 days) ⭐ CRITICAL

**Tasks:**
1. On "Confirm Payment":
   - Build Sales Invoice JSON from cartStore:
     ```
     {
       "doctype": "POS Invoice",
       "customer": "Walk-in Customer",
       "pos_profile": "POS Profile 1",
       "pos_opening_entry": "opening_id_from_phase_3.3",
       "items": [
         { "item_code": "SC-001", "qty": 2, "rate": 50000 },
         ...
       ],
       "taxes": [...],
       "payments": [
         { "mode_of_payment": "Cash", "amount": 100000 },
         ...
       ]
     }
     ```
   - API: `POST /api/resource/POS Invoice` with above JSON.
2. **Response:** Sales Invoice name (e.g., "POS-INV-001").
3. **Handle errors:** Show error modal if creation fails.
4. On success: Move to Receipt (Phase 3.11).

**Frappe API:**
```
POST /api/resource/POS Invoice
Body: Sales Invoice JSON
Response: { "name": "POS-INV-001", ... }
```

**Deliverable:** Sales Invoice created successfully. Stock updated (automatic in Frappe). Payment recorded.

---

### Phase 3.11 — Receipt Display & Printing (3-4 days)

**Tasks:**
1. **Receipt Modal (after sales invoice created):**
   - Display:
     - Receipt #
     - Date/time
     - Items (name, qty, price)
     - Subtotal, Discounts, Taxes, Total
     - Payment methods used
     - Thank you message
2. **Print Options:**
   - Print to thermal printer (58mm) — use Frappe's standard receipt format (you configured in Phase 2).
   - Print to PDF.
   - Email receipt (optional, if customer email added).
3. **Button Actions:**
   - Print.
   - Email.
   - New Sale (clears cart, starts over).
4. **Fetch Receipt Data:**
   - `GET /api/resource/POS Invoice/{invoice_name}` to get full details.

**Deliverable:** Receipt displays correctly. Print works (backend handles actual printing). Next sale resets.

---

### Phase 3.12 — Returns Workflow (4-5 days)

**Tasks:**
1. **"Returns" page/tab in POS.**
2. Search original Sales Invoice:
   - Input: Invoice # or date range.
   - `GET /api/resource/POS Invoice?filters=[["name","=","POS-INV-001"]]`
3. Display original items.
4. Select items to return (checkboxes) + qty.
5. **Create Return:**
   - Build `POS Invoice` with `is_return=1` and `return_against=original_invoice`.
   - `POST /api/resource/POS Invoice` (create return).
6. Stock returns to warehouse automatically (Frappe handles this).
7. Show receipt for return.

**Deliverable:** Returns workflow works. Stock restored. Return invoice created.

---

### Phase 3.13 — POS Closing (2-3 days)

**Tasks:**
1. **Closing button** on navbar/dashboard.
2. Show:
   - Opening cash (from opening entry).
   - Total sales today (sum of all invoices from this opening).
   - Expected cash (opening + sales).
   - Actual cash (input field for physical count).
   - Discrepancy (expected - actual).
3. **Create POS Closing Entry:**
   - `POST /api/resource/POS Closing Entry`
   - Body: opening_id, closing_cash_count, etc.
4. On success: Show closing summary. Logout.

**Deliverable:** Shift closes correctly. Reconciliation works. Logout redirects to login.

---

### Phase 3.14 — Dashboard/Home (2-3 days)

**Tasks:**
1. After login, before opening:
   - Show today's sales summary (if shift already open).
   - Quick stats: Total sales, # transactions, avg transaction.
   - Recent transactions (last 5 invoices).
   - Low stock alerts (items <5 units).
2. **Quick actions:**
   - Start new shift (POS Opening).
   - View reports (link to Frappe reports, or fetch summaries via API).

**Deliverable:** Dashboard shows relevant info. Cashier knows status at a glance.

---

### Phase 3.15 — Error Handling & Offline Mode (3-4 days)

**Tasks:**
1. **API Error Handling:**
   - Network down: Show "Connection lost" banner.
   - API error: Show error message + retry button.
   - Validation errors: Show field-level errors.
2. **Offline Queue (optional, Phase 3+ only):**
   - If network fails during sales: Queue invoice in localStorage.
   - Retry when network returns.
   - For Phase 3: Just show error, ask cashier to retry.

**Deliverable:** Graceful error messages. No crashes. Retryable flows.

---

### Phase 3.16 — Testing & QA (5-7 days)

**Tasks:**
1. **Manual Testing Checklist:**
   - [ ] Login/logout works.
   - [ ] Product grid loads (50+ items).
   - [ ] Search filters correctly.
   - [ ] Barcode scan adds item (simulated).
   - [ ] Add/remove/qty modify in cart works.
   - [ ] Discount applied correctly.
   - [ ] Tax calculated correctly.
   - [ ] Multiple payment methods split payment works.
   - [ ] Sales Invoice created in Frappe.
   - [ ] Stock updated in Frappe.
   - [ ] Receipt prints correctly (to PDF at least).
   - [ ] Returns flow end-to-end.
   - [ ] POS Closing Entry created.
   - [ ] Reports (Frappe backend) show correct data.
   - [ ] Keyboard shortcuts work (tab, enter, barcode).
   - [ ] Mobile responsive (if needed).

2. **Performance:**
   - Grid load time: <2s.
   - Search latency: <500ms.
   - Cart operations: instant (<100ms).
   - Invoice creation: <3s.

3. **Edge cases:**
   - Out-of-stock item → block qty?
   - Negative qty → prevent.
   - Empty cart payment → prevent.
   - Double-submit (network glitch) → idempotent.

**Deliverable:** All tests pass. Usable by cashier.

---

## API Endpoints Needed (to request from Frappe)

### Authentication
- `POST /api/method/login` — login
- `POST /api/method/logout` — logout

### Read (GET)
- `GET /api/resource/Item` — all items
- `GET /api/resource/Item Price` — prices
- `GET /api/resource/Warehouse` — warehouses
- `GET /api/resource/POS Profile` — POS config
- `GET /api/resource/Mode of Payment` — payment methods
- `GET /api/resource/Customer` — customers (search)
- `GET /api/resource/POS Invoice/{name}` — get invoice details
- `GET /api/resource/Sales Taxes and Charges Template` — tax templates

### Write (POST/PUT)
- `POST /api/resource/POS Opening Entry` — open shift
- `POST /api/resource/POS Invoice` — create sales invoice
- `POST /api/resource/POS Closing Entry` — close shift

All endpoints are **built-in Frappe**, no custom coding needed in backend. Frontend consumes directly.

---

## Development Timeline

| Phase | Tasks | Days | Status |
|---|---|---|---|
| 3.1 | Setup & Infrastructure | 3-5 | Next |
| 3.2 | Authentication | 2-3 | → |
| 3.3 | POS Opening | 3-4 | → |
| 3.4 | Product Grid | 4-5 | → |
| 3.5 | Cart Workflow | 5-6 | → |
| 3.6 | Barcode Input | 3-4 | → |
| 3.7 | Customer Selection | 2-3 | → |
| 3.8 | Discounts & Taxes | 3-4 | → |
| 3.9 | Payment Modal | 4-5 | → |
| 3.10 | Create Sales Invoice | 5-6 | → |
| 3.11 | Receipt Display | 3-4 | → |
| 3.12 | Returns | 4-5 | → |
| 3.13 | POS Closing | 2-3 | → |
| 3.14 | Dashboard | 2-3 | → |
| 3.15 | Error Handling | 3-4 | → |
| 3.16 | Testing & QA | 5-7 | → |
| **Total** | | **60-75 days** (8-10 weeks) | |

---

## Dependencies & Requirements

**Before starting Phase 3.1:**
- [ ] Frappe instance running (Phase 1-2 done).
- [ ] All master data configured (items, prices, taxes, payment modes, POS profile).
- [ ] Node.js 18+ installed.
- [ ] Git repo initialized (for version control).
- [ ] API access enabled in Frappe (CORS configured if frontend on different server).

**Tools needed:**
- VS Code or IDE.
- Browser dev tools (Chrome/Firefox).
- Postman (to test APIs before coding).
- Terminal/Command line.

---

## Expected Outcome After Phase 3

**A fully functional POS application:**
- Cashier logs in.
- Opens shift.
- Scans/searches items.
- Adds to cart.
- Applies discount.
- Selects payment method(s).
- Creates sales invoice (data in Frappe).
- Prints receipt.
- Closes shift.

**Zero use of Frappe Desk** by cashier (only backend, they never see it).

**Backend (Frappe) fully updated** with:
- Sales invoices.
- Stock ledger entries.
- GL entries.
- All data queryable via reports.

---

## Notes

1. **No custom backend code required** — All APIs are Frappe built-in.
2. **Barcode gun later** — Simulate with keyboard input first.
3. **Print integration** — Frappe handles; frontend calls print API.
4. **Multi-language support** — Phase 4+ (out of scope Phase 3).
5. **Mobile app** — Separate project later; this frontend works on mobile browser too.
6. **Offline mode** — Phase 4+ (too complex for Phase 3).

---

## Start Checklist

Before coding first line:
- [ ] Node.js installed.
- [ ] Frappe instance accessible (http://your-frappe:8000).
- [ ] CORS enabled in Frappe (if frontend separate server).
- [ ] Clone/init git repo.
- [ ] Read Vite + Vue 3 docs (30 min).
- [ ] Test: Can you fetch items via Postman? (`GET /api/resource/Item`).
- [ ] Start Phase 3.1.

**Good luck. This is the real work. Backend was just setup.**
