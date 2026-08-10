# H-05 — Payroll Middle East DNS/TLS/TRACE owner checklist

Scope: `payrollmiddleast.org` and `www.payrollmiddleast.org` only.

Finding H-05 showed at least one public hostname reaching a legacy host with an
expired certificate and TRACE exposure instead of the Astro/Caddy deployment.
This checklist intentionally makes no DNS or Cloudflare API call. All dashboard
changes require an authenticated owner and a second-person review.

## 1. Preserve evidence and rollback data

- [ ] Export or screenshot the current Cloudflare DNS rows for apex and `www`,
      including record type, exact target, proxy state, and TTL.
- [ ] Record Cloudflare SSL/TLS mode, Minimum TLS Version, edge certificate state,
      and any hostname-specific configuration rules.
- [ ] Record the legacy provider/account and confirm who can restore it.
- [ ] Capture current public status, redirect chain, certificate subject/SAN,
      issuer and expiry, and TRACE status for apex and `www` separately.
- [ ] Do not include cookies, authorization headers, tokens, lead data, or private
      keys in the change record.

Optional read-only evidence commands from a controlled workstation:

```bash
curl -sSIk --max-time 15 https://payrollmiddleast.org/
curl -sSIk --max-time 15 https://www.payrollmiddleast.org/
printf '' | openssl s_client -connect payrollmiddleast.org:443 \
  -servername payrollmiddleast.org 2>/dev/null | openssl x509 -noout -subject -issuer -dates -ext subjectAltName
printf '' | openssl s_client -connect www.payrollmiddleast.org:443 \
  -servername www.payrollmiddleast.org 2>/dev/null | openssl x509 -noout -subject -issuer -dates -ext subjectAltName
curl -sSik --max-time 15 -X TRACE https://payrollmiddleast.org/ -o /dev/null -w '%{http_code}\n'
curl -sSik --max-time 15 -X TRACE https://www.payrollmiddleast.org/ -o /dev/null -w '%{http_code}\n'
```

Expected remediation result for TRACE is rejection, normally `405` or `501`, not
reflection of the request or a `200` response.

## 2. Prove the Astro deployment before DNS cutover

- [ ] `payrollmiddleast.service` is enabled/running as its dedicated site account,
      not root, and listens only on `127.0.0.1:5110`.
- [ ] `/etc/caddy/Caddyfile` contains both Payroll hostnames, canonicalizes to
      `https://www.payrollmiddleast.org`, and proxies to `127.0.0.1:5110`.
- [ ] Caddy configuration validates without reloading it:

  ```bash
  sudo -u caddy caddy validate --config /etc/caddy/Caddyfile
  ```

- [ ] Before `reverse_proxy` in the Payroll site block, explicitly reject TRACE
      if the verified live route does not already do so. Review and stage this
      narrow matcher, back up the Caddyfile, validate it, and reload only in the
      later approved change window:

  ```caddyfile
  @trace method TRACE
  respond @trace 405
  ```

- [ ] Test the Node service locally without DNS:

  ```bash
  curl -fsS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:5110/
  ```

- [ ] Test Caddy locally using the intended host and internal origin certificate:

  ```bash
  curl -skI --resolve www.payrollmiddleast.org:443:127.0.0.1 \
    https://www.payrollmiddleast.org/
  curl -skI --resolve payrollmiddleast.org:443:127.0.0.1 \
    https://payrollmiddleast.org/
  curl -sk -o /dev/null -w '%{http_code}\n' -X TRACE \
    --resolve www.payrollmiddleast.org:443:127.0.0.1 \
    https://www.payrollmiddleast.org/
  ```

- [ ] A synthetic contact submission reaches only the Payroll lead store and is
      covered by the refreshed Restic dry-run. Remove the synthetic PII afterward
      through the approved lead-retention workflow.
- [ ] No live secret is world/developer-readable; Payroll has a unique internal
      job secret and provider tokens are valid.
- [ ] Caddy and service logs are open in a separate terminal for the cutover.

## 3. Owner dashboard change

- [ ] Confirm the approved Astro origin address with the infrastructure owner;
      do not copy an address from an unreviewed ticket or chat message.
- [ ] Change both apex and `www` to the reviewed Astro target. Preserve the
      intended canonical-host relationship; do not leave either name on legacy.
- [ ] Enable Cloudflare proxying for both hostnames.
- [ ] Keep Cloudflare SSL/TLS mode compatible with the reviewed origin setup.
      The repository currently documents `Full` with Caddy `tls internal`; do not
      select Flexible. Do not select Full (strict) until a trusted Origin CA/public
      certificate is deliberately installed and tested.
- [ ] Set Minimum TLS Version to TLS 1.2 or newer.
- [ ] Ensure no rule forwards either Payroll hostname back to the legacy host.
- [ ] Save one change at a time and record the timestamp/operator.

## 4. Acceptance tests

- [ ] Apex performs one permanent redirect to the canonical `www` HTTPS URL,
      preserving path and query string.
- [ ] Canonical home, representative assets, `robots.txt`, sitemap, contact page,
      and a valid form request work through public Cloudflare HTTPS.
- [ ] Certificate is currently valid, covers the requested hostname, and is the
      Cloudflare edge certificate—not the expired legacy certificate.
- [ ] TLS 1.0 and TLS 1.1 fail; TLS 1.2 and TLS 1.3 succeed where supported:

  ```bash
  openssl s_client -connect www.payrollmiddleast.org:443 \
    -servername www.payrollmiddleast.org -tls1 </dev/null
  openssl s_client -connect www.payrollmiddleast.org:443 \
    -servername www.payrollmiddleast.org -tls1_1 </dev/null
  openssl s_client -connect www.payrollmiddleast.org:443 \
    -servername www.payrollmiddleast.org -tls1_2 </dev/null
  ```

- [ ] TRACE is rejected at both Cloudflare and direct Caddy origin layers.
- [ ] Direct access to the Astro origin on 80/443 is denied from non-Cloudflare
      networks after H-04 is complete.
- [ ] No 5xx spike, redirect loop, mixed-content error, lead failure, or unexpected
      request remains in Caddy/service logs during the observation window.

## 5. Rollback and legacy retirement

Rollback trigger: sustained 5xx/redirect loop, invalid edge certificate, failed
lead ingestion, or missing critical content that cannot be corrected promptly.

- [ ] Revert only the DNS rows/settings recorded in step 1; do not improvise a
      third target.
- [ ] Confirm public resolution/edge behavior and service recovery after rollback.
- [ ] Preserve logs and document why the acceptance gate failed.
- [ ] After a successful cutover and observation period, remove the old DNS target,
      revoke legacy access/credentials, and decommission the legacy server through
      its provider's recoverable workflow.
- [ ] Do not leave the legacy host public with an expired certificate or TRACE
      simply because DNS has moved; it can still be found by scanners/history.
