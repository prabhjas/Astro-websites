# Owner / ops only — guarded Caddy cutover

**Audience:** fleet owner / root on the Astro host.
**Current standard:** C-01 named-CA/manual-loader configuration, 10 Aug 2026.

| Item | Authoritative value |
|------|---------------------|
| Git mirror | [`caddy/Caddyfile.production`](../caddy/Caddyfile.production) |
| Live path | `/etc/caddy/Caddyfile` |
| Structure and onboarding | [CONNECT-CADDY-DEPLOYMENT.md](CONNECT-CADDY-DEPLOYMENT.md) |
| CI gate | `.github/workflows/private-key-guard.yml` |
| Post-change checks | [10-GO-LIVE-VERIFY-CHECKLIST.md](10-GO-LIVE-VERIFY-CHECKLIST.md) |

## C-01 hard rule

Production uses one reviewed Caddyfile. It has bare-host site blocks, named CA
automation, and two synchronously loaded certificate/key pairs per site. Do not:

- install a per-site fragment under a `sites.d` directory;
- add a `sites.d` import;
- restore the default local CA or a bare internal TLS directive;
- overwrite the canonical file from an old staging bundle;
- reload before validation and structural CI pass.

Cloudflare remains intentionally on **Full**. Do not select Flexible. Full
(strict) remains deferred until a separately approved trust model is deployed.

## Retired dated cutover bundles — never run

The old `/home/webdev/astro-cutover-env/ROOT-BOOTSTRAP-nine-fleet.sh` and
`/home/webdev/astro-cutover-env/ROOT-BOOTSTRAP-launch-six.sh` scripts install
slim staged Caddyfiles over production. They predate C-01 and are retired.
Their sibling staged Caddyfiles and notes are not valid deployment inputs.

Likewise, the 20260807 `_incoming/` Caddy installer and staged security
Caddyfile are retired. The checked-in installer is a fail-closed tombstone.

## Reviewed canonical-only procedure

1. Start from a clean reviewed commit after the private-key/Caddy workflow passes.
2. Confirm `caddy/Caddyfile.production` contains the C-01 schema marker,
   29 named-CA policies, and 58 paired manual loaders.
3. Confirm the candidate does not contain a live `sites.d` import, default local
   CA policy, missing loader, or credential material.
4. Compare the candidate with live `/etc/caddy/Caddyfile`; review every change.
   Never replace an unknown concurrent live edit.
5. Validate the exact candidate as the Caddy service user before installation.
6. Take a root-only recovery copy, install the exact validated bytes with
   `root:caddy` ownership and mode `0640`, then use a graceful reload.
7. Require Caddy active status, direct-origin TLS chain checks, local HTTP health,
   Cloudflare edge checks, and canonical redirects to pass.
8. Confirm `astro-caddy-certificate-refresh.timer` remains enabled and healthy.

If any gate fails, stop. Do not substitute a pending, before, archive, split-file,
or staged Caddyfile. Use the verified recovery procedure from the current C-01
rotation tooling.

## Adding a site later

1. Reserve the port and canonical hostname in the fleet registry.
2. Add the complete bare-host deploy block to the checked-in per-site snippet.
3. Prewarm apex and `www` leaves under the assigned named CA.
4. Add both exact manual loaders to the per-site snippet and canonical file.
5. Extend the shared one-hop HTTP alternate-host redirect.
6. Run structural CI, Caddy adaptation, validation, and the reviewed owner cutover.
7. Run the public and direct-origin verification checklist.

Payroll is the exception to the fleet CA: it must use
`payroll_origin_isolated_2026`; all other current sites use `astro_origin_2026`.

## Related owner work

Caddy changes do not authorize secret rotation, access changes, DNS changes, or
service restarts beyond the reviewed scope. Backup maintenance remains documented
under [`Astro-production/deploy-host/README.md`](../Astro-production/deploy-host/README.md).

*Owner-only. Keep production mutations out of ordinary app deployment steps.*
