const h = await (await fetch('http://127.0.0.1:5107/')).text();
const i = h.indexOf('seidor');
console.log(h.slice(Math.max(0, i - 120), i + 160).replace(/\s+/g, ' '));
console.log('valid?', /src="\/wp-content\/uploads\/2024\/02\/seidor\.png"/.test(h));
console.log('bosch?', /src="\/wp-content\/uploads\/2024\/02\/bosch\.png"/.test(h));

// Inject check: accordion titles without icons
const titles = [...h.matchAll(/class="elementor-tab-title"[^>]*>[\s\S]*?<\/div>/g)].length;
console.log('tab titles', titles);
