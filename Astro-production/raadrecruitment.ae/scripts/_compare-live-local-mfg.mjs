import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";

const out =
  "C:/Users/DELL/Desktop/Astro-New-Setup/Astro-websites/Astro-production/ngmanpower.com/.verify-screens";
mkdirSync(out, { recursive: true });

async function measure(url, label) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(3000);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);

  const styles = await page.evaluate(() => {
    const pick = (sel, props = []) => {
      const el = document.querySelector(sel);
      if (!el) return { missing: true, sel };
      const cs = getComputedStyle(el);
      const o = { sel };
      for (const p of props) o[p] = cs.getPropertyValue(p);
      const r = el.getBoundingClientRect();
      o.top = Math.round(r.top + window.scrollY);
      o.height = Math.round(r.height);
      o.bottom = o.top + o.height;
      o.left = Math.round(r.left);
      o.width = Math.round(r.width);
      return o;
    };
    const hero = pick(".us_custom_0b7e9c85", [
      "margin-top",
      "padding-top",
      "padding-bottom",
      "background-image",
      "background-size",
      "background-position",
    ]);
    const contact = pick(".us_custom_7bf0190b", ["margin-top", "margin-left"]);
    const social = pick(".us_custom_2cb867d0", [
      "margin-top",
      "padding-top",
      "padding-bottom",
    ]);
    const clients = pick(".us_custom_6a99ad11", ["padding-top", "padding-bottom"]);
    const circle = pick(".us_custom_8b78c63d", ["margin-top", "padding-bottom"]);
    const badges = pick(".us_custom_0493f734", ["margin-top", "padding-bottom"]);
    const body = pick(".us_custom_6a99ad11 .us_custom_42622947", ["margin-top"]);
    const heading = pick(".us_custom_6a99ad11 .us_custom_d3f933e5", []);
    const revo = pick(".us_custom_8549a734", ["padding-top", "padding-bottom"]);
    const badgeImages = [...document.querySelectorAll(".us_custom_0493f734 .w-image")].map(
      (el) => {
        const r = el.getBoundingClientRect();
        return {
          top: Math.round(r.top + window.scrollY),
          left: Math.round(r.left),
          width: Math.round(r.width),
          height: Math.round(r.height),
        };
      }
    );
    const circleImg = pick(".us_custom_8b78c63d .w-image", []);

    return {
      hero,
      contact,
      social,
      clients,
      circle,
      circleImg,
      badges,
      badgeImages,
      body,
      heading,
      revo,
      gapHeroSocial: social.missing ? null : social.top - hero.bottom,
      layoutCheck: {
        badgesBelowBody: !badges.missing && !body.missing && badges.top >= body.bottom - 40,
        badgesOverlapHeading:
          !badges.missing && !heading.missing && badges.top < heading.bottom && badges.bottom > heading.top,
        circleLeftOfText:
          !circleImg.missing && !heading.missing && circleImg.left + circleImg.width < heading.left + 40,
        revoBelowClients: !revo.missing && !clients.missing && revo.top >= clients.bottom - 80,
      },
    };
  });

  // Full page
  await page.screenshot({ path: `${out}/${label}-full.png`, fullPage: true });

  // Top band using scroll + viewport shot
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${out}/${label}-viewport-top.png` });

  // Scroll to social proof
  if (!styles.social.missing) {
    await page.evaluate((y) => window.scrollTo(0, Math.max(0, y - 40)), styles.social.top);
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${out}/${label}-viewport-social.png` });
  }

  // Scroll to clients
  if (!styles.clients.missing) {
    await page.evaluate((y) => window.scrollTo(0, Math.max(0, y - 40)), styles.clients.top);
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${out}/${label}-viewport-clients.png` });
  }

  // Scroll to revolutionize
  if (!styles.revo.missing) {
    await page.evaluate((y) => window.scrollTo(0, Math.max(0, y - 40)), styles.revo.top);
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${out}/${label}-viewport-revo.png` });
  }

  await browser.close();
  writeFileSync(`${out}/${label}-metrics.json`, JSON.stringify(styles, null, 2));
  console.log("====", label, "====");
  console.log(JSON.stringify(styles, null, 2));
  return styles;
}

const local = await measure("http://127.0.0.1:5102/manufacturing/", "local");
const live = await measure("https://ngmanpower.com/manufacturing/", "live");

console.log("\n==== DIFF SUMMARY ====");
const fields = [
  ["hero.padding-bottom", (s) => s.hero["padding-bottom"]],
  ["hero.margin-top", (s) => s.hero["margin-top"]],
  ["contact.margin-top", (s) => s.contact["margin-top"]],
  ["social.padding-top", (s) => s.social["padding-top"]],
  ["gapHeroSocial", (s) => s.gapHeroSocial],
  ["circle.margin-top", (s) => s.circle["margin-top"]],
  ["badges.margin-top", (s) => s.badges["margin-top"]],
  ["body.margin-top", (s) => s.body["margin-top"]],
  ["heading.top", (s) => s.heading.top],
  ["body.top", (s) => s.body.top],
  ["badges.top", (s) => s.badges.top],
  ["badgesBelowBody", (s) => s.layoutCheck.badgesBelowBody],
  ["badgesOverlapHeading", (s) => s.layoutCheck.badgesOverlapHeading],
];
for (const [name, fn] of fields) {
  console.log(name.padEnd(24), "local=", fn(local), "live=", fn(live));
}
