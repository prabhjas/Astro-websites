# Caddy ops archive (Connect Group Astro fleet)

| Use | Path |
|-----|------|
| **Live production Caddyfile (git mirror)** | [`Caddyfile.production`](Caddyfile.production) |
| **How to deploy / add sites** | [`docs/CONNECT-CADDY-DEPLOYMENT.md`](../docs/CONNECT-CADDY-DEPLOYMENT.md) |
| **Per-site snippets** | `Astro-production/<domain>/deploy/<domain>.caddy` |
| Historical same-as-production snapshot | [`Caddyfile.canonical-host-redirects.pending`](Caddyfile.canonical-host-redirects.pending) |
| Pre-consolidation `sites.d` | [`archive-before-single-file-20260803/`](archive-before-single-file-20260803/) |
| Binary / unit / cert rollback | [`upgrade-rollback-20260803/`](upgrade-rollback-20260803/) — ops only; contains private keys |

Other `Caddyfile.*.pending` / `before-*` files are iteration history only.

**Local:** do not run these Caddyfiles for normal fleet work — use `scripts/fleet-local.mjs` on ports 5080–5085.

**Server:** keep `/etc/caddy/Caddyfile` in sync with `Caddyfile.production`. Always `caddy validate` before `reload`.
