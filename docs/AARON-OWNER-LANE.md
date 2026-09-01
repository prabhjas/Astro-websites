# Aaron — owner lane only (envs / leads / Caddy)

**Updated:** 2026-08-26  
**Developer note:** You cleared presentation + packages for us; **only envs, leads, and Caddy** stay with you. Anything below still needs your lane.

Related: [AARON-REDO-SITE-CMS.md](AARON-REDO-SITE-CMS.md) (package change we can now ship ourselves unless you prefer to review first) · [AARON-PENDING.md](AARON-PENDING.md)

---

## Still yours

| Item | Why | Ask |
|---|---|---|
| **SP Heavy GTM `GTM-PL2CQ48T`** | Needs `PUBLIC_GTM_ID` in prod `.env` and/or `INTERNAL_ADMIN_DIR/gtm.json` via `scripts/seed-gtm.mjs` | Seed GTM on host (env or admin JSON). Code already loads `/runtime-gtm.js` |
| **Leads / contact `/api/`** (non-blog) | Lead storage + rate limit + submission APIs | Keep as today |
| **Caddy / TLS / route ownership** | Edge routing | See robots note below |
| **Prod `.env` / secrets** | Never in developer commits | Same |

---

## Observed live issues that look like edge / backend ownership

### 1) `spheavyrental.ae/robots.txt` still old backend body

- Live: `x-astro-fleet-route: backend`, `last-modified: Thu, 13 Aug 2026`, short Allow/Disallow body (~338 bytes)
- Git tip (`astro-fleet-development` / work): full Tabish robots (`Sitemap: …/sitemap_index.xml`, licence header, GPTBot blocks, etc.)
- After AP-02 (“source robots win”), we expected front/`public/robots.txt`. Live still backend.

**Ask:** Confirm Caddy / managed robots for SP (and other sites) actually serve `public/robots.txt` from the published front, or clear the stale backend override.

### 2) Favicon / static assets lag (CF example)

- `connectfreelance.ae/favicon.ico` live ~655 bytes; git tip **1257** bytes (same on fleet tip)
- Homepage commit header can be newer than favicon bytes → CDN or asset switch lag

**Ask:** If republish does not refresh, check CF/edge cache for `/favicon.ico`.

---

## Paste-ready

```text
Aaron — owner-lane only (envs / leads / Caddy):

1) SP Heavy: please set PUBLIC_GTM_ID=GTM-PL2CQ48T (or seed gtm.json). Loader already in BaseLayout.
2) SP robots.txt still served from backend (Aug 13 body) while git has the new public/robots.txt — please confirm source robots win at the edge after AP-02.
3) CF favicon live still old bytes vs git tip — if our republish does not fix, edge cache on /favicon.ico.

Leads/contact APIs and Caddy remain yours. Presentation + packages we are shipping on astro-fleet-development.
```
