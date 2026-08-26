# OG automation pilot — Royal Visa first

**Updated:** 2026-08-26  
**Kit source:** `~/Downloads/og pictures` (team OG automation pack)  
**Pilot site:** `Astro-production/royalvisa.ae`  
**Aaron:** AP-07/AP-08 **done** on fleet tip `bfc113c0f` — site-local `sharp@0.35.3` on Iberia Workforce + Royal Visa; Iberia dropped `passthroughImageService()`. Goes live on those sites’ next publish. Build-time OG regen is now allowed for Royal Visa.

**Related:** [AARON-PENDING.md](AARON-PENDING.md) (AP-04 Redo `site-cms` still Aaron)

---

## What we will do (developer lane)

1. **Adapt** the kit for fleet reality (pnpm workspace, JSON blog posts — not Astro Content Collections / not per-site `npm install`).
2. **Pilot on Royal Visa only:** branded 1200×630 PNGs under `public/og/`, prefer those URLs in post/page OG tags when present.
3. **Committed PNGs** already ship without build-time sharp; **optional now:** use build-time `og:generate` / sharp on publish.
4. **Publish** Royal Visa (+ Iberia Workforce image service change) so Aaron’s `bfc113c0f` sharp pins go live.

## What Aaron already did (2026-08-26)

| Step | Detail |
|---|---|
| Sharp | Pinned `"sharp": "0.35.3"` on Iberia Workforce + Royal Visa (matched 14 sites already using it) |
| Lockfile | Regenerated offline (sealed store; 6-line diff) |
| Iberia | Removed `passthroughImageService()` — verified more webp variants, lower image weight |
| Vault | Sharp available to sealed builds for those pins |

## Royal Visa content model (kit vs fleet)

| Kit assumption | Royal Visa reality |
|---|---|
| `getCollection()` markdown | `src/content/blog/*.json` |
| Drop-in `Base.astro` | Most posts are **legacy mirrors** (`legacy-page.js`); JSON shell is `blog.ts` fallback only |
| OG preference | Inject `/og/blog/{slug}.png` in **both** `legacy-page.js` and `blog.ts` (no `public/` existsSync) |
| `npm install sharp` | Fleet **pnpm** + site-local `sharp@0.35.3` (Aaron) |

## Rollout order

1. Royal Visa pilot (scripts + committed `public/og/**` + OG URL preference) — **developer** (done for PNGs)
2. ~~Aaron AP-07 + AP-08~~ — **done** (`bfc113c0f`)
3. **Publish** Iberia Workforce + Royal Visa so sharp / image service go live
4. Repeat pattern on next sites; optional: generate OG on every build

## Local generate

```sh
cd Astro-production/royalvisa.ae
pnpm run og:generate
```

Do **not** edit `scripts/ci/` or invent lockfile bumps outside Aaron’s sealed flow.
