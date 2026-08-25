#!/usr/bin/env node
/**
 * Seed GTM container config into INTERNAL_ADMIN_DIR/gtm.json.
 * Container ID recovered from the pre-migration WordPress site (Wayback).
 *
 * Usage:
 *   node scripts/seed-gtm.mjs
 *   INTERNAL_ADMIN_DIR=/var/spheavy/internal-admin node scripts/seed-gtm.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const GTM_ID = 'GTM-PL2CQ48T';
const adminDir = process.env.INTERNAL_ADMIN_DIR?.trim() || join(process.cwd(), '.data/internal-admin');

const headScript = `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');</script>
<!-- End Google Tag Manager -->`;

const bodyHtml = `<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${GTM_ID}"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->`;

const config = {
  schemaVersion: 2,
  gtmIds: [GTM_ID],
  ga4Ids: [],
  headScript,
  bodyHtml,
  footerScript: '',
  updatedBy: 'seed-gtm',
  updatedAt: new Date().toISOString(),
};

mkdirSync(adminDir, { recursive: true });
const target = join(adminDir, 'gtm.json');
writeFileSync(target, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
console.log(`Wrote ${target} (${GTM_ID})`);
