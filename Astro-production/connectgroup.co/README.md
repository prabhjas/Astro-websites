# Connect Group — connectgroup.co (fleet)

Imported from the legacy single-site Astro repo into `Astro-production/connectgroup.co/`.

| | |
|--|--|
| Domain | https://connectgroup.co |
| Fleet port | **5085** |
| Unit | `connectgroup` |
| Package | `connectgroup-astro` |

## Local

```bash
# monorepo root
pnpm install
node scripts/fleet-local.mjs up connectgroup
# http://127.0.0.1:5085/
```

## Notes

- Still uses site-local `/api/internal/*` handlers (pre–site-cms fork). Bind `@connect/site-cms` in a follow-up like Evolution/SP.
- Deploy templates: `deploy/connectgroup.service`, `deploy/connectgroup.co.caddy`, `deploy/ROOT_SETUP.md`.
- Source Desktop copy kept at `/Users/prabhjasbajwa/Desktop/astro` for reference.
