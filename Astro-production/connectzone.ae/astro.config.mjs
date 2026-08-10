// @ts-check
import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import tailwindcss from "@tailwindcss/vite";

const siteUrl = (
  process.env.PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  ""
)
  .trim()
  .replace(/\/$/, "");
let siteHost = "connectzone.ae";
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
  output: "server",
  adapter: node({ mode: "standalone" }),
  security: {
    checkOrigin: true,
    allowedDomains: [
      { hostname: siteHost, protocol: "https" },
      { hostname: siteHost, protocol: "http" },
      { hostname: "www.connectzone.ae", protocol: "https" },
      { hostname: "www.connectzone.ae", protocol: "http" },
      { hostname: "localhost", protocol: "http" },
      { hostname: "127.0.0.1", protocol: "http" },
    ],
  },
  build: {
    inlineStylesheets: "auto",
  },
  image: {
    remotePatterns: [{ protocol: "https", hostname: "connectzone.ae" }],
  },
  vite: {
    plugins: [tailwindcss()],
    build: {
      cssCodeSplit: true,
    },
  },
});
