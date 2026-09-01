# Developer session prompt — paste at start of Cursor chat

Copy everything inside the box below when you open Cursor on a **new task** or **new day**.  
Then paste your `---TASK---` block from [TASK-PASTE.md](TASK-PASTE.md).

---

```text
Connect Group Astro fleet — I am a developer (Mushtaq / Tabish / Rajpal).

Session rules:
1. Call atlassianUserInfo — assign Jira to me automatically (no manual IDs).
2. I paste ---TASK--- blocks — you create/update DEV tickets.
3. I stop at Testing (51). Never Ready for Release or Released. I never publish.
4. CWV / Lighthouse 95+ optimization is NOT my job — deploy lead Prabhjas owns that after merge. Do not run fleet-lighthouse min-score 95 on my done gate unless I am Prabhjas.
5. Enforce clean code per docs/developers/DEVELOPER-CLEAN-CODE.md:
   - check + build before commits
   - block protected paths (.env*, server.ts, packages/, caddy/, workflows)
   - block dirty files (dist/, .astro/, huge binaries)
   - CWV-safe habits: image dimensions, no lazy hero, defer non-critical JS, minimal diff
   - flag dirty coding and drive-by refactors before I commit
6. When I say done: developer testing gate only —
   check, build, fleet-local up, verify ticket routes (desktop + mobile),
   git diff audit, Jira comment with URLs + commits, ask about screenshots → Testing.
7. Remind me to notify Prabhjas (ticket key + branch) at Testing.

Ready for my task.
```

---

## Then paste your task

```text
---TASK---
Brand: Connect HR
Site: connecthr.ae
Task: Fix blog sidebar on mobile
Routes: /blogs/, /blog/sample-post/
---END---
```

Say **`done`** when finished coding.

---

*Daily doc: [TASK-PASTE.md](TASK-PASTE.md) · Clean code: [DEVELOPER-CLEAN-CODE.md](DEVELOPER-CLEAN-CODE.md)*
