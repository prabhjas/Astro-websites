# astro-fleet-monitor — Phase 1 (baseline, read-only)

Registry-driven synthetic monitoring for every site in [`scripts/fleet-sites.json`](../fleet-sites.json).
Approved by CEO 2026-08-17: *"build it under scripts/fleet-monitor/ as proposed, try it for one week and send me the report."*
Design: [docs/FLEET-MONITORING-ARCHITECTURE-PROPOSAL.md](../../docs/FLEET-MONITORING-ARCHITECTURE-PROPOSAL.md) (v1.1).

**What it is:** identified (`astro-fleet-monitor/1.0` UA), polite (4 sites × 2 requests in flight, jitter), evidence-only HTTP GET/TLS probes. No secrets, no writes outside the evidence dir, no form submissions, no alerts sent in Phase 1.

**What it is not:** it does not touch Caddy, systemd, Cloudflare, `/opt/Astro-production`, or any owner-lane path. It lives here — not under `scripts/ops/` — on purpose.

---

## Quick start

```bash
node scripts/fleet-monitor/run.mjs once        # discover URLs (first time) → critical checks + cert → daily report
node scripts/fleet-monitor/run.mjs daemon      # keep running: critical every 5 min, sitemap/cert/CrUX daily, daily report
node scripts/fleet-monitor/run.mjs weekly      # 7-day report (.md + .pdf) — the one for the CEO
node scripts/fleet-monitor/status.mjs          # what is it doing right now? (--watch = live, --html = dashboard.html)
node scripts/fleet-monitor/selftest.mjs        # 25 assertions against local mock sites — no fleet traffic
```

## Seeing what's happening

| Command | Shows |
|---|---|
| `node scripts/fleet-monitor/status.mjs` | daemon PID/uptime, last critical/sitemap/CrUX cycle, cycles-in-24h vs expected, sites green, open issues (with would-alert flags), releases observed, external hosts, evidence size |
| `node scripts/fleet-monitor/status.mjs --watch` | same, refreshing every 30 s |
| `node scripts/fleet-monitor/status.mjs --html` then open `local/monitor-evidence/dashboard.html` | tile-per-site colour board (green/amber/red) + the status text, auto-refresh 60 s (the daemon regenerates it after every critical cycle) |
| `tail -f local/monitor-evidence/daemon-logs/stdout.log` | raw per-site lines as each cycle runs |
| `cat local/monitor-evidence/reports/report-<date>-1d.md` | yesterday/today digest |

## Testing

`selftest.mjs` starts 7 mock sites on 127.0.0.1 (healthy, 500, soft-404, robots-blocks-all, body-shrink, slow-TTFB, sitemap 200→404) and runs the real scripts against them in a throw-away evidence dir. It asserts every verdict rule, streak/would-alert (incl. the raised threshold inside a publish window), body-shrink learning, commit-change → publish window, sitemap transitions, state, report generation and heartbeats. Run it after any change to the checkers.

Evidence lands in `local/monitor-evidence/` (git-ignored):

```text
checks/checks-YYYY-MM-DD.jsonl   one line per probe (status, ttfb, bytes, cf-cache, commit, verdict, streak, wouldAlert)
urls/<site>.json                 sitemap corpus per site (+ <site>.status.json = last status per URL)
reports/report-<date>-1d.md      daily digest · weekly-<date>.md/.pdf = 7-day report
heartbeat.jsonl                  one line per cycle — the dead-man switch (report § 9 reads it)
state.json                       learned facts: canonical origin, title marker, body baseline, streaks, commit history
crux/                            CrUX field CWV snapshots (only when CRUX_API_KEY is set)
```

## One-week laptop run (Phase 1, placement C)

```bash
mkdir -p local/monitor-evidence/daemon-logs
node scripts/fleet-monitor/run.mjs launchd > ~/Library/LaunchAgents/com.connectgroup.astro-fleet-monitor.plist
launchctl load ~/Library/LaunchAgents/com.connectgroup.astro-fleet-monitor.plist
```

Keep the Mac on power; `caffeinate -s` prevents sleep. Gaps (lid closed, no network) are recorded honestly in the report as monitor downtime — that is the point of the heartbeat.
Stop: `launchctl unload ~/Library/LaunchAgents/com.connectgroup.astro-fleet-monitor.plist`.

## Host placement (option A — after Aaron approves)

`node scripts/fleet-monitor/run.mjs cron` prints crontab lines for user `webdev`. Add `--origin` (already in the printed lines) to enable loopback probes of `127.0.0.1:<port>` so every alert says **edge vs origin**. Set `FLEET_MONITOR_EVIDENCE_DIR=/var/lib/astro-fleet/monitor` once the path is approved.

## Scripts

| Script | Tier | What |
|---|---|---|
| `discover-urls.mjs [sites]` | — | robots.txt `Sitemap:` + sitemap-index recursion → URL corpus; learns canonical host (apex vs www); flags URL-count drops and relative `Sitemap:` lines |
| `check-critical.mjs [sites] [--cert] [--origin]` | T0 | `/`, robots, sitemap, guaranteed-404 (soft-404 detection), `/api/health/`, non-canonical→canonical redirect, up to 3 conversion pages (`<form>` present), body floor / shrink / title marker, TTFB verdicts, streaks + would-alert, publish-window detection via `x-astro-fleet-commit` |
| `check-sitemap.mjs [sites] [--rediscover]` | T1 | polite crawl of every sitemap URL; per-URL last-status memory → `200→404` / `200→5xx` transitions |
| `crux.mjs [sites]` | — | field CWV (LCP/INP/CLS p75, phone+desktop) from the free CrUX API; needs `CRUX_API_KEY` |
| `report.mjs [--days N] [--out f]` | — | JSONL → Markdown: exec summary, per-site table, needs-attention, would-alert incidents, sitemap corpus + problem URLs, latency calibration, release events, CrUX, monitor self-check |
| `report-pdf.py in.md out.pdf` | — | Markdown → styled PDF (python3 + reportlab) |
| `run.mjs once\|daemon\|weekly\|launchd\|cron` | — | orchestrator; each step is a child process with its own heartbeat |
| `status.mjs [--watch] [--html]` | — | live status / dashboard |
| `selftest.mjs` | — | mock-site regression test (25 assertions) |

## Config

- `monitor.config.json` — cadence, politeness caps, evidence dir, `include`/`exclude` enrollment, critical routes, conversion-path hints, origin probe host
- `thresholds.json` — defaults + per-site overrides (TTFB warn/fail, body floor, cert days, sitemap drop %, consecutive fails, publish window). Report § 6 suggests per-site TTFB warn values after a baseline week

## Verdicts

`pass` · `warn` (threshold breach, non-fatal) · `fail` (status/error/content assertion) · `info` (expected, e.g. health route absent, sitemap redirect).
`wouldAlert` = fail streak ≥ `consecutiveFails` (2), or ≥ 3 inside a 15-min publish window. Phase 1 records it; nothing is sent.

## Safety

- Only outbound HTTPS GET + TLS handshake to public fleet hosts (and loopback GET when `--origin`)
- Fixed UA on every request → owner can allow-list it in Cloudflare and exclude it from analytics
- Never POSTs to `/api/contact/`; conversion pages are render-checked only
- Never reads `.env`; the only "secret" (`CRUX_API_KEY`) is optional and read from the environment
