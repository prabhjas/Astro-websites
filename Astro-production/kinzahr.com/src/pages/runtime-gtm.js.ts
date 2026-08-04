import type { APIRoute } from 'astro';
import { getServerEnv } from '../env/server';
import { readGlobalGtmConfig } from '../lib/gtm/store';

export const prerender = false;

function escapeJs(value: string): string {
  return JSON.stringify(value);
}

export const GET: APIRoute = async () => {
  const env = getServerEnv();
  const config = await readGlobalGtmConfig(env.internalAdminDir);
  const headScript = config?.headScript || '';
  const bodyHtml = config?.bodyHtml || '';
  const footerScript = config?.footerScript || '';

  const source = `(() => {
  if (window.__runtimeGtmLoaded) return;
  window.__runtimeGtmLoaded = true;
  window.dataLayer = window.dataLayer || [];
  const headScript = ${escapeJs(headScript)};
  const bodyHtml = ${escapeJs(bodyHtml)};
  const footerScript = ${escapeJs(footerScript)};
  if (headScript) {
    const tpl = document.createElement('template');
    tpl.innerHTML = headScript.trim();
    document.head.appendChild(tpl.content.cloneNode(true));
  }
  if (bodyHtml) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = bodyHtml.trim();
    while (wrapper.firstChild) {
      document.body.insertBefore(wrapper.firstChild, document.body.firstChild);
    }
  }
  if (footerScript) {
    const tpl = document.createElement('template');
    tpl.innerHTML = footerScript.trim();
    document.body.appendChild(tpl.content.cloneNode(true));
  }
})();`;

  return new Response(source, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
};
