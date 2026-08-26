# Aaron pending — fleet tracker

**Updated:** 2026-08-26 evening (Aaron reply)  
**Final Aaron doc:** [AARON-FINAL-HANDOFF.md](AARON-FINAL-HANDOFF.md)  
**Owner-only:** [AARON-OWNER-LANE.md](AARON-OWNER-LANE.md)

---

## Live

| Tip | Notes |
|---|---|
| Front sites | `fb7070fdc` (SP padding + Connect FM WA) and later tips as published |
| `packages/site-cms` AP-04 | On `astro-fleet-development` as `159ff7081` — **already in every site build**; no separate package publish |

## Waiting on Aaron (backend refresh — do not Caddy-workaround)

- `/robots.txt`, `/llms.txt`, sitemaps, `/runtime-gtm.js` are **backend by design**
- Backends pinned to old releases (systemd drop-in); front publish does not update them
- Aaron deciding gated backend refresh (Pipedrive token + lead store)
- **No action** from developer until Aaron says backends refreshed

## Cleared / not Aaron

- Connect Freelance favicon — hashes match; local cache only
- SP `/css/migration-overrides.css` — CF purged; SP now auto-purges `/css/` on publish
- Sticky `public/` assets elsewhere — tell Aaron exact path for purge + site purge list

## Developer next

- Ship **Redo.ae site files** (SEO / redirects / favicon) — package already available in builds
