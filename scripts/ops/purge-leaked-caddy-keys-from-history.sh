#!/usr/bin/env bash
# P0-1 history purge — REMOVE leaked Caddy CA/origin .key blobs from ALL commits.
#
# DO NOT RUN until Aaron schedules a rewrite window and all developers are notified.
# After this, every clone must re-clone (or hard-reset to rewritten tips). Force-push required.
#
# Prerequisites:
#   brew install git-filter-repo   # or pipx install git-filter-repo
#   Fresh bare mirror clone (never rewrite your daily working clone first)
#
# Usage (on a throwaway mirror):
#   git clone --mirror git@github-connectgroup:Connect-Group-Tech/Astro-websites.git Astro-websites.git
#   cd Astro-websites.git
#   bash /path/to/purge-leaked-caddy-keys-from-history.sh
#   # review: git log --all --full-history -- '*.key' | head
#   git push --force --all
#   git push --force --tags

set -euo pipefail

ROOT_PREFIX='caddy/upgrade-rollback-20260803/var-lib-caddy/.local/share/caddy'

PATHS=(
  "${ROOT_PREFIX}/pki/authorities/local/root.key"
  "${ROOT_PREFIX}/pki/authorities/local/intermediate.key"
  "${ROOT_PREFIX}/certificates/local/cbss.ae/cbss.ae.key"
  "${ROOT_PREFIX}/certificates/local/www.cbss.ae/www.cbss.ae.key"
  "${ROOT_PREFIX}/certificates/local/connectgroup.co/connectgroup.co.key"
  "${ROOT_PREFIX}/certificates/local/www.connectgroup.co/www.connectgroup.co.key"
  "${ROOT_PREFIX}/certificates/local/evolutionmiddleast.com/evolutionmiddleast.com.key"
  "${ROOT_PREFIX}/certificates/local/www.evolutionmiddleast.com/www.evolutionmiddleast.com.key"
  "${ROOT_PREFIX}/certificates/local/iberiaworkforce.com/iberiaworkforce.com.key"
  "${ROOT_PREFIX}/certificates/local/www.iberiaworkforce.com/www.iberiaworkforce.com.key"
  "${ROOT_PREFIX}/certificates/local/spheavyrental.ae/spheavyrental.ae.key"
  "${ROOT_PREFIX}/certificates/local/www.spheavyrental.ae/www.spheavyrental.ae.key"
)

if ! command -v git-filter-repo >/dev/null 2>&1; then
  echo "Install git-filter-repo first: https://github.com/newren/git-filter-repo"
  exit 1
fi

echo "About to rewrite history in: $(pwd)"
echo "Removing ${#PATHS[@]} leaked key paths."
read -r -p "Type PURGE to continue: " confirm
[[ "$confirm" == "PURGE" ]] || { echo "Aborted."; exit 1; }

args=()
for p in "${PATHS[@]}"; do
  args+=(--path "$p")
done

git filter-repo "${args[@]}" --invert-paths

echo
echo "Verify keys are gone from history:"
echo "  git rev-list --objects --all | grep -E '\\.key$' | head"
echo "Then force-push ALL remotes (Connect-Group-Tech + any mirrors/forks that had the keys)."
echo "Notify developers: re-clone; do not merge old history back."
