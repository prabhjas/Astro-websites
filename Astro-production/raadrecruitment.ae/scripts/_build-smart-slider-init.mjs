import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcPath = path.join(root, "src/data/smart-slider/init-home.js");
const outPath = path.join(root, "public/scripts/smart-slider/init-home.js");

const src = fs.readFileSync(srcPath, "utf8");

function findMatchingParen(str, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < str.length; i++) {
    const ch = str[i];
    if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0) return i;
    } else if (ch === '"' || ch === "'" || ch === "`") {
      const q = ch;
      i++;
      while (i < str.length) {
        if (str[i] === "\\") {
          i += 2;
          continue;
        }
        if (str[i] === q) break;
        i++;
      }
    }
  }
  throw new Error(`unbalanced paren at ${openIdx}`);
}

const re = /new\s+_N2\.SmartSliderSimple\('(n2-ss-\d+)'/g;
let out = "";
let last = 0;
let m;
while ((m = re.exec(src))) {
  const id = m[1];
  const start = m.index;
  const parenOpen = src.indexOf("(", start);
  const parenClose = findMatchingParen(src, parenOpen);
  const end = parenClose + 1;
  const args = src.slice(parenOpen + 1, parenClose);
  out += src.slice(last, start);
  out += `(function(){var id=${JSON.stringify(id)};if(!document.getElementById(id)||window.__raadSsInited[id])return;window.__raadSsInited[id]=1;try{new _N2.SmartSliderSimple(${args});}catch(e){console.warn("[smart-slider] init failed",id,e);}})()`;
  last = end;
}
out += src.slice(last);
out = `window.__raadSsInited=window.__raadSsInited||{};${out}`;

fs.writeFileSync(outPath, out);
console.log("wrote", outPath, "bytes", out.length);
console.log(
  "ids",
  [...out.matchAll(/SmartSliderSimple\(/g)].length,
  [...out.matchAll(/n2-ss-\d+/g)].map((x) => x[0]).filter((v, i, a) => a.indexOf(v) === i),
);
