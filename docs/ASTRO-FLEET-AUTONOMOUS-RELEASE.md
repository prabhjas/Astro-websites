# Astro fleet autonomous release boundary

**Source:** Aaron (updated 2026-08-13) — authoritative server process.  
**Developer one-pager:** [DEVELOPER-HANDOFF.md](DEVELOPER-HANDOFF.md)

This system replaces developer access to production. The developer owns only
`/opt/Astro-development`; production releases, services, secrets, Caddy and
root-owned controls are inaccessible to that account.

**All 42 websites** (including Connect Freelance and Connect Resources
International) now use the same normal process for presentation changes.

## Developer workflow

Work on branch `astro-fleet-development`:

```sh
cd /opt/Astro-development
git status
git branch --show-current

SITE_PACKAGE='the-package-name'
pnpm --filter "$SITE_PACKAGE" run check
pnpm --filter "$SITE_PACKAGE" run build
git diff --check
git diff

git add -- Astro-production/example.com/
git commit -S -m "Describe the website change"
sudo /usr/local/sbin/astro-fleet-release publish
```

`publish` is the developer's only sudo authorization. The command accepts no
site, commit, path, shell or restart arguments. The old `site-ctl` and legacy
`release-ctl` grants are revoked. The publisher derives the exact signed HEAD
and affected sites itself.

Despite the folder name `Astro-production` under `/opt/Astro-development`, that
tree is the **development source**. Do not edit live `/opt/Astro-production`.

Normal timing for one site is roughly 20–90 seconds, depending on the Astro
build. Up to eight affected registered sites may be released in one signed
commit. The developer does not need owner approval for an ordinary presentation
release.

## Mandatory controls

- Clean, linear `astro-fleet-development` history; every new commit must carry
  the pinned developer SSH signature.
- GitHub receives the exact signed commit when `publish` runs (publisher holds
  the protected deploy key). GitHub records history; it does not directly deploy.
- The server independently repeats protected-path policy, credential scanning,
  the per-site type-check non-regression gate and the offline frozen build from
  the exact commit. Dependency, shared package, CI and control changes are
  denied in the autonomous lane.
- Build runs as a locked user without network access or production secrets.
- Canary must pass (homepage, routes, assets, 404s, headers, canonical,
  robots/sitemap ownership, commit identity) before an atomic production switch.
- The trusted backend remains sole owner of forms/API, robots, sitemaps, LLM
  files, jobs, leads and credentials.
- If production proof fails, the publisher rolls back automatically.
- If the commit reached GitHub but the build failed: forward-only fix commit +
  publish again — no reset or force-push.

## Fleet status

All **42** registered sites use the generic publisher for ordinary presentation
changes. Connect Freelance and Connect Resources International were onboarded
to that same lane (`b932c7128`). Cloudflare remains deliberately outside this
rollout’s scope unless the owner changes it.

Connect Resources may use a bounded, site-specific memory profile because its
legacy SSR corpus is larger; the publisher path is still the same.

## What we must not do (retired paths)

| Retired action | Why |
|----------------|-----|
| `sudo site-ctl …` | Grant revoked |
| `sudo release-ctl …` | Grant revoked |
| Edit or rsync live `/opt/Astro-production` | Publisher owns releases |
| Manual `systemctl restart` / Caddy reload | Owner/security only |
| Laptop `git push` then hope server pulls | Publisher pushes the exact signed commit |
| `scripts/ops/ROOT-DEPLOY-*.sh` / staging APPLY scripts | Superseded; do not run |
| Changing deps / `packages/` / workflows / Caddy in site content commits | Blocked by autonomous lane |

## Repo commits Aaron landed on `astro-fleet-development` (recent)

| Commit | What |
|--------|------|
| `fe42481bd` | Fleet development validation pipeline (CI + `scripts/ci/fleet-*`) |
| `b56da6064` | Type-check non-regression baseline |
| `b89c9251d` / `781c91a2c` | CBSS autonomous release proof add/remove |
| `1874c4529` | Cold-checkout fixes for security workflows |
| `b7f7d9009` | Remove retired Caddy credential snapshot from git |
| `ff94767a7` | Align Caddy/deploy guidance with 42-site fleet |
| `40e7caa1b` | CI: avoid downloading historical blob payloads |
| `b932c7128` | **Onboard Connect Freelance + Connect Resources International** to generic publisher (README + CRI `astro check` + hardcode www canonical) |
