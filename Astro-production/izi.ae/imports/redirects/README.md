# Redirect import staging for izi.ae
#
# Follow: docs/CURSOR-IMPORT-REDIRECTS.md
#
# IMPORTANT: `2026-08-05-redirection-log*.csv/json` look like **HR / payroll**
# redirects from another Connect domain — do NOT merge into src/data/redirects.yml.
#
# For izi.ae redirects:
# 1. Export live Redirection / Rank Math rules for izi.ae only
# 2. Save as YYYY-MM-DD-<source>.json|csv here
# 3. Merge into src/data/redirects.yml and run `pnpm run redirects:generate`
#
# Current interim aliases live in src/data/redirects.yml (common path aliases).
