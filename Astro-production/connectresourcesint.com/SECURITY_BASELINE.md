# Connect Resources International source baseline

This live application was imported into source control during the 2026-08-09
security remediation. Before this import, the host-local `.git/info/exclude`
explicitly hid the complete application directory even though Caddy and
systemd served its production build.

The import deliberately includes only reviewable source, public assets, and
deployment templates. It excludes `.env*`, `.data/`, `.astro/`, `dist/`,
`node_modules/`, dated dependency/build snapshots, and the site-local
`package-lock.json`. The monorepo `pnpm-lock.yaml` is the dependency lock.

## Imported source hashes

These SHA-256 values were calculated from the live source before copying. They
make the first committed baseline independently comparable with the preserved
host snapshot.

| File | SHA-256 |
| --- | --- |
| `.gitignore` | `3b7aba70d19a122beb8c3396c3e452cb51493a22f560485d3727a329b8e91c6c` |
| `astro.config.mjs` | `1c527750e8013171e8cc51245b2ad53fffca5bc3457aaf6770da30743c480ef7` |
| `deploy/connectresourcesint.com.caddy` | `5df6d88fe8a1df30fa1886fea4e8923f351c858867fcf09ca2bdf126bbca7301` |
| `deploy/connectresourcesint.service` | `8a4763dfd00a5f75e92ffcd3c1dade3cf12919492680858c9ff867484590d87f` |
| `package.json` | `21db281eb8cbd000fc8d508c7662dfe06c132b5637332c829b64a1e8395aefdf` |
| `public/business-help.webp` | `1aa218078ef8a0d9d2aaecab0114c045390125740928beb384d31605693a4e01` |
| `public/connect-logo.png` | `1516583222351cb1450cb1a8c7314032a79ce4dd2656ee6ddd861a31c9da7147` |
| `public/favicon.svg` | `82f171fa35a0574678b180ad7c87af123277fba6239938329c6210226dd8c64d` |
| `public/robots.txt` | `75e9cea09d70aeed627679cb2f7d39a03c6467574ff5ec992217f4676a55a0d1` |
| `src/pages/404.astro` | `0822895071096256468afa223a89a2e264323c1381a25a851b5edc9afdd4889d` |
| `src/pages/api/health.ts` | `cafc5d32a102c3ecf4e5d50b014b7d296fb339a64ae2dab9fac4c2de61e8b7d8` |
| `src/pages/index.astro` | `ba3232501e732783a83c35d777dbf0a89934c39bc3d4d4318bd3952d7b7d8a53` |
| `src/pages/sitemap.xml.ts` | `795cbfd037e308414dbe46a4cb1c7e6304d9d2d02465c26e758a96eb3d01f4dd` |
| `tsconfig.json` | `11499cc834c5238123eabf730957dc2749969d49a1e80d8e8ba3dfcef76087d2` |

No secret or runtime-data value was read into this manifest. Any future source
change under this directory must be committed and reviewed like the other
production applications. After hashing, the three dependency specifiers in
`package.json` were normalized from exact versions to the monorepo catalog;
the resolved versions remain the same and the reviewed diff records that
intentional change.
