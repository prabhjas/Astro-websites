# Security work — full handoff for Aaron (updated 2026-08-10)

**Audience:** Aaron / root / Cloudflare admin  
**Branch:** `work/astro-sites` (contains Connect Group `main` #21 + personal/main)  
**Live app release on host:** immutable `92d5bb1a2` (= Connect Group `main` security remediation merge #21)  
**Ops pack (owner-run):** [`ops/security-remediation-20260809/`](../ops/security-remediation-20260809/README.md)  
**Short ops checklist:** [SECURITY-OPS-AARON-HANDOFF.md](./SECURITY-OPS-AARON-HANDOFF.md)  
**Engineering tracker:** [SECURITY-AUDIT-REMEDIATION-2026-08-06.md](./SECURITY-AUDIT-REMEDIATION-2026-08-06.md)  
**c-uae GSC spam audit:** [SEO-CUAE-COVERAGE-SPAM-AUDIT-2026-08-10.md](./SEO-CUAE-COVERAGE-SPAM-AUDIT-2026-08-10.md)

This is the **one full document** for what engineering shipped, what you must run on the host, and what you **must not** turn on yet because it breaks Elementor / GTM / WP mirrors on the live fleet.

---

## 0. Status snapshot (2026-08-10)

| Layer | Status |
|-------|--------|
| **28 live units** | Active on host; all serve from immutable security release `92d5bb1a2` |
| **App security C-02 / H-01 / M-03 / M-04** | Wired on all **28** (`@connect/site-cms` rate-limit, streaming body limits, lead public-id, hardened GTM save). Local audit: **28/28 pass**. Live Node already runs this SHA. |
| **Host ops 01–09** | Owner/root only (perms, secret rotation, UFW, restic, access). Script **10** verifies builds — never deploys. |
| **Local `fleet-local` smoke** | **Contact/form smoke skipped** for `tier: live` sites (avoids Pipedrive spam). Opt in after form changes: `FLEET_SMOKE_CONTACT=1`. |
| **Next batch (not live)** | Movey (placeholder), Emiratisationhub, Connectzone, Raadrecruitment, Companyformationsaudi, Alburaq, MBS — see §1b |

---

## 1. Scope — 28 live Astro sites (Aaron inventory)

Source of truth: `ops/security-remediation-20260809/10-rollout-app-security-fixes.sh` `FLEET_MANIFEST`.

| Domain | site-ctl unit | PORT | GTM writer |
|--------|---------------|------|------------|
| c-uae.com | cuae | 5092 | yes |
| cbss.ae | cbss | 5081 | no |
| connectfm.ae | connectfm | 5087 | yes |
| connectfreelance.ae | connectfreelance | 5094 | yes |
| connectfz.com | connectfz | 5096 | yes |
| connectgroup.co | connectgroup | 5085 | yes |
| connecthr.ae | connecthr | 5084 | yes |
| connectresources.ae | connectresources | 5086 | yes |
| connectresources.sa | connectresources-sa | 5088 | yes |
| connectstaff.ae | connectstaff | 5091 | yes |
| emiratiguard.com | emiratiguard | 5103 | yes |
| emiratisationgate.org | emiratisationgate | 5105 | yes |
| emiratisationgateway.com | emiratisationgateway | 5106 | yes |
| eormiddleast.com | eormiddleast | 5090 | yes |
| evolutionmiddleast.com | evolutionmiddleast | 5080 | yes |
| freelancerdxb.com | freelancerdxb | 5109 | yes |
| iberiaeor.com | iberiaeor | 5089 | yes |
| iberiaworkforce.com | iberiaworkforce | 5083 | no |
| kinzahr.com | kinzahr | 5093 | yes |
| kpmpro.ae | kpmpro | 5124 | yes |
| ngmanpower.com | ngmanpower | 5102 | yes |
| payrollmiddleast.org | payrollmiddleast | 5110 | yes |
| peomiddleast.com | peomiddleeast | 5118 | yes |
| pittant.com | pittant | 5111 | yes |
| redo.ae | redo | 5095 | yes |
| royalvisa.ae | royalvisa | 5097 | yes |
| spheavyrental.ae | spheavyrental | 5082 | yes |
| thefreelancergate.com | thefreelancergate | 5100 | yes |

`connectresourcesint.com` — **explicit exclusion** (active unit, no `@connect/site-cms` / contact route).

### 1b. Next batch (local prep — not in live 28 cutover)

| Domain | unit / id | PORT | Notes |
|--------|-----------|------|-------|
| movey.ae | movey | 5104 | Placeholder only (`.gitkeep`) — needs Phase 01–02 clone |
| emiratisationhub.com | emiratisationhub | 5107 | Scaffolded; body-limit + local assets in progress |
| connectzone.ae | connectzone | 5101 | Scaffolded; `cms.ts` siteId must be `connectzone` |
| raadrecruitment.ae | raadrecruitment | 5113 | Scaffolded; purge peer hotlinks |
| companyformationsaudi.com | companyformationsaudi | 5114 | Scaffolded; localize abs URLs |
| alburaq.ae | alburaq | 5120 | Scaffolded; localize abs URLs |
| mbs-consultancy.com | mbs-consultancy | 5099 | Scaffolded; strongest local-asset shape |

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
