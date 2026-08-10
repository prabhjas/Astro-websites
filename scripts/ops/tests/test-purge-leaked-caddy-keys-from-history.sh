#!/usr/bin/env bash
# Bounded, non-rewriting tests for the C-01 history purge helper.

set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
PURGE_SCRIPT=$(cd -- "$SCRIPT_DIR/.." && pwd)/purge-leaked-caddy-keys-from-history.sh

fail() {
  printf 'FAIL: %s\n' "$*" >&2
  exit 1
}

bash -n "$PURGE_SCRIPT"
mapfile -t paths < <("$PURGE_SCRIPT" --list-paths)
mapfile -t expected_changed_refs < <("$PURGE_SCRIPT" --list-expected-changed-refs)

[[ ${#paths[@]} -eq 24 ]] || fail "expected 24 paths, got ${#paths[@]}"
[[ $(printf '%s\n' "${paths[@]}" | LC_ALL=C sort -u | wc -l) -eq 24 ]] \
  || fail 'path list contains duplicates'

old_prefix='caddy-upgrade-rollback-20260803/var-lib-caddy/.local/share/caddy'
new_prefix='caddy/upgrade-rollback-20260803/var-lib-caddy/.local/share/caddy'
[[ $(printf '%s\n' "${paths[@]}" | grep -Fc "${old_prefix}/") -eq 12 ]] \
  || fail 'old prefix does not have 12 paths'
[[ $(printf '%s\n' "${paths[@]}" | grep -Fc "${new_prefix}/") -eq 12 ]] \
  || fail 'new prefix does not have 12 paths'

suffixes=(
  'pki/authorities/local/root.key'
  'pki/authorities/local/intermediate.key'
  'certificates/local/cbss.ae/cbss.ae.key'
  'certificates/local/www.cbss.ae/www.cbss.ae.key'
  'certificates/local/connectgroup.co/connectgroup.co.key'
  'certificates/local/www.connectgroup.co/www.connectgroup.co.key'
  'certificates/local/evolutionmiddleast.com/evolutionmiddleast.com.key'
  'certificates/local/www.evolutionmiddleast.com/www.evolutionmiddleast.com.key'
  'certificates/local/iberiaworkforce.com/iberiaworkforce.com.key'
  'certificates/local/www.iberiaworkforce.com/www.iberiaworkforce.com.key'
  'certificates/local/spheavyrental.ae/spheavyrental.ae.key'
  'certificates/local/www.spheavyrental.ae/www.spheavyrental.ae.key'
)

for prefix in "$old_prefix" "$new_prefix"; do
  for suffix in "${suffixes[@]}"; do
    expected="${prefix}/${suffix}"
    [[ $(printf '%s\n' "${paths[@]}" | grep -Fxc "$expected") -eq 1 ]] \
      || fail "missing exact path: ${expected}"
  done
done

[[ ${#expected_changed_refs[@]} -eq 29 ]] \
  || fail "expected exact 29-ref changed inventory, got ${#expected_changed_refs[@]}"
[[ $(printf '%s\n' "${expected_changed_refs[@]}" | LC_ALL=C sort -u | wc -l) -eq 29 ]] \
  || fail 'expected changed-ref inventory contains duplicates'
[[ $(printf '%s\n' "${expected_changed_refs[@]}" | grep -c '^refs/heads/') -eq 8 ]] \
  || fail 'expected changed-ref inventory does not contain exactly 8 heads'
[[ $(printf '%s\n' "${expected_changed_refs[@]}" | grep -c '^refs/pull/.*/head$') -eq 20 ]] \
  || fail 'expected changed-ref inventory does not contain exactly 20 pull heads'
[[ $(printf '%s\n' "${expected_changed_refs[@]}" | grep -Fxc 'refs/tags/security-remediation-20260809-final') -eq 1 ]] \
  || fail 'security-remediation tag is absent from expected changed refs'

expected_heads=(
  'refs/heads/agent/security-remediation-20260809'
  'refs/heads/dev'
  'refs/heads/main'
  'refs/heads/work/astro-sites'
  'refs/heads/work/fix-spheavy-contamination'
  'refs/heads/work/lana-licence-backups-seo'
  'refs/heads/work/licence-llms-robots'
  'refs/heads/work/live-fleet-28'
)
for ref in "${expected_heads[@]}"; do
  [[ $(printf '%s\n' "${expected_changed_refs[@]}" | grep -Fxc "$ref") -eq 1 ]] \
    || fail "expected changed-ref inventory is missing exact head: $ref"
done
for pull_number in $(seq 2 21); do
  ref="refs/pull/${pull_number}/head"
  [[ $(printf '%s\n' "${expected_changed_refs[@]}" | grep -Fxc "$ref") -eq 1 ]] \
    || fail "expected changed-ref inventory is missing $ref"
done
[[ $(printf '%s\n' "${expected_changed_refs[@]}" | grep -Fxc 'refs/pull/1/head') -eq 0 ]] \
  || fail 'clean PR 1 is incorrectly included in expected changed refs'
[[ $(printf '%s\n' "${expected_changed_refs[@]}" | grep -Fxc 'refs/tags/backup/dev-pre-purge-20260731') -eq 0 ]] \
  || fail 'clean backup tag is incorrectly included in expected changed refs'

# The production helper must reject a normal working clone before it creates
# evidence or looks for git-filter-repo. This test never reaches a rewrite.
test_root=$(mktemp -d)
trap 'rm -rf -- "$test_root"' EXIT

# Rewritten object IDs legitimately reorder write_ref_snapshot output because
# that snapshot is sorted by the complete "object ID<TAB>ref name" record.
# Ref-set parity therefore compares independently sorted name projections.
ref_snapshot_before="$test_root/refs.before.tsv"
ref_snapshot_rewritten="$test_root/refs.rewritten.tsv"
ref_snapshot_missing="$test_root/refs.missing.tsv"
ref_snapshot_extra="$test_root/refs.extra.tsv"
ref_names_before="$test_root/ref-names.before.txt"
ref_names_candidate="$test_root/ref-names.candidate.txt"
tree_snapshot_before="$test_root/tree-refs.before.tsv"
tree_snapshot_rewritten="$test_root/tree-refs.rewritten.tsv"
tree_snapshot_changed="$test_root/tree-refs.changed.tsv"
tree_parity_before="$test_root/non-sensitive-tip-trees.before.tsv"
tree_parity_candidate="$test_root/non-sensitive-tip-trees.candidate.tsv"
tree_parity_raw_before="$test_root/non-sensitive-tip-trees.raw-before.tsv"
tree_parity_raw_rewritten="$test_root/non-sensitive-tip-trees.raw-rewritten.tsv"
changed_refs_expected="$test_root/changed-refs.expected.txt"
changed_refs_candidate="$test_root/changed-refs.candidate.txt"
changed_refs_candidate_sorted="$test_root/changed-refs.candidate-sorted.txt"

ref_compare_sort_count=$(
  sed -n \
    '/^write_ref_snapshot >"\$EVIDENCE_DIR\/refs.after.tsv"/,/^write_filtered_tree_hashes /p' \
    "$PURGE_SCRIPT" \
    | grep -Fc 'LC_ALL=C sort'
)
[[ $ref_compare_sort_count -eq 2 ]] \
  || fail 'production ref-name parity does not sort both name projections'
grep -Fq \
  "done < <(write_ref_snapshot | awk -F '\\t' '{print \$2}' | LC_ALL=C sort)" \
  "$PURGE_SCRIPT" \
  || fail 'production non-sensitive tree parity does not iterate in ref-name order'
grep -Fq \
  'cmp -s "$EXPECTED_CHANGED_REFS_FILE" "$ACTUAL_CHANGED_REFS_SORTED_FILE"' \
  "$PURGE_SCRIPT" \
  || fail 'production helper lacks an exact changed-ref-set comparison'

printf '%s\n' "${expected_changed_refs[@]}" | LC_ALL=C sort >"$changed_refs_expected"
for ((index = ${#expected_changed_refs[@]} - 1; index >= 0; index--)); do
  printf '%s\n' "${expected_changed_refs[$index]}"
done >"$changed_refs_candidate"
LC_ALL=C sort "$changed_refs_candidate" >"$changed_refs_candidate_sorted"
cmp -s "$changed_refs_expected" "$changed_refs_candidate_sorted" \
  || fail 'reordered exact changed-ref inventory failed set comparison'

grep -Fvx 'refs/pull/2/head' "$changed_refs_expected" >"$changed_refs_candidate"
LC_ALL=C sort "$changed_refs_candidate" >"$changed_refs_candidate_sorted"
if cmp -s "$changed_refs_expected" "$changed_refs_candidate_sorted"; then
  fail 'changed-ref inventory missing PR 2 passed exact comparison'
fi

printf '%s\n' "${expected_changed_refs[@]}" 'refs/pull/1/head' \
  | LC_ALL=C sort >"$changed_refs_candidate_sorted"
if cmp -s "$changed_refs_expected" "$changed_refs_candidate_sorted"; then
  fail 'clean PR 1 passed as an extra changed ref'
fi

printf '%s\n' \
  "${expected_changed_refs[@]}" \
  'refs/tags/backup/dev-pre-purge-20260731' \
  | LC_ALL=C sort >"$changed_refs_candidate_sorted"
if cmp -s "$changed_refs_expected" "$changed_refs_candidate_sorted"; then
  fail 'clean backup tag passed as an extra changed ref'
fi

{
  printf '%040d\trefs/heads/zeta\n' 1
  printf '%040d\trefs/heads/alpha\n' 2
  printf '%040d\trefs/tags/release\n' 3
} >"$ref_snapshot_before"
{
  printf '%040d\trefs/heads/alpha\n' 10
  printf '%040d\trefs/tags/release\n' 11
  printf '%040d\trefs/heads/zeta\n' 12
} >"$ref_snapshot_rewritten"
{
  printf '%040d\trefs/heads/alpha\n' 10
  printf '%040d\trefs/heads/zeta\n' 12
} >"$ref_snapshot_missing"
{
  printf '%040d\trefs/heads/alpha\n' 10
  printf '%040d\trefs/tags/release\n' 11
  printf '%040d\trefs/heads/zeta\n' 12
  printf '%040d\trefs/heads/extra\n' 13
} >"$ref_snapshot_extra"

awk -F '\t' '{print $2}' "$ref_snapshot_before" | LC_ALL=C sort >"$ref_names_before"
awk -F '\t' '{print $2}' "$ref_snapshot_rewritten" | LC_ALL=C sort >"$ref_names_candidate"
cmp -s "$ref_names_before" "$ref_names_candidate" \
  || fail 'changed/reordered object IDs caused a false ref-name mismatch'

awk -F '\t' '{print $2}' "$ref_snapshot_missing" | LC_ALL=C sort >"$ref_names_candidate"
if cmp -s "$ref_names_before" "$ref_names_candidate"; then
  fail 'missing ref name passed ref-set parity'
fi

awk -F '\t' '{print $2}' "$ref_snapshot_extra" | LC_ALL=C sort >"$ref_names_candidate"
if cmp -s "$ref_names_before" "$ref_names_candidate"; then
  fail 'extra ref name passed ref-set parity'
fi

# Model the tree-hash record produced for each ref. The same ref-to-tree mapping
# must compare equal even when rewritten object IDs change the snapshot order.
{
  printf '%040d\trefs/heads/zeta\t%064d\n' 1 301
  printf '%040d\trefs/heads/alpha\t%064d\n' 2 302
  printf '%040d\trefs/tags/release\t%064d\n' 3 303
} >"$tree_snapshot_before"
{
  printf '%040d\trefs/heads/alpha\t%064d\n' 10 302
  printf '%040d\trefs/tags/release\t%064d\n' 11 303
  printf '%040d\trefs/heads/zeta\t%064d\n' 12 301
} >"$tree_snapshot_rewritten"
{
  printf '%040d\trefs/heads/alpha\t%064d\n' 10 999
  printf '%040d\trefs/tags/release\t%064d\n' 11 303
  printf '%040d\trefs/heads/zeta\t%064d\n' 12 301
} >"$tree_snapshot_changed"

awk -F '\t' '{print $3 "\t" $2}' "$tree_snapshot_before" >"$tree_parity_raw_before"
awk -F '\t' '{print $3 "\t" $2}' "$tree_snapshot_rewritten" >"$tree_parity_raw_rewritten"
if cmp -s "$tree_parity_raw_before" "$tree_parity_raw_rewritten"; then
  fail 'tree-parity fixture did not exercise object-ID-induced ref reordering'
fi

emit_tree_parity_fixture() {
  local snapshot=$1
  local output=$2
  local ref

  : >"$output"
  while IFS= read -r ref; do
    awk -F '\t' -v wanted="$ref" \
      '$2 == wanted {print $3 "\t" $2}' "$snapshot" >>"$output"
  done < <(awk -F '\t' '{print $2}' "$snapshot" | LC_ALL=C sort)
}

emit_tree_parity_fixture "$tree_snapshot_before" "$tree_parity_before"
emit_tree_parity_fixture "$tree_snapshot_rewritten" "$tree_parity_candidate"
cmp -s "$tree_parity_before" "$tree_parity_candidate" \
  || fail 'changed/reordered object IDs caused false non-sensitive tree-parity failure'
emit_tree_parity_fixture "$tree_snapshot_changed" "$tree_parity_candidate"
if cmp -s "$tree_parity_before" "$tree_parity_candidate"; then
  fail 'changed non-sensitive per-ref tree hash passed parity'
fi

git -C "$test_root" init -q
evidence_dir="$test_root/evidence-must-not-exist"
set +e
failure_output=$(
  cd "$test_root"
  "$PURGE_SCRIPT" \
    --confirm-repository Connect-Group-Tech/Astro-websites \
    --expected-refs-sha256 0000000000000000000000000000000000000000000000000000000000000000 \
    --evidence-dir "$evidence_dir" \
    --confirm-rewrite REWRITE-24-CADDY-KEY-PATHS-IN-THROWAWAY-MIRROR \
    2>&1
)
failure_status=$?
set -e
[[ $failure_status -ne 0 ]] || fail 'working-clone safety gate unexpectedly passed'
grep -Fq 'run only in a fresh bare mirror' <<<"$failure_output" \
  || fail 'working-clone safety gate returned the wrong reason'
[[ ! -e "$evidence_dir" ]] || fail 'evidence directory was created before safety checks'

if grep -Eq '^[[:space:]]*(command[[:space:]]+)?git[[:space:]]+push([[:space:]]|$)' \
    "$PURGE_SCRIPT"; then
  fail 'purge helper contains an executable git push command'
fi
grep -Fq -- '--sensitive-data-removal' "$PURGE_SCRIPT" \
  || fail 'sensitive-data-removal mode is missing'
grep -Fq -- '--no-fetch' "$PURGE_SCRIPT" \
  || fail 'verified-snapshot no-fetch gate is missing'

printf 'PASS: 24 paths, exact 29 changed refs, sorted parity, safety refusal, and no push.\n'
