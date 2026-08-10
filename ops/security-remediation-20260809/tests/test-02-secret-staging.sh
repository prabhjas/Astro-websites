#!/usr/bin/env bash
# Proves secret staging never overwrites envs and is idempotent on re-run.

set -euo pipefail
IFS=$'\n\t'

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)
TARGET=$SCRIPT_DIR/02-stage-unique-internal-secrets.sh
TMP_ROOT=$(mktemp -d /tmp/astro-secret-fixture.XXXXXX)
cleanup() {
  case "$TMP_ROOT" in
    /tmp/astro-secret-fixture.*) rm -rf -- "$TMP_ROOT" ;;
    *) printf 'Refusing unsafe cleanup path: %s\n' "$TMP_ROOT" >&2 ;;
  esac
}
trap cleanup EXIT

FLEET=$TMP_ROOT/Astro-production
OUTPUT=$TMP_ROOT/staged
BIN=$TMP_ROOT/bin
mkdir -p -- "$BIN"
for site in alpha.test beta.test; do
  mkdir -p -- "$FLEET/$site"
  printf '{"dependencies":{"@connect/site-cms":"workspace:*"}}\n' >"$FLEET/$site/package.json"
  if [[ "$site" == alpha.test ]]; then
    printf 'INTERNAL_JOB_SECRET=TEST_OLD_PLACEHOLDER\nPIPEDRIVE_API_TOKEN=TEST_PROVIDER_PLACEHOLDER\n' \
      >"$FLEET/$site/.env.prod"
  else
    printf 'PIPEDRIVE_API_TOKEN=TEST_PROVIDER_PLACEHOLDER\n' >"$FLEET/$site/.env.prod"
  fi
done
mkdir -p -- "$FLEET/dormant.test"
printf '{"dependencies":{"@connect/site-cms":"workspace:*"}}\n' >"$FLEET/dormant.test/package.json"
printf 'INTERNAL_JOB_SECRET=TEST_DORMANT_PLACEHOLDER\n' >"$FLEET/dormant.test/.env.example"

# Deterministic active-service inventory fixture. The production helper uses
# effective systemd properties and never walks dormant/example site dirs.
cat >"$BIN/systemctl" <<'SYSTEMCTL'
#!/usr/bin/env bash
set -euo pipefail
case "${1:-}" in
  list-units)
    printf 'alpha.test.service loaded active running fixture\n'
    printf 'beta.test.service loaded active running fixture\n'
    ;;
  show)
    unit=$2
    site=${unit%.service}
    case "$*" in
      *--property=WorkingDirectory*) printf '%s/%s\n' "$FIXTURE_FLEET" "$site" ;;
      *--property=EnvironmentFiles*) printf '%s/%s/.env.prod (ignore_errors=no)\n' "$FIXTURE_FLEET" "$site" ;;
      *) exit 64 ;;
    esac
    ;;
  *) exit 64 ;;
esac
SYSTEMCTL
chmod 0755 "$BIN/systemctl"
export ASTRO_SYSTEMCTL=$BIN/systemctl
export FIXTURE_FLEET=$FLEET

before_alpha=$(sha256sum "$FLEET/alpha.test/.env.prod" | awk '{print $1}')
before_beta=$(sha256sum "$FLEET/beta.test/.env.prod" | awk '{print $1}')
bash -x "$TARGET" --apply --root "$FLEET" --output-dir "$OUTPUT" >"$TMP_ROOT/run-1.out" 2>&1
after_alpha=$(sha256sum "$FLEET/alpha.test/.env.prod" | awk '{print $1}')
after_beta=$(sha256sum "$FLEET/beta.test/.env.prod" | awk '{print $1}')
[[ "$before_alpha" == "$after_alpha" ]] || { printf 'Live env changed\n' >&2; exit 1; }
[[ "$before_beta" == "$after_beta" ]] || { printf 'Missing-key live env changed\n' >&2; exit 1; }

[[ "$(stat -c '%a' "$OUTPUT")" == 700 ]] || exit 1
[[ "$(stat -c '%a' "$OUTPUT/alpha.test.env.fragment")" == 600 ]] || exit 1
[[ ! -e "$OUTPUT/dormant.test.env.fragment" ]] || { printf 'Dormant site was staged\n' >&2; exit 1; }
grep -qE '^INTERNAL_JOB_SECRET=[0-9a-f]{64}$' "$OUTPUT/beta.test.env.fragment" || {
  printf 'Missing-key active site-cms consumer was not staged\n' >&2
  exit 1
}
alpha_hash=$(sha256sum "$OUTPUT/alpha.test.env.fragment" | awk '{print $1}')
beta_hash=$(sha256sum "$OUTPUT/beta.test.env.fragment" | awk '{print $1}')
[[ "$alpha_hash" != "$beta_hash" ]] || { printf 'Generated fragments are not unique\n' >&2; exit 1; }
alpha_value=$(sed -n 's/^INTERNAL_JOB_SECRET=//p' "$OUTPUT/alpha.test.env.fragment")
beta_value=$(sed -n 's/^INTERNAL_JOB_SECRET=//p' "$OUTPUT/beta.test.env.fragment")
for generated_value in "$alpha_value" "$beta_value"; do
  [[ -n "$generated_value" ]] || exit 1
  if grep -Fq -- "$generated_value" "$TMP_ROOT/run-1.out"; then
    printf 'Generated secret value leaked through xtrace/output\n' >&2
    exit 1
  fi
done

# Existing fragments must be one exact assignment, and values must be unique
# across sites. Both refusals suppress the secret values.
printf 'UNEXPECTED_EXTRA_LINE=1\n' >>"$OUTPUT/beta.test.env.fragment"
if bash "$TARGET" --apply --root "$FLEET" --output-dir "$OUTPUT" >"$TMP_ROOT/extra-line.out" 2>&1; then
  printf 'Extra-line staged fragment was accepted\n' >&2
  exit 1
fi
for generated_value in "$alpha_value" "$beta_value"; do
  ! grep -Fq -- "$generated_value" "$TMP_ROOT/extra-line.out" || {
    printf 'Secret leaked while rejecting extra fragment content\n' >&2; exit 1;
  }
done
printf 'INTERNAL_JOB_SECRET=%s\n' "$beta_value" >"$OUTPUT/beta.test.env.fragment"
chmod 0600 "$OUTPUT/beta.test.env.fragment"

# Same total byte count as a valid fragment, but a leading blank replaces the
# mandatory final LF. This must fail a byte-exact comparison, not pass through
# line-oriented extraction plus size arithmetic.
printf '\nINTERNAL_JOB_SECRET=%s' "$beta_value" >"$OUTPUT/beta.test.env.fragment"
if bash "$TARGET" --apply --root "$FLEET" --output-dir "$OUTPUT" >"$TMP_ROOT/shifted-line.out" 2>&1; then
  printf 'Leading-blank/no-final-LF staged fragment was accepted\n' >&2
  exit 1
fi
for generated_value in "$alpha_value" "$beta_value"; do
  ! grep -Fq -- "$generated_value" "$TMP_ROOT/shifted-line.out" || {
    printf 'Secret leaked while rejecting byte-shifted fragment content\n' >&2; exit 1;
  }
done
printf 'INTERNAL_JOB_SECRET=%s\n' "$beta_value" >"$OUTPUT/beta.test.env.fragment"
chmod 0600 "$OUTPUT/beta.test.env.fragment"

printf 'INTERNAL_JOB_SECRET=%s\n' "$alpha_value" >"$OUTPUT/beta.test.env.fragment"
if bash "$TARGET" --apply --root "$FLEET" --output-dir "$OUTPUT" >"$TMP_ROOT/duplicate.out" 2>&1; then
  printf 'Duplicate staged secret was accepted\n' >&2
  exit 1
fi
for generated_value in "$alpha_value" "$beta_value"; do
  ! grep -Fq -- "$generated_value" "$TMP_ROOT/duplicate.out" || {
    printf 'Secret leaked while rejecting duplicate fragment values\n' >&2; exit 1;
  }
done
printf 'INTERNAL_JOB_SECRET=%s\n' "$beta_value" >"$OUTPUT/beta.test.env.fragment"
chmod 0600 "$OUTPUT/beta.test.env.fragment"

# A dangling link at the fixed owner-notes path must not be followed by root's
# redirection during an otherwise idempotent staging run.
mv "$OUTPUT/OWNER-NEXT-STEPS.txt" "$OUTPUT/OWNER-NEXT-STEPS.txt.saved"
ln -s "$TMP_ROOT/outside-owner-notes" "$OUTPUT/OWNER-NEXT-STEPS.txt"
if bash "$TARGET" --apply --root "$FLEET" --output-dir "$OUTPUT" >"$TMP_ROOT/owner-link.out" 2>&1; then
  printf 'Dangling owner-notes symlink was accepted\n' >&2
  exit 1
fi
[[ ! -e "$TMP_ROOT/outside-owner-notes" ]] || { printf 'Owner-notes symlink target was created\n' >&2; exit 1; }
rm "$OUTPUT/OWNER-NEXT-STEPS.txt"
mv "$OUTPUT/OWNER-NEXT-STEPS.txt.saved" "$OUTPUT/OWNER-NEXT-STEPS.txt"

# Simulate a crash after beta's fragment was published but before its manifest
# row, while preserving an owner-marked alpha install status.
awk -F '\t' 'BEGIN {OFS="\t"} NR==1 {print; next} $1=="alpha.test" {$4="YES"; print}' \
  "$OUTPUT/MANIFEST.tsv" >"$OUTPUT/MANIFEST.tsv.partial"
chmod 0600 "$OUTPUT/MANIFEST.tsv.partial"
mv -T "$OUTPUT/MANIFEST.tsv.partial" "$OUTPUT/MANIFEST.tsv"

bash "$TARGET" --apply --root "$FLEET" --output-dir "$OUTPUT" >"$TMP_ROOT/run-2.out" 2>&1
for generated_value in "$alpha_value" "$beta_value"; do
  if grep -Fq -- "$generated_value" "$TMP_ROOT/run-2.out"; then
    printf 'Existing generated secret value leaked during re-run\n' >&2
    exit 1
  fi
done
[[ "$(sha256sum "$OUTPUT/alpha.test.env.fragment" | awk '{print $1}')" == "$alpha_hash" ]] || {
  printf 'Idempotent re-run replaced an existing staged value\n' >&2
  exit 1
}
grep -Fqx $'alpha.test\t'"$OUTPUT/alpha.test.env.fragment"$'\tINTERNAL_JOB_SECRET\tYES' "$OUTPUT/MANIFEST.tsv" || exit 1
grep -Fqx $'beta.test\t'"$OUTPUT/beta.test.env.fragment"$'\tINTERNAL_JOB_SECRET\tNO' "$OUTPUT/MANIFEST.tsv" || exit 1
[[ "$(wc -l <"$OUTPUT/MANIFEST.tsv")" -eq 3 ]] || exit 1

# Hidden stale fragments are still fragments and must not evade the refusal
# inventory merely because nullglob normally excludes dotfiles.
printf 'INTERNAL_JOB_SECRET=%s\n' "$beta_value" >"$OUTPUT/.unknown.env.fragment"
chmod 0600 "$OUTPUT/.unknown.env.fragment"
if bash "$TARGET" --apply --root "$FLEET" --output-dir "$OUTPUT" >"$TMP_ROOT/hidden-fragment.out" 2>&1; then
  printf 'Hidden unknown staged fragment was ignored\n' >&2
  exit 1
fi
! grep -Fq -- "$beta_value" "$TMP_ROOT/hidden-fragment.out" || {
  printf 'Secret leaked while rejecting hidden fragment\n' >&2; exit 1;
}
rm "$OUTPUT/.unknown.env.fragment"

# A manifest YES belongs to the exact preserved fragment. If that fragment is
# gone, generating a replacement must reset the publication state to NO.
awk -F '\t' 'BEGIN {OFS="\t"} NR==1 {print; next} $1=="beta.test" {$4="YES"} {print}' \
  "$OUTPUT/MANIFEST.tsv" >"$OUTPUT/MANIFEST.tsv.replaced"
chmod 0600 "$OUTPUT/MANIFEST.tsv.replaced"
mv -T "$OUTPUT/MANIFEST.tsv.replaced" "$OUTPUT/MANIFEST.tsv"
rm "$OUTPUT/beta.test.env.fragment"
bash "$TARGET" --apply --root "$FLEET" --output-dir "$OUTPUT" >"$TMP_ROOT/replaced-fragment.out" 2>&1
grep -Fqx $'beta.test\t'"$OUTPUT/beta.test.env.fragment"$'\tINTERNAL_JOB_SECRET\tNO' "$OUTPUT/MANIFEST.tsv" || {
  printf 'Replacement fragment incorrectly preserved installed=YES\n' >&2; exit 1;
}
replacement_value=$(sed -n 's/^INTERNAL_JOB_SECRET=//p' "$OUTPUT/beta.test.env.fragment")
[[ "$replacement_value" =~ ^[0-9a-f]{64}$ && "$replacement_value" != "$beta_value" ]] || {
  printf 'Missing fragment was not replaced with a fresh value\n' >&2; exit 1;
}
for generated_value in "$alpha_value" "$beta_value" "$replacement_value"; do
  ! grep -Fq -- "$generated_value" "$TMP_ROOT/replaced-fragment.out" || {
    printf 'Secret leaked while replacing a missing fragment\n' >&2; exit 1;
  }
done

printf 'PASS: active inventory, xtrace redaction, exact/unique fragments, env unchanged, crash repair, and idempotency\n'
