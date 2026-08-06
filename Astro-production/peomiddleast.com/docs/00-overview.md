# PEO Middle East — Astro mirror

Live: https://peomiddleast.com/

## Local URL

After build + fleet start:

**http://127.0.0.1:5118/**

Use trailing slashes on paths (matches live Rank Math URLs), e.g. `/employer-of-record/`.

```bash
# From monorepo root (Node ≥ 22)
export PATH="$PWD/.local/node-v22/bin:$PATH"   # if using repo portable Node
pnpm install
pnpm --filter peomiddleast-com-astro run import:sitemap:download
pnpm --filter peomiddleast-com-astro run build
node scripts/fleet-local.mjs up peomiddleeast
```

Port **5118** · unit id `peomiddleeast`
