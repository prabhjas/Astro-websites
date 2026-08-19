# Aaron rules — security, deploy, structure (follow this)

**Updated:** 2026-08-18  
**Index only.** Detail lives in the linked docs. Do not reopen closed FQ items unless a new site is copied from a peer.

Aaron’s source-review quote (FQ-04):

> The source review uncovered that the branch had been mechanically copied from older peer sites: blank canonical origins, stale peer domains, unsafe deployment guidance, and three dormant code-execution hooks.

**Live publish:** Host workflow is `/opt/Astro-development` · branch `astro-fleet-development` · SSH-signed commits · `sudo /usr/local/sbin/astro-fleet-release publish` for eligible site-only changes. See [DEVELOPER-HANDOFF.md](DEVELOPER-HANDOFF.md). Laptop working branch is `work/astro-sites` — do not treat it as the live pin.

---

## 18 Aug — Aaron comments (follow these)

| Aaron said | Our follow |
|------------|------------|
| Image corruption on Connect Zone / Connect FZ (placeholder logos, smeared duplicate uploads, SP Heavy menu wearing another brand’s logo) | Restore **real** in-use images; never delete logos/page/post assets that are referenced. Do not advance the live pin until chrome + referenced images are real files, not 643-byte placeholders or one blob copied across hundreds of paths. |
| Branch must **not** revert `caddy/Caddyfile.production` or `README.md` | **Keep Aaron’s live-mirror Caddyfile** (admin unix socket, Cloudflare `trusted_proxies`, site blocks). Reject any merge that deletes those ~3,100 lines. |
| Old per-site `/internal/operations` dashboard | **Gone on purpose.** Middleware 404s it. FLOW is the UI. |
| FLOW / CRM should consume site APIs | Per-domain `https://<domain>/api/internal/*` with `Authorization: Bearer <INTERNAL_JOB_SECRET>`. Full catalog: [CMS-DASHBOARD-AND-FLOW-APIS.md](CMS-DASHBOARD-AND-FLOW-APIS.md). Old HTML UI to inspect: commit `fba983f69`. Shared handlers landed in `413424705`. |
| Do not copy peer chrome | After any peer rsync, grep `Forklift Rental` / `spheavyrental` / foreign `headerHtml` in `src/data/{site.json,global-css.json,header.html,footer.html}`. |

**Clone / publish extra rules (18 Aug):**

- If the same SHA appears on 5+ upload paths, treat it as smear/corruption until proven otherwise.
- Header/footer HTML used by `ElementorHeader` / `ElementorFooter` must match **this** domain, not a leftover from `global-css.json`.
- `caddy/Caddyfile.production` and root `README.md` are owner-shaped files — never “simplify” them in a site PR.

**Still open on laptop `work/astro-sites` (do not call this image-clean):** Connect FZ uploads still contain smear groups (one 1.1 MB blob on hundreds of paths). Zone logos and live Zone/FZ header/footer are this brand. FLOW `/api/internal` note is [CMS-DASHBOARD-AND-FLOW-APIS.md](CMS-DASHBOARD-AND-FLOW-APIS.md). Do not advance the live pin until FZ referenced images are real files.

---

## Deploy (how live sites actually ship)

| Rule | Follow? | Doc |
|------|---------|-----|
| Work in **`/opt/Astro-development`** · branch **`astro-fleet-development`** | **Yes** | [DEVELOPER-HANDOFF](DEVELOPER-HANDOFF.md) |
| Ship with **`sudo /usr/local/sbin/astro-fleet-release publish`** | **Yes** — only sudo | same |
| Live Node reads the **immutable release**, not `/opt` rsync | **Yes** — `90-immutable-security-release.conf` | [AARON-CUTOVER-NOTE](AARON-CUTOVER-NOTE-2026-08-10.md) |
| Ship via **new release** (rebuild), never patch attested `dist/` | **Yes** | [AARON-RELEASE-SIGNATURES-SCHEDULER](AARON-RELEASE-SIGNATURES-SCHEDULER-2026-08-11.md) |
| **Do not run** `signatures/APPLY.sh` or `APPLY-NEXT6.sh` | **Yes** (FQ-00 veto) | [CLAUDE-FLEET-QUEUE-PROMPT § FQ-00](CLAUDE-FLEET-QUEUE-PROMPT.md#fq-00--do-not-run-staged-signature--next-6-apply-scripts) |
| Canary on **`127.0.0.1:5999`**, one site, real `.env.prod`, then `switch` | Owner / publisher | [AARON-CANARY-RELEASE](AARON-CANARY-RELEASE.md) |
| Caddy named CA **`astro_origin_2026`**, never the retired default local CA | **Yes** | [OPS-OWNER-CADDY-CUTOVER](OPS-OWNER-CADDY-CUTOVER.md) |
| No SMTP / form email for new sites | **Yes** | Cursor rule `no-form-smtp` |
| Developer does **not** `git push` / restart / edit Caddy / touch secrets | **Yes** | [DEVELOPER-HANDOFF](DEVELOPER-HANDOFF.md) |

---

## Security / fleet queue

| ID | Aaron said | Our follow |
|----|------------|------------|
| **FQ-00** | Staged APPLY scripts unsafe | **Followed** — never run; notes bannered |
| **FQ-01** | `nanoid` 3.3.16 → 3.3.18 | **In git + in live `7155cbbb2`** |
| **FQ-02** | Stop browser `ipinfo.io`; use `Cf-Ipcountry`; AE fallback | **In git + live release.** Legacy WP HTML may still mention ipinfo; runtime bridge wins |
| **FQ-03** | Per-site cgroups, not one RAM pool; raise CR | **Note written.** Owner applies MemoryMax | [AARON-MEMORY-NOTE](AARON-MEMORY-NOTE.md) |
| **FQ-04** | Mechanical copy (four findings below) | Classified. Do not redo fleet-wide. New sites: peer-grep after rsync |

---

## FQ-04 — the four source-review findings

| Finding | Documented | Followed |
|---------|------------|----------|
| **A. Blank canonical origins** | Yes | **Yes** — keep-site `.env.example` `PUBLIC_SITE_URL=https://<this-domain>`; `astro.config` `site` set. Re-check after any peer rsync |
| **B. Stale peer domains** | Yes | **Runtime SEO fixed** (mbs no longer seeds `connectgroup.co`). Test fixtures / one-shot `scripts/` may still name peers — allowed. Operator `13-go-live-server-handoff.md` on some next-6 trees can still say “SP Heavy” — ignore; use [OPS-OWNER-CADDY-CUTOVER](OPS-OWNER-CADDY-CUTOVER.md) |
| **C. Unsafe deployment guidance** | Yes | **Followed for live.** Real path = new immutable release + `astro-fleet-release publish`. Copied legacy root/in-tree instructions are not authoritative and must not be run. |
| **D. Three “hooks”** | Yes | **Required chrome — do not strip.** (1) ScrollSequence `eval` and (2) Elementor script rehydrate in `astro-mirror-fixes.js` **must stay** or menus/sliders/ScrollSequence break. (3) `regen.ts` `execFile` is FLOW redirect regen only — not public chrome; no unauthenticated trigger. Vendor `underscore.min.js` is not “our” hook |

**Clone rule:** after copying a peer, grep the new domain vs the peer in `src/`, `deploy/`, `docs/`, `.env.example`.

---

## Website structure (what we copy vs what we must change)

| Piece | Rule |
|-------|------|
| Shared CMS | `@connect/site-cms` exact pin; no `^` |
| One site = one folder + one loopback port + one `site-*` unit | [FLEET-PORT-REGISTRY](FLEET-PORT-REGISTRY.md) |
| Forms | File store + Pipedrive. No SMTP |
| Geo | Header-only + AE fallback. No client ipinfo |
| Caddy | `astro_origin_2026` + paired apex/www loaders |
| Go-live checks | [10-GO-LIVE-VERIFY-CHECKLIST](10-GO-LIVE-VERIFY-CHECKLIST.md) on loopback, then public |
| Pre-switch | Aaron canary `:5999` ([AARON-CANARY-RELEASE](AARON-CANARY-RELEASE.md)) |

---

## Still Aaron / root only (do not touch)

- Production secrets / `.env` values  
- Caddy / systemd / release tooling  
- Pipedrive / contact **backend** behavior (presentation publisher will block protected paths)  
- Brand-new site onboarding (Caddy, users, units, registry allowlist)  
- Dependency / shared package / CI / control-plane changes  
- Cloudflare changes  
- Temporary EOR routing: `eormiddleast.com` may hit the trusted backend directly — coordinate with Aaron before EOR frontend/performance work  

---

## Performance / asset debt (do not repeat)

Aaron FYI (14 Aug, not Chrome-remeasured yet). Targets: LCP ≤2.5s, INP ≤200ms, CLS ≤0.1 (75th pct).

| Signal | Note |
|--------|------|
| Connect HR mobile LCP ~17.7s · desktop CLS ~0.48 | Failed CWV when tested |
| Connect Resources mobile LCP ~6.7s | Failed CWV when tested |
| CR client asset corpus ~1.2 GiB · CHR ~197 MiB | Not every visitor downloads all of it — still asset debt |
| CR | Duplicated assets; some PNGs ~8 MiB |
| CHR | Legacy lazy-load placeholders; repeated header / app-store images |
| Good | Static CSS compressed + Cloudflare-cached |
| Expected | HTML stays `CF-Cache-Status: DYNAMIC` |

**Clone / publish rules:** do not ship multi‑MB PNGs when WebP/AVIF exists; do not duplicate the same hero/header asset under many paths; strip WP lazy placeholders and repeated header chrome; keep `public/` lean — corpus size is a release smell even if CF caches static CSS.
