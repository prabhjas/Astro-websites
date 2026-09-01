# Deploy lead flow — Prabhjas (authoritative)

**Audience:** Cursor + Prabhjas only. Developers stop at **Testing**.

Tomorrow developers create their own Jira via `---TASK---`. Your job is **intake → dual-push → test → Aaron publish**, with a **summary + stop** at each gate.

---

## Magic words (checkpoints)

| You say | Cursor does |
|---------|-------------|
| *(pull / cherry-pick / “integrate X branch”)* | Gate 1 only → **stop** with intake summary |
| `ok` / `proceed` / `push work` | Gate 2 dual-push → **stop** with push summary |
| `test it` / `run tests` | Gate 3 deploy-lead test gate → **stop** with results |
| `ok all perfect` | Confirm Gate 3 passed; remind Aaron path is next |
| `push via Aaron path` / `deploy` | Gate 4 host publish → live verify → RELEASED |

Never skip gates. Never publish without `push via Aaron path`.

---

## Gate 1 — Intake (local only — do not push)

When: developer branch / commit hash / “do the needful” on `mushtaq-branch` / `tabish-branch` / etc.

1. `atlassianUserInfo` (confirm Prabhjas = deploy lead).
2. Fetch + inspect commits (`git show --stat`, file list).
3. **Strip protected paths** from what will eventually publish: `.env*`, `deploy/`, `src/env/server.ts`, `src/services/pipedrive/`, `packages/`, `caddy/`, workflows.
4. Cherry-pick / checkout onto **`work/astro-sites`** (local).
5. Resolve site-id, port, package, brand id.
6. **Jira:**
   - Find developer tickets (Testing / Ready) for those brands+keywords; link them.
   - If missing → create per-brand tickets assigned to the **developer**, In Progress → comment with commit.
   - Always create/reuse **deploy ticket** for **Prabhjas**:
     - Summary: `Fleet publish: {wave} ({sites})`
     - Labels: `deploy-wave`
     - Description: source branch, commits, linked DEV keys, sites
7. **STOP.** Print **Intake Summary** (template below). Wait for `ok`.

### Intake Summary template

```markdown
## Intake summary — ready for your OK

**Source:** `{branch}` `{sha}` · **Author:** {name}
**Local branch:** `work/astro-sites` @ `{local-sha}` (not pushed yet)

| Brand | Site | Package | Routes / focus | Jira |
|-------|------|---------|----------------|------|
| … | … | … | … | DEV-xxx |

**Deploy ticket (you):** DEV-xxx
**Protected paths skipped:** …
**Next:** say **ok** → dual-push `work/astro-sites` to origin + personal
```

---

## Gate 2 — Dual-push `work/astro-sites`

When: you say `ok` / `proceed` / `push work`.

1. `pnpm --filter <pkg> run check` + `build` on affected packages (fail → fix, no push).
2. Commit only if needed (ask if unclear).
3. Push **both**:
   - `origin/work/astro-sites` (Connect Group)
   - `personal/work/astro-sites`
4. Comment on deploy + brand tickets: laptop SHAs + remotes.
5. **STOP.** Print **Push Summary**. Wait for `test it` (or `ok` then offer test).

### Push Summary template

```markdown
## Push summary — work/astro-sites

| Remote | Ref | Tip |
|--------|-----|-----|
| origin | work/astro-sites | `{sha}` |
| personal | work/astro-sites | `{sha}` |

**Sites in this push:** …
**Linked tickets:** DEV-…
**Next:** say **test it** → deploy-lead automated verification
```

---

## Gate 3 — Deploy-lead test gate (your automated QA)

When: you say `test it` / `run tests`.

**CWV / Lighthouse 95+ is deploy-lead only.** Developers stop at Testing without Lighthouse. You run optimization (see [CWV-WAVE-PROMPT.md](CWV-WAVE-PROMPT.md)) during intake or as dedicated `cwv-wave` tickets.

For **each site** in the wave:

1. `pnpm --filter <pkg> run check` + `build`
2. `node scripts/fleet-local.mjs up <site-id>`
3. Hit every route from tickets (browser MCP when available; mobile width for UI)
4. **CWV (you):** run `node scripts/fleet-lighthouse.mjs --site <id> --paths <routes> --min-score 95` when the wave includes performance work, `cwv-wave` label, or known CWV debt — baseline before changes, verify after
5. Audit: no protected paths in `git diff` vs last push; flag developer dirty coding per [DEVELOPER-CLEAN-CODE.md](DEVELOPER-CLEAN-CODE.md)
6. Comment evidence on each brand ticket + deploy ticket
7. Transition brand tickets → **Ready for Release (3)** if tests pass

**STOP.** Print **Test Summary**. Wait for `ok all perfect`.

### Test Summary template

```markdown
## Test summary — deploy-lead gate

| Site | check/build | Local URL | Routes OK | Lighthouse | Ticket |
|------|-------------|-----------|-----------|------------|--------|
| … | pass/fail | http://127.0.0.1:PORT | yes/no | n/a or scores | DEV-… |

**Deploy ticket:** DEV-… → Ready for Release
**Blockers:** none | …
**Next:** say **ok all perfect** then **push via Aaron path** when you want live
```

---

## Gate 4 — Aaron path (live cutover)

When: you say `push via Aaron path` / `deploy`.

1. SSH `astro-connectgroup` → `/opt/Astro-development` · branch `astro-fleet-development` · clean
2. Parent = **accepted** tip (`x-astro-fleet-commit` / last publish)
3. Apply **presentation-only** site files (never `.env*`, `deploy/`, pipedrive, server.ts)
4. One **SSH-signed** commit (`Astro Web Developer <webdev@astro.local>`)
5. `sudo /usr/local/sbin/astro-fleet-release publish`
6. Verify live `x-astro-fleet-commit` on each domain
7. Sync `personal/astro-fleet-development`
8. Jira → **RELEASED (61)** + evidence on deploy + brand tickets

### Publish Summary template

```markdown
## Live — Aaron path complete

**Publish commit:** `{sha}`
| Site | Live header |
|------|-------------|
| … | `{sha}` |

**Jira:** DEV-… → RELEASED
```

---

## Your own coding work (Jira for Prabhjas)

Paste `---TASK---` like developers **or** say clearly “create a ticket for this”. Cursor must:

1. `createJiraIssue` assigned to **you** (`atlassianUserInfo`)
2. Brand field + `dev-wave` (or `deploy-wave` for publish batches)
3. In Progress → … → full lifecycle including RELEASED after Aaron path

**Wave integrations** always get a **deploy ticket** for you even when brand tickets belong to Mushtaq/Tabish/Rajpal.

If you only say “fix X” without a ticket ask, Cursor still creates one before coding (deploy lead rule).

---

## What does NOT deploy

| Action | Result |
|--------|--------|
| Laptop push to `astro-fleet-development` alone | Not live |
| Host `git fetch` | Not live |
| rsync / fat git bundle | Forbidden |
| Tip containing `.env*` / `deploy/` / `pipedrive/` changes | Publisher **blocks** |

---

## Related

- Developers: [TASK-PASTE.md](TASK-PASTE.md)
- Host publish detail: [DEVELOPER-HANDOFF.md](../DEVELOPER-HANDOFF.md)
- Cursor rule: `~/.cursor/rules/aaron-deploy-path.mdc`
