# Aaron — owner lane only (envs / leads / Caddy / backend pins)

**Updated:** 2026-08-26 evening (Aaron confirmed)  
**Related:** [AARON-PENDING.md](AARON-PENDING.md) · [AARON-REDO-SITE-CMS.md](AARON-REDO-SITE-CMS.md)

---

## Confirmed design (do not “fix” at Caddy)

These paths are routed to the **backend by design** and never reach the front:

- `/robots.txt`, `/llms.txt`
- all sitemaps (incl. `/sitemap.xml`)
- `/runtime-gtm.js`

**Cause of stale robots / sitemap bodies:** every backend is pinned to an **old release** via a systemd drop-in that `astro-fleet-release publish` never touches. Correct `public/robots.txt` can sit in the front release while the backend still serves its old copy.

**Ask:** Aaron owns a gated **backend refresh** (backends hold Pipedrive token + lead store). Developer waits for that — **no Caddy 301 / front-route** for `/sitemap.xml` or robots (would hide the design).

---

## Still yours

| Item | Ask |
|---|---|
| Backend refresh | When decided — refresh pins so robots/sitemaps/llms/runtime-gtm match current tip |
| SP Heavy GTM `GTM-PL2CQ48T` | `PUBLIC_GTM_ID` and/or `gtm.json` seed (if not already) |
| Leads / contact `/api/` (non-blog) | Keep as today |
| Prod `.env` / secrets | Never in developer commits |
| CF purge gaps | Stable `public/` paths outside `/` + `wp-content/` can stay HIT after publish; purge + add to that site’s release purge list when reported |

---

## Cleared

| Item | Status |
|---|---|
| `packages/site-cms` AP-04 | On tip `159ff7081`; copied into every build — **no separate package publish** |
| Connect Freelance favicon | git tip = release = live (hash match); local cache only |
| SP `migration-overrides.css` | CF purged; SP now purges `/css/` on every publish |

---

## Diagnose sticky assets yourself

Compare three hashes: **git tip**, **origin (direct)**, **live**. Check `cf-cache-status` / `age`.

- Origin right, live wrong → edge; Aaron can purge
- Origin wrong → backend pin; Aaron

---

## Paste-ready (post-Aaron reply)

```text
Aaron — acknowledged:

1) site-cms AP-04 already in builds via 159ff7081 — we ship Redo site files only.
2) robots/sitemaps/llms/runtime-gtm are backend-by-design; we will not Caddy-workaround. Waiting on your backend refresh.
3) CF favicon was local cache; SP /css/ purge noted. We will report exact public/ paths if other stables stick after publish.
```
