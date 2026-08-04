import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, '.tmp-qa');
mkdirSync(OUT, { recursive: true });

const paths = ['/industries/audit-accounting/', '/contact-us/', '/about-us/'];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

async function dig(origin, path, label) {
  await page.goto(origin + path, { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForTimeout(2500);
  const data = await page.evaluate(() => {
    const footer = document.querySelector('footer.elementor-location-footer, .elementor-location-footer');
    const form = document.querySelector('.kzform') || document.querySelector('.n-footer') || document.querySelector('form.wpcf7-form');
    const kzf1 = document.querySelector('.kzform .kzf1, .kzf1');
    const nameFields = [...document.querySelectorAll('.kzform p, .wpcf7-form > p')]
      .filter((p) => /first|last|f-name|l-name|your-name/i.test(p.textContent + (p.innerHTML || '')))
      .slice(0, 4)
      .map((p) => {
        const r = p.getBoundingClientRect();
        const inp = p.querySelector('input');
        const ir = inp?.getBoundingClientRect();
        return {
          text: p.textContent.trim().slice(0, 30),
          top: Math.round(r.top),
          left: Math.round(r.left),
          w: Math.round(r.width),
          h: Math.round(r.height),
          inputLeft: ir ? Math.round(ir.left) : null,
          inputTop: ir ? Math.round(ir.top) : null,
          inputW: ir ? Math.round(ir.width) : null,
        };
      });
    const footerInfo = footer && {
      id: footer.getAttribute('data-elementor-id'),
      classes: footer.className.slice(0, 140),
      height: Math.round(footer.getBoundingClientRect().height),
      width: Math.round(footer.getBoundingClientRect().width),
      headings: [...footer.querySelectorAll('.elementor-heading-title, h2, h3')]
        .map((el) => el.textContent.trim())
        .filter(Boolean)
        .slice(0, 10),
      social: footer.querySelectorAll('.elementor-social-icon, a[href*="instagram"], a[href*="linkedin"], a[href*="facebook"]').length,
      sections: footer.querySelectorAll('.elementor-section, .e-con').length,
      containers: footer.querySelectorAll('.e-con, .elementor-container').length,
    };
    const bigLogo = [...document.querySelectorAll('footer img, .elementor-location-footer img')].map((img) => ({
      src: (img.currentSrc || img.src || '').split('/').pop(),
      w: Math.round(img.getBoundingClientRect().width),
      h: Math.round(img.getBoundingClientRect().height),
      opacity: getComputedStyle(img).opacity,
      abs: getComputedStyle(img).position,
    }));
    const kzf1CS = kzf1
      ? {
          display: getComputedStyle(kzf1).display,
          columns: getComputedStyle(kzf1).columns,
          columnCount: getComputedStyle(kzf1).columnCount,
          columnGap: getComputedStyle(kzf1).columnGap,
          width: Math.round(kzf1.getBoundingClientRect().width),
          childCount: kzf1.children.length,
          childTags: [...kzf1.children].map((c) => c.tagName + '.' + c.className.slice(0, 40)),
        }
      : null;
    const formCS = form
      ? {
          className: form.className.slice(0, 80),
          width: Math.round(form.getBoundingClientRect().width),
          padding: getComputedStyle(form).padding,
          bg: getComputedStyle(form).backgroundColor,
        }
      : null;
    // CSS rules for kzf1
    const kzf1Rules = [];
    if (kzf1) {
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
          try {
            if (kzf1.matches(r.selectorText) || r.selectorText.includes('kzf1')) {
              kzf1Rules.push({
                sel: r.selectorText.slice(0, 80),
                display: r.style.display,
                columns: r.style.columns || r.style.columnCount,
                width: r.style.width,
              });
            }
          } catch {
            /* ignore */
          }
        }
      }
    }
    return {
      footerInfo,
      bigLogo,
      formCS,
      kzf1CS,
      nameFields,
      kzf1Rules: kzf1Rules.slice(0, 15),
      bodyFooterIds: [...document.querySelectorAll('[data-elementor-id]')]
        .filter((el) => /footer/i.test(el.className) || el.tagName === 'FOOTER')
        .map((el) => el.getAttribute('data-elementor-id') + ':' + el.className.slice(0, 60)),
    };
  });

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(OUT, `${label}-footer.png`), fullPage: false });
  const formHandle = await page.$('.kzform, .elementor-widget-html .kzform, form.wpcf7-form');
  if (formHandle) {
    await formHandle.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(OUT, `${label}-form.png`), fullPage: false });
  }
  return data;
}

const report = {};
for (const path of paths) {
  const slug = path.replace(/\//g, '_') || 'home';
  report[`live${slug}`] = await dig('https://kinzahr.com', path, `live${slug}`);
  report[`local${slug}`] = await dig('http://127.0.0.1:5085', path, `local${slug}`);
}
writeFileSync(join(OUT, 'inner-footer-form.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
