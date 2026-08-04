# Fleet port & site registry (Connect Group Astro)

**Share this with every developer.**  
Canonical list of domains, loopback ports, folders, and completion status.

| | |
|--|--|
| **Updated** | 2026-08-04 |
| **Machine registry** | `scripts/fleet-sites.json` (same ports / ids) |
| **Site folders** | `Astro-production/<domain>/` |
| **How to build a site** | [00-NEW-SITE-MASTER.md](00-NEW-SITE-MASTER.md) |
| **Caddy / server** | [CONNECT-CADDY-DEPLOYMENT.md](CONNECT-CADDY-DEPLOYMENT.md) |
| **Next free port** | **5124** |

### Status meanings

| Status | Meaning |
|--------|---------|
| **scaffolded** | Astro app in repo (`package.json` present). Can run via `fleet-local` after build. |
| **placeholder** | Empty reserved folder (`.gitkeep` only). Port is **locked** — do not reuse. Scaffold next using the master guide, then set `status` → `scaffolded`. |

`fleet-local up all` / `build` / `smoke` only run **scaffolded** sites. `list` shows every reserved domain.

---

## Full list (port order)

| Port | Domain | Folder | Status |
|------|--------|--------|--------|
| **5080** | evolutionmiddleast.com | `evolutionmiddleast.com` | scaffolded |
| **5081** | cbss.ae | `cbss.ae` | scaffolded |
| **5082** | spheavyrental.ae | `spheavyrental.ae` | scaffolded |
| **5083** | iberiaworkforce.com | `iberiaworkforce.com` | scaffolded |
| **5084** | connecthr.ae | `connecthr.ae` | scaffolded |
| **5085** | connectgroup.co | `connectgroup.co` | scaffolded |
| **5086** | connectresources.ae | `connectresources.ae` | scaffolded |
| **5087** | connectfm.ae | `connectfm.ae` | placeholder |
| **5088** | connectresources.sa | `connectresources.sa` | scaffolded (local ready; Caddy template in git) |
| **5089** | iberiaeor.com | `iberiaeor.com` | placeholder |
| **5090** | eormiddleast.com | `eormiddleast.com` | scaffolded |
| **5091** | connectstaff.ae | `connectstaff.ae` | scaffolded |
| **5092** | c-uae.com | `c-uae.com` | scaffolded |
| **5093** | kinzahr.com | `kinzahr.com` | scaffolded |
| **5094** | connectfreelance.ae | `connectfreelance.ae` | placeholder |
| **5095** | redo.ae | `redo.ae` | placeholder |
| **5096** | connectfz.com | `connectfz.com` | placeholder |
| **5097** | royalvisa.ae | `royalvisa.ae` | scaffolded (local Phase 01–08/10 green; Caddy in git) |
| **5098** | kpmpro.ae | `kpmpro.ae` | placeholder |
| **5099** | mbs-consultancy.com | `mbs-consultancy.com` | placeholder |
| **5100** | thefreelancergate.com | `thefreelancergate.com` | placeholder |
| **5101** | connectzone.ae | `connectzone.ae` | placeholder |
| **5102** | ngmanpower.com | `ngmanpower.com` | placeholder |
| **5103** | emiratiguard.com | `emiratiguard.com` | placeholder |
| **5104** | movey.ae | `movey.ae` | placeholder |
| **5105** | emiratisationgate.org | `emiratisationgate.org` | placeholder |
| **5106** | emiratisationgateway.com | `emiratisationgateway.com` | placeholder |
| **5107** | emiratisationhub.com | `emiratisationhub.com` | placeholder |
| **5108** | emiratisationnafis.org | `emiratisationnafis.org` | placeholder |
| **5109** | freelancerdxb.com | `freelancerdxb.com` | placeholder |
| **5110** | payrollmiddleeast.org | `payrollmiddleeast.org` | placeholder |
| **5111** | pittant.com | `pittant.com` | placeholder |
| **5112** | lladesigners.com | `lladesigners.com` | placeholder |
| **5113** | raadrecruitment.ae | `raadrecruitment.ae` | placeholder |
| **5114** | companyformationsaudi.com | `companyformationsaudi.com` | placeholder |
| **5115** | saudicompanyformation.com | `saudicompanyformation.com` | placeholder |
| **5116** | connectbusinesscenter.com | `connectbusinesscenter.com` | placeholder |
| **5117** | theuaegate.com | `theuaegate.com` | placeholder |
| **5118** | peomiddleast.com | `peomiddleast.com` | placeholder |
| **5119** | interlibya.com | `interlibya.com` | placeholder |
| **5120** | alburaq.ae | `alburaq.ae` | placeholder |
| **5121** | izi.ae | `izi.ae` | placeholder |
| **5122** | snapsale.ae | `snapsale.ae` | placeholder |
| **5123** | connectresources.info | `connectresources.info` | placeholder |

**Totals:** 44 sites · **13 scaffolded** · **31 placeholders** · next free **5124**

---

## Scaffolded sites (ready for local fleet work)

These already have an Astro app tree. Align new sites to the same standards (see master guide).

| Port | Domain | Notes |
|------|--------|--------|
| 5080 | evolutionmiddleast.com | Full CMS peer · live Caddy |
| 5081 | cbss.ae | Leads-heavy peer · live Caddy |
| 5082 | spheavyrental.ae | Full CMS peer · live Caddy |
| 5083 | iberiaworkforce.com | Leads + EN/ES · live Caddy |
| 5084 | connecthr.ae | In fleet; **not** in live Caddyfile yet |
| 5085 | connectgroup.co | Full CMS · live Caddy |
| 5086 | connectresources.ae | Scaffolded (dev merge) |
| 5088 | connectresources.sa | Full CMS WP mirror; local Phase 01–08/10 green; block in `caddy/Caddyfile.production` (apply on cutover) |
| 5090 | eormiddleast.com | Scaffolded · deploy templates + `Caddyfile.production` block ready |
| 5091 | connectstaff.ae | Scaffolded (dev merge) |
| 5092 | c-uae.com | Scaffolded (dev merge) |
| 5093 | kinzahr.com | Full CMS scaffold (local); **not** in live Caddyfile yet |
| 5097 | royalvisa.ae | Full CMS WP mirror; local Phase 01–08/10 green; block in `caddy/Caddyfile.production` (apply on cutover) |

“Scaffolded” ≠ production cutover complete. Production Caddy today covers Evolution, CBSS, SP Heavy, Iberia, Connect Group (see `caddy/Caddyfile.production`).

---

## Rules for developers

1. **Never invent a port** — take **5124+** from this file, then update `scripts/fleet-sites.json` and this doc in the same PR.
2. **Never reuse** a port from the table above.
3. New work starts in the reserved `Astro-production/<domain>/` folder (replace `.gitkeep` when scaffolding).
4. Follow **[00-NEW-SITE-MASTER.md](00-NEW-SITE-MASTER.md)** end-to-end (scan → convert → CMS → forms → local smoke → Caddy templates → server).
5. When the Astro app exists, set `"status": "scaffolded"` in `fleet-sites.json` and update this doc.
6. Copy patterns from a peer: leads-only → `cbss.ae` / `iberiaworkforce.com`; full CMS → `connectgroup.co` / `spheavyrental.ae` / `evolutionmiddleast.com`.

```bash
# From monorepo root
node scripts/fleet-local.mjs list
node scripts/fleet-local.mjs up connectgroup    # scaffolded only
node scripts/fleet-local.mjs smoke connectgroup
```

---

## Removed from earlier draft (not in final list)

These folders were deleted so they are not confused with active work:

- `digitizengrow.com`
- `vistaoutsourcing.com`
- `kubernesys.aekas.one`
- `rocketcarsell.com`
