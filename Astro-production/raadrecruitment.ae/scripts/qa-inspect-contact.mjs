import * as cheerio from "cheerio";
import fs from "node:fs";

const ORIGIN = "";
const html = await (
  await fetch(`${ORIGIN}/contact/?nowprocket=1`, {
    headers: { "User-Agent": "Mozilla/5.0" },
  })
).text();

fs.mkdirSync("_crawl", { recursive: true });
fs.writeFileSync("_crawl/live-contact.html", html);

const $ = cheerio.load(html);
console.log({
  len: html.length,
  forms: $("form").length,
  wpcf7: $(".wpcf7, form.wpcf7-form").length,
  wpPage: $('[data-elementor-type="wp-page"]').length,
  shortcodes: (html.match(/\[contact-form-7[^\]]*\]/g) || []).length,
  htmlWidgets: $(".elementor-widget-html").length,
  formWidgets: $(".elementor-widget-form, .elementor-widget-shortcode").length,
});

$("form").each((i, el) => {
  const $el = $(el);
  console.log("FORM", i, {
    id: $el.attr("id"),
    class: $el.attr("class"),
    action: $el.attr("action"),
    parent: $el.parent().attr("class"),
  });
});

// Find c-form section
const cform = $("#c-form");
console.log("c-form html len", cform.html()?.length || 0);
console.log("c-form preview", (cform.html() || "").slice(0, 1500));

// Look for any contact form shortcode remnants or iframes
console.log(
  "iframe",
  $("iframe")
    .map((_, e) => $(e).attr("src"))
    .get(),
);
console.log("has Get in Touch", /Get in Touch|Contact Us|Send Message/i.test(html));

// Compare section counts in wp-page
const page = $('[data-elementor-type="wp-page"]').first();
console.log("wp-page children widgets", page.find(".elementor-widget").length);
console.log(
  "widget types",
  [
    ...new Set(
      page
        .find(".elementor-widget")
        .map((_, e) =>
          [...($(e).attr("class") || "").split(/\s+/)].find((c) =>
            c.startsWith("elementor-widget-"),
          ),
        )
        .get(),
    ),
  ],
);
