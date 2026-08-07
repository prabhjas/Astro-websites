import js from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintPluginAstro from "eslint-plugin-astro";

const readonlyGlobals = (names) => Object.fromEntries(names.map((name) => [name, "readonly"]));

const browserGlobals = readonlyGlobals([
  "AbortController",
  "Blob",
  "CSS",
  "CustomEvent",
  "DOMParser",
  "Element",
  "Event",
  "File",
  "FormData",
  "Headers",
  "HTMLElement",
  "HTMLFormElement",
  "HTMLInputElement",
  "IntersectionObserver",
  "Intl",
  "MutationObserver",
  "Node",
  "NodeList",
  "URL",
  "URLSearchParams",
  "XMLHttpRequest",
  "cancelAnimationFrame",
  "clearInterval",
  "clearTimeout",
  "console",
  "crypto",
  "document",
  "fetch",
  "getComputedStyle",
  "history",
  "jQuery",
  "localStorage",
  "location",
  "matchMedia",
  "navigator",
  "performance",
  "queueMicrotask",
  "requestAnimationFrame",
  "sessionStorage",
  "setInterval",
  "setTimeout",
  "window",
]);

const nodeGlobals = readonlyGlobals([
  "AbortController",
  "Buffer",
  "TextDecoder",
  "TextEncoder",
  "URL",
  "URLSearchParams",
  "clearInterval",
  "clearTimeout",
  "console",
  "crypto",
  "fetch",
  "process",
  "setInterval",
  "setTimeout",
]);

export default [
  {
    ignores: [
      "dist*/**",
      ".astro/**",
      "node_modules*/**",
      "_ref/**",
      "_crawl/**",
      "public/wp-content/**",
      "public/wp-includes/**",
      "public/**/*.min.js",
      ".data/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...eslintPluginAstro.configs.recommended,
  {
    files: ["public/scripts/**/*.js"],
    languageOptions: { globals: browserGlobals },
  },
  {
    files: ["*.{js,mjs,cjs}", "scripts/**/*.{js,mjs,cjs}"],
    languageOptions: { globals: { ...nodeGlobals, ...browserGlobals } },
  },
  {
    files: ["scripts/**/*.{js,mjs,cjs}"],
    rules: {
      // Audit/import helpers intentionally probe several shapes and tolerate failed selectors.
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-useless-assignment": "off",
    },
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      // Control-character ranges are intentional input-sanitization boundaries.
      "no-control-regex": "off",
    },
  },
];
