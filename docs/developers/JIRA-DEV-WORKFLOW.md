# Jira + Cursor workflow (Connect Group Astro fleet)

**Project:** [DEV — Web & Platform Updates](https://connect-marketing.atlassian.net/jira/software/projects/DEV/boards/28)  
**Site:** `connect-marketing.atlassian.net`  
**Primary tool:** **Cursor + Atlassian MCP** (not GitHub Actions, not local scripts)

> **Start here:** [developers/README.md](README.md) — session prompt + TASK-PASTE.  
> **Clean code (devs):** [DEVELOPER-CLEAN-CODE.md](DEVELOPER-CLEAN-CODE.md) · **CWV (deploy lead):** [CWV-WAVE-PROMPT.md](CWV-WAVE-PROMPT.md)  
> **Full handbook:** [DEVELOPER-FLEET-HANDBOOK.md](DEVELOPER-FLEET-HANDBOOK.md)

This doc is for **Mushtaq, Tabish, Rajpal**, and **Prabhjas (deploy lead)**.

**Developers:** paste **[TASK-PASTE.md](TASK-PASTE.md)** into Cursor — identity, Jira, and testing are **fully automated** (no names/IDs). Agent spec: [CURSOR-MEMORY-PROMPT.md](CURSOR-MEMORY-PROMPT.md).

---

## Roles at a glance

| Who | Git | Jira (through which status) | Publish |
|-----|-----|----------------------------|---------|
| **Developers** | Feature branch → push → hand off to deploy lead | **To Do → In Progress → Testing** | **No** |
| **Prabhjas (deploy lead)** | Merge into `work/astro-sites`, host publish | **Full cycle incl. Ready for Release → RELEASED** | **Yes** (Aaron path) |

Developers own work **up to and including Testing with evidence**.  
Only the deploy lead moves tickets to **Ready for Release**, runs **publish**, and marks **RELEASED**.

---

## Dual tickets (dev work + deploy work)

Every publish wave uses **two ticket types** so both developers and the deploy lead appear on the board:

| Ticket type | Assignee | Summary pattern | Labels |
|-------------|----------|-----------------|--------|
| **Dev task** | Mushtaq / Tabish / Rajpal | `{Brand}: {feature/fix}` | `dev-wave` |
| **Deploy task** | **Prabhjas** | `Fleet publish: {wave name} ({sites})` | `deploy-wave` |

**When to create the deploy ticket:** as soon as a publish batch is planned — **In Progress on your name from day one**, not only after merge.

The deploy ticket description links to related dev tickets (e.g. DEV-892–896), branch tip, sites, verify URLs, and Aaron-path steps.

**Example:** [DEV-897](https://connect-marketing.atlassian.net/browse/DEV-897) — Rajpal wave publish (you) + DEV-892–896 (Rajpal, per brand).

**Your own code changes:** create a **dev-style ticket on your name** *and* a **deploy ticket** if it ships in a batch — or one combined ticket if you own both build and publish end-to-end.

**Deploy-only ops** (GTM, Pipedrive policy, host env): single ticket on your name only — e.g. DEV-857, DEV-859.

---

## DEV board statuses (in order)

```
To Do  →  In Progress  →  Testing  →  READY FOR RELEASE  →  RELEASED
```

| Status | Meaning |
|--------|---------|
| **To Do** | Optional backlog; usually skip and start at In Progress |
| **In Progress** | Active dev — coding, local build, commits on your branch |
| **Testing** | Dev self-tested; evidence posted (screenshots / URLs / steps) |
| **READY FOR RELEASE** | Deploy lead accepted QA; merged on `work/astro-sites`; queued or ready for host publish |
| **RELEASED** | Live on production — verified by deploy lead |

---

## Developer workflow (step by step)

### 1. Connect Atlassian MCP in Cursor (one-time)

1. Open **Cursor → Settings → MCP** (or edit `~/.cursor/mcp.json`).
2. Add the Atlassian server:

```json
{
  "mcpServers": {
    "Atlassian-MCP-Server": {
      "url": "https://mcp.atlassian.com/v1/mcp/authv2"
    }
  }
}
```

3. Save and **restart Cursor**.
4. When prompted, **sign in with your Connect Group Atlassian account** (OAuth — not an API token).
5. Confirm MCP works: ask Cursor *“List my accessible Atlassian sites”* or *“Search DEV project issues assigned to me”*.

> **Note:** MCP uses OAuth. Each developer uses their own Atlassian login. The agent creates tickets on your behalf after you approve tool calls.

---

### 2. Start work — paste task block (Jira is automatic)

Paste from **[TASK-PASTE.md](TASK-PASTE.md)** — Cursor detects you via Atlassian MCP, creates the DEV ticket, assigns you, sets Brand field, and moves to **In Progress**. You do not create Jira manually.

Example:

```text
---TASK---
Brand: Connect HR
Site: connecthr.ae
Task: Remove off-topic blog posts and fix redirects
Routes: /blogs/
---END---
```

When finished coding, say **`done`** — Cursor runs the testing gate and moves to **Testing** after you confirm screenshots.

**Ticket rules (agent enforces)**

- **One ticket = one logical task on one brand** (OK if 2–3 related commits).
- **Multiple brands in one push → multiple tickets** (one per brand).
- **Summary format:** `{Brand}: {what changed}`  
  Example: `Connect HR: remove off-topic blog posts and fix redirects`
- **Assignee:** yourself (see §6 for account IDs if the agent asks).
- **Brand field:** `customfield_10092` — pick the site brand (Connect HR, KPM PRO, etc.).
- **Description must include:**
  - Branch name (e.g. `rajpal-branch`)
  - Sites / routes to verify (e.g. `/peo-pedia/`, `:5084/blogs/`)
  - Commits (add hashes as you push)
- **Labels (suggested):** `dev-wave`, `awaiting-merge` (until deploy lead merges)

**Do not** create tickets for docs-only noise, lockfile-only churn, or work you did not do.

---

### 3. Develop and push

- Work in the repo: `/Users/…/Projects/Astro-websites` (or your clone).
- Use your **feature branch** (e.g. `rajpal-branch`, `mushtaq-branch`).
- Commits under `Astro-production/<domain>/…` only for site work.
- Push to the agreed remote (personal / Connect Group per team convention).
- **Tell deploy lead** when the branch is ready to merge (Slack / Jira comment / ticket link).

Update the Jira ticket with commit hashes in a comment when pushed.

---

### 4. Self-test locally (required before Testing)

Before asking for **Testing** status:

1. Build / preview the affected site(s) locally.
2. Open the **exact URLs** listed in the ticket.
3. Check desktop + mobile if layout changed.
4. Capture **screenshots** or short screen recording.
5. Note **commit hash(es)** and **local port** used.

**Developers do not publish to production.**

---

### 5. Move to Testing + post evidence

When self-test passes, ask Cursor:

> Move DEV-XXX to **Testing**. Add a comment: tested on [port/URL], commits [hashes], see attached screenshots. Ready for deploy lead review.

Also:

- **Comment on the Jira ticket** with screenshots (attach in Jira UI) or paste paths/links.
- **Notify Prabhjas** with ticket key (e.g. `DEV-894`) and branch name.

**Testing = “I verified locally; here is proof.”**  
It does **not** mean live/production yet.

---

### 6. Stop here (developers)

| You **may** do | You **must not** do |
|----------------|---------------------|
| Create / update your DEV tickets | Move to **READY FOR RELEASE** |
| In Progress → Testing with evidence | Run host publish or `astro-fleet-release` |
| Comment commits, URLs, screenshots | Mark **RELEASED** |
| Fix bugs found in review → stay In Progress / re-Test | Merge into `work/astro-sites` without deploy lead |

Deploy lead will review evidence, merge, publish, and advance statuses.

---

## Deploy lead workflow (Prabhjas)

### Own work

Create ticket at **In Progress** and move through the **full** lifecycle — you own merge, publish, and **RELEASED**.

### Developer work (after their Testing)

1. **Review** ticket comment + screenshots / local repro.
2. If QA fails → comment what to fix; move back to **In Progress** (or leave in Testing with notes).
3. If QA passes:
   - Cherry-pick / merge their branch → `work/astro-sites`
   - Push `origin` + `personal`
   - Move ticket → **READY FOR RELEASE**
   - Add comment: merge commit hash, sites in batch
4. **Host publish** (Aaron path: `astro-fleet-development` → signed commit → `sudo /usr/local/sbin/astro-fleet-release publish`)
5. **Live verify** production URLs
6. Move ticket → **RELEASED** + comment publish commit / evidence

### Batch example (Rajpal wave)

| Ticket | Brand | Dev status | Deploy lead next |
|--------|-------|------------|------------------|
| DEV-892 | PEO Middle East | Testing + screenshots | Merge → Ready for Release → publish → Released |
| DEV-893 | KPM PRO | Testing + screenshots | same |
| DEV-894 | Connect HR | Testing + screenshots | same |
| DEV-895 | Connect Resources | Testing + screenshots | same |
| DEV-896 | Connect Group | Testing + screenshots | same |

---

## Ticket granularity (examples)

| Commits / work | Tickets |
|----------------|---------|
| PEO heroes + peo-pedia (same brand, same feature) | **1** (DEV-892) |
| KPM sitemap + retire 4 posts (same brand, related cleanup) | **1** (DEV-893) |
| Connect HR blog removal + URL cleanup (same brand, one cleanup wave) | **1** (DEV-894) |
| Iberia Pipedrive + GTM containers (ops, not presentation) | **Separate** deploy-ops tickets (DEV-857, DEV-859) |

---

## Jira field reference (for Cursor agent)

| Item | Value |
|------|--------|
| Cloud ID | `5b8a830d-0824-481c-83be-1d5d8b477112` |
| Project key | `DEV` |
| Issue type | Task |
| Brand field | `customfield_10092` |

### Assignees (accountId)

| Person | accountId |
|--------|-----------|
| Muhammad Mushtaq | `712020:8851c826-494d-4345-b770-35d80838168d` |
| Muhammad Tabish | `712020:d3d56b11-4655-4b7c-9ae5-cc054ce9d84d` |
| Rajpal Singh | `712020:7df4daef-fbc8-46ff-a6a1-0d02b0280ea2` |
| Prabhjas Singh | `62860e31f0302e0068bea3ca` |

### Common brand option IDs

| Domain folder | Brand | ID |
|---------------|-------|-----|
| `connectgroup.co` | Connect Group | `10169` |
| `connecthr.ae` | Connect HR | `10123` |
| `connectresources.ae` | Connect Resources | `10122` |
| `kpmpro.ae` | KPM PRO | `10127` |
| `peomiddleast.com` | PEO Middle East | `10126` |
| `eormiddleast.com` | EOR Middle East | `10306` |
| `connectfm.ae` | Connect FM | `10305` |
| `redo.ae` | Redo | `10124` |
| `connectfreelance.ae` | Connect Freelance | `10130` |
| `connectfz.com` | Connect FZ | `10142` |
| `mbs-consultancy.com` | MBS Consultancy | `10371` |

(More domains: see `scripts/jira-commit-sync.mjs` → `DOMAIN_BRAND` if the agent needs others.)

### Workflow transition IDs

| Target status | Transition ID |
|---------------|---------------|
| To Do | `21` |
| In Progress | `31` |
| Testing | `51` |
| READY FOR RELEASE | `3` |
| RELEASED | `61` |

---

## Cursor starter prompt

**Developers:** use **[TASK-PASTE.md](TASK-PASTE.md)** only. Automation is in `.cursor/rules/developer-fleet-handbook.mdc`.

**Deploy lead:** full lifecycle per [DEVELOPER-HANDOFF.md](../DEVELOPER-HANDOFF.md).

---

## Quick phrases (daily use)

**Developer — start task**

> Create DEV ticket for Connect FZ visa pages, assign Tabish, In Progress.

**Developer — ready for review**

> DEV-894: move to Testing. Commits 821a1b8, 0efe50f. Tested connecthr.ae :5084 /blogs/ — screenshots in ticket comment.

**Deploy lead — accept QA**

> Review DEV-892–896 evidence; merge rajpal-branch to work/astro-sites; move to Ready for Release.

**Deploy lead — after publish**

> DEV-892–896 live verified; move to RELEASED. Publish commit 4da480d5b.

---

## What we do not use for Jira

- GitHub Actions (`jira-commit-sync.yml`) — org action minutes / optional; **not required**
- Local `scripts/jira-commit-sync.mjs` — optional; **MCP is the standard path**

---

## Checklist (developer, before saying “ready for review”)

- [ ] DEV ticket exists and is assigned to me
- [ ] Brand field set correctly
- [ ] Commits pushed on my branch; hashes in ticket comment
- [ ] Local preview tested on listed URLs
- [ ] Screenshots attached or linked in Jira comment
- [ ] Ticket moved to **Testing**
- [ ] Deploy lead notified (ticket key + branch name)

---

## Checklist (deploy lead, before RELEASED)

- [ ] Testing evidence reviewed
- [ ] Merged to `work/astro-sites` (both remotes)
- [ ] **READY FOR RELEASE** set
- [ ] Host signed commit + `astro-fleet-release publish` completed
- [ ] Production URLs verified
- [ ] **RELEASED** + publish commit noted in ticket

---

*Updated: 2026-08-31 · Owner: Prabhjas · Fleet repo: Connect-Group-Tech/Astro-websites*
