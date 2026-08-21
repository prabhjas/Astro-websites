# Emiratisation Hub (emiratisationhub.com) — fleet deploy notes

App path: `/opt/Astro-production/emiratisationhub.com`  
Unit: `emiratisationhub` · PORT **5107** · user **`site-emiratisationhub`**  

## Env

| File | Mode / owner | Contents |
|------|----------------|----------|
| `.env.prod` | `root:site-emiratisationhub` **0640** | Runtime secrets. **Required** (`EnvironmentFile=` without `-`). |
| `.env` | `root:webdev` **0644** | Build-only `PUBLIC_SITE_URL=https://emiratisationhub.com` |

## Host steps (root)

The legacy bootstrap is retired and deliberately refuses to make changes.
Production is managed through the root-owned Astro fleet release boundary; do
not install service or Caddy fragments from this directory.

The reviewed single Caddyfile uses named CA `astro_origin_2026`, paired manual
certificate loaders and Cloudflare SSL **Full**. Cloudflare changes remain a
separate owner-controlled operation.

## Local

```bash
# from monorepo root
pnpm install
node scripts/fleet-local.mjs up emiratisationhub
# http://127.0.0.1:5107/
```
