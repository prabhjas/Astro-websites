# Jira ↔ git commit sync

> **Standard process:** use **Cursor + Atlassian MCP** and [JIRA-DEV-WORKFLOW.md](./JIRA-DEV-WORKFLOW.md) — not this script or GitHub Actions.

## One-shot backfill (done)

Last ~2 weeks of Mushtaq / Tabish / Rajpal / Prabhjas workstreams were filed as DEV tickets labeled `git-backfill` (DEV-861–DEV-891 plus earlier DEV-856–859 for Iberia/EOR/GTM).

## Optional automation (not the standard path)

| Piece | Path |
|-------|------|
| Script | [`scripts/jira-commit-sync.mjs`](../scripts/jira-commit-sync.mjs) |
| Workflow | [`.github/workflows/jira-commit-sync.yml`](../.github/workflows/jira-commit-sync.yml) |

On push to `work/astro-sites` (Astro-production paths), or via **Actions → Jira commit sync → Run workflow**:

1. Scans commits since the window (default 24h)
2. Maps author → Jira assignee, domain → Brand
3. Creates a DEV Task if no ticket already mentions that short hash
4. Moves to **In Progress** (or **Testing** if subject looks like ship/publish)

### Repo secrets (owner)

- `JIRA_EMAIL` — Atlassian account email  
- `JIRA_API_TOKEN` — [API token](https://id.atlassian.com/manage-profile/security/api-tokens)  
- `JIRA_CLOUD_ID` — optional; defaults to connect-marketing cloud id in the script  

### Local dry-run

```bash
export JIRA_EMAIL=...
export JIRA_API_TOKEN=...
DRY_RUN=1 GIT_SINCE='7 days ago' node scripts/jira-commit-sync.mjs
```

### Opt out

Put `[skip jira]` in the commit subject.

### Note

`.github/` may be a protected path on the fleet publish lane — merge/enable this workflow via owner/security if push is blocked. Until then, run the script locally or via `workflow_dispatch` after secrets are set.
