/**
 * Decode Cloudflare obfuscated emails → contact@iberiaeor.com
 * Preserves icon/list markup inside links.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "src", "data");
const FORCE = "contact@iberiaeor.com";

function decodeCfEmail(encoded) {
  const r = parseInt(encoded.slice(0, 2), 16);
  let email = "";
  for (let n = 2; n < encoded.length; n += 2) {
    email += String.fromCharCode(parseInt(encoded.slice(n, n + 2), 16) ^ r);
  }
  return email;
}

function brandEmail(email) {
  if (!email) return FORCE;
  return email.toLowerCase().includes("iberiaeor.com") ? email : FORCE;
}

function fixEmails(html) {
  if (!html) return html;
  let out = html;

  // Replace cdn-cgi protection hrefs with mailto
  out = out.replace(
    /href=["']\/cdn-cgi\/l\/email-protection(?:#[a-f0-9]+)?["']/gi,
    () => `href="mailto:${FORCE}"`,
  );

  // Replace obfuscated spans with plain email
  out = out.replace(
    /<span class=["']__cf_email__["'] data-cfemail=["']([a-f0-9]+)["']>[\s\S]*?<\/span>/gi,
    (_, enc) => brandEmail(decodeCfEmail(enc)),
  );

  out = out.replace(/\[email&#160;protected\]/gi, FORCE);
  out = out.replace(/\[email\s*protected\]/gi, FORCE);
  return out;
}

function rewriteFile(rel) {
  const fp = path.join(DATA, rel);
  if (!fs.existsSync(fp)) return "missing";
  const before = fs.readFileSync(fp, "utf8");
  const after = fixEmails(before);
  if (after !== before) {
    fs.writeFileSync(fp, after);
    return true;
  }
  return false;
}

const files = ["header.html", "footer.html", "site.json", "bodies.json", "pages.json", "posts.json"];
const changed = {};
for (const f of files) changed[f] = rewriteFile(f);

const header = fs.readFileSync(path.join(DATA, "header.html"), "utf8");
console.log({
  changed,
  headerHasMailto: /mailto:contact@iberiaeor\.com/.test(header),
  headerHasCf: /__cf_email__|cdn-cgi\/l\/email-protection/.test(header),
  snip: header.match(/mailto:contact@iberiaeor\.com[\s\S]{0,180}/)?.[0]?.replace(/\s+/g, " "),
});
