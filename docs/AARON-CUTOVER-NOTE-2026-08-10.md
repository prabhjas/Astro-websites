# Aaron cutover note — 2026-08-10 (fleet + signatures + CF purge)

> **WARNING (11 Aug 2026) — do not run the staged root scripts as written.**  
> Aaron: the **signature** `APPLY.sh` mutates the attested immutable release from a user-writable staging directory. **APPLY-NEXT6.sh** has no transactional rollback, tolerates failed health checks, starts mutable in-tree builds, and edits `site-ctl` with brittle text substitution.  
> Do **not** run `/home/webdev/staging/signatures/APPLY.sh` or `/home/webdev/staging/fleet-cutover-20260810/APPLY-NEXT6.sh` until rewritten. Safe shape: new immutable release for signature PNGs; transactional next-6 with health-check abort. See [CLAUDE-FLEET-QUEUE-PROMPT § FQ-00](CLAUDE-FLEET-QUEUE-PROMPT.md#fq-00--do-not-run-staged-signature--next-6-apply-scripts).

---

**From:** engineering (webdev)  
**Host:** `Astro` / `178.105.150.67`  
**Live app root today:** immutable release  
`/opt/deploy-backups/astro-security-releases/fleet/92d5bb1a2130a49beb5dd0d60a24b98ad76e31f9/root/Astro-production/`  
**Mutable tree (does NOT serve live HTML by itself):** `/opt/Astro-production/`

---

## Important constraint

All **28 live** systemd units use drop-in `90-immutable-security-release.conf`.  
`rsync` / copy into `/opt/Astro-production/<site>` alone **will not change what visitors see**.  
Live Node reads the **immutable release** tree. To ship app/content changes: **new immutable release** (preferred) or root `install` into the current release (small hotfixes only).

`webdev` passwordless sudo is only: `sudo site-ctl <restart|status|logs> <site>`.

---

## A) Do first (no new release) — Connect Resources homepage “Shared / Benefits” slider

**Root cause:** Smart Slider JS is present on origin (**200** on `127.0.0.1:5086` and direct-to-origin), but Cloudflare is serving a **cached 404** for:

`/wp-content/plugins/nextend-smart-slider3-pro/.../*.js`  
(`cf-cache-status: HIT`, `age` ~2.7 days, `Cache-Control: immutable`)

Cache-bust (`?v=…`) already returns **200**. HTML local ≡ live; this is **not** a missing-file deploy.

### Cloudflare (Aaron / CF admin)

Purge cache for `connectresources.ae`, at least:

- `https://connectresources.ae/wp-content/plugins/nextend-smart-slider3-pro/*`
- optionally full zone purge if easier

Then verify:

```bash
curl -sI 'https://connectresources.ae/wp-content/plugins/nextend-smart-slider3-pro/Public/SmartSlider3/Application/Frontend/Assets/dist/n2.min.js' | egrep 'HTTP|cf-cache|age'
# expect HTTP/2 200 and not a long-age HIT on 404
```

Homepage “Benefits of Our Service” / Smart Slider showcase should animate again after purge.

---

## B) Do second — signatures (APPLY updated 2026-08-10)

Staged under `/home/webdev/staging/signatures/` (FM + SA + **Connect HR Falak** + full **Connect Freelance** set).  
Live Node only reads the **immutable release** — mutable `/opt/.../dist` alone does not fix public URLs.

```bash
# ⛔ VETOED 11 Aug 2026 — DO NOT RUN as written (see WARNING at top). Owner must rewrite:
# signatures belong in a NEW immutable release, not patched into the attested tree from staging.
sudo /home/webdev/staging/signatures/APPLY.sh
```

Then purge Cloudflare for at least:

- `https://connectfm.ae/wp-content/uploads/2025/02/CONNECT-FM-SIGNATURE-Sathiskumar.png`
- `https://connectresources.sa/wp-content/uploads/2025/02/CONNECT-RESOURCES-SAUDI.png`
- `https://connecthr.ae/wp-content/uploads/2024/10/CONNECT-HR-EMAIL-SIGNATURE-FALAK-scaled.jpg`
- `https://connectfreelance.ae/wp-content/uploads/*EMAIL-SIGNATURE*` (or zone purge if easier)

**Connect Freelance batch (2026-08-10 evening):** staging refreshed with updated Dale / Desery / Wilson / Martin + **new** Jenita / Johann / Ralph under `uploads/2026/08/`. Detail: `/home/webdev/staging/signatures/AARON-NOTE-CF-NEW-20260810.md`. Same APPLY.sh installs them into the immutable release.

**Note (Connect Freelance):** origin `:5094` and public HTTPS already return **200** for previously staged signatures in release `92d5bb1a2`. After APPLY, purge CF for updated/new URLs (cached 404/old image).

---

## C) Live 28 — what actually needs a new app release?

Local working tree vs live release (meaningful code/assets only):

| Site | Needs release? | Why |
|------|----------------|-----|
| connectresources.ae | **No** (for homepage slider) | CF purge only (A) |
| connectfm.ae | **Yes** | smart-homes redesign CSS order, duct image srcset sizes, pages/bodies |
| connectresources.sa | Hotfix OK via (B) | signature PNG only |
| emiratiguard.com | Optional / later | sanitize skip + VC fallback CSS |
| Other live 26 | **No pending content deploy** from this batch | Still on `92d5bb1a2` security SHA by design |

So: **do not redeploy all 28 “one by one” for this batch.** Only Connect FM (content) + signatures + CF purge.

---

## D) Next 6 — staged on host (2026-08-10); awaiting Aaron enable

Confirmed inventory: **28** in `site-ctl` + **`connectresourcesint`** active/enabled (excluded from ALLOWED by design).

Engineering staged trees + secrets + Caddy draft. Loopback health **PASS** for all 6 (`/api/health/` → 200) when started manually under `webdev` — **systemd / Caddy / public DNS still need root**.

| Domain | unit | PORT | `/opt/Astro-production` | `.env.prod` |
|--------|------|------|-------------------------|-------------|
| mbs-consultancy.com | mbs-consultancy | 5099 | yes | yes (mode 600; chown in APPLY) |
| connectzone.ae | connectzone | 5101 | yes | yes |
| movey.ae | movey | 5104 | yes | yes |
| emiratisationhub.com | emiratisationhub | 5107 | yes | yes |
| companyformationsaudi.com | companyformationsaudi | 5114 | yes | yes |
| alburaq.ae | alburaq | 5120 | yes | yes |

Staging pack (~2G):

`/home/webdev/staging/fleet-cutover-20260810/`

- `Astro-production/<site>/` (built `dist/`, `public/`, `deploy/`, `node_modules`)
- `env.prod/*.env.prod`
- `caddy/Caddyfile.production`
- `APPLY-NEXT6.sh` ← **run as root for first enable**
- `notes/AARON-CUTOVER-NOTE-2026-08-10.md`
- `connectfm-delta/` (duct webp sizes)

```bash
# ⛔ VETOED 11 Aug 2026 — DO NOT RUN as written (see WARNING at top). Owner must rewrite:
# no transactional rollback, tolerates failed health checks, in-tree builds, brittle site-ctl sed.
sudo /home/webdev/staging/fleet-cutover-20260810/APPLY-NEXT6.sh
# then install/reload Caddy from staged Caddyfile.production
```

Prefer also folding these trees into a **new immutable security release** (same model as live 28) before or right after public cutover.

---

## E) Recommended best path (one Aaron window)

### 1. Quick wins (today, minutes)

1. CF purge Connect Resources Smart Slider paths (section A)  
2. `sudo /home/webdev/staging/signatures/APPLY.sh` (section B) — ⛔ **VETOED, do not run** (rewrite as new immutable release)  
3. CF purge the two signature URLs  

### 2. Next 6 first enable + Caddy

```bash
# ⛔ VETOED 11 Aug 2026 — DO NOT RUN APPLY-NEXT6.sh as written (see WARNING at top). Owner rewrite required.
sudo /home/webdev/staging/fleet-cutover-20260810/APPLY-NEXT6.sh
# Install staged Caddyfile into live layout, then:
sudo -u caddy caddy validate --config /etc/caddy/Caddyfile && sudo systemctl reload caddy
```

`APPLY-NEXT6.sh` creates `site-*` users, installs units, enables them, extends `site-ctl` ALLOWED, and curls health on 5099/5101/5104/5107/5114/5120.

### 3. App content cutover (Connect FM + harden next 6)

**Preferred:** build **one new immutable security release** from a reviewed tree that includes:

- updated `connectfm.ae` (built `dist/` + public assets; duct images in `connectfm-delta/`)
- the next 6 trees already under `/opt/Astro-production/` + staging pack
- then point units (existing 28 + new 6) at that release SHA (drop-in like live 28) and `site-ctl restart`

**Acceptable hotfixes only:** root `install` into current release (signatures pattern) — do **not** try to rsync whole sites into the read-only release by hand.

---

## F) Explicit “do not”

- Do **not** only rsync to `/opt/Astro-production` and `site-ctl restart` expecting live HTML to change.  
- Do **not** enforce CSP yet.  
- Do **not** re-enable aggressive mirror script stripping.  
- Do **not** mass-redeploy all 28 unless the new release intentionally includes fleet-wide changes.

---

## G) Verify after cutover

```bash
# Signatures
curl -sI https://connectfm.ae/wp-content/uploads/2025/02/CONNECT-FM-SIGNATURE-Sathiskumar.png | head -5
curl -sI https://connectresources.sa/wp-content/uploads/2025/02/CONNECT-RESOURCES-SAUDI.png | head -5

# CR Smart Slider (after CF purge)
curl -sI https://connectresources.ae/wp-content/plugins/nextend-smart-slider3-pro/Public/SmartSlider3/Application/Frontend/Assets/dist/n2.min.js | head -8

# Connect FM pages
curl -sI https://connectfm.ae/security/smart-homes/ | head -5
curl -sI https://connectfm.ae/ac-duct-cleaning-lp/ | head -5
curl -sI https://connectfm.ae/wp-content/uploads/2026/04/dirty-ducts-cost-money-300x239.webp | head -5

# Next 6 health (after units up)
for p in 5099 5101 5104 5107 5114 5120; do curl -s "http://127.0.0.1:$p/api/health/" ; echo; done
```
