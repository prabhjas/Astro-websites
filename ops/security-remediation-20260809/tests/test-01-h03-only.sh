#!/usr/bin/env bash
# Run the H-03-only half in a separate process so both deep fixtures remain
# comfortably within constrained CI command timeouts.
set -euo pipefail
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)
ASTRO_TEST_SCOPE=h03-only exec bash "$SCRIPT_DIR/test-01-sensitive-modes.sh"
