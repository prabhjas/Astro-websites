# /etc/caddy/sites.d/

One file per Astro SSR site, pulled in by `import /etc/caddy/sites.d/*.caddy`
at the top of /etc/caddy/Caddyfile. The legacy static sites still live in the
main Caddyfile; only the Node-backed sites have been split out so far.

## Why these blocks look the way they do

Every domain here is **proxied through Cloudflare** (the public A records are
Cloudflare IPs; this box, 178.105.150.67, is the origin). That dictates two
things which differ from a stock Caddy site block:

1. **Explicit `http://` and `https://` prefixes, never a bare domain.**
   A bare domain turns on Caddy's automatic HTTPS, which (a) tries to get a
   Let's Encrypt cert through Cloudflare, and (b) issues a 301 from :80 to
   :443. If Cloudflare's SSL mode for the zone is "Flexible", Cloudflare talks
   to the origin over plain HTTP on :80 — and that redirect becomes an
   infinite loop. Listing both schemes keeps :80 serving content directly.

2. **`tls internal`.** Cloudflare "Full" mode requires the origin to answer
   TLS on :443 but does not validate the certificate, so Caddy's own internal
   CA is sufficient and needs no ACME round-trip. Moving the zone to
   "Full (strict)" later means installing a Cloudflare Origin Certificate here
   and replacing `tls internal` with `tls <cert> <key>`.

## Full reverse proxy, no file_server

These are `output: 'static'` + `@astrojs/node` (standalone) builds. The Node
process renders pages, serves everything in dist/client itself, and owns the
/api/* routes. There is deliberately no `root`/`file_server` and no
per-path proxy — a partial proxy is what previously left /api/contact and
/api/health unreachable on iberiaworkforce.com.

## Ports

| Site                   | Port | systemd unit                |
|------------------------|------|-----------------------------|
| evolutionmiddleast.com | 5080 | evolutionmiddleast.service  |
| cbss.ae                | 5081 | cbss.service                |
| spheavyrental.ae       | 5082 | spheavyrental.service       |
| iberiaworkforce.com    | 5083 | iberiaworkforce.service     |

After editing anything here:

    caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy
