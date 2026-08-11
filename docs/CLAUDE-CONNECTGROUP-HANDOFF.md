# Claude / developer handoff — Connect Group Astro fleet

Paste this into Claude (or Cursor) when assigning work on this project.

**Updated:** 2026-08-11

**Current assignment (paste this):** [CLAUDE-FLEET-QUEUE-PROMPT.md](CLAUDE-FLEET-QUEUE-PROMPT.md) — 34-site queue FQ-01 nanoid · FQ-02 geo · FQ-04 peer-copy · FQ-03 memory note.

---

## Project identity

| Item | Value |
|------|--------|
| **Local path** | `/Users/prabhjasbajwa/Projects/Astro-websites` |
| **GitHub (Connect Group — primary)** | https://github.com/Connect-Group-Tech/Astro-websites |
| **Org** | `Connect-Group-Tech` |
| **Default work branch** | `work/astro-sites` (also sync with `main` regularly) |
| **Package manager** | **pnpm** only (`pnpm@9.15.9`, Node `>=22.12.0`) |
| **Live / cutover** | **34 sites** (28 live + next 6). Ports 5080–5124. List: [00-NEW-SITE-MASTER § Fleet work queue](00-NEW-SITE-MASTER.md#fleet-work-queue--34-sites) |

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

Caddy: one reviewed `/etc/caddy/Caddyfile`, mirrored by `caddy/Caddyfile.production`, with bare-host blocks, named CA `astro_origin_2026`, and paired manual loaders.
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

- **34 keep sites** on `work/astro-sites` / `work/live-fleet-34` (28 live + next 6). Live 28 often run from an **immutable release**, not a fresh `/opt` tree.
- Next-6 Caddy in git uses named CA `astro_origin_2026` (not `tls internal`). Staging pack: `/home/webdev/staging/fleet-cutover-20260810/`.
- **Do not run** staged `APPLY-NEXT6.sh` / signature scripts — Aaron rejected them (mutate attested release, no rollback).
- Active developer queue: [CLAUDE-FLEET-QUEUE-PROMPT.md](CLAUDE-FLEET-QUEUE-PROMPT.md).
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

**34-site queue (use this):** copy the fence in [CLAUDE-FLEET-QUEUE-PROMPT.md § Starter prompt](CLAUDE-FLEET-QUEUE-PROMPT.md#starter-prompt-copy-everything-in-the-fence).

Generic / other task:

```text
You are working on the Connect Group Astro websites fleet.

Local path: /Users/prabhjasbajwa/Projects/Astro-websites
GitHub: Connect-Group-Tech/Astro-websites (SSH host github-connectgroup)
Branch: work/astro-sites
Commits: author prabhjass-afk <prabhjass-afk@users.noreply.github.com> (repo-local -c only)
Server: webdev@178.105.150.67 via ssh -i ~/.ssh/id_ed25519_connectgroup ; deploy /opt/Astro-production/ ; sudo site-ctl only

Read docs/00-NEW-SITE-MASTER.md and docs/CLAUDE-FLEET-QUEUE-PROMPT.md first.
Follow fleet conventions: pnpm workspace, @connect/site-cms, per-site processes, .env vs .env.prod, no secrets in chat/git.

Task: <DESCRIBE THE TASK HERE>
```
