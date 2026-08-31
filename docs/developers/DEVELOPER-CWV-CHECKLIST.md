# Developer Pre-Publish & Performance Checklist

Every site change **must** pass these checks before requesting a deploy.
Run through each section after your work is done — fix issues locally before pushing.

> **Full workflow:** [DEVELOPER-FLEET-HANDBOOK.md](DEVELOPER-FLEET-HANDBOOK.md) (Jira + testing + **Lighthouse 95+** program).  
> **CWV prompt:** [CWV-WAVE-PROMPT.md](CWV-WAVE-PROMPT.md) · **Automated local Lighthouse:** `node scripts/fleet-lighthouse.mjs --site <id> --paths /,/blogs/`

---

## Part A — Fleet Publisher Compatibility

The `astro-fleet-release publish` command runs automated checks. These are the known blockers and how to avoid them.

### A1. Protected Paths (will be BLOCKED)

The publisher rejects changes to certain files/patterns. **Never commit these in your site PR:**

- [ ] **`.env`, `.env.prod`, `.env.example`** — environment/credential files are protected. Do not modify or add new ones in your commits.
- [ ] **`AGENTS.md`** — treated as a protected path. Do not add this file to any site directory.
- [ ] **`src/env/server.ts`** — runtime environment parsing is protected. Do not modify environment variable schemas.
- [ ] **`packages/` directory** — shared fleet packages are owner/security-maintained. Do not modify anything under `packages/`.
- [ ] **Caddy config, deploy scripts, CI workflows** — infrastructure is off-limits. Never touch `caddy/`, `.github/`, or `scripts/` at the fleet root.

### A2. Unsafe Path Patterns (will be BLOCKED)

The publisher's `fleet-plan.mjs` rejects paths containing literal `..` (interpreted as directory traversal).

- [ ] **`[...slug].astro`, `[...path].ts`** — Astro catch-all routes contain `...` which triggers the unsafe-path check. If you modify these files, **the publisher will block them**. Workaround: coordinate with Aaron, or ensure the file is unchanged from the last accepted fleet commit.
- [ ] **Do not rename or create new files with `...` in the name** unless coordinated with the fleet owner.

### A3. TypeScript / Astro Check (will be BLOCKED)

The publisher runs `astro check` and compares error counts against the baseline. Any **new** errors = blocked.

- [ ] **Run `pnpm --filter <package-name> run check`** locally before pushing. Zero new errors.
- [ ] **Type imports must match fleet dependency versions.** Example: `cheerio` in the fleet may not export `Element` — use `any` or check the installed version's types. Don't assume your local `node_modules` types match the fleet.
- [ ] **Inline `<script>` in `.astro` files gets type-checked.** If your script uses `window.dataLayer`, `element.hidden`, `element.value`, etc., TypeScript will error. Add `// @ts-nocheck` at the top of the script block if needed.
- [ ] **Run `astro build` locally** — the publisher does a full build. If build fails, publish fails.

### A4. Archive Size Limit (will be BLOCKED)

The publisher creates a `git archive` of changed sites. If it exceeds **3 GiB**, it's blocked.

- [ ] **Don't commit large binary files** (videos, PSDs, unoptimized images) to the repo.
- [ ] **Optimize images before committing** — use WebP/AVIF, compress PNGs.
- [ ] If deploying many sites at once, coordinate batching (publisher handles 1–8 sites per publish).

### A5. Canary / Live Frontend Proof (will be BLOCKED)

After build, the publisher runs canary checks (homepage loads, correct status codes, routes work).

- [ ] **Ensure the site builds and serves correctly** — test locally with `node dist/server/entry.mjs`.
- [ ] **Homepage must return 200** with valid HTML.
- [ ] **If your site has routing issues**, the canary will fail. Test all major routes locally.

### A6. Clean Worktree Required

- [ ] **No untracked or modified files** on the host at publish time. If you see `BLOCKED: development worktree must be clean`, remove or commit stray files.

### A7. Cloudflare cache (use auto purge — do not invent v2 renames)

Aaron installed post-release Cloudflare purge. **Use that**, not filename cache-busting, as the default.

**Normal deploy flow (presentation lane):**

1. Fix the real files (same CSS/JS/image paths).
2. Signed commit on host `astro-fleet-development`.
3. `sudo /usr/local/sbin/astro-fleet-release publish`
4. Auto hook `astro-fleet-cloudflare-purge.path` runs `astro-cloudflare-purge after-release` for accepted sites.
5. Verify live URLs after purge.

**Do not (default):**

- Rename `file.css` → `file-v2.css` / `runtime-gtm.js` → `runtime-gtm-v2.js` just to bypass cache
- invent rsync/Caddy reloads

**If still stale after publish + auto purge:** escalate to Aaron (Caddy/origin cache policy or manual zone purge). Only use a path rename as a last resort with explicit approval.

**Manual purge (Aaron/root only — `webdev` cannot sudo this):**

```bash
sudo /usr/local/sbin/astro-cloudflare-purge site <site_id> --release-default --reason "describe why"
# examples: alburaq | connectstaff | lladesigners | royalvisa | kinzahr | connecthr
```

---

## Part B — Core Web Vitals & Performance

### B1. LCP (Largest Contentful Paint)

- [ ] **Preload the hero/LCP image.** Add `<link rel="preload" as="image" href="…">` in `<head>`.
- [ ] **Use `fetchpriority="high"`** on the LCP `<img>` element.
- [ ] **Do NOT lazy-load the LCP image.** Remove `loading="lazy"` from hero/banner images.
- [ ] **Serve images in WebP/AVIF** where possible, with correct `width`/`height` attributes.
- [ ] **Add a `poster` attribute** to hero `<video>` elements.

### B2. Fonts & Text Visibility

- [ ] **`font-display: swap`** on all `@font-face` declarations.
- [ ] **Trim Google Fonts requests** to only the weights/styles actually used. Remove stale preloads.
- [ ] **Preconnect to font origins** early: `<link rel="preconnect" href="https://fonts.googleapis.com">` and `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`.
- [ ] **Self-host fonts** when feasible.

### B3. JavaScript Loading

- [ ] **Defer third-party scripts.** jQuery, analytics, chat widgets must use `defer` or `async`.
- [ ] **Self-host vendor assets** (Bootstrap, Font Awesome, jQuery, owl-carousel, intl-tel-input).
- [ ] **No inline `<script>` in `<head>`** unless critical for rendering.

### B4. CSS Loading

- [ ] **Inline critical CSS** or preload it.
- [ ] **Remove unused CSS.**
- [ ] **No stale preloads.**

### B5. Content & Layout

- [ ] **No duplicate images** — strip WordPress `<noscript><img></noscript>` artifacts from blog content.
- [ ] **Set explicit `width` and `height`** on all images (prevents CLS).
- [ ] **Test with Lighthouse** — target **95+** on mobile for homepage + every changed route (see handbook Phase 4).
- [ ] **Check Network waterfall** — LCP resource should load in the first 2–3 requests.

---

## Part C — Developer Workflow (Run Every Time)

After finishing your work on any site, run these steps **in order** before pushing:

```bash
# 1. Type-check
pnpm --filter <package-name> run check

# 2. Build
pnpm --filter <package-name> run build

# 3. Test locally
PORT=<port> HOST=127.0.0.1 node dist/server/entry.mjs
# Open in browser, verify all changed pages

# 4. Lighthouse audit (Chrome DevTools or scripts/fleet-lighthouse.mjs — Mobile)
#    Target: Performance 95+, no new CLS/LCP regressions

# 5. Verify no protected files in your changes
git diff --name-only | grep -E '\.env|AGENTS\.md|src/env/server\.ts|packages/|caddy/|\.github/'
# If anything matches → remove from commit

# 6. Verify no unsafe paths
git diff --name-only | grep '\.\.\.'
# If anything matches → coordinate with fleet owner

# 7. Check file sizes (no large binaries)
git diff --cached --stat | grep 'Bin 0 ->'
# Review any new binary files for size
```

### Deploy + Cloudflare auto purge (host)

```bash
cd /opt/Astro-development
# branch must be astro-fleet-development; worktree clean; SSH-signed commit
sudo /usr/local/sbin/astro-fleet-release publish
# After success: astro-fleet-cloudflare-purge.path auto-runs
#   /usr/local/sbin/astro-cloudflare-purge after-release
# Verify live pages/assets. Do not rename to *-v2 by default.
```

`webdev` cannot run `astro-cloudflare-purge` manually (root-only). Publish is what triggers auto purge.

---

## Part D — Aaron's Speed Passes Reference

These optimizations are already applied. **Do not revert them.** If you touch these sites, ensure they remain.

| Pass | Sites | What was done |
|------|-------|---------------|
| 1 | **connecthr.ae**, **iberiaeor.com** | `font-display: swap` for General Sans; removed stale Nunito preload |
| 2 | **connectstaff.ae** (234 pages) | Deferred third-party jQuery load across all legacy pages |
| 3 | **kinzahr.com** (156 pages) | Added `preconnect` for Google Fonts origins on all legacy pages |
| 4 | **connectfreelance.ae**, **connectresources.sa** | Preloaded LCP hero image on homepages |
| 5 | **connectresources.ae** | Trimmed Google Fonts request to only rendered faces |
| 6 | **cbss.ae** | Self-hosted all vendor assets (Bootstrap, FA, jQuery, owl-carousel, intl-tel-input); added hero video `poster` |
| 7 | **spheavyrental.ae**, **c-uae.com** | Preloaded hero background images; dropped stale Nunito preload on C-UAE |
| 8 | **kinzahr.com** (156 pages) | Full `defer` conversion on all legacy page scripts |

### Sites with speed passes (alphabetical)

1. c-uae.com
2. cbss.ae
3. connectfreelance.ae
4. connecthr.ae
5. connectresources.ae
6. connectresources.sa
7. connectstaff.ae
8. iberiaeor.com
9. kinzahr.com
10. spheavyrental.ae

---

## Part E — Known Blockers Quick Reference

| Blocker | Cause | Fix |
|---------|-------|-----|
| `protected runtime/credential/deploy path` | Committed `.env.example`, `AGENTS.md`, `src/env/server.ts` | Remove from commit, revert to last accepted state |
| `unsafe path` | File path contains `...` (e.g., `[...slug].astro`) | Don't modify catch-all route files; coordinate with fleet owner |
| `Astro check added errors` | New TypeScript errors vs baseline | Run `astro check` locally, fix all errors |
| `cheerio Element type` | Fleet cheerio version differs from local | Use `Cheerio<any>` instead of `Cheerio<Element>` |
| `Git archive metadata/size differs` | Archive > 3 GiB | Split into smaller batches, optimize images |
| `live frontend proof failed` | Canary homepage check fails | Ensure site builds and serves homepage with 200 |
| `worktree must be clean` | Untracked/modified files on host | `git clean -fd` or commit/remove stray files |
| `networkless build failed` | Build error (missing deps, type errors) | Build locally first with `pnpm run build` |
| Stale CSS/JS on live | Cloudflare/origin still serving old asset | After publish, rely on auto CF purge; verify; escalate to Aaron if still stale — do not default to `*-v2` renames |

---

This checklist applies to **all 42 fleet sites**. Every developer must run through Parts A–C before requesting a deploy.
