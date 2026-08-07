# 00 — New site master guide (Connect Group Astro fleet)

**This is the one file developers start with.**  
Follow the phases **in order**. Each phase says *when*, *what to do*, and *which detailed doc to open*. Tick the boxes; at the end run **§ Final high-level checks** before you ask for production deploy.

| | |
|--|--|
| **Paste into Cursor** | *Follow docs/00-NEW-SITE-MASTER.md for \<domain\>.* |
| **Fleet status (Aug 2026)** | **[FLEET-PORT-REGISTRY.md](FLEET-PORT-REGISTRY.md)** — 45 domains, ports **5080–5124**, next free **5125**. Live Caddy = **nine** cutover sites (see [OPS-OWNER-CADDY-CUTOVER](OPS-OWNER-CADDY-CUTOVER.md)). |
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
- [ ] If peer is **spheavyrental** (or any site with DET strip): **blank inherited `licence.json` / QR / `single-post-template.html` immediately** — see Phase 05 § DET trade licence
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
- [ ] GTM skeleton from peer: `runtime-gtm.js.ts` + `lib/gtm/{inject,store}.ts` (full rules in Phase 05 § Dynamic GTM)
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
**Fleet SEO/AI crawler tracker:** [SEO-AI-CRAWLER-AUDIT-REMEDIATION-2026-08-06.md](SEO-AI-CRAWLER-AUDIT-REMEDIATION-2026-08-06.md) (PDF audit expanded to all 15 live sites)

- [ ] Redirect CSV/JSON imported under `imports/redirects/` (or peer path)
- [ ] Sample old URLs 301 to new targets locally
- [ ] `/robots.txt`, sitemap(s), `/llms.txt` (+ `/llm.txt` alias) return 200 from Node
- [ ] `PUBLIC_SITE_URL` in local `.env` = **`https://<canonical-host>`** (never `127.0.0.1` — Astro inlines `PUBLIC_*` at build time)
- [ ] Absolute `<link rel="canonical">` on pages (not relative; matches live host)
- [ ] Homepage: absolute `og:url` + **`og:image`** (+ Twitter card/image)
- [ ] Mirror pages: `absolutizeMirrorSeoHtml` (`@connect/site-cms`) so Rank Math `@id` / `url` / images are absolute HTTPS
- [ ] Do not invent sitemap `lastmod`; only emit when a real modified date exists
- [ ] Multilingual: reciprocal page-level hreflang (Iberia Workforce is the reference)
- [ ] Unknown routes → real **404** (never soft-404 homepage)
- [ ] CF bot policy: if AI search visibility matters, verify SearchBot access (CBSS P0) — not UA string alone
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

### Dynamic GTM / GA4 (fleet standard)

**Do not** paste GTM/GA4 `<script>` / noscript into page HTML, chrome, or cleaned legacy mirrors. Tags are **dynamic only**.

Owner runbook (IDs + FLOW override): **[OPS-OWNER-DYNAMIC-GTM-GA4.md](OPS-OWNER-DYNAMIC-GTM-GA4.md)**  
Verify checklist: [10-GO-LIVE-VERIFY-CHECKLIST.md](10-GO-LIVE-VERIFY-CHECKLIST.md) §3

| Piece | Required path / behaviour |
|-------|---------------------------|
| Runtime endpoint | `src/pages/runtime-gtm.js.ts` — must call **`resolveEffectiveGtmConfig`** (not `readGlobalGtmConfig` alone) |
| Loader JS | Must **`recreateScript`** (innerHTML-only inject does **not** execute GTM) |
| Strip + inject | `src/lib/gtm/inject.ts` → `injectRuntimeGtmLoader()` on every legacy/chrome HTML path; strip **inside each** `<script>` / `<noscript>` block (never greedy cross-script regex — that can delete `</head>` / canonical) |
| Store re-export | `src/lib/gtm/store.ts` re-exports `resolveEffectiveGtmConfig` from `@connect/site-cms/gtm` |
| FLOW API | `/api/internal/gtm/` (+ save) when `FEATURES_FULL_CMS` |
| Env interim | `.env` / `.env.prod`: `PUBLIC_GTM_ID` / `PUBLIC_GA4_ID` — **no inline `# comments` on the same line** (placeholders like `GTM-AAAA` get parsed as real IDs) |
| Page delivery | Prefer `<script src="/runtime-gtm.js" defer data-runtime-gtm="1">`. SSR inject via `resolveEffectiveGtmConfig` in `BaseLayout` is OK if `sp-gtm-ssr` is set and the loader is skipped (do not double-fire) |
| Cache | `/runtime-gtm.js` → `Cache-Control: no-store` |
| `robots.txt` | Must reference **this** domain only (never a peer sitemap / licence blurb) |

Priority (what wins): FLOW `.data/internal-admin/gtm.json` → raw `GTM_*_SCRIPT` env → `PUBLIC_GTM_ID` / `PUBLIC_GA4_ID` → none.

```bash
# Loader present (or SSR marker) + IDs from env (no GTM-AAAA placeholders)
curl -sS "http://127.0.0.1:<PORT>/" | grep -oE 'data-runtime-gtm="1"|sp-gtm-ssr' | head -1
curl -sS "http://127.0.0.1:<PORT>/runtime-gtm.js" | grep -q recreateScript && echo recreateScript_OK
curl -sS "http://127.0.0.1:<PORT>/runtime-gtm.js" | grep -oE 'GTM-[A-Z0-9]+|G-[A-Z0-9]+' | sort -u
```

**Known gap (deferred — live without fleet loader):** `cbss.ae`, `iberiaworkforce.com` still use hard-coded / no runtime GTM. New full-CMS peers must not copy that pattern.

### DET trade licence strip (fleet standard — Aug 2026)

Sites cloned from `spheavyrental.ae` often inherit **S&P Heavy’s** `licence.json`, QR, PDF path, and Elementor `single-post-template.html`. That is a compliance leak — never ship another company’s DET number / activities / QR.

| Rule | Detail |
|------|--------|
| Source of truth | `src/data/licence.json` — **this company’s** DET facts only |
| Incomplete = blank + hidden | If real DET details are unknown, leave fields empty and gate the UI with **`isLicenceComplete()`** (`businessName` **and** `number` required). Do **not** guess a trade licence |
| `LicenceStrip.astro` | Must wrap markup in `{isLicenceComplete() && ( … )}` |
| `licence.ts` | Port peer guards: drop empty rows; `hasLicencePdf()` must short-circuit empty `pdfPath` (do not `path.join` onto `public/` alone) |
| QR / PDF | Only after `verifyUrl` / files are **this** site’s. Delete inherited `public/licence/det-verify-qr.svg` when `qrPath` is blank |
| Templates | Do **not** copy peer `src/data/single-post-template.html` unless it is this site’s Elementor extract |
| OK exceptions | Connect Group portfolio pages that **intentionally** name S&P Heavy; `spheavyrental.ae` itself |

**Filled today (examples):** `spheavyrental.ae`, `cbss.ae`, `c-uae.com`, `kinzahr.com`.  
**Blanked until real DET data (do not invent):** `eormiddleast.com`, `connectfm.ae`, `connectfz.com`, `iberiaeor.com`, `connectresources.ae` (name kept, inherited S&P fields cleared).

When scaffolding a new peer from SP Heavy: blank `licence.json` immediately, add `isLicenceComplete` guards, delete peer QR/template, then fill from the company’s DET record before go-live.

### Organization JSON-LD (SEO — every site)

Search engines need a machine-readable **who we are** block, not only a visual licence strip.

| Rule | Detail |
|------|--------|
| Minimum | `@type` Organization (and LocalBusiness when appropriate), `name`, `url`, `logo` |
| Group | Prefer `parentOrganization: { name: "Connect Group", url: "https://connectgroup.co/" }` when the brand is part of the group |
| Licence fields | Spread DET facts from `licence.json` / `licence.ts` into the same schema when complete — do not invent numbers |
| Leads-only / thin sites | Still required (CBSS once had **no** Organization at all — engines had nothing identifying the company) |

**Smoke:** homepage HTML contains `<script type="application/ld+json">` with `"Organization"`.

### Dynamic `/llms.txt` (fleet standard)

New sites **must** ship the peer dynamic llms routes when cloning the fleet template — this is **per site**, not one shared file for the whole fleet.

| Piece | Path (peer pattern) |
|-------|---------------------|
| Public routes | `src/pages/llms.txt.ts`, `src/pages/llm.txt.ts` |
| Resolver | `src/lib/seo/llms-serve.ts` → auto from sitemap/pages/posts, or FLOW full override |
| Site seed copy | `src/data/llms-defaults.json` (title, summary, groups — edit per brand) |
| Thin / single-page | Hand-shaped `llms.txt.ts` is OK (CBSS pattern) — still must return `200` + `text/plain` |

**Behaviour:**

1. **Auto (default)** — `/llms.txt` regenerates from **that domain’s** published pages/posts/sitemap when content changes (no manual rebuild of a static file).
2. **Override** — if FLOW saves a full body under that site’s `.data/internal-admin/`, that text wins until cleared.
3. Cloning a template that already has these files includes the feature; sites scaffolded **without** them (legacy gaps) need the routes + seed copied from a peer before go-live.
4. **Do not blindly paste** a peer’s `llms-serve.ts` / route. Sites differ (inventory APIs, helpers, licence section). A missing import or undefined symbol → **`/llms.txt` 404** until caught (happened when Kinza briefly inherited a C-UAE-shaped change). Diff against the target site’s APIs before deploy; watch logs after cutover.

**Smoke:** `curl -sI http://127.0.0.1:<PORT>/llms.txt` → `200` + `text/plain`. After adding the route, **rebuild + restart** — a stale `dist` still serves 404 even when source is correct.

### Native / macOS build blockers (fleet gotcha)

`node_modules` can include **platform-native** binaries (sharp, esbuild, etc.). A macOS-only or corrupted install can block `pnpm --filter <site> build` on several peers at once (seen on Kinza, Connect Staff, EOR, and other new scaffolds).

| Rule | Detail |
|------|--------|
| Never commit | Site `node_modules/` or OS-specific binary caches |
| Fix | From monorepo root: remove the site’s `node_modules` if polluted → `pnpm install` → rebuild |
| Gate | Treat “cannot rebuild” as a **hard blocker** — no content/SEO work until `fleet-local.mjs build <site>` succeeds |
| Deploy | Server rebuild uses Linux natives; do not rsync developer `node_modules` to the host |

### Mirrored WP assets must stay in git

Legacy pages request `wp-includes`, theme `dist/`, plugin paths under `public/` (and sometimes `src/legacy/`). Fresh clones break (unstyled / 404) if those files were never committed.

| Rule | Detail |
|------|--------|
| Root `.gitignore` | Do **not** add a bare `dist/` rule — only `Astro-production/*/dist/` and `packages/*/dist/`. Mirrored `public/**/dist/` must remain trackable |
| Commit referenced assets | If hundreds of cleaned pages link a CSS/JS path, commit it (even ~100–200KB) rather than relying on a local-only copy |
| Dead plugin tags | Some mirrors still request leftover WP plugin scripts (e.g. Textbuilder `main.bundle.js`). A **0-byte stub** in `public/` is OK to suppress 404 noise when the page works without the script — comment in git / PR so it is not mistaken for a corrupted asset |
| Per-site `.gitignore` | Do not ignore `public/wp-content/**` or `public/wp-includes/**` wholesale on mirror sites |

### Elementor / kit CSS vs custom chrome (licence buttons, CTAs)

Elementor kits often ship high-specificity globals such as `.elementor-kit-N a { color: … }`. Custom button classes on `<a>` lose that fight → **same-colour label on same-colour button** (Kinza licence primary: green text on green until specificity was raised).

| Rule | Detail |
|------|--------|
| Buttons as links | Scope rules under a parent (e.g. `.kz-licence .kz-licence__btn--primary`) so specificity beats kit link colour — prefer this over `!important` |
| Contrast | White on brand teal may fail WCAG AA; darken the fill if needed (Kinza used `#0c7472` under white) |
| Cleanup debt | Leaving large uncontrolled Elementor global CSS in the mirror fights every new chrome patch — strip or isolate kit link/button rules when adding custom UI; do not assume “verify licence” styles are finished because the HTML looks right |

**Reference:** `kinzahr.com/public/css/kinza-licence.css` (comment block above `.kz-licence__btn--primary`).

### Elementor / WP mirror HTML — do not over-sanitize

Full-page mirrors (`legacy-page.js` / `[...slug].astro`) are **trusted exports**, not CMS fields.

| Do | Don’t |
|----|--------|
| `sanitizeCmsHtml` on FLOW/CMS **post bodies** | Strip inline `<script>` / `on*` from mirrors |
| `sanitizeMirrorHtml` = hygiene only (`javascript:`, `<base>`, meta refresh) | Treat mirrors like untrusted CMS HTML |
| Keep `elementorFrontendConfig`, Swiper init, ScrollSequence `ssqInput`, mega-menu jQuery | Enable CSP **enforce** or full SRI on go-live |

Lesson (2026-08-07): aggressive mirror sanitization broke Kinza mega-menu, Connect Group ScrollSequence, and slider arrows. Tracked in [SECURITY-AARON-FULL-HANDOFF-2026-08-07.md](SECURITY-AARON-FULL-HANDOFF-2026-08-07.md).

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
**Fleet audit tracker:** [SECURITY-AUDIT-REMEDIATION-2026-08-06.md](SECURITY-AUDIT-REMEDIATION-2026-08-06.md)

- [ ] Unique `INTERNAL_JOB_SECRET` per domain (`openssl rand -hex 32`) — never share across sites
- [ ] Machine auth uses Bearer / `x-internal-job-secret` only (`?secret=` rejected)
- [ ] No CMS cookie login / old dashboard routes
- [ ] Internal APIs reject missing/wrong bearer
- [ ] Contact API rejects garbage / oversized payloads (peer behaviour)
- [ ] CMS / post HTML sanitized (`sanitizeCmsHtml`); no SVG executable uploads
- [ ] **Mirror pages:** use `sanitizeMirrorHtml` hygiene only (`javascript:` / `<base>` / meta refresh). **Never** strip inline `<script>` or `on*` on Elementor/WP mirrors — breaks mega-menus, sliders, ScrollSequence (see [SECURITY-AARON-FULL-HANDOFF-2026-08-07.md](SECURITY-AARON-FULL-HANDOFF-2026-08-07.md) §2)
- [ ] Do **not** enable CSP **enforce**, fleet-wide prerender, or full WP SRI on go-live — keep CSP Report-Only; those break GTM/Elementor
- [ ] No PHP execution on origin (enhanced conversions = Node if needed)
- [ ] `security.checkOrigin: true` + `allowedDomains` for intended hosts only
- [ ] No secrets in client bundles / `PUBLIC_*` misuse
- [ ] WP malware scan from Phase 01 still clean after late asset copies
- [ ] Attribution gate (G13): Ads params land on lead store

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
- [ ] GTM wiring complete per **Phase 05 § Dynamic GTM / GA4** (`resolveEffectiveGtmConfig`, `recreateScript`, `inject.ts`, `.env.example` IDs blank — live IDs only on server / FLOW)

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
- [ ] **Lead backup (owner):** after the site is live and collecting enquiries, confirm nightly restic **auto-discovers** this domain — see [deploy-host/README.md](../Astro-production/deploy-host/README.md). A green backup job is **not** enough if the script still hardcodes an old site list.

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
- [ ] GTM: `/runtime-gtm.js` = `resolveEffectiveGtmConfig` + `recreateScript`; homepage has loader **or** `sp-gtm-ssr` (not both); IDs match `.env` / FLOW; **no** `GTM-AAAA` / peer-brand in robots; see Phase 05 § Dynamic GTM
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
| Dynamic `/llms.txt` (+ `/llm.txt`, `llms-defaults.json`, `llms-serve`) | **iberiaworkforce.com** | **Deferred** (Aug 2026) — do **not** block other deploys | `cbss.ae` now has a hand-shaped `/llms.txt` + Organization schema (rebuild required after adding). Backfill Iberia Workforce from a peer. See Phase 05 § Dynamic `/llms.txt`. |
| Fleet runtime GTM loader | **cbss.ae**, **iberiaworkforce.com** | **Deferred** | Live with hard-coded / no `/runtime-gtm.js`. Backfill from Phase 05 § Dynamic GTM when touching those sites. |
| Real DET `licence.json` fill | **eor, connectfm, connectfz, iberiaeor, connectresources.ae** | **Blanked on purpose** (Aug 2026) | S&P Heavy contamination removed; strip hidden via `isLicenceComplete`. Fill from each company’s DET record before publishing a licence band. See Phase 05 § DET trade licence. |
| Owner root bootstrap (systemd + live Caddy) | **eor, staff, cuae, kinza** | **Pending owner** | App + interim loopback done. Run [OPS-OWNER-CADDY-CUTOVER](OPS-OWNER-CADDY-CUTOVER.md). |
| Restic lead backup covers **all** live sites | Host `/usr/local/sbin/restic-astro-fleet-backup` | **Pending owner refresh (Aug 2026)** | Live script still hardcodes the original four sites; newer sites’ `.data/leads` were unprotected while the job reported success. Fixed script is in git — run [ROOT-REFRESH-RESTIC-BACKUP.sh](../Astro-production/deploy-host/ROOT-REFRESH-RESTIC-BACKUP.sh). |

### Lesson — backups that report success can still miss leads

Nightly restic was green, but `SITES=(evolution… cbss… spheavyrental… iberiaworkforce…)` never grew with the fleet. Customer enquiries on connectgroup / kinza / c-uae / staff / eor / etc. sat only on disk. **Rule:** backup discovery must be automatic under `/opt/Astro-production`; never extend a hardcoded list per cutover. Dry-run after every script refresh and spot-check that the new domain’s `.data` (or `LEAD_STORE_DIR`) appears.

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
