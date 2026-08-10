for (const url of [
  'https://emiratisationhub.com/blog/page/2/',
  'https://emiratisationhub.com/blog/page/2',
  'http://127.0.0.1:5107/blog/page/2/',
]) {
  try {
    const res = await fetch(url, { redirect: 'manual' });
    const html = await res.text();
    const title = (html.match(/<title>([^<]+)/i) || [])[1];
    const arts = (html.match(/<article\b/g) || []).length;
    const pag = /elementor-pagination/.test(html);
    console.log(url, res.status, { title: title?.slice(0, 60), arts, pag, len: html.length });
  } catch (e) {
    console.log(url, 'ERR', e.message);
  }
}
