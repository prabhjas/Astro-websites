# CWV wave — one site (use TASK-PASTE)

Developers do **not** fill site-id, port, package, or Jira IDs. Paste the CWV block from **[TASK-PASTE.md](TASK-PASTE.md)**:

```text
---TASK---
Type: CWV
Brand: Connect HR
Site: connecthr.ae
Task: Lighthouse 95+ on homepage and key routes
Routes: /, /blogs/, /services/
---END---
```

Cursor automatically: detects you · creates DEV ticket (`cwv-wave` + `dev-wave`) · baseline Lighthouse **before** code · one tier at a time · testing gate · **Testing**.

**Read:** [DEVELOPER-FLEET-HANDBOOK.md § Phase 4](DEVELOPER-FLEET-HANDBOOK.md#phase-4--core-web-vitals--95-performance-program) · [DEVELOPER-CWV-CHECKLIST.md](DEVELOPER-CWV-CHECKLIST.md)

**Suggested first sites:** connecthr.ae (P0) · connectresources.ae (P0) · any other site when ready.

When finished, say **`done`**.
