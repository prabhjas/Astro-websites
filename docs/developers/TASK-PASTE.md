# Task paste — copy this into Cursor (only thing developers type)

**No names. No account IDs. No Jira steps.**  
Paste the block below → Cursor creates the ticket, assigns **you** automatically, and runs the flow.

**First time today?** Paste [DEVELOPER-SESSION-PROMPT.md](DEVELOPER-SESSION-PROMPT.md) once, then your task.

**Requires:** Atlassian MCP connected once ([JIRA-DEV-WORKFLOW.md §1](JIRA-DEV-WORKFLOW.md#1-connect-atlassian-mcp-in-cursor-one-time)).

**CWV / Lighthouse optimization:** deploy lead only — see [DEVELOPER-CLEAN-CODE.md](DEVELOPER-CLEAN-CODE.md).

---

## Standard task (content / fix / feature)

Copy, fill in the 4 lines, paste into Cursor chat:

```text
---TASK---
Brand: Connect HR
Site: connecthr.ae
Task: Remove off-topic blog posts and fix redirects
Routes: /blogs/, /blog/sample-slug/
---END---
```

**Optional:** add `Branch: your-branch` if not on your usual branch. Cursor reads `git branch` if omitted.

---

## What Cursor does automatically (you do nothing else)

| Step | Cursor (automatic) |
|------|-------------------|
| 1 | Detects **you** via Atlassian MCP (`atlassianUserInfo`) — no manual name/ID |
| 2 | Looks up **port**, **site-id**, **pnpm package** from `scripts/fleet-sites.json` |
| 3 | Looks up **Brand field** from domain in `scripts/jira-commit-sync.mjs` |
| 4 | Searches DEV for duplicate → creates ticket if none |
| 5 | Assigns you · label `dev-wave` · **In Progress** |
| 6 | Codes with you · runs `check` + `build` · blocks dirty/protected files ([clean code rules](DEVELOPER-CLEAN-CODE.md)) |
| 7 | On commits → **comments Jira** with hash + summary |
| 8 | When you say **`done`** → local preview + route checks + diff audit · **comments evidence** |
| 9 | Asks: *Did you attach screenshots in Jira?* · *Did you test desktop + mobile?* → then **Testing** |
| 10 | Reminds you to notify deploy lead **Prabhjas** (ticket key + branch) |

**You never:** create Jira manually · run CWV optimization waves · set statuses beyond Testing · publish.

---

## When you're finished coding

Just say:

```text
done
```

Or paste the same task block again with `Status: ready for review`.  
Cursor runs the **developer** testing gate (no Lighthouse 95 requirement for you).

---

## Examples

**KPM PRO sitemap:**
```text
---TASK---
Brand: KPM PRO
Site: kpmpro.ae
Task: Retire 4 blog posts and update sitemap
Routes: /blog/, /sitemap.xml
---END---
```

**Connect FZ pages:**
```text
---TASK---
Brand: Connect FZ
Site: connectfz.com
Task: Add visa services landing pages
Routes: /, /visa-services/
---END---
```

**Performance concern (not a CWV task for you):**
```text
---TASK---
Brand: Connect HR
Site: connecthr.ae
Task: Homepage hero image swap — note slow LCP for deploy lead CWV wave
Routes: /
---END---
```

Fix the content; mention performance in the ticket comment — **Prabhjas** schedules optimization.

---

## If something fails

| Problem | Fix |
|---------|-----|
| MCP not connected | Cursor → Settings → MCP → Atlassian → sign in |
| Wrong assignee | Sign in with **your** Connect Group Atlassian account |
| Ticket not created | Paste task block again — Cursor retries |
| Testing blocked | Fix `check`/`build` errors or dirty paths Cursor reports |
| Cursor wants Lighthouse 95 | That's deploy lead — you only need check/build + route screenshots |

---

*Session prompt: [DEVELOPER-SESSION-PROMPT.md](DEVELOPER-SESSION-PROMPT.md) · Clean code: [DEVELOPER-CLEAN-CODE.md](DEVELOPER-CLEAN-CODE.md) · Agent rules: `.cursor/rules/developer-fleet-handbook.mdc`*
