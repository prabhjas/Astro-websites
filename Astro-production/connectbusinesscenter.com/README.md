# connectbusinesscenter.com — Astro fleet site

## Backend-only enquiry-read retirement — 2026-09-19

The enquiry list/export/single-record/manual-retry mounts are removed in this
source. Contact submission, signed outbound FLOW intake, Pipedrive, existing
keys, private stores and scheduled retries are not changed. Source/build
completion is not deployment proof; see the root-controlled operation status
at `/opt/ops/flow-lead-read-retirement-20260918/STATUS.md`.

The independently selected presentation is `e150c319`; the older backend is
`6c44625f`. This retirement excludes three WordPress stub mounts which were
never active on that backend. Its existing unavailable `/cdn-cgi/rum/` behavior
is kept at HTTP 404 only when the managed root launcher supplies the exact raw
marker `INTERNAL_ADMIN_DIR=/data/internal-admin`. The marker is captured once
per process and affects only this non-PII stub, never authentication or delivery.
The offline build and secretless presentation omit it and retain the current
empty HTTP 204 response with `Cache-Control: no-store`.

No presentation pointer or current page content is changed. The backend RUM
compatibility response preserves unavailability, not historical custom 404
HTML bytes. The root-owned package at
`/opt/ops/cbc-backend-preservation-20260919/` records exact source preimages,
synthetic tests and required isolated generated-runtime proof. Do not infer
production CMS write health from synthetic writable-fixture tests.

Connect Business Center (https://connectbusinesscenter.com/) — WordPress/Elementor → Astro SSR mirror.

| | |
|--|--|
| Port | **5116** |
| Fleet id | `connectbusinesscenter` |
| Package | `connectbusinesscenter-astro` |
| CMS | `@connect/site-cms` `FEATURES_FULL_CMS` |
| Peer scaffold | `kinzahr.com` (WP mirror) |

See `AGENTS.md` and `docs/00-NEW-SITE-MASTER.md` at the monorepo root.
