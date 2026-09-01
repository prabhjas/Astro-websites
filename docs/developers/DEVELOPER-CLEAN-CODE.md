# Developer clean code — CWV-safe habits (no optimization work)

**Mushtaq, Tabish, Rajpal:** you own **features, content, and fixes**.  
**Prabhjas (deploy lead)** owns **CWV / Lighthouse 95+ optimization** after your work merges.

You still write code that **does not sabotage** performance. Cursor will **flag dirty coding** before commits.

---

## Your lane vs deploy lead

| You (developer) | Deploy lead (Prabhjas) |
|-----------------|------------------------|
| Content, layout, forms, redirects, blog fixes | Lighthouse 95+ waves |
| `check` + `build` pass | Full CWV optimization tiers |
| Local preview + screenshots | `fleet-lighthouse.mjs` on merge |
| Ticket → **Testing** | Intake → publish → **RELEASED** |

**Do not** paste `Type: CWV` or run optimization waves. If a page is slow, note it in Jira — lead schedules CWV separately.

---

## Mandatory before every commit

```bash
SITE_PKG="<package from Astro-production/<domain>/package.json>"
pnpm --filter "$SITE_PKG" run check
pnpm --filter "$SITE_PKG" run build
```

**Cursor blocks** if these fail.

---

## Dirty coding — Cursor will stop you

### Never commit (protected)

| Path | Why |
|------|-----|
| `.env`, `.env.prod`, `.env.example` | Secrets / publisher block |
| `src/env/server.ts` | Fleet-wide env |
| `packages/`, `caddy/`, `.github/workflows/` | Infra |
| Root `scripts/` (fleet tools) | Deploy lead only |
| `AGENTS.md` | Agent config |

### Never commit (dirty / noise)

| Path | Action |
|------|--------|
| `dist/`, `.astro/`, `node_modules/` | Build artifacts |
| `local/pids/`, `local/logs/`, `local/lighthouse-evidence/` | Local only |
| Multi-MB images / videos | Compress (WebP/AVIF) first |
| `*_v2.css` cache-bust renames | Forbidden — CF purge after publish |
| Unused WP plugin folders you did not need | Delete + `.gitignore` |

### Code habits (CWV-safe — not optimization)

| Do | Don't |
|----|-------|
| Add `width` + `height` on new images | Leave images without dimensions (CLS risk) |
| Use `loading="lazy"` on below-fold images only | Put `loading="lazy"` on hero / LCP image |
| `defer` on non-critical scripts | Add blocking scripts in `<head>` |
| Match existing site patterns (layouts, imports) | Drive-by refactors across unrelated files |
| One ticket scope — minimal diff | Mix multiple brands or unrelated fixes |
| Fix new `astro check` errors you introduced | Ship with new TS errors |
| Test every route in the ticket (desktop + mobile) | Push without opening pages locally |

### Speed-pass sites — do not revert

These already had deploy-lead CWV work. **Do not undo** their preload/font/JS patterns unless the ticket explicitly says so:

`c-uae.com`, `cbss.ae`, `connectfreelance.ae`, `connecthr.ae`, `connectresources.ae`, `connectresources.sa`, `connectstaff.ae`, `iberiaeor.com`, `kinzahr.com`, `spheavyrental.ae`

(Full list: [DEVELOPER-CWV-CHECKLIST.md Part D](DEVELOPER-CWV-CHECKLIST.md).)

---

## When Cursor says “dirty coding”

Fix before `done`:

1. Re-run `check` + `build`
2. `git status` — remove untracked noise
3. `git diff --name-only` — no protected paths
4. Re-test routes from your ticket

---

## Publisher blockers (read-only for you)

Skim [DEVELOPER-CWV-CHECKLIST.md Part A](DEVELOPER-CWV-CHECKLIST.md) so you know what **blocks publish**. You do not run the optimization checklist (Parts B–E) — deploy lead does.

---

*Owner: Prabhjas · Fleet: Connect-Group-Tech/Astro-websites*
