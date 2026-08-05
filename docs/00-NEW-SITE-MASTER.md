# 00 — New site master guide (Connect Group Astro fleet)

**This is the one file developers start with.**  
Follow the phases **in order**. Each phase says *when*, *what to do*, and *which detailed doc to open*. Tick the boxes; at the end run **§ Final high-level checks** before you ask for production deploy.

| | |
|--|--|
| **Paste into Cursor** | *Follow docs/00-NEW-SITE-MASTER.md for \<domain\>.* |
| **Fleet status (Aug 2026)** | **[FLEET-PORT-REGISTRY.md](FLEET-PORT-REGISTRY.md)** — 44 domains, ports **5080–5123**, next free **5124**. Live Caddy = **nine** cutover sites (see [OPS-OWNER-CADDY-CUTOVER](OPS-OWNER-CADDY-CUTOVER.md)). |
| **Repo** | [Connect-Group-Tech/Astro-websites](https://github.com/Connect-Group-Tech/Astro-websites) |
| **Reference peers** | Leads-only: `cbss.ae` / `iberiaworkforce.com` · Full CMS: `spheavyrental.ae` / `connectgroup.co` / `evolutionmiddleast.com` / `c-uae.com` |
| **Go-live verify** | **[10-GO-LIVE-VERIFY-CHECKLIST.md](10-GO-LIVE-VERIFY-CHECKLIST.md)** — trailing slash, canonical, GTM, forms, APIs, **404 brand**, content/images |
| **Owner Caddy (last)** | **[OPS-OWNER-CADDY-CUTOVER.md](OPS-OWNER-CADDY-CUTOVER.md)** — root/systemd/Caddy only; not a developer local step |

```text
 01 Scan  →  02 Convert  →  03 Fleet+CMS  →  04 Forms  →  05 Redirects/SEO/slash
      →  06 Local test  →  07 Security gates  →  08 Deploy templates (git only)
      →  09 App sync (webdev)  →  10 Verify checklist
      →  OWNER: Caddy + root units (separate doc)  →  public smoke
```

---

## How to use this file

1. Create a short working note: domain, peer site to copy, leads-only vs full CMS, target port.
2. Complete **Phase 01 → 10** in order. Do not skip security (01 / 07) or local smoke (06).
3. Open the **Detail** link only when you need the full procedure; this file is the map.
4. When every phase checkbox is done, run **Final high-level checks** and hand the results to whoever deploys (often you).

**Do not** invent a second leads stack, cookie CMS UI, or Caddy pattern. Match an existing peer.

---

## Phase map (numbered)

| Phase | When | Detail doc | Done when |
|-------|------|------------|-----------|
| **[01](#phase-01--security-scan-wp--static-clone)** Security scan | Right after clone/mirror, before merge work | [CURSOR-WP-CLONE-MALWARE-SCAN](CURSOR-WP-CLONE-MALWARE-SCAN.md) | Scan report clean or findings fixed |
| **[02](#phase-02--convert--place-the-site)** Convert / place | Building pages into the fleet folder | [CURSOR-CONVERT-STATIC-TO-ASTRO](CURSOR-CONVERT-STATIC-TO-ASTRO.md) | Site under `Astro-production/<domain>/` |
| **[03](#phase-03--fleet-register--cms--flow)** Fleet + CMS + FLOW | Wiring Node, `@connect/site-cms`, APIs | [CONNECT-FLOW-SITE-ONBOARDING](CONNECT-FLOW-SITE-ONBOARDING.md) | Port registered, thin mounts, `cms.ts` bound |
| **[04](#phase-04--forms-attribution--pipedrive)** Forms / attribution | Contact + Pipedrive + Ads/UTM | [CONNECT-ASTRO-NEW-SITE-PLAYBOOK](CONNECT-ASTRO-NEW-SITE-PLAYBOOK.md) (§ forms) + FLOW onboarding § Attribution | All forms post to `/api/contact` with attribution |
| **[05](#phase-05--redirects--seo-interim)** Redirects / SEO / slash | Until FLOW UI owns them | [CURSOR-IMPORT-REDIRECTS](CURSOR-IMPORT-REDIRECTS.md) · [10-GO-LIVE-VERIFY](10-GO-LIVE-VERIFY-CHECKLIST.md) §1–2 | Imports + robots/sitemap + trailing slash |
| **[06](#phase-06--local-run--test)** Local run + test | Daily until green | [CURSOR-RUN-FLEET](CURSOR-RUN-FLEET.md) · [local-fleet-test](local-fleet-test.md) | `fleet-local` up + smoke green |
| **[07](#phase-07--security--harden-gates)** Security / harden | Before calling the site “done” | FLOW onboarding § Harden gates | G-gates + env/secret rules pass |
| **[08](#phase-08--deploy-templates-caddy--systemd)** Deploy templates (git) | Before asking owner/server | [CONNECT-CADDY-DEPLOYMENT](CONNECT-CADDY-DEPLOYMENT.md) · peer `deploy/` | `deploy/*` + git Caddy block noted — **do not** reload live Caddy yourself |
| **[09](#phase-09--server-cutover)** App sync (webdev) | Production host | [server-side-work](server-side-work.md) · peer handoff | Code + `.env.prod` on host; loopback health OK |
| **[10](#phase-10--final-high-level-checks-before-you-deploy)** Final checks | Before owner Caddy | **[10-GO-LIVE-VERIFY-CHECKLIST](10-GO-LIVE-VERIFY-CHECKLIST.md)** | Trailing slash, canonical, GTM, forms, APIs green |
| **Owner** | Last — live edge | **[OPS-OWNER-CADDY-CUTOVER](OPS-OWNER-CADDY-CUTOVER.md)** · [OPS-OWNER-DYNAMIC-GTM-GA4](OPS-OWNER-DYNAMIC-GTM-GA4.md) | Root units + `/etc/caddy` + public smoke |

**Supporting (not a phase):** [CLAUDE-CONNECTGROUP-HANDOFF](CLAUDE-CONNECTGROUP-HANDOFF.md) (GitHub/context) · [`caddy/`](../caddy/README.md) (Caddy archive) · [`packages/site-cms`](../packages/site-cms/README.md) · per-site `CONNECT-ASTRO-FLEET-STANDARD.md`

---

## Phase 01 — Security scan (WP / static clone)

**When:** Immediately after mirroring WordPress/static assets into the repo.  
**Skip only if:** Greenfield site with no WP clone (still skim public assets for junk).

- [ ] Assets under `Astro-production/<domain>/public/` (or named export folder)
- [ ] Run malware / inject scan per [CURSOR-WP-CLONE-MALWARE-SCAN.md](CURSOR-WP-CLONE-MALWARE-SCAN.md)
- [ ] Remove or quarantine findings (PHP webshells, spam HTML, bad `.htaccess`, obfuscated JS)
- [ ] No nested `node_modules` / `package-lock.json` left in the site folder

**Next → Phase 02**

---

## Phase 02 — Convert / place the site

**When:** Turning the mirror into an Astro SSR site shaped like the fleet.  
**Detail:** [CURSOR-CONVERT-STATIC-TO-ASTRO.md](CURSOR-CONVERT-STATIC-TO-ASTRO.md)

- [ ] Folder: `Astro-production/<domain>/`
- [ ] Peer chosen (leads-only vs full CMS) — see FLOW onboarding §2
- [ ] Astro + `@astrojs/node` standalone; catalog pins; no `^` on Astro
- [ ] Pages / chrome / public assets building
- [ ] SSR required if forms or `/api/*` or FLOW (almost always yes)

**Next → Phase 03**

---

## Phase 03 — Fleet register + CMS + FLOW

**When:** Site compiles; now join the monorepo fleet and shared CMS.  
**Detail:** [CONNECT-FLOW-SITE-ONBOARDING.md](CONNECT-FLOW-SITE-ONBOARDING.md) (Steps A–J)

- [ ] Entry in `scripts/fleet-sites.json` (next port **5086+**)
- [ ] `"@connect/site-cms": "workspace:*"` + root `pnpm install`
- [ ] `astro.config` `security.allowedDomains` (apex, www, localhost, 127.0.0.1)
- [ ] `src/cms.ts` bind (`FEATURES_LEADS_ONLY` or `FEATURES_FULL_CMS`)
- [ ] Middleware imports `./cms` first
- [ ] Thin `/api/internal/*` mounts only (rsync from peer — no fat local CMS UI)
- [ ] Delete per-site `src/pages/internal/**` dashboards if present
- [ ] Public APIs: at least `POST /api/contact`, health as peer
- [ ] `.env.example` documented; unique `INTERNAL_JOB_SECRET` planned

**Next → Phase 04**

---

## Phase 04 — Forms, attribution & Pipedrive

**When:** Lead capture must match fleet behaviour.  
**Detail:** [CONNECT-ASTRO-NEW-SITE-PLAYBOOK.md](CONNECT-ASTRO-NEW-SITE-PLAYBOOK.md) · FLOW onboarding § Attribution / Google Ads / UTM

- [ ] All contact paths hit `POST /api/contact` (Astro forms **and** legacy WP mirrors)
- [ ] Client validation + server validation (peer `parse-contact-body` pattern)
- [ ] Attribution lib copied and wired (hidden fields + merge on submit)
- [ ] Ads/UTM aliases accepted (`gclid`, `campaignid`, `device`, `loc_*`, …)
- [ ] Pipedrive keys via env / peer `fieldKeys` defaults
- [ ] Lead file store under `.data/` (gitignored)
- [ ] Email / logger hooks as peer

**Manual form tests (local):**

- [ ] Empty submit → client/server errors, no Pipedrive call
- [ ] Valid submit → 200, lead JSON written, Pipedrive attempted (or mocked in local)
- [ ] Submit with `?gclid=test&campaignid=1&device=m` → fields on lead JSON
- [ ] Phone / intl-tel (if peer has it) country + E.164 behaviour OK

**Next → Phase 05**

---

## Phase 05 — Redirects & SEO (interim)

**When:** Old URLs and SEO files must work before FLOW UI owns them.  
**Detail:** [CURSOR-IMPORT-REDIRECTS.md](CURSOR-IMPORT-REDIRECTS.md) · peer go-live handoff for sitemap/robots paths

- [ ] Redirect CSV/JSON imported under `imports/redirects/` (or peer path)
- [ ] Sample old URLs 301 to new targets locally
- [ ] `/robots.txt`, sitemap(s), `/llms.txt` (+ `/llm.txt` alias) return 200 from Node
- [ ] `PUBLIC_SITE_URL` in local `.env` = **`https://<canonical-host>`** (never `127.0.0.1` — Astro inlines `PUBLIC_*` at build time)
- [ ] Absolute `<link rel="canonical">` on pages (not relative; matches live host)
- [ ] **Trailing slash:** bare paths redirect to `…/` (see below)

### Trailing slash (fleet standard)

Bare extensionless URLs must not stay at 200 without a slash.

| Approach | When to use |
|----------|-------------|
| `trailingSlash: "always"` in `astro.config.mjs` | Preferred for CMS/prerender peers (`spheavy`, `c-uae`, `connectgroup`, `eor`, …) |
| Middleware 301/308 for extensionless paths | Required when static file serving bypasses Astro redirects (`kinzahr`, `evolution`, `connectstaff` pattern) |

```bash
curl -sSI "http://127.0.0.1:<PORT>/about-us" | head -12   # expect 301 Location: /about-us/
```

Full checks: [10-GO-LIVE-VERIFY-CHECKLIST.md](10-GO-LIVE-VERIFY-CHECKLIST.md) §1.

### Dynamic `/llms.txt` (fleet standard)

New sites **must** ship the peer dynamic llms routes when cloning the fleet template — this is **per site**, not one shared file for the whole fleet.

| Piece | Path (peer pattern) |
|-------|---------------------|
| Public routes | `src/pages/llms.txt.ts`, `src/pages/llm.txt.ts` |
| Resolver | `src/lib/seo/llms-serve.ts` → auto from sitemap/pages/posts, or FLOW full override |
| Site seed copy | `src/data/llms-defaults.json` (title, summary, groups — edit per brand) |

**Behaviour:**

1. **Auto (default)** — `/llms.txt` regenerates from **that domain’s** published pages/posts/sitemap when content changes (no manual rebuild of a static file).
2. **Override** — if FLOW saves a full body under that site’s `.data/internal-admin/`, that text wins until cleared.
3. Cloning a template that already has these files includes the feature; sites scaffolded **without** them (legacy gaps) need the routes + seed copied from a peer before go-live.

**Smoke:** `curl -sI http://127.0.0.1:<PORT>/llms.txt` → `200` + `text/plain`.

**Next → Phase 06**

---

## Phase 06 — Local run & test

**When:** Continuous until Phase 07/10.  
**Detail:** [CURSOR-RUN-FLEET.md](CURSOR-RUN-FLEET.md) · [local-fleet-test.md](local-fleet-test.md)

```bash
# From monorepo root
pnpm install
node scripts/fleet-local.mjs up <site-id>
node scripts/fleet-local.mjs smoke <site-id>
```

- [ ] Site serves on `http://127.0.0.1:<PORT>`
- [ ] Fleet smoke script green
- [ ] Bearer smoke against `/api/internal/*` (posts/redirects/gtm/leads as featured) with test secret
- [ ] Homepage + 2–3 key inner pages + **404 shows this site’s brand/logo** (not a peer template)
- [ ] After rebuild: restart Node; spot-check an inner page (avoid stale `dist` chunk hangs)
- [ ] No secrets committed (`.env` / `.env.prod` gitignored)

**Local does not need Caddy** — see [CONNECT-CADDY-DEPLOYMENT.md](CONNECT-CADDY-DEPLOYMENT.md) § Local vs server.

**Next → Phase 07**

---

## Phase 07 — Security & harden gates

**When:** Before “ready for deploy templates / server”.  
**Detail:** FLOW onboarding §5 Harden gates + §8 What not to do

- [ ] Unique `INTERNAL_JOB_SECRET` per domain (`openssl rand -hex 32`)
- [ ] No CMS cookie login / old dashboard routes
- [ ] Internal APIs reject missing/wrong bearer
- [ ] Contact API rejects garbage / oversized payloads (peer behaviour)
- [ ] No secrets in client bundles / `PUBLIC_*` misuse
- [ ] WP malware scan from Phase 01 still clean after late asset copies
- [ ] Attribution gate (G13): Ads params land on lead store
- [ ] `allowedDomains` includes only intended hosts

**Next → Phase 08**

---

## Phase 08 — Deploy templates in git (not live Caddy)

**When:** App is green locally; prepare server artifacts in git.  
**Detail:** [CONNECT-CADDY-DEPLOYMENT.md](CONNECT-CADDY-DEPLOYMENT.md) · copy `deploy/` from peer

- [ ] `deploy/<unit>.service` — `PORT`, `EnvironmentFile=…/.env.prod`, correct user
- [ ] `deploy/<domain>.caddy` — production pattern (bare hosts, `tls internal`, HSTS, `@noncanonical`, static cache)
- [ ] Note one-hop HTTP alt-host line for fleet `Caddyfile.production`
- [ ] `deploy/ROOT_SETUP.md` — users, perms, `.env` vs `.env.prod`
- [ ] Canonical host decided; `.env.example` `PUBLIC_SITE_URL=https://<canonical>`
- [ ] Add site block to **`caddy/Caddyfile.production` (git only)** when cutover is planned
- [ ] GTM: re-export `resolveEffectiveGtmConfig` from `src/lib/gtm/store.ts`; `.env.example` has `PUBLIC_GTM_ID` / `PUBLIC_GA4_ID`

**Do not** edit `/etc/caddy/Caddyfile` or reload Caddy as a developer step. That is **owner-only** — [OPS-OWNER-CADDY-CUTOVER.md](OPS-OWNER-CADDY-CUTOVER.md).

**Next → Phase 09**

---

## Phase 09 — Server app sync (webdev)

**When:** Code is ready on `178.105.150.67` under `/opt/Astro-production/<domain>/`.  
**Detail:** [server-side-work.md](server-side-work.md) · peer `docs/13-go-live-server-handoff.md`

- [ ] Portable deploy (dist + real `node_modules`, not laptop symlink tree)
- [ ] `.env` (PUBLIC / build) + `.env.prod` (secrets) on host — never print tokens in chat
- [ ] Loopback smoke: `curl http://127.0.0.1:<PORT>/api/health/` → 200
- [ ] Interim `nohup` OK only until owner installs systemd
- [ ] Run **[10-GO-LIVE-VERIFY-CHECKLIST](10-GO-LIVE-VERIFY-CHECKLIST.md)** on loopback

**Stop here for Caddy / `useradd` / `site-ctl` ALLOWED / `systemctl enable`.** Hand off to owner:

→ **[OPS-OWNER-CADDY-CUTOVER.md](OPS-OWNER-CADDY-CUTOVER.md)**

**Next → Phase 10** (verify) then owner Caddy

---

## Phase 10 — Final high-level checks

Use the dedicated checklist (kept in sync with today’s fleet standards):

### → **[10-GO-LIVE-VERIFY-CHECKLIST.md](10-GO-LIVE-VERIFY-CHECKLIST.md)**

Minimum before asking owner for Caddy:

- [ ] Trailing slash redirects (bare → `/`)
- [ ] Absolute canonicals + robots/sitemap/llms 200
- [ ] `/runtime-gtm.js` works (`resolveEffectiveGtmConfig` / recreateScript loader)
- [ ] Contact + gclid/UTM + Pipedrive path (no SMTP / `FORM_NOTIFICATION_*` required)
- [ ] Internal APIs deny without bearer
- [ ] **404 branding** = this site only; logo file exists
- [ ] **Content parity** vs live post/page sitemap; redirects don’t point at missing Astro paths
- [ ] **Images:** featured + WP size variants used on insights/blog cards; served 200 after `public/` (+ `dist/client` or rebuild)
- [ ] Deploy artifacts in git; no quarantine/bak/`_crawl` junk

After owner Caddy + Cloudflare Full, re-run the same checklist on **public HTTPS**.

Detail for §9–10 (404 / content / media / TOC / stale dist): **[10-GO-LIVE-VERIFY-CHECKLIST](10-GO-LIVE-VERIFY-CHECKLIST.md)**.

---

## Definition of done (sign-off)

Site is ready for **owner Caddy / public DNS** when:

1. Phases **01–08** checkboxes complete  
2. Phase **09** loopback health green  
3. **[10-GO-LIVE-VERIFY-CHECKLIST](10-GO-LIVE-VERIFY-CHECKLIST.md)** green on loopback  
4. Owner runs **[OPS-OWNER-CADDY-CUTOVER](OPS-OWNER-CADDY-CUTOVER.md)** + public verify + [OPS-OWNER-DYNAMIC-GTM-GA4](OPS-OWNER-DYNAMIC-GTM-GA4.md)  
5. No open malware / secret / harden-gate failures  

**Paste for Cursor after sign-off:**  
*Phase 01–10 complete for \<domain\>. Loopback verify green per docs/10-GO-LIVE-VERIFY-CHECKLIST.md. Owner: run docs/OPS-OWNER-CADDY-CUTOVER.md.*

---

## Deferred fleet gaps (tracked — do not forget)

| Gap | Sites | Status | Notes |
|-----|-------|--------|-------|
| Dynamic `/llms.txt` (+ `/llm.txt`, `llms-defaults.json`, `llms-serve`) | **cbss.ae**, **iberiaworkforce.com** | **Deferred** (Aug 2026) — do **not** block other deploys | Already live without it. Backfill from a peer (e.g. `spheavyrental.ae` / `connectgroup.co`) in a later pass. See Phase 05 § Dynamic `/llms.txt`. |
| Owner root bootstrap (systemd + live Caddy) | **eor, staff, cuae, kinza** | **Pending owner** | App + interim loopback done. Run [OPS-OWNER-CADDY-CUTOVER](OPS-OWNER-CADDY-CUTOVER.md). |

When picking llms up: copy peer `llms.txt.ts` / `llm.txt.ts` / `llms-serve` / generator + a brand-specific `src/data/llms-defaults.json`, rebuild, smoke `curl -sI /llms.txt`.

---

## Quick links (all fleet docs)

| # | Doc | Role |
|---|-----|------|
| 00 | **This file** | Master lifecycle |
| 01 | [CURSOR-WP-CLONE-MALWARE-SCAN](CURSOR-WP-CLONE-MALWARE-SCAN.md) | Security scan |
| 02 | [CURSOR-CONVERT-STATIC-TO-ASTRO](CURSOR-CONVERT-STATIC-TO-ASTRO.md) | Convert mirror → Astro |
| 03 | [CONNECT-FLOW-SITE-ONBOARDING](CONNECT-FLOW-SITE-ONBOARDING.md) | Full fleet + FLOW checklist |
| 04 | [CONNECT-ASTRO-NEW-SITE-PLAYBOOK](CONNECT-ASTRO-NEW-SITE-PLAYBOOK.md) | Forms / geo / Pipedrive deep dive |
| 05 | [CURSOR-IMPORT-REDIRECTS](CURSOR-IMPORT-REDIRECTS.md) | Redirect imports |
| 06 | [CURSOR-RUN-FLEET](CURSOR-RUN-FLEET.md) / [local-fleet-test](local-fleet-test.md) | Local run |
| 07 | (gates inside FLOW onboarding) | Harden |
| 08 | [CONNECT-CADDY-DEPLOYMENT](CONNECT-CADDY-DEPLOYMENT.md) | Caddy **patterns** (git templates) |
| 09–10 | [server-ops-only](server-ops-only.md) · **[10-GO-LIVE-VERIFY-CHECKLIST](10-GO-LIVE-VERIFY-CHECKLIST.md)** | App sync + verify |
| Owner | **[OPS-OWNER-CADDY-CUTOVER](OPS-OWNER-CADDY-CUTOVER.md)** · [OPS-OWNER-DYNAMIC-GTM-GA4](OPS-OWNER-DYNAMIC-GTM-GA4.md) | Live Caddy + GTM (end) |
| — | [docs/README](README.md) | Full index |

---

*Aug 2026 — single entry for upcoming websites. Existing playbooks stay as detail; this file orders them. Caddy/root stays owner-only.*
