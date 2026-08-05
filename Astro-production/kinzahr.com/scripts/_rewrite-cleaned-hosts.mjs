import { readdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
async function walk(d){let o=[]; for(const e of await readdir(d,{withFileTypes:true})){const f=join(d,e.name); if(e.isDirectory()) o=o.concat(await walk(f)); else if(e.name.endsWith(".cleaned.html")) o.push(f);} return o;}
let n=0;
for (const f of await walk("src/legacy")) {
  const raw = await readFile(f, "utf8");
  let next = raw.replace(/https?:\/\/dev\.kinzahr\.com(\/[^"'()\s]+)/gi, "$1");
  next = next.replace(/https?:\/\/(?:www\.)?kinzahr\.com(\/wp-content\/[^"'()\s]+)/gi, "$1");
  next = next.replace(/https?:\/(?!\/)(wp-content|wp-includes)\//gi, "/$1/");
  if (next !== raw) { await writeFile(f, next, "utf8"); n++; }
}
console.log("cleaned html rewritten", n);
