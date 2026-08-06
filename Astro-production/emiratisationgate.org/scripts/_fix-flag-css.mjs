import { readFileSync, copyFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const VER = '20260806-flag2';
const root = process.cwd();

// Harden phone-flag CSS (remove broken :not that can hide all flag chrome)
const mirrorPath = join(root, 'public/js/astro-mirror-fixes.js');
let js = readFileSync(mirrorPath, 'utf8');
const oldCssBlock = `        /* Hide leftover plugin shells that sit between name/email after double-init.
           Only hide flag chrome that is NOT inside a real intl-tel-input wrap. */
        '.wpcf7 .flag-container:not(.intl-tel-input .flag-container){display:none!important;}' +
        '.wpcf7 > .iti-flag,.wpcf7 p > .iti-flag,.wpcf7 label > .iti-flag{display:none!important;}' +
        /* Ensure dial-code/flag chrome stays visible once ITI mounts */
        '.intl-tel-input .flag-container,.intl-tel-input .selected-flag{display:block!important;visibility:visible!important;opacity:1!important;}' +
        '.intl-tel-input .selected-dial-code{display:inline-block!important;visibility:visible!important;}' +`;

const newCssBlock = `        /* Hide orphan flag shells only (outside ITI). Never use :not() complex selector. */
        '.wpcf7 .iti-flag:not(.intl-tel-input .iti-flag),' +
        '.wpcf7 > .iti-flag,.wpcf7 p > .iti-flag,.wpcf7 label > .iti-flag{display:none!important;}' +
        /* Force flag + dial visible above the phone input */
        '.intl-tel-input{position:relative!important;display:block!important;width:100%!important;}' +
        '.intl-tel-input .flag-container{position:absolute!important;top:0!important;bottom:0!important;left:0!important;z-index:2!important;' +
        'display:block!important;visibility:visible!important;opacity:1!important;padding:0!important;}' +
        '.intl-tel-input .selected-flag{position:relative!important;z-index:3!important;display:flex!important;align-items:center!important;' +
        'visibility:visible!important;opacity:1!important;height:100%!important;min-width:100px!important;' +
        'padding:0 0 0 8px!important;box-sizing:border-box!important;}' +
        '.intl-tel-input .selected-dial-code{display:inline-block!important;visibility:visible!important;opacity:1!important;' +
        'color:#222!important;font-size:14px!important;line-height:1!important;margin-left:6px!important;}' +
        '.intl-tel-input .iti-flag{display:inline-block!important;visibility:visible!important;opacity:1!important;}' +`;

if (!js.includes(oldCssBlock)) {
  console.error('CSS block not found — checking current state');
  console.log('has bad :not', js.includes(':not(.intl-tel-input .flag-container)'));
} else {
  js = js.replace(oldCssBlock, newCssBlock);
  writeFileSync(mirrorPath, js);
  console.log('updated injectFlagSpriteCss');
}

copyFileSync(mirrorPath, join(root, 'dist/client/js/astro-mirror-fixes.js'));

function bump(file) {
  let s = readFileSync(file, 'utf8');
  const before = s;
  s = s.replace(/\/js\/astro-mirror-fixes\.js(?:\?v=[^"']*)?/g, `/js/astro-mirror-fixes.js?v=${VER}`);
  if (s !== before) {
    writeFileSync(file, s);
    return 1;
  }
  return 0;
}

let n = 0;
function walk(dir) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) walk(p);
    else if (/\.(cleaned\.html|html|astro|js|ts)$/.test(name.name)) n += bump(p);
  }
}
walk(join(root, 'src'));
console.log({ bumped: n, ver: VER });
