# Agent notes — Connect Resources International Astro

This is the source-controlled baseline for the live simple Astro site at
`https://www.connectresourcesint.com` (fleet port `5098`).

## Required workflow

- Make source changes on a branch and review the diff before deployment.
- Build from the monorepo root with
  `pnpm --filter connectresourcesint-astro run build`.
- Keep the canonical public URL as `https://www.connectresourcesint.com`.
- Never commit `.env*`, `.data/`, `.astro/`, `dist/`, `node_modules/`, local
  backups, or a site-local lockfile.
- Use the monorepo `pnpm-lock.yaml`; do not introduce `package-lock.json`.
- Do not edit the live `dist/` as a substitute for changing and rebuilding
  source.

The initial imported-file hashes and provenance are documented in
`SECURITY_BASELINE.md`.
