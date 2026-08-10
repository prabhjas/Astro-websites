/**
 * Diff author + post UI bits vs live for layout/color issues.
 */
async function fetchText(url) {
  const r = await fetch(url);
  return { status: r.status, html: await r.text() };
}

function extract(html, re, n = 1) {
  const m = html.match(re);
  return m ? m[0].slice(0, n * 200) : '';
}

function count(html, re) {
  return (html.match(re) || []).length;
}

const pairs = [
  ['http://127.0.0.1:5106/author/binju-t-r/', 'https://emiratisationgateway.com/author/binju-t-r/'],
  ['http://127.0.0.1:5106/author/', 'https://emiratisationgateway.com/author/'],
  ['http://127.0.0.1:5106/minimum-wage-in-uae/', 'https://emiratisationgateway.com/minimum-wage-in-uae/'],
  ['http://127.0.0.1:5106/category/emiratisation/', 'https://emiratisationgateway.com/category/emiratisation/'],
];

for (const [localUrl, liveUrl] of pairs) {
  const [L, R] = await Promise.all([fetchText(localUrl), fetchText(liveUrl)]);
  const metrics = (html) => ({
    status: html.status,
    len: html.html.length,
    authBoxSections: count(html.html, /auth-box/g),
    authorBio: count(html.html, /elementor-author-box|ast-author-box|author-biography|auth-desc/g),
    postCards: count(html.html, /ecs-post-loop|ast-article-post/g),
    loadMore: /ecs-load-more-button/.test(html.html),
    selectOptions: count(html.html, /<option/gi),
    pageNumbers: count(html.html, /page-numbers/g),
    formFields: {
      name: /name=["'](?:your-name|full-name|name)["']/.test(html.html),
      email: /name=["'](?:your-email|email)["']/.test(html.html),
      phone: /wpcf7-phonetext|name=["']phonetext/.test(html.html),
      message: /name=["'](?:your-message|message)["']/.test(html.html),
    },
    // color cues in inline styles for select/pagination
    blueSelect: /#0073aa|#2271b1|option:checked|background:\s*#0{0,2}0[0-9a-f]{4}/i.test(html.html),
    accentCss: extract(html.html, /\.ast-pagination[\s\S]{0,400}|\.page-numbers\.current[\s\S]{0,200}/),
  });
  console.log('\n===', localUrl.replace(/https?:\/\/[^/]+/, ''), '===');
  console.log(JSON.stringify({ local: metrics(L), live: metrics(R) }, null, 2));

  // Structure of author header
  if (localUrl.includes('/author/binju')) {
    const getAuthorHeader = (html) => {
      const i = html.indexOf('auth-box');
      if (i < 0) return 'NO AUTH-BOX';
      return html.slice(Math.max(0, i - 200), i + 2500)
        .replace(/\s+/g, ' ')
        .slice(0, 1500);
    };
    console.log('LOCAL auth header:', getAuthorHeader(L.html));
    console.log('LIVE auth header:', getAuthorHeader(R.html));
  }

  if (localUrl.includes('category')) {
    const getSelect = (html) => {
      const m = html.match(/<select[\s\S]*?<\/select>/i);
      return m ? m[0].slice(0, 800) : 'NO SELECT';
    };
    console.log('LOCAL select:', getSelect(L.html));
    console.log('LIVE select:', getSelect(R.html));
    // look for option:checked / select styling in custom CSS
    const getCatCss = (html) => {
      const bits = [];
      for (const re of [
        /select[\s\S]{0,80}option[\s\S]{0,120}/gi,
        /#cat[\s\S]{0,200}/gi,
        /wp-block-categories[\s\S]{0,200}/gi,
        /\.ast-pagination[\s\S]{0,300}/gi,
      ]) {
        const m = html.match(re);
        if (m) bits.push(...m.slice(0, 3));
      }
      return bits.slice(0, 10);
    };
    console.log('LOCAL css cues', getCatCss(L.html));
    console.log('LIVE css cues', getCatCss(R.html));
  }
}
