# Caddy ops archive (Connect Group Astro fleet)

| Use | Path |
|-----|------|
| **Live production Caddyfile (git mirror)** | [`Caddyfile.production`](Caddyfile.production) |
| **How to deploy / add sites** | [`docs/CONNECT-CADDY-DEPLOYMENT.md`](../docs/CONNECT-CADDY-DEPLOYMENT.md) |
| **Per-site snippets** | `Astro-production/<domain>/deploy/<domain>.caddy` |
| Historical pre-rotation snapshot | [`Caddyfile.canonical-host-redirects.pending`](Caddyfile.canonical-host-redirects.pending) — never deploy |
| Pre-consolidation `sites.d` | [`archive-before-single-file-20260803/`](archive-before-single-file-20260803/) |
| Retired rollback metadata | Removed from the current tree; retained only in Git history for the documented security cleanup |

Other `Caddyfile.*.pending` / `before-*` files are iteration history only.

**Local:** do not run these Caddyfiles for normal fleet work — use `scripts/fleet-local.mjs` on ports 5080–5085.

**Server:** keep `/etc/caddy/Caddyfile` in sync with `Caddyfile.production`. Always `caddy validate` before `reload`.

## Origin TLS standard (C-01, 10 Aug 2026)

- `astro_origin_2026` serves the 28 Cloudflare origins; Payroll uses the isolated
  `payroll_origin_isolated_2026` hierarchy.
- Every site block has a 120-hour named-CA automation policy and synchronously
  loads its apex and `www` certificate/key pairs. The default `local` CA and a
  bare internal TLS directive are retired.
- Keep `astro-caddy-certificate-refresh.timer` enabled. It validates renewed
  stored pairs before a graceful Caddy reload.
- Cloudflare remains intentionally on **Full**. Do not select Flexible. Full
  (strict) remains deferred until a separately approved trust model is deployed.
- Never copy any credential storage, certificate private key, rollback snapshot,
  or generated PKI state into Git.
