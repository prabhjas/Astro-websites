# Connect Group — Caddy deployment for Astro SSR sites

**Lifecycle:** Phase 08–09 of [00-NEW-SITE-MASTER.md](00-NEW-SITE-MASTER.md).

**Purpose:** How we put a new (or existing) Astro fleet site behind Caddy on the production host, and what to do locally.  
**Live production target in git:** [`caddy/Caddyfile.production`](../caddy/Caddyfile.production) (matches the Aug 2026 hardened + one-hop canonical-host Caddyfile).

| Field | Value |
|-------|--------|
| **Host** | `webdev@178.105.150.67` (`Astro`) |
| **App root** | `/opt/Astro-production/<domain>/` |
| **Caddy config (live on server)** | `/etc/caddy/Caddyfile` |
| **Caddy config (git mirror)** | `caddy/Caddyfile.production` |
| **Per-site snippets** | `Astro-production/<domain>/deploy/<domain>.caddy` |
| **Related** | [CONNECT-ASTRO-NEW-SITE-PLAYBOOK](CONNECT-ASTRO-NEW-SITE-PLAYBOOK.md) · [server-ops-only](server-ops-only.md) · [local-fleet-test](local-fleet-test.md) · [`caddy/README.md`](../caddy/README.md) |

---

## 0. Local vs server (read first)

| Concern | Local laptop | Production server |
|---------|--------------|-------------------|
| Caddy | **Not required** | **Required** — single `/etc/caddy/Caddyfile` |
| How you hit the app | `node scripts/fleet-local.mjs` → `http://127.0.0.1:<PORT>` | Cloudflare → Caddy → `127.0.0.1:<PORT>` |
| `tls internal` / HSTS / security headers | Skip | Required (see production Caddyfile) |
| Apex ↔ www canonical redirects | Skip | Required — must match `PUBLIC_SITE_URL` |
| One-hop HTTP alt-host redirect block | Skip | Required when adding a site |
| `PUBLIC_SITE_URL` | Must stay `https://<canonical-host>` (fleet-local keeps this; localhost breaks live canonicals) | Must be `https://<canonical-host>` |
| Cloudflare SSL Full | N/A | **Full** (not Flexible / not Full strict with `tls internal`) |

Keep Caddy snippets in git for deploy day; do not try to mirror production Caddy locally unless you are debugging TLS/redirects on purpose.

---

## 1. Inventory — do we have everything?

**Full fleet ports (44 domains, 5080–5123):** [FLEET-PORT-REGISTRY.md](FLEET-PORT-REGISTRY.md) · `scripts/fleet-sites.json`

Your live production Caddyfile is in git as:

- **`caddy/Caddyfile.production`** — canonical live target (this doc’s standard)
- **`caddy/Caddyfile.canonical-host-redirects.pending`** — same content (historical snapshot name)

| Domain | Port | In live Caddyfile? | Canonical host (`PUBLIC_SITE_URL`) |
|--------|------|--------------------|--------------------------------------|
| evolutionmiddleast.com | 5080 | Yes | `https://www.evolutionmiddleast.com` |
| cbss.ae | 5081 | Yes | `https://cbss.ae` |
| spheavyrental.ae | 5082 | Yes | `https://spheavyrental.ae` |
| iberiaworkforce.com | 5083 | Yes | `https://iberiaworkforce.com` |
| connectgroup.co | 5085 | Yes | `https://connectgroup.co` |
| eormiddleast.com | 5090 | Yes | `https://eormiddleast.com` |
| connectstaff.ae | 5091 | Yes (git target) | `https://connectstaff.ae` |
| c-uae.com | 5092 | Yes | `https://c-uae.com` |
| kinzahr.com | 5093 | Yes (git target) | `https://kinzahr.com` |

**Gap:** connecthr.ae (**5084**) and later reserved ports — wire each on server cutover using §4. Connect Staff / Kinza blocks are in `caddy/Caddyfile.production`; still need server install + systemd units on go-live.

Older iteration files under `caddy/` remain for history only.

---

## 2. Architecture

```text
Internet → Cloudflare (public TLS, SSL mode Full)
        → origin 178.105.150.67
             ├─ Caddy :80 / :443  (tls internal, h1+h2 only, skip_install_trust)
             └─ reverse_proxy → 127.0.0.1:<PORT>
                                Node (systemd) serves pages + dist/client + /api/*
```

### Hard rules

1. **Full reverse proxy to Node** — never `file_server` for Astro SSR; never proxy only `/api/*`.
2. **Cloudflare SSL = Full** — Flexible causes redirect loops with origin HTTPS; Full (strict) rejects `tls internal` without an Origin Cert.
3. **Production site blocks use bare hostnames** (`example.com, www.example.com`) + `tls internal` — Caddy auto HTTP→HTTPS is intentional under Full SSL.
4. **One-hop canonical redirects** — alternate HTTP hosts jump straight to `https://<canonical>{uri}`; HTTPS non-canonical host also redirects. Avoid HTTP → HTTPS → canonical double hops.
5. **`HOST` / `PORT` in systemd** (or fleet-local), not `.env.prod`.
6. **`PUBLIC_SITE_URL` must equal the Caddy canonical host** (table above).

### Global options (always keep at top of fleet Caddyfile)

```caddy
{
	skip_install_trust
	servers {
		protocols h1 h2
	}
}
```

---

## 3. Production site block template (future sites)

1. Add `Astro-production/<domain>/deploy/<domain>.caddy` (site block below).
2. Merge that block into `caddy/Caddyfile.production` **and** live `/etc/caddy/Caddyfile`.
3. Extend the **shared one-hop HTTP** block (alternate host only).

### Site block

```caddy
# example.com -> 127.0.0.1:5086 (systemd: example.service)
example.com, www.example.com {
	tls internal
	encode zstd gzip

	# Apex canonical (most sites). Evolution is the opposite: www is canonical.
	@noncanonical host www.example.com
	redir @noncanonical https://example.com{uri} permanent

	reverse_proxy 127.0.0.1:5086

	@static path_regexp static \.(css|js|woff|woff2|webp|jpg|jpeg|png|gif|svg|ico|avif|ttf|otf)$
	header @static Cache-Control "public, max-age=31536000, immutable"
	header {
		-Server
		Strict-Transport-Security "max-age=31536000"
		X-Content-Type-Options nosniff
		X-Frame-Options SAMEORIGIN
		Referrer-Policy strict-origin-when-cross-origin
	}
	log {
		output file /var/log/caddy/example.com-access.log {
			roll_size 100MiB
			roll_keep 14
		}
		format json
	}
}
```

### Shared one-hop HTTP block (edit carefully)

Add the **non-canonical HTTP host** to the comma-separated list and a matcher:

```caddy
# Apex-canonical site (typical):
http://…, http://www.example.com {
	@example host www.example.com
	redir @example https://example.com{uri} permanent
}

# www-canonical site (Evolution style):
http://…, http://example.com {
	@example host example.com
	redir @example https://www.example.com{uri} permanent
}
```

### Connect HR cutover (when ready)

From `deploy/connecthr.ae.caddy`:

1. Append the `connecthr.ae, www.connecthr.ae { … }` block (port **5084**).
2. Add `http://www.connecthr.ae` to the one-hop HTTP list + `@connecthr` → `https://connecthr.ae{uri}`.
3. Sync `caddy/Caddyfile.production`, validate, reload.

---

## 4. Server deploy checklist (every site cutover)

Do in order. Root/sudo where noted.

### A. App + systemd

1. Code under `/opt/Astro-production/<domain>/`
2. `site-<unit>` user + writable `.data/`
3. `.env.prod` (secrets) + `.env` with `PUBLIC_SITE_URL=https://<canonical>`
4. Install unit → `systemctl enable --now <unit>`
5. Smoke: `curl -sS http://127.0.0.1:<PORT>/api/health/`

### B. Caddy (must do on server — not local)

1. Update **both**:
   - live `/etc/caddy/Caddyfile`
   - git `caddy/Caddyfile.production` + `deploy/<domain>.caddy`
2. Add site block + one-hop HTTP alt-host entry
3. Validate + reload:

```bash
sudo -u caddy caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

### C. Cloudflare / DNS

1. SSL/TLS = **Full**
2. Apex + www → origin (proxied)
3. Confirm canonical redirects (www↔apex) match `PUBLIC_SITE_URL`
4. Smoke: homepage, `/api/health/`, form POST, static asset, sitemap/robots

### D. Preserve on rsync

Never overwrite `.env.prod` / `.data/`. Never run `astro dev` on production.

---

## 5. Local development

```bash
node scripts/fleet-local.mjs up <site-id>   # or: up all
node scripts/fleet-local.mjs smoke <site-id>
```

| Local URL | Port |
|-----------|------|
| Evolution | 5080 |
| CBSS | 5081 |
| SP Heavy | 5082 |
| Iberia | 5083 |
| Connect HR | 5084 |
| Connect Group | 5085 |

No Caddy, no HSTS, no apex/www redirects locally — Node on loopback is enough.

**Hard rule:** `fleet-local` keeps `PUBLIC_SITE_URL=https://<canonical-host>` (never `http://127.0.0.1:<port>`).
Astro inlines `PUBLIC_*` at build time — a localhost value ships bad `<link rel="canonical">` / `og:url` to production.
Before any server sync, verify:

```bash
grep '^PUBLIC_SITE_URL=' Astro-production/<domain>/.env
# must be https://… — never 127.0.0.1 / localhost
grep -R "127.0.0.1" Astro-production/<domain>/dist/server/entry.mjs && echo FAIL || echo OK
```

---

## 6. New-site Caddy checklist

- [ ] Port reserved in `scripts/fleet-sites.json` + [FLEET-PORT-REGISTRY.md](FLEET-PORT-REGISTRY.md) (next free **5124+**)
- [ ] Decide canonical host (apex vs www) and set `PUBLIC_SITE_URL` + `.env.example`
- [ ] `deploy/<domain>.caddy` committed (hardened headers + `@noncanonical` redir)
- [ ] `caddy/Caddyfile.production` updated (site block **and** one-hop HTTP list)
- [ ] Matching systemd unit with `PORT=<n>`
- [ ] Unit healthy on loopback
- [ ] Live `/etc/caddy/Caddyfile` updated on server
- [ ] `caddy validate` + `systemctl reload caddy`
- [ ] Cloudflare DNS + SSL **Full**
- [ ] Post-cutover redirect checks (HTTP alt-host → canonical HTTPS in one hop)

---

## 7. Anti-patterns

- Bare hostnames + Cloudflare **Flexible**
- `tls internal` + Cloudflare **Full (strict)** without Origin Cert
- Partial `/api/*` proxy + Caddy `file_server` for Astro SSR
- `PUBLIC_SITE_URL` disagreeing with Caddy `@noncanonical` / one-hop targets (e.g. CBSS must be apex)
- Editing live Caddy without updating `caddy/Caddyfile.production` and `deploy/*.caddy`
- Expecting local fleet-local to need production Caddy behaviour

---

## 8. Archive map (`caddy/`)

| Need | Open |
|------|------|
| **Live production target** | `caddy/Caddyfile.production` |
| Same as historical pending name | `caddy/Caddyfile.canonical-host-redirects.pending` |
| Pre-consolidation `sites.d` | `caddy/archive-before-single-file-20260803/` |
| Rollback binary/certs | `caddy/upgrade-rollback-20260803/` (ops only; private keys) |

---

*Updated Aug 2026 — production standard = hardened bare-host Caddyfile with one-hop canonical redirects. Local = fleet ports only.*
