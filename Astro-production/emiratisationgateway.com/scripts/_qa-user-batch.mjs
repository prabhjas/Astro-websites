import { writeFileSync } from 'node:fs';

async function analyze(url, label) {
  const html = await (await fetch(url)).text();
  const out = {
    label,
    len: html.length,
    hasLoadMore: /ecs-load-more-button|Load More/i.test(html),
    hasDataCs: /data-cs-blog-load-more/.test(html),
    hasBlogJs: /blog-load-more\.js/.test(html),
    hasMirrorJs: /astro-mirror-fixes\.js/.test(html),
    loadMoreSnippet: (html.match(/ecs-load-more-button[\s\S]{0,500}/) || ['none'])[0].slice(0, 400),
    gridSettings: (html.match(/data-settings="\{[^"]*load_method[^"]*\}"/) || ['none'])[0].slice(0, 300),
    selectSnippet: (html.match(/<select[\s\S]{0,400}/i) || ['none'])[0].slice(0, 350),
    paginationSnippet: (html.match(/page-numbers[\s\S]{0,250}|ast-pagination[\s\S]{0,250}/) || ['none'])[0].slice(0, 250),
    authorBox: /auth-box|w-post-elm post_author|author-box|ast-author-box/.test(html),
  };
  console.log(JSON.stringify(out, null, 2));
  return html;
}

const local = await analyze('http://127.0.0.1:5106/minimum-wage-in-uae/', 'LOCAL');
const live = await analyze('https://emiratisationgateway.com/minimum-wage-in-uae/', 'LIVE');

// author pages
for (const path of ['/author/binju-t-r/', '/author/']) {
  try {
    const l = await (await fetch('http://127.0.0.1:5106' + path)).text();
    const r = await (await fetch('https://emiratisationgateway.com' + path)).text();
    console.log(JSON.stringify({
      path,
      localLen: l.length,
      liveLen: r.length,
      localAuthBox: (l.match(/class="[^"]*auth[^"]*"/gi) || []).slice(0, 8),
      liveAuthBox: (r.match(/class="[^"]*auth[^"]*"/gi) || []).slice(0, 8),
      localH1: (l.match(/<h1[^>]*>[\s\S]*?<\/h1>/i) || [''])[0].replace(/<[^>]+>/g,'').trim().slice(0,80),
      liveH1: (r.match(/<h1[^>]*>[\s\S]*?<\/h1>/i) || [''])[0].replace(/<[^>]+>/g,'').trim().slice(0,80),
      localPostCount: (l.match(/ecs-post-loop|ast-article-post|elementor-post /gi) || []).length,
      livePostCount: (r.match(/ecs-post-loop|ast-article-post|elementor-post /gi) || []).length,
    }, null, 2));
  } catch (e) {
    console.log(path, e.message);
  }
}

writeFileSync('d:/Astro-websites/Astro-production/emiratisationgateway.com/scripts/_tmp-local-post.html', local.slice(0, 50000));
