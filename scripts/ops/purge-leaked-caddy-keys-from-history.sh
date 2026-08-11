#!/usr/bin/env bash
# C-01 local history rewrite helper for Connect-Group-Tech/Astro-websites.
#
# This script rewrites ONE fresh, disposable bare mirror and produces evidence.
# It never pushes. Publishing rewritten refs, restoring GitHub protections, asking
# GitHub Support to purge pull-request refs/caches, and replacing old clones are
# separate owner-controlled actions.
#
# GitHub requires git-filter-repo 2.47 or newer for
# --sensitive-data-removal:
# https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository
# The audited rewrite must change exactly eight heads, the security-remediation
# tag, and pull-request heads 2 through 21. PR 1 and the backup tag stay clean.

set -euo pipefail

readonly EXPECTED_REPOSITORY='Connect-Group-Tech/Astro-websites'
readonly CONFIRMATION_PHRASE='REWRITE-24-CADDY-KEY-PATHS-IN-THROWAWAY-MIRROR'
readonly EXPECTED_ROOT_BLOB='15bdbebf079f9458ef5b4f0c6c6a4f62441fe99e'
readonly EXPECTED_ROOT_RAW_SHA256='79b5cd3485d4f2f72752e93a22dfcd28affebf00a415be363975f0d7b7639919'
readonly EXPECTED_AFFECTED_PULL_REFS='20'
readonly FIRST_AFFECTED_PULL_REF='2'
readonly LAST_AFFECTED_PULL_REF='21'
readonly AFFECTED_TAG_REF='refs/tags/security-remediation-20260809-final'

readonly -a PREFIXES=(
  'caddy-upgrade-rollback-20260803/var-lib-caddy/.local/share/caddy'
  'caddy/upgrade-rollback-20260803/var-lib-caddy/.local/share/caddy'
)

readonly -a KEY_SUFFIXES=(
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

# Git object IDs are metadata only. The same 12 blobs appeared at both prefixes.
readonly -a EXPECTED_BLOBS=(
  '15bdbebf079f9458ef5b4f0c6c6a4f62441fe99e'
  '93338c5e85b87a14133d31fd471b21ee71cc8417'
  '64ec012808788fb059b78fbd30033d7f2c145459'
  '1be4aec9aa1d20ba9cee86a835260338ade45e58'
  'dec5207191cc3c2079bb7d0d175a39fef697c07f'
  '2893da3e7aba003b8a2f30360eb0ea55bbfa246d'
  'e674eae4bcbbe07179619c806c9b108f1e0af9d1'
  '07df0d4d8b65ad76d7b55055a0f73052885fb7bd'
  '366d8a4a22441a43e4553cd792a065f28bc2eca8'
  '4cceba8f2818ddfbc63f27ce5c2fc089c90a98cf'
  'c443f3db2abb673d4c8200d676b523fe7ce4b8d0'
  'bb513862e5edf95b554c6371690d221a22649f4a'
)

readonly -a REQUIRED_HEADS=(
  'refs/heads/agent/security-remediation-20260809'
  'refs/heads/dev'
  'refs/heads/main'
  'refs/heads/work/astro-sites'
  'refs/heads/work/fix-spheavy-contamination'
  'refs/heads/work/lana-licence-backups-seo'
  'refs/heads/work/licence-llms-robots'
  'refs/heads/work/live-fleet-28'
)

readonly -a REQUIRED_TAGS=(
  'refs/tags/backup/dev-pre-purge-20260731'
  "$AFFECTED_TAG_REF"
)

PATHS=()
PATH_BLOBS=()
for prefix in "${PREFIXES[@]}"; do
  for index in "${!KEY_SUFFIXES[@]}"; do
    PATHS+=("${prefix}/${KEY_SUFFIXES[$index]}")
    PATH_BLOBS+=("${EXPECTED_BLOBS[$index]}")
  done
done
readonly -a PATHS PATH_BLOBS

usage() {
  cat <<'USAGE'
Usage:
  purge-leaked-caddy-keys-from-history.sh --list-paths
  purge-leaked-caddy-keys-from-history.sh --list-expected-changed-refs

  purge-leaked-caddy-keys-from-history.sh \
    --confirm-repository Connect-Group-Tech/Astro-websites \
    --expected-refs-sha256 <64-lowercase-hex> \
    --evidence-dir </absolute/new/root-only/directory> \
    --confirm-rewrite REWRITE-24-CADDY-KEY-PATHS-IN-THROWAWAY-MIRROR

Run only inside a fresh `git clone --mirror`. Before cloning, freeze pushes and
record the expected ref hash from the remote (exclude peeled `^{}' tag lines):

  git ls-remote <url> 'refs/heads/*' 'refs/tags/*' \
    'refs/pull/*/head' 'refs/pull/*/merge' \
    | grep -v '\^{}$' | LC_ALL=C sort | sha256sum

Create the mirror on a volume with enough temporary capacity, then explicitly
materialize GitHub pull refs before running this helper:

  git clone --mirror <url> <new-mirror.git>
  git -C <new-mirror.git> fetch origin \
    '+refs/pull/*/head:refs/pull/*/head' \
    '+refs/pull/*/merge:refs/pull/*/merge'

The mirror must contain exactly that ref set. This script does not fetch and
does not push. It deliberately stops after local rewrite verification.

Postfilter verification requires exactly the eight reviewed heads, the
security-remediation tag, and refs/pull/2/head through refs/pull/21/head in
git-filter-repo's changed-refs evidence. PR 1 and the backup tag must not change.
USAGE
}

die() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

note() {
  printf '%s\n' "$*"
}

command_required() {
  command -v "$1" >/dev/null 2>&1 || die "required command not found: $1"
}

write_ref_snapshot() {
  git for-each-ref --format='%(objectname)%09%(refname)' \
    refs/heads refs/tags refs/pull | LC_ALL=C sort
}

write_expected_changed_refs() {
  local pull_number
  {
    printf '%s\n' "${REQUIRED_HEADS[@]}"
    printf '%s\n' "$AFFECTED_TAG_REF"
    for ((pull_number = FIRST_AFFECTED_PULL_REF; pull_number <= LAST_AFFECTED_PULL_REF; pull_number++)); do
      printf 'refs/pull/%s/head\n' "$pull_number"
    done
  } | LC_ALL=C sort
}

write_filtered_tree_hashes() {
  local output_file=$1
  local ref tree_hash

  : >"$output_file"
  while IFS= read -r ref; do
    git rev-parse -q --verify "${ref}^{tree}" >/dev/null \
      || die "ref does not resolve to a tree: ${ref}"
    tree_hash=$(
      git ls-tree -r "${ref}^{tree}" \
        | awk -F '\t' 'NR == FNR { excluded[$0] = 1; next } !($2 in excluded)' \
            "$EVIDENCE_DIR/key-paths.txt" - \
        | sha256sum \
        | awk '{print $1}'
    )
    printf '%s\t%s\n' "$tree_hash" "$ref" >>"$output_file"
  done < <(write_ref_snapshot | awk -F '\t' '{print $2}' | LC_ALL=C sort)
}

CONFIRMED_REPOSITORY=''
EXPECTED_REFS_SHA256=''
EVIDENCE_DIR=''
CONFIRM_REWRITE=''

case ${1:-} in
  --list-paths)
    [[ $# -eq 1 ]] || die '--list-paths does not accept other arguments'
    printf '%s\n' "${PATHS[@]}"
    exit 0
    ;;
  --list-expected-changed-refs)
    [[ $# -eq 1 ]] || die '--list-expected-changed-refs does not accept other arguments'
    write_expected_changed_refs
    exit 0
    ;;
esac

while [[ $# -gt 0 ]]; do
  case "$1" in
    --confirm-repository)
      [[ $# -ge 2 ]] || die '--confirm-repository requires a value'
      CONFIRMED_REPOSITORY=$2
      shift 2
      ;;
    --expected-refs-sha256)
      [[ $# -ge 2 ]] || die '--expected-refs-sha256 requires a value'
      EXPECTED_REFS_SHA256=$2
      shift 2
      ;;
    --evidence-dir)
      [[ $# -ge 2 ]] || die '--evidence-dir requires a value'
      EVIDENCE_DIR=$2
      shift 2
      ;;
    --confirm-rewrite)
      [[ $# -ge 2 ]] || die '--confirm-rewrite requires a value'
      CONFIRM_REWRITE=$2
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      usage >&2
      die "unknown argument: $1"
      ;;
  esac
done

[[ "$CONFIRMED_REPOSITORY" == "$EXPECTED_REPOSITORY" ]] \
  || die "--confirm-repository must be exactly ${EXPECTED_REPOSITORY}"
[[ "$EXPECTED_REFS_SHA256" =~ ^[0-9a-f]{64}$ ]] \
  || die '--expected-refs-sha256 must be 64 lowercase hexadecimal characters'
[[ "$CONFIRM_REWRITE" == "$CONFIRMATION_PHRASE" ]] \
  || die "--confirm-rewrite must be exactly ${CONFIRMATION_PHRASE}"
[[ "$EVIDENCE_DIR" == /* ]] || die '--evidence-dir must be an absolute path'
[[ ! -e "$EVIDENCE_DIR" ]] || die "evidence path already exists: ${EVIDENCE_DIR}"

command_required git
command_required awk
command_required chmod
command_required cmp
command_required cp
command_required date
command_required dirname
command_required find
command_required grep
command_required mkdir
command_required realpath
command_required sed
command_required seq
command_required sha256sum
command_required sort
command_required tee
command_required xargs

EVIDENCE_PARENT=$(dirname -- "$EVIDENCE_DIR")
readonly EVIDENCE_PARENT
[[ -d "$EVIDENCE_PARENT" ]] \
  || die "evidence parent directory does not exist: ${EVIDENCE_PARENT}"
EVIDENCE_BASENAME=${EVIDENCE_DIR##*/}
readonly EVIDENCE_BASENAME
[[ -n "$EVIDENCE_BASENAME" && "$EVIDENCE_BASENAME" != '.' && "$EVIDENCE_BASENAME" != '..' ]] \
  || die 'evidence directory must have a normal final path component'
EVIDENCE_PARENT_CANONICAL=$(realpath -e -- "$EVIDENCE_PARENT")
readonly EVIDENCE_PARENT_CANONICAL
EVIDENCE_DIR="${EVIDENCE_PARENT_CANONICAL}/${EVIDENCE_BASENAME}"
[[ ! -e "$EVIDENCE_DIR" ]] || die "evidence path already exists: ${EVIDENCE_DIR}"

GIT_VERSION_STRING=$(git --version | awk '{print $3}')
readonly GIT_VERSION_STRING
if [[ "$GIT_VERSION_STRING" =~ ^([0-9]+)\.([0-9]+) ]]; then
  GIT_VERSION_MAJOR=${BASH_REMATCH[1]}
  GIT_VERSION_MINOR=${BASH_REMATCH[2]}
else
  die "unable to parse Git version: ${GIT_VERSION_STRING}"
fi
readonly GIT_VERSION_MAJOR GIT_VERSION_MINOR
if ((GIT_VERSION_MAJOR < 2 || (GIT_VERSION_MAJOR == 2 && GIT_VERSION_MINOR < 36))); then
  die "Git 2.36 or newer is required for sensitive-data removal; found ${GIT_VERSION_STRING}"
fi

[[ $(git rev-parse --is-bare-repository 2>/dev/null || true) == 'true' ]] \
  || die 'refusing: run only in a fresh bare mirror, never a working clone'
[[ $(git rev-parse --is-shallow-repository 2>/dev/null || true) == 'false' ]] \
  || die 'refusing: shallow repository cannot be used for a complete purge'
[[ $(git symbolic-ref -q HEAD 2>/dev/null || true) == 'refs/heads/main' ]] \
  || die 'refusing: mirror HEAD must be refs/heads/main'
[[ $(git remote | wc -l) -eq 1 && $(git remote) == 'origin' ]] \
  || die 'refusing: fresh mirror must have exactly one remote named origin'
[[ $(git config --bool --get remote.origin.mirror 2>/dev/null || true) == 'true' ]] \
  || die 'refusing: origin is not configured as a mirror remote'
git config --get-all remote.origin.fetch | grep -Fxq '+refs/*:refs/*' \
  || die 'refusing: origin mirror fetch refspec is not +refs/*:refs/*'
[[ -z $(git config --get extensions.partialClone 2>/dev/null || true) ]] \
  || die 'refusing: partial clone cannot prove complete history removal'
[[ $(git config --bool --get remote.origin.promisor 2>/dev/null || true) != 'true' ]] \
  || die 'refusing: promisor remote cannot prove complete history removal'

GIT_DIR=$(git rev-parse --absolute-git-dir)
readonly GIT_DIR
case "${EVIDENCE_DIR}/" in
  "${GIT_DIR}/"*) die 'evidence directory must be outside the disposable mirror' ;;
esac
[[ ! -s "$GIT_DIR/objects/info/alternates" ]] \
  || die 'refusing: object alternates are configured'

ORIGIN_URL=$(git remote get-url origin)
readonly ORIGIN_URL
[[ "$ORIGIN_URL" =~ ([:/])Connect-Group-Tech/Astro-websites(\.git)?$ ]] \
  || die 'origin URL does not identify Connect-Group-Tech/Astro-websites'
[[ ! "$ORIGIN_URL" =~ ^https?://[^/]+@ ]] \
  || die 'refusing an origin URL containing embedded credentials'

while IFS= read -r ref; do
  case "$ref" in
    refs/heads/*|refs/tags/*|refs/pull/*) ;;
    *) die "unexpected ref namespace in mirror: ${ref}" ;;
  esac
done < <(git for-each-ref --format='%(refname)')

for ref in "${REQUIRED_HEADS[@]}" "${REQUIRED_TAGS[@]}"; do
  git show-ref --verify --quiet "$ref" || die "required audited ref missing: ${ref}"
done
for pull_number in $(seq "$FIRST_AFFECTED_PULL_REF" "$LAST_AFFECTED_PULL_REF"); do
  git show-ref --verify --quiet "refs/pull/${pull_number}/head" \
    || die "required affected pull ref missing: refs/pull/${pull_number}/head"
done

CURRENT_REFS_SHA256=$(write_ref_snapshot | sha256sum | awk '{print $1}')
readonly CURRENT_REFS_SHA256
[[ "$CURRENT_REFS_SHA256" == "$EXPECTED_REFS_SHA256" ]] || die \
  "ref snapshot hash mismatch; freeze/refetch/review before rewriting (actual ${CURRENT_REFS_SHA256})"

GARBAGE_COUNT=$(git count-objects -v | awk -F ': ' '$1 == "garbage" {print $2}')
readonly GARBAGE_COUNT
[[ ${GARBAGE_COUNT:-0} == '0' ]] \
  || die "refusing: fresh mirror reports ${GARBAGE_COUNT} garbage objects"

for index in "${!PATHS[@]}"; do
  path=${PATHS[$index]}
  expected_blob=${PATH_BLOBS[$index]}
  mapfile -t observed_blobs < <(
    git rev-list --objects --all -- "$path" \
      | awk -v expected_path="$path" '$2 == expected_path {print $1}' \
      | LC_ALL=C sort -u
  )
  [[ ${#observed_blobs[@]} -eq 1 && ${observed_blobs[0]} == "$expected_blob" ]] \
    || die "historical object precondition failed for ${path}"
done

ROOT_RAW_SHA256=$(git cat-file blob "$EXPECTED_ROOT_BLOB" | sha256sum | awk '{print $1}')
readonly ROOT_RAW_SHA256
[[ "$ROOT_RAW_SHA256" == "$EXPECTED_ROOT_RAW_SHA256" ]] \
  || die 'historical root-key SHA-256 precondition failed'

command_required git-filter-repo
FILTER_REPO_VERSION=$(git-filter-repo --version 2>&1) \
  || die 'unable to query git-filter-repo version'
readonly FILTER_REPO_VERSION
FILTER_REPO_HELP=$(git-filter-repo -h 2>&1) \
  || die 'unable to query git-filter-repo capabilities'
readonly FILTER_REPO_HELP
grep -Fq -- '--sensitive-data-removal' <<<"$FILTER_REPO_HELP" \
  || die 'git-filter-repo lacks --sensitive-data-removal; install version 2.47 or newer'
grep -Fq -- '--no-fetch' <<<"$FILTER_REPO_HELP" \
  || die 'git-filter-repo lacks --no-fetch; install version 2.47 or newer'

umask 077
mkdir -m 0700 "$EVIDENCE_DIR"
RUN_COMPLETE='false'
mark_interrupted() {
  local exit_status=$?
  if [[ "$RUN_COMPLETE" != 'true' ]]; then
    printf 'Rewrite did not reach verified completion (exit %s). Do not push.\n' \
      "$exit_status" >"$EVIDENCE_DIR/FAILED-OR-INTERRUPTED.txt"
  fi
}
exit_for_signal() {
  local exit_status=$1
  trap - HUP INT TERM
  exit "$exit_status"
}
trap mark_interrupted EXIT
trap 'exit_for_signal 129' HUP
trap 'exit_for_signal 130' INT
trap 'exit_for_signal 143' TERM

printf '%s\n' "${PATHS[@]}" >"$EVIDENCE_DIR/key-paths.txt"
for index in "${!KEY_SUFFIXES[@]}"; do
  printf '%s\t%s\n' "${EXPECTED_BLOBS[$index]}" "${KEY_SUFFIXES[$index]}"
done >"$EVIDENCE_DIR/known-sensitive-blobs.tsv"
write_ref_snapshot >"$EVIDENCE_DIR/refs.before.tsv"
printf '%s  refs.before.tsv\n' "$CURRENT_REFS_SHA256" \
  >"$EVIDENCE_DIR/refs.before.sha256"
write_filtered_tree_hashes "$EVIDENCE_DIR/non-sensitive-tip-trees.before.tsv"
{
  printf 'started_utc=%s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
  printf 'repository=%s\n' "$EXPECTED_REPOSITORY"
  printf 'git_dir=%s\n' "$GIT_DIR"
  printf 'git_version=%s\n' "$GIT_VERSION_STRING"
  printf 'git_filter_repo_version=%s\n' "$FILTER_REPO_VERSION"
  printf 'expected_ref_snapshot_sha256=%s\n' "$EXPECTED_REFS_SHA256"
  printf 'root_blob=%s\n' "$EXPECTED_ROOT_BLOB"
  printf 'root_raw_sha256=%s\n' "$ROOT_RAW_SHA256"
  printf 'push_performed=false\n'
} >"$EVIDENCE_DIR/run-metadata.txt"

FILTER_ARGS=()
for path in "${PATHS[@]}"; do
  FILTER_ARGS+=(--path "$path")
done

note "Preconditions passed for ${#PATHS[@]} exact paths in a fresh mirror."
note 'Starting local history rewrite. No remote operation will be performed.'
set +e
# Sensitive-data mode normally fetches. The complete refs were explicitly
# materialized and hash-pinned above, so --no-fetch prevents a mid-run race.
git-filter-repo \
  --sensitive-data-removal \
  --no-fetch \
  --invert-paths \
  "${FILTER_ARGS[@]}" \
  2>&1 | tee "$EVIDENCE_DIR/git-filter-repo.log"
FILTER_STATUS=${PIPESTATUS[0]}
set -e
[[ $FILTER_STATUS -eq 0 ]] || die "git-filter-repo failed with status ${FILTER_STATUS}"

# git-filter-repo may remove origin intentionally. Restore only the already
# validated URL so the reviewed mirror remains usable for a later owner action.
if ! git remote get-url origin >/dev/null 2>&1; then
  git remote add --mirror=fetch origin "$ORIGIN_URL"
fi

write_ref_snapshot >"$EVIDENCE_DIR/refs.after.tsv"
awk -F '\t' '{print $2}' "$EVIDENCE_DIR/refs.before.tsv" | LC_ALL=C sort \
  >"$EVIDENCE_DIR/ref-names.before.txt"
awk -F '\t' '{print $2}' "$EVIDENCE_DIR/refs.after.tsv" | LC_ALL=C sort \
  >"$EVIDENCE_DIR/ref-names.after.txt"
cmp -s "$EVIDENCE_DIR/ref-names.before.txt" "$EVIDENCE_DIR/ref-names.after.txt" \
  || die 'ref names changed unexpectedly during rewrite'

write_filtered_tree_hashes "$EVIDENCE_DIR/non-sensitive-tip-trees.after.tsv"
cmp -s \
  "$EVIDENCE_DIR/non-sensitive-tip-trees.before.tsv" \
  "$EVIDENCE_DIR/non-sensitive-tip-trees.after.tsv" \
  || die 'non-sensitive tip-tree parity failed'

for path in "${PATHS[@]}"; do
  if [[ -n $(git log --all --full-history --format='%H' -- "$path") ]]; then
    die "sensitive path remains reachable after rewrite: ${path}"
  fi
done

for blob in "${EXPECTED_BLOBS[@]}"; do
  if git rev-list --objects --all | awk -v target="$blob" \
      '$1 == target {found = 1} END {exit !found}'; then
    die "sensitive blob remains reachable after rewrite: ${blob}"
  fi
  if git cat-file -e "${blob}^{blob}" 2>/dev/null; then
    die "sensitive blob remains physically present after rewrite: ${blob}"
  fi
done

git log --all --full-history --name-only --format= -- '*.key' \
  | sed '/^$/d' | LC_ALL=C sort -u >"$EVIDENCE_DIR/reachable-key-paths.after.txt"
[[ ! -s "$EVIDENCE_DIR/reachable-key-paths.after.txt" ]] \
  || die 'one or more .key paths remain reachable after rewrite'

git fsck --full --strict >"$EVIDENCE_DIR/git-fsck.after.txt" 2>&1 \
  || die 'git fsck failed after rewrite'
git count-objects -vH >"$EVIDENCE_DIR/git-count-objects.after.txt"

CHANGED_REFS_FILE="$GIT_DIR/filter-repo/changed-refs"
readonly CHANGED_REFS_FILE
[[ -f "$CHANGED_REFS_FILE" ]] \
  || die "git-filter-repo changed-refs evidence missing: ${CHANGED_REFS_FILE}"
cp "$CHANGED_REFS_FILE" "$EVIDENCE_DIR/changed-refs.txt"
EXPECTED_CHANGED_REFS_FILE="$EVIDENCE_DIR/changed-refs.expected.txt"
readonly EXPECTED_CHANGED_REFS_FILE
ACTUAL_CHANGED_REFS_SORTED_FILE="$EVIDENCE_DIR/changed-refs.actual-sorted.txt"
readonly ACTUAL_CHANGED_REFS_SORTED_FILE
write_expected_changed_refs >"$EXPECTED_CHANGED_REFS_FILE"
LC_ALL=C sort "$CHANGED_REFS_FILE" >"$ACTUAL_CHANGED_REFS_SORTED_FILE"
cmp -s "$EXPECTED_CHANGED_REFS_FILE" "$ACTUAL_CHANGED_REFS_SORTED_FILE" \
  || die 'changed-refs does not match the exact audited 8-head, 1-tag, 20-PR set'

for filter_evidence_name in \
  ref-map \
  commit-map \
  first-changed-commits \
  original_lfs_objects \
  orphaned_lfs_objects
do
  if [[ -f "$GIT_DIR/filter-repo/$filter_evidence_name" ]]; then
    cp \
      "$GIT_DIR/filter-repo/$filter_evidence_name" \
      "$EVIDENCE_DIR/$filter_evidence_name"
  fi
done
[[ -s "$EVIDENCE_DIR/first-changed-commits" ]] \
  || die 'first-changed-commits evidence is missing or empty'

AFFECTED_PULL_REFS=$(grep -c '^refs/pull/.*/head$' "$CHANGED_REFS_FILE" || true)
readonly AFFECTED_PULL_REFS
[[ "$AFFECTED_PULL_REFS" == "$EXPECTED_AFFECTED_PULL_REFS" ]] || die \
  "expected ${EXPECTED_AFFECTED_PULL_REFS} affected pull refs, observed ${AFFECTED_PULL_REFS}"
for pull_number in $(seq "$FIRST_AFFECTED_PULL_REF" "$LAST_AFFECTED_PULL_REF"); do
  grep -Fxq "refs/pull/${pull_number}/head" "$CHANGED_REFS_FILE" \
    || die "changed-refs is missing affected pull ref ${pull_number}"
done

grep -E 'First Changed Commit|LFS Objects Orphaned' \
  "$EVIDENCE_DIR/git-filter-repo.log" \
  >"$EVIDENCE_DIR/github-support-filter-summary.txt" || true

cat >"$EVIDENCE_DIR/github-support-request.txt" <<SUPPORT
Repository: ${EXPECTED_REPOSITORY}
Affected pull-request refs: ${AFFECTED_PULL_REFS} (refs/pull/2/head through refs/pull/21/head)

Attach or paste:
- first-changed-commits
- changed-refs.txt
- orphaned_lfs_objects, only if that file exists

Request after the reviewed force-mirror publication succeeds:
- dereference affected pull-request refs;
- purge cached commit/file views;
- run server-side garbage collection for the sensitive objects;
- report whether any fork still makes the objects reachable.

Local rewrite verified: yes
Remote push performed by this script: no
SUPPORT

cat >"$EVIDENCE_DIR/OWNER-NEXT-STEPS.txt" <<'NEXT'
STOP: this script did not push.

Before publication, independently review all evidence, confirm the remote
heads/tags have not changed since the frozen snapshot, arrange the documented
GitHub Ruleset/branch-protection window, and retain a recoverable root-only
pre-rewrite ref map. Publish using GitHub's documented sensitive-data-removal
procedure. Restore protections immediately, verify from a fresh heads/tags-only
clone, then open the prepared GitHub Support request.

All old clones and stashes must be replaced or carefully cleaned. Merging or
pushing old history can reintroduce the sensitive objects.
NEXT

printf 'Local rewrite and verification complete. Remote push was NOT performed.\n' \
  >"$EVIDENCE_DIR/LOCAL-REWRITE-VERIFIED-PUSH-NOT-PERFORMED.txt"
printf 'completed_utc=%s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
  >>"$EVIDENCE_DIR/run-metadata.txt"

find "$EVIDENCE_DIR" -maxdepth 1 -type f -exec chmod 0600 {} +
(
  cd "$EVIDENCE_DIR"
  find . -maxdepth 1 -type f ! -name SHA256SUMS -print0 \
    | LC_ALL=C sort -z \
    | xargs -0 sha256sum
) >"$EVIDENCE_DIR/SHA256SUMS"
chmod 0600 "$EVIDENCE_DIR/SHA256SUMS"

RUN_COMPLETE='true'
trap - EXIT HUP INT TERM
note "LOCAL REWRITE VERIFIED: evidence is in ${EVIDENCE_DIR}"
note 'REMOTE PUSH NOT PERFORMED. Independent review and owner action are required.'
