# 17 — Troubleshooting

## How to Read an Error

Start here before opening any section below.

| Code | Layer | First thing to check |
|---|---|---|
| 400 | CSRF | Is `X-Frappe-CSRF-Token` attached? |
| 403 | Auth or role gate | What does `me()` return? |
| 404 | Named record missing | Is `swift_core` installed? |
| 405 | Wrong HTTP verb | Does `methods=[...]` match? |
| 409 | Business conflict | No shift, no stock, device clash |
| **417** | **Any `frappe.throw`** | **Read the message, not the code** |
| 500 | Unhandled exception | Desk → Error Log |

> **Note**
> **417 is the default status for every validation failure in Frappe.** It is not a rare or unusual code here — it is the normal response for "the business rule said no." Never diagnose a 417 by the code alone. Read `_server_messages`, which the frontend already unwraps through `extractFrappeError`.

### Where the Logs Are

```bash
tail -f logs/web.error.log        # request handling
tail -f logs/worker.error.log     # background jobs
tail -f logs/schedule.log         # scheduler
```

Desk → **Error Log** holds unhandled exceptions with full tracebacks. It is usually more useful than the files.

---

## 1. Group Warehouse Error

**Symptom**

```
417
Warehouse Stores - S cannot be used for transactions as it is a Group node.
```

Sale, return, or stock entry fails at submit. Nothing is saved.

**Cause**

`Stores - S` — the warehouse on the POS Profile — has `is_group = 1`. ERPNext blocks stock movement against group nodes in `stock_ledger_entry.py` (`block_transactions_against_group_warehouse()` → `stock/utils.py: is_group_warehouse()`). Stock lives only in leaf warehouses.

Swift is built around this. `_stock_warehouses()` resolves the leaf warehouses beneath the configured group, `_sale_warehouse()` picks the one holding the stock, and `create_return` clears `set_warehouse` entirely and maps each return row to the warehouse the original line was sold from. When this error appears, one of those resolutions was bypassed.

**Diagnose**

```bash
bench --site <site> console
```

```python
>>> frappe.db.get_value("Warehouse", "Stores - S", "is_group")
1
>>> frappe.get_all("Warehouse", filters={"parent_warehouse": "Stores - S", "is_group": 0}, fields=["name"])
```

If the second query returns an empty list, there are **no leaf warehouses** — that is the real fault.

**Solution**

- No leaf warehouses → create at least one child warehouse under the group, then transfer stock into it.
- Leaves exist but the error persists → a code path is setting the group warehouse directly on a document. Search for `set_warehouse` assignments that are not followed by per-row resolution.

**Prevention**

Never assign `config["warehouse"]` to a stock-bearing row. It is a group node by design. Always resolve through `_sale_warehouse()` or `_stock_warehouses()`.

---

## 2. Negative Stock / Insufficient Stock

**Symptom**

```
409
Item ITEM-001 has only 2 available.
```

Sale is refused.

**Cause**

`create_invoice` checks availability via `_available_qty()` before submitting. `Allow Negative Stock` is **off** and must remain off.

> **Warning**
> Do **not** enable `Allow Negative Stock` to make this go away. Sales must fail when stock is insufficient — that is the requirement. Enabling it produces negative valuations, incorrect COGS, and a stock ledger that cannot be reconciled.
>
> If you find code that temporarily enables it, remove that code.

**Diagnose**

```python
>>> from swift_core.api import _available_qty, resolve_config
>>> config = resolve_config()
>>> _available_qty("ITEM-001", config["warehouse"])
```

Compare against Desk → **Stock Balance** for the same item. If the report shows stock but `_available_qty` returns zero, the stock is in a warehouse outside the configured group.

**Solution**

| Finding | Action |
|---|---|
| Genuinely out of stock | Receive stock via a Stock Entry |
| Stock in the wrong warehouse | Transfer it into a leaf under the configured group |
| Stock ledger disagrees with reality | Stock Reconciliation in the desk |
| Reserved by a draft document | Submit or cancel the draft |

**Prevention**

Run the low-stock job's threshold at a level that gives lead time. Note that `stock/low_stock.py` uses a hardcoded threshold of `<= 2` — see issue 12 below.

**Related: split-warehouse 409**

```
409
Item ITEM-001 stock is split across warehouses.
```

The quantity requested exists in total, but no single leaf warehouse holds all of it. Swift will not split one invoice line across warehouses. Transfer stock so one leaf holds the full quantity, or sell the available amount from each warehouse separately.

---

## 3. Permission Denied

**Symptom**

```
403
Not permitted
```

**Cause**

One of three things:

1. No valid session — the `sid` cookie is missing or expired
2. Valid session, wrong role for that endpoint
3. The user holds no Swift role at all, so `login()` refused them

**Diagnose**

```bash
curl -i -b "sid=<session>" http://localhost:8000/api/method/swift_core.api.me
```

- `403` here too → not authenticated (case 1)
- Returns a user and role → compare that role against the endpoint's requirement in `14_Permissions.md` (case 2)

**Solution**

| Case | Fix |
|---|---|
| Not authenticated | Log in again |
| Wrong role | Assign the correct Role Profile (`cashier` or `storekeeper`) |
| Role changed but no effect | **Log out and back in** — roles are read from the session |
| No Swift role | Assign `cashier` or `storekeeper`; ERPNext roles alone do not grant frontend access |
| Administrator gets 403 | `Administrator` holds no Swift role; grant one or use the desk |

**Prevention**

Use Role Profiles rather than assigning individual roles. Remember that the frontend's route guards are cosmetic — the API is the control. A storekeeper who navigates to `/pos` will load the page and then receive 403 from every call, which is expected.

> **Related security issue**
> `Swift POS Settings` currently grants `write` and `delete` to both `Swift Cashier` and `Swift Storekeeper`. No Swift endpoint writes to it, so removing those grants breaks nothing. See `14_Permissions.md`.

---

## 4. Fixture Overwrote a Configuration Change

**Symptom**

A setting changed in the desk worked, then silently reverted after a deployment.

**Cause**

`bench migrate` imports every fixture and **overwrites** the matching record. No prompt, no diff, no log. The desk change was never exported back into the app.

**Diagnose**

Is the record's DocType in `hooks.py: fixtures`? The nine covered types are `Role`, `Role Profile`, `Workspace`, `Module Def`, `Item Group`, `Price List`, `Mode of Payment`, `POS Profile`, and `Custom Field` (filtered to Sales Invoice).

If yes, compare:

```python
>>> import json
>>> fx = json.load(open("apps/swift_core/swift_core/fixtures/pos_profile.json"))
>>> live = frappe.get_doc("POS Profile", "Main POS")
>>> for k, v in fx[0].items():
...     if k in live.as_dict() and live.get(k) != v:
...         print(k, "| live:", live.get(k), "| fixture:", v)
```

**Solution**

Re-apply the change in the desk, then:

```bash
bench --site <site> export-fixtures
cd apps/swift_core && git diff fixtures/
git commit -am "config: <what changed and why>"
```

**Prevention**

Treat fixture-managed records as code. A desk edit is a draft until exported. `Swift POS Settings` is deliberately **not** a fixture, so changes there are safe from this. Full detail in `15_Fixtures.md`.

---

## 5. Missing Print Logo

**Symptom**

Receipt prints with a broken-image icon, or with no letterhead at all.

**Cause**

One of:

1. No Letter Head is configured or marked default
2. The Letter Head exists but its image file is missing on disk
3. The print URL was built with `no_letterhead=1`

**Diagnose**

Open the print view manually and inspect it in the browser:

```
https://<frappe-host>/printview?doctype=Sales%20Invoice&name=<invoice>&format=Swift&no_letterhead=0
```

A broken `<img>` in DevTools → the file is missing. No `<img>` at all → no letterhead is being applied.

```python
>>> frappe.get_all("Letter Head", fields=["name", "is_default"])
```

**Solution**

| Finding | Fix |
|---|---|
| No default Letter Head | Desk → Letter Head → tick **Is Default** |
| Image 404s | Re-upload it; the `File` record points at a path that no longer exists |
| After a restore | Restore with files, or re-upload |

**Prevention**

> **Warning**
> Letterhead images live in `sites/<site>/public/files/` — on **disk**, not in the database. `bench backup` without `--with-files` does not include them. Always use:
> ```bash
> bench --site <site> backup --with-files
> ```

---

## 6. Wrong Print Format / A4 Instead of a Receipt

**Symptom**

The receipt prints as a full-page A4 invoice.

**Cause**

The `Swift` print format does not exist on this site. `format=Swift` resolved to nothing and Frappe fell back to the standard format.

> **Warning**
> The `Swift` format is **not version-controlled** — there is no `Print Format` fixture. It lives only in the database of the site where it was created. Every fresh deployment starts without it.

**Diagnose**

```python
>>> frappe.db.exists("Print Format", "Swift")
```

`None` confirms it.

**Solution**

Recreate it in the desk (`11_Deployment.md` step 9), or restore from a backup that contains it.

**Prevention**

Add the fixture:

```python
{"dt": "Print Format", "filters": [["name", "in", ["Swift"]]]},
```

then `export-fixtures`. See `15_Fixtures.md` and `16_Printing.md`.

---

## 7. Nothing Happens When Printing

**Symptom**

The operator clicks Done, the sale completes, no print window appears, no error is shown.

**Cause**

The popup was blocked. `window.open` is called from a click handler so it is user-initiated and normally allowed — but a site-level popup block overrides that. The failure is completely silent.

**Diagnose**

Look for the blocked-popup indicator in the browser address bar. Check site settings for the frontend origin.

**Solution**

Allow popups for the frontend origin.

**Prevention**

Add it to the per-terminal setup checklist in `16_Printing.md`.

> **Note**
> A print failure never affects the sale. The invoice is already submitted, stock has moved, and the ledger has posted. Reprint from the desk.

---

## 8. Device Session Conflict

**Symptom**

```
409
This session is already open on another device.
```

**Cause**

`Swift POS Settings.allow_multi_device_session` is `0` and the shift is bound to a different `X-Device-Id`. The device ID is a UUID generated by `getOrCreateDeviceId()` and stored in `localStorage`.

Clearing browser data, using incognito, or switching browsers generates a **new** device ID — which looks to the server like a different device.

**Diagnose**

```python
>>> frappe.db.get_value("POS Opening Entry", {"status": "Open", "user": "cashier@example.com"},
...                     ["name", "custom_device_id"])
```

Compare against `localStorage.getItem("swift_pos_device_id")` in the browser console.

**Solution**

| Situation | Fix |
|---|---|
| Genuinely a second terminal | Close the shift on the first, or set `allow_multi_device_session = 1` |
| Same terminal, ID lost | Close the shift from the original browser, or clear `custom_device_id` in the desk |
| Terminal is gone | Close the POS Opening Entry manually in the desk |

**Prevention**

Do not clear browser data on POS terminals. Do not run the POS in incognito.

> **Warning — Related Missing Fixture**
> `custom_device_id`, `custom_last_heartbeat`, and `custom_heartbeat_state` are custom fields on `POS Opening Entry` that **are not exported by any fixture** — the Custom Field fixture is filtered to `Sales Invoice` only.
>
> On a fresh site these fields do not exist, so device binding silently stops working and `allow_multi_device_session` has no effect regardless of its value. See `15_Fixtures.md`.

---

## 9. Sessions Never Auto-Close

**Symptom**

Abandoned shifts stay open indefinitely. `session_timeout_minutes` and `auto_close_enabled` appear to do nothing.

**Cause**

`auto_close_inactive_sessions()` exists in `api.py` and its docstring claims it runs "every 5 minutes via cron" — **but it is not registered in `scheduler_events`.**

`hooks.py` schedules exactly one job:

```python
scheduler_events = {"daily": ["swift_core.stock.low_stock.check_low_stock"]}
```

The auto-close function is never called by anything.

**Consequences**

- `auto_close_enabled` has no effect
- `session_timeout_minutes` has no effect
- `session_heartbeat` writes `custom_last_heartbeat` and `custom_heartbeat_state` that nothing ever reads

**Diagnose**

```bash
grep -n "scheduler_events" -A 5 apps/swift_core/swift_core/hooks.py
```

**Solution**

Close abandoned shifts manually in the desk: **POS Opening Entry** → the record → close it.

To enable auto-close, register it:

```python
scheduler_events = {
    "daily": ["swift_core.stock.low_stock.check_low_stock"],
    "cron": {"*/5 * * * *": ["swift_core.api.auto_close_inactive_sessions"]},
}
```

Then `bench restart`. **Test this against non-production data first** — the function has never run in this configuration.

**Prevention**

Fix the docstring in the same commit, whichever direction you resolve it. A docstring describing behaviour that does not exist is how this went unnoticed. See `18_Future_Roadmap.md`.

---

## 10. Scheduler Not Running

**Symptom**

The daily low-stock email never arrives. No scheduled job runs.

**Cause**

The scheduler is disabled, paused, or the worker is down.

**Diagnose**

```bash
bench doctor
bench --site <site> show-config | grep -i pause
tail -f logs/schedule.log
```

```python
>>> frappe.utils.scheduler.is_scheduler_inactive()
```

**Solution**

```bash
bench --site <site> enable-scheduler
bench restart
```

If the scheduler is enabled but jobs still do not run, the queue worker is down — see the Redis section.

**Prevention**

`bench doctor` is a fast, safe health check. Include it in the post-deployment checklist.

---

## 11. Low-Stock Email Goes to the Wrong Person

**Symptom**

Low-stock alerts arrive at an unexpected address, or the wrong company's items appear in them.

**Cause**

`stock/low_stock.py` has three hardcoded behaviours:

| Line | Value | Problem |
|---|---|---|
| ~43 | `["swiftdraft85@gmail.com"]` | Recipient is hardcoded |
| ~8 | `["<=", 2]` | Threshold is hardcoded |
| — | *(none)* | **No company filter** |

On a multi-company site, the report includes every company's stock.

**Solution**

Edit `stock/low_stock.py` — recipients and threshold should come from `Swift POS Settings`, and the query should filter by `resolve_config()["company"]`. Both need new fields on the settings DocType.

> **Warning — Security Issue in the Same File**
> The email body is built with f-string interpolation of item names directly into HTML:
>
> ```python
> message = f"<tr><td>{item.item_name}</td>...</tr>"
> ```
>
> An item named with HTML becomes executable content in the recipient's mail client. Use `frappe.render_template` with escaping, or escape explicitly. See `13_Coding_Standards.md`.

---

## 12. Return Rejected

**Symptom** and cause, by message:

| Message | Code | Cause |
|---|---|---|
| Invoice not found | 404 | Wrong name, or a POS Invoice rather than a Sales Invoice |
| Invoice is a draft | 417 | `docstatus = 0` — never submitted |
| Invoice is cancelled | 417 | `docstatus = 2` |
| Invoice is itself a return | 417 | `is_return = 1` — cannot return a return |
| Outside the return window | 417 | More than **5 days** since `posting_date` |
| Already fully returned | 417 | Remaining quantity is zero on every line |
| Quantity exceeds remaining | 417 | Requested more than is left |

**Diagnose**

```http
GET /api/method/swift_core.api.get_invoice?invoice_name=ACC-SINV-2026-00187
```

The response includes `qty_sold`, `qty_returned`, and `remaining_qty` per line.

**Solution**

The five-day window is enforced in code (`_returnable_invoice`) and cannot be overridden through the API. A return outside the window requires an administrator creating the credit note in the desk.

> **Warning — Known Bug: Duplicate Item Lines**
> `get_invoice` builds its remaining-quantity map keyed by `item_code`:
>
> ```python
> remaining = {row.item_code: abs(flt(row.qty)) for row in returnable.items}
> ```
>
> If the same item appears on **two lines** of one invoice, the second overwrites the first. The reported `remaining_qty` is then the last line's quantity, not the sum.
>
> **Symptom:** a partially-returnable invoice with a duplicated item shows too little remaining quantity, and a legitimate return is refused.
>
> `create_return` accumulates correctly (`remaining[code] = remaining.get(code, 0) + ...`), so the bug is in the read path only. The fix is to make `get_invoice` accumulate the same way. Recorded in `18_Future_Roadmap.md`.

---

## 13. Cash Reconciliation Is Always Short

**Symptom**

Every shift close shows a shortage roughly equal to the day's Insta pay sales.

**Cause**

`Insta pay` is configured with **type Cash** and mapped to `1110 - Cash - S` — the same account as physical cash. Shift close computes expected cash from Cash-type payments, so Insta pay receipts count as money that should be in the drawer.

**Diagnose**

```python
>>> frappe.db.get_value("Mode of Payment", "Insta pay", ["type", "name"])
```

Compare the shortage against the shift's Insta pay total.

**Solution**

Change the Mode of Payment to type **Bank** with its own account, then re-export the fixture:

```bash
bench --site <site> export-fixtures
```

This is a configuration change, not a code change. Existing invoices are unaffected; new ones reconcile correctly.

**Prevention**

Any payment method that does not put physical currency in the drawer must not be type Cash. See `15_Fixtures.md`.

---

## 14. Import Fails or Produces Wrong Data

**Symptom**

`inventory_import_preview` reports validation errors, or a committed import creates items with wrong quantities.

**Common causes**

| Cause | Detail |
|---|---|
| Missing required columns | `item_name` and `qty` are mandatory |
| Unrecognised header | Only the documented aliases are matched |
| Invisible characters | 17 codepoints are stripped — ZWSP, RTL marks, BOM, soft hyphen |
| Duplicate rows | Collapsed and merged by `_collapse_duplicate_rows` / `_merge_import_rows` |
| Non-numeric quantity | Coerced via `flt`; garbage becomes 0 |

Accepted header aliases:

| Field | Accepted headers |
|---|---|
| `item_name` | `item_name`, `description` |
| `qty` | `qty`, `quantity`, `stock`, `current stock` |
| `supplier` | `supplier`, `vendor` |
| `cost_price` | `cost price`, `cost`, `buying price`, `buying_price`, `purchase price` |
| `selling_price` | `selling price`, `selling_price`, `price` |
| `barcode` | `barcode` |

**Diagnose**

Always run `inventory_import_preview` first. It reports per-row validation results without writing anything. The preview is the diagnostic tool — never commit an import that was not previewed.

**Solution**

Fix the spreadsheet and re-preview. If a header is not being recognised, check for a trailing space or an invisible character — export the file and inspect the bytes.

**Prevention**

Use `inventory_export` to produce a correctly-shaped template, edit that, and re-import. Its columns are exactly what the importer expects.

---

## 15. Backend Changes Have No Effect

**Symptom**

You edited `api.py`, reloaded, and nothing changed.

**Cause**

Almost always one of two things:

1. **You edited the staging copy.** `front/api.py` is a gitignored staging file that nothing executes. The live file is `<bench>/apps/swift_core/swift_core/api.py`.
2. **You did not restart.** The old module is still loaded in memory.

**Solution**

```bash
diff front/api.py <bench>/apps/swift_core/swift_core/api.py
# copy if they differ, then:
bench restart
```

**Prevention**

Diff the two files before every deployment. They must be identical. See `12_Developer_Guide.md`.

---

## 16. Bench Restart Fails or Hangs

**Symptom**

`bench restart` errors, or the site stays down afterwards.

**Diagnose**

```bash
bench doctor
tail -50 logs/web.error.log
python -m py_compile apps/swift_core/swift_core/api.py
```

**Common causes**

| Cause | Symptom | Fix |
|---|---|---|
| Syntax error in `api.py` | Import fails at startup | `py_compile`, fix, restart |
| Redis down | Connection refused in the log | Start Redis |
| Port in use | Address already in use | Find and kill the stale process |
| Supervisor misconfigured | Restart returns immediately, nothing runs | `bench setup supervisor` |

**Prevention**

Run `python -m py_compile api.py` before copying into the bench. A syntax error there takes the whole site down, not just one endpoint.

---

## 17. Migration Fails

**Symptom**

`bench migrate` exits with a traceback.

**Diagnose**

Read the traceback — it names the fixture file and record.

**Common causes**

| Cause | Message pattern | Fix |
|---|---|---|
| Link to a nonexistent record | `LinkValidationError` naming an account or warehouse | Create it, or correct the fixture |
| Company abbreviation mismatch | `1110 - Cash - S` not found | Environment-specific value — see below |
| Duplicate name | `DuplicateEntryError` | Resolve the conflicting record |
| Schema change conflict | Column/index error | Inspect the DocType JSON |

> **Warning — Environment-Specific Values in Fixtures**
> `pos_profile.json` and `mode_of_payment.json` contain values carrying the company abbreviation `S`: `Stores - S`, `Main - S`, `1110 - Cash - S`, `5111 - Cost of Goods Sold - S`, and company `swift`.
>
> On a site whose company abbreviation differs, none of these exist and the import fails. Verify against the target site's Chart of Accounts and Warehouse tree before migrating. See `15_Fixtures.md`.

**Recovery**

```bash
bench --site <site> restore <backup-file> --with-files
```

Reverting the code does **not** undo data changes. Always back up before migrating.

**Note on patches:** `patches.txt` is empty — both `[pre_model_sync]` and `[post_model_sync]` have no entries. **No data migration has ever run for this app.** Migration risk is concentrated entirely in fixtures.

---

## 18. Module Not Found

**Symptom**

```
ModuleNotFoundError: No module named 'swift_core'
```

or every API call returns 404.

**Diagnose**

```bash
bench --site <site> list-apps
ls apps/
```

**Solution**

```bash
# app present but not installed on the site
bench --site <site> install-app swift_core

# app present but not on the Python path
bench setup requirements

bench restart
```

**Prevention**

`bench --site <site> list-apps` should show `swift_core`. A 403 from `me()` means the app is loaded and routing correctly; a 404 means it is not.

---

## 19. Redis Errors

**Symptom**

```
redis.exceptions.ConnectionError: Error 111 connecting to localhost:11000
```

Background jobs stop, the scheduler stops, and cached reads may fail.

**Cause**

Frappe uses three Redis instances: cache, queue, and socketio. One or more is not running.

**Diagnose**

```bash
redis-cli -p 11000 ping     # cache
redis-cli -p 11001 ping     # queue
redis-cli -p 12000 ping     # socketio
bench doctor
```

Ports come from `sites/common_site_config.json`; the values above are the bench defaults.

**Solution**

```bash
# Docker
docker compose ps
docker compose up -d

# systemd
sudo systemctl start redis-server
```

Then `bench restart`.

**Prevention**

Redis holds cache and queue state, not durable data — restarting is safe. But a queue Redis that loses its data drops enqueued jobs, so restart it during a quiet period.

---

## 20. Frontend Build Failures

**Symptom**

`npm run build` or `npm run type-check` fails.

| Error | Cause | Fix |
|---|---|---|
| `Cannot find module '@/...'` | Alias broken or file missing | Check `tsconfig.json` paths and the actual filename |
| `Type 'X' is not assignable to 'Y'` | Real type error — `strict: true` | Fix the type; do not add `any` |
| `Property does not exist on type` | Response type drifted from the API | Read the Python `return` statement |
| `'X' is possibly undefined` | Strict null checks | Narrow, or handle the undefined case |
| Out of memory | Large build | `NODE_OPTIONS=--max-old-space-size=4096 npm run build` |

**Wrong Node version**

Next.js 14.2.35 requires Node 18.17+. Check with `node -v`; use `nvm` to switch.

**Corrupt dependency tree**

```bash
rm -rf node_modules package-lock.json .next
npm install
npm run build
```

**Known type drift** — three defects found by reading the source, all in this category:

| Defect | Detail |
|---|---|
| `total_expenses` | `ClosingCashModal` reads it; `posSessionStore.closeSession` never returns it |
| `period_start_time` vs `period_start_date` | The type declares one name, the store reads the other |
| `formatCurrency` | Defaults to `USD`; the system is EGP throughout |

> **Warning**
> `npm run type-check` and `python -m py_compile api.py` have **not** been run against the current working tree in the session that produced this documentation. The defects above were found by reading source, not by running a build. **Run both before deploying.**

---

## 21. CSRF Failures

**Symptom**

```
400
Invalid CSRF Token
```

on POST, PUT, or DELETE. GET requests work fine.

**Cause**

Frappe requires `X-Frappe-CSRF-Token` on writes. `lib/axios.ts` fetches it lazily, de-dupes concurrent fetches, and retries once on failure via a `__csrfRetried` flag.

**Diagnose**

DevTools Network tab: is the header present on the failing request?

**Solution**

| Cause | Fix |
|---|---|
| Session expired | Log in again — a new session issues a new token |
| Cookies blocked | Check third-party cookie settings; see `11_Deployment.md` |
| Direct `fetch()` used | Route the call through `apiClient` |
| Retry already consumed | The underlying cause is session or cookie, not the token |

**Prevention**

Never call `fetch()` directly for a write. Every call goes through `apiClient` so the interceptor attaches the token.

---

## 22. WSL Problems

**Symptom**

Files cannot be found from Windows, or the site is unreachable from a Windows browser.

### Path Resolution

> **Warning**
> WSL files are reachable from Windows **only** via the UNC path:
>
> ```
> \\wsl.localhost\Ubuntu\home\sasa\frappe_docker\...
> ```
>
> A bare `/home/sasa/...` does not resolve from Windows tooling. This is the single most common source of "file not found" confusion in this project.

### Networking

`localhost:8000` normally forwards from Windows into WSL2. If it does not:

```bash
# inside WSL
ip addr show eth0
```

Use that IP from Windows instead. Note it changes on every WSL restart.

### Common WSL Issues

| Symptom | Cause | Fix |
|---|---|---|
| Site unreachable from Windows | Port forwarding not active | Use the WSL IP, or restart WSL |
| File not found from Windows | Bare Linux path used | Use `\\wsl.localhost\Ubuntu\...` |
| Very slow file operations | Working across the filesystem boundary | Keep the bench inside the WSL filesystem, not `/mnt/c` |
| WSL IP changed | Normal — it is dynamic | Re-check with `ip addr` |
| Clock skew after sleep | WSL clock drifts | `sudo hwclock -s` |

Clock skew is worth knowing about: it causes token and session validation failures that look like authentication bugs.

---

## 23. Docker Issues

**Symptom**

Containers will not start, or the site is unreachable.

**Diagnose**

```bash
docker compose ps
docker compose logs -f
docker compose logs <service>
```

| Symptom | Cause | Fix |
|---|---|---|
| Container restarting | Crash on startup | Read its logs |
| Port already allocated | Host port in use | Free it, or remap in the compose file |
| Database connection refused | MariaDB not ready | Wait; check its health |
| Volume permission denied | UID mismatch | Fix ownership on the host path |
| Out of disk | Image and volume accumulation | `docker system prune` — **check what it will remove first** |

**Full restart**

```bash
docker compose down
docker compose up -d
docker compose logs -f
```

> **Warning**
> `docker compose down -v` removes **volumes**, which destroys the database. Never use `-v` unless you intend to lose all data and have a verified backup.

---

## 24. Session Will Not Open

**Symptom**

`session_open` fails.

| Message | Code | Cause | Fix |
|---|---|---|---|
| A session is already open | 409 | The user has an open shift | Close it, or resume it |
| Already open on another device | 409 | Device binding | See section 8 |
| POS Profile not found | 417 | `Swift POS Settings.default_pos_profile` is wrong | Correct the setting |
| Company not found | 417 | `default_company` is wrong | Correct the setting |

**Diagnose**

```python
>>> frappe.get_single("Swift POS Settings").as_dict()
>>> frappe.get_all("POS Opening Entry",
...                filters={"status": "Open", "user": "cashier@example.com"},
...                fields=["name", "custom_device_id", "period_start_date"])
```

> **Note — Why Bad Settings Fail Late**
> The `SwiftPOSSettings` controller is empty:
>
> ```python
> class SwiftPOSSettings(Document):
> 	pass
> ```
>
> There is no `validate()`. Nothing checks that the POS Profile exists, that the price list is a selling list, or that the warehouse is a leaf. **A wrong value saves cleanly and fails later at transaction time**, far from where it was introduced.
>
> This is also why a group warehouse could be configured in the first place. Adding `validate()` is recorded in `18_Future_Roadmap.md`.

---

## 25. Invoice Submits but Stock Does Not Move

**Symptom**

The Sales Invoice exists and is submitted, but stock balance is unchanged.

**Cause**

`update_stock` was not set on the invoice. `create_invoice` sets `inv.update_stock = 1` explicitly; without it, ERPNext creates the accounting entries but no Stock Ledger Entry.

**Diagnose**

```python
>>> inv = frappe.get_doc("Sales Invoice", "ACC-SINV-2026-00187")
>>> inv.update_stock, inv.is_pos, inv.docstatus
>>> frappe.get_all("Stock Ledger Entry", filters={"voucher_no": inv.name}, fields=["item_code", "actual_qty", "warehouse"])
```

An empty Stock Ledger Entry list with `update_stock = 0` confirms it.

**Solution**

Cancel and recreate the invoice. `update_stock` cannot be changed after submit.

**Prevention**

`POS Profile.update_stock` is `1` in the fixture and `create_invoice` sets it explicitly. Both must stay that way.

> **Note — Why Sales Invoice, Not POS Invoice**
> Swift deliberately uses `Sales Invoice` with `is_pos = 1` rather than `POS Invoice`. `POSInvoice.on_submit` omits `update_stock_ledger()` and `make_gl_entries()` entirely — a POS Invoice posts nothing until it is consolidated by a background job. Sales Invoice posts both at submit.
>
> There is a comment in `create_invoice` saying exactly this. Do not "simplify" it back to POS Invoice. See `08_Sales_Workflow.md`.

---

## Diagnostic Quick Reference

```bash
# Health
bench doctor
bench --site <site> list-apps
redis-cli -p 11000 ping

# Logs
tail -f logs/web.error.log
tail -f logs/worker.error.log
tail -f logs/schedule.log

# Interactive
bench --site <site> console
bench --site <site> mariadb

# Cache
bench --site <site> clear-cache
bench restart

# Verification
python -m py_compile apps/swift_core/swift_core/api.py
npm run type-check
npm run build

# API smoke test
curl -i http://localhost:8000/api/method/swift_core.api.me   # 403 = healthy
```

---

## Known Defects — Consolidated

Every defect referenced above, in one place. All were found by reading the source.

| # | Defect | Impact | Section |
|---|---|---|---|
| 1 | `Swift POS Settings` grants write/delete to both Swift roles | Cashiers can rewrite system configuration | 3, `14` |
| 2 | `auto_close_inactive_sessions` not in `scheduler_events` | Auto-close never runs; two settings inert | 9 |
| 3 | `low_stock.py` hardcoded recipient and threshold | Alerts go to a fixed address | 11 |
| 4 | `low_stock.py` f-string HTML interpolation | Injection into recipients' mail clients | 11 |
| 5 | `low_stock.py` no company filter | Multi-company reports are wrong | 11 |
| 6 | No `Print Format` fixture | Fresh sites print A4 invoices | 6, `15`, `16` |
| 7 | Three `POS Opening Entry` custom fields not exported | Device binding silently broken on new sites | 8, `15` |
| 8 | `get_invoice` keys remaining qty by `item_code` | Duplicate lines under-report returnable qty | 12 |
| 9 | `Insta pay` typed Cash | Cash short every shift | 13 |
| 10 | `role.json` / `module_def.json` unfiltered | Overwrites other apps' records on migrate | 4, `15` |
| 11 | `SwiftPOSSettings` has no `validate()` | Bad configuration fails late | 24 |
| 12 | `total_expenses` never returned by the store | `undefined` in `ClosingCashModal` | 20 |
| 13 | `period_start_time` vs `period_start_date` | Type/store field mismatch | 20 |
| 14 | `formatCurrency` defaults to USD | Wrong symbol if the default is ever hit | 20 |
| 15 | `/returns` missing from `ROUTES`; no `allowedRoles` | Cosmetic routing gaps — API still enforces | 3, `14` |
| 16 | `POS Profile.print_format` disagrees with the frontend | Inert setting | 6, `16` |
| 17 | Stale docstrings (`api.py` module, `auto_close`) | Misleading — describes code that does not exist | 9 |
| 18 | No automated tests | Every check is manual | 20 |

Prioritised remediation is in `18_Future_Roadmap.md`.
