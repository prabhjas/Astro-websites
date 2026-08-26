# Aaron — final handoff (updated 2026-08-26 evening)

**From:** developer presentation lane  
**Live front tip (recent):** `fb7070fdc` (SP padding + Connect FM WhatsApp)  
**Fleet branch tip:** `159ff7081` (`packages/site-cms` AP-04 — in every build)  
**Developer branch:** `work/astro-sites`

---

## Aaron reply — locked in

1. **site-cms** — already in builds via `159ff7081`. No separate package publish. Ship Redo site files.
2. **robots / sitemaps / llms / runtime-gtm** — backend by design; stale because **backend release pins** are old. Do **not** Caddy-301 or front-route. Wait for Aaron’s gated backend refresh.
3. **CF favicon** — hashes already match; was local cache.
4. **SP `/css/`** — CF purged; SP auto-purges `/css/` on publish going forward. Other sites may have the same gap for stable `public/` paths.

---

## Still waiting on Aaron

| Item | Notes |
|---|---|
| Backend refresh | So robots/sitemaps/llms/runtime-gtm serve current tip |
| SP GTM `GTM-PL2CQ48T` | Env / gtm.json if not done |
| Leads `/api/` + Caddy/TLS | Unchanged |
| CF purge for other sticky `public/` paths | When we report exact path |

---

## Developer now

- Publishing **Redo.ae** site-only (SEO absolutize, redirects, legacy links, favicon) — check baseline 0 kept (`@ts-nocheck` retained on LP script)

Docs: [AARON-PENDING.md](AARON-PENDING.md) · [AARON-OWNER-LANE.md](AARON-OWNER-LANE.md) · [AARON-REDO-SITE-CMS.md](AARON-REDO-SITE-CMS.md)
