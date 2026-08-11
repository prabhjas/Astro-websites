/**
 * Download all Elementor/theme CSS and extract header, footer, and page bodies
 * from ?nowprocket=1 HTML for pixel-close rendering.
 */
import fs from "node:fs";
import path from "node:path";

const ORIGIN = "https://spheavyrental.ae";
const PUBLIC = "public";
const DATA = "src/data";
const CRAWL = "_crawl";

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

async function download(url, dest) {
  ensureDir(path.dirname(dest));
  if (fs.existsSync(dest) && fs.statSync(dest).size > 100) return true;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) {
    console.warn("skip", res.status, url);
    return false;
  }
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  return true;
}

function localFromUrl(url) {
  const u = new URL(url, ORIGIN);
  return path.join(PUBLIC, u.pathname.replace(/^\//, ""));
}

function stripDomain(html) {
  return html
    .replaceAll("https://spheavyrental.ae", "")
    .replaceAll("http://spheavyrental.ae", "")
    .replaceAll("//spheavyrental.ae", "");
}

/** Extract outer HTML of first element matching attribute/class substring */
function extractElement(html, marker) {
  const idx = html.indexOf(marker);
  if (idx < 0) return "";
  const start = html.lastIndexOf("<", idx);
  let i = start;
  let depth = 0;
  while (i < html.length) {
    if (html[i] === "<") {
      const tagEnd = html.indexOf(">", i);
      if (tagEnd < 0) break;
      const snippet = html.slice(i, tagEnd + 1);
      const selfClosing =
        /\/\s*>$/.test(snippet) ||
        /^<(img|br|hr|input|meta|link|source|area|base|col|embed|wbr)\b/i.test(snippet);
      if (snippet.startsWith("</")) {
        depth--;
        i = tagEnd + 1;
        if (depth === 0) return html.slice(start, i);
        continue;
      } else if (!snippet.startsWith("<!") && !snippet.startsWith("<?")) {
        if (!selfClosing) depth++;
      }
      i = tagEnd + 1;
    } else i++;
  }
  return "";
}

function extractMain(html) {
  // Prefer Elementor page content (not header/footer)
  const m =
    extractElement(html, 'data-elementor-type="wp-page"') ||
    extractElement(html, 'data-elementor-type="wp-post"') ||
    extractElement(html, 'class="site-main') ||
    extractElement(html, 'id="content"');
  return m;
}

async function main() {
  ensureDir(CRAWL);
  ensureDir(DATA);

  const home = await (await fetch(`${ORIGIN}/?nowprocket=1`)).text();
  fs.writeFileSync(path.join(CRAWL, "homepage-nowprocket.html"), home);

  // Collect CSS URLs
  const cssUrls = [
    ...home.matchAll(/href=(["'])(.*?\.css(?:\?[^"']*)?)\1/g),
  ].map((m) => {
    let u = m[2];
    if (u.startsWith("//")) u = "https:" + u;
    else if (u.startsWith("/")) u = ORIGIN + u;
    return u.split("?")[0];
  });

  // Also widget CSS often loaded
  const extra = [
    "/wp-content/plugins/elementor/assets/css/frontend.min.css",
    "/wp-content/plugins/elementor/assets/css/widget-heading.min.css",
    "/wp-content/plugins/elementor/assets/css/widget-divider.min.css",
    "/wp-content/plugins/elementor/assets/css/widget-icon-list.min.css",
    "/wp-content/plugins/elementor/assets/css/widget-image.min.css",
    "/wp-content/plugins/elementor/assets/css/widget-spacer.min.css",
    "/wp-content/plugins/elementor/assets/css/widget-social-icons.min.css",
    "/wp-content/plugins/elementor/assets/css/widget-form.min.css",
    "/wp-content/plugins/elementor/assets/css/widget-nested-accordion.min.css",
    "/wp-content/plugins/elementor-pro/assets/css/widget-nav-menu.min.css",
    "/wp-content/plugins/elementor-pro/assets/css/widget-carousel.min.css",
    "/wp-content/plugins/elementor-pro/assets/css/widget-loop-carousel.min.css",
    "/wp-content/plugins/elementor-pro/assets/css/widget-posts.min.css",
    "/wp-content/plugins/elementor-pro/assets/css/widget-forms.min.css",
    "/wp-content/plugins/elementor-pro/assets/css/widget-call-to-action.min.css",
    "/wp-content/plugins/elementor-pro/assets/css/widget-slides.min.css",
    "/wp-content/plugins/elementor-pro/assets/css/conditionals/popup.min.css",
    "/wp-content/plugins/contact-form-7/includes/css/styles.css",
    "/wp-content/plugins/country-phone-field-contact-form-7/assets/css/intlTelInput.min.css",
    "/wp-content/plugins/country-phone-field-contact-form-7/assets/css/countrySelect.min.css",
    "/wp-content/themes/hello-elementor/assets/css/theme.css",
    "/wp-content/themes/hello-elementor/assets/css/header-footer.css",
    "/wp-content/themes/hello-elementor/style.css",
    "/wp-content/themes/hello-elementor-child-theme/style.css",
    "/wp-content/plugins/ele-custom-skin/assets/css/ecs-style.css",
    "/wp-content/uploads/elementor/google-fonts/css/bebasneue.css",
    "/wp-content/uploads/elementor/css/post-19.css",
    "/wp-content/uploads/elementor/css/post-153.css",
    "/wp-content/uploads/elementor/css/post-158.css",
    "/wp-content/uploads/elementor/css/post-10.css",
    "/wp-content/uploads/elementor/css/post-534.css",
    "/wp-content/uploads/elementor/css/post-540.css",
  ].map((p) => ORIGIN + p);

  const allCss = [...new Set([...cssUrls, ...extra])];
  console.log("Downloading", allCss.length, "CSS files");
  const cssLocal = [];
  for (const u of allCss) {
    const dest = localFromUrl(u);
    const ok = await download(u, dest);
    if (ok) cssLocal.push(new URL(u).pathname);
  }

  // Extract used CSS from rocket homepage as fallback global
  const rocketHome = fs.readFileSync(path.join(CRAWL, "homepage.html"), "utf8");
  const used = rocketHome.match(/<style id="wpr-usedcss">([\s\S]*?)<\/style>/);
  if (used) {
    ensureDir(path.join(PUBLIC, "css"));
    fs.writeFileSync(path.join(PUBLIC, "css", "wpr-used.css"), stripDomain(used[1]));
    cssLocal.unshift("/css/wpr-used.css");
  }

  // Header / footer
  const header = extractElement(home, 'data-elementor-id="153"') || extractElement(home, "elementor-location-header");
  const footer = extractElement(home, 'data-elementor-id="158"') || extractElement(home, "elementor-location-footer");
  fs.writeFileSync(path.join(CRAWL, "header-clean.html"), stripDomain(header));
  fs.writeFileSync(path.join(CRAWL, "footer-clean.html"), stripDomain(footer));
  console.log("header", header.length, "footer", footer.length);

  // Load pages/posts
  const pages = JSON.parse(fs.readFileSync(path.join(DATA, "pages.json"), "utf8"));
  const posts = JSON.parse(fs.readFileSync(path.join(DATA, "posts.json"), "utf8"));

  // Download post-{id}.css for each page
  for (const p of pages) {
    const u = `${ORIGIN}/wp-content/uploads/elementor/css/post-${p.id}.css`;
    const dest = localFromUrl(u);
    if (await download(u, dest)) {
      if (!cssLocal.includes(`/wp-content/uploads/elementor/css/post-${p.id}.css`)) {
        // page-specific, tracked per page
      }
    }
  }

  // Fetch body HTML for each page from live site
  const bodies = {};
  for (const p of [...pages, ...posts]) {
    const url = ORIGIN + p.path + (p.path.includes("?") ? "&" : "?") + "nowprocket=1";
    // fix query
    const fetchUrl = `${ORIGIN}${p.path}?nowprocket=1`;
    try {
      console.log("body", p.path);
      const html = await (await fetch(fetchUrl)).text();
      let body = extractMain(html);
      if (!body) body = p.content; // fallback to REST content
      bodies[p.path] = stripDomain(body);

      // page CSS links
      const pageCss = [...html.matchAll(/href=(["'])(.*?\.css(?:\?[^"']*)?)\1/g)].map((m) => m[2]);
      for (let u of pageCss) {
        if (u.startsWith("//")) u = "https:" + u;
        else if (u.startsWith("/")) u = ORIGIN + u;
        else if (!u.startsWith("http")) continue;
        if (!u.includes("spheavyrental.ae")) continue;
        const clean = u.split("?")[0];
        await download(clean, localFromUrl(clean));
      }

      // Also download images referenced in body that we might have missed
      for (const m of body.matchAll(/(?:src|href)=["'](\/wp-content\/uploads\/[^"']+)["']/g)) {
        const rel = m[1].split("?")[0];
        const dest = path.join(PUBLIC, rel.replace(/^\//, ""));
        if (!fs.existsSync(dest)) await download(ORIGIN + rel, dest);
      }
    } catch (e) {
      console.warn("body fail", p.path, e.message);
      bodies[p.path] = p.content;
    }
  }

  fs.writeFileSync(path.join(DATA, "bodies.json"), JSON.stringify(bodies));
  fs.writeFileSync(
    path.join(DATA, "global-css.json"),
    JSON.stringify(
      {
        global: [
          "/css/wpr-used.css",
          "/wp-content/themes/hello-elementor/assets/css/theme.css",
          "/wp-content/themes/hello-elementor/assets/css/header-footer.css",
          "/wp-content/plugins/elementor/assets/css/frontend.min.css",
          "/wp-content/uploads/elementor/css/post-19.css",
          "/wp-content/uploads/elementor/css/post-153.css",
          "/wp-content/uploads/elementor/css/post-158.css",
          "/wp-content/themes/hello-elementor/style.css",
          "/wp-content/themes/hello-elementor-child-theme/style.css",
          "/wp-content/plugins/ele-custom-skin/assets/css/ecs-style.css",
          "/wp-content/uploads/elementor/google-fonts/css/bebasneue.css",
          "/wp-content/plugins/elementor/assets/css/widget-image.min.css",
          "/wp-content/plugins/elementor/assets/css/widget-heading.min.css",
          "/wp-content/plugins/elementor/assets/css/widget-divider.min.css",
          "/wp-content/plugins/elementor/assets/css/widget-icon-list.min.css",
          "/wp-content/plugins/elementor-pro/assets/css/widget-nav-menu.min.css",
          "/wp-content/plugins/contact-form-7/includes/css/styles.css",
          "/wp-content/plugins/country-phone-field-contact-form-7/assets/css/intlTelInput.min.css",
          "/wp-content/plugins/country-phone-field-contact-form-7/assets/css/countrySelect.min.css",
        ].filter((p) => fs.existsSync(path.join(PUBLIC, p.replace(/^\//, "")))),
        headerHtml: stripDomain(header),
        footerHtml: stripDomain(footer),
      },
      null,
      2,
    ),
  );

  // Update pages/posts with bodyHtml
  for (const p of pages) {
    if (bodies[p.path]) p.bodyHtml = bodies[p.path];
    p.elementorCss = `/wp-content/uploads/elementor/css/post-${p.id}.css`;
  }
  for (const p of posts) {
    if (bodies[p.path]) p.bodyHtml = bodies[p.path];
  }
  fs.writeFileSync(path.join(DATA, "pages.json"), JSON.stringify(pages, null, 2));
  fs.writeFileSync(path.join(DATA, "posts.json"), JSON.stringify(posts, null, 2));

  console.log("Done. CSS local:", cssLocal.length, "bodies:", Object.keys(bodies).length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
