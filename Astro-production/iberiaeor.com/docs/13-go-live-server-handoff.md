# Go-live server handoff — Iberia EOR (Astro)

**Audience:** server / DevOps / Cloudflare admin  
**Site:** `https://iberiaeor.com`  
**Unit:** `iberiaeor` · **Port:** `5089` · **User:** `site-iberiaeor`  
**App path:** `/opt/Astro-production/iberiaeor.com`  
**App model:** Astro **Node standalone SSR** behind Cloudflare → Caddy (`tls internal`) → loopback Node.  
**Node:** `>=22.12.0` (see `package.json` `engines`)

Primary ops checklist: [`deploy/ROOT_SETUP.md`](../deploy/ROOT_SETUP.md) · fleet Caddy: `caddy/Caddyfile.production` · docs: `docs/CONNECT-CADDY-DEPLOYMENT.md`, `docs/server-ops-only.md`.

---

## 1. Cloudflare must allow these URLs

SEO / GTM files are served by the **Node app**. Do not challenge or “Cache Everything” them.

| Path | Purpose |
|------|---------|
| `/robots.txt` | Crawler policy + sitemap pointer |
| `/llm.txt` / `/llms.txt` | LLM guidance |
| `/sitemap_index.xml` | Sitemap index (underscore) |
| `/page-sitemap.xml`, `/post-sitemap.xml`, … | Chunked sitemaps |
| `/runtime-gtm.js` | Live GTM loader (`no-store`) |

Also allow marketing HTML, `/api/contact/`, `/api/geo/`, `/api/health/`, and bearer `/api/internal/*`.

**Trailing slashes:** `trailingSlash: "always"` — prefer `/api/contact/`.

### Cloudflare checklist

1. **SSL/TLS:** **Full** (not Flexible; not Full strict alone with `tls internal`).
2. Orange-cloud apex + `www` to origin `178.105.150.67`.
3. WAF / Bot Fight: **Allow / Skip** for the SEO paths above.
4. Cache: bypass `/robots.txt`, `/llms.txt`, `/sitemap*.xml`; never cache `/runtime-gtm.js`.
5. After cutover: purge those URLs once.

### Public verify

```bash
curl -sI https://iberiaeor.com/llms.txt
curl -sI https://iberiaeor.com/robots.txt
curl -sI https://iberiaeor.com/sitemap_index.xml
curl -sI https://iberiaeor.com/runtime-gtm.js
curl -sS https://iberiaeor.com/api/health/
```

Expect **HTTP 200** (not Cloudflare challenge / 403 / 1020).

---

## 2. Server: unit + Caddy

```bash
# User + .data (see ROOT_SETUP.md)
useradd --system --home /opt/Astro-production/iberiaeor.com --shell /usr/sbin/nologin site-iberiaeor
mkdir -p /opt/Astro-production/iberiaeor.com/.data
chown -R site-iberiaeor:site-iberiaeor /opt/Astro-production/iberiaeor.com/.data

# Env: .env.prod (root:site-iberiaeor 0640) + build .env (PUBLIC_SITE_URL only)
# HOST/PORT live ONLY in the unit — never in .env / .env.prod

cp /opt/Astro-production/iberiaeor.com/deploy/iberiaeor.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now iberiaeor

# Merge site block into /etc/caddy/Caddyfile from git caddy/Caddyfile.production
# (includes www one-hop + reverse_proxy 127.0.0.1:5089)
sudo -u caddy caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy

curl -sS http://127.0.0.1:5089/api/health/
```

Preserve on deploy/rsync: `.env.prod`, `.data/`. Never run `astro dev` in production.

---

## 3. FLOW registration

1. Generate unique secret: `openssl rand -hex 32`
2. Set `INTERNAL_JOB_SECRET` in `.env.prod` (not the laptop scaffold value).
3. Register domain `iberiaeor.com` + that secret in FLOW.
4. Smoke bearer GETs: `/api/internal/leads/`, `/posts/`, `/redirects/`, `/gtm/`.

---

## 4. Cutover smoke

- [ ] Homepage + 2–3 key pages
- [ ] `POST /api/contact/` (JSON) stores lead under `.data/leads`
- [ ] Attribution: submit with Ads/UTM query params → fields on lead JSON
- [ ] Sample redirects 301
- [ ] robots / sitemap / llms 200
- [ ] No `/internal/operations` UI (404)
- [ ] Cloudflare SSL Full; no redirect loop on www↔apex

---

## 5. Known pre-content limits

- Live WordPress mirror not yet under `public/wp-content` — re-run Phase 01 malware scan when clone lands.
- Homepage / CMS JSON may still be scaffold / peer leftovers until content conversion.
- Redirect `from` paths are interim scaffold; replace with Iberia Rank Math/Redirection export when available (`imports/redirects/`).
