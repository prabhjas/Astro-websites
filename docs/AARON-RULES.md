# Aaron rules — security, deploy, structure (follow this)

**Updated:** 2026-08-13  
**Index only.** Detail lives in the linked docs.

**Primary deploy path (live now — all 42 sites):** [DEVELOPER-HANDOFF.md](DEVELOPER-HANDOFF.md) · [ASTRO-FLEET-AUTONOMOUS-RELEASE.md](ASTRO-FLEET-AUTONOMOUS-RELEASE.md)

Aaron (13 Aug): all 42 websites, including Connect Freelance and Connect Resources International, use the same normal presentation publish process.

---

## Deploy (autonomous lane — current)

| Rule | Follow? | Doc |
|------|---------|-----|
| Work in **`/opt/Astro-development`** · branch **`astro-fleet-development`** | **Yes** | [DEVELOPER-HANDOFF](DEVELOPER-HANDOFF.md) |
| Edit only `…/Astro-production/<domain>/` under the **dev** checkout — never live `/opt/Astro-production` | **Yes** | same |
| `pnpm --filter <pkg> run check` + `build`, then SSH-signed commit | **Yes** | same |
| Ship with **`sudo /usr/local/sbin/astro-fleet-release publish`** only | **Yes** — only sudo | [ASTRO-FLEET-AUTONOMOUS-RELEASE](ASTRO-FLEET-AUTONOMOUS-RELEASE.md) |
| Publisher pushes; developer does **not** `git push` / restart / Caddy | **Yes** | same |
| Max **8** sites per publish | **Yes** | same |
| **All 42 sites** on the generic publisher (CF + CRI included) | **Yes** — `b932c7128` | same |
| Autonomous lane blocks deps / `packages/` / workflows / Caddy / ops | **Yes** — owner maintenance | same |
| No SMTP / form email for new sites | **Yes** | Cursor rule `no-form-smtp` |
| Cloudflare untouched by this rollout | **Yes** | Aaron |

Retired (do not run): `signatures/APPLY.sh`, `APPLY-NEXT6.sh`, `scripts/ops/ROOT-DEPLOY-14.sh`, laptop-rsync cutovers.

---

## Security / fleet queue (historical — still valid content rules)

| ID | Aaron said | Our follow |
|----|------------|------------|
| **FQ-00** | Staged APPLY scripts unsafe | **Followed** — never run |
| **FQ-01** | `nanoid` 3.3.16 → 3.3.18 | **In git** |
| **FQ-02** | Stop browser `ipinfo.io`; use `Cf-Ipcountry`; AE fallback | **In git** |
| **FQ-03** | Per-site cgroups; raise CR memory | Owner / release lane |
| **FQ-04** | Mechanical copy findings | Classified; peer-grep after copy |

---

## FQ-04 — the four source-review findings

| Finding | Followed |
|---------|----------|
| **A. Blank canonical origins** | Keep-site `.env.example` `PUBLIC_SITE_URL=https://<this-domain>`; `astro.config` `site` set |
| **B. Stale peer domains** | Runtime SEO fixed; fixtures may still name peers |
| **C. Unsafe deployment guidance** | Ignore site `ROOT_SETUP.md` that say `tls internal` / in-tree build — use **astro-fleet-release publish** |
| **D. Three “hooks”** | Keep ScrollSequence/`eval` + Elementor rehydrate; `regen.ts` is FLOW-only |

**Clone rule:** after copying a peer, grep the new domain vs the peer in `src/`, `deploy/`, `docs/`, `.env.example`.

---

## Website structure

| Piece | Rule |
|-------|------|
| Shared CMS | `@connect/site-cms` exact pin; no `^` |
| One site = one folder + one loopback port | [FLEET-PORT-REGISTRY](FLEET-PORT-REGISTRY.md) |
| Forms | File store + Pipedrive. No SMTP |
| Geo | Header-only + AE fallback. No client ipinfo |
| Caddy | Owner/security only (not autonomous lane) |
| Go-live checks | [10-GO-LIVE-VERIFY-CHECKLIST](10-GO-LIVE-VERIFY-CHECKLIST.md) |

---

## Still Aaron / security-maintenance (not autonomous)

- Brand-new site onboarding (Caddy, users, units, registry allowlist)
- Dependency / shared package / CI / Caddy / control-plane changes
- Cloudflare changes
