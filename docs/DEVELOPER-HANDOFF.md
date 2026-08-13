# Developer handoff — Astro fleet releases

**Updated:** 2026-08-13 (Aaron — all 42 sites on the normal publisher)  
**Full boundary / controls:** [ASTRO-FLEET-AUTONOMOUS-RELEASE.md](ASTRO-FLEET-AUTONOMOUS-RELEASE.md)

All **42 websites**—including Connect Freelance and Connect Resources International—use the same normal process for presentation changes.

## Workspace

Open only **`/opt/Astro-development`**. Each site’s source is:

```text
/opt/Astro-development/Astro-production/<domain>/
```

Despite the folder name `Astro-production`, this is the **development** source checkout. **Do not edit** the separate live `/opt/Astro-production` tree.

Branch must be **`astro-fleet-development`**.

## Typical publish loop

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
git commit -S -m "Add new services page"
sudo /usr/local/sbin/astro-fleet-release publish
```

The developer does **not** run `git push`, restart the website, edit Caddy, or copy files into production.

## What happens automatically

The publisher:

1. Confirms the correct developer, checkout, and branch  
2. Requires a clean worktree and SSH-signed commit  
3. Checks that only permitted website files changed  
4. Scans for secrets and dangerous/protected changes  
5. Pushes that exact signed commit to GitHub  
6. Builds the affected website in an isolated environment  
7. Runs Astro checks and artifact validation  
8. Starts a private canary and checks homepage, routes, assets, 404s, headers, canonical URL, robots/sitemap ownership, and commit identity  
9. Atomically switches production to the new build  
10. Verifies the public result and records deployment evidence  
11. Automatically rolls back if the production proof fails  

It can handle **1–8** registered websites per invocation.

## How GitHub fits

```text
Developer edits /opt/Astro-development
        ↓
Signed local Git commit
        ↓
Root publisher validates it
        ↓
Publisher pushes exact commit to GitHub
        ↓
Isolated build and tests
        ↓
Canary
        ↓
Production switch and public verification
```

GitHub records source history; it does **not** directly deploy production. The root-owned publisher controls deployment and holds the protected deploy key.

If the build fails after the commit reaches GitHub, production does not switch. Make another signed **forward-only** commit and publish again — no reset or force-push.
