# Claude prompt — 34-site fleet queue (FQ-01 … FQ-04)

**Updated:** 2026-08-11  
**Master map:** [00-NEW-SITE-MASTER.md § Fleet work queue](00-NEW-SITE-MASTER.md#fleet-work-queue--34-sites)  
**Identity / git / server:** [CLAUDE-CONNECTGROUP-HANDOFF.md](CLAUDE-CONNECTGROUP-HANDOFF.md)

Paste **§ Starter prompt** into Claude. This file is the spec he must follow. Do not invent a second queue.

---

## Starter prompt (copy everything in the fence)

```text
You are the developer agent on the Connect Group Astro fleet.

READ FIRST (in this order), then execute. Do not skip the docs.
1. docs/CLAUDE-FLEET-QUEUE-PROMPT.md   ← this assignment (source of truth)
2. docs/00-NEW-SITE-MASTER.md          ← § Fleet work queue + Phase 04/05/07
3. docs/CLAUDE-CONNECTGROUP-HANDOFF.md ← git author, remotes, server limits

Repo: /Users/prabhjasbajwa/Projects/Astro-websites
Branch: work/astro-sites  (34-site cut-off also lives on work/live-fleet-34 — do not rewrite that branch unless asked)
Package manager: pnpm@9.15.9 only. One lockfile. Catalog pins in pnpm-workspace.yaml.
Commits: ONLY if I explicitly ask. Author (repo-local -c only): prabhjass-afk <prabhjass-afk@users.noreply.github.com>
Never change global git config. Never print/commit .env / .env.prod / PATs.

YOUR JOB (developer, in this order):
  FQ-00  Honour Aaron's veto of staged root scripts (signatures APPLY + APPLY-NEXT6). Do not run them. Mark our old notes.
  FQ-01  nanoid 3.3.16 → 3.3.18 (lockfile + override)
  FQ-02  Replace browser ipinfo.io with Cloudflare Cf-Ipcountry (Aaron's exact geo write-up)
  FQ-03  DO NOT change live systemd. Write the Aaron memory note only.

FQ-04 (mechanical copy / blank canonicals / stale peers / unsafe deploy docs / three hooks) is ALREADY DONE at our end — do not redo. See § Already done. Scorecard: docs/AARON-RULES.md. Canary before switch: docs/AARON-CANARY-RELEASE.md (Aaron runs :5999; we do not start it).

Aaron's script veto (FQ-00) and geo write-up (FQ-02) are still requirements. The source-review quote is historical — already handled.

Then update the tick status in docs/00-NEW-SITE-MASTER.md § Fleet work queue
and leave a short REPORT at the end (files changed, remaining gaps, commands I should run).

Hard rules are in docs/CLAUDE-FLEET-QUEUE-PROMPT.md § Hard rules. Obey them.
```

---

## Fleet (keep list — only these)

**Live 28:** `c-uae.com` · `cbss.ae` · `connectfm.ae` · `connectfreelance.ae` · `connectfz.com` · `connectgroup.co` · `connecthr.ae` · `connectresources.ae` · `connectresources.sa` · `connectstaff.ae` · `emiratiguard.com` · `emiratisationgate.org` · `emiratisationgateway.com` · `eormiddleast.com` · `evolutionmiddleast.com` · `freelancerdxb.com` · `iberiaeor.com` · `iberiaworkforce.com` · `kinzahr.com` · `kpmpro.ae` · `ngmanpower.com` · `payrollmiddleast.org` · `peomiddleast.com` · `pittant.com` · `redo.ae` · `royalvisa.ae` · `spheavyrental.ae` · `thefreelancergate.com`

**Next 6:** `mbs-consultancy.com` · `connectzone.ae` · `movey.ae` · `emiratisationhub.com` · `companyformationsaudi.com` · `alburaq.ae`

Also on live Caddy, **not** in this tree cut-off: `connectresourcesint.com` (5098) — do not scaffold it.

Ignore / do not revive dropped scaffolds (`raadrecruitment`, `connectbusinesscenter`, `izi`, `lladesigners`, etc.) unless a grep accidentally lands there — leave them.

---

## Hard rules

1. **pnpm only.** No `npm install`, no new `package-lock.json`, no `shamefully-hoist`.
2. **Do not rsync `node_modules` or macOS binaries** to the server. Do not commit `node_modules`.
3. **No SMTP / form-email env vars.** Lead store + Pipedrive only.
4. **Do not reload live Caddy, edit `/etc/caddy`, or rewrite `site-ctl`.** Owner (Aaron) only.
5. **Do not run** `/home/webdev/staging/signatures/APPLY.sh` or `/home/webdev/staging/fleet-cutover-20260810/APPLY-NEXT6.sh` (or copies). Aaron vetoed them — see **FQ-00**.
6. **Do not strip** Elementor/ScrollSequence `eval` / inline-script rehydrate in `astro-mirror-fixes.js`. Those two are **required chrome** — removing them breaks menus, sliders, and ScrollSequence. The third hook (`regen.ts` `execFile`) is FLOW-only, not public chrome.
7. **Do not enable CSP enforce, fleet-wide prerender, or full WP SRI.**
8. **Do not convert sites to `output: "server"`** just to inject geo. Most sites are `output: "static"` + Node adapter for `/api/*`. Country must be resolved **at request time**, not baked into prerendered HTML.
9. **Do not invent** a second forms/CMS/Caddy pattern. Copy a keep-list peer.
10. **Secrets stay out of chat and git.**
11. Touch **keep-list sites + root lockfile/docs** only.
12. Prefer one shared pattern, then apply it. Do not hand-edit 34 slightly different snowflakes if a common snippet exists.

---

## Aaron — three findings (verbatim — implement these)

### 1) Staged root scripts are not safe (FQ-00)

> The staged root scripts are not safe to run as written. The signature script mutates the attested immutable release from a user-writable staging directory, and the next-six script has no transactional rollback, tolerates failed health checks, starts mutable in-tree builds, and edits site-ctl with a brittle text substitution.

### 2) Mechanical peer copy — **already handled (do not redo)**

> The source review uncovered that the branch had been mechanically copied from older peer sites: blank canonical origins, stale peer domains, unsafe deployment guidance, and three dormant code-execution hooks.

**Our end (done):** keep-site `.env.example` / `astro.config` `site` are this domain (not blank). Live Caddy + next-6 `deploy/*.caddy` use `astro_origin_2026` (not the copied `tls internal` scaffold). Contact body limits on. The three “hooks” are classified: ScrollSequence `eval` + Elementor script rehydrate **stay** (chrome); `regen.ts` `execFile` is peer FLOW regen behind existing patterns — do not strip as malware. Do **not** start a fleet-wide rewrite of copied `ROOT_SETUP.md` / one-shot import scripts / llms seed fixtures.

### 3) ipinfo.io is causing the dial-code bug (FQ-02)

> The code does a browser call to https://ipinfo.io/json, then if `response.country !== undefined` it inits countrySelect / intlTelInput. If that call fails, no default country is set — user types a bare number, wrong dial code.
>
> 880,146 requests / 3,379 files / 30 sites vs ipinfo free tier ~50k/month → rate-limited, intermittent failure.
>
> Cloudflare `Cf-Ipcountry` present on 47,089 of 47,125 requests (99.92%). Read it server-side, hand `window.__GEO_COUNTRY__` to the existing widget, delete the `$.ajax` block.
>
> Caveats: `XX` / `T1` → fallback `AE`. Local has no header → same fallback. Country-specific HTML must not be edge-cached without `Vary` (safe today: `public, max-age=0`). Do not in-place edit the hash-pinned immutable release — needs build + proper deploy.

---

## FQ-00 — Do not run staged signature / next-6 APPLY scripts

**This is Aaron’s signature/script veto. Cover it explicitly.**

| Script | Why unsafe |
|--------|------------|
| `/home/webdev/staging/signatures/APPLY.sh` | Mutates the **attested immutable release** from a **user-writable staging** dir |
| `/home/webdev/staging/fleet-cutover-20260810/APPLY-NEXT6.sh` | No transactional rollback; tolerates failed health checks; starts **mutable in-tree builds**; edits `site-ctl` with brittle text substitution |

**Claude must:**

1. **Never execute** those scripts (or copies under `staging/`).
2. Put a **WARNING** at the top of `docs/AARON-CUTOVER-NOTE-2026-08-10.md` (and any other note that still says `sudo …/signatures/APPLY.sh` or `APPLY-NEXT6.sh`): Aaron rejected them; do not run; owner must rewrite.
3. In the REPORT, give Aaron a **safe replacement shape** (do not implement on the host):
   - Signatures: copy PNGs into a **new** immutable release (or a dedicated signed artifact), never patch the attested tree from staging.
   - Next-6: transactional enable + health-check **abort** + no in-tree `astro build` on the live unit + no sed of `site-ctl`.
4. Do **not** invent a new APPLY.sh in git that webdev can run as root.

**Done when:** our docs no longer instruct Aaron to run the unsafe scripts; REPORT states the veto and the safe shape.

---

## Already done — do not redo

- Next-6 Caddy snippets + `caddy/Caddyfile.production` use named CA `astro_origin_2026` (not `tls internal`).
- Contact `readRequestBodyLimited` on next-6 (incl. mbs / movey).
- `.env.example` `PUBLIC_SITE_URL=https://<this-domain>` on keep sites (Aaron “blank canonical origins”).
- **FQ-04 source review** — mechanical copy findings are handled at our end (canonicals, CA Caddy, hooks classified). Do not reopen.
- Server geo already prefers `cf-ipcountry` on almost all 34 (`/api/geo/country.ts` or cbss/iberia `src/pages/api/geo.ts`).
- Client already tries same-origin `/api/geo…` **first** — the bug is the **fallback waterfall** (`ipinfo.io`, `ipwho.is`, `geojs`, `ipapi.co`).

---

## FQ-01 — `nanoid` 3.3.16 → 3.3.18

**Why:** RA-01 dependency DoS advisory. Transitive (Vite / PostCSS). Root `pnpm-lock.yaml` still has `nanoid@3.3.16`.

**Do:**

1. `pnpm why nanoid` from repo root — confirm it is transitive, not a direct site dep.
2. Add a root override next to the existing `js-yaml` pin in `package.json`:

```json
"pnpm": {
  "overrides": {
    "js-yaml": "4.3.1",
    "nanoid": "3.3.18"
  }
}
```

3. `pnpm install` at repo root so **one** `pnpm-lock.yaml` moves to `nanoid@3.3.18`. Confirm with `rg 'nanoid@3\.3\.16' pnpm-lock.yaml` → **0 hits**, and `nanoid@3.3.18` present.
4. Smoke-build **at least** one thin site (`cbss.ae`) and one heavy mirror (`connectresources.ae` or `spheavyrental.ae`):

```bash
pnpm --filter <package-name> build
```

Use each site’s `package.json` `"name"`. If a build fails because of macOS-only native bindings (sharp/esbuild), stop, report the site, do **not** vendor a Darwin binary.

5. Do **not** deploy or rsync. Note in the REPORT: “owner needs Linux rebuild + new immutable release”.

**Done when:** lockfile has only 3.3.18, override committed in git when we ask, two representative builds still succeed locally.

---

## FQ-02 — Geo: stop `ipinfo.io`, use Cloudflare `Cf-Ipcountry`

Aaron: *the current implementation is very likely causing the exact bug they’re trying to prevent.*

### The bug (must fix this behaviour)

Legacy / mirrored CF7 block (and our `astro-mirror-fixes.js` last-resort waterfall) does a **browser** call to `https://ipinfo.io/json`, then:

```js
if (response.country !== undefined) {
  $(".wpcf7-countrytext").countrySelect({ defaultCountry: response.country.toLowerCase() });
  $(".wpcf7-phonetext").intlTelInput({ /* … */ });
}
```

If the call fails (rate limit, CORS, timeout), `response.country` is undefined → **no default country at all** → visitor types a bare number → **wrong dial code**. Intermittent, looks random.

**Numbers Aaron measured:** 880,146 ipinfo requests in the log window, 3,379 files, 30 sites. Free tier ~50k/month → you are rate-limited.

**Better source (already on the wire):** `Cf-Ipcountry` on 47,089 / 47,125 requests (99.92%), 86 countries. Free, no rate limit, no third party, GDPR (stop sending visitor IPs to ipinfo).

### Target widget init (replace the `$.ajax` / `fetch` block entirely)

```js
$(".wpcf7-countrytext").countrySelect({ defaultCountry: window.__GEO_COUNTRY__ });
$(".wpcf7-phonetext").intlTelInput({ autoHideDialCode: true, autoPlaceholder: true /* existing opts */ });
```

Always pass a 2-letter code. **Never** leave the widget uninitialised.

### How to get `window.__GEO_COUNTRY__` (important — static sites)

Most keep-list sites are `output: "static"` + Node adapter. **Do not** write `Astro.request.headers.get('cf-ipcountry')` into prerendered `.astro` HTML at **build** time — that bakes `ae` (or empty) into every page.

Aaron’s “SSR snippet” is the **request-time** idea. Implement it as a **non-prerendered** endpoint (same pattern as `/runtime-gtm.js`):

| Piece | Path | Notes |
|-------|------|--------|
| Preferred | `src/pages/runtime-geo.js.ts` (`prerender = false`) | Emits `window.__GEO_COUNTRY__='sa';` from `cf-ipcountry`. Inject `<script src="/runtime-geo.js" defer>` next to the GTM loader (or in `astro-mirror-fixes` wait for it). `Cache-Control: private, no-store`. |
| Also keep | `GET /api/geo/country` or existing `GET /api/geo` (cbss / iberia) | Same header rules. Client may fetch this **once** if `__GEO_COUNTRY__` is missing. |

**Header rules:**

```ts
const raw = (request.headers.get('cf-ipcountry')
  || request.headers.get('x-vercel-ip-country')
  || request.headers.get('cloudfront-viewer-country')
  || '').trim()
const ok = /^[A-Z]{2}$/i.test(raw) && !/^(xx|t1)$/i.test(raw)
const country = ok ? raw.toLowerCase() : 'ae'   // AE fallback — also covers local/dev (no CF)
```

Aaron’s three caveats (must honour):

1. `XX` (unknown) and `T1` (Tor) → **`ae`**. Better than today’s “no default”.
2. Local/dev has no Cloudflare header → same **`ae`** fallback.
3. Country-specific **HTML** must not be edge-cached without `Vary: CF-IPCountry`. Safe today (`public, max-age=0`). Prefer putting the value on `/runtime-geo.js` or `/api/geo*` (not in cached HTML) so we do not block future HTML caching.

**Wins:** fixes dial-code bug, no blocking third-party RTT, GDPR, no external dependency.

### Client cleanup (our code)

Delete **all** browser calls to:

- `https://ipinfo.io/json`
- `https://ipwho.is/`
- `https://get.geojs.io/v1/ip/country.json`
- `https://ipapi.co/json/` and `https://ipapi.co/.../country/`

Files: `public/js/astro-mirror-fixes.js`, `src/components/SiteScripts.astro`, `public/scripts/cf7-bridge.js`.

Flow: `__GEO_COUNTRY__` if set → else one same-origin `/api/geo*` → else `'ae'` → **always** init countrySelect + intlTelInput.

**3,379 vendor/legacy files:** Aaron said he cannot in-place edit the hash-pinned release. Do **not** rewrite every `public/wp-content/**` minified copy. Our bridge must win; only stub a vendor file if contact HTML still **loads that exact script**. List affected **our** files per site in the REPORT (Aaron offered a find/replace list — produce that).

**Do not** patch the live immutable release in place. Needs build + owner deploy.

**Verify:**

```bash
curl -sS "http://127.0.0.1:<PORT>/api/geo/country"              # ae / fallback
curl -sS -H "CF-IPCountry: SA" "http://127.0.0.1:<PORT>/api/geo/country"  # sa / header
curl -sS -H "CF-IPCountry: XX" "http://127.0.0.1:<PORT>/api/geo/country"  # ae
curl -sS -H "CF-IPCountry: T1" "http://127.0.0.1:<PORT>/api/geo/country"  # ae
rg -n "ipinfo\\.io|ipwho\\.is|geojs\\.io|ipapi\\.co" Astro-production/<domain>/public/js Astro-production/<domain>/src
```

**Done when:** keep-list **our** JS has 0 third-party geo; widget always gets `ae` or a real ISO2; CF header wins; REPORT lists files per site.

---

## FQ-03 — Memory note only (do not apply on the host)

Aaron asked: more memory **for each** unit vs **shared** for all.

**Decision (already made — document, do not debate):** keep **per-site** `MemoryMax` / `MemoryHigh`. Do not one shared cgroup for 34 processes.

**Claude must:**

1. **Not** edit live units, `site-ctl`, or `/etc/systemd`.
2. Optionally add a short comment in git `deploy/*.service` examples for **heavy mirrors** only (`MemoryHigh=384M`, `MemoryMax=512M`) if those templates still say 200/256 — that is a template hint for Aaron, not a live change.
3. Write `docs/AARON-MEMORY-NOTE.md` with this exact recommendation:

- Host has ~15 Gi RAM; CR is dying because the **unit** is `MemoryHigh=200M` / `MemoryMax=256M` (`MemoryAvailable=0`), not because the box is full.
- Pages are static; the process is still Node (`output: "static"` + `@astrojs/node`). Caddy proxies HTML/CSS/JS through Node — that is why a “static” slider times out.
- **Per-site caps stay.** Shared pool = noisy neighbour (CR) starves everyone.
- Raise heavy WP mirrors first: `connectresources.ae` → `MemoryHigh=384M` `MemoryMax=512M`. Thin leads-only (cbss, iberia) can stay 256M.
- Better than a huge Node cap: Caddy `file_server` for `/wp-content/`, `/css/`, `/js/`.
- Restart alone will not stick.

**Done when:** that note exists and the REPORT tells the human to paste it to Aaron.

---

## FQ-04 — Source review: mechanical copy — **DONE, do not redo**

Aaron’s quote is above. **Do not implement FQ-04.** Left here only so you do not reopen it.

Historical checklist (already closed at our end):

Aaron’s four findings — treat each as a checklist item:

### A) Blank canonical origins

`.env.example` `PUBLIC_SITE_URL=https://<this-domain>` is already set on keep sites. Re-grep for empty / `http://127.0.0.1` / missing `site:` in `astro.config.mjs` and runtime SEO. Fix any blank.

### B) Stale peer domains

Grep each next-6 tree (`src/`, `deploy/`, operator `docs/`, `.env.example`, `README.md`) for hosts that are **not** this domain:

`spheavyrental.ae` · `connectgroup.co` · `evolutionmiddleast.com` · `cbss.ae` · `iberiaworkforce.com` · `c-uae.com`

**Must fix if it would ship or be run as an operator doc:**

| Example (already found) | Fix |
|-------------------------|-----|
| `mbs-consultancy.com/src/lib/seo/text-files-store.ts` seeds `Site: https://connectgroup.co` | `https://mbs-consultancy.com` |
| Copied `docs/13-go-live-server-handoff.md` still titled SP Heavy | This domain, or “see `docs/OPS-OWNER-CADDY-CUTOVER.md`” |

Leave `scripts/*` one-shot WP importers (comment: “not a deploy script”) and `*.test.ts` fixture URLs. FLOW docs that **list** peers on purpose are OK.

### C) Unsafe deployment guidance

Delete / rewrite any copied `deploy/ROOT_SETUP.md` (or site doc) that tells webdev to:

- `sed` / text-substitute `site-ctl` ALLOWED lists
- run `astro build` in the live tree
- run staging `APPLY-NEXT6.sh` or `signatures/APPLY.sh`
- use `tls internal` for production

Point at fleet `docs/OPS-OWNER-CADDY-CUTOVER.md` only.

### D) Three dormant code-execution hooks

Aaron found **three** hooks on the mechanically copied branch. Inventory them in **our** `src/` + `public/js/` (not Elementor vendor minified JS).

Known candidates (confirm + classify in the REPORT):

| # | Likely hook | Typical path | Action |
|---|-------------|--------------|--------|
| 1 | `eval(scrollsequence config)` | `public/js/astro-mirror-fixes.js` → `ensureScrollsequence` | **Required.** Without it ScrollSequence (Connect Group / peers) does not run. Intentional chrome, not a shell. |
| 2 | Inline `<script>` rehydrate (`textContent` → `replaceChild`) | same file, Rocket LazyLoad unblock | **Keep** — required for Elementor. Same lesson as Phase 05 (do not over-sanitize mirrors). |
| 3 | Server `child_process.execFile` | `src/lib/runtime-redirects/regen.ts` (`node scripts/generate-redirects.mjs`) | **Review.** If the old `/internal/operations/redirects` UI is gone (thin mounts), this is a dormant spawn. Do not leave an unauthenticated path that can trigger it. If unused, stop calling it from APIs; do not delete generate-redirects if FLOW still needs it behind bearer. |

Also grep keep-list `src/` for `eval(`, `new Function(`, `execFile(`, `execSync(`, `child_process`.

**Do not** treat WP `underscore.min.js` / webpack runtimes as “our” hooks.

**Do not** inventory or rewrite these again. REPORT: `FQ-04: skipped (already done).`

---

## Suggested implementation order

```text
0. FQ-00 WARNING banners on notes that still say run APPLY.sh / APPLY-NEXT6.sh
1. FQ-01 override + pnpm install + two builds
2. FQ-02 runtime-geo.js + strip client ipinfo/ipwho/geojs/ipapi; always init widgets with ae fallback
   → per-site file list in REPORT (do not rewrite 3379 vendor files)
3. Skip FQ-04 (already done)
4. Write docs/AARON-MEMORY-NOTE.md (FQ-03)
5. Update status table in docs/00-NEW-SITE-MASTER.md § Fleet work queue / Deferred gaps
6. REPORT (no commit unless asked)
```

Useful greps:

```bash
rg -n "ipinfo\\.io|ipwho\\.is|geojs\\.io|ipapi\\.co" Astro-production --glob '!**/wp-content/**' --glob '!**/node_modules/**'
rg -n "nanoid@3\\.3\\.16" pnpm-lock.yaml
rg -n "Site: https://connectgroup.co" Astro-production/mbs-consultancy.com
```

---

## Out of scope (say so, do not start)

- Running or rewriting live `APPLY-NEXT6.sh` / `signatures/APPLY.sh` on the host (FQ-00: note only).
- Caddy reload / new immutable release (owner).
- Raising live `MemoryMax` on the server.
- Iberia/CBSS runtime GTM backfill.
- Filling blank DET `licence.json`.
- Restic backup script refresh on the host.
- New sites beyond the 34.

---

## REPORT template (end of run)

```text
## FQ-00 scripts veto
- notes updated (no longer tell Aaron to run APPLY.sh / APPLY-NEXT6):
- safe replacement shape for Aaron:

## FQ-01 nanoid
- lockfile: 3.3.16 remaining?
- builds tried:
- blocker:

## FQ-02 geo (Aaron ipinfo write-up)
- our-JS files cleaned (per site):
- runtime-geo.js /api/geo* status:
- still-loaded vendor ipinfo files (if any):
- verify: no header → ae; SA → sa; XX/T1 → ae

## FQ-04 source review
- skipped (already done at our end)

## FQ-03
- note path: docs/AARON-MEMORY-NOTE.md

## Please run / please ask Aaron
- 
```
