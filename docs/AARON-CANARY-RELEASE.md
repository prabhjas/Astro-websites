# Aaron canary — private test of a new release (port 5999)

**Date:** 2026-08-11  
**Source:** Aaron’s release process (28 live units).  
**Not public.** Caddy never points at 5999. Live traffic stays on the current attested release until `switch`.

A canary is a **temporary, private** run of the *new* release **before** it is exposed. One site at a time, real production env, loopback only.

---

## Why

Live Node reads the immutable release (`ExecStart` → attested tree).  
`rsync` into `/opt` or editing `dist/` is not a test of what will go live.

Canary answers: “If we `switch` this SHA, will this unit boot, stay up, and serve the right app?”

---

## How Aaron runs it (do not improvise)

For each of the 28 sites, **one at a time**:

1. Start **only that site** from the **candidate release** tree.  
2. Bind **`127.0.0.1:5999`** (not the live port 5080–5118).  
3. Load the **real** `.env.prod` (same secrets / Pipedrive / analytics as live).  
4. Run as the **real** `site-*` user (same UID that will own the live PID).  
5. Check the list below.  
6. **Stop and tear down** the canary before starting the next site.  
7. Only after all intended sites pass: `switch` drop-ins → live ports → CF-purge.

Never run two canaries at once (single 5999). Never leave 5999 up after the check.

---

## Checks (pass / fail)

| Check | Expect |
|--------|--------|
| Health | `GET http://127.0.0.1:5999/api/health/` → 200 (or site’s health path) |
| Homepage | `GET http://127.0.0.1:5999/` + `Host: <domain>` → 200 |
| Dependencies | Node boots; no missing `node_modules` / native addon crash |
| Config | Canonical / `PUBLIC_SITE_URL` / trailing-slash behaviour match live |
| Analytics | GTM/GA loader present when that site is supposed to have it |
| PID / listener | Process owner is `site-<unit>`, listen is `127.0.0.1:5999` only |
| Restart stability | Stop + start once more; still 200; no crash loop |

Change-specific extras (same Host header, still :5999):

- Signatures / banners → `GET /wp-content/uploads/…` → 200  
- Pipedrive → page HTML contains `lYRJ1mh0/meeting-with-connect-resources`, not `wODjrKiE`

Full page/SEO matrix after switch: [10-GO-LIVE-VERIFY-CHECKLIST.md](10-GO-LIVE-VERIFY-CHECKLIST.md).

---

## What we can do today (webdev)

| Step | webdev |
|------|--------|
| Local `pnpm --filter <site> build` | yes |
| Curl **live** origin on the real port | yes |
| Start candidate on **5999** with `.env.prod` as `site-*` | **no** |
| Read `.env.prod` | **no** (correct) |
| `switch` drop-ins after canary | **no** |

So we **cannot** run Aaron’s canary ourselves until he adds it to a constrained helper.

---

## What to ask Aaron (add to `release-ctl`)

Same helper as bake/switch — **not** write access to the attested tree:

```text
sudo release-ctl canary <release-id> <site>
sudo release-ctl canary-stop
```

`canary` must:

- start that site from `<release-id>` on `127.0.0.1:5999`
- `User=` / `EnvironmentFile=` identical to the live unit
- print the curl one-liners (or run them and exit non-zero on fail)
- refuse if 5999 is already taken

`canary-stop` kills the 5999 process only.

Then our loop is:

```text
bake <sha> <sites>
  → canary <new-id> <site>   # repeat per site, tear down each time
  → switch <new-id> <sites>
  → purge-cf <urls>
```

Until that exists, Aaron runs the 5999 pass; we only smoke live origin **after** he switches.
