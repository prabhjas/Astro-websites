# Payroll Middle East — Astro mirror

Live: https://payrollmiddleast.org/

## Local URL

After build + fleet start:

**http://127.0.0.1:5110/**

Use trailing slashes on paths (matches live Rank Math URLs), e.g. `/employer-of-record/`.

```bash
# From monorepo root (Node ≥ 22)
export PATH="$PWD/.local/node-v22/bin:$PATH"   # if using repo portable Node
pnpm install
pnpm --filter payrollmiddleast-org-astro run import:sitemap:download
pnpm --filter payrollmiddleast-org-astro run build
node scripts/fleet-local.mjs up payrollmiddleast
```

Port **5110** · unit id `payrollmiddleast`
