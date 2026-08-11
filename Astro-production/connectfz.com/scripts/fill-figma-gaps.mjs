#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const PUBLIC = path.join(process.cwd(), "public");
const PACK = path.join(PUBLIC, "wp-content/uploads/figma-pack");
const U12 = path.join(PUBLIC, "wp-content/uploads/2025/12");
const U06 = path.join(PUBLIC, "wp-content/uploads/2023/06");
const U03 = path.join(PUBLIC, "wp-content/uploads/2023/03");

function ok(p) {
  return fs.existsSync(p) && fs.statSync(p).size > 80;
}
function cp(src, dest) {
  if (!ok(src)) {
    console.warn("missing src", src);
    return false;
  }
  if (ok(dest) && fs.statSync(dest).size > 500) return false;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  console.log("→", path.relative(PUBLIC, dest));
  return true;
}

const zone = {
  JAFZA: "JAFZA-Free-Zone.webp",
  DMCC: "DMCC-Free-Zone.webp",
  DSOA: "Dubai-Silicon-Oasis-Authority.webp",
  DUQE: "DUQE-Free-Zone.webp",
  DWC: "DUBAI-SOUTH-Free-Zone.webp",
  HFZ: "HAMRIYAH-Free-Zone.webp",
  IFZA: "IFZA-Free-Zone.webp",
  KIZAD: "KIZAD-Free-Zone.webp",
  MFZ: "Meydan-Free-Zone.webp",
  RAKEZ: "RAKEZ-Free-Zone.webp",
  SAIF: "Sharjah-Airport-International-Free-Zone.webp",
  SHAMS: "Sharjah-Media-City-Free-Zone.webp",
  SPC: "SPC-Free-Zone.webp",
  SPCFZ: "SPC-Free-Zone.webp",
  UAQFZ: "UAQ-Free-Trade-Zone.webp",
  AMCFZ: "Ajman-Media-City-Free-Zone.webp",
  FFZA: "FUJAIRAH-Free-Zone.webp",
};

const docs = path.join(U03, "Documents-Image.png");
const benefits = path.join(U12, "Unmatched-Benefits.webp");
const heroDesk = path.join(U03, "Hero-Section-Desktop.png");
const heroMob = path.join(U03, "Hero-Section-Bkg-Mobile.png");
const howWe = path.join(U03, "How-We-Do-It-Bkg-Desktop.png");
const visaBg = path.join(PACK, "UAE-VISA-SERVICES-bg.jpg");
const bgConnect = path.join(PUBLIC, "wp-content/uploads/2022/02/bg-connect-fz.jpg");

cp(heroDesk, path.join(U03, "Free-zone-hero-bkg-Desktop.png"));
cp(heroMob, path.join(U03, "Free-zone-hero-bkg-Mobile.png"));
cp(heroDesk, path.join(U12, "Banner-image.webp"));
cp(docs, path.join(U12, "Documents-Image.webp"));
cp(benefits, path.join(U12, "Benefits-Image.webp"));
cp(howWe, path.join(U12, "Facilites-Section-Bkg-Desktop.webp"));
cp(path.join(U12, "Why-Choose-ConnectFZ-for-UAE-Visa-Services.webp"), path.join(U12, "Facilites-Section.webp"));
cp(path.join(U12, "Sharjah-Media-City-Free-Zone.webp"), path.join(U12, "Sharjah-Media-City-SHAMS.webp"));
cp(bgConnect, path.join(U06, "bg-connect-fz-scaled.jpg"));

for (const [code, file] of Object.entries(zone)) {
  const src = path.join(U12, file);
  cp(src, path.join(U12, `Avail-world-class-facilities-business-activities-at-${code}.webp`));
  cp(benefits, path.join(U12, `Benefits-of-doing-business-in-${code}.webp`));
  cp(docs, path.join(U12, `Documents-for-business-setup-in-${code}.webp`));
}

// longer benefit filenames
const longBenefits = {
  "Benefits-of-doing-business-in-Dubai-Multi-Commodity-Center-DMCC.webp": "DMCC",
  "Benefits-of-doing-business-in-Dubai-Silicon-Oasis-Free-Zone-DSOA.webp": "DSOA",
  "Benefits-of-doing-business-in-Khalifa-Industrial-Zone-Abu-Dhabi-KIZAD.webp": "KIZAD",
  "Benefits-of-doing-business-in-SAIF2.webp": "SAIF",
  "Benefits-of-doing-business-in-MFZ-1.webp": "MFZ",
  "Benefits-of-doing-business-in-FFZA-1.webp": "FFZA",
  "Avail-world-class-facilities-business-activities-at-MFZ-1.webp": "MFZ",
  "Documents-for-business-setup-in-MFZ-optimized.webp": "MFZ",
  "Documents-for-business-setup-in-FFZA-1.webp": "FFZA",
};
for (const [name, code] of Object.entries(longBenefits)) {
  const src = name.startsWith("Avail")
    ? path.join(U12, zone[code])
    : name.startsWith("Documents")
      ? docs
      : benefits;
  cp(src, path.join(U12, name));
}

const visaDesktop = {
  "Desktop-scaled.jpg": "UAE-Job-Seeker-Visa.jpg",
  "Desktop-1-scaled.jpg": "UAE-Freelance-Visa.jpg",
  "Desktop-2-scaled.jpg": "Green-Visa-UAE.jpg",
  "Desktop-3-scaled.jpg": "UAE-Remote-Work-Visa.jpg",
  "Desktop-4-scaled.jpg": "Live,-work-and-invest-in-the-UAE-with-our-support.jpg",
  "Desktop-5-scaled.jpg": "UAE-Investor-Visa.jpg",
  "Desktop-7-scaled.jpg": "UAE-Golden-Visa.jpg",
};
for (const [destName, packName] of Object.entries(visaDesktop)) {
  cp(path.join(PACK, packName), path.join(U06, destName));
}

cp(visaBg, path.join(U12, "image-ezgif.com-png-to-webp-converter-1.webp"));

console.log("done");
