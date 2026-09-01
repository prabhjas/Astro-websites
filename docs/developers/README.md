# Developer docs — start here

**Mushtaq, Tabish, Rajpal:** daily use → **[DEVELOPER-SESSION-PROMPT.md](DEVELOPER-SESSION-PROMPT.md)** (once per session) + **[TASK-PASTE.md](TASK-PASTE.md)** (each task)  
**Prabhjas (deploy lead):** **[DEPLOY-LEAD-FLOW.md](DEPLOY-LEAD-FLOW.md)** + CWV → **[CWV-WAVE-PROMPT.md](CWV-WAVE-PROMPT.md)**

Automation is **built into Cursor** (`.cursor/rules/developer-fleet-handbook.mdc`).  
No names, no account IDs, no manual Jira steps.

---

## Daily workflow (developers — 4 steps)

1. **Connect Atlassian MCP once** — [JIRA-DEV-WORKFLOW.md §1](JIRA-DEV-WORKFLOW.md#1-connect-atlassian-mcp-in-cursor-one-time)
2. **Paste session prompt** — [DEVELOPER-SESSION-PROMPT.md](DEVELOPER-SESSION-PROMPT.md) (start of day or new chat)
3. **Paste your task** — [TASK-PASTE.md](TASK-PASTE.md) (`---TASK---` block)
4. **Code · say `done`** — Cursor runs check/build, local preview, route checks, moves to **Testing** after screenshots

**You do not run CWV / Lighthouse optimization.** Write [CWV-safe clean code](DEVELOPER-CLEAN-CODE.md); Prabhjas optimizes after merge.

---

## Reference

| Doc | For |
|-----|-----|
| [DEVELOPER-CLEAN-CODE.md](DEVELOPER-CLEAN-CODE.md) | **Required** — habits + dirty-code rules |
| [DEVELOPER-FLEET-HANDBOOK.md](DEVELOPER-FLEET-HANDBOOK.md) | Full workflow detail |
| [DEVELOPER-CWV-CHECKLIST.md](DEVELOPER-CWV-CHECKLIST.md) | Part A publisher blockers (devs); Parts B–E deploy lead |
| [CWV-WAVE-PROMPT.md](CWV-WAVE-PROMPT.md) | **Deploy lead only** — Lighthouse 95+ |
| [CURSOR-MEMORY-PROMPT.md](CURSOR-MEMORY-PROMPT.md) | Agent spec (you don't paste this) |
| [JIRA-DEV-WORKFLOW.md](JIRA-DEV-WORKFLOW.md) | Jira board + MCP setup |
| [DEPLOY-LEAD-FLOW.md](DEPLOY-LEAD-FLOW.md) | Prabhjas: intake → push → test → Aaron path |

---

## Quick commands (Cursor runs these for you)

```bash
node scripts/fleet-local.mjs list
node scripts/fleet-local.mjs up <site-id>
pnpm --filter <package> run check
pnpm --filter <package> run build
```

**Deploy lead only:** `node scripts/fleet-lighthouse.mjs --site <id> --paths /,/blogs/ --min-score 95`

---

*Owner / fleet docs (ignore unless asked):* `docs/README.md`
