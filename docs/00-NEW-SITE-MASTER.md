# 00 — New site master guide (Connect Group Astro fleet)

**This is the one file developers start with.**  
Follow the phases **in order**. Each phase says *when*, *what to do*, and *which detailed doc to open*. Tick the boxes; at the end run **§ Final high-level checks** before you ask for production deploy.

| | |
|--|--|
| **Paste into Cursor** | *Follow docs/00-NEW-SITE-MASTER.md for \<domain\>.* |
| **Fleet status (Aug 2026)** | **[FLEET-PORT-REGISTRY.md](FLEET-PORT-REGISTRY.md)** — 44 domains, ports **5080–5123**, next free **5124**. Eleven sites scaffolded; rest are reserved placeholders. |
| **Repo** | [Connect-Group-Tech/Astro-websites](https://github.com/Connect-Group-Tech/Astro-websites) |
| **Reference peers** | Leads-only: `cbss.ae` / `iberiaworkforce.com` · Full CMS: `spheavyrental.ae` / `connectgroup.co` / `evolutionmiddleast.com` |

```text
 01 Scan  →  02 Convert  →  03 Fleet+CMS  →  04 Forms  →  05 Redirects/SEO
      →  06 Local test  →  07 Security gates  →  08 Deploy templates
      →  09 Server cutover  →  10 Final checks  →  YOU DEPLOY
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
| **[05](#phase-05--redirects--seo-interim)** Redirects / SEO | Until FLOW UI owns them | [CURSOR-IMPORT-REDIRECTS](CURSOR-IMPORT-REDIRECTS.md) | Imports + robots/sitemap paths work |
| **[06](#phase-06--local-run--test)** Local run + test | Daily until green | [CURSOR-RUN-FLEET](CURSOR-RUN-FLEET.md) · [local-fleet-test](local-fleet-test.md) | `fleet-local` up + smoke green |
| **[07](#phase-07--security--harden-gates)** Security / harden | Before calling the site “done” | FLOW onboarding § Harden gates | G-gates + env/secret rules pass |
| **[08](#phase-08--deploy-templates-caddy--systemd)** Deploy templates | Before asking ops/server | [CONNECT-CADDY-DEPLOYMENT](CONNECT-CADDY-DEPLOYMENT.md) · peer `deploy/` | `deploy/*.service` + `*.caddy` + `ROOT_SETUP.md` |
| **[09](#phase-09--server-cutover)** Server cutover | Production only | [server-side-work](server-side-work.md) · [server-ops-only](server-ops-only.md) · peer `docs/13-go-live-server-handoff.md` | Unit + Caddy + CF Full + public smoke |
| **[10](#phase-10--final-high-level-checks-before-you-deploy)** Final checks | Last step before deploy sign-off | This file § Final | Checklist below all green |

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
- [ ] `/robots.txt`, sitemap(s), `/llms.txt` (if peer has them) return 200 from Node
- [ ] `PUBLIC_SITE_URL` in local `.env` = `http://127.0.0.1:<PORT>` for smoke

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
- [ ] Homepage + 2–3 key inner pages + 404
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

## Phase 08 — Deploy templates (Caddy + systemd)

**When:** App is green locally; prepare server artifacts in git.  
**Detail:** [CONNECT-CADDY-DEPLOYMENT.md](CONNECT-CADDY-DEPLOYMENT.md) · copy `deploy/` from peer

- [ ] `deploy/<unit>.service` — `PORT`, `EnvironmentFile=…/.env.prod`, correct user
- [ ] `deploy/<domain>.caddy` — production pattern (bare hosts, `tls internal`, HSTS, `@noncanonical`, static cache)
- [ ] Note one-hop HTTP alt-host line for fleet `Caddyfile.production`
- [ ] `deploy/ROOT_SETUP.md` — users, perms, `.env` vs `.env.prod`
- [ ] Canonical host decided; `.env.example` `PUBLIC_SITE_URL=https://<canonical>`
- [ ] Sync site block into `caddy/Caddyfile.production` (git) when cutover is planned

**Caddy / HSTS / apex↔www are server-only** — do not require them for local sign-off.

**Next → Phase 09**

---

## Phase 09 — Server cutover

**When:** You (or ops) deploy to `178.105.150.67`.  
**Detail:** [server-side-work.md](server-side-work.md) · [server-ops-only.md](server-ops-only.md) · peer `docs/13-go-live-server-handoff.md` · [CONNECT-CADDY-DEPLOYMENT.md](CONNECT-CADDY-DEPLOYMENT.md)

- [ ] Code under `/opt/Astro-production/<domain>/`
- [ ] `site-<unit>` user; `.data/` writable; `.env.prod` 0640; build `.env` with **https** canonical URL
- [ ] `systemctl enable --now <unit>` — `curl http://127.0.0.1:<PORT>/api/health/` OK
- [ ] Update live `/etc/caddy/Caddyfile` (site block + one-hop HTTP list) to match `caddy/Caddyfile.production`
- [ ] `sudo -u caddy caddy validate --config /etc/caddy/Caddyfile` then `systemctl reload caddy`
- [ ] Cloudflare: DNS proxied, SSL **Full** (not Flexible; not Full strict with `tls internal` alone)
- [ ] WAF allows robots/sitemap/llms paths (see peer go-live handoff)
- [ ] Register domain + `INTERNAL_JOB_SECRET` in FLOW
- [ ] Public smoke: homepage, form POST, `/api/health/`, redirects, SEO files

**Next → Phase 10**

---

## Phase 10 — Final high-level checks (before you deploy)

Run this once the site is “feature complete” locally (and again after server cutover).  
Replace `<PORT>`, `<id>`, `<domain>`, `<canonical>`.

### A. Repo / build

```bash
cd /path/to/Astro-websites
pnpm install
# Build the site (peer script name — usually from site dir)
pnpm --filter <package-name> build   # or: cd Astro-production/<domain> && pnpm build
node scripts/fleet-local.mjs up <id>
node scripts/fleet-local.mjs smoke <id>
```

- [ ] Build succeeds
- [ ] Fleet smoke green
- [ ] No unexpected secrets in `git status`

### B. Forms & attribution

```bash
# Health
curl -sS "http://127.0.0.1:<PORT>/api/health/"

# Contact (adjust JSON to peer schema)
curl -sS -X POST "http://127.0.0.1:<PORT>/api/contact" \
  -H 'content-type: application/json' \
  -d '{"name":"Test User","email":"test@example.com","phone":"+971500000000","message":"fleet check","gclid":"test-gclid","campaignId":"1","device":"m"}'
```

- [ ] Invalid body rejected
- [ ] Valid body accepted; lead file under `.data/`
- [ ] Attribution fields present on stored lead when sent

### C. FLOW / internal (if featured)

```bash
SECRET='<INTERNAL_JOB_SECRET>'
curl -sS -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $SECRET" \
  "http://127.0.0.1:<PORT>/api/internal/leads"
# Full CMS also: /api/internal/posts , redirects , gtm as peer
curl -sS -o /dev/null -w '%{http_code}\n' \
  "http://127.0.0.1:<PORT>/api/internal/leads"   # expect 401 without bearer
```

- [ ] Bearer OK → 200
- [ ] No bearer → 401

### D. Deploy artifacts present in git

- [ ] `Astro-production/<domain>/deploy/<unit>.service`
- [ ] `Astro-production/<domain>/deploy/<domain>.caddy`
- [ ] `Astro-production/<domain>/deploy/ROOT_SETUP.md`
- [ ] `scripts/fleet-sites.json` entry
- [ ] `caddy/Caddyfile.production` updated when going live (or ticket for ops)

### E. Production-only (after cutover)

```bash
curl -sI "https://<canonical>/" | head
curl -sI "https://www.<domain>/" | head    # should land on canonical
curl -sS "https://<canonical>/api/health/"
curl -sI "https://<canonical>/robots.txt"
```

- [ ] Canonical host matches `PUBLIC_SITE_URL`
- [ ] Cloudflare SSL Full; no redirect loop
- [ ] Form works on live hostname
- [ ] FLOW can reach internal APIs with bearer

---

## Definition of done (sign-off)

Site is ready for **you to deploy** when:

1. Phases **01–08** checkboxes complete  
2. Phase **10 A–D** green locally  
3. Phase **09 + 10 E** green on server (or scheduled with ops using Caddy doc)  
4. No open malware / secret / harden-gate failures  

**Paste for Cursor after sign-off:**  
*Phase 01–10 complete for \<domain\>. Run final high-level checks from docs/00-NEW-SITE-MASTER.md and prepare server cutover per CONNECT-CADDY-DEPLOYMENT.md.*

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
| 08–09 | [CONNECT-CADDY-DEPLOYMENT](CONNECT-CADDY-DEPLOYMENT.md) / [server-ops-only](server-ops-only.md) | Caddy + server |
| — | [docs/README](README.md) | Full index |

---

*Aug 2026 — single entry for upcoming websites. Existing playbooks stay as detail; this file orders them.*
