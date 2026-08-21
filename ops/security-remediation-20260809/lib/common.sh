#!/usr/bin/env bash

# Shared helpers. This file is sourced by scripts in the parent directory.
# It intentionally performs no action when sourced.

set -euo pipefail
IFS=$'\n\t'

readonly REMEDIATION_ID="astro-security-remediation-20260809"

log() {
  printf '%s\n' "$*"
}

info() {
  printf 'INFO: %s\n' "$*"
}

warn() {
  printf 'WARN: %s\n' "$*" >&2
}

blocked() {
  printf 'BLOCKED: %s\n' "$*" >&2
}

die() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

utc_stamp() {
  date -u +%Y%m%dT%H%M%SZ
}

require_root() {
  [[ "$(id -u)" -eq 0 ]] || die "This apply phase must run as root."
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "Required command not found: $1"
}

require_absolute_path() {
  local value=$1
  local label=${2:-path}
  [[ "$value" == /* ]] || die "$label must be an absolute path: $value"
  [[ "$value" != "/" ]] || die "$label must not be the filesystem root"
  [[ "$value" != "/root" ]] || die "$label must not be /root itself"
  [[ "$value" != "/opt" ]] || die "$label must not be /opt itself"
}

assert_new_directory_target() {
  local value=$1
  local canonical
  # Caller-selected backup/output paths are privileged write targets.  Refuse
  # symlinked or writable parents before anything is created, and require the
  # spelling itself to be canonical so a later rollback refers to one path.
  canonical=$(canonical_private_output_path "$value")
  [[ "$canonical" == "$value" ]] || die "Output directory must be canonical: $value"
  [[ ! -e "$canonical" && ! -L "$canonical" ]] || \
    die "Refusing to overwrite existing output: $canonical"
}

mode_has_group_or_other_write_common() {
  local mode=$1
  (( (8#$mode & 0022) != 0 ))
}

canonical_private_output_path() {
  # Resolve and validate the caller-owned parent without creating anything.
  # The requested spelling itself must be canonical, which keeps marker and
  # rollback paths stable and rejects symlink/.. indirection.
  local requested=$1
  local parent canonical_parent canonical ancestor ancestor_mode
  require_absolute_path "$requested" "output directory"
  canonical=$(realpath -m -- "$requested")
  [[ "$requested" == "$canonical" ]] || die "Output directory must use its canonical path: $requested"
  parent=$(dirname -- "$requested")
  [[ -d "$parent" && ! -L "$parent" ]] || die "Output parent must be a real directory: $parent"
  canonical_parent=$(realpath -e -- "$parent")
  [[ "$canonical_parent" == "$parent" ]] || die "Output parent contains symlink/noncanonical components: $parent"
  [[ "$(stat -Lc '%u:%g' -- "$parent")" == 0:0 ]] || die "Output parent must be root:root: $parent"
  mode_has_group_or_other_write_common "$(file_mode "$parent")" && \
    die "Output parent must not be group/other-writable: $parent"
  # A safe immediate parent is insufficient if a writable ancestor can rename
  # it. Validate every component. The root-owned sticky /tmp is the one narrow
  # exception: its sticky bit prevents non-owners from renaming a root-owned
  # private child, which keeps fixture/output use under /tmp safe.
  ancestor=$parent
  while [[ "$ancestor" != / ]]; do
    [[ "$(stat -Lc '%u' -- "$ancestor")" == 0 ]] || die "Output ancestor must be root-owned: $ancestor"
    ancestor_mode=$(file_mode "$ancestor")
    if mode_has_group_or_other_write_common "$ancestor_mode"; then
      if [[ "$ancestor" != /tmp ]] || (( (8#$ancestor_mode & 01000) == 0 )); then
        die "Output ancestor permits unsafe rename/write access: $ancestor"
      fi
    fi
    ancestor=$(dirname -- "$ancestor")
  done
  printf '%s\n' "$canonical"
}

prepare_marked_private_dir() {
  # Create or reopen a private, root-owned staging directory. An existing
  # directory is accepted only when its marker is exact and equally private.
  local requested=$1
  local marker_name=$2
  local canonical marker
  canonical=$(canonical_private_output_path "$requested")
  marker=$canonical/$marker_name
  if [[ -e "$canonical" || -L "$canonical" ]]; then
    [[ -d "$canonical" && ! -L "$canonical" ]] || die "Output is not a real directory: $canonical"
    [[ "$(realpath -e -- "$canonical")" == "$canonical" ]] || die "Output is not canonical: $canonical"
    [[ "$(stat -Lc '%u:%g:%a' -- "$canonical")" == 0:0:700 ]] || \
      die "Existing output must be root:root mode 0700: $canonical"
    [[ -f "$marker" && ! -L "$marker" ]] || die "Existing output has no safe marker: $canonical"
    [[ "$(stat -Lc '%u:%g:%a:%h' -- "$marker")" == 0:0:600:1 ]] || \
      die "Output marker must be root:root mode 0600 with one link: $marker"
    [[ "$(<"$marker")" == "$REMEDIATION_ID" ]] || die "Output marker content does not match this remediation pack"
  else
    install -d -o 0 -g 0 -m 0700 -- "$canonical"
    printf '%s\n' "$REMEDIATION_ID" >"$marker"
    chown 0:0 -- "$marker"
    chmod 0600 -- "$marker"
  fi
  printf '%s\n' "$canonical"
}

make_private_dir() {
  local value=$1
  local canonical
  assert_new_directory_target "$value"
  canonical=$(canonical_private_output_path "$value")
  install -d -o 0 -g 0 -m 0700 -- "$canonical"
  [[ -d "$canonical" && ! -L "$canonical" ]] || die "Private output creation failed: $canonical"
  [[ "$(realpath -e -- "$canonical")" == "$canonical" ]] || die "Private output became noncanonical: $canonical"
  [[ "$(stat -Lc '%u:%g:%a' -- "$canonical")" == 0:0:700 ]] || \
    die "Private output must be root:root mode 0700: $canonical"
}

default_backup_dir() {
  local purpose=$1
  # Keep the immediate parent at the standard root-owned /var/backups rather
  # than implicitly creating an unvalidated intermediate directory.
  printf '/var/backups/%s-%s-%s\n' "$REMEDIATION_ID" "$purpose" "$(utc_stamp)"
}

shell_quote() {
  printf '%q' "$1"
}

file_mode() {
  stat -Lc '%a' -- "$1"
}

file_uid() {
  stat -Lc '%u' -- "$1"
}

file_gid() {
  stat -Lc '%g' -- "$1"
}

safe_env_value() {
  # Reads one literal path-like value without sourcing or evaluating the file.
  # Nothing is printed for ambiguous/multiline/shell-expanding assignments.
  local file=$1
  local key=$2
  local line value
  line=$(grep -m1 -E "^[[:space:]]*${key}=" -- "$file" 2>/dev/null || true)
  [[ -n "$line" ]] || return 1
  value=${line#*=}
  value=${value%$'\r'}
  if [[ "$value" == \"*\" && "$value" == *\" ]]; then
    value=${value:1:${#value}-2}
  elif [[ "$value" == \'*\' && "$value" == *\' ]]; then
    value=${value:1:${#value}-2}
  fi
  [[ -n "$value" ]] || return 1
  [[ "$value" != *'$('* && "$value" != *'`'* && "$value" != *'${'* ]] || return 1
  [[ "$value" != *$'\n'* && "$value" != *$'\r'* ]] || return 1
  printf '%s\n' "$value"
}

repo_root_from_script() {
  local script_dir=$1
  (cd "$script_dir/../.." && pwd -P)
}

print_apply_banner() {
  local message=$1
  printf '\n============================================================\n' >&2
  printf 'LIVE APPLY PHASE\n%s\n' "$message" >&2
  printf '============================================================\n\n' >&2
}
