# Claude / developer handoff — Connect Group Astro fleet

Paste this into Claude (or Cursor) when assigning work on this project.

**Updated:** 2026-08-03

---

## Project identity

| Item | Value |
|------|--------|
| **Local path** | `/Users/prabhjasbajwa/Projects/Astro-websites` |
| **GitHub (Connect Group — primary)** | https://github.com/Connect-Group-Tech/Astro-websites |
| **Org** | `Connect-Group-Tech` |
| **Default work branch** | `work/astro-sites` (also sync with `main` regularly) |
| **Package manager** | **pnpm** only (`pnpm@9.15.9`, Node `>=22.12.0`) |
| **Live sites** | evolutionmiddleast.com · cbss.ae · spheavyrental.ae · iberiaworkforce.com |

Personal mirror (optional, not primary): `https://github.com/prabhjas/Astro-websites` (remote name `personal`).  
**Day-to-day push/PR target = Connect Group `origin`.**

---

## Connect Group GitHub — how to use it

### Account for commits on this repo

| Field | Value |
|-------|--------|
| GitHub user | `prabhjass-afk` |
| Commit author name | `prabhjass-afk` |
| Commit email | `prabhjass-afk@users.noreply.github.com` |

Use **repo-local** author only (do not change global git config):

```bash
git -c user.name="prabhjass-afk" -c user.email="prabhjass-afk@users.noreply.github.com" commit ...
```

### SSH remote (preferred)

```text
origin → git@github-connectgroup:Connect-Group-Tech/Astro-websites.git
```

SSH config alias on this machine:

```text
Host github-connectgroup
  HostName github.com
  IdentityFile ~/.ssh/id_ed25519_connectgroup
```

### HTTPS credential helper (if needed)

```bash
git -c credential.helper="store --file=$HOME/.git-credentials-connectgroup" push origin HEAD
```

Credential file (local, never commit): `~/.git-credentials-connectgroup`  
**Never print, paste, or commit PATs / tokens.**

### Clone (if starting fresh)

```bash
git clone git@github-connectgroup:Connect-Group-Tech/Astro-websites.git
cd Astro-websites
git checkout work/astro-sites
```

---

## Production host (Astro server)

| Item | Value |
|------|--------|
| SSH | `ssh -i ~/.ssh/id_ed25519_connectgroup webdev@178.105.150.67` |
| Alias | `astro-connectgroup` (same key) |
| Deploy root | `/opt/Astro-production/` |
| User | `webdev` |
| Restart sites | `sudo site-ctl restart <unit>` only (`evolutionmiddleast` \| `cbss` \| `spheavyrental` \| `iberiaworkforce`) |

**webdev cannot** edit `.env.prod` (root:`site-*` 0640). Secrets need root/Aaron.  
Preserve on sync: `*/.env.prod`, `*/.data/`, build `.env` (`PUBLIC_SITE_URL`).

| Domain | Port | systemd unit | Unix user |
|--------|------|--------------|-----------|
| evolutionmiddleast.com | 5080 | `evolutionmiddleast` | `site-evolutionmiddleast` |
| cbss.ae | 5081 | `cbss` | `site-cbss` |
| spheavyrental.ae | 5082 | `spheavyrental` | `site-spheavyrental` |
| iberiaworkforce.com | 5083 | `iberiaworkforce` | `site-iberiaworkforce` |

Caddy: `/etc/caddy/sites.d/*.caddy` with `http://` + `https://` + `tls internal` (not bare hostnames).  
Backups: restic under `/var/backups/astro-fleet` · templates in `Astro-production/deploy-host/`.

---

## Architecture (must follow)

- **Monorepo** — one pnpm workspace, catalog pins (Astro `7.1.6`, `@astrojs/node` `11.0.3`).
- **One Node process per domain** — `astro build` → `node dist/server/entry.mjs` (never `astro dev` in prod).
- **Shared CMS** — `@connect/site-cms` (`packages/site-cms`); sites bind via `src/cms.ts` + thin `/api/internal/*` mounts.
- **Env model**
  - Laptop: gitignored `.env` (secrets OK for local).
  - Server: `.env` = build `PUBLIC_SITE_URL` only; `.env.prod` = runtime secrets for systemd (`EnvironmentFile=` **without** leading `-`).
  - Never put `HOST`/`PORT` in env files.
- **Forms** — JSON `POST /api/contact` → file lead store → Pipedrive.
- **WP mirrors** — `public/wp-content/themes|plugins` are **static assets**, not running WordPress.

---

## First commands (local)

```bash
cd /Users/prabhjasbajwa/Projects/Astro-websites
corepack enable && corepack prepare pnpm@9.15.9 --activate
pnpm install
node scripts/fleet-local.mjs up evolutionmiddleast,cbss,spheavyrental,iberiaworkforce
node scripts/fleet-local.mjs smoke evolutionmiddleast,cbss,spheavyrental,iberiaworkforce
```

Ports: http://127.0.0.1:5080 … :5083

---

## Docs to open first (in-repo)

| Doc | Purpose |
|-----|---------|
| [README.md](../README.md) | Architecture overview |
| [CURSOR-RUN-FLEET.md](CURSOR-RUN-FLEET.md) | Clone / install / run |
| [CURSOR-CONVERT-STATIC-TO-ASTRO.md](CURSOR-CONVERT-STATIC-TO-ASTRO.md) | Add/convert a WP or static site |
| [CURSOR-WP-CLONE-MALWARE-SCAN.md](CURSOR-WP-CLONE-MALWARE-SCAN.md) | Scan WP clones for malware |
| [CONNECT-ASTRO-NEW-SITE-PLAYBOOK.md](CONNECT-ASTRO-NEW-SITE-PLAYBOOK.md) | Forms / FLOW / Pipedrive detail |
| [server-ops-only.md](server-ops-only.md) | Host facts + deploy footguns |
| [packages/site-cms/README.md](../packages/site-cms/README.md) | Shared CMS bind API |

---

## Current known state (Aug 2026)

- All four sites **live** on the Astro host.
- Fleet CMS / pnpm workspace / restic templates are in git.
- Deploy templates should use Caddy `tls internal` + required `EnvironmentFile=` (branch `work/astro-sites` may still have unmerged template fixes vs `main` — check before PR).
- SP Heavy Pipedrive: server `.env.prod` had bad/placeholder token; temporary webdev override `.env.webdev` + ACL was used. Prefer Aaron fixing `.env.prod` properly.
- `Astro-staging/` was removed from `main` — production only under `Astro-production/`.

---

## Rules for Claude / agents

1. Work in `/Users/prabhjasbajwa/Projects/Astro-websites` unless told otherwise.
2. Push to **Connect Group** `origin` with `prabhjass-afk` author; do not use personal GitHub as default.
3. Do **not** print or commit secrets, PATs, or `.env` / `.env.prod` / `.env.webdev` contents.
4. Do **not** change global git config.
5. Do **not** force-push `main`, or run destructive git/server commands unless explicitly asked.
6. On the server: read-only inspect OK; only `sudo site-ctl` for restarts; never overwrite `.env.prod` / `.data` with empty laptop files.
7. Prefer existing peer sites (Iberia/CBSS/Evolution/SP) over inventing new patterns.
8. After WP clone: run malware scan prompt from `CURSOR-WP-CLONE-MALWARE-SCAN.md`.

---

## Starter prompt (copy to Claude)

```text
You are working on the Connect Group Astro websites fleet.

Local path: /Users/prabhjasbajwa/Projects/Astro-websites
GitHub: Connect-Group-Tech/Astro-websites (SSH host github-connectgroup)
Branch: work/astro-sites
Commits: author prabhjass-afk <prabhjass-afk@users.noreply.github.com> (repo-local -c only)
Server: webdev@178.105.150.67 via ssh -i ~/.ssh/id_ed25519_connectgroup ; deploy /opt/Astro-production/ ; sudo site-ctl only

Read docs/CURSOR-RUN-FLEET.md and README.md first.
Follow fleet conventions: pnpm workspace, @connect/site-cms, per-site processes, .env vs .env.prod, no secrets in chat/git.

Task: <DESCRIBE THE TASK HERE>
```
