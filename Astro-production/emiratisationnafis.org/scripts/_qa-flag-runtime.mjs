/**
 * Runtime check: phone flag chrome present after JS init.
 * Uses playwright if available; otherwise prints served HTML hints.
 */
const url = process.argv[2] || 'http://127.0.0.1:5108/emiratisation-recruitment/';

async function withPlaywright() {
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    return null;
  }
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3500);
  const result = await page.evaluate(() => {
    const phone = document.querySelector('.wpcf7-phonetext');
    const wrap = phone && phone.closest('.intl-tel-input');
    const flag = wrap && wrap.querySelector('.iti-flag');
    const dial = wrap && wrap.querySelector('.selected-dial-code');
    const fc = wrap && wrap.querySelector('.flag-container');
    const cs = flag ? getComputedStyle(flag) : null;
    const fcs = fc ? getComputedStyle(fc) : null;
    const dials = dial ? getComputedStyle(dial) : null;
    return {
      mirror: (document.querySelector('script[src*="astro-mirror-fixes"]') || {}).src || '',
      hasPhone: !!phone,
      hasWrap: !!wrap,
      hasFlagContainer: !!fc,
      hasItiFlag: !!flag,
      dialText: dial ? dial.textContent.trim() : '',
      flagDisplay: cs && cs.display,
      flagVisibility: cs && cs.visibility,
      flagOpacity: cs && cs.opacity,
      flagBg: cs && cs.backgroundImage.slice(0, 80),
      flagW: flag ? Math.round(flag.getBoundingClientRect().width) : 0,
      flagH: flag ? Math.round(flag.getBoundingClientRect().height) : 0,
      fcDisplay: fcs && fcs.display,
      fcZ: fcs && fcs.zIndex,
      dialDisplay: dials && dials.display,
      dialColor: dials && dials.color,
      padLeft: phone ? getComputedStyle(phone).paddingLeft : '',
    };
  });
  await browser.close();
  return result;
}

const pw = await withPlaywright();
if (pw) {
  console.log(JSON.stringify(pw, null, 2));
  const ok = pw.hasWrap && pw.hasItiFlag && pw.flagW > 0 && pw.dialText;
  process.exit(ok ? 0 : 2);
}

const html = await fetch(url).then((r) => r.text());
const m = html.match(/astro-mirror-fixes\.js[^"'<\s]*/);
const stripped = html.includes('nbcpf intlTelInput init removed');
console.log({
  playwright: false,
  servedMirror: m && m[0],
  nbcpfStripped: stripped,
  phonetext: (html.match(/wpcf7-phonetext/g) || []).length,
});
