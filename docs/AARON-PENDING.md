# Aaron pending — fleet owner / security-maintenance lane

**Updated:** 2026-08-25 (CR/CHR/CG/KPM published `882a45e5d`)  
**Owner lane:** Aaron (not developer generic `astro-fleet-release publish`)  
**Developer working tip:** `work/astro-sites` · Live publish branch: `astro-fleet-development`  
**Related:** [OG-AUTOMATION-PILOT.md](OG-AUTOMATION-PILOT.md)

Track items that block or sit outside the ordinary 1–8 site presentation publish. Clear a row when done (date + tip / note).

---

## Open

| ID | Priority | Item | Why it needs Aaron | Status / notes |
|---|---|---|---|---|
| AP-01 | High | Classify / allow `scripts/fleet-monitor/` (esp. `lib.mjs`) for signed commits | Host Host-probe fix (`probeWithExplicitHost`) cannot ship via generic publish until path is classified; dirty host copy blocked publishes before | Code on laptop `work/astro-sites`; may still be absent from fleet tip |
| AP-02 | High | Connect Resources managed robots override | Live `/robots.txt` still served from `.data` store (short managed body) so dynamic `robots.txt.ts` does not win | Frontend robots route exists; store ownership needs Aaron/backend policy |
| AP-04 | High | `packages/site-cms` — mirror SEO normalize | Redo commit adds `normalize-mirror-content-seo.ts` + wires it through `absolutizeMirrorSeoHtml` (`contentKind`). **Redo.ae cannot publish in presentation lane until this package change is allowed / released** | On `work/astro-sites` @ `f865df993` (and tip). Do **not** include in site-only signed publish until Aaron clears package lane |
| AP-07 | High | Iberia Workforce — site-local **`sharp`** / drop passthrough | Iberia uses `passthroughImageService()` so publish works **without** lockfile `sharp`. Real Astro image optimization needs site (or catalog) `sharp` + Linux lockfile | `astro.config.mjs` comment documents this; pair with AP-08 |
| AP-08 | High | Fleet **`sharp`** catalog + OG automation | Team standardizing branded OG (kit in `~/Downloads/og pictures`). Needs `sharp` in `pnpm-workspace.yaml` catalogs + site deps + one lockfile install. Royal Visa is the pilot (scripts + committed PNGs can ship site-only; build-time regen needs Aaron) | See [OG-AUTOMATION-PILOT.md](OG-AUTOMATION-PILOT.md). Do **not** `pnpm install` / lockfile bump in developer publish lane |
| AP-09 | High | Allowlist presentation edits to `src/pages/[...slug].astro` (and similar catch-alls) + blog **API** paths | Publisher blocked Connect FM CSS wiring + Iberia `/eor-services/` chrome hide as “unsafe path”. Workarounds used: CFM `pageCss`; Iberia chrome hide via **BaseLayout**; Iberia post titles via **content.ts**. Still blocked: `iberiaeor` / **`kpmpro`** `api/blog/*`; SP Heavy page breadcrumbs need catch-all (skipped) | Connect Freelance blog API still AP-12 |
| AP-12 | High | Connect Freelance blog listing/load-more trailing-slash API routes | Commit `f703c7c53`: renames `api/blog/listing.ts` → `listing/index.ts` (and load-more) + middleware skips `/api/` slash redirects so Load More works with `trailingSlash: always`. Same class of path that blocked KPM Pro API | **Still parked.** Presentation pieces shipped in fleet `427e68f3b` **without** API dirs or CF middleware |
| AP-13 | Med | SP Heavy `astro.config.mjs` vite trailing-slash plugin + `public/robots.txt` | SP commit adds **dev-server** vite plugin + robots updates. `astro.config` / managed robots may be owner-classified | **Partial:** SP `middleware.ts` trailing-slash broaden **shipped** in `427e68f3b`. Still parked: `astro.config.mjs` vite plugin (dev DX) + `public/robots.txt` (AP-02-style). Also: `deploy/ROOT_SETUP.md` is **protected** — do not include in publish |
| AP-05 | Med | PR hygiene / base branch | Devs should target `work/astro-sites` or rebase onto latest fleet often; mega PRs into stale `dev` cause 460+ file conflicts | Process note for Connect Group GitHub |
| AP-06 | Low | Stashed fleet robots wave | Laptop stash `wip-robots-wave-before-pr83-merge` — multi-site `robots.txt.ts` / delete `public/robots.txt` / `text-files-store` — not on branch | Decide whether to revive after AP-02 policy |
| AP-10 | Low | Iberia `/sitemap.xml` true HTTP 301 | Aaron: path is **unadvertised**; currently Astro static meta-redirect, not a real 301. Advertised index/child routes are correct | Optional polish; do not confuse with working `/sitemap-index.xml` + `/sitemap-0.xml` |
| AP-11 | Ops | `astro-caddy-certificate-refresh.service` failed | Aaron: unit already failed since ~00:23 UTC **before** Iberia backend switch; he did not alter it | Owner/ops follow-up; unrelated to developer publish lane |

---

## Cleared / shipped (reference)

| When | What | Tip |
|---|---|---|
| 2026-08-25 | Connect Resources Lana page purge + mega-menu banners; Connect HR SEO audit; Connect Group audit + restore `/mbs-tax-consultancy/` + `/uaegate/`; KPM Pro duplicate blog redirects (`blog.ts`/JSON only — API still AP-09) | Fleet **`882a45e5d`** (live all four) |
| 2026-08-25 | **SP Heavy** author pages/pagination, blog breadcrumbs, favicon, header/footer, form UX, GTM seed, data tweaks, **middleware** trailing-slash; **Connect Freelance** favicon/BaseLayout, residence-visa hover, `blog.ts` harden, legacy HTML. Omitted: SP `[...slug]` / `astro.config` / `robots.txt` / `deploy/ROOT_SETUP.md`; CF `api/blog/**` + middleware (AP-12) | Fleet **`427e68f3b`** (live both sites) |
| 2026-08-25 | Iberia EOR titles under featured image — posts only (fix Home H1 bug on pages) | Fleet `6554a7b66` → tip advanced; still live via ancestry |
| 2026-08-25 | KPM Pro Insights equal-height cards + new-posts-first (`b28067ea8` already on `work/astro-sites`; published libs only — `api/blog/listing` + `load-more` **blocked**) | Fleet `bfb528620` |
| 2026-08-25 | **AP-03 cleared (Aaron):** Iberia Workforce trusted backend switch — 9 env values active; shared Pipedrive token preserved (matched fleet fingerprint); commit `2cf19b99c` already inside release `58159d65` (no extra presentation publish); **presentation + trusted backend both on `58159d65`**; public robots / sitemap index / sitemap child **backend-owned HTTP 200**; sitemap 36 unique canonicals all public 200; contact tests 17/17; fleet audit 42 sites / 0 errors (1 existing CR International warning); no production form submit; no token rotation / CF-DNS-Caddy / cache purge / other-site restart; developer checkout left clean. Evidence: `/var/lib/astro-fleet/transactions/iberiaworkforce-backend-switch-1787658125-0fbce3a2b5a64dd49bde628cf22ea813/RESULT.json` · reviewed source `/opt/ops/iberiaworkforce-backend-switch-20260825/README.md` | Iberia artifact `58159d653` (site); fleet tip later advanced independently |
| 2026-08-25 | KPM Pro DED guide + MOL link; CR EOR cost post; Connect Group Insights featured images 3:2 | Fleet `400d7360b` |
| 2026-08-25 | Kinza `/recruitment/` → LP; CR alt/robots frontend; Iberia sitemap-index routes (front) | Fleet `58159d653` (and earlier Iberia sitemap commits) |
| 2026-08-25 | PR #83 closed — cherry-picked 4 commits only; mega-merge reverted | Superseded |
| 2026-08-25 | PR #87 closed + **published** emiratisationgate.org + emiratisationgateway.com (cherry-pick `0252a285f`; full tip incl. middleware favicon redirects + robots.txt.ts — **not blocked**) | Fleet `f33d46778` |
| 2026-08-25 | Connect FM Figma CSS/assets (via `pageCss`); Iberia EOR layout/data; Royal Visa OG PNGs | Fleet `af2566b94` — catch-all slug wiring / Redo `site-cms` still Aaron |
| 2026-08-25 | Iberia EOR `/eor-services/` shared chrome hide via BaseLayout path check | Fleet `8b110f9f2` |
| 2026-08-25 | Royal Visa branded OG on legacy mirrors (`legacy-page.js`) | Fleet `c278d123c` |

---

## Developer queue (presentation lane)

| Site | Package | Status |
|---|---|---|
| **spheavyrental.ae** | SP Heavy | **Published** `427e68f3b` (middleware yes; catch-all / astro.config / robots / ROOT_SETUP omitted → AP-09/13) |
| **connectfreelance.ae** | connectfreelance | **Published** presentation `427e68f3b`; API+middleware still **AP-12** |
| **connectfm.ae** | `connectfm-astro` | **Published** smart-home post (`ef225494c`) |
| **iberiaeor.com** | `iberiaeor-astro` | **Published** chrome hide + titles under image (`ef225494c` / posts-only fix `6554a7b66`) |
| **royalvisa.ae** | `royalvisa-ae-astro` | **Published** OG pilot — build-time `sharp` still AP-08 |
| **emiratisationgate.org** / **emiratisationgateway.com** | gate + gateway | **Published** (`f33d46778`) |
| **kpmpro.ae** | `kpmpro-ae-astro` | **Published** duplicate redirects `882a45e5d`; API still AP-09 |
| **connectresources.ae** | `connectresources-astro` | **Published** Lana cleanup + mega-menu `882a45e5d`; robots still AP-02 |
| **connecthr.ae** | `connecthr-astro` | **Published** SEO audit `882a45e5d` |
| **connectgroup.co** | `connectgroup-astro` | **Published** audit + MBS/UAE Gate restore `882a45e5d` |
| **redo.ae** | `redo-ae-astro` | **Blocked on AP-04** |
| **iberiaworkforce.com** | `iberiaworkforce-astro` | **AP-03 cleared** — front+backend on `58159d65` |

---

## Message template (paste to Aaron)

```text
Aaron — remaining from developer lane (2026-08-25; Iberia backend switch received — thank you):

1) Classify scripts/fleet-monitor/ so we can commit the Host-header probe fix
   (probeWithExplicitHost) without dirtying the host worktree.

2) Connect Resources: live robots still comes from managed .data store;
   frontend robots.txt.ts does not win until store policy changes.

3) packages/site-cms: normalize-mirror-content-seo + contentKind
   on absolutizeMirrorSeoHtml. Needed before Redo.ae SEO publish.
   Code is on work/astro-sites (f865df993); waiting on package/security lane.

4) sharp / pnpm (Iberia + fleet OG):
   - Add sharp to pnpm-workspace.yaml catalogs.default
   - Allow Iberia to drop passthroughImageService() and declare sharp
   - Same catalog sharp unlocks Royal Visa / fleet OG automation
     (team kit; pilot docs in docs/OG-AUTOMATION-PILOT.md)
   - One Linux pnpm install + lockfile commit in your lane

5) Blog API / catch-all allowlist (same class as KPM Pro):
   - Connect Freelance api/blog listing+load-more → */index.ts + middleware
     API slash skip (AP-12) — presentation already live without it
   - Optional: [...slug].astro presentation edits (SP page breadcrumbs, etc.)

6) Optional / ops (your notes):
   - Iberia /sitemap.xml → real HTTP 301 (unadvertised; index/child already OK)
   - astro-caddy-certificate-refresh.service failed since ~00:23 UTC (pre-existing)
   - SP Heavy: allow astro.config vite trailing-slash plugin + public/robots.txt
     if desired (middleware already shipped); deploy/ROOT_SETUP.md is protected
```

---
