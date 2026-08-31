/**
 * Append land-specific Figma overrides after seeded smart-homes rules.
 * Why section, 6th service card, commercial IDs, why-choose-us, CTA extras.
 */
import fs from 'node:fs';

const path = 'public/css/page-design/landscaping-services.css';
let css = fs.readFileSync(path, 'utf8');

// Button id differs on landscaping
css = css.replaceAll(
  '.elementor-898 .elementor-element-83a7415',
  '.elementor-898 .elementor-element-a8e04bc',
);

// Commercial card container + children (land IDs)
css = css.replaceAll(
  '.elementor-898 .elementor-element-f56e493',
  '.elementor-898 .elementor-element-5a390e7',
);
css = css.replaceAll(
  '.elementor-898 .elementor-element-11d7b1d',
  '.elementor-898 .elementor-element-0949057',
);
css = css.replaceAll(
  '.elementor-898 .elementor-element-fa93ca3',
  '.elementor-898 .elementor-element-54f37c0',
);
css = css.replaceAll(
  '.elementor-898 .elementor-element-40ac2d5',
  '.elementor-898 .elementor-element-dceab10',
);
css = css.replaceAll(
  '.elementor-898 .elementor-element-00cf857',
  '.elementor-898 .elementor-element-cd216a8',
);
css = css.replaceAll(
  '.elementor-898 .elementor-element-7b7ba07',
  '.elementor-898 .elementor-element-5995ec9',
);
css = css.replaceAll(
  '.elementor-898 .elementor-element-45304a7',
  '.elementor-898 .elementor-element-9677f80',
);

const append = `
/* ========== Landscaping Why (Figma 641:7308) — replaces smart-homes Why IDs ========== */
.elementor-898 .elementor-element.elementor-element-7b00094,
.elementor-898 .elementor-element-7b00094 {
  --display: flex !important;
  --flex-direction: column !important;
  --align-items: stretch !important;
  --gap: 80px !important;
  --row-gap: 80px !important;
  --column-gap: 80px !important;
  --padding-top: 80px !important;
  --padding-bottom: 80px !important;
  --padding-left: 120px !important;
  --padding-right: 120px !important;
  --content-width: 1200px !important;
  --container-max-width: 1200px !important;
  --width: 100% !important;
  background-color: #fefeff !important;
  background-image: none !important;
}

.elementor-898 .elementor-element-7b00094:not(.elementor-motion-effects-element-type-background),
.elementor-898 .elementor-element-7b00094 > .elementor-motion-effects-container > .elementor-motion-effects-layer {
  background-color: #fefeff !important;
  background-image: none !important;
}

.elementor-898 .elementor-element.elementor-element-7b00094 > .e-con-inner,
.elementor-898 .elementor-element-7b00094 > .e-con-inner {
  max-width: 1200px !important;
  width: 100% !important;
  margin-left: auto !important;
  margin-right: auto !important;
  padding-left: 0 !important;
  padding-right: 0 !important;
  padding-inline: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 80px !important;
  box-sizing: border-box;
}

.elementor-898 .elementor-element-49758d4 {
  --display: flex !important;
  --flex-direction: row !important;
  --flex-wrap: wrap !important;
  --align-items: flex-start !important;
  --gap: 24px !important;
  --row-gap: 24px !important;
  --column-gap: 24px !important;
  --width: 100% !important;
  --padding-top: 0 !important;
  --padding-bottom: 0 !important;
  --padding-left: 0 !important;
  --padding-right: 0 !important;
  width: 100% !important;
}

.elementor-898 .elementor-element-cd7106d,
.elementor-898 .elementor-element-4b6f456 {
  --display: flex !important;
  --flex-direction: column !important;
  --align-items: flex-start !important;
  --gap: 8px !important;
  --width: 100% !important;
  --padding-top: 0 !important;
  --padding-bottom: 0 !important;
  --padding-left: 0 !important;
  --padding-right: 0 !important;
  flex: 1 1 0 !important;
  min-width: 0 !important;
}

@media (min-width: 1025px) {
  .elementor-898 .elementor-element-cd7106d,
  .elementor-898 .elementor-element-4b6f456 {
    --width: calc((100% - 24px) / 2) !important;
    width: calc((100% - 24px) / 2) !important;
    max-width: calc((100% - 24px) / 2) !important;
    flex: 1 1 0 !important;
  }
}

.elementor-898 .elementor-element-5037849 {
  width: 100%;
  margin: 0 !important;
  padding: 0 !important;
}

.elementor-898 .elementor-element-5037849 h2,
.elementor-898 .elementor-element-5037849 p,
.elementor-898 .elementor-element-5037849 .elementor-heading-title {
  margin: 0 !important;
  font-family: "DM Sans", sans-serif !important;
  font-size: 48px !important;
  font-weight: 600 !important;
  line-height: 1.1 !important;
  letter-spacing: -0.96px;
  color: #232932 !important;
}

.elementor-898 .elementor-element-5037849 span {
  background-image: linear-gradient(170deg, #04b5f2 0%, #f8c705 100%) !important;
  -webkit-background-clip: text !important;
  background-clip: text !important;
  color: transparent !important;
  -webkit-text-fill-color: transparent !important;
}

.elementor-898 .elementor-element-0f953a5,
.elementor-898 .elementor-element-3788773 {
  width: 100%;
  margin: 0 !important;
  padding: 0 !important;
}

.elementor-898 .elementor-element-0f953a5 p,
.elementor-898 .elementor-element-3788773 p {
  margin: 0 !important;
  font-family: "DM Sans", sans-serif !important;
  font-size: 16px !important;
  font-weight: 400 !important;
  line-height: 1.5 !important;
  color: #4f545b !important;
}

.elementor-898 .elementor-element-4b6f456 {
  --gap: 24px !important;
}

.elementor-898 .elementor-element-e90ac9d,
.elementor-898 .elementor-element-d0c374b,
.elementor-898 .elementor-element-387d0ce,
.elementor-898 .elementor-element-82d62e4 {
  width: 100% !important;
  margin: 0 0 4px 0 !important;
  padding: 0 !important;
  background: transparent !important;
}

.elementor-898 .elementor-element-82d62e4 {
  margin-bottom: 0 !important;
}

.elementor-898 .elementor-element-e90ac9d .elementor-image-box-wrapper,
.elementor-898 .elementor-element-d0c374b .elementor-image-box-wrapper,
.elementor-898 .elementor-element-387d0ce .elementor-image-box-wrapper,
.elementor-898 .elementor-element-82d62e4 .elementor-image-box-wrapper {
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  gap: 4px !important;
  width: 100% !important;
  text-align: start !important;
}

.elementor-898 .elementor-element-e90ac9d .elementor-image-box-img,
.elementor-898 .elementor-element-d0c374b .elementor-image-box-img,
.elementor-898 .elementor-element-387d0ce .elementor-image-box-img,
.elementor-898 .elementor-element-82d62e4 .elementor-image-box-img {
  width: 20px !important;
  min-width: 20px !important;
  max-width: 20px !important;
  margin: 0 !important;
  flex: 0 0 20px !important;
}

.elementor-898 .elementor-element-e90ac9d .elementor-image-box-img img,
.elementor-898 .elementor-element-d0c374b .elementor-image-box-img img,
.elementor-898 .elementor-element-387d0ce .elementor-image-box-img img,
.elementor-898 .elementor-element-82d62e4 .elementor-image-box-img img {
  width: 20px !important;
  height: 20px !important;
  display: block !important;
  content: url("/wp-content/uploads/2026/08/landscaping/check-circle.svg");
}

.elementor-898 .elementor-element-e90ac9d .elementor-image-box-title,
.elementor-898 .elementor-element-d0c374b .elementor-image-box-title,
.elementor-898 .elementor-element-387d0ce .elementor-image-box-title,
.elementor-898 .elementor-element-82d62e4 .elementor-image-box-title {
  margin: 0 !important;
  font-family: "DM Sans", sans-serif !important;
  font-size: 16px !important;
  font-weight: 400 !important;
  line-height: 1.5 !important;
  color: #232932 !important;
}

.elementor-898 .elementor-element-d887d2e {
  width: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
}

.elementor-898 .elementor-element-d887d2e img {
  display: block !important;
  width: 100% !important;
  height: 250px !important;
  object-fit: cover !important;
  border-radius: 12px !important;
}

.elementor-898 .elementor-element-402678f {
  display: none !important;
}

/* 6th service card — Garden maintenance */
.elementor-898 .elementor-element-83bb049 {
  --display: flex !important;
  --flex-direction: column !important;
  --justify-content: flex-start !important;
  --align-items: stretch !important;
  --gap: 16px !important;
  --width: 100% !important;
  --padding-top: 20px !important;
  --padding-bottom: 20px !important;
  --padding-left: 20px !important;
  --padding-right: 20px !important;
  --border-radius: 12px !important;
  border-radius: 12px !important;
  overflow: hidden;
  background-color: #feffff !important;
  box-shadow: none !important;
}

.elementor-898 .elementor-element-83bb049:not(.elementor-motion-effects-element-type-background),
.elementor-898 .elementor-element-83bb049 > .elementor-motion-effects-container > .elementor-motion-effects-layer {
  background-color: #feffff !important;
  background-image: none !important;
}

.elementor-898 .elementor-element-e6baa0f {
  width: 100%;
  margin: 0 !important;
  padding: 0 !important;
}

.elementor-898 .elementor-element-e6baa0f .elementor-icon-box-wrapper {
  display: flex !important;
  flex-direction: column !important;
  align-items: flex-start !important;
  text-align: start !important;
  gap: 8px;
}

.elementor-898 .elementor-element-e6baa0f .elementor-icon-box-icon {
  display: none !important;
}

.elementor-898 .elementor-element-e6baa0f .elementor-icon-box-title,
.elementor-898 .elementor-element-e6baa0f .elementor-icon-box-title a {
  color: #232932 !important;
  font-family: "DM Sans", sans-serif !important;
  font-size: 20px !important;
  font-weight: 500 !important;
  line-height: 1.4 !important;
  letter-spacing: -0.4px;
  margin: 0 !important;
}

.elementor-898 .elementor-element-e6baa0f .elementor-icon-box-description {
  color: #4f545b !important;
  font-family: "DM Sans", sans-serif !important;
  font-size: 14px !important;
  font-weight: 400 !important;
  line-height: 1.5 !important;
  margin: 0 !important;
}

@media (min-width: 1025px) {
  /* Figma: row1 = intro 486 + 2 cards; row2 = 4 equal cards (incl. maintenance) */
  .elementor-898 .elementor-element-83bb049 {
    --width: calc((100% - 72px) / 4) !important;
    width: calc((100% - 72px) / 4) !important;
    max-width: calc((100% - 72px) / 4) !important;
    flex: 1 1 0 !important;
  }
  .elementor-898 .elementor-element-150b31a,
  .elementor-898 .elementor-element-8e0cbca,
  .elementor-898 .elementor-element-c119902 {
    --width: calc((100% - 72px) / 4) !important;
    width: calc((100% - 72px) / 4) !important;
    max-width: calc((100% - 72px) / 4) !important;
  }
}

/* Hide duplicate emergency CTA button in right column */
.elementor-898 .elementor-element-69d4945 {
  display: none !important;
}

/* CTA checklist items */
.elementor-898 .elementor-element-475c605,
.elementor-898 .elementor-element-811276e,
.elementor-898 .elementor-element-5a660ec {
  width: 100% !important;
  margin: 0 0 4px 0 !important;
  padding: 0 !important;
  background: transparent !important;
}

.elementor-898 .elementor-element-5a660ec {
  margin-bottom: 0 !important;
}

.elementor-898 .elementor-element-475c605 .elementor-image-box-wrapper,
.elementor-898 .elementor-element-811276e .elementor-image-box-wrapper,
.elementor-898 .elementor-element-5a660ec .elementor-image-box-wrapper {
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  gap: 4px !important;
}

.elementor-898 .elementor-element-475c605 .elementor-image-box-img,
.elementor-898 .elementor-element-811276e .elementor-image-box-img,
.elementor-898 .elementor-element-5a660ec .elementor-image-box-img {
  width: 20px !important;
  min-width: 20px !important;
  margin: 0 !important;
  flex: 0 0 20px !important;
}

.elementor-898 .elementor-element-475c605 .elementor-image-box-img img,
.elementor-898 .elementor-element-811276e .elementor-image-box-img img,
.elementor-898 .elementor-element-5a660ec .elementor-image-box-img img {
  width: 20px !important;
  height: 20px !important;
  content: url("/wp-content/uploads/2026/08/landscaping/check-circle.svg");
  filter: brightness(0) invert(1);
}

.elementor-898 .elementor-element-475c605 .elementor-image-box-title,
.elementor-898 .elementor-element-811276e .elementor-image-box-title,
.elementor-898 .elementor-element-5a660ec .elementor-image-box-title {
  margin: 0 !important;
  font-family: "DM Sans", sans-serif !important;
  font-size: 16px !important;
  font-weight: 400 !important;
  line-height: 1.5 !important;
  color: #ffffff !important;
}

/* ========== Why choose us ========== */
.elementor-898 .elementor-element.elementor-element-3e576a1,
.elementor-898 .elementor-element-3e576a1 {
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
  background-color: #fefeff !important;
  background-image: none !important;
}

.elementor-898 .elementor-element-3e576a1 > .e-con-inner {
  max-width: 1200px !important;
  width: 100% !important;
  margin: 0 auto !important;
  padding: 0 !important;
  display: flex !important;
  flex-direction: row !important;
  flex-wrap: wrap !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 48px !important;
}

.elementor-898 .elementor-element-ba6612e {
  --width: 486px !important;
  width: 486px !important;
  max-width: 100% !important;
  flex: 0 0 auto !important;
  overflow: hidden !important;
  border-radius: 24px !important;
}

.elementor-898 .elementor-element-3eafa76 img {
  display: block !important;
  width: 100% !important;
  height: 424px !important;
  object-fit: cover !important;
  border-radius: 24px !important;
}

.elementor-898 .elementor-element-49c0bdc {
  --width: 588px !important;
  width: 588px !important;
  max-width: 100% !important;
  flex: 1 1 320px !important;
  --display: flex !important;
  --flex-direction: column !important;
  --gap: 16px !important;
}

.elementor-898 .elementor-element-d7a9614 h2,
.elementor-898 .elementor-element-d7a9614 p,
.elementor-898 .elementor-element-d7a9614 .elementor-heading-title {
  margin: 0 !important;
  font-family: "DM Sans", sans-serif !important;
  font-size: 48px !important;
  font-weight: 600 !important;
  line-height: 1.1 !important;
  letter-spacing: -0.96px;
  color: #232932 !important;
}

.elementor-898 .elementor-element-d7a9614 span {
  background-image: linear-gradient(170deg, #04b5f2 0%, #f8c705 100%) !important;
  -webkit-background-clip: text !important;
  background-clip: text !important;
  color: transparent !important;
  -webkit-text-fill-color: transparent !important;
}

.elementor-898 .elementor-element-304be1e,
.elementor-898 .elementor-element-b5d7e84,
.elementor-898 .elementor-element-bd6a28f,
.elementor-898 .elementor-element-90919ba,
.elementor-898 .elementor-element-765ee80,
.elementor-898 .elementor-element-539faf5,
.elementor-898 .elementor-element-45ec791 {
  width: 100% !important;
  margin: 0 0 4px 0 !important;
  padding: 0 !important;
  background: transparent !important;
}

.elementor-898 .elementor-element-45ec791 {
  margin-bottom: 8px !important;
}

.elementor-898 .elementor-element-304be1e .elementor-image-box-wrapper,
.elementor-898 .elementor-element-b5d7e84 .elementor-image-box-wrapper,
.elementor-898 .elementor-element-bd6a28f .elementor-image-box-wrapper,
.elementor-898 .elementor-element-90919ba .elementor-image-box-wrapper,
.elementor-898 .elementor-element-765ee80 .elementor-image-box-wrapper,
.elementor-898 .elementor-element-539faf5 .elementor-image-box-wrapper,
.elementor-898 .elementor-element-45ec791 .elementor-image-box-wrapper {
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  gap: 4px !important;
}

.elementor-898 .elementor-element-304be1e .elementor-image-box-img,
.elementor-898 .elementor-element-b5d7e84 .elementor-image-box-img,
.elementor-898 .elementor-element-bd6a28f .elementor-image-box-img,
.elementor-898 .elementor-element-90919ba .elementor-image-box-img,
.elementor-898 .elementor-element-765ee80 .elementor-image-box-img,
.elementor-898 .elementor-element-539faf5 .elementor-image-box-img,
.elementor-898 .elementor-element-45ec791 .elementor-image-box-img {
  width: 20px !important;
  min-width: 20px !important;
  margin: 0 !important;
  flex: 0 0 20px !important;
}

.elementor-898 .elementor-element-304be1e .elementor-image-box-img img,
.elementor-898 .elementor-element-b5d7e84 .elementor-image-box-img img,
.elementor-898 .elementor-element-bd6a28f .elementor-image-box-img img,
.elementor-898 .elementor-element-90919ba .elementor-image-box-img img,
.elementor-898 .elementor-element-765ee80 .elementor-image-box-img img,
.elementor-898 .elementor-element-539faf5 .elementor-image-box-img img,
.elementor-898 .elementor-element-45ec791 .elementor-image-box-img img {
  width: 20px !important;
  height: 20px !important;
  content: url("/wp-content/uploads/2026/08/landscaping/check-circle.svg");
}

.elementor-898 .elementor-element-304be1e .elementor-image-box-title,
.elementor-898 .elementor-element-b5d7e84 .elementor-image-box-title,
.elementor-898 .elementor-element-bd6a28f .elementor-image-box-title,
.elementor-898 .elementor-element-90919ba .elementor-image-box-title,
.elementor-898 .elementor-element-765ee80 .elementor-image-box-title,
.elementor-898 .elementor-element-539faf5 .elementor-image-box-title,
.elementor-898 .elementor-element-45ec791 .elementor-image-box-title {
  margin: 0 !important;
  font-family: "DM Sans", sans-serif !important;
  font-size: 16px !important;
  font-weight: 400 !important;
  line-height: 1.5 !important;
  color: #232932 !important;
}

.elementor-898 .elementor-element-61e9b6b .elementor-button {
  background-color: #fbd337 !important;
  border: none !important;
  border-radius: 8px !important;
  padding: 8px 16px !important;
  font-family: "DM Sans", sans-serif !important;
  font-size: 16px !important;
  font-weight: 600 !important;
  line-height: 24px !important;
  color: #003f55 !important;
}

.elementor-898 .elementor-element-2a96341 {
  display: none !important;
}

/* Hide icon boxes icons on service cards (Figma text-only cards) */
.elementor-898 .elementor-element-2bef8ec .elementor-icon-box-icon,
.elementor-898 .elementor-element-6d15dfa .elementor-icon-box-icon,
.elementor-898 .elementor-element-bd86ded .elementor-icon-box-icon,
.elementor-898 .elementor-element-a0da4e3 .elementor-icon-box-icon,
.elementor-898 .elementor-element-eb49023 .elementor-icon-box-icon {
  display: none !important;
}

.elementor-898 .elementor-element-843c593,
.elementor-898 .elementor-element-2dc0f4e,
.elementor-898 .elementor-element-150b31a,
.elementor-898 .elementor-element-8e0cbca,
.elementor-898 .elementor-element-c119902,
.elementor-898 .elementor-element-83bb049 {
  min-height: 152px;
}

/* FAQ + form spacing */
.elementor-898 .elementor-element-12949db,
.elementor-898 .elementor-element-2ec48f1 {
  --padding-left: 120px !important;
  --padding-right: 120px !important;
}

@media (max-width: 1024px) {
  .elementor-898 .elementor-element.elementor-element-7b00094,
  .elementor-898 .elementor-element-7b00094,
  .elementor-898 .elementor-element.elementor-element-3e576a1,
  .elementor-898 .elementor-element-3e576a1,
  .elementor-898 .elementor-element-12949db,
  .elementor-898 .elementor-element-2ec48f1 {
    --padding-left: 40px !important;
    --padding-right: 40px !important;
  }

  .elementor-898 .elementor-element-5037849 h2,
  .elementor-898 .elementor-element-5037849 p,
  .elementor-898 .elementor-element-d7a9614 h2,
  .elementor-898 .elementor-element-d7a9614 p {
    font-size: 36px !important;
  }

  .elementor-898 .elementor-element-ba6612e,
  .elementor-898 .elementor-element-49c0bdc {
    width: 100% !important;
    max-width: 100% !important;
    --width: 100% !important;
  }

  .elementor-898 .elementor-element-3eafa76 img {
    height: auto !important;
    aspect-ratio: 486 / 424;
  }
}

@media (max-width: 767px) {
  .elementor-898 .elementor-element.elementor-element-7b00094,
  .elementor-898 .elementor-element-7b00094,
  .elementor-898 .elementor-element.elementor-element-3e576a1,
  .elementor-898 .elementor-element-3e576a1,
  .elementor-898 .elementor-element-12949db,
  .elementor-898 .elementor-element-2ec48f1 {
    --padding-left: 20px !important;
    --padding-right: 20px !important;
  }

  .elementor-898 .elementor-element-7b00094 {
    --padding-top: 48px !important;
    --padding-bottom: 48px !important;
    --gap: 40px !important;
  }

  .elementor-898 .elementor-element-5037849 h2,
  .elementor-898 .elementor-element-5037849 p,
  .elementor-898 .elementor-element-d7a9614 h2,
  .elementor-898 .elementor-element-d7a9614 p {
    font-size: 32px !important;
  }

  .elementor-898 .elementor-element-d887d2e img {
    height: 180px !important;
  }

  .elementor-898 .elementor-element-83bb049 {
    --width: 100% !important;
    width: 100% !important;
    max-width: 100%;
    flex: 0 0 100%;
  }
}
`;

// Strip obsolete smart-homes Why block references that don't exist on land (keep harmless),
// then append land overrides.
if (!css.includes('Landscaping Why (Figma 641:7308)')) {
  css += '\n' + append;
}

fs.writeFileSync(path, css);
console.log('Updated', path, 'bytes', css.length);
