# OG automation pilot — Royal Visa first

**Updated:** 2026-08-25  
**Kit source:** `~/Downloads/og pictures` (team OG automation pack)  
**Pilot site:** `Astro-production/royalvisa.ae`  
**Aaron blockers:** [AARON-PENDING.md](AARON-PENDING.md) → **AP-07** (Iberia `sharp`), **AP-08** (fleet OG / catalog `sharp`)

---

## What we will do (developer lane)

1. **Adapt** the kit for fleet reality (pnpm workspace, JSON blog posts — not Astro Content Collections / not per-site `npm install`).
2. **Pilot on Royal Visa only:** branded 1200×630 PNGs under `public/og/`, prefer those URLs in post/page OG tags when present.
3. **Commit generated PNGs** so presentation publish does **not** need `sharp` at build time on the host.
4. **Keep aside for Aaron:** adding `sharp` to the pnpm catalog / site `package.json`, lockfile update, Iberia dropping `passthroughImageService()`, and optional build-time `astro:build:start` regeneration for all sites.

## What Aaron will do (owner lane)

| Step | Detail |
|---|---|
| Catalog | Add `sharp` (and optionally `glob`) to `pnpm-workspace.yaml` → `catalogs.default` |
| Sites | Declare `"sharp": "catalog:"` on Iberia Workforce + Royal Visa (then roll out) |
| Lockfile | One `pnpm install` at fleet root on Linux; commit `pnpm-lock.yaml` |
| Iberia | Remove `passthroughImageService()` once site-local sharp is allowed |
| Later | Enable build-hook OG regen fleet-wide if we stop committing PNGs |

## Why Iberia used passthrough

Iberia Workforce was published with:

```js
image: { service: passthroughImageService() }
```

so the generic publisher could ship **without** a lockfile/`sharp` site dep. Assets were already WebP. That is **temporary** — see AP-07.

## Royal Visa content model (kit vs fleet)

| Kit assumption | Royal Visa reality |
|---|---|
| `getCollection()` markdown | `src/content/blog/*.json` |
| Drop-in `Base.astro` | Most posts are **legacy mirrors** (`legacy-page.js`); JSON shell is `blog.ts` fallback only |
| OG preference | Inject `/og/blog/{slug}.png` in **both** `legacy-page.js` and `blog.ts` (no `public/` existsSync) |
| `npm install sharp` | Fleet **pnpm** + Aaron catalog (AP-08) |

## Rollout order

1. Royal Visa pilot (scripts + committed `public/og/**` + OG URL preference) — **developer**
2. Aaron AP-07 + AP-08 (`sharp` catalog / Iberia image service)
3. Repeat pattern on next sites (Connect Group, Kinza, …) once catalog exists
4. Optional: switch from committed PNGs → generate on every build

## Local generate (until Aaron pins sharp)

```sh
cd Astro-production/royalvisa.ae
pnpm run og:generate   # resolves sharp from monorepo .pnpm store when possible
```

Do **not** run root `pnpm install` / lockfile edits for this pilot without Aaron.
