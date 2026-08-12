# Aaron rules — security, deploy, structure (follow this)

**Updated:** 2026-08-11  
**Index only.** Detail lives in the linked docs. Do not reopen closed FQ items unless a new site is copied from a peer.

Aaron’s source-review quote (FQ-04):

> The source review uncovered that the branch had been mechanically copied from older peer sites: blank canonical origins, stale peer domains, unsafe deployment guidance, and three dormant code-execution hooks.

---

## Deploy (how live 28 actually ship)

| Rule | Follow? | Doc |
|------|---------|-----|
| Live Node reads the **immutable release**, not `/opt` rsync | **Yes** — `90-immutable-security-release.conf` | [AARON-CUTOVER-NOTE](AARON-CUTOVER-NOTE-2026-08-10.md) |
| Ship via **new release** (rebuild), never patch attested `dist/` | **Yes** — we stage; Aaron bakes (`7155cbbb2` 11 Aug) | [AARON-RELEASE-SIGNATURES-SCHEDULER](AARON-RELEASE-SIGNATURES-SCHEDULER-2026-08-11.md) |
| **Do not run** `signatures/APPLY.sh` or `APPLY-NEXT6.sh` | **Yes** (FQ-00 veto) | [CLAUDE-FLEET-QUEUE-PROMPT § FQ-00](CLAUDE-FLEET-QUEUE-PROMPT.md#fq-00--do-not-run-staged-signature--next-6-apply-scripts) |
| Canary on **`127.0.0.1:5999`**, one site, real `.env.prod`, then `switch` | **Documented.** We cannot start it (no `site-*` / `.env.prod`). Aaron runs it until `release-ctl canary` exists | [AARON-CANARY-RELEASE](AARON-CANARY-RELEASE.md) |
| Caddy named CA **`astro_origin_2026`**, never the retired default local CA | **Yes** in `caddy/Caddyfile.production` + next-6 snippets | [OPS-OWNER-CADDY-CUTOVER](OPS-OWNER-CADDY-CUTOVER.md) |
| No SMTP / form email for new sites | **Yes** | Cursor rule `no-form-smtp` |
| webdev sudo = `site-ctl restart\|status\|logs` only | **Yes** | host fact |

Asked, not granted: `release-ctl bake/switch/canary` + CF `purge-cf`.

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
| **C. Unsafe deployment guidance** | Yes | **Followed for live.** Real path = new immutable release + owner Caddy. Copied legacy root/in-tree instructions are not authoritative and must not be run. |
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

## Still Aaron (we cannot finish)

- `release-ctl` bake / canary / switch  
- CF purge token  
- CR `MemoryMax` bump  
- New site: Caddy, `useradd`, systemd, `site-ctl` allowlist  
- Rewrite host `APPLY-*.sh`  
