# Ops handoff — security audit P0 items we cannot finish in app code alone

Source: `Astro_Security_Audit_Report_2026-08-06.pdf`  
Companion: [SECURITY-AUDIT-REMEDIATION-2026-08-06.md](./SECURITY-AUDIT-REMEDIATION-2026-08-06.md)  
App code: pushed on `work/astro-sites` (`b4ddbb45` — harden 15 live Astro sites).

These items need **server root / Cloudflare / git history rewrite**. Engineering prepared staging files + scripts; the table below is what “done” means and who can do it.

| ID | What we want | Why | Can we (webdev / Cursor) do it? | Who | Status 2026-08-07 |
|----|--------------|-----|----------------------------------|-----|-------------------|
| **P0-1 CA rotate** | Stop trusting the leaked Caddy local CA / origin keys; issue **new** certs on `178.105.150.67` | Private `.key` files were in git; anyone with history could forge trust | **No** — needs root on Astro host + Caddy reload | Aaron / root | **Aaron** |
| **P0-1 History purge** | Remove key blobs from **all past commits** (`git filter-repo`) then force-push; everyone re-clones | Deleting files in a new commit does not erase history | **Prepare only** — script ready; rewrite needs scheduled window | Aaron + repo admins | **Prepared:** `scripts/ops/purge-leaked-caddy-keys-from-history.sh` (+ copy in `_incoming/`) |
| **P0-2 Unique secrets** | Each live site gets its own `INTERNAL_JOB_SECRET` (Kinza also `ENHANCED_RUN_SECRET`) in `.env.prod` | Shared secret = one leak opens many sites | **Blocked** — all `.env.prod` are `root:site-*` mode `640`; webdev cannot read/write | Aaron / root | **Prepared:** sealed file + apply script in `_incoming/` (mode `600`) |
| **P0-4 Cloudflare-only origin** | Block public hits to origin IP; only Cloudflare (or Tunnel) reaches Node/Caddy | Direct IP bypasses CF WAF/SSL | **No** — host firewall / CF Tunnel / SSL mode is infra | Aaron / Cloudflare admin | **Aaron** |
| **Caddy reload** | Install updated `caddy/Caddyfile.production` → `/etc/caddy/Caddyfile`, validate, reload | Headers, CSP-RO, `/_astro` cache, new site redirects | **Partly** — staged under `_incoming/`; cannot write `/etc/caddy` or reload | Aaron / root | **Staged:** `_incoming/Caddyfile.production.20260807-security` + `install-caddyfile-security-20260807.sh` |
| **site-ctl + connectresourcesint** | Add unit to `site-ctl` ALLOWED list | Webdev cannot restart that site via site-ctl today | **No** without root allowlist edit | Aaron / root | **Defer** (site ignored for now) |

### What engineering already did (no Aaron needed)

1. App security batch on branch `work/astro-sites` (pushed to Connect-Group-Tech + personal).  
2. Deleted leaked `.key` files from the **current** tree (history still dirty until purge).  
3. Uploaded Caddyfile + ops scripts + sealed secret rotate package to `/opt/Astro-production/_incoming/`.  
4. Live homepage smoke (2026-08-07): all 15 domains return **200** (evolution apex **301** → www — expected). Query auth already rejected on Kinza (`?key=` → 401) and Connect Group GTM (`?secret=` → 403).

### Suggested owner sequence

1. Deploy app security batch (git pull + rebuild/restart 15 sites) — after merge/cutover of `work/astro-sites`.  
2. Reload Caddy with staged file (headers / CSP Report-Only / `/_astro` cache).  
3. Rotate per-site secrets + restart units (apply script).  
4. Firewall / CF Full (strict) or Tunnel.  
5. Schedule CA rotate + history purge window.

Engineering does **not** need to wait for (4)/(5) to ship app fixes, but the PDF checklist is incomplete until those land.

---

## Copy-paste message for Aaron

```text
Hi Aaron — security audit P0 ops for the Astro host (178.105.150.67).
App code is on branch work/astro-sites (commit b4ddbb45). Please run as root.

## 0) Deploy app batch (15 live sites)
After you pull/cut over work/astro-sites under /opt/Astro-production:
  - rebuild the 15 domains (pnpm as usual)
  - sudo site-ctl restart <unit> for:
    evolutionmiddleast cbss spheavyrental iberiaworkforce connecthr
    connectgroup connectfm connectresources-sa iberiaeor eormiddleast
    connectstaff cuae kinzahr connectfz royalvisa
(Do NOT require connectresourcesint in site-ctl yet — deferred.)

## 1) Caddy reload (headers + CSP Report-Only + /_astro cache)
Staging already on the host:
  /opt/Astro-production/_incoming/Caddyfile.production.20260807-security
  /opt/Astro-production/_incoming/install-caddyfile-security-20260807.sh

  sudo bash /opt/Astro-production/_incoming/install-caddyfile-security-20260807.sh

Verify:
  curl -sSI https://connectgroup.co/ | grep -iE 'content-security-policy-report-only|permissions-policy'

## 2) Unique INTERNAL_JOB_SECRET per site (P0-2)
All .env.prod are root-owned 640 — webdev cannot rotate them.
Sealed package (mode 600) already on host:
  /opt/Astro-production/_incoming/unique-secrets.env
  /opt/Astro-production/_incoming/apply-unique-secrets-as-root.sh

  sudo bash /opt/Astro-production/_incoming/apply-unique-secrets-as-root.sh \
    /opt/Astro-production/_incoming/unique-secrets.env

That updates INTERNAL_JOB_SECRET for all 15 sites + ENHANCED_RUN_SECRET for kinzahr,
then restarts via site-ctl. After success, shred/delete the secrets file from _incoming:
  shred -u /opt/Astro-production/_incoming/unique-secrets.env
  # or: rm -f … and confirm FLOW/cron callers get the new per-site Bearer values

## 3) Cloudflare-only origin (P0-4)
Block direct public access to 178.105.150.67:443/80 except Cloudflare IP ranges
(or prefer Cloudflare Tunnel). Set SSL mode Full (strict) once origin certs are public-trusted.
This is firewall / CF admin — not doable as webdev.

## 4) CA rotate (P0-1) — schedule a window
Leaked Caddy local CA + origin .key files were in git (deleted from HEAD only).
On the host: generate a NEW local CA (or move off local CA to public-trusted origin certs / Tunnel),
re-issue origin certs, reload Caddy. Treat old CA/keys as compromised.

## 5) Git history purge (P0-1) — separate scheduled window
Script prepared (also in repo scripts/ops/ and _incoming/):
  purge-leaked-caddy-keys-from-history.sh
Use a fresh --mirror clone, run git-filter-repo, then coordinated force-push on
Connect-Group-Tech/Astro-websites (and any mirrors that still have the blobs).
Everyone must re-clone afterward. Do not merge pre-purge history back.

## 6) Skip for now
site-ctl allowlist for connectresourcesint — not requested this round.

Thanks — Engineering
```

---

## Files staged on the host (`webdev@astro`)

| Path under `/opt/Astro-production/_incoming/` | Purpose |
|----------------------------------------------|---------|
| `Caddyfile.production.20260807-security` | New production Caddyfile |
| `install-caddyfile-security-20260807.sh` | Root: install + `caddy validate` + reload |
| `unique-secrets.env` | Sealed unique secrets (**delete after apply**) |
| `apply-unique-secrets-as-root.sh` | Root: write `.env.prod` + restart units |
| `purge-leaked-caddy-keys-from-history.sh` | History rewrite (scheduled window only) |
| `install-caddyfile-security-20260807.sh` | Same as repo `scripts/ops/` |

Repo copies (no secrets): `scripts/ops/purge-leaked-caddy-keys-from-history.sh`, `scripts/ops/install-caddyfile-security-20260807.sh`.
