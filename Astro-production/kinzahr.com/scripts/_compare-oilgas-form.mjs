import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '.tmp-qa');
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

async function dig(origin, label) {
  await page.goto(origin + '/industries/oil-gas/', { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForTimeout(3500);
  await page.evaluate(() => document.querySelector('.kzform')?.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(500);

  const data = await page.evaluate(() => {
    const form = document.querySelector('.kzform');
    if (!form) return { missing: true };
    const kzf1 = form.querySelector('.kzf1');
    const first = form.querySelector('input[name="f-name"]');
    const last = form.querySelector('input[name="l-name"]');
    const email = form.querySelector('input[name="your-email"]');
    const phone = form.querySelector('input[name="your-phone"]');
    const ta = form.querySelector('textarea');
    const submit = form.querySelector('.wpcf7-submit');
    const iti = form.querySelector('.intl-tel-input, .iti');
    const cs = (el) => {
      if (!el) return null;
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        w: Math.round(r.width),
        h: Math.round(r.height),
        top: Math.round(r.top),
        left: Math.round(r.left),
        bg: s.backgroundColor,
        radius: s.borderRadius,
        border: s.border,
        pad: s.padding,
        font: s.fontFamily,
        display: s.display,
        gap: s.gap || s.columnGap,
      };
    };
    const formR = form.getBoundingClientRect();
    const section = form.closest('.elementor-section, .e-con, .elementor-column');
    return {
      form: { ...cs(form), className: form.className, pad: getComputedStyle(form).padding },
      kzf1: cs(kzf1),
      first: cs(first),
      last: cs(last),
      nameGap: first && last ? Math.round(last.getBoundingClientRect().left - first.getBoundingClientRect().right) : null,
      nameAlign: first && last ? Math.round(first.getBoundingClientRect().top) === Math.round(last.getBoundingClientRect().top) : null,
      email: cs(email),
      phone: cs(phone),
      iti: iti && {
        ...cs(iti),
        flagW: iti.querySelector('.selected-flag, .iti__selected-flag')?.getBoundingClientRect().width,
      },
      ta: cs(ta),
      submit: cs(submit),
      formWidth: Math.round(formR.width),
      heading: document.querySelector('h2, .elementor-heading-title')?.textContent?.trim()?.slice(-40),
      rules: (() => {
        const out = [];
        if (!kzf1) return out;
        for (const sheet of document.styleSheets) {
          let rules;
          try {
            rules = sheet.cssRules;
          } catch {
            continue;
          }
          if (!rules) continue;
          for (const r of rules) {
            if (!r.selectorText || !/kzf1|kzform/i.test(r.selectorText)) continue;
            out.push({
              sel: r.selectorText.slice(0, 90),
              display: r.style.display,
              columns: r.style.columns || r.style.columnCount,
              gap: r.style.gap || r.style.columnGap,
              grid: r.style.gridTemplateColumns,
            });
          }
        }
        return out.slice(0, 20);
      })(),
    };
  });

  await page.screenshot({ path: join(OUT, `${label}-oilgas-form.png`), fullPage: false });
  return data;
}

const live = await dig('https://kinzahr.com', 'live');
const local = await dig('http://127.0.0.1:5085', 'local');
writeFileSync(join(OUT, 'oilgas-form-compare.json'), JSON.stringify({ live, local }, null, 2));
console.log(JSON.stringify({ live, local }, null, 2));
await browser.close();
