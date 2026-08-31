# Aaron — owner lane only (envs / leads / Caddy)

**Updated:** 2026-08-26 late (Aaron backend automation live)  
**Related:** [AARON-PENDING.md](AARON-PENDING.md)

---

## What changed (Aaron)

1. **Backends follow publishes** automatically (except Connect Freelance until we ping).  
   SEO files in the release now take effect on publish — no waiting on a manual backend pin refresh.
2. **Edge purge** on release covers robots, llms, both sitemaps, `runtime-gtm.js`, and `/css/`.
3. **`/api/blog/` runs on the front** (no Pipedrive / lead store / internal secret). Same URLs. Anything needing credentials stays in non-blog `/api/` (owner-reviewed).

## Still yours

| Item | Ask |
|---|---|
| Connect Freelance backend refresh | After we publish CF `api/blog` listing/load-more rename and ping you |
| Eight older backends | izi, lladesigners, snapsale, theuaegate, raadrecruitment, connectbusinesscenter, connectresourcesint, saudicompanyformation — convert separately |
| payrollmiddleast purge config | Optional later; currently TTL expiry |
| Leads / contact non-blog `/api/` | Keep as today |
| Prod `.env` / secrets | Never in developer commits |
| SP Heavy GTM `GTM-PL2CQ48T` | Env / `gtm.json` if not already seeded |

## Developer rules (from Aaron)

- Do **not** add Pipedrive / lead store / server-env logic under `api/blog/`
- If live still stale after publish → check `cf-cache-status`; report exact path for purge if needed

## Diagnose sticky assets

Compare **git tip** · **origin** · **live**. Check `cf-cache-status` / `age`.

- Origin right, live wrong → edge  
- Origin wrong → report to Aaron (should be rare now that backends follow publish)
