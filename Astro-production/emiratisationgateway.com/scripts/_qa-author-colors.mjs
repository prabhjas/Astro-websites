async function go() {
  for (const path of ['/author/binju-t-r/', '/author/', '/minimum-wage-in-uae/', '/category/emiratisation/']) {
    const L = await (await fetch('http://127.0.0.1:5106' + path)).text();
    const R = await (await fetch('https://emiratisationgateway.com' + path)).text();
    const titles = (h) => [...h.matchAll(/elementor-heading-title[^>]*>([^<]{0,100})/g)].slice(0, 8).map((m) => m[1]);
    const imgs = (h) => {
      const i = h.indexOf('auth-box');
      if (i < 0) return [];
      return [...h.slice(i, i + 3000).matchAll(/src="([^"]+)"/g)].map((m) => m[1]).slice(0, 4);
    };
    const color0 = (h) => (h.match(/--ast-global-color-0:\s*([^;]+)/) || [])[1];
    const color1 = (h) => (h.match(/--ast-global-color-1:\s*([^;]+)/) || [])[1];
    const pagHtml = (h) => {
      const m = h.match(/<div class="ast-pagination"[\s\S]*?<\/div>\s*<\/div>/);
      return m ? m[0].replace(/\s+/g, ' ').slice(0, 500) : 'none';
    };
    console.log('\nPATH', path);
    console.log('color0 L/R', color0(L), color0(R));
    console.log('color1 L/R', color1(L), color1(R));
    if (path.includes('author')) {
      console.log('L titles', titles(L));
      console.log('R titles', titles(R));
      console.log('L imgs', imgs(L));
      console.log('R imgs', imgs(R));
      // compare presence of key author widgets
      for (const key of ['elementor-widget-image', 'elementor-widget-heading', 'elementor-widget-text-editor', 'ecs-posts', 'ast-pagination', 'Load More']) {
        console.log(key, 'L', L.includes(key), 'R', R.includes(key));
      }
    }
    if (path.includes('category')) {
      console.log('L pag', pagHtml(L));
      console.log('R pag', pagHtml(R));
    }
    if (path.includes('minimum')) {
      // related grid card loop id + count
      const rel = L.match(/ecs-posts[\s\S]*?ecs-load-more-button/);
      console.log('related articles', (rel?.[0].match(/<article/g) || []).length);
      console.log('loop ids', [...(rel?.[0].matchAll(/data-elementor-id="(\d+)"/g) || [])].map((m) => m[1]).slice(0, 5));
      console.log('max_num_pages', (L.match(/max_num_pages&quot;:&quot;?(\d+)/) || [])[1]);
    }
  }
}
go();
