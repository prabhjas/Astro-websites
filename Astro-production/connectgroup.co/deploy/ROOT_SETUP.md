# Connect Group (connectgroup.co) — fleet deploy notes

App path: `/opt/Astro-production/connectgroup.co`  
Unit: `connectgroup` · PORT **5085** · user **`site-connectgroup`**  

Imported from the legacy single-site repo (`prabhjas/astro` / Desktop `astro`) into the Connect Group monorepo fleet.

See `docs/CONNECT-ASTRO-FLEET-STANDARD.md` (peer copy) · root `docs/server-ops-only.md`.

## Env

| File | Mode / owner | Contents |
|------|----------------|----------|
| `.env.prod` | `root:site-connectgroup` **0640** | Runtime secrets. **Required** (`EnvironmentFile=` without `-`). |
| `.env` | `root:webdev` **0644** | Build-only `PUBLIC_SITE_URL=https://connectgroup.co` |

## Host steps (root)

Code + prod build + `.env.prod.staged` are synced by webdev under `/opt/Astro-production/connectgroup.co`. Then as **root**:

```bash
bash /opt/Astro-production/connectgroup.co/deploy/bootstrap-root.sh
```

That script: creates `site-connectgroup`, installs `.env` / `.env.prod`, unit, Caddy site, allowlists `connectgroup` in `site-ctl`, enables the service, loopback smoke.

Afterward: Cloudflare origin → `178.105.150.67`, SSL mode **Full** (not Full strict) while origin uses named CA `astro_origin_2026` with its paired manual cert/key loaders. Register domain + `INTERNAL_JOB_SECRET` in FLOW.

## Local

```bash
# from monorepo root
pnpm install
node scripts/fleet-local.mjs up connectgroup
# http://127.0.0.1:5085/
```
