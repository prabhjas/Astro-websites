# Connect Group Astro fleet — operating guide

This is the starting point for development, release, owner operations, and AI-assisted work on the Astro websites fleet.

**Current reference date:** 2026-08-14 UTC

**Repository:** `git@github.com:Connect-Group-Tech/Astro-websites.git`

**Developer checkout:** `/opt/Astro-development`

**Developer branch:** `astro-fleet-development`

**Node:** `>=22.12.0`

**Package manager:** pnpm `9.15.9` for the installed release environment

## Read before coding

Every human and every AI assistant—including ChatGPT, Claude, Cursor, and Codex—must read these files completely before changing code:

1. [`/opt/AGENTS.md`](AGENTS.md) — mandatory contributor and security rules.
2. [`/opt/ARCHITECTURE.md`](ARCHITECTURE.md) — system topology, trust boundaries, release transaction, secrets, and onboarding.
3. This README — day-to-day workflow.
4. Any nearer `AGENTS.md`, site README, `package.json`, `astro.config.*`, relevant policy, tests, and implementation files.

These documents are a precise guide, but they are not a substitute for inspecting the complete relevant code and live state. If code, installed behavior, and documentation differ, stop, verify the truth, and update the documentation with the fix.

## The system in one minute

The developer edits site source in `/opt/Astro-development`, creates a clean SSH-signed commit, and runs one constrained command. A root-owned publisher validates the exact Git history and paths, scans for credentials, pushes the exact commit to GitHub, builds offline without secrets or network, runs Astro checks, validates the artifact, starts a secretless canary, atomically switches the site, verifies the public result and SEO route ownership, and records evidence.

The developer does **not** receive production tokens and does **not** restart services, edit Caddy, copy files into production, or push with a production key.

```text
webdev source + signed commit
          |
          v
root-owned release admission and exact Git push
          |
          v
offline build -> artifact checks -> secretless canary
          |
          v
atomic presentation-current link -> router/Caddy -> public proof

Protected APIs, forms, secrets, PII and mutable data stay in a separate trusted backend.
```

The presentation `current` link is not a whole-site release pointer. The trusted backend has a separate root-controlled release authority and rollback. The two layers may legitimately use different signed commits; use the owner-only release-state command described below to see both.

For the full architecture and its exceptions, read [`ARCHITECTURE.md`](ARCHITECTURE.md).

## Roles

| Role | Responsibility |
|---|---|
| Aaron / direct root | Production secrets, Caddy, Cloudflare, systemd, registries, signers, onboarding, root control code, exceptional recovery |
| `webdev` | Site work in `/opt/Astro-development`, local checks, SSH-signed commits, constrained publish command |
| AI assistant | Read the references and full affected code, preserve unrelated work, test changes, keep docs current, never expand authority |
| Root publisher | Independent admission, exact push, isolated build, canary, switch, proof, evidence, and rollback/recovery |

Only Aaron/root adds or sees production secrets.

## Developer workflow: change and publish a registered site

### 1. Enter the correct checkout and read the rules

```bash
cd /opt/Astro-development
cat /opt/AGENTS.md
cat /opt/ARCHITECTURE.md
cat /opt/README.md
git status
git branch --show-current
```

The branch must be `astro-fleet-development`. Before editing, inspect the relevant site, its package scripts, Astro configuration, routes, imports, and any nearer documentation.

### 2. Make the smallest complete change

Normal site source is under:

```text
/opt/Astro-development/Astro-production/<domain>/
```

Typical content:

```text
<domain>/
├── package.json
├── astro.config.*
├── src/
│   ├── pages/
│   ├── components/
│   ├── layouts/
│   ├── content/ or data/
│   └── styles/
├── public/
├── .env.example       # key names and safe placeholders only
└── docs/              # when present
```

Do not add `.env`, `.env.prod`, `.data`, `dist`, `.astro`, `node_modules`, package-store content, tokens, credentials, or production data.

### Where each kind of change belongs

| Intended change | Source/control location | Release lane |
|---|---|---|
| Page copy, site component, layout, site CSS, metadata | `Astro-production/<domain>/src/...` | Normal signed site publish if policy permits |
| Versioned public image/font/static asset | `Astro-production/<domain>/public/...` | Normal signed site publish if policy permits |
| Safe environment key documentation | Site `.env.example` with names/placeholders only | Site publish if policy permits; never place values here |
| Production secret value | `/etc/astro-fleet/backend-env/<site>.env` or the documented exception path | Aaron/root only; never Git |
| Contact, lead, Pipedrive, auth, internal API, upload, or environment-loading behavior | Protected site backend code and/or `packages/site-cms` | Aaron/root security review |
| Shared implementation used by many sites | `packages/...` | Aaron/root shared-control review |
| Domain/site ID/port/unit | Source `scripts/fleet-sites.json`, installed `/etc/astro-fleet/router.json`, and reviewed runtime controls | Root onboarding/control transaction |
| Caddy host/routing/header/TLS behavior | Protected Caddy source plus `/etc/caddy/Caddyfile` through its installer | Aaron/root only |
| Cloudflare DNS/proxy/cache/account setting | Cloudflare control plane | Aaron only; separate from code release |
| Release policy, CI, systemd, sandbox, signer, deploy key | `.github`, `scripts/ci`, `scripts/ops`, `ops`, and installed root controls | Aaron/root only |
| Architectural/workflow change | Nearest component docs plus `/opt/AGENTS.md`, `/opt/ARCHITECTURE.md`, `/opt/README.md` | Same reviewed control change |

Installed-enabled note, verified 2026-08-14 UTC:
`/opt/ops/cloudflare-cache-purge-20260814` contains the source package for the
root-owned `/usr/local/sbin/astro-cloudflare-purge` helper and optional
post-release systemd path hook. The command and unit files are installed, and
`/etc/astro-fleet/cloudflare-cache-purge.json` contains a root-only zone map for
40 fleet sites present in the connected Cloudflare account. `lladesigners` and
`payrollmiddleast` are not configured because matching Cloudflare zones were not
listed. The root-only token file is installed at
`/etc/astro-fleet/cloudflare-cache-purge.token` with only Cloudflare `Cache
Purge` authority, and `astro-fleet-cloudflare-purge.path` is enabled/active for
future accepted presentation releases. Existing successful deployments were
marked processed so old release evidence is not purged retroactively.

### 3. Review and test locally

First inspect the site's exact package name and scripts:

```bash
SITE_DOMAIN='replace-with-domain.example'
node -p "require('./Astro-production/${SITE_DOMAIN}/package.json').name"
node -p "require('./Astro-production/${SITE_DOMAIN}/package.json').scripts"
```

Then run the relevant commands. For a normal site with `check` and `build` scripts:

```bash
SITE_PACKAGE='replace-with-package-name'
pnpm --filter "$SITE_PACKAGE" run check
pnpm --filter "$SITE_PACKAGE" run build
git diff --check
git diff -- "Astro-production/$SITE_DOMAIN"
git status --short
```

Also test the changed routes, responsive behavior, links, assets, status codes, browser console, and applicable SEO metadata. If shared behavior is involved, run the relevant shared tests even if the automatic lane will ultimately reject the path for root review.

### 4. Create a signed commit

Stage only the intended paths:

```bash
git add -- "Astro-production/$SITE_DOMAIN/path/to/changed-file"
git diff --cached --check
git diff --cached
git commit -S -m "Describe the site change"
git status --short
```

The worktree must be completely clean before publishing. All commits since the last accepted release must form a forward, linear chain and must be SSH-signed by an allowed signer. Merge commits and unsigned commits are blocked.

If signing is not configured or `git commit -S` fails, stop and ask Aaron to repair the signer configuration. Do not create an unsigned fallback commit.

### 5. Publish

```bash
sudo /usr/local/sbin/astro-fleet-release publish
```

That is the developer's complete production command. Do **not** run a separate `git push`, `systemctl restart`, Caddy reload, copy-to-production command, or symlink change.

The publisher accepts one to eight changed, already onboarded sites at a time. It prints structured JSON on success and `BLOCKED: ...` with exit code 77 on a policy or verification failure.

The controller pushes the validated commit before the isolated build. If build, canary, or live proof then fails, production and the accepted commit do not advance, but the attempted commit remains on the remote branch. Make a new signed forward fix commit and publish again. Never reset or force-push it away.

### 6. If it is blocked

Do not bypass or weaken the gate. Send Aaron:

- the exact `BLOCKED:` message;
- the intended site and change;
- `git status --short`;
- the full commit SHA from `git rev-parse HEAD`;
- which local checks passed.

Do not paste secrets, delete recovery files, force-push, rewrite the commit, restart the site, or manually copy build output as a workaround.

## What happens during `publish`

The installed root controller—not code in the candidate commit—performs the production decision:

1. Verifies the caller, checkout ownership, branch, clean status, root authorities, and last accepted commit.
2. Requires a signed, forward, non-merge commit chain.
3. Rejects protected paths and credential-like content.
4. Produces an exact one-to-eight-site deployment plan from root-pinned policy and the live registry.
5. Reserves bounded disk headroom.
6. Pushes the exact validated SHA to `origin/astro-fleet-development` with a restricted root deploy key.
7. Creates an 8 GiB isolated build workspace with no network and no production secrets.
8. Uses the pinned offline pnpm store, runs the reviewed Astro check/build commands, and validates size, type, link, and artifact limits.
9. Publishes an immutable candidate and runs a secretless canary.
10. Writes a durable presentation-switch journal and atomically updates each site's presentation `current` link.
11. Verifies live HTML, the exact commit identity, routing, and backend ownership of `robots.txt`.
12. Advances the accepted commit and writes root-owned evidence under `/var/lib/astro-fleet/deployments`.

Interrupted releases are handled by `astro-fleet-recover.timer`, which invokes the controller's `recover-pending` operation. Manual deletion is not recovery.

This transaction changes and rolls back the presentation layer only. It neither changes nor claims to roll back the trusted backend. Backend code, service and persistent-data changes require their own root-controlled transaction.

### GitHub's role

The publisher records the exact accepted source commit on GitHub. Current production authorization is performed by the root-owned server publisher; it does not rely on a developer-editable GitHub workflow to approve itself. GitHub can run additional checks and provides collaboration/audit visibility, but a green GitHub badge alone does not deploy production.

## Changes allowed in the fast lane

The exact installed policy always wins. Generally eligible changes are scoped to already registered site directories and may include:

- page copy and content;
- layouts and components;
- site-specific Astro pages and presentation behavior that remain within policy;
- styles;
- versioned images and other reviewed public assets;
- site documentation accompanying a real site change.

Machine acceptance does not eliminate code review. The developer and AI must inspect the complete affected behavior, especially browser scripts, external requests, forms, redirects, dynamic HTML, and SEO.

## Changes requiring Aaron/root review

The automatic lane blocks or must not be used for:

- `.github/`, `caddy/`, `ops/`, `packages/`, `scripts/ci/`, `scripts/ops/`;
- `scripts/fleet-sites.json`, root dependencies, lockfile, or workspace controls;
- shared CMS code or a change affecting many sites;
- contact, lead, Pipedrive, email, authentication, internal API, environment-loading, upload, or secret behavior;
- Caddy, Cloudflare, DNS, TLS, ports, service identities, systemd, routing, firewall, signers, deploy keys, or release tooling;
- production environment/state files;
- onboarding a new site.

These changes need an explicit root-controlled transaction, independent review proportional to risk, rollback preparation, installation evidence, and post-install proof.

Legacy developer shortcuts such as unrestricted `site-ctl`, the earlier `release-ctl`, direct restarts, or root deployment scripts must not be re-enabled alongside this publisher. They create a second state machine and bypass the single release lock and evidence trail.

## Secrets

### Rules

- Aaron/root is the only production secret administrator.
- Never put a production secret in Git, `/opt/Astro-development`, `.env`, `.env.prod` under a site source tree, chat, WhatsApp, shell history, CLI arguments, screenshots, logs, or test output.
- `.env.example` contains names and safe placeholders only.
- Local work uses synthetic/non-production values.
- `webdev` can neither read the protected secret directories nor use the publisher to print them.

### Production locations

| Scope | Root-controlled path |
|---|---|
| Generic trusted backends | `/etc/astro-fleet/backend-env/<site>.env` |
| Connect Freelance trusted backend | `/etc/astro-release/env/connectfreelance.env` |

The parent directories are root-only and the files are root:root `0600`. The trusted service process consumes its own environment; the secretless presentation frontend receives none of it.

### Pipedrive token

Production currently uses **one shared Pipedrive token value across 41 Pipedrive-enabled services**. Other settings remain per site.

Aaron rotates it interactively with:

```bash
sudo /usr/local/sbin/astro-pipedrive-token-rotate
```

The tool prompts twice without echoing the token, validates Pipedrive, updates all 41 protected environment files transactionally, restarts and verifies services in bounded batches, proves `webdev` cannot read the new value, and stores non-secret evidence under `/var/lib/astro-fleet/token-rotations`.

If interrupted, Aaron uses:

```bash
sudo /usr/local/sbin/astro-pipedrive-token-rotate --resume
```

Never supply the token as an argument. Never manually run bulk search/replace over environment files.

The 2026-08-12 rotation completed successfully: 41 environment files converged to one valid token, previous inconsistent values were removed from active use, and the tool reported `webdevCanRead:false`.

## Forms and lead delivery

Trusted backends own public contact submission, protected lead storage, and Pipedrive delivery. The generic secretless frontend does not receive the Pipedrive token or lead data.

Critical live-data note, verified 2026-08-13 UTC: `/opt/Astro-production` is not an old backup. Thirty-two active lead stores resolve to `/opt/Astro-production/<domain>/.data/leads` because their services retain that working directory even while executing code from immutable release artifacts; 28 such directories already exist. CBSS and Evolution Middle East use dedicated absolute `/var` paths, seven launcher-managed sites use `/var/lib/astro-fleet/backend-data/<site>/leads`, and Connect Freelance uses `/var/lib/astro-sites/connectfreelance/data/leads`. Never delete or prune `/opt/Astro-production` or a `.data` tree as release cleanup. Stored leads may not yet have reached Pipedrive.

Live note, verified 2026-08-13 UTC: production now maps Pipedrive “User Landed On” from `landingPageUrl`, not `referrerUrl`, across the 41 Pipedrive-enabled trusted backends. This was accepted through an owner-controlled protected backend switch through signed source commit `c34649d756cef0690f596a1125b358cf2085b749`, with individual backends using the relevant canaried artifact from the signed `12fe0ee78` → `bffa78bf` → `c34649d7` chain; future edits to this behavior remain protected contact/Pipedrive work, not normal presentation-only work.

After the token rotation and site-specific contact-delivery repairs on 2026-08-12, authorized end-to-end submissions were verified on:

- `connectresources.ae`
- `connectresources.sa`
- `c-uae.com`
- `connecthr.ae`
- `connectfreelance.ae`
- `mbs-consultancy.com`
- `raadrecruitment.ae`

All seven were confirmed as direct deliveries retrievable from Pipedrive with HTTP 200. Evidence is root-only under `/var/lib/astro-fleet/contact-delivery-fixes/fix-20260812T175907Z-c38ec075063f986b`.

Production form submissions create real contacts/leads. Do not perform another submission without explicit authorization and a clearly marked test identity. Current notification-recipient configuration is empty, so Pipedrive plus the protected file store—not email—is the delivery source of truth.

## SEO, robots, and LLM crawlers

The required post-rollout routing model is crawler-friendly:

- public pages are available through normal HTTPS and can be served by the fast secretless frontend;
- `robots.txt`, every robots-advertised sitemap document, LLM discovery files, and other protected SEO/control routes remain on the trusted backend;
- presentation redirects may use 301/302/303/307/308 only with exactly one safe root-relative destination, revalidated by the trusted router; absolute/cross-domain redirect data stays backend-owned;
- Caddy and the site router preserve explicit route ownership;
- the release controller proves backend ownership of `robots.txt` after switch.

Shared HTTP-policy/router maintenance is a separate Aaron/root Lane B operation.
On 2026-08-13, current manifest
`b51b14c9e17c2c2a03d3585b82f957264be59daba878aaba3fb43f96740b8801`
installed the corrected 42-site controls and completed the isolated Connect
Resources canary plus fleet-wide post-install proof. Runtime transaction
`runtime-update-7c93d4b730a0466c96500862e5aa0a1f` changed the shared response
policy so ordinary conditional static-asset responses with status 304 remain
bodyless frontend responses instead of being misclassified as redirects and
converted to 502. The proof performs a real ETag/If-None-Match exchange and
requires a frontend-routed, commit-bound 304 with no `Location`. Caddy,
frontend sockets, trusted backends, and Cloudflare remained outside the
four-file transaction. The committed evidence is under
`/var/lib/astro-fleet/runtime-updates`; canary/post-install remained within one
boot, and the cross-boot path remains rollback-only. The exact 42 frontend
sockets, 41 per-site routers, and global router are enabled for boot. Interrupted
writes and detached child processes remain bounded and reconciled before the
shared fleet lock is released.

The runtime response-policy proof is enforced at the site-router boundary.
Existing Caddy directives and Cloudflare may add their own response headers
after that boundary; changing those edge headers remains a separate reviewed
owner operation and was not part of this Lane B transaction.

For any page/template change, still review canonical URL, indexability, status code, title/description, structured data, language/hreflang, social metadata, internal links, sitemap presence, mobile output, and crawler accessibility. Security isolation preserves the SEO capability; it does not make every content change automatically good SEO.

## New site onboarding

Adding source under `Astro-production/<domain>` is only the first step. A new site is not eligible for normal `publish` until Aaron completes a reviewed root commissioning transaction.

Required onboarding work:

1. Complete site source, package scripts, build, check, assets, routes, 404, and SEO.
2. Assign and verify a unique site ID, domain, unit, public port, and backend port.
3. Update the source registry and the root-installed router authority through the protected control lane.
4. Create dedicated service identities, immutable release/current state, and protected persistent-data locations.
5. Have Aaron create production secrets directly in root-controlled storage. Do not use a developer-provided `.env.prod.seed` as production authority.
6. Install and prove the trusted backend, contact/internal APIs, secret access boundaries, and state ownership.
7. Build and canary the secretless presentation artifact.
8. Install/verify the site router and Caddy route.
9. Configure Cloudflare DNS/proxy/TLS separately under Aaron's account control.
10. Verify loopback and public health, homepage, changed pages, assets, 404, headers, robots, sitemaps/LLM files, canonical metadata, and an explicitly authorized contact delivery.
11. Record rollback, evidence, backup, monitoring, and secret-rotation coverage.

Do not reuse a historical one-time batch cutover script for future sites without a new review. The detailed checklist and rationale are in [`ARCHITECTURE.md`](ARCHITECTURE.md).

## Current production status

Observed on 2026-08-13:

- 42 sites are present in the installed fleet registry.
- All 42 presentation sockets are enabled through the frontend boot target. At the 2026-08-13 release-state audit, 41 frontend services were active; `astro-fleet-front@eormiddleast.service` was deliberately stopped while its socket remained enabled because EOR's public router is on the documented trusted-backend fallback. The 41 templated site-router units and the global router are active and enabled through their boot targets.
- 41 trusted services are Pipedrive-enabled.
- Caddy is active, and its administration endpoint is the protected Unix socket `/run/caddy/admin.sock`; TCP `:2019` is not exposed.
- The installed shared HTTP runtime keeps every robots-advertised sitemap document on the trusted backend and safely relays reviewed root-relative canonical redirects.
- The reviewed Connect Resources, C-UAE, and EOR Middle East resource profiles and root-owned frontend launcher are installed. Connect Resources uses a direct 768 MiB V8 old-space cap, `MemoryHigh=1250M`, `MemoryMax=1536M`, `MemorySwapMax=256M`, and no forced runtime limit. C-UAE uses a direct 384 MiB old-space cap, `MemoryHigh=640M`, `MemoryMax=768M`, `MemorySwapMax=128M`, and no forced runtime limit. Both stayed on the same invocation beyond the former 15-minute recycle boundary. EOR remains intentionally stopped behind its trusted-backend fallback with its socket listening.
- Lane B runtime transaction `runtime-update-7c93d4b730a0466c96500862e5aa0a1f` is committed under manifest `b51b14c9e17c2c2a03d3585b82f957264be59daba878aaba3fb43f96740b8801`; its isolated Connect Resources canary and 42-site fleet-wide post-install proofs are retained in the root-owned journal. The proof covered 42 homepages, robots and sitemap entrypoints, 138 sitemap documents, 96 sitemap children, 132 direct-frontend sitemap denials, 40 canonical redirects, and a real conditional-cache 304. The policy update used the guarded canary/fleet restart sequence and left EOR stopped behind its documented backend fallback. A post-commit release-state probe reported zero errors, and sampled Caddy traffic after the commit timestamp contained zero 5xx responses.
- Hetzner Cloud volume `106610654` is mounted at `/mnt/HC_Volume_106610654`; `/var/lib/astro-fleet/releases` and `/var/lib/astro-fleet/builds` are bind-mounted from that volume. This storage move was verified on 2026-08-13 with fstab validation, all 42 current release artifacts resolving, no failed fleet units, disk headroom passing the publisher's one-site and eight-site admission thresholds, and a paced restart of the secretless frontend workers so no process kept a deleted pre-volume `/release` mount.
- The old local `/opt/deploy-backups` deployment snapshot tree was removed on 2026-08-13 after proof showed zero effective systemd references, zero real live process references, and no mounts under it. The 33 inert systemd drop-ins that still mentioned that retired path were disabled into transaction `/var/lib/astro-fleet/transactions/disable-stale-deploy-backups-dropins-20260813T180146Z-294647` after proving effective service properties were unchanged. This directory was not Hetzner Backups; Hetzner backups are external server snapshots and remain independent.
- `astro-fleet-storage-maintenance.timer` is installed and enabled. It runs `/usr/local/sbin/astro-fleet-storage-maintenance prune --apply` about every six hours, takes the same `/run/astro-fleet-control.lock` as release transactions, protects anything referenced by current symlinks, effective systemd properties, or live processes, keeps at least one previous unreferenced release per site, prunes stale build workspaces, and records non-secret evidence in `/var/lib/astro-fleet/storage-maintenance`.
- Journald is capped by `/etc/systemd/journald.conf.d/90-astro-fleet-storage.conf` at `SystemMaxUse=1G`, `SystemKeepFree=20G`, and `MaxRetentionSec=14day`. Caddy access logs use their own size-rolling files under `/var/log/caddy`.
- `/opt/Astro-production` is live production state, not an old-release cache. Thirty-four trusted services use a site directory there as their effective working directory; 32 active lead-store paths resolve below those site trees, and 28 of those lead directories already exist. Relative `LEAD_STORE_DIR=.data/leads` settings make this dependency easy to miss. Never delete, prune, relocate, or grant developer access to this tree as a disk-cleanup shortcut; migrate and prove each persistent-data path first.
- The root-only read-only release-state auditor is installed as `/usr/local/sbin/astro-fleet-release-state`, with an hourly timer and a path trigger after accepted release-control changes. Final installation transaction `release-state-control-20260813T192704Z-326868` succeeded. Its 2026-08-13 probed audit mapped all 42 presentation and trusted-backend authorities with zero errors and one explicit warning: `connectresourcesint` remains an unversioned legacy trusted backend. The other 41 backend releases and presentation releases carry independently versioned source commits; this is expected and must not be treated as a requirement to force both tiers to one release.
- Host ACLs explicitly deny `webdev` access to `/opt/Astro-production`, `/etc/astro-release`, `/var/lib/astro-fleet`, and `/opt/ops`; verification as `webdev` confirmed those paths are denied while `/opt/Astro-development/Astro-production` remains writable. As verified on 2026-08-14, `/etc/astro-fleet` is non-listable to `webdev`, with traverse-only access to the parent and read access only to the public, root-owned `/etc/astro-fleet/allowed_signers` file required for constrained publisher SSH signature verification. Protected `/etc/astro-fleet/router.json`, `sites`, `backend-sites`, `router-sites`, and `backend-env` paths remain explicitly denied. The only allowed sudo command remains `sudo /usr/local/sbin/astro-fleet-release publish`.
- Connect HR's root-controlled runtime GTM value is `GTM-P7XTGMV3,GTM-5WFZ2Z2`; `/runtime-gtm.js` was verified after restarting only `connecthr.service`.
- Kinza's trusted backend `kinzahr.service` now runs the installed `1dfcf321917eebf9b37039315e27820ed63a34e2-kinzahr` release artifact on port `15093`. Caddy adds `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet` and `Cache-Control: no-store, private` for `/enhanced` routes. `enhanced-conversions.service` and `.timer` are installed and the timer is enabled for boot, but the timer is intentionally not active until Aaron deliberately starts it because starting a persistent timer may immediately upload conversions.
- Protected Pipedrive metadata source chain through commit `c34649d756cef0690f596a1125b358cf2085b749` is accepted in production. Transaction `/var/lib/astro-fleet/transactions/pipedrive-backend-switch-1786640578-a314730961a64a18b33d4c8a54de8566` switched and proved all 41 Pipedrive-enabled trusted backends from canaried artifacts across the signed `12fe0ee78` → `bffa78bf` → `c34649d7` chain, then advanced `accepted.json`.
- EOR Middle East's public presentation path is temporarily routed directly to the trusted backend because its secretless frontend socket rebuilt a high backlog under traffic. Transaction `/var/lib/astro-fleet/transactions/eormiddleast-backend-fallback-1786641829-f2b97d516d1dbd12f5ed4476e5d6a97d` set router `frontPort=25090`, stopped only `astro-fleet-front@eormiddleast.service`, and proved home/robots backend routing. The final local Caddy proof returned HTTP 200/301 for all 42 domains with zero failures, with EOR avoiding the previous 12-second frontend wait.
- A 2026-08-13 browser-like public HTTPS check returned HTTP 200 for 40 registered domains. `payrollmiddleast.org` and `lladesigners.com` resolve publicly to external hosting rather than this Astro host or the fleet's Cloudflare edge, and connections from this server to those external addresses timed out. Their local Astro routes pass, but this host cannot prove their external hosting availability; DNS/hosting remediation is a separate owner-controlled task.

Connect Freelance and Connect Resources International were commissioned one at
a time from signed commit `b932c712838658c971cc302bb054b0aa55bf02c0` and now
use the normal immutable current-link, secretless frontend, and per-site-router
path on public router ports `5094` and `5098`. Their existing trusted backends
remain isolated on `15094` and `15098` for protected SEO/control routes and
other backend-owned behavior. The retired standalone Connect Freelance
presentation socket `/run/connectfreelance-front/http.sock` is disabled and is
not a live Caddy upstream; Connect Freelance public presentation traffic goes to
the generic router on `5094`. No contact form was submitted and no Cloudflare,
DNS, or certificate configuration changed during this migration.

Use live registries and service state instead of a copied table:

```bash
sudo systemctl --no-pager --full status caddy astro-fleet-router.service astro-fleet-runtime-recover.timer
sudo systemctl --no-pager --full list-units 'astro-fleet-front@*' 'astro-fleet-site-router@*'
sudo /usr/local/sbin/astro-fleet-release-state summary --probe
SITE_ID='replace-with-site-id'
sudo readlink -f "/var/lib/astro-fleet/sites/$SITE_ID/current"
```

These are read-only status commands. The `current` link is presentation authority only; use the auditor to see the separately selected trusted-backend artifact and persistent-data classification. The developer's release workflow does not require these commands or access to their root-only output.

## Source and runtime references

| Reference | Purpose |
|---|---|
| `/opt/AGENTS.md` | Mandatory AI/human rules |
| `/opt/ARCHITECTURE.md` | Full trust, runtime, routing, release, secret, SEO, and onboarding design |
| `/opt/Astro-development/scripts/fleet-sites.json` | Source fleet registry; protected |
| `/opt/Astro-development/scripts/ci/fleet-policy.json` | Source classification policy; protected |
| `/etc/astro-fleet/router.json` | Installed routing registry; root authority |
| `/usr/local/sbin/astro-fleet-release` | Installed generic publisher; root authority |
| `/usr/local/sbin/astro-fleet-release-state` | Installed root-only read-only presentation/backend/persistent-state auditor |
| `/usr/local/sbin/astro-fleet-storage-maintenance` | Installed reference-aware release/build retention tool; run by timer |
| `/usr/local/libexec/astro-fleet-build-driver.py` | Installed isolated build driver |
| `/usr/local/libexec/astro-fleet-control/fleet-plan.mjs` | Installed release plan generator |
| `/usr/local/sbin/astro-pipedrive-token-rotate` | Root-only token rotation tool |
| `/mnt/HC_Volume_106610654` | Hetzner Cloud volume backing `/var/lib/astro-fleet/releases` and `/var/lib/astro-fleet/builds` |
| `/var/lib/astro-fleet/deployments` | Release transaction evidence |
| `/var/lib/astro-fleet/runtime-updates` | Installed shared runtime CURRENT authority, transactions, canary, post-install and rollback evidence |
| `/var/lib/astro-fleet/runtime-control` | Installed shared runtime control authority, receipts and wrapper transactions |
| `/var/lib/astro-fleet/storage-maintenance` | Storage maintenance transaction evidence and latest non-secret result |
| `/var/lib/astro-fleet/release-state/LATEST.json` | Root-only latest release-state audit result; contains paths and commit metadata, not secret values or lead contents |
| `/var/lib/astro-fleet/token-rotations` | Token-rotation evidence |
| `/opt/ops/astro-fleet-runtime` | Runtime source/package reference; installed files still determine live truth |
| `/opt/ops/astro-fleet-release-state-20260813` | Source, tests, units, installer, and operator notes for the installed release-state auditor |
| `/opt/ops/pipedrive-token-rotation` | Token-rotation package/reference |
| `/opt/ops/cloudflare-cache-purge-20260814` | Source package for the installed-enabled Cloudflare cache purge helper, tests, example config, and post-release path hook |

Anything in `/opt/ops` may be source, staged, disabled, or under review. Confirm installation hashes, units, and state before treating it as live.
The runtime package's own `README.md` is a member of sealed manifest
`b51b14c9e17c2c2a03d3585b82f957264be59daba878aaba3fb43f96740b8801`.
Do not edit any package member in place without resealing, independently
reviewing, and reinstalling the complete fixed-scope package; this root README
and `ARCHITECTURE.md` record the reconciled live state.

## Local fleet helper commands

The repository defines local helper scripts. Inspect `package.json` before use; current names include:

```bash
pnpm run fleet:list
pnpm run fleet:up
pnpm run fleet:smoke
pnpm run fleet:status
pnpm run fleet:stop
pnpm run fleet:build
pnpm run fleet:plan
pnpm run fleet:validate
```

These are development/testing helpers. They are not production deployment commands.

## Documentation maintenance

When code or operations change architecture, paths, commands, authority, routing, secrets, deployment, recovery, onboarding, or SEO behavior:

1. update the nearest component/site documentation;
2. update `/opt/AGENTS.md`, `/opt/ARCHITECTURE.md`, and this README where applicable;
3. state what is live versus staged or proposed;
4. update the verification date;
5. re-read and test every documented command and reference;
6. include documentation in the same reviewed change when possible.

Root reference changes that are outside `/opt/Astro-development` require Aaron/authorized root maintenance. A documentation-only source commit cannot be forced through a publisher that correctly requires a real changed registered site.

## Non-negotiable summary

- Work in `/opt/Astro-development`, never by editing live production.
- Read the three root references before coding, then inspect all relevant code.
- Commit a clean, linear, SSH-signed change.
- Publish only with `sudo /usr/local/sbin/astro-fleet-release publish`.
- Do not push separately or restart services.
- Aaron/root alone handles secrets and control-plane changes.
- Keep production secrets out of the developer tree and all communications.
- A new site requires root onboarding before it can use the fast lane.
- Keep these documents synchronized with reality.

Private Connect Group Tech infrastructure. Internal use only.
