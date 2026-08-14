# connectfreelance.ae — Astro fleet site

Connect Freelance (https://connectfreelance.ae/) — WordPress/Elementor → Astro SSR mirror.

| | |
|--|--|
| Port | **5094** |
| Fleet id | `connectfreelance` |
| Package | `connectfreelance-ae-astro` |
| CMS | `@connect/site-cms` `FEATURES_FULL_CMS` |
| Peer scaffold | `kinzahr.com` (WP mirror) |

Ordinary presentation changes use the fleet's signed developer commit and
`sudo /usr/local/sbin/astro-fleet-release publish`. The immutable secretless
frontend owns presentation pages and assets; the trusted backend retains forms,
internal APIs, runtime redirects/GTM, robots, sitemaps, LLM routes, secrets and
mutable data.

See `AGENTS.md` and `docs/00-NEW-SITE-MASTER.md` at the monorepo root.
