import { readFileSync } from 'node:fs';
import * as cheerio from 'cheerio';

const html = readFileSync('scripts/author-lana-live.html', 'utf8');
const $ = cheerio.load(html, { decodeEntities: false });
const profile = $('[data-elementor-type="archive"] > section').first();
console.log(profile.toString().slice(0, 4500));
const img = profile.find('img').first();
console.log('\nIMG', img.attr('src') || img.attr('data-lazy-src') || img.attr('data-src'));
