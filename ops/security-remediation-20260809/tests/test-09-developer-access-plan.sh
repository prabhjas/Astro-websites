#!/usr/bin/env bash
# Proves 09 is fail-closed on sudo visibility and plan-only with sanitized output.

set -euo pipefail
IFS=$'\n\t'

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)
TARGET=$SCRIPT_DIR/09-developer-access.sh
RG=$(command -v rg)
TMP_ROOT=$(mktemp -d /tmp/astro-webdev-plan-fixture.XXXXXX)
cleanup() { case "$TMP_ROOT" in /tmp/astro-webdev-plan-fixture.*) rm -rf -- "$TMP_ROOT" ;; esac; }
trap cleanup EXIT
BIN=$TMP_ROOT/bin
mkdir -p -- "$BIN" "$TMP_ROOT/safe" "$TMP_ROOT/unsafe"
chmod 0700 -- "$BIN" "$TMP_ROOT/safe"
chmod 0777 -- "$TMP_ROOT/unsafe"

cat >"$BIN/sudo" <<'SUDO'
#!/usr/bin/env bash
set -euo pipefail
[[ "${SUDO_FIXTURE_FAIL:-0}" != 1 ]] || { printf 'fixture visibility failure\n' >&2; exit 75; }
printf 'Matching Defaults entries for webdev on fixture:\n'
printf 'User webdev may run the following commands on fixture:\n'
printf '    (root) NOPASSWD: /usr/local/sbin/site-ctl *\n'
SUDO
cat >"$BIN/visudo" <<'VISUDO'
#!/usr/bin/env bash
[[ "${VISUDO_FIXTURE_FAIL:-0}" != 1 ]]
VISUDO
chmod 0755 -- "$BIN/sudo" "$BIN/visudo"
export PATH=$BIN:/usr/sbin:/usr/bin:/sbin:/bin

snapshot_access_metadata() {
  {
    for path in /home/webdev/.ssh/authorized_keys /etc/sudoers /etc/sudoers.d/webdev /usr/local/sbin/site-ctl; do
      if [[ -e "$path" || -L "$path" ]]; then
        stat -Lc '%n\t%u:%g:%a:%h:%d:%i:%s' -- "$path"
        [[ ! -f "$path" || -L "$path" ]] || sha256sum "$path"
      else
        printf '%s\tabsent\n' "$path"
      fi
    done
  } | sha256sum | awk '{print $1}'
}

before=$(snapshot_access_metadata)
if SUDO_FIXTURE_FAIL=1 bash "$TARGET" >"$TMP_ROOT/sudo-fail.out" 2>&1; then
  printf 'Audit succeeded despite unknown effective sudo policy\n' >&2
  exit 1
fi
grep -q 'audit is incomplete' "$TMP_ROOT/sudo-fail.out" || exit 1

bash "$TARGET" --connection-context 192.0.2.10 example.test 203.0.113.20 2222 \
  >"$TMP_ROOT/audit.out"
grep -q 'addr=192.0.2.10 host=example.test laddr=203.0.113.20 lport=2222' "$TMP_ROOT/audit.out" || exit 1
grep -q 'visible=yes .*rule text suppressed' "$TMP_ROOT/audit.out" || exit 1
if grep -q '/usr/local/sbin/site-ctl \*' "$TMP_ROOT/audit.out"; then
  printf 'Effective sudo rule arguments leaked into evidence\n' >&2
  exit 1
fi
if grep -Eq 'ssh-(rsa|ed25519|ecdsa)[[:space:]]+[A-Za-z0-9+/]{20,}' "$TMP_ROOT/audit.out"; then
  printf 'Public-key body leaked into evidence\n' >&2
  exit 1
fi

if bash "$TARGET" --apply --output-dir "$TMP_ROOT/unsafe/plan" >/dev/null 2>&1; then
  printf 'Writable custom output parent was accepted\n' >&2
  exit 1
fi
[[ ! -e "$TMP_ROOT/unsafe/plan" ]] || exit 1

PLAN=$TMP_ROOT/safe/plan
bash "$TARGET" --apply --output-dir "$PLAN" >/dev/null
[[ "$(stat -c '%u:%g:%a' "$PLAN")" == 0:0:700 ]] || exit 1
[[ "$(stat -c '%u:%g:%a:%h' "$PLAN/.astro-webdev-owner-plan")" == 0:0:600:1 ]] || exit 1
[[ "$(stat -c '%u:%g:%a:%h' "$PLAN/EVIDENCE.txt")" == 0:0:600:1 ]] || exit 1
[[ "$(stat -c '%u:%g:%a:%h' "$PLAN/OWNER-REVOCATION-PLAN.md")" == 0:0:600:1 ]] || exit 1
grep -q 'checklist, not an executable' "$PLAN/OWNER-REVOCATION-PLAN.md" || exit 1
grep -q 'no key contents' "$PLAN/EVIDENCE.txt" || exit 1
after=$(snapshot_access_metadata)
[[ "$before" == "$after" ]] || { printf 'Access-control metadata changed during plan generation\n' >&2; exit 1; }

if "$RG" -n '(^|[;&|])[[:space:]]*(mv|install|truncate|usermod|gpasswd|pkill|kill)[[:space:]].*(authorized_keys|sudoers|webdev)' "$TARGET" >/dev/null; then
  printf 'Live access mutation command remains in plan-only script\n' >&2
  exit 1
fi

printf 'PASS: full SSH context, fail-closed sudo visibility, sanitized evidence, private plan, and no access mutation\n'
