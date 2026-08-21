/**
 * Live WordPress renders /review-form/?post-id=&Model=... with:
 *  - CF7 default:get values baked into inputs
 *  - Shortcode car panel filled from the car CPT
 * Mirror that at request time from query params + src/data/cars/{id}.json
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * @param {string} s
 */
function escapeAttr(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

/**
 * @param {string} s
 */
function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * @param {string} html
 * @param {string} name
 * @param {string} value
 */
function setNamedInputValue(html, name, value) {
  const esc = escapeAttr(value);
  const withValue = new RegExp(
    `(<input\\b(?=[^>]*\\bname="${name}")[^>]*?)\\bvalue=(["'])[\\s\\S]*?\\2`,
    'i',
  );
  if (withValue.test(html)) {
    return html.replace(withValue, `$1value="${esc}"`);
  }
  const bare = new RegExp(`(<input\\b(?=[^>]*\\bname="${name}")[^>]*?)(/?>)`, 'i');
  if (bare.test(html)) {
    return html.replace(bare, `$1 value="${esc}"$2`);
  }
  return html;
}

/**
 * @param {string} postId
 */
function loadCar(postId) {
  const id = String(postId || '').replace(/[^\d]/g, '');
  if (!id) return null;
  const file = join(process.cwd(), 'src/data/cars', `${id}.json`);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * @param {string} url
 */
function toLocalAsset(url) {
  if (!url) return '';
  const s = String(url);
  try {
    if (s.startsWith('/')) return s;
    const u = new URL(s);
    if (/izi\.ae$/i.test(u.hostname) || /car\.bloggerplex\.top$/i.test(u.hostname)) {
      return u.pathname;
    }
  } catch {
    /* keep as-is */
  }
  return s;
}

/**
 * @param {Record<string, any>} payload
 */
function buildReviewCarPanelHtml(payload) {
  const data = payload?.data || payload || {};
  const acf = data.acf || {};
  const title = data.title || 'Review Form';
  const make = acf.overlay_make || '';
  const seats = acf.overlay_passenger || '';
  const bags = acf.overlay_bags || '';
  const doors = acf.door || '';
  const gear = acf.overlay_gearshift || '';
  const logos = Array.isArray(data.categories) ? data.categories : [];
  const logo = toLocalAsset(logos[0] || '');
  const gallery = Array.isArray(acf.slider_gallery) ? acf.slider_gallery : [];

  const slides = gallery
    .map((g) => {
      const src = toLocalAsset(g?.url || '');
      if (!src) return '';
      return `
			<div class="big-image-1">
				<img decoding="async" src="${escapeAttr(src)}" alt="${escapeAttr(g?.alt || title)}">
			</div>`;
    })
    .join('');

  const thumbs = gallery
    .map((g) => {
      const src = toLocalAsset(g?.url || '');
      if (!src) return '';
      return `
				<div class="thumb-image-1">
					<img decoding="async" src="${escapeAttr(src)}" alt="${escapeAttr(g?.alt || title)}">
				</div>`;
    })
    .join('');

  const logoBlock = logo
    ? `
									<div class="mini-img-cat">
															<img decoding="async" src="${escapeAttr(logo)}" alt="${escapeAttr(make)}">
													</div>`
    : '';

  return `<div class="blue-1 blue-2">
	
	<div class="car-grid mini-cgrid">
		  <div>
				<h3>${escapeHtml(title)}</h3>
          </div>
		${logoBlock}
						</div>
	<div class="car-grid grid-ul">
				<ul>
					<li><img decoding="async" src="/wp-content/uploads/2024/03/solar_user-bold.svg">${escapeHtml(seats)} Seats</li>
					<li><img decoding="async" src="/wp-content/uploads/2024/03/ri_suitcase-3-fill.svg">${escapeHtml(bags)}  Suitcases</li>
					<li><img decoding="async" src="/wp-content/uploads/2024/03/mdi_car-door.svg">${escapeHtml(doors)}  Doors</li>
					<li><img decoding="async" src="/wp-content/uploads/2024/03/Capa_1.svg">${escapeHtml(gear)} </li>
				</ul>		            
	</div>
	
	<!-- slider one -->
	<div class="slider slider-for">
		${slides}
	</div>
	

<!-- slider two -->

	<div class="slider slider-nav">
		${thumbs}
	</div>

</div>`;
}

/**
 * Replace the first `.blue-1.blue-2` block with a balanced div match.
 * @param {string} html
 * @param {string} panelHtml
 */
function replaceBlue1Panel(html, panelHtml) {
  const marker = '<div class="blue-1 blue-2">';
  const start = html.indexOf(marker);
  if (start < 0) return html;

  let i = start;
  let depth = 0;
  let end = -1;
  while (i < html.length && i < start + 50000) {
    if (html.startsWith('<div', i)) {
      depth += 1;
      i += 4;
      continue;
    }
    if (html.startsWith('</div>', i)) {
      depth -= 1;
      if (depth === 0) {
        end = i + 6;
        break;
      }
      i += 6;
      continue;
    }
    i += 1;
  }
  if (end <= start) return html;
  return html.slice(0, start) + panelHtml + html.slice(end);
}

/**
 * @param {string} html
 * @param {URLSearchParams | Record<string, string>} paramsIn
 */
export function hydrateReviewFormFromQuery(html, paramsIn) {
  const params =
    paramsIn instanceof URLSearchParams
      ? paramsIn
      : new URLSearchParams(paramsIn || {});

  if (![...params.keys()].length) return html;

  /** @type {[string, string][]} */
  const pairs = [
    ['Model', 'Model'],
    ['filterlocation', 'filterlocation'],
    ['rentlenght', 'rentlenght'],
    ['from_date', 'from_date'],
    ['from_time', 'from_time'],
    ['to_date', 'to_date'],
    ['to_time', 'to_time'],
    ['finalprice', 'Price'],
    ['post-id', 'postid'],
    ['filterlocation', 'location'],
  ];

  let out = html;
  for (const [q, name] of pairs) {
    if (!params.has(q)) continue;
    out = setNamedInputValue(out, name, params.get(q) || '');
  }

  const price = params.get('finalprice');
  if (price) {
    out = out.replace(
      /(<[^>]*\bid=["']car-price["'][^>]*>)([\s\S]*?)(<\/)/i,
      `$1AED ${escapeHtml(price)}$3`,
    );
  }

  const postId = params.get('post-id') || params.get('postid') || '';
  const car = loadCar(postId);
  if (car) {
    out = replaceBlue1Panel(out, buildReviewCarPanelHtml(car));
  }

  return out;
}
