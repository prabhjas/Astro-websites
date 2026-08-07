# Security audit remediation (2026-08-06)

Source: `Astro_Security_Audit_Report_2026-08-06.pdf`  
Scope: Connect Group Astro fleet (live Caddy sites + shared packages).  
Status: **app code on `work/astro-sites` (`b4ddbb45`+)** — live cutover still needs Aaron (Caddy reload, unique `.env.prod` secrets, CA rotate / history purge). See [SECURITY-OPS-AARON-HANDOFF.md](./SECURITY-OPS-AARON-HANDOFF.md).

This doc tracks what we implemented in the repo versus what still needs owner/ops action.

---

## Priority 0 — code done locally

| ID | Finding | Local remediation |
|----|---------|-------------------|
| **P0-1** | Caddy CA / origin `.key` files in git tree | Deleted keys under `caddy/upgrade-rollback-20260803/…` from the working tree; added `SECURITY-NOTE.txt`. **History still contains old keys** — see [CA history rewrite](#p0-1-ca-keys--what-git-history-rewrite-means) below (Aaron / owner). |
| **P0-2** | Query-string auth (`?secret=`, Kinza `?key=`); shared secrets | Shared CMS auth accepts **only** `Authorization: Bearer` or `x-internal-job-secret`. Enhanced jobs accept Bearer / `x-enhanced-key` / `x-internal-job-secret`. Query auth rejected. `.env.example` + FLOW onboarding updated. **Still rotate to unique per-site secrets on server before go-live.** |
| **P0-3** | PHP upload/save + PHP runner RCE path | PHP CMS upload/save → HTTP **410**. Kinza `/enhanced/*.php` URLs now run a **Node** Pipedrive → Google Ads job (no `spawn('php')`). Reference PHP files kept under `enhanced/` only. |
| **P0-5** | XSS: CMS HTML, search `innerHTML`, SVG uploads, weak GTM sanitiser | `sanitizeCmsHtml` in `@connect/site-cms` on post save + internal-posts stores + blog content inject; search pages escape dynamic HTML; uploads reject SVG/HTML/JS/PHP; GTM snippets strip `on*` / `javascript:` / SVG. |
| **P0-6** | Unescaped HTML in notification emails | `escapeHtml` on email HTML bodies across site `src/services/email` modules (SMTP remains optional/dormant). |

### Also applied locally (headers / deps / config)

- Caddy (`caddy/Caddyfile.production`): immutable cache only for `/_astro/*`; added `Permissions-Policy`.
- Astro configs: explicit `security.checkOrigin: true` where missing.
- Nodemailer catalog → `9.0.4` (+ lockfile).
- Catalog: `sanitize-html@2.17.6` for `@connect/site-cms`.

---

## Priority 0 — still owner / ops (not “app code only”)

| ID | Finding | Owner action |
|----|---------|--------------|
| **P0-1** | Keys in **git history** | Rotate Caddy local CA / origin certs on host; purge keys from git history (`git filter-repo` / BFG); force-push coordination; revoke any leaked material. See section below. |
| **P0-2** | Shared `INTERNAL_JOB_SECRET` across sites | Generate unique secrets per site in `.env.prod`; update FLOW when onboarded; never reuse. |
| **P0-4** | Direct origin IP bypasses Cloudflare | Firewall origin to Cloudflare IPs (or Cloudflare Tunnel); SSL mode **Full (strict)** once origin certs are public-trusted (or tunnel). |
| Ops | `site-ctl` allowlist missing `connectresourcesint` | Root: extend `/usr/local/sbin/site-ctl` ALLOWED; unit already running on 5098. |
| Ops | connectresources.ae header baseline | If that host path is live elsewhere, apply same Caddy header block. |

---

## Priority 1 / 2 — next passes (tracked)

- [x] CSP **Report-Only** on Caddy fleet headers (`Content-Security-Policy-Report-Only` in `caddy/Caddyfile.production`).
- [ ] CSP **enforce** — **not flipped yet**. Enforcing now would break GTM + Elementor inline scripts. Keep Report-Only until reports are clean, then change header name to `Content-Security-Policy` in a dedicated cutover.
- [x] Contact body size enforced while reading (`readRequestBodyLimited`) on all 15 live site `/api/contact` routes.
- [ ] Edge distributed rate limits / Cloudflare — ops (see [SECURITY-OPS-AARON-HANDOFF.md](./SECURITY-OPS-AARON-HANDOFF.md)).
- [x] Playwright → `1.62.1`; `@astrojs/check` → `0.9.10`; CI workflow `.github/workflows/security-audit.yml` (`pnpm audit`).
- [x] Elementor / WP mirror HTML: light `sanitizeMirrorHtml` on slug pages + `legacy-page.js` — **only** `javascript:` URLs, `<base>`, meta refresh. Do **not** strip inline scripts / `on*` (broke Kinza mega-menu + Connect Group ScrollSequence; restored 2026-08-07). CMS posts still use strict `sanitizeCmsHtml`.
- [ ] Full WordPress JS cleanup + SRI on every legacy asset — **multi-week**; SRI cannot pin GTM. Prefer CSP reports + removing unused plugins per site.
- [ ] Broad prerender migration — most public mirrors intentionally use `prerender = false` so cleaned HTML updates without rebuild. Moving to prerender requires a build-on-content-change workflow; tracked separately, not flipped in this batch.

### Kinza local Bearer smoke (2026-08-07)

| Check | Result |
|-------|--------|
| No auth → `/enhanced/kinzahr.php` | **401** Unauthorized |
| `?key=` with secret | **401** (query auth rejected) |
| Wrong Bearer | **401** |
| Valid Bearer | Node job runs (Pipedrive fetch + Google Ads upload). No PHP source leak. |
| Unknown job | **404** |
| Internal `/api/internal/gtm/?secret=` | **403** |
| Internal Bearer | **200** |

Note: Google Ads may return `partialFailureError` / `CONVERSION_PRECEDES_EVENT` for some historical leads (data timing). That is Ads data, not auth/routing failure. PHP reference files live under `src/lib/enhanced/legacy-php/` only (not URL-reachable).

`connectresourcesint.com` remains a **port stub locally** (no full Astro app tree yet) — security app patches apply when the site is scaffolded; Caddy/site-ctl still ops.

---

## Enhanced conversions (Node)

Docs: `Astro-production/kinzahr.com/src/lib/enhanced/README.md`  
Code: `Astro-production/kinzahr.com/src/lib/enhanced/` + `src/pages/enhanced/[...path].ts`

Cron must send a header (no query key):

```bash
curl -fsS -H "Authorization: Bearer $ENHANCED_RUN_SECRET" \
  "https://kinzahr.com/enhanced/kinzahr.php"
```

Same basename URLs as the old PHP scripts (`kinzahr.php`, `cfm.php`, …).

---

## Machine auth (FLOW / CMS / cron)

Prefer:

```http
Authorization: Bearer <INTERNAL_JOB_SECRET>
```

Also: `x-internal-job-secret: <secret>`

Do **not** use `?secret=` — rejected by design (audit P0-2). FLOW is not live yet; when it lands, configure Bearer only.

One secret **per site**. Documented in each site `.env.example`.

---

## P0-1 CA keys — what “git history rewrite” means

### What happened

Private TLS keys (Caddy local CA `root.key` / `intermediate.key` and origin `*.key` files) were committed under `caddy/upgrade-rollback-20260803/…`. Anyone with repo access (or a leaked clone) could have copied them.

We **deleted the files from the current tree**. That stops *new* checkouts from getting the keys **only if** they never existed in older commits. They still exist in **past commits** on `main` / `work/astro-sites` / forks / CI caches / developer laptops.

### What “rotate” means

1. On the Astro host, generate a **new** Caddy local CA (or move to Cloudflare Full strict / tunnel with proper origin certs).
2. Issue **new** origin certificates; reload Caddy.
3. Treat the old CA and old origin keys as **compromised** — do not reuse them.

Deleting files in a normal commit does **not** rotate anything on the server by itself.

### What “purge from git history” means

A normal `git rm` + commit leaves the blobs in history forever (`git log --all --full-history -- '*.key'` can still find them).

**History rewrite** tools (`git filter-repo`, BFG Repo-Cleaner) walk every commit and remove those paths/blobs, then you must **force-push** rewritten branches and ask every clone to re-clone or hard-reset. That is disruptive and needs an explicit owner window.

### Recommended ownership

| Step | Who |
|------|-----|
| Confirm no production still uses the leaked local CA for anything security-sensitive | Aaron / ops |
| Rotate CA + origin certs on `178.105.150.67` | Aaron / root |
| Schedule history purge + coordinated force-push (or archive repo + fresh import) | Aaron + repo admins |
| Developers re-clone after purge | Everyone |

**Local ask from engineering:** leave history rewrite to Aaron unless you explicitly schedule a rewrite window. Preparing a `filter-repo` command list is fine; running it without coordination is not.

Example (do **not** run until approved):

```bash
# Illustrative only — coordinate force-push + reclone first
git filter-repo --path caddy/upgrade-rollback-20260803/var-lib-caddy/.local/share/caddy/pki/authorities/local/root.key --invert-paths
# …repeat for each leaked key path, or use --path-glob '*.key' under that tree carefully
```

---

## Verification checklist (from audit §11) — local vs live

| Check | Local | Live |
|-------|-------|------|
| `?secret=` / `?key=` fail | Code ready | After deploy |
| No route executes PHP | Code ready | After deploy |
| SVG / executable uploads rejected | Code ready | After deploy |
| Search / CMS / email XSS controls | Code ready | After deploy + smoke |
| Header baseline + `/_astro` immutable | In `Caddyfile.production` | After Caddy reload |
| Origin not publicly reachable bypassing CF | — | Firewall / tunnel |
| Old CA cannot mint trusted origins | — | Rotate + history purge |
| Dependency audit clean | Nodemailer bumped | CI + remaining advisories |

---

## Related docs

- [CONNECT-FLOW-SITE-ONBOARDING.md](./CONNECT-FLOW-SITE-ONBOARDING.md) — Bearer auth for FLOW
- [CONNECT-CADDY-DEPLOYMENT.md](./CONNECT-CADDY-DEPLOYMENT.md) — Caddy patterns
- [OPS-OWNER-CADDY-CUTOVER.md](./OPS-OWNER-CADDY-CUTOVER.md) — live Caddy / root
- Kinza enhanced: `Astro-production/kinzahr.com/src/lib/enhanced/README.md`
