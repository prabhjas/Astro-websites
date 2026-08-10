# Phase 07 sign-off — connectbusinesscenter.com

| | |
|--|--|
| **Port** | **5116** |
| **Evidence** | `docs/10-local-verify-report.md` |

## Harden gates (loopback)

| Gate | Expect | Status |
|------|--------|--------|
| G1 | Real 404 | PASS |
| G2 | Contact empty 422 / valid 200 | PASS |
| G3 | Health 200 | PASS |
| G5 | No fat CMS UI (`/internal/operations/` → 404) | PASS |
| G6 | Internal API deny without bearer; allow with secret | PASS |
| G13 | Ads/UTM attribution fields accepted on contact | PASS |

## Env / secret rules

- Unique local `INTERNAL_JOB_SECRET` in gitignored `.env`
- Never commit `.env` / `.env.prod` / `.data/`
- Server secret must not reuse another domain’s bearer

## Next

Phase 08 — deploy templates + git Caddy block (no live reload).
