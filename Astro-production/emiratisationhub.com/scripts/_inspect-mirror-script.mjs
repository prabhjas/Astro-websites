const urls = ['http://127.0.0.1:4332/', 'http://127.0.0.1:4332/blog/', 'http://127.0.0.1:4332/contact-us/'];
for (const url of urls) {
  const html = await (await fetch(url)).text();
  console.log('\n', url);
  console.log('mirror-fixes', /astro-mirror-fixes\.js/.test(html));
  console.log('fa solid link', /font-awesome\/css\/solid/.test(html));
}
