# Phase 09 / 10 — App sync + final checks (connectbusinesscenter.com)

## Phase 09 — Handoff

Server cutover steps are in [`13-go-live-server-handoff.md`](./13-go-live-server-handoff.md).  
Laptop work stops at app templates + git Caddy; live `/etc/caddy` reload is **owner**.

## Phase 10 — Loopback verify

| Check | Result |
|-------|--------|
| `fleet-local smoke connectbusinesscenter` | PASS |
| `node scripts/phase-verify-local.mjs` | ALL CHECKS PASSED |
| Report | `docs/10-local-verify-report.md` |

Public HTTPS smoke after owner cutover (not done here).
