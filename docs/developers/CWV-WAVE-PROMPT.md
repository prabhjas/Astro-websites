# CWV optimization — deploy lead only (Prabhjas)

**Developers do not run CWV waves.** They write [CWV-safe clean code](DEVELOPER-CLEAN-CODE.md); you own Lighthouse 95+ after merge.

---

## When to use

- Site needs Performance 95+ on homepage / key routes
- Field CrUX debt (connecthr, connectresources, etc.)
- Post-publish regression
- Batch label: `cwv-wave` on **your** ticket (or linked deploy ticket)

---

## Deploy-lead TASK block

```text
---TASK---
Type: CWV
Brand: Connect HR
Site: connecthr.ae
Task: Lighthouse 95+ — LCP tier on homepage and /blogs/
Routes: /, /blogs/
---END---
```

Or during **Gate 3** ([DEPLOY-LEAD-FLOW.md](DEPLOY-LEAD-FLOW.md)): run `fleet-lighthouse.mjs` on merged work without a separate ticket if the wave is small.

---

## Workflow

1. **Baseline** Lighthouse before changes — comment on ticket
2. **One tier at a time** (LCP → fonts/CLS → JS → CSS → legacy WP) — [DEVELOPER-FLEET-HANDBOOK.md § Phase 4](DEVELOPER-FLEET-HANDBOOK.md#phase-4--core-web-vitals--deploy-lead-only)
3. `check` + `build` + `fleet-local` + routes after each tier
4. Revert tier if score or layout regresses
5. Gate 3 → Ready for Release → Aaron path → live PSI verify

**Checklist:** [DEVELOPER-CWV-CHECKLIST.md](DEVELOPER-CWV-CHECKLIST.md) (full Parts A–E)

---

## Suggested priority sites

| Priority | Sites |
|----------|-------|
| **P0** | connecthr.ae, connectresources.ae |
| **P1** | Any site with CrUX debt |
| **P2** | Remaining fleet |

---

*Developers: ignore this file — use [TASK-PASTE.md](TASK-PASTE.md) only.*
