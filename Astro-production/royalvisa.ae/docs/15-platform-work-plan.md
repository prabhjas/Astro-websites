# 15 — Platform work plan (from Aaron review)

**Status:** Execution runbook — host-wide (all sites). Evolution **repo** project-level pins + `deploy/` templates are done; Tier 1 apply + pnpm + `@connect/site-cms` still need ops/fleet work.  
**Contract (share to other repos):** [CONNECT-ASTRO-FLEET-STANDARD.md](CONNECT-ASTRO-FLEET-STANDARD.md)  
**Host:** `/opt/Astro-production` on Astro (`178.105.150.67`)  
**Sites today:** `cbss.ae`, `royalvisa.ae`, `iberiaworkforce.com`, `spheavyrental.ae`  
**Principle:** Fix shared fate and version drift at **4** sites, not at **40**.

Related: [14-multi-site-platform-review.md](14-multi-site-platform-review.md), [13-wp-astro-mirror-playbook.md](13-wp-astro-mirror-playbook.md).

### Scope split

| Layer | Where | Examples |
|-------|--------|----------|
| **This git repo** | Evolution codebase | Exact dep pins, harden gates in app code, `deploy/*.service` templates, docs |
| **Fleet / host (runbook below)** | Shared server + all 4 trees | `User=`/MemoryMax on live units, Caddy `sites.d`, restic, pnpm workspace, extract `@connect/site-cms` |

---

## Snapshot (measured Jul 2026)

| Site | Astro | `@astrojs/node` | Tailwind | TS | Notes |
|------|-------|-----------------|----------|-----|--------|
| cbss.ae | 5.12 | 9.2 | — | 5.9 | Major behind; older CMS API subset |
| iberiaworkforce.com | 7.0.3 | 11.0 | 3.4 | 6.0 | **Likely `astro dev` in prod** (~246 MB) |
| royalvisa.ae | 7.1.6 | 11.0 | — | 5.9 | Reference: bearer CMS APIs, health, 404, Origin |
| spheavyrental.ae | 7.1.6 | 11.0 | 4.3 | 5.9 | Near-duplicate `src/pages/api/internal/` vs Evolution |

**Facts to treat as constraints:**

- ~1.16 GB `node_modules` across 4 sites (~290 MB each) → ~12 GB at 40 with npm copies.
- Evolution ↔ SP Heavy: near byte-identical internal API trees (copy-paste CMS).
- Every systemd unit runs as **root** (no `User=`).
- No `MemoryMax` / `CPUQuota`.
- One monolithic Caddyfile (~20 KB, ~130 directives); `.bak` files already exist.
- No off-box backups (only e2scrub-class disk scrub).
- ~100–120 MB RSS per SSR process → ~4.5 GB at 40 SSR on 15 GB RAM.

---

## Target architecture

```text
/opt/Astro-production/
├── pnpm-workspace.yaml
├── packages/
│   ├── site-cms/       # @connect/site-cms — internal APIs + lead/post/redirect/GTM
│   └── site-config/    # shared astro config base, unit + Caddy templates
└── sites/
    ├── cbss.ae/        # thin site: content, public, pinned deps, config
    ├── royalvisa.ae/
    ├── iberiaworkforce.com/
    └── spheavyrental.ae/
```

| Topic | Do | Don't |
|-------|----|-------|
| Disk / installs | **pnpm** content store; per-site `package.json` + lockfile | One hoisted npm `node_modules` for all sites |
| Versions | **Exact pins** (`"astro": "7.1.6"`) | Carets (`^7.1.6`) that drift by install date |
| CMS | One workspace package imported by sites | Forked `/api/internal` trees per site |
| Processes | SSR only if forms/`/api`/CMS; else Caddy `file_server` | 40 Node processes by default |
| Blast radius | Per-site unix user + MemoryMax; split Caddy; pin package versions + staged rollout | Root-for-all; one Caddy typo kills fleet; `^` on shared CMS |

**Fleet pin (exact):** Astro `7.1.6` · `@astrojs/node` `11.0.3` (match Evolution) · Tailwind `4.x` where used · TypeScript `5.9.x`.

---

## Workstreams (ordered)

### P0 — Stop the bleeding (do first tomorrow)

| # | Task | Why | Done when |
|---|------|-----|-----------|
| P0.1 | Confirm Iberia unit: if `astro dev`, switch to `astro build` + `node ./dist/server/entry.mjs` | Half the RAM of peers; unoptimized / unsafe for prod | `systemctl show` ExecStart correct; RSS ~peer; smoke homepage + API |
| P0.2 | **Tier 1 unit template** for all 4: `User=site-<name>`, `MemoryMax=256M`, `MemoryHigh=200M`, `CPUQuota=50%`, `NoNewPrivileges`, `PrivateTmp`, `ProtectSystem=strict`, `ProtectHome`, `ReadWritePaths=…/data` (and `.data` / env paths as needed) | Root RCE / one leak OOM = whole box today | Units generated from template; services run as site users; MemoryMax visible in `systemctl show` |
| P0.3 | Split Caddy: `import /etc/caddy/sites.d/*.caddy` + `caddy validate` before reload | One typo currently fails entire edge | One file per site; validate hook; reload succeeds |
| P0.4 | Backups: restic (or borg) **off-box**, nightly; schedule a monthly restore test | No real backup today = permanent loss | First successful backup + documented restore drill |

*Aaron estimate: ~1 day for Tier 1 on current 4. Needs root for users/units/Caddy/restic.*

### P1 — Version + install pilot (same week if possible)

| # | Task | Why | Done when |
|---|------|-----|-----------|
| P1.1 | Introduce pnpm workspace under `/opt/Astro-production` (or git monorepo that deploys there) | Disk + install time without coupling trees | `pnpm install` at root; each site still has own lock semantics |
| P1.2 | Pin exact versions on Evolution + SP Heavy; document fleet pin | Stop silent drift | No `^` on astro / adapter / critical peers in those two |
| P1.3 | Iberia → Astro `7.1.6` + Tailwind 4 (or document exception) + exact pins | One major line for 7.x sites | Build + restart + smoke |
| P1.4 | CBSS → Astro 7.1.x (own milestone — **major**) | Only Astro 5 left | Separate checklist; not rushed with Iberia |

### P2 — Shared CMS package (before site #5)

| # | Task | Why | Done when |
|---|------|-----|-----------|
| P2.1 | Extract Evolution `/api/internal/*` + lead/post/redirect/GTM libs → `@connect/site-cms` | Copy-paste = 40× bugfix | Package builds; Evolution imports it |
| P2.2 | Migrate SP Heavy to same package (delete duplicate tree) | Prove second consumer | SP Heavy thin; same behavior |
| P2.3 | CBSS/Iberia adopt after version catch-up | One CMS codepath | No forked internal API trees |
| P2.4 | **Pin package version per site**; roll 1 canary → shard → rest | Shared CMS must not recreate fleet blast radius | Sites declare exact `@connect/site-cms` version; no loose `^` on it |

Per-site differences = **config / env**, not forked handlers.

### P3 — Process model + scale (before ~10 SSR / before wave of 40)

| # | Task | Why | Done when |
|---|------|-----|-----------|
| P3.1 | Inventory: which of the ~40 need Node (forms, `/api/*`, CMS)? | RAM is the real limit first | List: SSR vs static |
| P3.2 | Static brochure → `astro build` + Caddy `file_server` (CDN/object later) | 0 MB, no RCE surface from Node | Policy written; first static cutover done |
| P3.3 | Shard to 3–4 hosts (~10 SSR each) only after ~10 SSR live | Blast radius + canary upgrades | Decision recorded; not day-one |

### P4 — Layout / deploy hygiene (ongoing)

| # | Task | Done when |
|---|------|-----------|
| P4.1 | Standard site folder under `sites/<domain>/` per [14](14-multi-site-platform-review.md) | All 4 match |
| P4.2 | `releases/<id>` + `current` symlink + rollback runbook | One site proven revert |
| P4.3 | Observability: Caddy access logs + `/api/health` probes (from doc 14) | Can prove cutover/outage from logs |

---

## Suggested tomorrow sequence (practical)

1. **Read this doc + confirm root access** with Aaron for Tier 1 (users, systemd, Caddy, backups).
2. **P0.1 Iberia prod ExecStart** — quick win, measure RSS before/after.
3. **P0.2 Unit template** — generate 4 units; migrate one canary (Evolution or SP Heavy) then the rest.
4. **P0.3 Caddy split** — extract current blocks to `sites.d/`; validate; reload.
5. **P0.4 Backups** — at least kick off restic target + first snapshot of `/opt/Astro-production` + `/etc/caddy` + unit files.
6. If time: **P1.2 pin Evolution + SP Heavy**; sketch `packages/site-cms` boundaries (P2.1 design only).

Do **not** start CBSS Astro 5→7 or full monorepo move until P0 is green.

---

## Explicit non-goals for first day

- Buying more servers / sharding hosts
- One shared npm `node_modules` at Astro-production root
- Hand-writing 40 unit files
- Shipping site #5 before `@connect/site-cms` exists (or a written exception)

---

## Open questions for Aaron (resolve tomorrow)

1. Off-box backup destination (S3 / B2 / another VPS)? Credentials owner?
2. Unix user naming: `site-royalvisa` vs short `site-evo`?
3. Who owns Caddy reload / unit install (root vs `site-ctl` expansion)?
4. Iberia: confirm current ExecStart is `astro dev` before changing.
5. Can CBSS stay on Astro 5 for one more week while Tier 1 lands?

---

## Reply stub (if needed)

Agreed on all of it. Plan locked in repo (`docs/15-platform-work-plan.md`): Tier 1 first (users + MemoryMax + split Caddy + backups), then pnpm + exact pins, then `@connect/site-cms` before site #5. Iberia prod process check is day-one. We’ll need root for units/Caddy/restic.
