const local = await (await fetch('http://127.0.0.1:5107/blog/')).text();
const live = await (await fetch('https://emiratisationhub.com/blog/')).text();

function order(html, label) {
  const markers = [
    ['ecs-posts', html.indexOf('ecs-posts')],
    ['ecs-posts#2', html.indexOf('ecs-posts', html.indexOf('ecs-posts') + 1)],
    ['Latest Blogs heading', html.search(/Latest Blogs/i)],
    ['filter-post', html.indexOf('filter-post')],
    ['elementor-pagination', html.indexOf('elementor-pagination')],
    ['elementor-1975', html.indexOf('elementor-1975')],
    ['elementor-1985', html.indexOf('elementor-1985')],
    ['article', html.search(/<article\b/)],
  ];
  console.log(label, markers.map(([k, i]) => `${k}:${i}`).join(' | '));
}

function ecsArticleCounts(html, label) {
  const re = /<div[^>]*class="[^"]*ecs-posts[^"]*"[^>]*>/gi;
  const idxs = [];
  let m;
  while ((m = re.exec(html))) idxs.push(m.index);
  console.log(label, 'ecs starts', idxs.length, idxs.slice(0, 5));
  for (let i = 0; i < Math.min(idxs.length, 4); i++) {
    const start = idxs[i];
    const end = idxs[i + 1] || html.length;
    const chunk = html.slice(start, Math.min(start + 80000, end));
    const arts = (chunk.match(/<article\b/g) || []).length;
    const c1975 = (chunk.match(/elementor-1975/g) || []).length;
    const c1985 = (chunk.match(/elementor-1985/g) || []).length;
    console.log(label, 'ecs', i, { arts, c1975, c1985, chunkLen: end - start });
  }
}

order(local, 'LOCAL');
order(live, 'LIVE');
console.log('---LOCAL ecs---');
ecsArticleCounts(local, 'LOCAL');
console.log('---LIVE ecs---');
ecsArticleCounts(live, 'LIVE');

// Sample featured card structure
function sampleCard(html, loopId) {
  const i = html.indexOf(`elementor-${loopId}`);
  if (i < 0) return null;
  return html.slice(Math.max(0, i - 80), i + 600).replace(/\s+/g, ' ');
}
console.log('\nLOCAL 1975 sample:', sampleCard(local, 1975));
console.log('\nLIVE 1975 sample:', sampleCard(live, 1975));
console.log('\nLOCAL 1985 sample:', sampleCard(local, 1985));
console.log('\nLIVE 1985 sample:', sampleCard(live, 1985));
