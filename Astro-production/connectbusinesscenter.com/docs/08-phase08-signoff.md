# Phase 08 sign-off — connectbusinesscenter.com

| | |
|--|--|
| **Port** | **5116** |
| **Unit** | `connectbusinesscenter.service` |

## Checklist

| Item | Status |
|------|--------|
| `deploy/connectbusinesscenter.service` | Present |
| `deploy/connectbusinesscenter.com.caddy` | Present (aligned with fleet headers) |
| `deploy/ROOT_SETUP.md` | Present |
| Git `caddy/Caddyfile.production` site block | Present |
| One-hop `http://www.connectbusinesscenter.com` | Present |
| Live `/etc/caddy` reload | **Owner only** — not done from laptop |

## Next

Phase 09 — app sync / go-live handoff for webdev/root.
