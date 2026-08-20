import type { APIRoute } from "astro";
import { resolveInternalAdminDir } from "../env/server";
import { resolveEffectiveGtmConfig, snippetsFromGtmId } from "../lib/gtm/store";

export const prerender = false;

/** Official GTM container for kinzahr.com (GTM Admin → Container Settings). */
const OFFICIAL_GTM_ID = "GTM-P7XTGMV3";

function escapeJs(value: string): string {
  return JSON.stringify(value);
}

export const GET: APIRoute = async () => {
  let headScript = "";
  let bodyHtml = "";
  let footerScript = "";
  try {
    const config = await resolveEffectiveGtmConfig(resolveInternalAdminDir());
    // FLOW-saved gtm.json still wins. Otherwise force the official single
    // container — live env was empty / wrong and left /runtime-gtm.js blank.
    if (config.source === "file") {
      headScript = config.headScript;
      bodyHtml = config.bodyHtml;
      footerScript = config.footerScript;
    } else {
      const official = snippetsFromGtmId(OFFICIAL_GTM_ID);
      headScript = official.headScript;
      bodyHtml = official.bodyHtml;
      footerScript = official.footerScript;
    }
  } catch {
    /* public loader must stay resilient */
  }

  // Scripts inserted via innerHTML never run. This loader clones markup, then
  // re-creates <script> nodes so GTM/analytics execute. Also strips WP Rocket
  // lazy types (type="rocketlazyloadscript") that would otherwise noop.
  const source = `(() => {
  if (window.__runtimeGtmLoaded) return;
  window.__runtimeGtmLoaded = true;
  window.dataLayer = window.dataLayer || [];

  const headScript = ${escapeJs(headScript)};
  const bodyHtml = ${escapeJs(bodyHtml)};
  const footerScript = ${escapeJs(footerScript)};

  function isRocketType(type) {
    return type && /rocketlazyloadscript|text\\/rocket/i.test(String(type));
  }

  function recreateScript(old) {
    const s = document.createElement('script');
    for (const attr of Array.from(old.attributes || [])) {
      if (attr.name === 'type' && isRocketType(attr.value)) continue;
      try { s.setAttribute(attr.name, attr.value); } catch (_) {}
    }
    if (!s.getAttribute('type') || isRocketType(s.getAttribute('type'))) {
      s.type = 'text/javascript';
    }
    if (old.src) {
      s.src = old.src;
      s.async = old.async;
      s.defer = old.defer;
    } else {
      s.text = old.textContent || '';
    }
    return s;
  }

  function injectMarkup(html, target, atStart) {
    if (!html || !target) return;
    const tpl = document.createElement('template');
    tpl.innerHTML = String(html).trim();
    const frag = tpl.content;
    const scripts = Array.from(frag.querySelectorAll('script'));
    scripts.forEach((el) => el.parentNode && el.parentNode.removeChild(el));

    if (atStart) {
      while (frag.firstChild) target.insertBefore(frag.firstChild, target.firstChild);
    } else {
      target.appendChild(frag);
    }

    scripts.forEach((old) => {
      const s = recreateScript(old);
      if (atStart && target === document.body) {
        target.insertBefore(s, target.firstChild);
      } else if (target === document.head) {
        target.appendChild(s);
      } else {
        target.appendChild(s);
      }
    });
  }

  function boot() {
    if (headScript) injectMarkup(headScript, document.head, false);
    if (bodyHtml) injectMarkup(bodyHtml, document.body, true);
    if (footerScript) injectMarkup(footerScript, document.body, false);
  }

  if (document.body) boot();
  else document.addEventListener('DOMContentLoaded', boot);
})();`;

  return new Response(source, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
    },
  });
};
