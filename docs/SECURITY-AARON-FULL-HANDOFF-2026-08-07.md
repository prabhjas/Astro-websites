# Security work — full handoff for Aaron (2026-08-07)

**Audience:** Aaron / root / Cloudflare admin  
**Branch:** `work/astro-sites` (latest: sanitizer fix `eaf55538`+)  
**Audit source:** `Astro_Security_Audit_Report_2026-08-06.pdf`  
**Short ops checklist (copy-paste):** [SECURITY-OPS-AARON-HANDOFF.md](./SECURITY-OPS-AARON-HANDOFF.md)  
**Engineering tracker:** [SECURITY-AUDIT-REMEDIATION-2026-08-06.md](./SECURITY-AUDIT-REMEDIATION-2026-08-06.md)

This is the **one full document** for what engineering shipped, what you must run on the host, and what you **must not** turn on yet because it breaks Elementor / GTM / WP mirrors on the live fleet.

---

## 1. Scope — 15 live Astro sites

| Domain | site-ctl unit | Typical PORT |
|--------|---------------|--------------|
| evolutionmiddleast.com | evolutionmiddleast | 5080 |
| cbss.ae | cbss | 5081 |
| spheavyrental.ae | spheavyrental | 5082 |
| iberiaworkforce.com | iberiaworkforce | 5083 |
| connecthr.ae | connecthr | 5084 |
| connectgroup.co | connectgroup | 5085 |
| connectfm.ae | connectfm | 5087 |
| connectresources.sa | connectresources-sa | 5088 |
| iberiaeor.com | iberiaeor | 5089 |
| eormiddleast.com | eormiddleast | 5090 |
| connectstaff.ae | connectstaff | 5091 |
| c-uae.com | cuae | 5092 |
| kinzahr.com | kinzahr | 5093 |
| connectfz.com | connectfz | 5096 |
| royalvisa.ae | royalvisa | 5097 |

`connectresourcesint.com` — **ignore** for site-ctl / app security this round.

---

## 2. What engineering already did (safe — ships with app deploy)

These are the **security standards that do not break Elementor/GTM** when deployed correctly:

| Area | What we did | Why it is safe |
|------|-------------|----------------|
| **Machine auth** | Reject `?secret=` / Kinza `?key=`; require `Authorization: Bearer` or `x-internal-job-secret` / `x-enhanced-key` | Cron/FLOW must send headers; pages/UI unchanged |
| **PHP CMS paths** | Upload/save PHP routes → HTTP **410** | No front-end widgets depend on them |
| **Uploads** | Reject SVG / HTML / JS / PHP in CMS uploads | Admin/FLOW only |
| **CMS / blog HTML** | Strict `sanitizeCmsHtml` on **post bodies** (FLOW/CMS content) | Not full page mirrors |
| **Contact forms** | Size-limited body read + email HTML escaped | Forms still work |
| **Kinza enhanced Ads** | Node jobs at same `/enhanced/*.php` URLs; no PHP spawn | Keep Bearer header for cron |
| **Caddyfile (git)** | `/_astro/*` immutable only; `Permissions-Policy`; **CSP Report-Only** | Report-Only does not block scripts |
| **Deps / CI** | Nodemailer / Playwright bumps; `.github/workflows/security-audit.yml` | Build-time only |
| **Leaked keys in tree** | Deleted `.key` files from **current** HEAD; note left under Caddy rollback folder | History still needs purge (you) |

### Mirror HTML — important lesson (do not re-tighten)

We briefly stripped **inline `<script>`** and **`on*`** handlers from mirrored WP/Elementor pages. That **broke**:

- Kinza hover **mega-menu**
- Connect Group homepage **ScrollSequence**
- Slider **prev/next** (and similar Elementor widgets) on multiple sites

**Current rule:** `sanitizeMirrorHtml` only removes `<base>`, meta refresh, and `javascript:` URLs. It must **not** strip inline scripts, event handlers, or styles.

**Safe vs unsafe HTML handling:**

| Content source | Function | Aggressive strip OK? |
|----------------|----------|----------------------|
| FLOW/CMS post body | `sanitizeCmsHtml` | **Yes** |
| Full page WP/Elementor mirror | `sanitizeMirrorHtml` (hygiene only) | **No** |
| GTM snippet store | `sanitizeGtmHtml` | Light only (keep `<script>`) |

---

## 3. What Aaron / root must do (cannot be finished as webdev)

Staged on host under `/opt/Astro-production/_incoming/` (mode `600` for secrets):

| Step | Action | Files / commands |
|------|--------|------------------|
| **A. Deploy app** | Pull `work/astro-sites`, rebuild 15 domains, `site-ctl restart` each unit | See short handoff §0 |
| **B. Caddy reload** | Install staged Caddyfile → `/etc/caddy/Caddyfile`, validate, reload | `install-caddyfile-security-20260807.sh` |
| **C. Unique secrets** | Per-site `INTERNAL_JOB_SECRET` (+ Kinza `ENHANCED_RUN_SECRET`) in `.env.prod`, restart units, then **shred** secrets file | `apply-unique-secrets-as-root.sh` + `unique-secrets.env` |
| **D. CF-only origin** | Firewall / Tunnel so public cannot hit `178.105.150.67` bypassing Cloudflare; SSL Full (strict) when ready | CF + host firewall |
| **E. CA rotate** | New Caddy local CA / origin certs (old keys treated compromised) | Root on Astro |
| **F. History purge** | `git filter-repo` remove leaked `.key` blobs; coordinated force-push; everyone re-clones | `purge-leaked-caddy-keys-from-history.sh` (scheduled window) |

Suggested order: **A → B → C → D**, then schedule **E + F**.

Copy-paste runbook: [SECURITY-OPS-AARON-HANDOFF.md](./SECURITY-OPS-AARON-HANDOFF.md).

---

## 4. What we are **not** doing (would break sites today)

Do **not** enable these until there is a dedicated cutover + QA per site:

| Item | Why it breaks the fleet | When it might be OK |
|------|-------------------------|---------------------|
| **CSP enforce** (`Content-Security-Policy` instead of Report-Only) | Blocks GTM, Elementor inline scripts, many third-party widgets → blank menus/sliders/analytics | After CSP Report-Only reports are clean for weeks, then per-site allowlists |
| **Broad prerender** (`prerender = true` fleet-wide) | Mirrors are SSR so cleaned HTML / chrome updates without rebuild; flipping all pages needs a build-on-content-change pipeline | Separate migration project |
| **Full WP JS + SRI everywhere** | Hundreds of legacy assets; **GTM cannot use SRI**; mismatches break widgets | Long cleanup; prefer unused-plugin removal + CSP reports |
| **Aggressive mirror sanitizer** (strip inline scripts / `on*`) | Breaks mega-menu, ScrollSequence, Swiper arrows, Elementor frontend config | **Never** on full-page mirrors; use only on CMS HTML |
| **Enforced CSP + stripped mirrors together** | Guaranteed outage of WP-mirrored UX | — |

**Answer for stakeholders:** Yes — CSP enforce, broad prerender, and full WP SRI were left alone **on purpose** because they will break GTM + Elementor on these 15 sites right now. CSP stays **Report-Only** after you reload Caddy.

---

## 5. Verify after you deploy (quick)

```bash
# Homepages
for d in cbss.ae connectgroup.co kinzahr.com connecthr.ae; do
  curl -sS -o /dev/null -w "$d %{http_code}\n" "https://$d/"
done

# Auth must reject query secrets
curl -sS -o /dev/null -w "kinza key %{http_code}\n" "https://kinzahr.com/enhanced/kinzahr.php?key=test"
curl -sS -o /dev/null -w "cg secret %{http_code}\n" "https://connectgroup.co/api/internal/gtm/?secret=test"

# After Caddy reload — Report-Only present (not enforcing)
curl -sSI https://connectgroup.co/ | grep -i content-security-policy

# Manual UI smoke (do not skip)
# - kinzahr.com: hover mega-menu
# - connectgroup.co: homepage ScrollSequence
# - any Elementor slider: prev/next arrows
```

---

## 6. Related paths

| Path | Purpose |
|------|---------|
| `caddy/Caddyfile.production` | Git source of truth for headers / CSP-RO |
| `/opt/Astro-production/_incoming/Caddyfile.production.20260807-security` | Staged for reload |
| `scripts/ops/install-caddyfile-security-20260807.sh` | Root Caddy install |
| `scripts/ops/purge-leaked-caddy-keys-from-history.sh` | History rewrite (window only) |
| `packages/site-cms/src/security/sanitize-html.ts` | `sanitizeCmsHtml` vs `sanitizeMirrorHtml` |
| `Astro-production/kinzahr.com/src/lib/enhanced/` | Node enhanced conversions |

---

## 7. One-line summary for Aaron

**Deploy the app security batch + reload Caddy (Report-Only) + rotate per-site secrets + harden origin/CF; rotate CA and purge git history on a scheduled window. Do not enforce CSP, mass-prerender, full SRI, or aggressive mirror script stripping — those break Elementor/GTM.**
