# Aaron pending — fleet tracker

**Updated:** 2026-08-26 (Aaron: only envs / leads / Caddy remain his)  
**Developer working tip:** `work/astro-sites` · Live publish branch: `astro-fleet-development`  
**Owner-only leftovers:** [AARON-OWNER-LANE.md](AARON-OWNER-LANE.md) · Redo package notes: [AARON-REDO-SITE-CMS.md](AARON-REDO-SITE-CMS.md)

**Important:** Local `scripts/ci/` / `fleet-policy.json` dry-runs stay **stale on purpose**. Trust real `astro-fleet-release publish`.

---

## Owner lane only (Aaron)

| Item | Doc |
|---|---|
| Envs / secrets | [AARON-OWNER-LANE.md](AARON-OWNER-LANE.md) |
| Leads / non-blog `/api/` | same |
| Caddy / TLS / robots edge still backend on SP | same |
| SP GTM `GTM-PL2CQ48T` seed | same |

---

## This developer wave (in progress)

| Site | Work | Local status |
|---|---|---|
| Connect Freelance | Tabish `f703c7c53` favicon / polish (git tip already has bytes; live favicon stale) | Republish |
| SP Heavy | Redirect + sitemap exclude `power-generator-rental`; robots in git; middleware YAML redirects without env; GTM → Aaron | Ready |
| Iberia Workforce | `/sitemap.xml` SSR 301 (`3acc80e35`) | Ready |
| Iberia EOR | Mushtaque load-more / insights cards + eor-services chrome | Mostly in HEAD |
| MBS | Rajpal `438abd447` restored (was reverted with PR #83) | Restored in tree |
| Redo.ae | Site SEO + routing (`f865df993` / `cb3d86586`) **+** `packages/site-cms` normalize (now shippable in our lane) | Ready |
| KPM | Blog API directory routes + middleware `/api/` skip | Ready |

## Fleet-wide robots (AP-06)

- Mega-stash `wip-robots-wave-before-pr83-merge` is **not** safe to apply as-is (deletes many `public/robots.txt` + huge `text-files-store` rewrites).
- Correct approach after AP-02: keep/update **`public/robots.txt` per site**, publish in **waves of ≤8**.
- SP proves edge may still serve **backend** robots — Aaron must confirm source robots win (see owner-lane doc).

---

## Note before publish

1. Pull/sync `origin/astro-fleet-development` when needed.  
2. Host: tidy worktree + SSH-signed commit → `sudo /usr/local/sbin/astro-fleet-release publish` (1–8 sites).  
3. Do **not** commit prod `.env`, Caddy, or lead-only APIs.  
4. Package change (`site-cms`) may rebuild broadly — keep Redo + package in one careful publish or package-first if publisher requires.
