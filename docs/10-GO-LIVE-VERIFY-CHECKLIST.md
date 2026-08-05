# 10 — Go-live verify checklist

**When:** After local feature work **and** again after server cutover (loopback + public HTTPS).  
**Linked from:** [00-NEW-SITE-MASTER.md](00-NEW-SITE-MASTER.md) Phase 10 · [OPS-OWNER-CADDY-CUTOVER.md](OPS-OWNER-CADDY-CUTOVER.md)

Replace `<PORT>`, `<id>`, `<domain>`, `<canonical>` (example: `https://c-uae.com`).

Use **loopback** `http://127.0.0.1:<PORT>` until Caddy/DNS are live; then repeat the same checks on `https://<canonical>`.

---

## Quick matrix (nine cutover sites — Aug 2026)

| Site | Port | Canonical | Trailing slash | Notes |
|------|------|-----------|----------------|-------|
| evolutionmiddleast | 5080 | www.evolutionmiddleast.com | middleware | Live Tier‑1 |
| cbss | 5081 | cbss.ae | peer / Astro | Live Tier‑1 |
| spheavyrental | 5082 | spheavyrental.ae | `trailingSlash: always` | Live Tier‑1 |
| iberiaworkforce | 5083 | iberiaworkforce.com | `trailingSlash: always` | Live Tier‑1 |
| connectgroup | 5085 | connectgroup.co | `trailingSlash: always` + middleware | Live Tier‑1 |
| eormiddleast | 5090 | eormiddleast.com | `trailingSlash: always` | New cutover |
| connectstaff | 5091 | connectstaff.ae | middleware | New cutover |
| c-uae | 5092 | c-uae.com | `trailingSlash: always` | New cutover |
| kinzahr | 5093 | kinzahr.com | middleware (all extensionless) | New cutover |

---

## 1. Trailing slash

Bare paths without a file extension **must** redirect to the slashed URL.

```bash
# Expect 301 (GET) → Location ends with /
curl -sSI "http://127.0.0.1:<PORT>/about-us" | head -15
curl -sSI "http://127.0.0.1:<PORT>/contact-us" | head -15

# With slash → 200 (or site-specific OK page)
curl -sS -o /dev/null -w "%{http_code}\n" "http://127.0.0.1:<PORT>/about-us/"

# Assets must NOT redirect
curl -sS -o /dev/null -w "%{http_code}\n" "http://127.0.0.1:<PORT>/runtime-gtm.js"
```

- [ ] Bare page path → **301** (or **308** for POST) to `…/`
- [ ] Slashed page → **200**
- [ ] `.js` / `.css` / images → **200** (no slash redirect)
- [ ] `POST /api/contact` without slash → **308** to `/api/contact/` (or client already posts with `/`)

**Fleet pattern:** prefer `trailingSlash: "always"` in `astro.config.mjs` **and/or** middleware that redirects extensionless paths (see `kinzahr.com` / `evolutionmiddleast.com`). Static prerender peers (e.g. Connect Group) often need the Astro config flag or the static handler bypasses middleware.

---

## 2. Canonical / SEO hosts

```bash
# Homepage has absolute canonical matching PUBLIC_SITE_URL
curl -sS "http://127.0.0.1:<PORT>/" | grep -i 'rel="canonical"' | head -3

# Robots + sitemaps + llms
curl -sS -o /dev/null -w "robots %{http_code}\n" "http://127.0.0.1:<PORT>/robots.txt"
curl -sS -o /dev/null -w "sitemap %{http_code}\n" "http://127.0.0.1:<PORT>/sitemap_index.xml"
curl -sS -o /dev/null -w "llms %{http_code}\n" "http://127.0.0.1:<PORT>/llms.txt"
```

- [ ] `<link rel="canonical">` is **absolute** `https://…` (not relative, not `127.0.0.1`)
- [ ] `PUBLIC_SITE_URL` / build `site` equals canonical host (apex or www — match Caddy `@noncanonical`)
- [ ] `/robots.txt`, sitemap index, `/llms.txt` → **200**
- [ ] After Caddy: `www` ↔ apex one-hop to canonical (no Flexible SSL loop)

**Public (after owner Caddy):**

```bash
curl -sSI "https://www.<domain>/" | head -15   # should 301 to canonical if www is non-canonical
curl -sSI "https://<canonical>/" | head -10
```

---

## 3. GTM / GA4 (dynamic only)

Owner detail: [OPS-OWNER-DYNAMIC-GTM-GA4.md](OPS-OWNER-DYNAMIC-GTM-GA4.md)

```bash
curl -sS "http://127.0.0.1:<PORT>/runtime-gtm.js" | head -c 200; echo
# Loader must recreate <script> nodes (not dead innerHTML-only inject)
curl -sS "http://127.0.0.1:<PORT>/runtime-gtm.js" | grep -q recreateScript && echo "recreateScript OK" || echo "CHECK loader"
```

- [ ] Pages load `/runtime-gtm.js` (or SSR snippets via `resolveEffectiveGtmConfig`)
- [ ] Env `PUBLIC_GTM_ID` / `PUBLIC_GA4_ID` honored when no FLOW `gtm.json`
- [ ] No pasted googletagmanager blocks left in cleaned legacy HTML (greedy strip fixed — do not reintroduce)

---

## 4. Forms, gclid / UTM, Pipedrive

```bash
curl -sS "http://127.0.0.1:<PORT>/api/health/"
curl -sS -X POST "http://127.0.0.1:<PORT>/api/contact/" \
  -H 'content-type: application/json' \
  -d '{"name":"Verify User","email":"verify@example.com","phone":"+971500000000","message":"go-live check","gclid":"test-gclid","utm_source":"verify","campaignId":"1","device":"m"}'
```

- [ ] Health **200** `{ ok: true, … }`
- [ ] Contact **200** success; lead under `.data/leads/`
- [ ] Stored lead includes `gclid` / UTM when sent (or page-URL merge)
- [ ] Pipedrive delivery attempted when tokens set (check logs / Pipedrive UI)
- [ ] No SMTP / `FORM_NOTIFICATION_*` required

---

## 5. Internal / FLOW APIs

```bash
SECRET='<INTERNAL_JOB_SECRET>'
curl -sS -o /dev/null -w "deny %{http_code}\n" \
  "http://127.0.0.1:<PORT>/api/internal/leads"
curl -sS -o /dev/null -w "auth %{http_code}\n" \
  -H "Authorization: Bearer $SECRET" \
  "http://127.0.0.1:<PORT>/api/internal/leads"
```

- [ ] No bearer → **401/403**
- [ ] Bearer → **200**
- [ ] GTM / redirects / SEO internal routes present if `FEATURES_FULL_CMS`

---

## 6. Redirects middleware

```bash
# Pick a known legacy path from imports/redirects or peer list
curl -sSI "http://127.0.0.1:<PORT>/<old-path>" | head -15
```

- [ ] Sample old URL **301/308** to new target
- [ ] Runtime + YAML redirect stores load without crashing pages

---

## 7. Deploy / process model

### Loopback (before owner root)

- [ ] `dist/server/entry.mjs` present
- [ ] Portable `node_modules` (not laptop symlinks-only) on server
- [ ] `.env` = PUBLIC only; `.env.prod` = secrets mode **600/640**
- [ ] Process listens `127.0.0.1:<PORT>` only

### After owner root ([OPS-OWNER-CADDY-CUTOVER.md](OPS-OWNER-CADDY-CUTOVER.md))

- [ ] systemd unit `site-<name>` active
- [ ] `site-ctl status|restart <unit>` works
- [ ] Caddy reverse_proxy → correct port; validate + reload done
- [ ] Cloudflare SSL **Full**
- [ ] Interim `nohup` PIDs gone

---

## 8. Cleanup hygiene (repo)

- [ ] No `_quarantine-html-masquerade/`, root `_crawl/`, or `*_identity-bak` in git
- [ ] No secrets in tracked files
- [ ] `.gitignore` covers `_crawl/` and quarantine paths

---

## Sign-off

| Check block | Local | Loopback server | Public HTTPS |
|-------------|-------|-----------------|--------------|
| 1 Trailing slash | ☐ | ☐ | ☐ |
| 2 Canonical / SEO | ☐ | ☐ | ☐ |
| 3 GTM | ☐ | ☐ | ☐ |
| 4 Forms / attribution | ☐ | ☐ | ☐ |
| 5 Internal APIs | ☐ | ☐ | ☐ |
| 6 Redirects | ☐ | ☐ | ☐ |
| 7 Process / Caddy | ☐ | ☐ | ☐ |

**Domain:** _____________ **Date:** _____________ **By:** _____________

---

*Use with 00-NEW-SITE-MASTER Phase 10. Owner Caddy steps stay in OPS-OWNER-CADDY-CUTOVER.md.*
