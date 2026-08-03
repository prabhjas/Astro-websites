# 14 — Multi-site Astro platform plan (~30 websites)

**Audience:** engineering, product, SEO, content, DevOps, leadership  
**Pilot:** Connect Group Astro (`connectgroup.co`) — this repo  
**Goal:** Turn the CEO target architecture into an executable plan for migrating ~30 similar WordPress sites onto a shared Astro platform.

---

## 1. Target architecture (from leadership)

```text
 FLOW
   │
   ▼
 ADMIN ALL SITES
   │
   ▼
 BLOGS AND SITES MODIFICATIONS
   │
   │  Approvals etc.
   ▼
 SERVER ASTRO
   ├──► WEB 1
   ├──► WEB 2
   └──► WEB 3 … WEB N (~30)
```

| Stage | Meaning |
|-------|---------|
| **Flow** | Standard operating process for every site: invent → migrate → operate → change → approve → publish |
| **Admin all sites** | One control plane to manage every property (auth, roles, content, SEO, redirects, leads, releases) — not 30 separate WP admins |
| **Blogs & sites modifications** | Editors/devs change pages, posts, SEO, redirects, GTM, assets per site (or shared templates) |
| **Approvals etc.** | Gate before anything hits production: review, SEO check, staging preview, role-based publish |
| **Server Astro** | Shared Astro runtime / build + deploy pipeline that serves (or deploys to) each live site |
| **Web 1…N** | Individual live domains — same platform, site-specific content, branding, and config |

This document is the plan to get from **today’s single-site Astro app** to that multi-site shape without redoing the pilot thirty times from scratch.

---

## 2. What we already have (pilot = Connect Group)

Treat this repo as **Site 0 / reference implementation**, not a one-off.

| Capability | Today (single site) | Maps to CEO stage |
|------------|---------------------|-------------------|
| Astro Node SSR + static hybrid | Live/cutover-ready for Connect Group | **Server Astro** |
| `/internal/operations` dashboard | Leads, redirects, SEO (`robots` / `llms` / sitemap), GTM, uploads, posts | Seed of **Admin** (one site) |
| Runtime redirects + Rank Math / CSV import | Persistent rules + `_redirects` generate | Site modifications |
| Lead store → Pipedrive | Forms without WP/CF7 | Per-site integrations |
| Docs + go-live handoff | Cloudflare, permissions, smoke tests | Repeatable **Flow** |

**Gap vs CEO diagram:** admin is **per site**, not **all sites**; there is **no formal approvals / publish queue**; there is **one** web property, not a multi-tenant server.

---

## 3. End-state platform (recommended)

### 3.1 Logical model

```text
┌─────────────────────────────────────────────────────────┐
│                 PLATFORM CONTROL PLANE                   │
│  Admin all sites  ·  users/roles  ·  approvals  ·  audit │
└────────────────────────────┬────────────────────────────┘
                             │ siteId + change set
                             ▼
┌─────────────────────────────────────────────────────────┐
│              ASTRO PLATFORM RUNTIME / CI                 │
│  shared packages  ·  per-site config  ·  build/deploy    │
└───┬─────────────┬─────────────┬─────────────────────────┘
    ▼             ▼             ▼
 Web 1          Web 2         Web N
 (domain,       (domain,      (domain,
  theme,         theme,        theme,
  content)       content)      content)
```

### 3.2 Recommended technical shape

| Layer | Recommendation | Why |
|-------|----------------|-----|
| **Monorepo** | One repo (or org with shared packages): `apps/<site>`, `packages/platform-*` | One Astro version, shared dashboard/SEO/redirect/lead libs; per-site pages/theme |
| **Site identity** | Each site: `siteId`, primary domain, brand tokens, env, integrations (Pipedrive keys, GTM, etc.) | Admin “all sites” needs a registry |
| **Content** | Marketing pages: Astro components + curated HTML migration; **blogs/posts**: shared CMS-style store (file → later DB) with site scope | Matches “blogs and sites modifications” |
| **Admin** | Evolve `/internal/operations` → **multi-site admin** (`/admin` or keep path): pick site → same modules as today | Reuse pilot UI; add site switcher + registry |
| **Approvals** | Draft → Review → Approved → Publish (staging first) | CEO gate; prevents accidental live edits |
| **Runtime** | Prefer **one Node fleet pattern** per env (staging/prod) with site resolved by host header **or** one deployable app per site from shared packages | Start with **one app per site** (safer isolation); converge to multi-tenant host routing only when ops is ready |
| **Edge** | Cloudflare (or equivalent) per domain → origin; shared allowlists for SEO paths | Same go-live rules as [13-go-live-server-handoff.md](13-go-live-server-handoff.md) |

**Practical default for the first 5–10 sites:** shared packages + **separate deployable Astro app per domain** (same Dockerfile/CI). One admin app (or admin mode) that can write into each site’s data store. Multi-tenant single process comes later if cost/ops demand it.

---

## 4. Operating flow (the “FLOW” box)

Every site follows the same lifecycle:

```text
1. Inventory          → URLs, forms, redirects, SEO, owners
2. Export & migrate   → WP HTML / posts → Astro (pilot playbook)
3. Parity QA          → design, links, forms, CWV, SEO
4. Staging cutover    → Cloudflare staging / hosts file
5. Approvals          → SEO + content + eng sign-off
6. Go-live            → DNS + handoff checklist (doc 13 pattern)
7. Steady-state ops   → Admin modifications → Approvals → Publish
```

**Rule:** No site goes live without: redirect map, robots/sitemap/`llms` smoke, form→CRM test, and named approvers.

---

## 5. Admin all sites — product plan

### 5.1 Site registry

Minimum fields per site:

- `siteId`, display name, primary domain(s)
- Status: `planned` | `migrating` | `staging` | `live` | `archived`
- Brand: logo, colors, fonts (tokens)
- Integrations: GTM, Pipedrive (or other CRM), analytics
- Data roots: redirects, SEO files, leads, posts, uploads
- Owners: eng, SEO, content, business

### 5.2 Modules (reuse pilot, scope by site)

| Module | Pilot today | Multi-site change |
|--------|-------------|-------------------|
| Login / roles | viewer, developer, seo, super_admin | Add **site-scoped** roles + platform super_admin |
| Leads | File store | Partition by `siteId`; optional shared CRM mapping |
| Redirects | Rank Math / CSV import | Per-site rules; shared import UX |
| SEO | robots, llms, sitemap overrides | Per-site files + shared generator code |
| GTM | Runtime loader | Per-site container IDs |
| Posts / blogs | Operations posts UI | Site-scoped posts + categories/tags |
| Uploads / PHP bridge | As needed | Only for sites that still need interim bridges |
| Approvals | **Missing** | New: change sets + review queue |

### 5.3 UX sketch

1. Login → **All sites** home (cards/table of 30 properties).  
2. Open a site → familiar operations workspace (leads, SEO, redirects, posts…).  
3. Edits create a **draft change set** → submit for approval → publish to staging → promote to prod.

---

## 6. Approvals (mandatory gate)

Without this, “Admin all sites” becomes “anyone can break 30 domains.”

| Change type | Suggested approvers | Publish target |
|-------------|---------------------|----------------|
| Blog post / page copy | Content + SEO | Staging → Prod |
| Redirects / SEO files | SEO (+ eng for bulk import) | Staging → Prod |
| GTM / tracking | Marketing + eng | Prod (with audit) |
| Theme / layout / package upgrade | Eng lead | Staging → Prod |
| New site go-live | Eng + SEO + business owner | Prod cutover |

**Implementation (phased):**

1. **v1:** Manual checklist + staging URL review (process only).  
2. **v2:** Dashboard “Submit for review” + status on change sets; email/Slack notify.  
3. **v3:** Role-locked Publish button; immutable audit log.

---

## 7. Server Astro — how ~30 webs are served

### Phase A — Factory (sites 1–N while migrating)

- Shared: `packages/ui`, `packages/seo`, `packages/redirects`, `packages/leads`, `packages/auth`, migration scripts.  
- Per site: `apps/<siteId>` (pages, theme, `site.config.ts`, env).  
- CI: build/deploy matrix keyed by `siteId`.  
- Admin: starts single-site; grows site picker when registry exists.

### Phase B — Control plane (steady state)

- Central admin (dedicated app or mode) writes approved artifacts into each site’s store.  
- Each live site still runs Astro SSR (Node) behind Cloudflare.  
- Optional later: one multi-tenant Node that selects site by `Host`.

### What stays shared vs site-local

| Shared (platform) | Site-local |
|-------------------|------------|
| Auth helpers, roles model | Users allowed on that site |
| Redirect engine + import parsers | Redirect rules |
| SEO file generators / sitemap discovery | robots, llms seed, overrides |
| Lead pipeline shape | CRM keys, form schemas |
| Dashboard UI shells | Branding, nav, page inventory |
| Go-live / Cloudflare playbooks | Domain, DNS, WAF exceptions |

---

## 8. Migration factory for ~30 sites

Do **not** custom-craft each site. Productize the Connect Group path.

### 8.1 Per-site migration kit (checklist)

1. **Phase 0 — Inventory:** URL list, forms, Rank Math redirects export, GTM IDs, owners.  
2. **Export:** WP Rocket / HTML dumps + media; posts export if blog-heavy.  
3. **Scaffold:** `apps/<site>` from template (copy from Connect Group skeleton).  
4. **Clean pipeline:** reuse `prepare-*` scripts; site-specific URL rewrites.  
5. **Parity:** homepage + top N URLs; forms; redirects sample; CWV baseline.  
6. **Ops enable:** site entry in registry; SEO/redirects/leads data dirs.  
7. **Staging + approvals** → **go-live handoff** (clone of doc 13).

### 8.2 Suggested waves

| Wave | Sites | Outcome |
|------|-------|---------|
| **0** | Connect Group | Platform reference live; docs proven |
| **1** | 2–3 similar marketing sites | Template + admin multi-site v1 |
| **2** | Next ~10 | Migration factory + approvals v2 |
| **3** | Remaining ~15–20 | Parallel teams; shared CI; harden multi-tenant only if needed |

Prioritize sites by: traffic, SEO risk, content similarity to pilot, and business deadline — not alphabetically.

### 8.3 Effort model (rough)

| Work | First site (pilot) | Template site (wave 1) | Factory site (wave 2+) |
|------|--------------------|------------------------|-------------------------|
| Platform / shared libs | High | Medium | Low |
| Site chrome + pages | High | Medium–high | Medium (scales with uniqueness) |
| Redirects + SEO | Medium | Low–medium | Low–medium |
| Forms / CRM | Medium | Low if same CRM | Low |
| Go-live / CF | Medium | Low (playbook) | Low |

Expect uniqueness (Elementor layouts, languages, forms) to dominate cost — shared platform only removes repeated plumbing.

---

## 9. Roles & governance

| Role | Scope |
|------|-------|
| **Platform super_admin** | All sites; users; publish prod; package upgrades |
| **Site admin** | One site’s settings, GTM, users (limited) |
| **SEO** | Redirects + robots/llms/sitemap for assigned sites |
| **Content / editor** | Posts/pages drafts; submit for approval |
| **Developer** | Staging deploys, retries, technical modules |
| **Viewer** | Read-only analytics / leads export |

Approvals must be enforceable in product by wave 2 — process-only is acceptable only for wave 0–1.

---

## 10. Data & environments

| Env | Purpose |
|-----|---------|
| **Local** | Dev against one `siteId` |
| **Staging** | Per-site or shared staging hosts; approval previews |
| **Production** | Live Web 1…N |

**Data:** start with partitioned file stores (`INTERNAL_ADMIN_DIR/<siteId>/…`) matching the pilot; plan DB migration when lead volume, approvals, or multi-editor concurrency requires it ([12-lead-ops-dashboard.md](12-lead-ops-dashboard.md) already flags this).

**Secrets:** per-site env (CRM tokens, session secrets); never share production secrets across sites.

---

## 11. Risks (multi-site specific)

| Risk | Mitigation |
|------|------------|
| Copy-paste of 30 full repos | Monorepo + packages from wave 1 |
| One bad publish hits wrong site | Site-scoped change sets + confirm domain on publish |
| SEO regression at cutover | Mandatory redirect + sitemap smoke (doc 13) |
| Admin becomes a second WordPress | Keep admin **ops + structured content**, not Elementor-like freeform |
| Shared package break-all | Semver packages; staged rollouts; per-site pin if needed |
| Approvals skipped under deadline | Make prod publish role-gated; log every publish |

---

## 12. Delivery roadmap (platform)

| Milestone | Deliverable | Exit criteria |
|-----------|-------------|---------------|
| **M0** | Pilot live (Connect Group) | Doc 13 checklist green |
| **M1** | Extract shared packages from pilot | Second site scaffolds from template in &lt; 1 day |
| **M2** | Site registry + site switcher in admin | Ops can open 2+ sites from one login |
| **M3** | Approvals v1 (status + staging preview) | No prod SEO/redirect change without Approved |
| **M4** | Migration factory runbook + CI matrix | Wave 1 (2–3 sites) live |
| **M5** | Approvals v2 + audit log | Wave 2 sites on same flow |
| **M6** | Optional multi-tenant host routing | Only if ops cost justifies |

---

## 13. Immediate next actions

1. **Confirm inventory of ~30 domains** (name, CMS today, traffic tier, owner, must-keep features).  
2. **Freeze Connect Group as reference** — document “do not fork; extract packages.”  
3. **Pick wave 1 sites** (2–3 closest to pilot).  
4. **Sketch site registry schema** and where admin will live (extend `/internal/operations` vs new `/admin`).  
5. **Define approval matrix** with SEO/content leads (who signs what).  
6. **Clone go-live handoff** into a per-site template checklist.

---

## 14. Decision log (open — leadership / eng)

Resolve these early; they change cost and shape:

1. **One deployable per site vs multi-tenant single Node** for the first year? *(Recommend: one deployable per site until ≥10 live.)*  
2. **Where does long-form blog editing live** — extend current posts UI, headless CMS, or external tool?  
3. **Is “Admin all sites” one URL for the company, or per-brand admin with a platform overlay?**  
4. **Shared design system across all 30, or brand-isolated themes only?**  
5. **Single Cloudflare account / one origin cluster, or isolated stacks per brand?**

---

## 15. One-sentence summary

**Build one Astro platform (shared server, packages, and admin), migrate ~30 sites through a repeatable factory, and require approvals before Server Astro publishes to each live Web.**

---
 
