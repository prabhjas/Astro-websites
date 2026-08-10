#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)
TARGET=$SCRIPT_DIR/07-orphan-http-processes.sh

[[ "$(bash "$TARGET" --classify-cgroup '0::/user.slice/user-0.slice/session-42.scope')" == reviewable-root-login-scope ]] || exit 1
[[ "$(bash "$TARGET" --classify-cgroup '0::/system.slice/sshd-session-deadbeef.scope')" == reviewable-root-login-scope ]] || exit 1
[[ "$(bash "$TARGET" --classify-cgroup '0::/system.slice/node.service')" == managed-service-container-or-user-scope ]] || exit 1
[[ "$(bash "$TARGET" --classify-cgroup '0::/system.slice/docker-deadbeef.scope')" == managed-service-container-or-user-scope ]] || exit 1
[[ "$(bash "$TARGET" --classify-cgroup '0::/user.slice/user-1000.slice/session-42.scope')" == managed-service-container-or-user-scope ]] || exit 1
[[ "$(bash "$TARGET" --classify-cgroup '0::/')" == unmanaged-root-cgroup ]] || exit 1

# Static safety assertion for the known deleted-cwd finding: candidate and
# apply paths must bind both kernel link text and the open cwd device:inode.
grep -Fq 'cwd=$(readlink "/proc/$pid/cwd"' "$TARGET" || exit 1
grep -Fq "cwd_identity=\$(stat -Lc '%d:%i' \"/proc/\$pid/cwd\"" "$TARGET" || exit 1
grep -Fq 'PLAN_CWD_IDENTITIES' "$TARGET" || exit 1
grep -Fq 'cwd device/inode changed' "$TARGET" || exit 1

printf 'PASS: root login/sshd scopes and deleted-cwd identity binding; managed scopes remain excluded\n'
