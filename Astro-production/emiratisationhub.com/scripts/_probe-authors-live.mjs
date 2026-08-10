const ORIGIN = 'https://emiratisationhub.com';

const dirHtml = await (await fetch(`${ORIGIN}/author/`)).text();
const slugs = [...new Set([...dirHtml.matchAll(/\/author\/([^/"'#?\s]+)\/?/g)].map((m) => m[1]))]
  .filter((s) => !['page', 'feed'].includes(s));
console.log('directory slugs', slugs);

for (const slug of slugs) {
  const html = await (await fetch(`${ORIGIN}/author/${slug}/`)).text();
  const title = (html.match(/<title>([^<]+)<\/title>/i)?.[1] || '').trim();
  const h1 = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const avatar =
    html.match(/class="[^"]*avatar[^"]*"[^>]+src="([^"]+)"/i)?.[1] ||
    html.match(/src="([^"]*\/uploads\/[^"]+)"[^>]*class="[^"]*avatar/i)?.[1] ||
    html.match(/og:image"\s+content="([^"]+)"/i)?.[1] ||
    '';
  const desc =
    html.match(/name="description"\s+content="([^"]*)"/i)?.[1] ||
    html.match(/property="og:description"\s+content="([^"]*)"/i)?.[1] ||
    '';
  console.log(JSON.stringify({ slug, title, h1, avatar, desc: desc.slice(0, 160) }, null, 0));
}

console.log('archive markers', {
  locationArchive: (dirHtml.match(/elementor-location-archive/g) || []).length,
  typeArchive: (dirHtml.match(/data-elementor-type="archive"/g) || []).length,
});
