# Task paste — copy this into Cursor (only thing developers type)

**No names. No account IDs. No Jira steps.**  
Paste the block below → Cursor creates the ticket, assigns **you** automatically, and runs the full flow.

**Requires:** Atlassian MCP connected once ([JIRA-DEV-WORKFLOW.md §1](JIRA-DEV-WORKFLOW.md#1-connect-atlassian-mcp-in-cursor-one-time)).

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

## CWV task (one site, performance)

```text
---TASK---
Type: CWV
Brand: Connect HR
Site: connecthr.ae
Task: Lighthouse 95+ on homepage and key routes
Routes: /, /blogs/, /services/
---END---
```

---

## What Cursor does automatically (you do nothing else)

| Step | Cursor (automatic) |
|------|-------------------|
| 1 | Detects **you** via Atlassian MCP (`atlassianUserInfo`) — no manual name/ID |
| 2 | Looks up **port**, **site-id**, **pnpm package** from `scripts/fleet-sites.json` |
| 3 | Looks up **Brand field** from domain in `scripts/jira-commit-sync.mjs` |
| 4 | Searches DEV for duplicate → creates ticket if none |
| 5 | Assigns you · label `dev-wave` · **In Progress** |
| 6 | Codes with you · runs `check` + `build` · blocks dirty/protected files |
| 7 | On commits → **comments Jira** with hash + summary |
| 8 | When work is done → runs tests + Lighthouse 95+ · **comments evidence** |
| 9 | Asks: *Did you attach screenshots in Jira?* → then **Testing** |
| 10 | Reminds you to notify deploy lead (ticket key + branch) |

**You never:** create Jira manually · set statuses beyond Testing · publish.

---

## When you're finished coding

Just say:

```text
done
```

Or paste the same task block again with `Status: ready for review`.  
Cursor runs the testing gate and updates Jira.

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

---

## If something fails

| Problem | Fix |
|---------|-----|
| MCP not connected | Cursor → Settings → MCP → Atlassian → sign in |
| Wrong assignee | Sign in with **your** Connect Group Atlassian account |
| Ticket not created | Paste task block again — Cursor retries |
| Testing blocked | Fix `check`/`build` errors Cursor reports |

---

*Full agent rules: `.cursor/rules/developer-fleet-handbook.mdc` · Details: [CURSOR-MEMORY-PROMPT.md](CURSOR-MEMORY-PROMPT.md)*
