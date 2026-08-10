# Emiratisation Hub (emiratisationhub.com) — fleet deploy notes

App path: `/opt/Astro-production/emiratisationhub.com`  
Unit: `emiratisationhub` · PORT **5107** · user **`site-emiratisationhub`**  

## Env

| File | Mode / owner | Contents |
|------|----------------|----------|
| `.env.prod` | `root:site-emiratisationhub` **0640** | Runtime secrets. **Required** (`EnvironmentFile=` without `-`). |
| `.env` | `root:webdev` **0644** | Build-only `PUBLIC_SITE_URL=https://emiratisationhub.com` |

## Host steps (root)

Code + prod build + `.env.prod.staged` are synced by webdev under `/opt/Astro-production/emiratisationhub.com`. Then as **root**:

```bash
bash /opt/Astro-production/emiratisationhub.com/deploy/bootstrap-root.sh
```

That script: creates `site-emiratisationhub`, installs `.env` / `.env.prod`, unit, Caddy site, allowlists `emiratisationhub` in `site-ctl`, enables the service, loopback smoke.

Afterward: Cloudflare origin → server IP, SSL mode **Full** (not Full strict) while origin uses `tls internal`. Register domain + `INTERNAL_JOB_SECRET` in FLOW.

## Local

```bash
# from monorepo root
pnpm install
node scripts/fleet-local.mjs up emiratisationhub
# http://127.0.0.1:5107/
```
