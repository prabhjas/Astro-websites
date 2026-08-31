# Developer docs — start here

**Mushtaq, Tabish, Rajpal:** one file to use daily → **[TASK-PASTE.md](TASK-PASTE.md)**  
**Prabhjas (deploy lead):** same + [DEVELOPER-HANDOFF.md](../DEVELOPER-HANDOFF.md)

Automation is **built into Cursor** for this repo (`.cursor/rules/developer-fleet-handbook.mdc`).  
No names, no account IDs, no manual Jira steps.

---

## Daily workflow (3 steps)

1. **Connect Atlassian MCP once** — [JIRA-DEV-WORKFLOW.md §1](JIRA-DEV-WORKFLOW.md#1-connect-atlassian-mcp-in-cursor-one-time)
2. **Paste your task** — [TASK-PASTE.md](TASK-PASTE.md) (`---TASK---` block)
3. **Code · say `done`** — Cursor creates/updates Jira, runs tests, moves to **Testing** after you confirm screenshots

---

## Reference (optional reading)

| Doc | For |
|-----|-----|
| [DEVELOPER-FLEET-HANDBOOK.md](DEVELOPER-FLEET-HANDBOOK.md) | Full workflow detail |
| [DEVELOPER-CWV-CHECKLIST.md](DEVELOPER-CWV-CHECKLIST.md) | Publisher blockers + performance |
| [CWV-WAVE-PROMPT.md](CWV-WAVE-PROMPT.md) | CWV = same TASK-PASTE with `Type: CWV` |
| [CURSOR-MEMORY-PROMPT.md](CURSOR-MEMORY-PROMPT.md) | Agent automation spec (you don't paste this) |
| [JIRA-DEV-WORKFLOW.md](JIRA-DEV-WORKFLOW.md) | Jira board + MCP setup |

---

## Quick commands (Cursor runs these for you)

```bash
node scripts/fleet-local.mjs list
node scripts/fleet-local.mjs up <site-id>
node scripts/fleet-lighthouse.mjs --site <id> --paths /,/blogs/ --min-score 95
```

---

*Owner / fleet docs (ignore unless asked):* `docs/README.md`
