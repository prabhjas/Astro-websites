import { readFileSync, writeFileSync } from 'node:fs';

const path =
  'd:/Astro-websites/Astro-production/emiratisationgateway.com/public/js/astro-mirror-fixes.js';
let s = readFileSync(path, 'utf8');

if (s.includes('Drop browser focus ring')) {
  console.log('already patched');
  process.exit(0);
}

const re =
  /          if \(willOpen\) openPanel\(title\);\r?\n        \},\r?\n        true,\r?\n      \);\r?\n\r?\n      root\.querySelectorAll\('\.elementor-tab-title'\)\.forEach\(function \(title\) \{\r?\n        title\.addEventListener\('keydown', function \(e\) \{\r?\n          if \(e\.key !== 'Enter' && e\.key !== ' '\) return;\r?\n          e\.preventDefault\(\);\r?\n          title\.click\(\);\r?\n        \}\);\r?\n      \}\);/;

const replacement = `          if (willOpen) openPanel(title);

          // Drop browser focus ring (dotted outline) on the inner <a tabindex="0">
          // after mouse clicks — matches live Elementor FAQ (no visible focus box).
          var focused = document.activeElement;
          if (focused && title.contains(focused) && typeof focused.blur === 'function') {
            focused.blur();
          } else if (typeof title.blur === 'function') {
            title.blur();
          }
        },
        true,
      );

      root.querySelectorAll('.elementor-tab-title').forEach(function (title) {
        // Parent already has role="button"; inner <a tabindex="0"> causes the dotted
        // focus rectangle around the question text on click.
        title.querySelectorAll('a.elementor-accordion-title').forEach(function (link) {
          link.setAttribute('tabindex', '-1');
          link.addEventListener('click', function (ev) {
            ev.preventDefault();
          });
        });
        if (!title.hasAttribute('tabindex')) title.setAttribute('tabindex', '0');

        title.addEventListener('keydown', function (e) {
          if (e.key !== 'Enter' && e.key !== ' ') return;
          e.preventDefault();
          title.click();
        });
      });`;

if (!re.test(s)) {
  console.error('pattern not found');
  process.exit(1);
}
s = s.replace(re, replacement.replace(/\n/g, '\r\n'));
writeFileSync(path, s);
console.log('patched OK');
