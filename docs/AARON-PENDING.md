# Aaron pending — fleet owner / security-maintenance lane

**Updated:** 2026-08-26 (developer leftovers closed; AP-04 aside → [AARON-REDO-SITE-CMS.md](AARON-REDO-SITE-CMS.md))  
**Owner lane:** Aaron (not developer generic `astro-fleet-release publish`)  
**Developer working tip:** `work/astro-sites` · Live publish branch: `astro-fleet-development`  
**Related:** [OG-AUTOMATION-PILOT.md](OG-AUTOMATION-PILOT.md) · [AARON-REDO-SITE-CMS.md](AARON-REDO-SITE-CMS.md)

**Important (Aaron):** Local `scripts/ci/` / `fleet-policy.json` dry-runs stay **stale on purpose**. Trust the **real** `astro-fleet-release publish`.

---

## Open (Aaron only)

| ID | Priority | Item | Status / notes |
|---|---|---|---|
| AP-04 | High | `packages/site-cms` — Redo mirror SEO normalize | **Aside for Aaron.** Full handoff: [AARON-REDO-SITE-CMS.md](AARON-REDO-SITE-CMS.md). Commit `f865df993`. Do not ship in site-only publish |
| AP-05 | Low | PR hygiene / base branch | Process note only |

---

## Closed / shipped

| ID | Result | Tip / note |
|---|---|---|
| AP-01 | Host probe shipped | `4176034f6` |
| AP-02 | Managed robots overrides removed; source wins | Aaron |
| AP-03 | Iberia Workforce trusted backend | `58159d653` |
| AP-06 | Robots wave stash **superseded** — AP-02 already made source robots win; mega-stash not revived (860 files / noise) | Stash kept locally only |
| AP-07 / AP-08 | Sharp on Iberia + Royal Visa | Live via `4176034f6` (Aaron `bfc113c0f`) |
| AP-09 | Catch-all gate fixed; SP breadcrumbs shipped | Gate Aaron; SP `443d5663b` |
| AP-10 | Iberia `/sitemap.xml` true SSR 301 | This wave |
| AP-11 | Caddy cert refresh resolved | Aaron |
| AP-12 | CF (+ KPM) blog API directory routes + middleware `/api/` skip | CF `4176034f6`; KPM this wave |
| AP-13 | SP `astro.config` + `robots.txt` (+ typed vite plugin) | `443d5663b` |

---

## Cleared / shipped (reference)

| When | What | Tip |
|---|---|---|
| 2026-08-26 | SP Heavy vite plugin + robots + catch-all breadcrumbs | Fleet **`443d5663b`** |
| 2026-08-26 | CF blog API + middleware; Host probe; Iberia/RV sharp live | Fleet **`4176034f6`** |
| 2026-08-26 | Aaron sharp pins + gate/robots control-plane fixes | Fleet **`bfc113c0f`** |
| 2026-08-25 | CR Lana + CHR SEO + CG MBS/UAE Gate + KPM duplicate redirects | Fleet **`882a45e5d`** |
| 2026-08-25 | SP author/chrome + CF presentation | Fleet **`427e68f3b`** |

---

## Note to self before publish

1. Pull `origin/astro-fleet-development` into `work/astro-sites` when needed.  
2. Host: tidy worktree + SSH-signed site-only commit → `sudo /usr/local/sbin/astro-fleet-release publish`.  
3. Do **not** commit `scripts/ci/`, `packages/`, or `deploy/ROOT_SETUP.md`.  
4. Contact/lead/submission `/api/` still Aaron — only `/api/blog/` unblocked for us.
