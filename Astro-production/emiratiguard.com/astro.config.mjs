// @ts-check
import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import tailwindcss from "@tailwindcss/vite";

const siteUrl = (
  process.env.PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  "https://emiratiguard.com"
)
  .trim()
  .replace(/\/$/, "");
let siteHost = "emiratiguard.com";
try {
  siteHost = new URL(siteUrl).hostname;
} catch {
  /* keep default */
}

// Rank Math–style robots/sitemaps live under src/pages/
// (sitemap_index.xml.ts, page-sitemap.xml.ts, post-sitemap.xml.ts).
// Do not add @astrojs/sitemap — it would emit a competing sitemap-index.xml.
export default defineConfig({
  site: siteUrl,
  trailingSlash: "always",
  compressHTML: true,
  // Static site by default; API routes set `prerender = false`
  output: "static",
  adapter: node({ mode: "standalone" }),
  // Caddy/Cloudflare terminates TLS and reverse-proxies to Node over plain HTTP.
  // Without allowedDomains (+ protocol), Astro ignores X-Forwarded-Proto, builds the
  // request URL as http://, and checkOrigin rejects HTTPS visitors' form POSTs with
  // "Cross-site POST form submissions are forbidden" (403). Prefer JSON contact bodies too.
  security: {
    checkOrigin: true,
    allowedDomains: [
      { hostname: siteHost, protocol: "https" },
      { hostname: siteHost, protocol: "http" },
      { hostname: "www.emiratiguard.com", protocol: "https" },
      { hostname: "www.emiratiguard.com", protocol: "http" },
      { hostname: "emiratiguard.com", protocol: "https" },
      { hostname: "emiratiguard.com", protocol: "http" },
      // Local fleet: FLEET_LOCAL_URL uses 127.0.0.1 only (not localhost).
      { hostname: "127.0.0.1", protocol: "http" },
    ],
  },
  build: {
    inlineStylesheets: "auto",
  },
  image: {
    remotePatterns: [{ protocol: "https", hostname: "emiratiguard.com" }],
  },
  vite: {
    plugins: [
      tailwindcss(),
      {
        // Astro 7.1+ `trailingSlash: "always"` rejects bare paths with 404 in
        // `astro dev` (by design). Production app middleware + Caddy 301 instead.
        // Unshift after Astro's own trailing-slash middleware so local matches live.
        name: "emiratiguard-dev-trailing-slash",
        enforce: "post",
        configureServer(server) {
          /** @type {import('vite').Connect.NextHandleFunction} */
          const redirectBarePaths = (req, res, next) => {
            const raw = req.url || "/";
            const q = raw.indexOf("?");
            const path = q >= 0 ? raw.slice(0, q) : raw;
            const search = q >= 0 ? raw.slice(q) : "";
            const method = req.method || "GET";
            const skip =
              path === "/" ||
              path.endsWith("/") ||
              path.includes(".") ||
              path.startsWith("/@") ||
              path.startsWith("/node_modules") ||
              path.startsWith("/__");
            if (!skip && method !== "OPTIONS") {
              res.statusCode = method === "GET" || method === "HEAD" ? 301 : 308;
              res.setHeader("Location", `${path}/${search}`);
              res.end();
              return;
            }
            if (path === "/wp-content/plugins/elementor/assets/lib/swiper/v8/swiper.min.js") {
              req.url = `/scripts/swiper.min.js${search}`;
            }
            next();
          };

          return () => {
            // Astro unshifts its 404 trailing-slash guard in its post-hook.
            // Run after that stack mutation so we sit in front and 301 like prod.
            queueMicrotask(() => {
              server.middlewares.stack.unshift({
                route: "",
                handle: redirectBarePaths,
              });
            });
          };
        },
      },
    ],
    build: {
      cssCodeSplit: true,
    },
  },
});
