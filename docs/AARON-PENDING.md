# Aaron pending — fleet owner / security-maintenance lane

**Updated:** 2026-08-26 (Aaron clearances: AP-01/02/06–13; sharp `bfc113c0f`; AP-04 remains)  
**Owner lane:** Aaron (not developer generic `astro-fleet-release publish`)  
**Developer working tip:** `work/astro-sites` · Live publish branch: `astro-fleet-development`  
**Related:** [OG-AUTOMATION-PILOT.md](OG-AUTOMATION-PILOT.md)

Track items that block or sit outside the ordinary 1–8 site presentation publish. Clear a row when done (date + tip / note).

**Important (Aaron):** Local `scripts/ci/` / `fleet-policy.json` dry-runs stay **stale on purpose** (owner-only path). Trust the **real** `astro-fleet-release publish`, not the local preview. Pull `origin/astro-fleet-development` before the next publish.

---

## Open

| ID | Priority | Item | Why it needs Aaron | Status / notes |
|---|---|---|---|---|
| AP-04 | High | `packages/site-cms` — mirror SEO normalize (Redo) | Package holds lead storage/export, HTML sanitiser, rate limiting; ships to all sites on every build | Aaron: send Redo change for review/publish. Code on `work/astro-sites` @ `f865df993` (and tip). Do **not** include in site-only signed publish |
| AP-05 | Med | PR hygiene / base branch | Devs should target `work/astro-sites` or rebase onto latest fleet often; mega PRs into stale `dev` cause 460+ file conflicts | Process note for Connect Group GitHub |

---

## Developer-executable now (Aaron unblocked 2026-08-26)

| ID | Item | Action |
|---|---|---|
| AP-01 | `scripts/fleet-monitor/` Host probe | **Not blocked.** Live policy already classifies path. Local dry-run lied (stale policy). Ship tidy signed publish of `probeWithExplicitHost` in `lib.mjs` |
| AP-02 | Connect Resources managed robots | **Closed.** Managed overrides removed; robots is plain source — our edits win |
| AP-06 | Stashed fleet robots wave | **Go ahead.** Dynamic robots route + `public/robots.txt` both pass. Revive stash when ready |
| AP-07 / AP-08 | Iberia + Royal Visa `sharp` | **Done by Aaron** on fleet tip **`bfc113c0f`** (site-local `sharp@0.35.3`, lockfile, Iberia dropped `passthroughImageService()`). Goes live on those sites’ **next publish**. RV OG pilot may use build-time sharp |
| AP-09 | `[...slug].astro` catch-all | **Fixed.** Traversal guard no longer matches `..` inside `[...slug]`. Catch-all presentation edits publish normally; BaseLayout / `pageCss` workarounds optional to retire |
| AP-10 | Iberia `/sitemap.xml` real 301 | Optional — ours if we want; `middleware.ts` publishable |
| AP-11 | Caddy cert refresh unit | **Resolved** — clean since; last success 01:49; prior failure transient |
| AP-12 | Blog API `listing`/`load-more` + middleware API slash skip | **Unblocked** for `/src/pages/api/blog/` only. Ship CF rename + middleware. Other `/api/` (lead/contact/submission) still Aaron |
| AP-13 | SP `astro.config.mjs` + `public/robots.txt` | **Never blocked.** Publish whenever. Only `deploy/ROOT_SETUP.md` stays protected |

---

## Cleared / shipped (reference)

| When | What | Tip |
|---|---|---|
| 2026-08-26 | **Aaron:** sharp pinned on Iberia Workforce + Royal Visa; Iberia passthrough dropped; gate fixes (catch-all + blog API carve-out) on server control plane; managed robots overrides removed | Fleet **`bfc113c0f`** (code); gate/robots runtime on host |
| 2026-08-25 | Connect Resources Lana page purge + mega-menu banners; Connect HR SEO audit; Connect Group audit + restore `/mbs-tax-consultancy/` + `/uaegate/`; KPM Pro duplicate blog redirects (`blog.ts`/JSON only) | Fleet **`882a45e5d`** (live all four) |
| 2026-08-25 | **SP Heavy** author/chrome/favicon + middleware; **Connect Freelance** presentation (API deferred at the time) | Fleet **`427e68f3b`** |
| 2026-08-25 | Iberia EOR titles under featured image — posts only | Fleet `6554a7b66` |
| 2026-08-25 | KPM Pro Insights equal-height cards (libs only) | Fleet `bfb528620` |
| 2026-08-25 | **AP-03 cleared (Aaron):** Iberia Workforce trusted backend switch | Iberia artifact `58159d653` |
| 2026-08-25 | KPM Pro DED + MOL; CR EOR cost; CG Insights 3:2 | Fleet `400d7360b` |
| 2026-08-25 | Kinza `/recruitment/` → LP; CR alt/robots; Iberia sitemap-index | Fleet `58159d653` |
| 2026-08-25 | Emiratisation gate + gateway (PR #87 cherry-pick) | Fleet `f33d46778` |
| 2026-08-25 | Connect FM Figma CSS; Iberia EOR layout; Royal Visa OG PNGs | Fleet `af2566b94` / `c278d123c` |

---

## Developer queue (presentation lane)

| Site | Package | Status |
|---|---|---|
| **iberiaworkforce.com** / **royalvisa.ae** | workforce + royalvisa | Aaron sharp commit on fleet — **publish next** to go live |
| **connectfreelance.ae** | connectfreelance | Presentation live; **ship** blog API + middleware (AP-12) |
| **spheavyrental.ae** | SP Heavy | Middleware live; **ship** `astro.config` + `robots.txt` (+ catch-all breadcrumbs if wanted) |
| **kpmpro.ae** | kpmpro | Duplicate redirects live; **can ship** previously deferred `api/blog/*` if still needed |
| **connectresources.ae** | CR | Lana live; robots source-wins now (AP-02 closed) |
| **redo.ae** | redo | **Still AP-04** — send package change to Aaron |
| Others | — | Catch-all / robots edits unblocked fleet-wide |

---

## Note to self before publish

1. `git fetch origin astro-fleet-development` and merge/rebase into `work/astro-sites` when needed.  
2. Host: tidy worktree + SSH-signed site-only commit → `sudo /usr/local/sbin/astro-fleet-release publish`.  
3. Do **not** trust local `scripts/ci` dry-run for gate decisions.  
4. Do **not** commit `scripts/ci/` or `deploy/ROOT_SETUP.md`.  
5. Other `/api/` (contact/lead/submission) still Aaron — only `/api/blog/` unblocked.
