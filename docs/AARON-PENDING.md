# Aaron pending — fleet owner / security-maintenance lane

**Updated:** 2026-08-25  
**Owner lane:** Aaron (not developer generic `astro-fleet-release publish`)  
**Developer working tip:** `work/astro-sites` · Live publish branch: `astro-fleet-development`

Track items that block or sit outside the ordinary 1–8 site presentation publish. Clear a row when done (date + tip / note).

---

## Open

| ID | Priority | Item | Why it needs Aaron | Status / notes |
|---|---|---|---|---|
| AP-01 | High | Classify / allow `scripts/fleet-monitor/` (esp. `lib.mjs`) for signed commits | Host Host-probe fix (`probeWithExplicitHost`) cannot ship via generic publish until path is classified; dirty host copy blocked publishes before | Code on laptop `work/astro-sites`; may still be absent from fleet tip |
| AP-02 | High | Connect Resources managed robots override | Live `/robots.txt` still served from `.data` store (short managed body) so dynamic `robots.txt.ts` does not win | Frontend robots route exists; store ownership needs Aaron/backend policy |
| AP-03 | High | Iberia Workforce trusted backend pin | Front can be on fleet tip while trusted backend (`iberiaworkforce.service`) stays on older release — robots/sitemap/llms/forms lag | Switch backend unit/release to current fleet tip when ready |
| AP-04 | High | `packages/site-cms` — mirror SEO normalize | Mushtaq Redo commit adds `normalize-mirror-content-seo.ts` + wires it through `absolutizeMirrorSeoHtml` (`contentKind`). **Redo.ae cannot publish in presentation lane until this package change is allowed / released** | On `work/astro-sites` @ `f865df993` (and tip). Do **not** include in site-only signed publish until Aaron clears package lane |
| AP-05 | Med | PR hygiene / base branch | Devs should target `work/astro-sites` or rebase onto latest fleet often; mega PRs into stale `dev` cause 460+ file conflicts | Process note for Connect Group GitHub |
| AP-06 | Low | Stashed fleet robots wave | Laptop stash `wip-robots-wave-before-pr83-merge` — multi-site `robots.txt.ts` / delete `public/robots.txt` / `text-files-store` — not on branch | Decide whether to revive after AP-02 policy |

---

## Cleared / shipped (reference)

| When | What | Tip |
|---|---|---|
| 2026-08-25 | KPM Pro DED guide + MOL link; CR EOR cost post; Connect Group Insights featured images 3:2 | Fleet `400d7360b` |
| 2026-08-25 | Kinza `/recruitment/` → LP; CR alt/robots frontend; Iberia sitemap-index routes (front) | Fleet `58159d653` (and earlier Iberia sitemap commits) |
| 2026-08-25 | PR #83 (`rajpal-branch`) closed — cherry-picked 4 commits only; mega-merge reverted | Superseded |
| 2026-08-25 | PR #86 (`mushtaq-branch`) — intentional commits cherry-picked; do not merge whole PR | See below |

---

## Developer queue (presentation lane — no Aaron required for code)

Ready on laptop `work/astro-sites` after Mushtaq cherry-picks (publish only **site trees**, not packages):

| Site | Package | Source commits | Publish? |
|---|---|---|---|
| **connectfm.ae** | `connectfm-astro` | `ca3822f8e` / `1e68461f2` — Security + Landscaping Figma CSS | Yes — site-only |
| **iberiaeor.com** | `iberiaeor-astro` | `05a074ea2` / `24073e23c` — hide chrome on `/eor-services/`, © 2026 | Yes — site-only |
| **redo.ae** | `redo-ae-astro` | `cb3d86586` / `f865df993` — redirects, routing, SEO calls | **Blocked on AP-04** until `packages/site-cms` is cleared |

---

## Message template (paste to Aaron)

```text
Aaron — pending from developer lane (2026-08-25):

1) Classify scripts/fleet-monitor/ so we can commit the Host-header probe fix
   (probeWithExplicitHost) without dirtying the host worktree.

2) Connect Resources: live robots still comes from managed .data store;
   frontend robots.txt.ts does not win until store policy changes.

3) Iberia Workforce: please switch trusted backend (iberiaworkforce.service)
   to the current fleet tip so sitemap/robots/llms match the front.

4) packages/site-cms: Mushtaq added normalize-mirror-content-seo + contentKind
   on absolutizeMirrorSeoHtml. Needed before Redo.ae SEO publish.
   Code is on work/astro-sites (f865df993); waiting on package/security lane.
```

---

## How we handle Mushtaq / Rajpal PRs going forward

1. Do **not** merge mega `*-branch` PRs into `dev` / `work/astro-sites` wholesale.  
2. Cherry-pick the named feature commits only.  
3. Anything under `packages/`, `caddy/`, lockfile, CI, deploy scripts → this file (Aaron).  
4. Publish from host `astro-fleet-development` with SSH-signed site-only commits (1–8 sites).
