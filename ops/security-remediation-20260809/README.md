# Astro fleet security remediation pack — 2026-08-09

This directory contains **owner-run** remediation helpers for H-02 through H-07
and M-02/M-06 through M-09, plus rollout-readiness verification for the branch's
C-02, H-01, M-03, and M-04 application fixes. H-08 is handled by the separate
tracked-source baseline commit on the same branch. The C-02 change also removes
arbitrary GTM script writes, but the broader M-05 legacy-content/CSP migration is
not claimed complete. Application builds are intentionally not deployable from
the fleet's current mutable, external-`node_modules` `dist` architecture.

Every top-level shell helper is dry-run/read-only by default. A helper that can change live
state requires `--apply`; higher-risk operations also require a finding-specific
confirmation flag. No helper calls a DNS or Cloudflare API. No helper reloads or
restarts Caddy/systemd, reboots the host, or sends a signal unless its own explicit
apply phase says so in a warning.

## Safe operating sequence

1. Copy this directory to the production host without copying any generated
   secret staging directory back into git.
2. Open two independent, tested owner SSH sessions. Keep one untouched as a
   recovery session.
3. Confirm a current provider snapshot and a current Restic snapshot before any
   apply phase.
4. Run every script without arguments first. Review all `BLOCKED`, `WARN`, and
   manual items.
5. Apply one finding at a time. Re-run the same script in default mode after the
   change and record the result.
6. Perform service reloads/restarts and the reboot only in a declared maintenance
   window using the manual gates below.

Recommended order (developer exclusion is a manual owner incident action; script
09 only prepares evidence and the checklist):

```text
09 access audit/owner plan -> owner excludes developer write/auth paths
-> 01 permissions -> 02 credential rotation -> 06 backup coverage
-> 03 origin/firewall -> 04 Payroll cutover -> 08 TLS/CSP/systemd
-> 10 application build verification
-> 07 orphan cleanup -> 05 patch/reboot
```

The order intentionally secures backups before disruptive infrastructure work.

## Artifacts

| Finding | Artifact | Default behavior | Apply behavior |
| --- | --- | --- | --- |
| H-02/H-03 | `01-sensitive-modes-and-lead-pii.sh` | Audits sensitive env and lead-store modes without reading values | Normalizes the nine confirmed exposed secret files and restricts safe lead targets; records an ownership/mode rollback script |
| H-02 | `02-stage-unique-internal-secrets.sh` | Lists sites/key names requiring rotation | Generates unique `INTERNAL_JOB_SECRET` files in a new root-only staging directory; never edits env files |
| H-04/M-07 | `03-origin-and-ufw-plan.sh` | Inspects Caddy/UFW/listener evidence | Writes a review plan only; never changes firewall/Caddy |
| M-07 | `03b-remove-stale-ufw-4323.sh` | Verifies whether TCP 4323 appears unused | With two confirmations, backs up UFW config and removes only the exact `4323/tcp` allow rule |
| H-05 | `04-payroll-dns-tls-trace-checklist.md` | Manual no-API cutover and rollback checklist | No automated apply phase by design |
| H-06 | `05-patch-and-reboot-verifier.sh` | Reports kernel/reboot/update state | With snapshot and maintenance confirmations, applies vendor packages but never reboots |
| H-07 | `06-restic-fleet-coverage.sh` | Seals reviewed bytes, binds coverage to the reviewed 29-unit/site map and effective active WorkingDirectories, and compares exact installed output | Backs up and atomically installs only the sealed reviewed script; does not start a backup or reload a unit |
| M-07 | `07-orphan-http-processes.sh` | Produces a PID/start-time-bound candidate plan | Sends only SIGTERM to exact still-matching planned PIDs; never SIGKILLs |
| M-02/M-08/M-09 | `08-tls-csp-systemd-plan.sh` | Audits static Caddy/unit controls | Generates candidate snippets/drop-ins in a new staging directory only |
| M-06 | `09-developer-access.sh` | Audits address-specific effective SSH/key-command/CA/principal paths, groups/sudo, site-ctl and sessions without key/secret contents | Generates a private owner response plan only; it cannot change access or sessions |
| C-02/H-01/M-03/M-04 | `10-rollout-app-security-fixes.sh` | Verifies an exact clean commit, all 29 active Astro units (28 affected plus one explicit exclusion), the script-02 rotation manifest, active secret file access, and 26 secret-bound signer proofs | Runs shared/Redo tests and all 28 builds under a clean-environment, networkless, non-root transient service; records private build evidence only and emits no deployment commands |

## Apply gates that can affect availability

These commands are examples, not instructions to run without reviewing their
own output and preflight requirements.

```bash
# H-02/H-03 combined apply: only after all 17 writers are stopped and developer
# write exclusion is independently proven. The real fleet root was
# observed as mode 2775, so the script intentionally blocks until its group/other
# write bits are removed in that maintenance window and remain non-writable.
sudo bash ./01-sensitive-modes-and-lead-pii.sh --apply \
  --confirm-h03-writers-stopped --confirm-developer-write-exclusion
# If the nine H-02 targets are intentionally deferred, add --h03-only; that mode
# does not read, lock, back up, chmod, or chown any H-02 target.

# Generates secrets outside the repo; does not install them.
sudo bash ./02-stage-unique-internal-secrets.sh \
  --apply --output-dir /root/astro-secret-staging-20260809

# Generates an origin/firewall plan; no live change.
sudo bash ./03-origin-and-ufw-plan.sh \
  --apply --output-dir /root/astro-origin-plan-20260809

# LIVE firewall mutation: removes only 4323/tcp after independent listener review.
sudo bash ./03b-remove-stale-ufw-4323.sh \
  --apply --confirm-owner-recovery-session --confirm-no-service-needs-4323

# Freeze and review the removal-free simulation first. Apply reacquires the real
# APT/DPKG serialization locks and revalidates the exact digest/package state
# under those locks before action. Maintainer scripts can affect services; the
# helper never reboots and returns nonzero while post-verification remains open.
sudo bash ./05-patch-and-reboot-verifier.sh --prepare-plan \
  --plan-dir /var/backups/astro-apt-reviewed-plan-20260809
sudo bash ./05-patch-and-reboot-verifier.sh \
  --apply --plan-dir /var/backups/astro-apt-reviewed-plan-20260809 \
  --reviewed-plan-sha256 REVIEWED_LOWERCASE_SHA256 \
  --confirm-final-reviewed-plan --confirm-provider-snapshot \
  --snapshot-reference SNAPSHOT-ID --confirm-maintenance-window

# First review and record the exact candidate digest. Verification and apply both
# require it before any candidate syntax check/dry-run; source bytes execute only
# after copying into a root-private sealed file.
sha256sum ./templates/restic-astro-fleet-backup.sh
sudo bash ./06-restic-fleet-coverage.sh \
  --reviewed-candidate-sha256 REVIEWED_LOWERCASE_SHA256
# After stopping the loaded Restic timer/service in a separate maintenance step:
sudo bash ./06-restic-fleet-coverage.sh --apply \
  --reviewed-candidate-sha256 REVIEWED_LOWERCASE_SHA256

# LIVE process signal: requires a plan generated and reviewed beforehand.
sudo bash ./07-orphan-http-processes.sh --apply \
  --write-plan /root/astro-orphan-plan.tsv
# Review every row and establish the intended systemd/restart path, then:
sudo bash ./07-orphan-http-processes.sh --apply \
  --plan /root/astro-orphan-plan.tsv --confirm-reviewed-every-pid

# Stages candidate hardening only; does not install or reload.
sudo bash ./08-tls-csp-systemd-plan.sh \
  --apply --output-dir /root/astro-hardening-staging-20260809

# Evidence + private owner checklist only. Repeat the full context for every
# observed developer connection; neither invocation changes access or sessions.
sudo bash ./09-developer-access.sh \
  --connection-context REMOTE_IP HOSTNAME LOCAL_IP LOCAL_PORT
sudo bash ./09-developer-access.sh \
  --apply --connection-context REMOTE_IP HOSTNAME LOCAL_IP LOCAL_PORT \
  --output-dir /var/backups/astro-webdev-owner-plan-20260809

# Read-only application rollout-readiness preflight. Both TSV files are
# root-private; READINESS.tsv contains HMAC proofs but no secret values.
sudo bash ./10-rollout-app-security-fixes.sh \
  --expected-commit FULL_REVIEWED_COMMIT_SHA \
  --rotation-manifest /root/astro-secret-staging-20260809/MANIFEST.tsv \
  --signer-readiness /root/astro-signer-readiness.tsv

# Build verification only. First provision /var/lib/astro-security-builds as a
# root:root 0700 rw,nosuid,nodev mount on a device separate from /var, bounded to
# <=32 GiB/2M inodes with >=12 GiB/500k inodes free. Create the one dedicated
# locked astro-security-build user and same-name non-root group, with no other
# primary/supplementary members and home /var/empty/astro-security-build or
# /nonexistent. The command creates FULL_SHA on that mount and never deploys.
sudo bash ./10-rollout-app-security-fixes.sh \
  --apply --expected-commit FULL_REVIEWED_COMMIT_SHA \
  --confirm-commit FULL_REVIEWED_COMMIT_SHA \
  --rotation-manifest /root/astro-secret-staging-20260809/MANIFEST.tsv \
  --signer-readiness /root/astro-signer-readiness.tsv \
  --build-user astro-security-build \
  --pnpm-store-source /opt/.pnpm-store \
  --confirm-build-verification-only
```

## C-02/H-01/M-03/M-04 build-verification boundary

The application helper never fetches, merges, switches, resets, or cleans the
repository. Its apply gate requires a named clean branch whose `HEAD` is the full
expected commit. It verifies every C-02/H-01/M-03/M-04 package test/helper and all
28 contact routes/wrappers, the exact 29 active unit/site/loopback-port map, and
the explicit exclusion of `connectresourcesint.com` because that active service
has neither `@connect/site-cms` nor the affected contact endpoint.

The script-02 `MANIFEST.tsv` must contain exactly 28 `installed=YES` rows, and
each root-private fragment must equal the one active value without printing it.
The active env must be root:service-group `0640`, have one link, carry only the
exact basic `user::rw-,group::r--,other::---` ACL, and have a post-developer-
revocation rotation mtime; runtime-writable `0600` files are rejected. Apply
also proves each service uses a same-name, non-root dedicated
user/group with no other primary or supplementary members, so the service
group cannot preserve a developer's read access. Rotation therefore
cannot be declared complete before the owner has excluded every developer write
and authentication path and restarted/verified each site one at a time.

The separate root-private signer-readiness TSV binds each of the 26 central GTM
writers to its new active value. Each row's final field is HMAC-SHA256 using that
site secret over this exact byte string (no final newline):

```text
astro-security-readiness-v1
commit=FULL_REVIEWED_COMMIT_SHA
rotation_epoch=YYYY-MM-DDTHH:MM:SSZ
site=SITE_DIRECTORY
site_id=CONFIGURED_SITE_ID
scope=gtm:write
path=/api/internal/gtm/save
```

The TSV also carries `expected_commit`, `developer_access_revoked_at`, and
`rotation_epoch` headers. The helper recomputes proofs in memory, suppresses
shell xtrace, never passes a secret as a process argument, and never prints a
value or derived digest. A local proof is not evidence about the central signer;
the owner must obtain each row from the actual signer after rotation.

Build verification archives the exact commit, copies the reviewed offline pnpm
store, disables lifecycle and pnpmfile hooks, and runs with `env -i` as the one
locked `astro-security-build` account and same-name non-root primary group. A
systemd transient service supplies no network, hides host `/opt`, `/var`, `/run`,
and home content, and applies process, memory, CPU, file-size, and time limits.
The workspace lives on the separately mounted, size/inode-bounded build
filesystem and logs stay on that mount. It runs the full shared test suite, the Redo
attachment regression, and all 28 builds sequentially. No live env/build values
are copied into the sandbox.

The output is explicitly `BUILD VERIFICATION ONLY`, not a release. Current SSR
output imports bare dependencies such as `nodemailer`; copying only `dist` would
retain unverified live `node_modules`. The helper therefore emits hashes and a
blocker note, but no deploy/rollback commands. A dependency-complete immutable
release layout and atomic one-site switch/rollback contract require separate
review before any maintenance rollout. No Caddy, DNS, firewall, live file, or
service command is run by script 10.

## Manual change controls and rollback

- Do not bulk-copy staged Caddy or systemd material into `/etc`. Diff each file,
  run `caddy validate` or `systemd-analyze verify`, back up the exact live file,
  and schedule the reload separately.
- A firewall rollback must be tested from the untouched recovery session. The
  4323 helper records its backup path and prints the exact narrow rollback rule.
- Package downgrades are not a reliable rollback. H-06 therefore requires a
  provider snapshot and records package state before updating.
- Process termination has no universal rollback. M-07 records executable,
  working directory, cgroup, and start time; the owner must create/verify the
  intended systemd unit before stopping an orphan.
- The developer-access artifact contains evidence metadata and a non-executable
  checklist, not copied keys/sudoers or a revocation rollback. Treat it as private
  incident material and retain/delete it under the owner's evidence policy.
- Secret staging contains real newly generated values. It must remain outside git,
  mode `0700/0600`, and be deleted after one-site-at-a-time installation and vault
  escrow.

## Required manual work not automated here

- Rotate third-party credentials (Pipedrive, Google Ads, session/dashboard keys)
  in their provider consoles; first exclude developer write/authentication paths,
  then revoke old values after each service is verified.
- Execute the developer access response manually from an independent provider/
  owner recovery channel. Account lock, every SSH Match/key-command/CA/principal
  path, provider keys, groups/effective sudo and existing sessions must be handled
  together; script 09 deliberately performs none of those live mutations.
- Restrict origin 80/443 at the provider firewall or UFW using an owner-reviewed,
  current Cloudflare address list. The pack intentionally does not download or
  hardcode Cloudflare ranges.
- Correct Payroll DNS and edge settings in the Cloudflare dashboard using the
  checklist; the pack performs no DNS/API calls.
- Set Cloudflare Minimum TLS Version to 1.2 or newer for every zone and confirm
  TLS 1.0/1.1 fail at the edge.
- Tune CSP from report-only telemetry before enforcement. A generic enforced CSP
  can break forms, analytics, fonts, and embedded content.
- Add encrypted off-host/immutable Restic replication and complete a restore drill.
- Review and deploy systemd drop-ins one service at a time, then separately run
  `daemon-reload` and restart only that service during a maintenance window.
- After package installation, manually reboot in the maintenance window and run
  `05-patch-and-reboot-verifier.sh` again.
