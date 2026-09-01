/**
 * Apply Figma 42:693 overrides onto generated security-systems.css
 */
import fs from 'node:fs';

const cssPath = 'public/css/page-design/security-systems.css';
let css = fs.readFileSync(cssPath, 'utf8');

css = css.replace('node 42:793', 'node 42:693');

const whyPatch = `/* Why service cards row */
.elementor-1012 .elementor-element-bfdadca {
  --display: flex !important;
  --flex-direction: row !important;
  --flex-wrap: wrap !important;
  --gap: 24px !important;
  --width: 100% !important;
  --padding-top: 0 !important;
  --padding-bottom: 0 !important;
  --padding-left: 0 !important;
  --padding-right: 0 !important;
}
.elementor-1012 .elementor-element-49758d4 {
  --gap: 80px !important;
  gap: 80px !important;
}
@media (min-width: 1025px) {
  .elementor-1012 .elementor-element-cd7106d {
    --width: 487px !important;
    width: 487px !important;
    max-width: 487px !important;
    flex: 0 0 487px !important;
  }
  .elementor-1012 .elementor-element-8fcd360 {
    flex: 1 1 0 !important;
    min-width: 0 !important;
  }
  .elementor-1012 .elementor-element-7fef9af,
  .elementor-1012 .elementor-element-ecafd0b,
  .elementor-1012 .elementor-element-fd667cf,
  .elementor-1012 .elementor-element-9059d58 {
    flex: 1 1 0 !important;
    min-width: 0 !important;
    max-width: none !important;
  }
}
.elementor-1012 .elementor-element-7fef9af,
.elementor-1012 .elementor-element-ecafd0b,
.elementor-1012 .elementor-element-fd667cf,
.elementor-1012 .elementor-element-9059d58 {
  --display: flex !important;
  --flex-direction: column !important;
  --justify-content: flex-end !important;
  --align-items: stretch !important;
  --gap: 8px !important;
  --padding-top: 20px !important;
  --padding-bottom: 20px !important;
  --padding-left: 20px !important;
  --padding-right: 20px !important;
  --border-radius: 12px !important;
  border-radius: 12px !important;
  min-height: 234px !important;
  height: 234px !important;
  position: relative !important;
  overflow: hidden !important;
  text-decoration: none !important;
  color: inherit !important;
  box-shadow: none !important;
}
.elementor-1012 .elementor-element-7fef9af::before,
.elementor-1012 .elementor-element-ecafd0b::before,
.elementor-1012 .elementor-element-fd667cf::before,
.elementor-1012 .elementor-element-9059d58::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}
.elementor-1012 .elementor-element-7fef9af:not(.elementor-motion-effects-element-type-background),
.elementor-1012 .elementor-element-7fef9af > .elementor-motion-effects-container > .elementor-motion-effects-layer {
  background-image: url("/wp-content/uploads/2025/10/Professional-CCTV-and-surveillance-systems.webp") !important;
  background-size: cover !important;
  background-position: center !important;
}
.elementor-1012 .elementor-element-ecafd0b:not(.elementor-motion-effects-element-type-background),
.elementor-1012 .elementor-element-ecafd0b > .elementor-motion-effects-container > .elementor-motion-effects-layer {
  background-image: url("/wp-content/uploads/2025/10/Reliable-Access-Control-systems.webp") !important;
  background-size: cover !important;
  background-position: center !important;
}
.elementor-1012 .elementor-element-fd667cf:not(.elementor-motion-effects-element-type-background),
.elementor-1012 .elementor-element-fd667cf > .elementor-motion-effects-container > .elementor-motion-effects-layer {
  background-image: url("/wp-content/uploads/2025/10/Fire-safety-systems-compliance.webp") !important;
  background-size: cover !important;
  background-position: center !important;
}
.elementor-1012 .elementor-element-9059d58:not(.elementor-motion-effects-element-type-background),
.elementor-1012 .elementor-element-9059d58 > .elementor-motion-effects-container > .elementor-motion-effects-layer {
  background-image: url("/wp-content/uploads/2026/08/security/card-trust.jpg") !important;
  background-size: cover !important;
  background-position: center !important;
}
.elementor-1012 .elementor-element-7fef9af::before,
.elementor-1012 .elementor-element-ecafd0b::before,
.elementor-1012 .elementor-element-fd667cf::before {
  background: rgba(0, 47, 64, 0.5);
  mix-blend-mode: hard-light;
}
.elementor-1012 .elementor-element-9059d58::before {
  background: rgba(155, 234, 232, 0.85);
}
.elementor-1012 .elementor-element-7fef9af > *,
.elementor-1012 .elementor-element-ecafd0b > *,
.elementor-1012 .elementor-element-fd667cf > *,
.elementor-1012 .elementor-element-9059d58 > * {
  position: relative;
  z-index: 1;
}
.elementor-1012 .elementor-element-ed01830 .elementor-icon-box-wrapper,
.elementor-1012 .elementor-element-f3751df .elementor-icon-box-wrapper,
.elementor-1012 .elementor-element-4aed714 .elementor-icon-box-wrapper {
  display: flex !important;
  flex-direction: column !important;
  align-items: flex-start !important;
  justify-content: flex-end !important;
  gap: 4px !important;
  width: 100% !important;
  min-height: 100% !important;
}
.elementor-1012 .elementor-element-ed01830 .elementor-icon-box-title,
.elementor-1012 .elementor-element-f3751df .elementor-icon-box-title,
.elementor-1012 .elementor-element-4aed714 .elementor-icon-box-title,
.elementor-1012 .elementor-element-ed01830 .elementor-icon-box-title a,
.elementor-1012 .elementor-element-f3751df .elementor-icon-box-title a,
.elementor-1012 .elementor-element-4aed714 .elementor-icon-box-title a {
  margin: 0 !important;
  font-family: "DM Sans", sans-serif !important;
  font-size: 32px !important;
  font-weight: 600 !important;
  line-height: 1.1 !important;
  letter-spacing: -0.64px;
  color: #feffff !important;
}
.elementor-1012 .elementor-element-ed01830 .elementor-icon-box-description,
.elementor-1012 .elementor-element-f3751df .elementor-icon-box-description,
.elementor-1012 .elementor-element-4aed714 .elementor-icon-box-description {
  margin: 0 !important;
  font-family: "DM Sans", sans-serif !important;
  font-size: 16px !important;
  font-weight: 400 !important;
  line-height: 1.5 !important;
  color: #e5f5fb !important;
}
.elementor-1012 .elementor-element-350aecb,
.elementor-1012 .elementor-element-54ef6e9,
.elementor-1012 .elementor-element-547229c {
  margin-top: auto !important;
  align-self: flex-end !important;
  width: auto !important;
}
.elementor-1012 .elementor-element-350aecb img,
.elementor-1012 .elementor-element-54ef6e9 img,
.elementor-1012 .elementor-element-547229c img {
  display: block !important;
  width: 56px !important;
  height: 56px !important;
}
.elementor-1012 .elementor-element-9059d58 {
  --justify-content: flex-end !important;
}
.elementor-1012 .elementor-element-9059d58 p,
.elementor-1012 .elementor-element-8bc6640 p {
  margin: 0 !important;
  font-family: "DM Sans", sans-serif !important;
  font-size: 20px !important;
  font-weight: 500 !important;
  line-height: 1.4 !important;
  letter-spacing: -0.4px;
  color: #feffff !important;
}
.elementor-1012 .elementor-element-7b00094 {
  --padding-bottom: 0 !important;
  padding-bottom: 0 !important;
  overflow: visible !important;
  position: relative;
  z-index: 2;
}
.elementor-1012 .elementor-element-7b00094::after {
  content: "";
  display: block;
  width: 100vw;
  max-width: 100vw;
  height: 84px;
  margin-left: calc(50% - 50vw);
  background: url("/wp-content/uploads/2026/08/security/strip-to-dark.svg") center / 100% 84px no-repeat;
}`;

css = css.replace(
  /\/\* Why service cards row \*\/[\s\S]*?color: #4f545b !important;\n\}/,
  whyPatch
);

const darkFeaturePatch = `/* ========== Feature sections (CCTV / Access / Fire) — Figma dark band ========== */
.elementor-1012 .elementor-element.elementor-element-3e576a1,
.elementor-1012 .elementor-element-3e576a1,
.elementor-1012 .elementor-element.elementor-element-98abfe4,
.elementor-1012 .elementor-element-98abfe4,
.elementor-1012 .elementor-element.elementor-element-3c19722,
.elementor-1012 .elementor-element-3c19722 {
  --display: flex !important;
  --flex-direction: row !important;
  --flex-wrap: wrap !important;
  --align-items: center !important;
  --justify-content: space-between !important;
  --gap: 48px !important;
  --padding-top: 80px !important;
  --padding-bottom: 80px !important;
  --padding-left: 120px !important;
  --padding-right: 120px !important;
  --content-width: 1200px !important;
  --container-max-width: 1200px !important;
  --margin-top: 0 !important;
  margin: 0 !important;
  background-color: #001015 !important;
  background-image: none !important;
  position: relative;
  z-index: 1;
  overflow: visible !important;
}
.elementor-1012 .elementor-element-3e576a1:not(.elementor-motion-effects-element-type-background),
.elementor-1012 .elementor-element-98abfe4:not(.elementor-motion-effects-element-type-background),
.elementor-1012 .elementor-element-3c19722:not(.elementor-motion-effects-element-type-background),
.elementor-1012 .elementor-element-3e576a1 > .elementor-motion-effects-container > .elementor-motion-effects-layer,
.elementor-1012 .elementor-element-98abfe4 > .elementor-motion-effects-container > .elementor-motion-effects-layer,
.elementor-1012 .elementor-element-3c19722 > .elementor-motion-effects-container > .elementor-motion-effects-layer {
  background-color: #001015 !important;
  background-image: none !important;
}
.elementor-1012 .elementor-element-3c19722 {
  --padding-bottom: 0 !important;
  padding-bottom: 0 !important;
}
.elementor-1012 .elementor-element-3c19722::after {
  content: "";
  display: block;
  width: 100vw;
  max-width: 100vw;
  height: 84px;
  margin-left: calc(50% - 50vw);
  transform: rotate(180deg);
  background: url("/wp-content/uploads/2026/08/security/strip-to-light.svg") center / 100% 84px no-repeat;
}`;

css = css.replace(
  /\/\* ========== Feature sections \(CCTV \/ Access \/ Fire\) ========== \*\/[\s\S]*?background-image: none !important;\n\}/,
  darkFeaturePatch
);

css = css.replace(
  /\/\* Alternating light band for Access \*\/[\s\S]*?background-image: none !important;\n\}/,
  ''
);

css = css.replace(
  /\.elementor-1012 \.elementor-element-73dd386 h2,\n\.elementor-1012 \.elementor-element-73dd386 p,\n\.elementor-1012 \.elementor-element-80753b1 h2,\n\.elementor-1012 \.elementor-element-80753b1 p,\n\.elementor-1012 \.elementor-element-3c4394e h2,\n\.elementor-1012 \.elementor-element-3c4394e p {\n  margin: 0 !important;\n  font-family: "DM Sans", sans-serif !important;\n  font-size: 40px !important;\n  font-weight: 600 !important;\n  line-height: 1\.15 !important;\n  letter-spacing: -0\.8px;\n  color: #232932 !important;\n}/,
  `.elementor-1012 .elementor-element-73dd386 h2,
.elementor-1012 .elementor-element-80753b1 h2,
.elementor-1012 .elementor-element-3c4394e h2 {
  margin: 0 !important;
  font-family: "DM Sans", sans-serif !important;
  font-size: 48px !important;
  font-weight: 600 !important;
  line-height: 1.1 !important;
  letter-spacing: -0.96px;
  color: #ffffff !important;
}
.elementor-1012 .elementor-element-73dd386 p,
.elementor-1012 .elementor-element-80753b1 p,
.elementor-1012 .elementor-element-3c4394e p {
  margin: 0 !important;
  color: #ffffff !important;
}`
);

css = css.replace(
  /\.elementor-1012 \.elementor-element-d4c8e35 p,\n\.elementor-1012 \.elementor-element-dfc9659 p,\n\.elementor-1012 \.elementor-element-24b8aad p,\n\.elementor-1012 \.elementor-element-fa2fe5a p,\n\.elementor-1012 \.elementor-element-6a47010 p,\n\.elementor-1012 \.elementor-element-5c5fdb8 p,\n\.elementor-1012 \.elementor-element-ef883e9 p {\n  margin: 0 !important;\n  font-family: "DM Sans", sans-serif !important;\n  font-size: 16px !important;\n  font-weight: 400 !important;\n  line-height: 1\.5 !important;\n  color: #4f545b !important;\n}/,
  `.elementor-1012 .elementor-element-d4c8e35 p,
.elementor-1012 .elementor-element-dfc9659 p,
.elementor-1012 .elementor-element-24b8aad p,
.elementor-1012 .elementor-element-fa2fe5a p,
.elementor-1012 .elementor-element-6a47010 p,
.elementor-1012 .elementor-element-5c5fdb8 p,
.elementor-1012 .elementor-element-ef883e9 p {
  margin: 0 !important;
  font-family: "DM Sans", sans-serif !important;
  font-size: 16px !important;
  font-weight: 400 !important;
  line-height: 1.5 !important;
  color: #ffffff !important;
}`
);

css = css.replace(
  /\.elementor-1012 \.elementor-element-9b49f9d \.elementor-image-box-title,[\s\S]*?color: #232932 !important;\n\}/,
  (block) => block.replace(/color: #232932 !important;/g, 'color: #ffffff !important;')
);

css = css.replace(
  /\/\* Secondary buttons \*\/[\s\S]*?color: #007eaa !important;\n\}/,
  `/* Dark-section CTA rows — horizontal (Figma screenshot 4) */
.elementor-1012 .elementor-element-7a57416,
.elementor-1012 .elementor-element-2a6c0b6,
.elementor-1012 .elementor-element-f6bc70a {
  --display: flex !important;
  --flex-direction: row !important;
  --flex-wrap: wrap !important;
  --align-items: center !important;
  --gap: 12px !important;
  display: flex !important;
  flex-direction: row !important;
  flex-wrap: wrap !important;
  align-items: center !important;
  gap: 12px !important;
  width: 100% !important;
}
.elementor-1012 .elementor-element-7a57416 > .elementor-widget-button,
.elementor-1012 .elementor-element-2a6c0b6 > .elementor-widget-button,
.elementor-1012 .elementor-element-f6bc70a > .elementor-widget-button {
  width: auto !important;
  max-width: 100% !important;
  flex: 0 0 auto !important;
}
.elementor-1012 .elementor-element-e5050ce .elementor-button,
.elementor-1012 .elementor-element-70d10a4 .elementor-button,
.elementor-1012 .elementor-element-c004cfe .elementor-button {
  background-color: transparent !important;
  border: 1px solid #fbd337 !important;
  border-radius: 8px !important;
  padding: 8px 16px !important;
  font-family: "DM Sans", sans-serif !important;
  font-size: 16px !important;
  font-weight: 600 !important;
  line-height: 24px !important;
  color: #fbd337 !important;
  fill: #fbd337 !important;
}
.elementor-1012 .elementor-element-2792ad7 .elementor-button,
.elementor-1012 .elementor-element-671c807 .elementor-button,
.elementor-1012 .elementor-element-e2a703a .elementor-button {
  background-color: rgba(248, 199, 5, 0.1) !important;
  border: none !important;
  border-radius: 8px !important;
  padding: 8px 16px !important;
  font-family: "DM Sans", sans-serif !important;
  font-size: 16px !important;
  font-weight: 600 !important;
  line-height: 24px !important;
  color: #f8c705 !important;
  fill: #f8c705 !important;
}
.elementor-1012 .elementor-element-2792ad7 .elementor-button-content-wrapper,
.elementor-1012 .elementor-element-671c807 .elementor-button-content-wrapper,
.elementor-1012 .elementor-element-e2a703a .elementor-button-content-wrapper {
  display: inline-flex !important;
  flex-direction: row !important;
  align-items: center !important;
  gap: 4px !important;
}
.elementor-1012 .elementor-element-d70283d .elementor-button,
.elementor-1012 .elementor-element-6a91247 .elementor-button,
.elementor-1012 .elementor-element-49cb974 .elementor-button,
.elementor-1012 .elementor-element-32a5f38 .elementor-button {
  background-color: transparent !important;
  border: 1px solid #007eaa !important;
  border-radius: 8px !important;
  padding: 8px 16px !important;
  font-family: "DM Sans", sans-serif !important;
  font-size: 16px !important;
  font-weight: 600 !important;
  line-height: 24px !important;
  color: #007eaa !important;
}`
);

css = css.replace(
  /height: 424px !important;/g,
  'height: 440px !important;'
);

css = css.replace(
  /\.elementor-1012 \.elementor-element-757df9f h2,\n\.elementor-1012 \.elementor-element-757df9f p,\n\.elementor-1012 \.elementor-element-757df9f \.elementor-heading-title {\n  margin: 0 !important;\n  font-family: "DM Sans", sans-serif !important;\n  font-size: 40px !important;/,
  `.elementor-1012 .elementor-element-757df9f h2,
.elementor-1012 .elementor-element-757df9f p,
.elementor-1012 .elementor-element-757df9f .elementor-heading-title {
  margin: 0 !important;
  font-family: "DM Sans", sans-serif !important;
  font-size: 48px !important;`
);

css = css.replace(
  /\.elementor-1012 \.elementor-element-29d0900 > \.e-con-inner {[\s\S]*?gap: 48px !important;/,
  `.elementor-1012 .elementor-element-29d0900 > .e-con-inner {
  max-width: 1200px !important;
  width: 100% !important;
  margin: 0 auto !important;
  padding: 0 !important;
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 80px !important;`
);

css = css.replace(
  /\.elementor-1012 \.elementor-element-d42a909 h2,\n\.elementor-1012 \.elementor-element-d42a909 \.elementor-heading-title {\n  margin: 0 !important;\n  font-family: "DM Sans", sans-serif !important;\n  font-size: 40px !important;/,
  `.elementor-1012 .elementor-element-d42a909 h2,
.elementor-1012 .elementor-element-d42a909 .elementor-heading-title {
  margin: 0 !important;
  font-family: "DM Sans", sans-serif !important;
  font-size: 48px !important;`
);

css = css.replace(
  /\.elementor-1012 \.elementor-element-b82885e {\n  --width: 360px !important;\n  width: 360px !important;/,
  `.elementor-1012 .elementor-element-b82885e {
  --width: 486px !important;
  width: 486px !important;`
);

css = css.replace(
  /flex: 0 1 360px !important;/,
  'flex: 0 1 486px !important;'
);

css = css.replace(
  /\.elementor-1012 \.elementor-element-56abb83 img {\n  display: block !important;\n  width: 100% !important;\n  height: 424px !important;/,
  `.elementor-1012 .elementor-element-56abb83 img {
  display: block !important;
  width: 100% !important;
  height: 400px !important;`
);

fs.writeFileSync(cssPath, css);
console.log('patched', cssPath, css.length, 'bytes');

const mobile = `
/* ========== Page shell + responsive (Figma 42:693) ========== */
.elementor-1012 {
  overflow-x: clip;
  max-width: 100%;
}

@media (max-width: 1024px) {
  .elementor-1012 .elementor-element-7fef9af,
  .elementor-1012 .elementor-element-ecafd0b,
  .elementor-1012 .elementor-element-fd667cf,
  .elementor-1012 .elementor-element-9059d58 {
    flex: 1 1 calc(50% - 12px) !important;
    min-width: calc(50% - 12px) !important;
  }
}

@media (max-width: 767px) {
  .elementor-1012 .elementor-element-49758d4 {
    --flex-direction: column !important;
    flex-direction: column !important;
    --gap: 24px !important;
    gap: 24px !important;
  }
  .elementor-1012 .elementor-element-cd7106d,
  .elementor-1012 .elementor-element-8fcd360 {
    width: 100% !important;
    max-width: 100% !important;
    flex: 1 1 100% !important;
  }
  .elementor-1012 .elementor-element-7fef9af,
  .elementor-1012 .elementor-element-ecafd0b,
  .elementor-1012 .elementor-element-fd667cf,
  .elementor-1012 .elementor-element-9059d58 {
    flex: 1 1 100% !important;
    min-width: 100% !important;
    height: auto !important;
    min-height: 200px !important;
  }
  .elementor-1012 .elementor-element-ed01830 .elementor-icon-box-title,
  .elementor-1012 .elementor-element-f3751df .elementor-icon-box-title,
  .elementor-1012 .elementor-element-4aed714 .elementor-icon-box-title {
    font-size: 24px !important;
  }
  .elementor-1012 .elementor-element-29d0900 > .e-con-inner {
    gap: 32px !important;
  }
  .elementor-1012 .elementor-element-b82885e {
    width: 100% !important;
    flex: 1 1 100% !important;
  }
}
`;

if (!css.includes('Page shell + responsive')) {
  fs.appendFileSync(cssPath, mobile);
  console.log('appended mobile overrides');
}
