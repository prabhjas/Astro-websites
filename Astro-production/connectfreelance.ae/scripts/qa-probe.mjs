/**
 * Connect Freelance QA probe — local vs live.
 * Usage: node scripts/qa-probe.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const LOCAL = 'http://127.0.0.1:5094';
const LIVE = 'https://connectfreelance.ae';

async function fetchStatus(base, pathname) {
  try {
    const res = await fetch(`${base}${pathname}`, {
      redirect: 'manual',
      headers: { 'User-Agent': 'CF-QA-Probe/1.0' },
    });
    const loc = res.headers.get('location') || '';
    return { status: res.status, loc };
  } catch (e) {
    return { status: 0, loc: '', err: String(e.message || e) };
  }
}

async function fetchHtml(base, pathname) {
  const res = await fetch(`${base}${pathname}`, {
    headers: { 'User-Agent': 'CF-QA-Probe/1.0' },
    redirect: 'follow',
  });
  return { status: res.status, html: await res.text() };
}

function extractAssets(html) {
  const $ = load(html);
  const css = [];
  const js = [];
  $('link[rel="stylesheet"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href && href.startsWith('/')) css.push(href.split('?')[0]);
  });
  $('script[src]').each((_, el) => {
    const src = $(el).attr('src');
    if (src && src.startsWith('/')) js.push(src.split('?')[0]);
  });
  return { css: [...new Set(css)], js: [...new Set(js)] };
}

function extractInternalLinks(html) {
  const $ = load(html);
  const links = new Set();
  $('a[href]').each((_, el) => {
    let href = ($(el).attr('href') || '').trim();
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:'))
      return;
    try {
      if (href.startsWith('http')) {
        const u = new URL(href);
        if (!u.hostname.includes('connectfreelance')) return;
        href = u.pathname;
      }
      if (!href.startsWith('/')) return;
      if (href.includes('wp-admin') || href.includes('wp-json') || href.includes('/cdn-cgi/')) return;
      // normalize
      if (!href.endsWith('/') && !path.extname(href)) href += '/';
      links.add(href);
    } catch {
      /* ignore */
    }
  });
  return [...links].sort();
}

function formAudit(html) {
  const $ = load(html);
  const forms = [];
  $('form.wpcf7-form, form.main-form, .wpcf7 form').each((_, form) => {
    const $f = $(form);
    const inputs = $f.find('input:not([type=hidden]):not([type=submit]), textarea, select');
    const widths = [];
    inputs.each((__, el) => {
      const style = ($(el).attr('style') || '') + ' ' + ($(el).attr('class') || '');
      widths.push({
        name: $(el).attr('name') || el.tagName,
        tag: el.tagName,
        hasWpcf7: ($(el).attr('class') || '').includes('wpcf7'),
      });
    });
    forms.push({
      fields: widths.length,
      hasName: !!$f.find('[name="your-name"],[name="full-name"]').length,
      hasEmail: !!$f.find('[name="your-email"],[name="email"]').length,
      hasPhone: !!$f.find('.wpcf7-phonetext,[name^="phonetext"]').length,
      hasMessage: !!$f.find('[name="your-message"],[name="message"]').length,
      hasHelp: !!$f.find('select[name^="menu-"],select.wpcf7-select').length,
    });
  });
  return forms;
}

function structureSignals(html) {
  const $ = load(html);
  return {
    title: $('title').first().text().trim(),
    h1: $('h1').first().text().replace(/\s+/g, ' ').trim().slice(0, 80),
    navLinks: $('.elementor-nav-menu a').length,
    forms: formAudit(html).length,
    toc: $('.elementor-widget-table-of-contents').length,
    tocSpinner: $('.elementor-toc__spinner').length,
    loadMore: $('.ecs-load-more-button,[data-cs-blog-load-more]').length,
    blogLoadMoreJs: html.includes('blog-load-more.js'),
    tocFallbackJs: html.includes('elementor-toc-fallback.js'),
    formCss: html.includes('kinza-form-fix.css'),
    mirrorJs: html.includes('astro-mirror-fixes.js'),
    brokenImgCount: $('img[src=""],img:not([src])').length,
    elementorCss: $('link[href*="elementor"]').length,
    googleFontsCss: $('link[href*="google-fonts"]').length,
  };
}

async function checkAsset(pathname) {
  const res = await fetch(`${LOCAL}${pathname}`, { method: 'HEAD', redirect: 'follow' }).catch(() => null);
  if (!res) return 0;
  return res.status;
}

const CORE_PATHS = [
  '/',
  '/about-us/',
  '/contact-us/',
  '/insights/',
  '/payment/',
  '/faqs/',
  '/freelance-license-in-dubai/',
  '/freelance-visa-services/',
  '/freelance-work-permit/',
  '/freelance-affiliate-partnership/',
  '/residence-visa-uae/',
  '/car-insurance/',
  '/travel-insurance/',
  '/maternity-insurance/',
  '/property-insurance/',
  '/personal-accident-insurance-in-dubai-uae/',
  '/term-life-insurance-dubai-uae/',
  '/fire-insurance-plan-in-dubai-uae/',
  '/health-insurance-for-uae-residence-visa/',
  '/uae-residence-visa-for-parents/',
  '/category/freelance-visa/',
  '/category/freelancer/',
  '/category/freezone-visa/',
  '/services/',
  '/become-a-partner/',
  '/health-insurance/',
];

async function main() {
  const report = { statusMismatches: [], asset404: [], pageSignals: {}, link404: [], notes: [] };

  console.log('=== Status probe (local vs live) ===');
  for (const p of CORE_PATHS) {
    const [local, live] = await Promise.all([fetchStatus(LOCAL, p), fetchStatus(LIVE, p)]);
    const okLocal = local.status >= 200 && local.status < 400;
    const okLive = live.status >= 200 && live.status < 400;
    const line = `${p}  local=${local.status}${local.loc ? '→' + local.loc : ''}  live=${live.status}${live.loc ? '→' + live.loc : ''}`;
    if (!okLocal || (okLive && local.status !== live.status && !(local.status === 200 && live.status === 301))) {
      // Allow 200 local when live 301 to same content; flag local 404 when live ok
      if (local.status === 404 && okLive) {
        report.statusMismatches.push(line);
        console.log('MISMATCH', line);
      } else if (!okLocal) {
        report.statusMismatches.push(line);
        console.log('BAD LOCAL', line);
      } else {
        console.log('ok', line);
      }
    } else {
      console.log('ok', line);
    }
  }

  const pagesToAudit = ['/', '/contact-us/', '/insights/', '/about-us/', '/uae-residence-visa-for-parents/', '/category/freelance-visa/', '/freelance-license-in-dubai/', '/payment/'];
  console.log('\n=== Page structure signals ===');
  const allLinks = new Set();
  for (const p of pagesToAudit) {
    const { status, html } = await fetchHtml(LOCAL, p);
    const sig = structureSignals(html);
    report.pageSignals[p] = { status, ...sig };
    console.log(p, JSON.stringify({ status, ...sig }));
    for (const l of extractInternalLinks(html)) allLinks.add(l);

    // Asset 404 sample (CSS/JS on page)
    const assets = extractAssets(html);
    const sample = [...assets.css.slice(0, 40), ...assets.js.slice(0, 25)];
    for (const a of sample) {
      const st = await checkAsset(a);
      if (st === 404 || st === 0) {
        report.asset404.push(`${p} → ${a} (${st})`);
      }
    }
  }

  console.log('\n=== Internal link crawl (from audited pages) ===');
  const linkList = [...allLinks].filter((l) => !l.match(/\.(png|jpg|jpeg|webp|svg|css|js|woff2?|pdf)$/i));
  let link404 = 0;
  for (const l of linkList) {
    const st = await fetchStatus(LOCAL, l);
    const finalOk = st.status === 200 || st.status === 301 || st.status === 302;
    if (!finalOk) {
      // follow one hop if 301
      report.link404.push(`${l} → ${st.status}`);
      link404++;
      console.log('LINK 404', l, st.status);
    }
  }
  console.log(`Checked ${linkList.length} links, ${link404} broken`);

  // Unique asset 404s
  report.asset404 = [...new Set(report.asset404)];
  console.log('\n=== Asset 404 count ===', report.asset404.length);
  report.asset404.slice(0, 40).forEach((a) => console.log(a));

  const out = path.join(ROOT, 'scripts/_qa-report.json');
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log('\nWrote', out);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
