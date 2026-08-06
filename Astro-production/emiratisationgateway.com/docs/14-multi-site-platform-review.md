# 14 — Multi-site platform plan (review response)

**Scope:** Connect Group fleet (~30 Astro mirrors)  
**Reference site to harden first:** Emiratisation Gateway (this repo) + Connect Group  
**Stance:** Approve the direction (shared packages, one deployable per site until ≥10 live, central admin that is **not** a second WordPress). Address the six review items below before freezing a factory template.

---

## Review item 1 — Observability (own milestone)

**Problem:** Caddy had no `log` directives; Node had form/Pipedrive JSON logs only. Cutover and outages could not be confirmed from edge logs.

**Required (M-obs — before wave 2):**

| Layer | Requirement |
|-------|-------------|
| **Caddy** | Global + per-site access logs (JSON), error logs to journald or `/var/log/caddy/`; rotate |
| **Node** | Structured JSON to stdout (already used for forms); **access log** for HTML/API (Evolution now emits `http_access`) |
| **Health** | `GET /api/health` → `{ ok: true }` for systemd/Caddy checks (Evolution ships this) |
| **Alerting** | Unit restart storms, 5xx rate, `/api/contact` failure rate, disk on `LEAD_STORE_DIR` |
| **Retention** | ≥14 days access logs; lead JSON retained per site policy |

Do **not** treat this as a footnote under deploy. Block wave-2 migrations until Caddy logs + health checks exist on the Astro host.

---

## Review item 2 — Version convergence (explicit task)

**Today on `Astro` host (measured):**

| Site | Declared Astro |
|------|----------------|
| CBSS | `^5.12.0` (Astro 5 line) |
| Iberia Workforce | `^7.0.3` |
| Evolution ME | `^7.1.6` |

**Plan:**

1. **Freeze target:** Astro **7.1.x** + `@astrojs/node` matching Evolution (this repo).
2. **M1 workstream:** Iberia → 7.1.x (minor); CBSS → 7.1.x is a **major** migration — schedule as its own milestone (not a mechanical bump). Document breaking changes (middleware, `security.allowedDomains`, adapter).
3. **CI:** fail if `package.json` astro major ≠ fleet pin.
4. Do not start new mirrors on Astro 5.

---

## Review item 3 — Harden reference before freeze

Do **not** mass-produce defects. Evolution (this repo) now includes these gates; **every** new mirror must pass them before “reference frozen”:

| Defect | Status on Evolution | Gate |
|--------|---------------------|------|
| Unknown URL → 503 + `prepare:page` text | Fixed: `404.astro` + catch-all returns 404 | Curl random slug → **404**, body has no `prepare:page` |
| HTTPS form/Origin 403 behind Caddy | Fixed: `security.allowedDomains` + contact posts **JSON** | HTTPS Form/JSON POST → not 403 |
| macOS-only `package-lock.json` | Fixed: lock regenerated with linux + darwin bindings | `npm ci && npm run build` on Linux CI |

Also required on the skeleton:

- No per-site dashboard UI (central CMS); keep `/api/internal/*` + file stores
- Auth = per-site `INTERNAL_JOB_SECRET` bearer (not session cookies for machines)
- `.env.prod` has **no** `HOST`/`PORT`; LF only
- Playbook [13](13-wp-astro-mirror-playbook.md) checklist green

---

## Review item 4 — Machine credentials (control plane)

**Do not** give central admin every site’s `DASHBOARD_SESSION_SECRET`. A stolen session secret = mintable `super_admin` cookies per site.

**Required model (already implemented on Evolution APIs):**

- Central CMS holds **per-site** `INTERNAL_JOB_SECRET` (or short-lived tokens derived from it).
- Site APIs accept only `Authorization: Bearer <secret>` (plus legacy header/`?secret=` for cron).
- Human SSO lives in the **central** control plane; sites never need `DASHBOARD_USERS_JSON` for CMS.
- Rotate job secrets independently per site; never reuse one secret across 30 domains.

See [12-lead-ops-dashboard.md](12-lead-ops-dashboard.md).

---

## Review item 5 — Rollback story

Approvals prevent bad publishes; rollback recovers from them.

**Per-site release layout (recommended):**

```text
/opt/Astro-production/<domain>/
  current -> releases/<id>
  releases/<id>/          # immutable build
  releases/<previous>/
  .env.prod               # not inside release (or copied with care)
```

**Revert path (document in every runbook):**

1. `ln -sfn releases/<previous> current` (or restore last known-good `dist/`)
2. `sudo site-ctl restart <site>` (or `systemctl restart <unit>`)
3. Smoke: `/api/health`, homepage 200, `POST /api/contact` validation 422, one known page
4. Record incident: who published, which release id, why reverted

**Content rollback:** posts/redirects/GTM are files on disk — CMS must keep revision history **or** rely on git/`releases/` snapshots of `src/content` + `INTERNAL_ADMIN_DIR` backups (daily).

Evolution today: keep `.dist-backup-*` style snapshots until symlink releases are standard.

---

## Review item 6 — Capacity (state the numbers)

Measured on host `Astro` (15 GiB RAM, ~261 GiB free disk), Jul 2026:

| Resource | Observed | 30-site planning |
|----------|----------|------------------|
| SSR RSS | Evolution ~56 MB steady / ~94 MB peak (systemd) | Use **~110 MB/site** buffer → ~3.3 GB for 30 SSR processes — fits in 15 GB with headroom |
| `node_modules` | ~190–320 MB/site | ~8–10 GB for 30 copies; **pnpm** shared store recommended |
| Site tree | Evolution ~535 MB incl. modules | Comfortable on 300 GB root |

**Fleet rule:** one deployable per site until ≥10 live; then revisit multi-tenant only if ops cost dominates. Disk: prefer pnpm; do not delete `node_modules` mid-deploy without a release directory.

---

## Milestones (updated)

| ID | Focus | Exit criteria |
|----|-------|---------------|
| **M-harden** | Evolution (+ Connect) as clean reference | 404, Origin, lockfile, bearer APIs, health, access logs |
| **M-obs** | Caddy + Node + alerts | Can prove cutover/outage from logs; `/api/health` monitored |
| **M-ver** | Astro 7.1.x pin | Iberia on 7.1.x; CBSS major upgrade plan scheduled |
| **M1** | Shared packages extract | Platform code not copy-pasted; one Astro version in new sites |
| **M2** | Central CMS + per-site job secrets | Posts/leads/SEO via API; no per-site UI |
| **M3** | Releases + rollback | Symlink (or equivalent) revert tested on one site |
| **Wave 2+** | Next mirrors | Only after M-harden + M-obs |

---

## Standard site layout (Aaron — agreed)

Target under `/opt/Astro-production/<domain>/` (Evolution is the live reference):

```text
/opt/Astro-production/<domain>/
  .env.prod          # secrets; no HOST/PORT (systemd sets bind)
  .env.example
  package.json       # engines.node >=22.12; astro ^7.1.x
  package-lock.json
  astro.config.mjs   # security.allowedDomains for HTTPS Origin
  src/               # app + /api/internal/* (bearer INTERNAL_JOB_SECRET)
  public/
  dist/              # build output (or releases/ + current later)
  deploy/            # unit snippet + Caddy notes (optional but preferred)
  docs/
```

**Shared `node_modules`:** yes later via **pnpm store / shared platform package** once all sites are on Astro **7.1.x**. Do **not** symlink one `node_modules` across sites while CBSS is still Astro 5.

**Fleet pin:** Node `>=22.12`, Astro `7.1.x`, `@astrojs/node` matching Evolution.

---

## Reply to Aaron (WhatsApp — copy/paste)

Agreed — same folder structure for all under `/opt/Astro-production/<domain>/`, engines pin (Node 22.12+, Astro 7.1.x). Evolution is ready for you to connect the CMS flow (bearer `/api/internal/*`, no per-site dashboard). Shared node_modules comes next via pnpm/shared package after Iberia/CBSS are on 7.1 (CBSS is a major bump). New sites can follow Evolution’s layout as plug-and-play.
