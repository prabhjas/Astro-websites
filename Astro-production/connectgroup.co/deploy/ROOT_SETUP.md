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

1. Create `site-connectgroup`; own `.data/`.
2. Install unit from `deploy/connectgroup.service`.
3. Install Caddy from `deploy/connectgroup.co.caddy` → `/etc/caddy/sites.d/`.
4. `caddy validate` + reload; `pnpm --filter connectgroup-astro run build`; `sudo site-ctl restart connectgroup` (after allowlisting the unit).

## Local

```bash
# from monorepo root
pnpm install
node scripts/fleet-local.mjs up connectgroup
# http://127.0.0.1:5085/
```
