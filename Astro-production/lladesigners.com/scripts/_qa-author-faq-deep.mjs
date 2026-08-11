import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const browser = await chromium.launch({ headless: true });

async function digAuthor(base) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(base + '/author/jermaine-odtujan/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(2500);
  const info = await page.evaluate(() => {
    const social = [...document.querySelectorAll('a[href*="linkedin"], .fab.fa-linkedin, .elementor-social-icon-linkedin')].map((a) => ({
      tag: a.tagName,
      href: a.closest('a')?.getAttribute('href') || a.getAttribute('href'),
      cls: a.className.toString().slice(0, 100),
      w: Math.round(a.getBoundingClientRect().width),
      h: Math.round(a.getBoundingClientRect().height),
      visible: a.getBoundingClientRect().height > 0,
    }));
    const widgets = [...document.querySelectorAll('.elementor-widget')].slice(0, 25).map((w) => ({
      id: w.getAttribute('data-id'),
      type: w.getAttribute('data-widget_type'),
      text: (w.innerText || '').trim().slice(0, 240),
      h: Math.round(w.getBoundingClientRect().height),
      display: getComputedStyle(w).display,
    }));
    const profileText = (document.body.innerText || '').split('Article By')[0]?.trim().slice(0, 800);
    return { social, widgets, profileText };
  });
  await page.close();
  return info;
}

async function digFaq(base) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(base + '/bespoke-furniture-design-services/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    const el = document.querySelector('.elementor-widget-accordion');
    if (el) el.scrollIntoView({ block: 'center' });
  });
  await page.waitForTimeout(500);
  // ensure first open on both
  await page.evaluate(() => {
    const title = document.querySelector('.elementor-widget-accordion .elementor-tab-title');
    if (title && !title.classList.contains('elementor-active')) title.click();
  });
  await page.waitForTimeout(700);
  const info = await page.evaluate(() => {
    const root = document.querySelector('.elementor-widget-accordion .elementor-accordion');
    const titles = [...root.querySelectorAll('.elementor-tab-title')].map((t) => {
      const titleEl = t.querySelector('.elementor-accordion-title') || t;
      const tcs = getComputedStyle(titleEl);
      const cs = getComputedStyle(t);
      const iconClosed = t.querySelector('.elementor-accordion-icon-closed i, .elementor-accordion-icon-closed');
      const iconOpened = t.querySelector('.elementor-accordion-icon-opened i, .elementor-accordion-icon-opened');
      return {
        active: t.classList.contains('elementor-active'),
        text: (titleEl.textContent || '').trim().slice(0, 60),
        color: tcs.color,
        fontWeight: tcs.fontWeight,
        fontSize: tcs.fontSize,
        outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`,
        textDecoration: tcs.textDecoration,
        borderBottom: cs.borderBottom,
        padding: cs.padding,
        iconClosedColor: iconClosed ? getComputedStyle(iconClosed).color : null,
        iconOpenedColor: iconOpened ? getComputedStyle(iconOpened).color : null,
        iconClosedDisplay: iconClosed ? getComputedStyle(iconClosed).display : null,
        iconOpenedDisplay: iconOpened ? getComputedStyle(iconOpened).display : null,
      };
    });
    const accordion = root;
    const acs = getComputedStyle(accordion);
    const item = root.querySelector('.elementor-accordion-item');
    const ics = item ? getComputedStyle(item) : null;
    // gather relevant elementor CSS vars / rules from post CSS if present
    const sheetHints = [];
    for (const el of document.querySelectorAll('style, link[rel=stylesheet]')) {
      const href = el.getAttribute('href') || '';
      if (/post-|accordion|global/i.test(href) || el.tagName === 'STYLE') sheetHints.push(href || 'inline');
    }
    return {
      titles,
      accordionBorder: acs.border,
      accordionPadding: acs.padding,
      itemBorder: ics?.borderBottom,
      sheetHints: sheetHints.slice(0, 30),
    };
  });
  await page.screenshot({ path: `scripts/_parity-shots/${base.includes('127') ? 'local' : 'live'}-faq-open.png` });
  await page.close();
  return info;
}

const out = {
  liveAuthor: await digAuthor('https://lladesigners.com'),
  localAuthor: await digAuthor('http://127.0.0.1:5112'),
  liveFaq: await digFaq('https://lladesigners.com'),
  localFaq: await digFaq('http://127.0.0.1:5112'),
};
writeFileSync('scripts/_qa-author-faq-deep.json', JSON.stringify(out, null, 2));
console.log(JSON.stringify({
  liveProfile: out.liveAuthor.profileText,
  localProfile: out.localAuthor.profileText,
  liveSocial: out.liveAuthor.social,
  localSocial: out.localAuthor.social,
  liveWidgets: out.liveAuthor.widgets.filter((w) => w.h > 0 && w.text),
  localWidgets: out.localAuthor.widgets.filter((w) => w.h > 0 && w.text),
  liveFaq: out.liveFaq.titles,
  localFaq: out.localFaq.titles,
  liveBorder: { a: out.liveFaq.accordionBorder, i: out.liveFaq.itemBorder },
  localBorder: { a: out.localFaq.accordionBorder, i: out.localFaq.itemBorder },
}, null, 2));
await browser.close();
