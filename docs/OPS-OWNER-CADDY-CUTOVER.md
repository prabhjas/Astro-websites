# Owner / ops only — Caddy + root cutover

**Audience:** fleet owner / root on the Astro host (`webdev@178.105.150.67`).  
**Not** a day-to-day developer phase. Developers prepare git artifacts only; **you** install live Caddy + systemd users at the end.

| | |
|--|--|
| **Git Caddy target** | [`caddy/Caddyfile.production`](../caddy/Caddyfile.production) |
| **Live path** | `/etc/caddy/Caddyfile` |
| **Detail (patterns)** | [CONNECT-CADDY-DEPLOYMENT.md](CONNECT-CADDY-DEPLOYMENT.md) |
| **Developer lifecycle** | [00-NEW-SITE-MASTER.md](00-NEW-SITE-MASTER.md) Phases 01–08 + 10 A–D |
| **After cutover verify** | [10-GO-LIVE-VERIFY-CHECKLIST.md](10-GO-LIVE-VERIFY-CHECKLIST.md) |

---

## Rule

| Developers do | Owner does (last) |
|---------------|-------------------|
| Add site block to `caddy/Caddyfile.production` in git | Copy that file to `/etc/caddy/Caddyfile` |
| Add `deploy/*.service` + `deploy/*.caddy` + `ROOT_SETUP.md` | `useradd`, install units, `site-ctl` ALLOWED |
| Rsync app under `/opt/Astro-production/<domain>/` as `webdev` | `systemctl enable --now`, Caddy validate + reload |
| Interim `nohup` loopback OK for smoke | Kill interim PIDs; run as `site-*` units |

Do **not** reload Caddy without `sudo -u caddy caddy validate --config /etc/caddy/Caddyfile`.

---

## Live Caddy inventory (nine cutover sites + launch six pending)

Only these domains belong in the **live** production Caddyfile until the next cutover batch:

| Port | Domain | Unit | Canonical |
|------|--------|------|-----------|
| 5080 | evolutionmiddleast.com | evolutionmiddleast | `https://www.evolutionmiddleast.com` |
| 5081 | cbss.ae | cbss | `https://cbss.ae` |
| 5082 | spheavyrental.ae | spheavyrental | `https://spheavyrental.ae` |
| 5083 | iberiaworkforce.com | iberiaworkforce | `https://iberiaworkforce.com` |
| 5085 | connectgroup.co | connectgroup | `https://connectgroup.co` |
| 5090 | eormiddleast.com | eormiddleast | `https://eormiddleast.com` |
| 5091 | connectstaff.ae | connectstaff | `https://connectstaff.ae` |
| 5092 | c-uae.com | cuae | `https://c-uae.com` |
| 5093 | kinzahr.com | kinzahr | `https://kinzahr.com` |

### Launch six (Aug 2026) — staged for root

| Port | Domain | Unit |
|------|--------|------|
| 5084 | connecthr.ae | connecthr |
| 5087 | connectfm.ae | connectfm |
| 5088 | connectresources.sa | connectresources-sa |
| 5089 | iberiaeor.com | iberiaeor |
| 5096 | connectfz.com | connectfz |
| 5097 | royalvisa.ae | royalvisa |

Developer staging (already on host):

- App trees: `/home/webdev/astro-cutover-env/launch-six/<domain>/app/`
- Caddyfile (includes six): `/home/webdev/astro-cutover-env/launch-six/Caddyfile.production`
- Bootstrap: `/home/webdev/astro-cutover-env/ROOT-BOOTSTRAP-launch-six.sh`
- Notes: `/home/webdev/astro-cutover-env/launch-six/LAUNCH-SIX-README.md`

```bash
sudo bash /home/webdev/astro-cutover-env/ROOT-BOOTSTRAP-launch-six.sh
```

Scaffolded but **out of live Caddy until ready:** peomiddleast, kpmpro, redo, etc. (see [FLEET-PORT-REGISTRY.md](FLEET-PORT-REGISTRY.md)).

---

## Aug 2026 batch — what developers already did

Before you run root:

- [x] Git: trailing-slash redirects, GTM `resolveEffectiveGtmConfig`, attribution merge (cuae/kinza), slim 9-site Caddyfile
- [x] App trees rsynced under `/opt/Astro-production/{eormiddleast.com,connectstaff.ae,c-uae.com,kinzahr.com}/`
- [x] `.env` (PUBLIC) + `.env.prod` (secrets) present for those four
- [x] Loopback interim Node on **5090–5093** (webdev `nohup`) — health 200
- [x] Evolution + Connect Group restarted with slash fix
- [x] Bootstrap script staged: `/home/webdev/astro-cutover-env/ROOT-BOOTSTRAP-nine-fleet.sh`
- [x] Slim Caddyfile staged: `/home/webdev/astro-cutover-env/Caddyfile.production`

---

## One command (Aaron / root)

On the Astro host as root:

```bash
sudo bash /home/webdev/astro-cutover-env/ROOT-BOOTSTRAP-nine-fleet.sh
```

That script:

1. Creates `site-eormiddleast`, `site-connectstaff`, `site-cuae`, `site-kinzahr`
2. Installs systemd units from each site’s `deploy/*.service`
3. Sets `site-ctl` ALLOWED to the nine units
4. Stops interim nohup PIDs on 5090–5093
5. Enables/restarts the four new units
6. Installs slim `Caddyfile.production` → `/etc/caddy/Caddyfile`, validates, reloads Caddy
7. Prints loopback `/api/health/` codes

### After the script

```bash
sudo site-ctl status eormiddleast connectstaff cuae kinzahr
curl -sS http://127.0.0.1:5090/api/health/
curl -sS http://127.0.0.1:5091/api/health/
curl -sS http://127.0.0.1:5092/api/health/
curl -sS http://127.0.0.1:5093/api/health/
```

Then run [10-GO-LIVE-VERIFY-CHECKLIST.md](10-GO-LIVE-VERIFY-CHECKLIST.md) for each new public domain (and Cloudflare SSL **Full**).

---

## Adding the next site later (owner checklist)

1. Confirm developer finished Phases 01–08 + local Phase 10 A–D.
2. Confirm `caddy/Caddyfile.production` in git already has the new block + HTTP one-hop host.
3. Confirm app + `.env.prod` exist under `/opt/Astro-production/<domain>/`.
4. As root: useradd → install unit → extend `site-ctl` ALLOWED → copy Caddyfile → validate → reload.
5. Run go-live verify checklist on the public hostname.
6. GTM/GA4: [OPS-OWNER-DYNAMIC-GTM-GA4.md](OPS-OWNER-DYNAMIC-GTM-GA4.md).
7. **Lead backup:** with the auto-discover restic script installed, a new site under `/opt/Astro-production/<domain>/` is included on the next nightly run — no per-site edit. If the host still has the old four-site script, refresh once (below).

---

## Urgent — refresh restic backup (all fleet leads)

**Finding (Aug 2026):** `/usr/local/sbin/restic-astro-fleet-backup` still hardcodes:

```bash
SITES=(evolutionmiddleast.com cbss.ae spheavyrental.ae iberiaworkforce.com)
```

Every site cut over since then stores real enquiries under `.data/leads/` (and Evolution/CBSS under `/var/...`) with **no backup**, while the timer reports success.

**Fix (root, once):** after `deploy-host/` is synced to the host:

```bash
sudo bash /opt/Astro-production/deploy-host/ROOT-REFRESH-RESTIC-BACKUP.sh
```

Dry-run must list connectgroup, kinzahr, c-uae, connectstaff, eormiddleast, connecthr, connectresources.sa, and any other live domain — not only the original four. Detail: [deploy-host/README.md](../Astro-production/deploy-host/README.md).

---

*Owner-only. Keep Caddy/root out of developer Phase 06 local sign-off.*
