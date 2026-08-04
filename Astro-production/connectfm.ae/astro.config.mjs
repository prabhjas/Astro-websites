// @ts-check
import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import tailwindcss from "@tailwindcss/vite";

const siteUrl = (
  process.env.PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  "https://connectfm.ae"
)
  .trim()
  .replace(/\/$/, "");
let siteHost = "connectfm.ae";
try {
  siteHost = new URL(siteUrl).hostname;
} catch {
  /* keep default */
}

export default defineConfig({
  site: siteUrl,
  trailingSlash: "always",
  compressHTML: true,
  output: "static",
  adapter: node({ mode: "standalone" }),
  security: {
    checkOrigin: true,
    allowedDomains: [
      { hostname: siteHost, protocol: "https" },
      { hostname: siteHost, protocol: "http" },
      { hostname: "www.connectfm.ae", protocol: "https" },
      { hostname: "www.connectfm.ae", protocol: "http" },
      { hostname: "connectfm.ae", protocol: "https" },
      { hostname: "connectfm.ae", protocol: "http" },
      { hostname: "localhost", protocol: "http" },
      { hostname: "127.0.0.1", protocol: "http" },
    ],
  },
  build: {
    inlineStylesheets: "auto",
  },
  image: {
    remotePatterns: [{ protocol: "https", hostname: "connectfm.ae" }],
  },
  vite: {
    plugins: [
      tailwindcss(),
      {
        name: "connectfm-serve-swiper",
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
