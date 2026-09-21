# CWV scripts

Three tools used to optimize and verify Core Web Vitals across the fleet. Pair with
`docs/developers/` and the Fleet CWV Optimization Playbook.

## Setup (once)

```bash
cd docs/developers/scripts
npm install                      # lighthouse, chrome-launcher, penthouse, sharp
# Google Chrome must be installed. If it's not at the macOS default path, set:
export CHROME_PATH="/path/to/Google Chrome"
```

`penthouse` installs its own (older) puppeteer; `PUPPETEER_SKIP_DOWNLOAD=1 npm install`
is fine — the scripts drive **your installed Chrome** via `CHROME_PATH`, not a downloaded one.

## 1. Measure — `measure.mjs`

Best-of-N Lighthouse, mobile or desktop. Works against live URLs or a local proxy.

```bash
node measure.mjs https://connecthr.ae/ mobile 3
node measure.mjs https://127.0.0.1:8445/about-us/ desktop 2
```

Measure a **local** build behind a proxy that mimics production (HTTP/2 + gzip + immutable
cache), never the bare dev server. Take best-of-3; single runs swing a lot.

## 2. Optimize images — `optimize-images.mjs`

Recompress + downscale every image >200 KB **in place** (same path/format, only if smaller).
Zero reference breakage. Biggest safe win on image-heavy sites.

```bash
node optimize-images.mjs ../../../Astro-production/<site>/public --dry   # preview savings
node optimize-images.mjs ../../../Astro-production/<site>/public         # apply
```

## 3. Generate critical CSS — `gen-critical.mjs`

Extract above-the-fold CSS for one route (penthouse), from the CSS files you pass.

```bash
node gen-critical.mjs https://127.0.0.1:8445/about-us/ \
  ../../../Astro-production/<site>/src/data/critical/about-us.css \
  ../../../Astro-production/<site>/public/css/_head-bundle.css
```

After generating: it already strips `@import`; also inline the responsive utilities
(see `Astro-production/connecthr.ae/src/data/responsive-utils.css`) or the fold reflows.

## Reference implementations to copy from

- **Astro-component sites** (Connect HR, Connect Resources): `BaseLayout.astro`,
  `ElementorScripts.astro`, `src/lib/promote-hero.ts`, `src/lib/script-needs.ts`,
  `src/data/responsive-utils.css`, `src/data/cwv-manifest.json`.
- **Legacy-mirror sites** (Kinza HR, Connect Group): `src/lib/cwv-optimize.js`
  (Connect Group's is the most complete — defer + video facade + responsive-utils + hero preload).
