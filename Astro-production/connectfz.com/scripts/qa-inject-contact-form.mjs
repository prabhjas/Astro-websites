/**
 * DISABLED: live /contact/ has only the "Submit Your Inquiry" heading — no CF7 form.
 * Kept for reference; do not run. Use scripts that refresh contact from live instead.
 */
console.error("Refusing to inject contact form — live site has no form under Submit Your Inquiry.");
process.exit(1);

/**
 * (Previously) Inject CF7 form into /contact/ #c-form.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "src", "data");

const FORM = `<div class="wpcf7 no-js" id="wpcf7-f18710-p-contact-o1" lang="en-US" dir="ltr" data-wpcf7-id="18710">
<div class="screen-reader-response"><p role="status" aria-live="polite" aria-atomic="true"></p> <ul></ul></div>
<form action="/contact/#wpcf7-f18710-p-contact-o1" method="post" class="wpcf7-form init" aria-label="Contact form" novalidate="novalidate" data-status="init" data-sp-contact-form>
<fieldset class="hidden-fields-container">
<input type="hidden" name="_wpcf7" value="18710">
<input type="hidden" name="_wpcf7_version" value="6.1.6">
<input type="hidden" name="_wpcf7_locale" value="en_US">
<input type="hidden" name="_wpcf7_unit_tag" value="wpcf7-f18710-p-contact-o1">
<input type="hidden" name="_wpcf7_container_post" value="0">
<input type="hidden" name="form_name" value="Connect FZ Contact Page">
<input type="hidden" name="formId" value="contact-page">
</fieldset>
<p><label>Name<br><span class="wpcf7-form-control-wrap" data-name="your-name"><input size="40" class="wpcf7-form-control wpcf7-text wpcf7-validates-as-required" autocomplete="name" aria-required="true" aria-invalid="false" value="" type="text" name="your-name" required></span></label></p>
<p><label>Email<br><span class="wpcf7-form-control-wrap" data-name="your-email"><input size="40" class="wpcf7-form-control wpcf7-email wpcf7-validates-as-required wpcf7-text wpcf7-validates-as-email" autocomplete="email" aria-required="true" aria-invalid="false" value="" type="email" name="your-email" required></span></label></p>
<p><label>Phone<br><span class="wpcf7-form-control-wrap" data-name="phone"><input class="wpcf7-form-control wpcf7-phonetext" autocomplete="tel" aria-required="true" aria-invalid="false" value="" type="tel" name="phone" required></span></label></p>
<p><label>Message<br><span class="wpcf7-form-control-wrap" data-name="your-message"><textarea cols="40" rows="6" class="wpcf7-form-control wpcf7-textarea" aria-invalid="false" name="your-message"></textarea></span></label></p>
<p><input class="wpcf7-form-control has-spinner wpcf7-submit" type="submit" value="Submit"><span class="wpcf7-spinner"></span></p>
<div class="wpcf7-response-output" aria-hidden="true"></div>
</form>
</div>`;

const pages = JSON.parse(fs.readFileSync(path.join(DATA, "pages.json"), "utf8"));
const bodies = JSON.parse(fs.readFileSync(path.join(DATA, "bodies.json"), "utf8"));
const page = pages.find((p) => p.path === "/contact/");
if (!page) {
  console.error("contact page missing");
  process.exit(1);
}

let html = page.bodyHtml || page.content || bodies["/contact/"] || "";
if (/wpcf7-form/.test(html)) {
  console.log("contact already has form", html.length);
  process.exit(0);
}

if (!/id="c-form"/.test(html)) {
  console.error("c-form section missing");
  process.exit(1);
}

// Insert form after the Submit Your Inquiry heading widget inside #c-form
const next = html.replace(
  /(id="c-form"[\s\S]*?elementor-element-96e1caa[\s\S]*?<\/div>\s*<\/div>)/i,
  `$1\n${FORM}\n`,
);

if (next === html) {
  // fallback: append inside c-form populated wrap
  const alt = html.replace(
    /(id="c-form"[\s\S]*?elementor-element-populated">)/i,
    `$1\n${FORM}\n`,
  );
  if (alt === html) {
    console.error("failed to inject form");
    process.exit(1);
  }
  html = alt;
} else {
  html = next;
}

page.bodyHtml = html;
page.content = html;
bodies["/contact/"] = html;
fs.writeFileSync(path.join(DATA, "pages.json"), JSON.stringify(pages, null, 2));
fs.writeFileSync(path.join(DATA, "bodies.json"), JSON.stringify(bodies, null, 2));
console.log(JSON.stringify({ len: html.length, hasForm: /wpcf7-form/.test(html) }, null, 2));
