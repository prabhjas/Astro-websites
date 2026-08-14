# connectresourcesint.com

| | |
|--|--|
| **Port** | **5098** |
| **Unit** | `connectresourcesint` |
| **Status** | Generic secretless frontend with trusted backend |

Ordinary presentation changes use the fleet's signed developer commit and
`sudo /usr/local/sbin/astro-fleet-release publish`. The apex host remains the
service identity; Caddy redirects it to the canonical public `www` host, and
the Astro build deliberately keeps generated canonical/sitemap URLs on `www`.

Protected routes and any future secrets or mutable state remain on the trusted
backend. Do not bypass the publisher with a direct build, service restart, or
copy into `/opt/Astro-production`.

Local: `http://127.0.0.1:5098/` (after code + `fleet-local up connectresourcesint`).
