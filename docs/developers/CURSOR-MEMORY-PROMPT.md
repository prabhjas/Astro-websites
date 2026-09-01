# Cursor automation reference (agent + deploy lead)

**Developers do not paste this file.** They use **[DEVELOPER-SESSION-PROMPT.md](DEVELOPER-SESSION-PROMPT.md)** + **[TASK-PASTE.md](TASK-PASTE.md)**.

Automation lives in **`.cursor/rules/developer-fleet-handbook.mdc`** (always on in this repo).  
No manual name/ID setup. Agent detects the logged-in Atlassian user and runs the full Jira + testing flow.

---

## Developer experience (zero manual Jira)

1. Connect Atlassian MCP once (OAuth).
2. Paste session prompt from [DEVELOPER-SESSION-PROMPT.md](DEVELOPER-SESSION-PROMPT.md) (optional but recommended).
3. Paste task block from [TASK-PASTE.md](TASK-PASTE.md).
4. Code. Say **`done`** when finished.
5. Answer Cursor’s yes/no checks (screenshots, tested URLs).
6. Attach screenshots in Jira when asked.

**Developers do not run CWV optimization.** Enforce [DEVELOPER-CLEAN-CODE.md](DEVELOPER-CLEAN-CODE.md).

---

## Agent automation protocol

### On every `---TASK---` block or new work mention

**Immediately, without asking permission to start:**

1. **`atlassianUserInfo`** → `accountId` = assignee (never ask developer for ID).
2. **`git branch --show-current`** → branch (unless block includes `Branch:`).
3. Parse **Brand**, **Site** (domain), **Task**, **Routes**, optional **Branch**.
4. If **developer** pastes `Type: CWV` → redirect to normal task; CWV is deploy-lead only.
5. Read **`scripts/fleet-sites.json`** → `site-id`, `port`, resolve pnpm package from `Astro-production/<domain>/package.json` `"name"`.
6. Read **`scripts/jira-commit-sync.mjs`** → `DOMAIN_BRAND` for `customfield_10092` option id.
7. **JQL search:** `project=DEV AND assignee=currentUser() AND status not in (Done, RELEASED) AND summary ~ "<keywords>"` — reuse open ticket if same brand+task.
8. **`createJiraIssue`** if needed:
   - summary: `{Brand}: {Task}`
   - assignee: step 1 accountId
   - labels: `dev-wave` (developers); `cwv-wave` only for Prabhjas CWV work
   - description: branch, site path, routes, port, package, commits TBD
9. **`transitionJiraIssue` → In Progress (31)**.
10. Reply: ticket key, port, next coding step. **Remember ticket key for session.**

### Role detection

| accountId | Role | Max Jira status | CWV |
|-----------|------|-----------------|-----|
| Mushtaq / Tabish / Rajpal IDs | Developer | **Testing (51)** | No — clean code only |
| Prabhjas ID | Deploy lead | **Released (61)** | Yes — owns optimization |

If `atlassianUserInfo` fails → ask once to reconnect MCP (do not ask for account ID).

### While coding (proactive)

- After meaningful edits or when user commits: **`addCommentToJiraIssue`** with `git log -1` hash + one-line diff summary.
- Before suggesting commit: run **`pnpm --filter <pkg> run check`** and **`build`**.
- Enforce **[DEVELOPER-CLEAN-CODE.md](DEVELOPER-CLEAN-CODE.md)** — flag dirty coding.
- Block protected paths and dirty files (see handbook).
- If no ticket in session and user codes site files → trigger **On TASK** flow from changed domain.

### When user says `done`, `ready`, `finished`, or task block includes ready intent

#### Developer lane

**Run developer testing gate automatically:**

1. `pnpm check` + `build`
2. `node scripts/fleet-local.mjs up <site-id>`
3. Test routes from ticket (browser MCP if available)
4. `git diff` audit — no protected/dirty paths
5. **`addCommentToJiraIssue`:** URLs, commits, test steps (no Lighthouse)

**Do not** run `fleet-lighthouse.mjs --min-score 95` for developers.

#### Deploy lead lane

Gate 3 in [DEPLOY-LEAD-FLOW.md](DEPLOY-LEAD-FLOW.md) — includes Lighthouse when CWV applies.

**Checkpoint questions (ask developer, do not skip):**

- *Did you open every route in the ticket on desktop and mobile?*
- *Did you attach screenshots to the Jira ticket?*

Only after **yes** (or user confirms screenshots uploaded): **`transitionJiraIssue` → Testing (51)**.

Remind: notify **Prabhjas** with ticket key + branch (developers only).

### CWV (`Type: CWV`) — deploy lead only (Prabhjas)

- Label `cwv-wave` on create.
- **Baseline Lighthouse before any code change** — comment scores on ticket.
- One optimization tier at a time (handbook Phase 4).
- Revert tier if score or layout regresses.

---

## Jira constants

| Item | Value |
|------|--------|
| Cloud ID | `5b8a830d-0824-481c-83be-1d5d8b477112` |
| Project | `DEV` |
| Issue type | `Task` |
| Brand field | `customfield_10092` |
| In Progress | `31` |
| Testing | `51` |
| Ready for Release | `3` (deploy lead only) |
| Released | `61` (deploy lead only) |

Brand IDs: `scripts/jira-commit-sync.mjs` → `DOMAIN_BRAND`.

Developer assignees (fallback if MCP name match needed):

| Name | accountId |
|------|-----------|
| Muhammad Mushtaq | `712020:8851c826-494d-4345-b770-35d80838168d` |
| Muhammad Tabish | `712020:d3d56b11-4655-4b7c-9ae5-cc054ce9d84d` |
| Rajpal Singh | `712020:7df4daef-fbc8-46ff-a6a1-0d02b0280ea2` |
| Prabhjas Singh | `62860e31f0302e0068bea3ca` |

---

## MCP tools (use these — not GitHub Actions)

- `atlassianUserInfo`
- `searchJiraIssuesUsingJql`
- `createJiraIssue`
- `editJiraIssue`
- `addCommentToJiraIssue`
- `transitionJiraIssue`
- `getJiraIssue`

---

*Updated: 2026-09-01 · Owner: Prabhjas*
