# Convert a static / WordPress site → Connect Group Astro fleet

**Audience:** developers (and Cursor) adding site #5+ the same way the four live sites were built.  
**Repo:** [Connect-Group-Tech/Astro-websites](https://github.com/Connect-Group-Tech/Astro-websites)  
**Master lifecycle:** [00-NEW-SITE-MASTER.md](00-NEW-SITE-MASTER.md) (this file is Phase 02 detail)  
**Companion:** [CONNECT-FLOW-SITE-ONBOARDING.md](CONNECT-FLOW-SITE-ONBOARDING.md) (fleet → FLOW full standard) · [CURSOR-RUN-FLEET.md](CURSOR-RUN-FLEET.md) (clone, install, run locally) · [CURSOR-WP-CLONE-MALWARE-SCAN.md](CURSOR-WP-CLONE-MALWARE-SCAN.md) (scan WP clones)  
**Detail / API surface:** [CONNECT-ASTRO-NEW-SITE-PLAYBOOK.md](CONNECT-ASTRO-NEW-SITE-PLAYBOOK.md)

| Field | Value |
|-------|--------|
| **Updated** | 2026-08-03 |
| **Runtime** | Astro **7.1.6** + `@astrojs/node` **11.0.3** (pnpm catalog) |
| **Prod host** | `/opt/Astro-production/<domain>/` · ports **5080+** |
| **Package manager** | **pnpm** only (workspace + catalog) |

Paste this file into Cursor and say: *Follow this guide to convert \<domain\> into the Astro fleet.*  
**Prefer the full FLOW playbook for new sites:** [CONNECT-FLOW-SITE-ONBOARDING.md](CONNECT-FLOW-SITE-ONBOARDING.md) (clone → thin CMS mounts → FLOW APIs).

---

## 0. What “done” looks like (match existing sites)

Every production site is:

1. **Its own folder** under `Astro-production/<domain>/`
2. **Its own Node process** (`node dist/server/entry.mjs` on a unique loopback port)
3. **Shared code** via `@connect/site-cms` + pnpm catalog — not a second copy of CMS handlers
4. **Two env files on the server:** `.env` (build) + `.env.prod` (runtime secrets)
5. **Deploy templates** in `deploy/`: systemd unit + Caddy snippet + `ROOT_SETUP.md`
6. Registered in `scripts/fleet-sites.json`

**Live reference sites**

| Pattern | Copy from | Port | Unit |
|---------|-----------|------|------|
| Marketing + contact (EN/ES ok) | `iberiaworkforce.com` | 5083 | `iberiaworkforce` |
| Heavy lead form / intl-tel / attribution | `cbss.ae` | 5081 | `cbss` |
| WordPress/Elementor mirror + full CMS | `evolutionmiddleast.com` or `spheavyrental.ae` | 5080 / 5082 | … |

---

## 1. Decide SSR vs static

| Need | Choice |
|------|--------|
| Contact form, `/api/*`, Pipedrive, FLOW/CMS machine APIs | **SSR** — Astro + `@astrojs/node` `standalone` (this playbook) |
| Pure brochure, no forms/APIs | Static `astro build` + Caddy `file_server` (no Node) — rare in this fleet |

Budget ~110–120 MB RSS per SSR process. Only run Node when you need APIs.

---

## 2. Non‑negotiables (do not “simplify”)

| Do | Don’t |
|----|--------|
| `pnpm install` from **repo root**; `"astro": "catalog:"` | Nested `npm install` / carets (`^`) that drift |
| `astro build` → `node dist/server/entry.mjs` in prod | `astro dev` on the server |
| `POST` **JSON** to `/api/contact` | Multipart FormData that breaks Origin behind Caddy |
| HTTP **404** for unknown URLs | Soft 503 / `prepare:page` fallbacks |
| Central FLOW + bearer `INTERNAL_JOB_SECRET` | Per-site HTML dashboards under `/internal/operations` |
| **One secret per domain** | Reuse one `INTERNAL_JOB_SECRET` across sites |
| Pipedrive + file lead store (`.data/leads`) | Rely on SMTP for lead notify |
| Caddy: `http://` + `https://` + `tls internal` | Bare `example.com { … }` behind Cloudflare Flexible |
| systemd: `EnvironmentFile=/path/.env.prod` **without** `-` | `EnvironmentFile=-…` (boots with empty secrets) |
| `HOST`/`PORT` only in the unit / fleet runner | `HOST`/`PORT` inside `.env` / `.env.prod` |
| LF line endings in env files | CRLF (breaks systemd `EnvironmentFile`) |

---

## 3. WordPress / Elementor mirrors — why `themes` / `plugins` exist

Converted WP sites keep **static** assets under paths like:

```text
public/wp-content/themes/…
public/wp-content/plugins/…
```

That is **not** WordPress running. There is no PHP, no wp-admin, no theme/plugin execution.

Elementor HTML still references those URLs. Astro serves the frozen CSS/JS/fonts/images so the design matches production. Runtime is Astro SSR only.

When converting a new WP site:

1. Export/mirror the pages you need (HTML + linked assets).
2. Keep asset URLs stable under `public/` (often `wp-content/…`).
3. Rebuild interactive bits in Astro (`ContactForm`, blog load-more, etc.).
4. Do **not** install WordPress on the Astro host.

---

## 4. Scaffold checklist (Cursor: execute in order)

### A. Pick a peer and copy

```bash
# From monorepo root
cp -R Astro-production/<peer-domain> Astro-production/<new-domain>
cd Astro-production/<new-domain>
# Strip brand/content; keep leads/form/CMS shape from the peer
```

Update:

- `package.json` → unique `name` (filter id)
- `astro.config.mjs` → `site` / `security.allowedDomains`
- All hard-coded domain strings, logos, copy
- Remove any leftover `package-lock.json` / `node_modules`

### B. Register the site

Edit `scripts/fleet-sites.json` — next free port (**5084+**):

```json
{
  "id": "example",
  "domain": "example.com",
  "dir": "example.com",
  "port": 5084,
  "unit": "example"
}
```

### C. Depend on shared CMS

In site `package.json`:

```json
"@connect/site-cms": "workspace:*"
```

Bind in `src/cms.ts` (import from middleware first):

| Site type | Features flag | Copy mounts from |
|-----------|---------------|------------------|
| Leads only | `FEATURES_LEADS_ONLY` | Iberia / CBSS |
| Full CMS (posts, redirects, GTM, SEO, …) | `FEATURES_FULL_CMS` | Evolution / SP |

Thin route files only — re-export package handlers:

```ts
export const prerender = false;
export { GET } from '@connect/site-cms/astro/posts/index';
```

Blog/posts **data** stays in the site (`src/content/blog` or `src/data/…`) via adapters — not inside the package.

### D. Env (local vs production)

| File | Where | Contents |
|------|--------|----------|
| `.env` | Laptop (gitignored) | Full secrets OK for local smoke + `PUBLIC_SITE_URL` |
| `.env.example` | Git | Template — commit this |
| `.env` on server | Build only | `PUBLIC_SITE_URL` (no secrets); `root:webdev` **0644** |
| `.env.prod` on server | systemd | Secrets only; `root:site-*` **0640**; **required** |

Never put in either prod env file: `HOST`, `PORT`, `FORM_NOTIFICATION_*`, `SMTP_*` (leave SMTP unset).

Minimum groups (see peer `.env.example`):

- `PUBLIC_SITE_URL`
- Lead store + Pipedrive keys
- `WEBSITE_ID` / `WEBSITE_NAME` / form identity
- `INTERNAL_JOB_SECRET` (**unique**)
- Internal dirs under `.data/`

### E. Contact form

- Client: `Content-Type: application/json` → `POST /api/contact` (trailing slash OK if peer uses it)
- Server: validate → honeypot → rate limit → `.data/leads` → Pipedrive
- Phone UX: copy **CBSS** (intl-tel) or **Iberia** (plain tel) or WP phone-flags (Evolution/SP)
- **Attribution (required):** copy `src/lib/attribution/*` from a peer; wire Ads/UTM aliases on every form path (Astro + legacy mirror). Full list: [CONNECT-FLOW-SITE-ONBOARDING.md § Attribution](CONNECT-FLOW-SITE-ONBOARDING.md#attribution--google-ads--utm-required).

### F. Deploy templates

Under `Astro-production/<domain>/deploy/`:

1. **`<unit>.service`**
   - `User=site-<name>` / `Group=site-<name>`
   - `EnvironmentFile=/opt/Astro-production/<domain>/.env.prod` ← **no leading `-`**
   - `Environment=HOST=127.0.0.1` + `PORT=<n>` on `ExecStart` (or unit `Environment=`)
   - `MemoryMax=256M`, `ProtectSystem=strict`, `ReadWritePaths=…/.data`
2. **`<domain>.caddy`** — must look like live fleet:

```caddy
http://example.com, http://www.example.com, https://example.com, https://www.example.com {
	tls internal
	encode gzip zstd
	reverse_proxy 127.0.0.1:5084
	# …
}
```

Cloudflare origin SSL: **Full** (not Full strict) while origin uses `tls internal`.

3. **`ROOT_SETUP.md`** — short host notes (user, env modes, smoke curls).

### G. Install + prove locally

```bash
# repo root
pnpm install
pnpm --filter <package-name> run build
node scripts/fleet-local.mjs up <id>
node scripts/fleet-local.mjs smoke <id>
```

See [CURSOR-RUN-FLEET.md](CURSOR-RUN-FLEET.md).

### H. Server handoff (ops / root)

Developers sync **code** under `/opt/Astro-production/` (preserve `.env.prod`, `.data/`, build `.env`).  
Root installs user, unit, Caddy `sites.d` file, restic already covers the fleet via `Astro-production/deploy-host/`.

```bash
cd /opt/Astro-production
pnpm install
pnpm --filter <package-name> run build
sudo site-ctl restart <unit>
curl -sS http://127.0.0.1:<PORT>/api/health/
```

---

## 5. Shared CMS surface (FLOW)

All machine routes live under `/api/internal/*` with:

```http
Authorization: Bearer <INTERNAL_JOB_SECRET>
```

Leads-only sites expose leads + retries (+ stubs as configured).  
Full CMS sites add posts, taxonomy, redirects, GTM, SEO, uploads, php-files, etc.

Public always:

- `GET /api/health/`
- `POST /api/contact/` (JSON)
- Real **404** for unknown paths

---

## 6. Content patterns already in the fleet

| Concern | Where to copy |
|---------|----------------|
| File-backed blog JSON | Evolution `src/content/blog` |
| Flat posts store + Elementor blog UI | SP `src/data/posts.json` + `blog/` pages + load-more API |
| Licence / `llms.txt` / SEO extras | SP Heavy (`LicenceStrip`, `llm.txt.ts`, `llms.txt.ts`) |
| EN/ES marketing pages | Iberia |
| Multi-step quiz leads | CBSS |

Keep brand and content **in the site**. Keep handlers **in `@connect/site-cms`**.

---

## 7. Definition of done

- [ ] Site folder under `Astro-production/<domain>/`
- [ ] Row in `scripts/fleet-sites.json` (unique port)
- [ ] Catalog deps + `@connect/site-cms` bind + thin `/api/internal` mounts
- [ ] `.env.example` committed; local `.env` works with `fleet-local`
- [ ] Contact JSON → lead file → Pipedrive (or documented skip)
- [ ] `deploy/*.service` + `*.caddy` (`tls internal`, required `.env.prod`)
- [ ] `fleet-local` smoke green on loopback
- [ ] Server: unit + Caddy + health 200; secrets not overwritten on sync

---

## 8. Related docs

| Doc | Use when |
|-----|----------|
| [CURSOR-RUN-FLEET.md](CURSOR-RUN-FLEET.md) | First clone / daily local run |
| [CONNECT-ASTRO-NEW-SITE-PLAYBOOK.md](CONNECT-ASTRO-NEW-SITE-PLAYBOOK.md) | Forms, geo, Pipedrive, FLOW API detail |
| [server-ops-only.md](server-ops-only.md) | Host facts + deploy footguns |
| [Astro-production/deploy-host/](../Astro-production/deploy-host/) | Restic backup units |
| [packages/site-cms/README.md](../packages/site-cms/README.md) | CMS bind API |
| Peer `deploy/ROOT_SETUP.md` | Per-site host install notes |
