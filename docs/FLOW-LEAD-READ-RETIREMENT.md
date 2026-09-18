# FLOW enquiry list/export retirement

Review contract verified against source on 2026-09-18 UTC. This document is staged design, not evidence of installation or a per-site closure date.

## Gate and scope

The owner approved fleet-wide retirement after reconciliation of SnapSale, IZI, Saudi Company Formation and The UAE Gate. Their signed intake is active; historical backfill must be separately evidenced before closure. LLA Designers and Payroll Middle East have external public-host verification exceptions; closing this server's origin does not certify their externally hosted endpoints. See the dated root operations status for actual completion, not this staged contract.

Remove the actual Astro filesystem mounts for /api/internal/leads, /api/internal/export-leads, /api/internal/leads/[publicId] and /api/internal/retry-lead on all 41 sites that mount them (164 files). Connect Resources International has none. Do not replace the handlers with a disabled middleware response. New sites must not copy any of these routes back from older peers or historical documentation.

The retained contract is:

- The slash-suffixed URLs return 404, with or without the existing internal key.
- Slashless URLs return 404 directly, or one standard 301/302/303/307/308 with an exact root-relative Location adding only the slash and preserving the query, followed by 404.
- Probe the plain list, its old limit query, and plain/JSON/CSV export variants. Status-only GET checks must discard response bodies; the previous list ignores limit and may return the whole history.
- Preserve /api/internal/run-retries for the installed server-side workers and signed FLOW self-test. Block it at every public edge, all methods; workers call authenticated direct-loopback backend ports. Do not trust forwarded client-address headers to establish locality. Detail and manual retry have no observed application caller and are removed.
- Preserve shared handler exports as unmounted library code, local stores, stable IDs, intake delivery, authentication, and all other internal routes and keys.
- Preserve posts, taxonomy, redirects read/save/delete, GTM read/save, SEO text files, sitemap, and health. No auth weakening, global trailingSlash change or store deletion is part of this patch. Existing absent CMS mounts and Connect Freelance's redirect-mutation freeze remain unchanged.

## Validation

After applying a reviewed patch to source, run node --test scripts/tests/retired-lead-reads.test.mjs and the existing shared CMS tests. Use each site's actual check/build/prebuild scripts, then inspect every candidate backend manifest to ensure all four retired mounts are absent. Thirty-seven sites have a content catch-all; a source deletion alone does not prove a retired URL cannot match content or a stored redirect. Prove the actual 404 result for every candidate and live layer.

scripts/fleet-local.mjs smoke uses synthetic local auth and discards retired-endpoint response bodies. It also checks redirects and GTM authentication where mounted. Set FLEET_SMOKE_CONTACT=0 for route-retirement smoke in an isolated local environment. Never aim the local runner at production; its other modes write files/start services and its contact smoke can create real leads.

For production, use owner-controlled status-only verification with existing keys loaded in memory, never passed as shell arguments or printed. Record both HTTP hops and a UTC closure date per site at the immutable trusted backend, origin edge, and canonical public HTTPS endpoint. Test redirects/GTM with the same existing keys; preserve the pre-existing absent-route baseline on leads-only/brochure sites. Test mutation handlers using isolated synthetic stores, not by changing live GTM, content or redirects.

## Protected rollout and rollback

Follow current /opt/AGENTS.md, /opt/ARCHITECTURE.md, /opt/README.md and installed owner policy, not historical rsync/restart examples in copied site docs. Review and coordinate the installed backend-sync automation: a presentation source acceptance may trigger backend repinning. Do not publish/activate this patch as an ordinary presentation-only release before the intake/backfill gate.

Keep exact previous immutable backend artifacts, service settings, and resolved persistent lead-store paths for rollback. Install a root-owned retirement guard before advancing accepted source: backend-sync must refuse old route-bearing artifacts, including rollback candidates. Old presentation commits must not repin retired backends; compliant future candidates remain eligible. Public edge guards remain outside presentation publish authority. Never delete or replace .data or /opt/Astro-production. A successful source dry-run or helper test is not a build, deployment, or public 404 proof.

## Superseded historical callers

Older per-site ADMIN.md, CONNECT-ASTRO-FLEET-STANDARD.md, LOCAL-TEST.md, phase sign-offs, lead-ops dashboard and go-live handoff documents may still describe list/export reads. This central contract supersedes those examples; do not copy their mounts. Historical final-qa.mjs and _bearer-smoke.mjs scripts, plus Alburaq phase10-verify.mjs, _qa-form-click.mjs, _qa-form-all.mjs and _verify-checklist.mjs, still include list reads and/or real form submissions. They are not retirement acceptance tests and are not safe production probes. Migrate a legacy script before reusing it; do not weaken the new 404 expectation to make it pass.
