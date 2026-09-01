# Aaron pending — fleet tracker

**Updated:** 2026-08-26 late (Aaron backend refresh done)  
**Final Aaron doc:** [AARON-FINAL-HANDOFF.md](AARON-FINAL-HANDOFF.md)  
**Owner-only:** [AARON-OWNER-LANE.md](AARON-OWNER-LANE.md)

---

## Aaron completed (no developer action)

| Item | Status |
|---|---|
| Backend refresh | **32 sites** including SP Heavy + Iberia Workforce — robots/llms/sitemaps from current release; edge purged |
| Auto backend follow | Publish → front switches → **backend follows** → edge purged |
| Wider auto purge | robots, llms, both sitemaps, `runtime-gtm.js`, `/css/` on every release |
| `/api/blog/` on front | Pure content routes moved off credential backend (same URLs). **Do not** put Pipedrive/lead/env code under `api/blog/` |
| Leads / Pipedrive / env | Unchanged; 1,089 leads intact |

## Aaron still holding (wait for our ping)

| Item | Why |
|---|---|
| **Connect Freelance** backend refresh | Deliberately on old backend until our `api/blog/` `listing` / `load-more` rename is **published** — then ping Aaron |

## Aaron converting separately (no action from us)

- Older backend setup: izi, lladesigners, snapsale, theuaegate, raadrecruitment, connectbusinesscenter, connectresourcesint, saudicompanyformation
- payrollmiddleast — no purge config; refreshes on CF cache expiry

## Sticky assets

If SEO/CSS still looks stale after publish: check `cf-cache-status` / `age` first — likely edge; send Aaron the exact path.

## Developer next

1. Confirm Connect Freelance `api/blog/listing` + `api/blog/load-more` published on fleet tip  
2. Ping Aaron to take CF off backend hold  
3. Keep non-blog `/api/` (leads) out of `api/blog/`
