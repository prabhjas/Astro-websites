#!/usr/bin/env node
/**
 * run — orchestrator for the fleet monitor.
 *
 *   node scripts/fleet-monitor/run.mjs once            # discover (if needed) + critical +cert + daily report
 *   node scripts/fleet-monitor/run.mjs daemon          # keep running: critical every N min, sitemap/cert/crux daily, reports
 *   node scripts/fleet-monitor/run.mjs weekly          # 7-day report (+ PDF if python3/reportlab present)
 *   node scripts/fleet-monitor/run.mjs launchd         # print a macOS launchd plist for the one-week laptop run
 *   node scripts/fleet-monitor/run.mjs cron            # print crontab lines for host placement (option A)
 *
 * Every step is a child process so one crash cannot take the loop down; each writes its own heartbeat.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { CONFIG, EVIDENCE_DIR, MONITOR_DIR, ROOT, ensureEvidenceDirs, log, writeHeartbeat, todayUtc } from './lib.mjs';

const mode = process.argv[2] ?? 'once';
const NODE = process.execPath;

function step(script, args = [], env = {}) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(NODE, [join(MONITOR_DIR, script), ...args], { cwd: ROOT, stdio: 'inherit', env: { ...process.env, ...env } });
    child.on('exit', (code) => { log(`step ${script} ${args.join(' ')} → exit ${code} in ${Math.round((Date.now() - started) / 1000)}s`); resolve(code); });
    child.on('error', (e) => { log(`step ${script} error ${e.message}`); resolve(1); });
  });
}

function hasCorpus() {
  const d = join(EVIDENCE_DIR, 'urls');
  return existsSync(d) && readdirSync(d).some((f) => f.endsWith('.json') && !f.endsWith('.status.json'));
}

async function tryPdf(md) {
  const pdf = md.replace(/\.md$/, '.pdf');
  const r = spawnSync('python3', [join(MONITOR_DIR, 'report-pdf.py'), md, pdf], { encoding: 'utf8' });
  if (r.status === 0) log(`pdf written: ${pdf}`); else log(`pdf skipped (${(r.stderr || '').split('\n').filter(Boolean).pop() || 'python3/reportlab unavailable'})`);
}

async function once() {
  ensureEvidenceDirs();
  if (!hasCorpus()) await step('discover-urls.mjs');
  await step('check-critical.mjs', ['all', '--cert']);
  await step('report.mjs', ['--days', '1']);
}

async function weekly() {
  await step('report.mjs', ['--days', '7', '--out', join(EVIDENCE_DIR, 'reports', `weekly-${todayUtc()}.md`)]);
  await tryPdf(join(EVIDENCE_DIR, 'reports', `weekly-${todayUtc()}.md`));
}

async function daemon() {
  ensureEvidenceDirs();
  const every = CONFIG.cadence.criticalMinutes * 60000;
  let lastDaily = { sitemap: null, cert: null, crux: null, report: null };
  let running = false;
  log(`daemon: critical every ${CONFIG.cadence.criticalMinutes} min · sitemap ${CONFIG.cadence.sitemapHourUtc}:00 UTC · cert ${CONFIG.cadence.certHourUtc}:00 UTC · report 00:10 UTC`);
  writeHeartbeat('daemon-start', { pid: process.pid });
  if (!hasCorpus()) await step('discover-urls.mjs');
  // background daily jobs run in a separate lane so the 5-min critical loop never waits on a 1-hour crawl
  let dailyBusy = false;
  // returns false when the lane is busy so the caller retries next tick instead of marking the day done
  const dailyLane = (kind, script, args) => { if (dailyBusy) { log(`daily ${kind} deferred (lane busy)`); return false; } dailyBusy = true; step(script, args).finally(() => { dailyBusy = false; }); return true; };

  while (true) {
    const tick = Date.now();
    const now = new Date(); const day = todayUtc(now); const hour = now.getUTCHours(); const minute = now.getUTCMinutes();
    if (!running) {
      running = true;
      const wantCert = lastDaily.cert !== day && hour >= CONFIG.cadence.certHourUtc;
      step('check-critical.mjs', ['all', ...(wantCert ? ['--cert'] : [])]).then(() => { running = false; if (wantCert) lastDaily.cert = day; return step('status.mjs', ['--html']); });
    } else log('critical cycle skipped — previous still running (recorded as gap)');

    if (lastDaily.sitemap !== day && hour >= CONFIG.cadence.sitemapHourUtc && dailyLane('sitemap', 'check-sitemap.mjs', ['all', '--rediscover'])) lastDaily.sitemap = day;
    if (lastDaily.crux !== day && hour >= CONFIG.cadence.cruxHourUtc && dailyLane('crux', 'crux.mjs', ['all'])) lastDaily.crux = day;
    if (lastDaily.report !== day && (hour > 0 || minute >= 10)) { lastDaily.report = day; step('report.mjs', ['--days', '1']); }

    const elapsed = Date.now() - tick;
    await sleep(Math.max(1000, every - elapsed));
  }
}

function launchd() {
  const label = 'com.connectgroup.astro-fleet-monitor';
  const logDir = join(EVIDENCE_DIR, 'daemon-logs');
  console.log(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>${label}</string>
  <key>ProgramArguments</key><array>
    <string>${NODE}</string>
    <string>${join(MONITOR_DIR, 'run.mjs')}</string>
    <string>daemon</string>
  </array>
  <key>WorkingDirectory</key><string>${ROOT}</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>${logDir}/stdout.log</string>
  <key>StandardErrorPath</key><string>${logDir}/stderr.log</string>
  <key>EnvironmentVariables</key><dict>
    <key>PATH</key><string>/usr/local/bin:/usr/bin:/bin</string>
    <!-- optional: <key>CRUX_API_KEY</key><string>…</string> -->
  </dict>
</dict></plist>`);
  console.error(`\n# install (laptop, one-week baseline):\n#   mkdir -p ${logDir}\n#   node scripts/fleet-monitor/run.mjs launchd > ~/Library/LaunchAgents/${label}.plist\n#   launchctl load ~/Library/LaunchAgents/${label}.plist\n#   caffeinate -s &   # optional: keep Mac awake while on power\n# stop:\n#   launchctl unload ~/Library/LaunchAgents/${label}.plist`);
}

function cron() {
  const n = NODE; const m = MONITOR_DIR;
  console.log(`# astro-fleet-monitor — host placement (option A), user webdev, read-only egress. Times UTC.
*/${CONFIG.cadence.criticalMinutes} * * * *  cd ${ROOT} && ${n} ${m}/check-critical.mjs all --origin >> ${EVIDENCE_DIR}/daemon-logs/critical.log 2>&1
0 ${CONFIG.cadence.sitemapHourUtc} * * *      cd ${ROOT} && ${n} ${m}/check-sitemap.mjs all --rediscover >> ${EVIDENCE_DIR}/daemon-logs/sitemap.log 2>&1
0 ${CONFIG.cadence.certHourUtc} * * *      cd ${ROOT} && ${n} ${m}/check-critical.mjs all --cert >> ${EVIDENCE_DIR}/daemon-logs/cert.log 2>&1
0 ${CONFIG.cadence.cruxHourUtc} * * *      cd ${ROOT} && ${n} ${m}/crux.mjs all >> ${EVIDENCE_DIR}/daemon-logs/crux.log 2>&1
10 0 * * *     cd ${ROOT} && ${n} ${m}/report.mjs --days 1 >> ${EVIDENCE_DIR}/daemon-logs/report.log 2>&1
20 0 * * 1     cd ${ROOT} && ${n} ${m}/run.mjs weekly >> ${EVIDENCE_DIR}/daemon-logs/report.log 2>&1
# FLEET_MONITOR_EVIDENCE_DIR=/var/lib/astro-fleet/monitor  (set in crontab env once Aaron approves the path)`);
}

switch (mode) {
  case 'once': await once(); break;
  case 'daemon': await daemon(); break;
  case 'weekly': await weekly(); break;
  case 'launchd': launchd(); break;
  case 'cron': cron(); break;
  default: console.error('usage: run.mjs once|daemon|weekly|launchd|cron'); process.exit(2);
}
