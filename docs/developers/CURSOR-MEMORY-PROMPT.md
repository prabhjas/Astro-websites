# Cursor automation reference (agent + deploy lead)

**Developers do not paste this file.** They only use **[TASK-PASTE.md](TASK-PASTE.md)**.

Automation lives in **`.cursor/rules/developer-fleet-handbook.mdc`** (always on in this repo).  
No manual name/ID setup. Agent detects the logged-in Atlassian user and runs the full Jira + testing flow.

---

## Developer experience (zero manual Jira)

1. Connect Atlassian MCP once (OAuth).
2. Paste task block from [TASK-PASTE.md](TASK-PASTE.md).
3. Code. Say **`done`** when finished.
4. Answer Cursor’s yes/no checks (screenshots, tested URLs).
5. Attach screenshots in Jira when asked.

---

## Agent automation protocol

### On every `---TASK---` block or new work mention

**Immediately, without asking permission to start:**

1. **`atlassianUserInfo`** → `accountId` = assignee (never ask developer for ID).
2. **`git branch --show-current`** → branch (unless block includes `Branch:`).
3. Parse **Brand**, **Site** (domain), **Task**, **Routes**, optional **Type: CWV**.
4. Read **`scripts/fleet-sites.json`** → `site-id`, `port`, resolve pnpm package from `Astro-production/<domain>/package.json` `"name"`.
5. Read **`scripts/jira-commit-sync.mjs`** → `DOMAIN_BRAND` for `customfield_10092` option id.
6. **JQL search:** `project=DEV AND assignee=currentUser() AND status not in (Done, RELEASED) AND summary ~ "<keywords>"` — reuse open ticket if same brand+task.
7. **`createJiraIssue`** if needed:
   - summary: `{Brand}: {Task}`
   - assignee: step 1 accountId
   - labels: `dev-wave` (+ `cwv-wave` if Type CWV)
   - description: branch, site path, routes, port, package, commits TBD
8. **`transitionJiraIssue` → In Progress (31)**.
9. Reply: ticket key, port, next coding step. **Remember ticket key for session.**

### Role detection

| accountId | Role | Max Jira status |
|-----------|------|-----------------|
| Mushtaq / Tabish / Rajpal IDs | Developer | **Testing (51)** |
| Prabhjas ID | Deploy lead | **Released (61)** |

If `atlassianUserInfo` fails → ask once to reconnect MCP (do not ask for account ID).

### While coding (proactive)

- After meaningful edits or when user commits: **`addCommentToJiraIssue`** with `git log -1` hash + one-line diff summary.
- Before suggesting commit: run **`pnpm --filter <pkg> run check`** and **`build`**.
- Block protected paths and dirty files (see handbook).
- If no ticket in session and user codes site files → trigger **On TASK** flow from changed domain.

### When user says `done`, `ready`, `finished`, or task block includes ready intent

**Run testing gate automatically:**

1. `pnpm check` + `build`
2. `node scripts/fleet-local.mjs up <site-id>`
3. Test routes from ticket (browser MCP if available)
4. `node scripts/fleet-lighthouse.mjs --site <id> --paths <routes> --min-score 95`
5. `git diff` audit — no protected/dirty paths
6. **`addCommentToJiraIssue`:** URLs, commits, Lighthouse scores, test steps

**Checkpoint questions (ask user, do not skip):**

- *Did you open every route in the ticket on desktop and mobile?*
- *Did you attach screenshots to the Jira ticket?*

Only after **yes** (or user confirms screenshots uploaded): **`transitionJiraIssue` → Testing (51)**.

Remind: notify **Prabhjas** with ticket key + branch.

### CWV (`Type: CWV`)

Same as above, plus:

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

*Updated: 2026-08-31 · Owner: Prabhjas*
