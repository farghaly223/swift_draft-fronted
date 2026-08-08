# 11 — Deployment

## What You Are Deploying

Two independent processes:

| Process | Artifact | Runtime |
|---|---|---|
| Backend | `swift_core` app inside a Frappe bench | Python / Gunicorn |
| Frontend | Next.js production build | Node.js |

They are deployed and scaled separately. The frontend is a browser client that happens to be served by Node — it holds no state and can be replaced or restarted at any time without affecting data.

> **Note — Environment-Specific Values**
> This document does not invent domains, credentials, connection strings, certificate paths, backup retention policies, or resource sizing. Where a value depends on your infrastructure it is marked **environment-specific**, and the decision is yours. Every command shown is real and runnable; every placeholder is explicitly a placeholder.

---

## Components

| Component | Role | Version constraint |
|---|---|---|
| **Python** | Backend runtime | ≥ 3.10 (`pyproject.toml`) |
| **Frappe Framework** | Web framework, ORM, auth, permissions | v15 |
| **ERPNext** | Stock and accounting engine | v15 (matching bench) |
| **HRMS** | Present on the reference site | Optional for Swift |
| **Bench** | Frappe CLI and process manager | Current |
| **MariaDB** | Primary datastore | Per Frappe v15 requirements |
| **Redis** | Cache, queue, and socketio | 3 instances, bench-managed |
| **Node.js** | Frontend runtime; also bench asset builds | Compatible with Next.js 14 |
| **`swift_core`** | This app | 0.0.1 |
| **Frontend** | Next.js app | 1.0.0 |

**Dependency direction:** `swift_core` imports from `erpnext` directly (`erpnext.controllers.sales_and_purchase_return`, ERPNext DocTypes). **ERPNext is a hard requirement**, not optional.

---

## Prerequisites

Before installing anything:

- A working Frappe v15 bench, or Docker with `frappe_docker`
- ERPNext v15 installed on the target site
- MariaDB reachable with credentials that can create and alter the site database
- Redis running (bench manages three instances)
- Node.js and npm for the frontend
- Git

The reference development environment is **`frappe_docker` running under WSL2 on Windows**, with the bench at:

```
/home/sasa/frappe_docker/development/frappe-bench
```

From Windows, those files are reachable only through the UNC path:

```
\\wsl.localhost\Ubuntu\home\sasa\frappe_docker\development\frappe-bench
```

> **Warning — WSL Path Access**
> A bare Linux path such as `/home/sasa/...` does **not** resolve from Windows tooling. Only the `\\wsl.localhost\Ubuntu\...` form works. This trips up editors, scripts, and file dialogs constantly. See `17_Troubleshooting.md`.

---

## Development Setup

### 1. Install the Backend App

```bash
cd $PATH_TO_YOUR_BENCH
bench get-app <repo-url-or-path> --branch <branch>
bench --site <site-name> install-app swift_core
```

Expected: the app appears in `bench --site <site-name> list-apps` alongside `frappe`, `erpnext`, and any others.

```bash
bench --site <site-name> list-apps
```

```
frappe   15.x.x
erpnext  15.x.x
hrms     15.x.x
swift_core 0.0.1
```

### 2. Enable Developer Mode

Required for DocType changes to be written back to files:

```bash
bench set-config -g developer_mode 1
bench --site <site-name> clear-cache
```

### 3. Apply Fixtures

Installation applies fixtures automatically. To reapply after a pull:

```bash
bench --site <site-name> migrate
```

> **Warning**
> `bench migrate` applies **all** fixtures, and Swift's fixtures are over-broad — `role.json` exports ~60 roles and `module_def.json` exports 36 module definitions belonging to frappe, erpnext, and hrms. Migrating **overwrites site records that Swift does not own**. Read `15_Fixtures.md` before running this on a site with customised roles.

### 4. Configure Swift POS Settings

Open the desk as an administrator and set:

| Field | Requirement |
|---|---|
| `default_company` | Existing Company |
| `default_pos_profile` | Existing POS Profile |
| `default_price_list` | A **selling** Price List |

Nothing works until all three are set — every endpoint calls `resolve_config()`.

> **Warning**
> Nothing validates that the POS Profile's warehouse is a leaf. The controller has no `validate()`. If you point it at a group warehouse, sales still work (Swift resolves leaves per line) but the group node propagates into `set_warehouse` and has historically broken returns. Prefer a leaf warehouse. See `04_Database.md`.

### 5. Create the Print Format

> **Warning — Manual Step, Not Version-Controlled**
> The frontend requests `format=Swift` when printing. **No `Print Format` fixture exists**, so a fresh site has no such format and printing will not produce the intended receipt.
>
> You must create a Print Format named exactly **`Swift`** for `Sales Invoice` in the desk, and configure a Letter Head for the logo. See `16_Printing.md`.

### 6. Create Users and Assign Roles

Assign the `cashier` or `storekeeper` **Role Profile** — this is what grants `Swift Cashier` / `Swift Storekeeper`. A user with neither cannot log in; `login` rejects them.

### 7. Start the Backend

```bash
bench start
```

Serves on port 8000 by default.

### 8. Install and Run the Frontend

```bash
cd <frontend-directory>
npm install
```

Create `.env.local`:

```env
NEXT_PUBLIC_FRAPPE_URL=http://localhost:8000
```

> **Note**
> `env.ts` defaults to `http://localhost:8000` when the variable is unset, so local development works without the file. Set it explicitly for anything else. `.env*.local`, `.env`, and `.env.production` are all gitignored.

```bash
npm run dev
```

Serves on port 3000.

### 9. Verify

```bash
npm run type-check
```

Must pass — `strict: true` is enabled and this is the only automated correctness check the project has.

```bash
curl -i "http://localhost:8000/api/method/swift_core.api.me"
```

Expected `403` when unauthenticated. That confirms the app is loaded and the endpoint is routed. A `404` means `swift_core` is not installed on the site.

---

## Production Setup

### Backend

Follow Frappe's standard production process:

```bash
sudo bench setup production <user>
```

This configures Nginx, Supervisor, and Gunicorn workers. Then:

```bash
bench --site <site-name> set-config developer_mode 0
bench --site <site-name> clear-cache
bench setup nginx
sudo supervisorctl restart all
```

Environment-specific decisions, all yours:

| Decision | Notes |
|---|---|
| Domain / site name | — |
| TLS certificates | `bench setup lets-encrypt <site>` or your own |
| Gunicorn worker count | Scale to CPU and load |
| MariaDB tuning | Buffer pool, connections, character set |
| Redis persistence | Whether cache/queue survive restart |
| `session_expiry` | Frappe default `06:00` |
| Email (`frappe.sendmail`) | Required for the low-stock alert |

### Frontend

```bash
npm run build
npm run start
```

Set `NEXT_PUBLIC_FRAPPE_URL` to the production Frappe origin **at build time** — `NEXT_PUBLIC_*` variables are inlined into the bundle. Changing it requires a rebuild, not just a restart.

Serve behind a reverse proxy with TLS. Hosting choice (Node process under a proxy, container, or a platform such as Vercel) is environment-specific.

### The Cross-Origin Decision

This is the most important production decision for authentication.

The `sid` cookie belongs to the **Frappe** origin. For the frontend to authenticate:

1. Client sends credentials — already done (`withCredentials: true`).
2. Server returns `Access-Control-Allow-Credentials: true` and an **explicit** `Access-Control-Allow-Origin` (a wildcard is invalid with credentials).

Point 2 is configuration in the Frappe site config / Nginx, **not** in `swift_core`.

> **Warning**
> If the two are on unrelated domains, the cookie is cross-site and browsers require `SameSite=None; Secure` — mandating HTTPS on both, and still subject to third-party-cookie restrictions that several browsers now apply by default.
>
> **The robust option is to avoid cross-site entirely:** reverse-proxy both under one host, or use a shared parent domain. Same-site cookies avoid `SameSite=None` and third-party blocking altogether.
>
> Printing depends on this too — `/printview` is a top-level navigation to the Frappe origin and needs the cookie sent as first-party.

### Security Checklist Before Going Live

| Item | Why |
|---|---|
| `developer_mode = 0` | Prevents schema writes and leaks less detail |
| HTTPS on both origins | Required for `Secure` cookies |
| Restrict `Access-Control-Allow-Origin` to the exact frontend origin | Never a wildcard with credentials |
| Verify `.gitignore` excludes `api.py`, `.env*` | Prevents committing the backend copy and secrets |
| **Fix the `Swift POS Settings` permissions** | Cashiers currently have `write` + `delete` on the config root — see `14_Permissions.md` |
| Set the low-stock recipient | Currently hardcoded to a personal Gmail address |
| Confirm strong passwords / disable unused accounts | Frappe-level |
| Review whether cashiers need desk access at all | The `cashier` Role Profile grants desk roles |

> **Warning**
> The repository visibility decision matters. `front/api.py` is a copy of the entire backend, and `.gitignore` correctly excludes it — but confirm it was never committed **before** the ignore rule was added:
> ```bash
> git log --all --oneline -- api.py
> ```
> If it appears in history, the file is still retrievable from the repository even though it is now ignored.

---

## Deployment Commands

### Standard Backend Update

```bash
cd $PATH_TO_YOUR_BENCH

bench --site <site-name> backup --with-files      # always first

cd apps/swift_core && git pull && cd ../..

bench --site <site-name> migrate
bench build --app swift_core                      # only if assets changed
bench restart
```

### Backend Code Change Only

Python changes need a restart, not a migrate:

```bash
bench restart
```

> **Warning**
> Editing `api.py` without restarting leaves the old code serving requests. This is the single most common cause of "I fixed it but nothing changed". Under `bench start` in development the watcher usually reloads; in production Supervisor does **not**.

### Frontend Update

```bash
git pull
npm install          # if dependencies changed
npm run type-check
npm run build
# restart the Node process (pm2 restart / systemctl restart / redeploy)
```

### Selected Bench Commands

```bash
bench --site <site> migrate            # schema + patches + fixtures
bench --site <site> clear-cache
bench --site <site> console            # interactive Python with frappe loaded
bench --site <site> mariadb            # SQL shell
bench restart
bench start                            # development, foreground
bench --site <site> list-apps
bench version
bench doctor                           # queue and scheduler health
```

---

## The Two-Copy Workflow

> **Warning — Read This Before Editing Backend Code**
> This project has an unusual and error-prone development workflow.
>
> `front/api.py` is a **staging copy** of `swift_core/api.py`. Backend edits are made in the frontend directory and then copied into the bench manually. The file is gitignored and is not executed by the frontend.
>
> **The authoritative file is the one inside the bench.** After editing the staging copy you must:
> 1. Copy it to `<bench>/apps/swift_core/swift_core/api.py`
> 2. Run `bench restart`
>
> Skipping either step means the running system does not have your change. Skipping the copy while testing the frontend produces the confusing situation where the code you are reading is not the code that is running.
>
> Before deploying, confirm the two are identical. A diff between them is a deployment bug waiting to happen.

---

## Backup

```bash
bench --site <site-name> backup --with-files
```

Produces, under `sites/<site-name>/private/backups/`:

| File | Contents |
|---|---|
| `*-database.sql.gz` | Full database |
| `*-files.tar` | Public files |
| `*-private-files.tar` | Private files |
| `*-site_config_backup.json` | Site configuration |

`--with-files` is important — the letterhead logo used on receipts lives in files, not the database.

Environment-specific and **not configured by this app**: schedule, retention, off-site copy, encryption, and restore testing. Frappe supports scheduled backups via `bench set-config` and integrations for S3-compatible offsite storage; choosing and configuring them is a deployment decision.

> **Warning**
> Backups written only to the same host protect against application error, not hardware or host loss. Copy them off-host.

---

## Restore

```bash
bench --site <site-name> restore /path/to/database.sql.gz \
  --with-public-files /path/to/files.tar \
  --with-private-files /path/to/private-files.tar
```

**This destroys the current site database.** Take a fresh backup first, even of a broken site.

After restoring:

```bash
bench --site <site-name> migrate
bench --site <site-name> clear-cache
bench restart
```

Then verify: log in as a cashier, check `Swift POS Settings` is populated, confirm the `Swift` print format exists, and print a historical invoice.

---

## Migrations

```bash
bench --site <site-name> migrate
```

Runs, in order: pre-model-sync patches → DocType sync → post-model-sync patches → **fixtures**.

### `swift_core` Has No Patches

```
[pre_model_sync]
[post_model_sync]
```

`patches.txt` is empty. No data migration has ever been written for this app.

**Consequence:** if a future change requires transforming existing data (renaming a field, backfilling a value), there is no precedent in this codebase and no patch has ever been tested here. The first one written will also be the first one run.

### Migration Risk Is Concentrated in Fixtures

Because there are no patches, the risk of `bench migrate` is almost entirely **fixture overwrites**. `role.json`, `module_def.json`, `item_group.json`, `price_list.json`, `mode_of_payment.json`, `workspace.json`, and `pos_profile.json` all export records Swift does not own, and migrating rewrites them from the JSON files.

Always back up first. Read `15_Fixtures.md`.

### Migration Failure

`bench migrate` is not transactional across steps. A failure can leave the site partially migrated.

```bash
bench --site <site-name> migrate            # re-running is usually safe
tail -f sites/<site-name>/logs/*.log        # or check the console output
```

If it cannot be resolved, restore the pre-migration backup. Detail in `17_Troubleshooting.md`.

---

## Monitoring and Logging

### Log Locations

| Log | Path |
|---|---|
| Site logs | `sites/<site-name>/logs/` |
| Bench logs | `logs/` |
| Worker | `logs/worker.log`, `logs/worker.error.log` |
| Scheduler | `logs/schedule.log` |
| Web | `logs/web.log`, `logs/web.error.log` |
| Nginx | Environment-specific (typically `/var/log/nginx/`) |
| Supervisor | Environment-specific |

### In-App

The desk exposes **Error Log** (unhandled exceptions with tracebacks), **Scheduled Job Log**, **Activity Log**, and **Email Queue**. Error Log is the first place to look for a 500.

### Scheduler Health

The scheduler runs Swift's only background job — the daily low-stock alert.

```bash
bench doctor
bench --site <site-name> execute frappe.utils.scheduler.is_scheduler_inactive
```

Re-enable if paused:

```bash
bench --site <site-name> enable-scheduler
```

> **Warning**
> `bench --site <site> set-maintenance-mode on` **pauses the scheduler**, and it is easy to leave on after maintenance. A silently paused scheduler means no low-stock alerts, with no error anywhere. Check it explicitly after any maintenance window.

### What Is Not Monitored

Stated plainly:

| Capability | Status |
|---|---|
| Application performance monitoring | **Not configured** |
| Error aggregation (Sentry or similar) | **Not configured** |
| Uptime / health-check endpoint | **Not implemented** — there is no `/health` |
| Metrics export | **Not configured** |
| Log shipping | **Not configured** |
| Alerting on failures | **Not configured** — the only email Swift sends is the low-stock alert |

All of these are environment-specific additions. Recorded in `18_Future_Roadmap.md`.

For a liveness check, `GET /api/method/swift_core.api.me` returning **403** proves the app is loaded and routing correctly without requiring credentials.

---

## Post-Deployment Verification

Run this after every deployment. There are no automated tests, so this is the safety net.

**Backend reachable**

```bash
curl -i "https://<frappe-host>/api/method/swift_core.api.me"
```

Expect `403`. A `404` means the app is not installed.

**Then, through the UI:**

| # | Check | Expected |
|---|---|---|
| 1 | Log in as a cashier | Redirect to `/pos` |
| 2 | No open shift | Non-dismissible opening modal |
| 3 | Open a shift | POS screen renders |
| 4 | Scan a known barcode | Item added, toast shown |
| 5 | Scan an unknown barcode | Clear error, cart unchanged |
| 6 | Complete a sale | Invoice returned with a total |
| 7 | Verify in the desk | Sales Invoice submitted, SLE and GL posted |
| 8 | Print the receipt | Correct format, logo present |
| 9 | Process a partial return | Succeeds, **no group-warehouse error** |
| 10 | Verify the return | Stock back in the **sold-from** warehouse |
| 11 | Record an expense | Journal Entry tagged `[POS:...]` |
| 12 | Close the shift | Expected, counted, and difference shown |
| 13 | Log in as a storekeeper | Redirect to `/inventory` |
| 14 | **Import** a small `.xlsx` | Preview shows rows; commit applies them |
| 15 | Re-import the same file | No duplicates, no errors (idempotent) |
| 16 | **Export** inventory | `.xlsx` downloads and opens |
| 17 | **Search** inventory | Filters correctly |
| 18 | Call a storekeeper endpoint with a cashier session | **403** |

Steps 9, 14, 16, and 17 are the ones that have broken before. Do not skip them.
