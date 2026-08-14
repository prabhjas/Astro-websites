# Aaron rules — security, deploy, structure (follow this)

**Updated:** 2026-08-14  
**Index only.** Detail lives in the linked docs. Do not reopen closed FQ items unless a new site is copied from a peer.

Aaron’s source-review quote (FQ-04):

> The source review uncovered that the branch had been mechanically copied from older peer sites: blank canonical origins, stale peer domains, unsafe deployment guidance, and three dormant code-execution hooks.

**Live publish (14 Aug):** PDF-requested protected source is live. Accepted HEAD is `c34649d75` on `origin/astro-fleet-development`. Host workflow: `/opt/Astro-development` · branch `astro-fleet-development` · SSH-signed commits · `sudo /usr/local/sbin/astro-fleet-release publish` for eligible site-only changes. See [DEVELOPER-HANDOFF.md](DEVELOPER-HANDOFF.md).

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
