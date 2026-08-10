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
      { hostname: "localhost", protocol: "http" },
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
        name: "emiratiguard-serve-swiper",
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            const url = req.url?.split("?")[0] || "";
            if (url === "/wp-content/plugins/elementor/assets/lib/swiper/v8/swiper.min.js") {
              req.url = "/scripts/swiper.min.js";
            }
            next();
          });
        },
      },
    ],
    build: {
      cssCodeSplit: true,
    },
  },
});
