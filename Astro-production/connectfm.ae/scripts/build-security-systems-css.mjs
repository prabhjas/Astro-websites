/**
 * Build /security/ page-design CSS from landscaping overlay patterns.
 * Content stays unchanged — Elementor IDs mapped for elementor-1012 only.
 */
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const out = `/**
 * Security Systems (/security/) — Figma visual system (node 42:693)
 * Style/layout only. Existing page content is the source of truth.
 */

/* ========== Hero ========== */
.elementor-1012 .elementor-element.elementor-element-7fd1049.hero_sec,
.elementor-1012 .elementor-element-7fd1049.hero_sec {
  --display: flex !important;
  --flex-direction: column !important;
  --justify-content: flex-end !important;
  --align-items: flex-start !important;
  --gap: 24px;
  --min-height: 696px;
  min-height: 696px;
  --padding-top: 209px !important;
  --padding-bottom: 80px !important;
  --padding-left: 0 !important;
  --padding-right: 0 !important;
  position: relative;
  overflow: hidden;
}

.elementor-1012 .elementor-element-7fd1049.hero_sec:not(.elementor-motion-effects-element-type-background),
.elementor-1012 .elementor-element-7fd1049.hero_sec > .elementor-motion-effects-container > .elementor-motion-effects-layer {
  background-image: url("/wp-content/uploads/2026/08/security/security-Hero.png") !important;
  background-position: center center !important;
  background-repeat: no-repeat !important;
  background-size: cover !important;
}

.elementor-1012 .elementor-element-7fd1049.hero_sec > .e-con-inner {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  padding-left: 120px;
  padding-right: 120px;
  box-sizing: border-box;
}

.elementor-1012 .elementor-element-4a698b4 {
  --display: flex !important;
  --flex-direction: column !important;
  --justify-content: flex-end !important;
  --align-items: flex-start !important;
  --gap: 24px !important;
  --width: 100% !important;
  max-width: 879px;
}

/* Breadcrumb */
.elementor-1012 .elementor-element-96b7826 {
  display: block !important;
  width: 100%;
}
.elementor-1012 .elementor-element-96b7826 > .elementor-widget-container {
  padding: 0 0 20px 0 !important;
}
.elementor-1012 .elementor-element-96b7826 .ekit-breadcrumb {
  font-family: "DM Sans", sans-serif !important;
  font-size: 18px !important;
  font-weight: 500 !important;
  line-height: 1.3em !important;
  justify-content: start !important;
  flex-wrap: wrap;
}
.elementor-1012 .elementor-element-96b7826 .ekit-breadcrumb > li:not(.brd_sep),
.elementor-1012 .elementor-element-96b7826 .ekit-breadcrumb > li > a,
.elementor-1012 .elementor-element-96b7826 .ekit-breadcrumb > li:hover > a {
  color: #ffffff !important;
}
.elementor-1012 .elementor-element-96b7826 .ekit-breadcrumb > li:is(.brd_sep) {
  color: #fbd337 !important;
}

/* Badge */
.elementor-1012 .elementor-element-5616656 {
  width: auto !important;
  max-width: 100%;
  text-align: start !important;
}
.elementor-1012 .elementor-element-5616656 img {
  display: block;
  width: auto;
  max-width: 280px;
  height: auto;
}

/* H1 + intro + CTA */
.elementor-1012 .elementor-element-d9ce90c {
  width: 100%;
  margin: 0 !important;
}
.elementor-1012 .elementor-element-d9ce90c h1,
.elementor-1012 .elementor-element-d9ce90c p,
.elementor-1012 .elementor-element-d9ce90c .elementor-heading-title {
  margin: 0 !important;
  font-family: "DM Sans", sans-serif !important;
  font-size: 64px !important;
  font-weight: 600 !important;
  line-height: 1.2 !important;
  letter-spacing: -1.28px;
  color: #ffffff !important;
}
.elementor-1012 .elementor-element-4c13f5f {
  margin: 0 !important;
  max-width: 792px;
}
.elementor-1012 .elementor-element-4c13f5f p {
  margin: 0 !important;
  font-family: "DM Sans", sans-serif !important;
  font-size: 16px !important;
  font-weight: 400 !important;
  line-height: 1.5 !important;
  color: #e9eaea !important;
}
.elementor-1012 .elementor-element-127e0fc .elementor-button {
  background-color: #fbd337 !important;
  border: none !important;
  border-radius: 8px !important;
  padding: 8px 16px !important;
  font-family: "DM Sans", sans-serif !important;
  font-size: 16px !important;
  font-weight: 600 !important;
  line-height: 24px !important;
  color: #003f55 !important;
  fill: #003f55;
}

/* ========== Why Security Systems Matters ========== */
.elementor-1012 .elementor-element.elementor-element-7b00094,
.elementor-1012 .elementor-element-7b00094 {
  --display: flex !important;
  --flex-direction: column !important;
  --gap: 40px !important;
  --padding-top: 80px !important;
  --padding-bottom: 80px !important;
  --padding-left: 120px !important;
  --padding-right: 120px !important;
  --content-width: 1200px !important;
  --container-max-width: 1200px !important;
  background-color: #fefeff !important;
  background-image: none !important;
}
.elementor-1012 .elementor-element-7b00094:not(.elementor-motion-effects-element-type-background),
.elementor-1012 .elementor-element-7b00094 > .elementor-motion-effects-container > .elementor-motion-effects-layer {
  background-color: #fefeff !important;
  background-image: none !important;
}
.elementor-1012 .elementor-element-7b00094 > .e-con-inner {
  max-width: 1200px !important;
  width: 100% !important;
  margin: 0 auto !important;
  padding: 80px 0px !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 40px !important;
}
.elementor-1012 .elementor-element-49758d4 {
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
.elementor-1012 .elementor-element-cd7106d,
.elementor-1012 .elementor-element-8fcd360 {
  --width: 100% !important;
  flex: 1 1 320px !important;
  min-width: 0 !important;
}
.elementor-1012 .elementor-element-ce6d229 h2,
.elementor-1012 .elementor-element-ce6d229 p,
.elementor-1012 .elementor-element-ce6d229 .elementor-heading-title {
  margin: 0 !important;
  font-family: "DM Sans", sans-serif !important;
  font-size: 48px !important;
  font-weight: 600 !important;
  line-height: 1.1 !important;
  letter-spacing: -0.96px;
  color: #232932 !important;
}
.elementor-1012 .elementor-element-3c7fa7a p {
  margin: 0 !important;
  font-family: "DM Sans", sans-serif !important;
  font-size: 16px !important;
  font-weight: 400 !important;
  line-height: 1.5 !important;
  color: #4f545b !important;
}

/* Why service cards row */
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
.elementor-1012 .elementor-element-7fef9af,
.elementor-1012 .elementor-element-ecafd0b,
.elementor-1012 .elementor-element-fd667cf {
  --display: flex !important;
  --flex-direction: column !important;
  --gap: 16px !important;
  --padding-top: 20px !important;
  --padding-bottom: 20px !important;
  --padding-left: 20px !important;
  --padding-right: 20px !important;
  --border-radius: 12px !important;
  border-radius: 12px !important;
  background-color: #feffff !important;
  background-image: none !important;
  box-shadow: 0 1px 2px rgba(0, 32, 43, 0.06);
  flex: 1 1 280px !important;
  min-width: 0 !important;
  overflow: hidden !important;
}
.elementor-1012 .elementor-element-7fef9af:not(.elementor-motion-effects-element-type-background),
.elementor-1012 .elementor-element-ecafd0b:not(.elementor-motion-effects-element-type-background),
.elementor-1012 .elementor-element-fd667cf:not(.elementor-motion-effects-element-type-background),
.elementor-1012 .elementor-element-7fef9af > .elementor-motion-effects-container > .elementor-motion-effects-layer,
.elementor-1012 .elementor-element-ecafd0b > .elementor-motion-effects-container > .elementor-motion-effects-layer,
.elementor-1012 .elementor-element-fd667cf > .elementor-motion-effects-container > .elementor-motion-effects-layer {
  background-color: #feffff !important;
  background-image: none !important;
}
.elementor-1012 .elementor-element-ed01830 .elementor-icon-box-title,
.elementor-1012 .elementor-element-f3751df .elementor-icon-box-title,
.elementor-1012 .elementor-element-4aed714 .elementor-icon-box-title,
.elementor-1012 .elementor-element-ed01830 .elementor-icon-box-title a,
.elementor-1012 .elementor-element-f3751df .elementor-icon-box-title a,
.elementor-1012 .elementor-element-4aed714 .elementor-icon-box-title a {
  margin: 0 !important;
  font-family: "DM Sans", sans-serif !important;
  font-size: 20px !important;
  font-weight: 500 !important;
  line-height: 1.4 !important;
  color: #232932 !important;
}
.elementor-1012 .elementor-element-ed01830 .elementor-icon-box-description,
.elementor-1012 .elementor-element-f3751df .elementor-icon-box-description,
.elementor-1012 .elementor-element-4aed714 .elementor-icon-box-description {
  margin: 0 !important;
  font-family: "DM Sans", sans-serif !important;
  font-size: 14px !important;
  font-weight: 400 !important;
  line-height: 1.5 !important;
  color: #4f545b !important;
}
.elementor-1012 .elementor-element-9059d58 p,
.elementor-1012 .elementor-element-8bc6640 p {
  margin: 0 !important;
  font-family: "DM Sans", sans-serif !important;
  font-size: 16px !important;
  line-height: 1.5 !important;
  color: #4f545b !important;
}

/* ========== Feature sections (CCTV / Access / Fire) ========== */
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
  --gap: 48px !important;
  --padding-top: 80px !important;
  --padding-bottom: 80px !important;
  --padding-left: 120px !important;
  --padding-right: 120px !important;
  --content-width: 1200px !important;
  --container-max-width: 1200px !important;
  --margin-top: 0 !important;
  margin: 0 !important;
  background-color: #fefeff !important;
  background-image: none !important;
  position: relative;
  z-index: 1;
}
.elementor-1012 .elementor-element-3e576a1:not(.elementor-motion-effects-element-type-background),
.elementor-1012 .elementor-element-98abfe4:not(.elementor-motion-effects-element-type-background),
.elementor-1012 .elementor-element-3c19722:not(.elementor-motion-effects-element-type-background),
.elementor-1012 .elementor-element-3e576a1 > .elementor-motion-effects-container > .elementor-motion-effects-layer,
.elementor-1012 .elementor-element-98abfe4 > .elementor-motion-effects-container > .elementor-motion-effects-layer,
.elementor-1012 .elementor-element-3c19722 > .elementor-motion-effects-container > .elementor-motion-effects-layer {
  background-color: #fefeff !important;
  background-image: none !important;
}
.elementor-1012 .elementor-element-3e576a1 > .e-con-inner,
.elementor-1012 .elementor-element-98abfe4 > .e-con-inner,
.elementor-1012 .elementor-element-3c19722 > .e-con-inner {
  max-width: 1200px !important;
  width: 100% !important;
  margin: 0 auto !important;
  padding: 0 !important;
  display: flex !important;
  flex-direction: row !important;
  flex-wrap: wrap !important;
  align-items: center !important;
  gap: 48px !important;
}

/* Alternating light band for Access */
.elementor-1012 .elementor-element.elementor-element-98abfe4,
.elementor-1012 .elementor-element-98abfe4 {
  background-color: #e5f5fb !important;
}
.elementor-1012 .elementor-element-98abfe4:not(.elementor-motion-effects-element-type-background),
.elementor-1012 .elementor-element-98abfe4 > .elementor-motion-effects-container > .elementor-motion-effects-layer {
  background-color: #e5f5fb !important;
  background-image: none !important;
}

.elementor-1012 .elementor-element-49c0bdc,
.elementor-1012 .elementor-element-12ec755,
.elementor-1012 .elementor-element-75e801d {
  --display: flex !important;
  --flex-direction: column !important;
  --gap: 16px !important;
  --width: 100% !important;
  flex: 1 1 420px !important;
  min-width: 0 !important;
}
.elementor-1012 .elementor-element-ba6612e,
.elementor-1012 .elementor-element-e3262ed,
.elementor-1012 .elementor-element-fbae4cc {
  --width: 486px !important;
  width: 486px !important;
  max-width: 100% !important;
  flex: 0 0 auto !important;
  overflow: hidden !important;
  border-radius: 24px !important;
}
.elementor-1012 .elementor-element-3eafa76 img,
.elementor-1012 .elementor-element-942b2e3 img,
.elementor-1012 .elementor-element-bf9d087 img {
  display: block !important;
  width: 100% !important;
  height: 424px !important;
  object-fit: cover !important;
  border-radius: 24px !important;
}

.elementor-1012 .elementor-element-73dd386 h2,
.elementor-1012 .elementor-element-73dd386 p,
.elementor-1012 .elementor-element-80753b1 h2,
.elementor-1012 .elementor-element-80753b1 p,
.elementor-1012 .elementor-element-3c4394e h2,
.elementor-1012 .elementor-element-3c4394e p {
  margin: 0 !important;
  font-family: "DM Sans", sans-serif !important;
  font-size: 40px !important;
  font-weight: 600 !important;
  line-height: 1.15 !important;
  letter-spacing: -0.8px;
  color: #232932 !important;
}
.elementor-1012 .elementor-element-d4c8e35 p,
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
  color: #4f545b !important;
}

/* Checklist image-boxes */
.elementor-1012 .elementor-element-9b49f9d,
.elementor-1012 .elementor-element-7d3ea79,
.elementor-1012 .elementor-element-07d9370,
.elementor-1012 .elementor-element-9b3f16e,
.elementor-1012 .elementor-element-165e123,
.elementor-1012 .elementor-element-f8c78f9,
.elementor-1012 .elementor-element-00be955,
.elementor-1012 .elementor-element-8d2f53e,
.elementor-1012 .elementor-element-3f03e81,
.elementor-1012 .elementor-element-4884aea,
.elementor-1012 .elementor-element-8a63bdc,
.elementor-1012 .elementor-element-030c598,
.elementor-1012 .elementor-element-605f71d,
.elementor-1012 .elementor-element-dfc8f71,
.elementor-1012 .elementor-element-a4bc684,
.elementor-1012 .elementor-element-10ab244,
.elementor-1012 .elementor-element-8a3c739,
.elementor-1012 .elementor-element-4a71f68,
.elementor-1012 .elementor-element-e99a84a {
  width: 100% !important;
  margin: 0 0 4px 0 !important;
  padding: 0 !important;
  background: transparent !important;
}
.elementor-1012 .elementor-element-9b49f9d .elementor-image-box-wrapper,
.elementor-1012 .elementor-element-7d3ea79 .elementor-image-box-wrapper,
.elementor-1012 .elementor-element-07d9370 .elementor-image-box-wrapper,
.elementor-1012 .elementor-element-9b3f16e .elementor-image-box-wrapper,
.elementor-1012 .elementor-element-165e123 .elementor-image-box-wrapper,
.elementor-1012 .elementor-element-f8c78f9 .elementor-image-box-wrapper,
.elementor-1012 .elementor-element-00be955 .elementor-image-box-wrapper,
.elementor-1012 .elementor-element-8d2f53e .elementor-image-box-wrapper,
.elementor-1012 .elementor-element-3f03e81 .elementor-image-box-wrapper,
.elementor-1012 .elementor-element-4884aea .elementor-image-box-wrapper,
.elementor-1012 .elementor-element-8a63bdc .elementor-image-box-wrapper,
.elementor-1012 .elementor-element-030c598 .elementor-image-box-wrapper,
.elementor-1012 .elementor-element-605f71d .elementor-image-box-wrapper,
.elementor-1012 .elementor-element-dfc8f71 .elementor-image-box-wrapper,
.elementor-1012 .elementor-element-a4bc684 .elementor-image-box-wrapper,
.elementor-1012 .elementor-element-10ab244 .elementor-image-box-wrapper,
.elementor-1012 .elementor-element-8a3c739 .elementor-image-box-wrapper,
.elementor-1012 .elementor-element-4a71f68 .elementor-image-box-wrapper,
.elementor-1012 .elementor-element-e99a84a .elementor-image-box-wrapper {
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  gap: 4px !important;
  text-align: start !important;
}
.elementor-1012 .elementor-element-9b49f9d .elementor-image-box-img,
.elementor-1012 .elementor-element-7d3ea79 .elementor-image-box-img,
.elementor-1012 .elementor-element-07d9370 .elementor-image-box-img,
.elementor-1012 .elementor-element-9b3f16e .elementor-image-box-img,
.elementor-1012 .elementor-element-165e123 .elementor-image-box-img,
.elementor-1012 .elementor-element-f8c78f9 .elementor-image-box-img,
.elementor-1012 .elementor-element-00be955 .elementor-image-box-img,
.elementor-1012 .elementor-element-8d2f53e .elementor-image-box-img,
.elementor-1012 .elementor-element-3f03e81 .elementor-image-box-img,
.elementor-1012 .elementor-element-4884aea .elementor-image-box-img,
.elementor-1012 .elementor-element-8a63bdc .elementor-image-box-img,
.elementor-1012 .elementor-element-030c598 .elementor-image-box-img,
.elementor-1012 .elementor-element-605f71d .elementor-image-box-img,
.elementor-1012 .elementor-element-dfc8f71 .elementor-image-box-img,
.elementor-1012 .elementor-element-a4bc684 .elementor-image-box-img,
.elementor-1012 .elementor-element-10ab244 .elementor-image-box-img,
.elementor-1012 .elementor-element-8a3c739 .elementor-image-box-img,
.elementor-1012 .elementor-element-4a71f68 .elementor-image-box-img,
.elementor-1012 .elementor-element-e99a84a .elementor-image-box-img {
  width: 20px !important;
  min-width: 20px !important;
  margin: 0 !important;
  flex: 0 0 20px !important;
}
.elementor-1012 .elementor-element-9b49f9d .elementor-image-box-img img,
.elementor-1012 .elementor-element-7d3ea79 .elementor-image-box-img img,
.elementor-1012 .elementor-element-07d9370 .elementor-image-box-img img,
.elementor-1012 .elementor-element-9b3f16e .elementor-image-box-img img,
.elementor-1012 .elementor-element-165e123 .elementor-image-box-img img,
.elementor-1012 .elementor-element-f8c78f9 .elementor-image-box-img img,
.elementor-1012 .elementor-element-00be955 .elementor-image-box-img img,
.elementor-1012 .elementor-element-8d2f53e .elementor-image-box-img img,
.elementor-1012 .elementor-element-3f03e81 .elementor-image-box-img img,
.elementor-1012 .elementor-element-4884aea .elementor-image-box-img img,
.elementor-1012 .elementor-element-8a63bdc .elementor-image-box-img img,
.elementor-1012 .elementor-element-030c598 .elementor-image-box-img img,
.elementor-1012 .elementor-element-605f71d .elementor-image-box-img img,
.elementor-1012 .elementor-element-dfc8f71 .elementor-image-box-img img,
.elementor-1012 .elementor-element-a4bc684 .elementor-image-box-img img,
.elementor-1012 .elementor-element-10ab244 .elementor-image-box-img img,
.elementor-1012 .elementor-element-8a3c739 .elementor-image-box-img img,
.elementor-1012 .elementor-element-4a71f68 .elementor-image-box-img img,
.elementor-1012 .elementor-element-e99a84a .elementor-image-box-img img {
  width: 20px !important;
  height: 20px !important;
  display: block !important;
}
.elementor-1012 .elementor-element-9b49f9d .elementor-image-box-title,
.elementor-1012 .elementor-element-7d3ea79 .elementor-image-box-title,
.elementor-1012 .elementor-element-07d9370 .elementor-image-box-title,
.elementor-1012 .elementor-element-9b3f16e .elementor-image-box-title,
.elementor-1012 .elementor-element-165e123 .elementor-image-box-title,
.elementor-1012 .elementor-element-f8c78f9 .elementor-image-box-title,
.elementor-1012 .elementor-element-00be955 .elementor-image-box-title,
.elementor-1012 .elementor-element-8d2f53e .elementor-image-box-title,
.elementor-1012 .elementor-element-3f03e81 .elementor-image-box-title,
.elementor-1012 .elementor-element-4884aea .elementor-image-box-title,
.elementor-1012 .elementor-element-8a63bdc .elementor-image-box-title,
.elementor-1012 .elementor-element-030c598 .elementor-image-box-title,
.elementor-1012 .elementor-element-605f71d .elementor-image-box-title {
  margin: 0 !important;
  font-family: "DM Sans", sans-serif !important;
  font-size: 16px !important;
  font-weight: 400 !important;
  line-height: 1.5 !important;
  color: #ffffff !important;
}

/* Secondary buttons */
.elementor-1012 .elementor-element-e5050ce .elementor-button,
.elementor-1012 .elementor-element-70d10a4 .elementor-button,
.elementor-1012 .elementor-element-c004cfe .elementor-button,
.elementor-1012 .elementor-element-d70283d .elementor-button,
.elementor-1012 .elementor-element-49cb974 .elementor-button,
.elementor-1012 .elementor-element-6a91247 .elementor-button,
.elementor-1012 .elementor-element-32a5f38 .elementor-button {
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
.elementor-1012 .elementor-element-2792ad7 .elementor-button,
.elementor-1012 .elementor-element-671c807 .elementor-button,
.elementor-1012 .elementor-element-e2a703a .elementor-button {
  background-color: transparent !important;
  border: 1px solid #007eaa !important;
  border-radius: 8px !important;
  padding: 8px 16px !important;
  font-family: "DM Sans", sans-serif !important;
  font-size: 16px !important;
  font-weight: 600 !important;
  line-height: 24px !important;
  color: #007eaa !important;
}

/* Hide decorative duplicates */
.elementor-1012 .elementor-element-2a96341,
.elementor-1012 .elementor-element-68ed96d,
.elementor-1012 .elementor-element-7fa6c0b,
.elementor-1012 .elementor-element-81403dd {
  display: none !important;
}

/* ========== Why choose us ========== */
.elementor-1012 .elementor-element.elementor-element-f783d93,
.elementor-1012 .elementor-element-f783d93 {
  --display: flex !important;
  --flex-direction: row !important;
  --flex-wrap: wrap !important;
  --align-items: center !important;
  --gap: 48px !important;
  --padding-top: 80px !important;
  --padding-bottom: 80px !important;
  --padding-left: 120px !important;
  --padding-right: 120px !important;
  --content-width: 1200px !important;
  background-color: #fefeff !important;
  background-image: none !important;
}
.elementor-1012 .elementor-element-f783d93 > .e-con-inner {
  max-width: 1200px !important;
  width: 100% !important;
  margin: 0 auto !important;
  padding: 80px 0 !important;
  display: flex !important;
  flex-wrap: wrap !important;
  align-items: center !important;
  gap: 48px !important;
}
.elementor-1012 .elementor-element-01c98c7 {
  --width: 486px !important;
  width: 486px !important;
  max-width: 100% !important;
  flex: 0 0 auto !important;
  border-radius: 24px !important;
  overflow: hidden !important;
}
.elementor-1012 .elementor-element-56abb83 img {
  display: block !important;
  width: 100% !important;
  height: 424px !important;
  object-fit: cover !important;
  border-radius: 24px !important;
}
.elementor-1012 .elementor-element-7a13106 {
  --display: flex !important;
  --flex-direction: column !important;
  --gap: 16px !important;
  flex: 1 1 320px !important;
  min-width: 0 !important;
}
.elementor-1012 .elementor-element-757df9f h2,
.elementor-1012 .elementor-element-757df9f p,
.elementor-1012 .elementor-element-757df9f .elementor-heading-title {
  margin: 0 !important;
  font-family: "DM Sans", sans-serif !important;
  font-size: 40px !important;
  font-weight: 600 !important;
  line-height: 1.15 !important;
  letter-spacing: -0.8px;
  color: #232932 !important;
}
.elementor-1012 .elementor-element-f783d93 .elementor-image-box-title {
  margin: 0 !important;
  font-family: "DM Sans", sans-serif !important;
  font-size: 16px !important;
  font-weight: 400 !important;
  line-height: 1.5 !important;
  color: #232932 !important;
}

/* ========== FAQ ========== */
.elementor-1012 .elementor-element.elementor-element-29d0900,
.elementor-1012 .elementor-element-29d0900 {
  --display: flex !important;
  --flex-direction: row !important;
  --flex-wrap: wrap !important;
  --gap: 48px !important;
  --padding-top: 80px !important;
  --padding-bottom: 80px !important;
  --padding-left: 120px !important;
  --padding-right: 120px !important;
  --content-width: 1200px !important;
  background-color: #fefeff !important;
}
.elementor-1012 .elementor-element-29d0900 > .e-con-inner {
  max-width: 1200px !important;
  width: 100% !important;
  margin: 0 auto !important;
  padding: 0 !important;
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 48px !important;
  align-items: flex-start !important;
}
.elementor-1012 .elementor-element-b82885e {
  --width: 360px !important;
  width: 360px !important;
  max-width: 100% !important;
  flex: 0 1 360px !important;
  --display: flex !important;
  --flex-direction: column !important;
  --gap: 16px !important;
}
.elementor-1012 .elementor-element-80a8d44 {
  flex: 1 1 420px !important;
  min-width: 0 !important;
}
.elementor-1012 .elementor-element-d42a909 h2,
.elementor-1012 .elementor-element-d42a909 .elementor-heading-title {
  margin: 0 !important;
  font-family: "DM Sans", sans-serif !important;
  font-size: 40px !important;
  font-weight: 600 !important;
  line-height: 1.15 !important;
  color: #232932 !important;
}
.elementor-1012 .elementor-element-ebba029 p,
.elementor-1012 .elementor-element-eb0c61a p {
  margin: 0 !important;
  font-family: "DM Sans", sans-serif !important;
  font-size: 16px !important;
  color: #4f545b !important;
}
.elementor-1012 .elementor-element-1772403.elementor-widget-n-accordion,
.elementor-1012 .elementor-element-1772403 {
  --n-accordion-title-icon-order: 1;
  --n-accordion-border-width: 0px;
  --n-accordion-border-color: transparent;
  --n-accordion-border-style: none;
  --n-accordion-border-radius: 12px;
  --n-accordion-item-title-space-between: 12px;
  --n-accordion-item-title-distance-from-content: 0px;
  --n-accordion-padding: 20px;
  --n-accordion-icon-gap: 0 16px;
}
.elementor-1012 .elementor-element-1772403 .e-n-accordion {
  border: none !important;
}
.elementor-1012 .elementor-element-1772403 .e-n-accordion-item {
  background: transparent !important;
  border: none !important;
  border-radius: 12px !important;
  margin: 0 0 8px 0 !important;
  box-shadow: none !important;
  outline: none !important;
}
.elementor-1012 .elementor-element-1772403 .e-n-accordion-item[open] {
  background: #e5f5fb !important;
}
.elementor-1012 .elementor-element-1772403 .e-n-accordion-item-title,
.elementor-1012 .elementor-element-1772403 summary {
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 16px !important;
  list-style: none !important;
  font-family: "DM Sans", sans-serif !important;
  font-size: 16px !important;
  font-weight: 600 !important;
  line-height: 1.4 !important;
  color: #232932 !important;
  padding: 20px !important;
  border: none !important;
  border-bottom: none !important;
  box-shadow: none !important;
  cursor: pointer;
}
.elementor-1012 .elementor-element-1772403 .e-n-accordion-item-title::-webkit-details-marker,
.elementor-1012 .elementor-element-1772403 summary::-webkit-details-marker {
  display: none !important;
}
.elementor-1012 .elementor-element-1772403 .e-n-accordion-item-title-header {
  order: 1 !important;
  flex: 1 1 auto !important;
  min-width: 0 !important;
  margin: 0 !important;
}
.elementor-1012 .elementor-element-1772403 .e-n-accordion-item-title-text {
  margin: 0 !important;
  font-size: inherit !important;
  font-weight: inherit !important;
  line-height: inherit !important;
  color: inherit !important;
}
.elementor-1012 .elementor-element-1772403 .e-n-accordion-item-title-icon {
  order: 2 !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  flex: 0 0 auto !important;
  width: 16px !important;
  height: 16px !important;
  margin: 0 !important;
  color: #232932 !important;
}
.elementor-1012 .elementor-element-1772403 .e-n-accordion-item-title-icon svg {
  width: 12px !important;
  height: 12px !important;
  fill: #232932 !important;
}
.elementor-1012 .elementor-element-1772403 .e-n-accordion-item > .e-con,
.elementor-1012 .elementor-element-1772403 .e-n-accordion-item > .e-n-accordion-item-content {
  border: none !important;
  border-top: none !important;
  box-shadow: none !important;
}
.elementor-1012 .elementor-element-3ebb61c,
.elementor-1012 .elementor-element-d9dcac8,
.elementor-1012 .elementor-element-701d870,
.elementor-1012 .elementor-element-ae102a5,
.elementor-1012 .elementor-element-42ce5cf,
.elementor-1012 .elementor-element-0452053 {
  font-family: "DM Sans", sans-serif !important;
  font-size: 16px !important;
  font-weight: 400 !important;
  line-height: 1.5 !important;
  color: #4f545b !important;
  padding: 0 20px 20px 20px !important;
  border: none !important;
}
.elementor-1012 .elementor-element-3ebb61c p,
.elementor-1012 .elementor-element-d9dcac8 p,
.elementor-1012 .elementor-element-701d870 p,
.elementor-1012 .elementor-element-ae102a5 p,
.elementor-1012 .elementor-element-42ce5cf p,
.elementor-1012 .elementor-element-0452053 p {
  margin: 0 !important;
  color: inherit !important;
  font-size: inherit !important;
  font-weight: inherit !important;
}

/* ========== Booking form (same structure as working pages / Figma Contact Form) ========== */
.elementor-1012 .elementor-element.elementor-element-2ec48f1,
.elementor-1012 .elementor-element-2ec48f1 {
  --display: flex !important;
  --flex-direction: column !important;
  --padding-top: 80px !important;
  --padding-bottom: 80px !important;
  --padding-left: 120px !important;
  --padding-right: 120px !important;
  --content-width: 1200px !important;
  background-color: #e5f5fb !important;
}
.elementor-1012 .elementor-element-2ec48f1:not(.elementor-motion-effects-element-type-background),
.elementor-1012 .elementor-element-2ec48f1 > .elementor-motion-effects-container > .elementor-motion-effects-layer {
  background-color: #e5f5fb !important;
  background-image: url("/wp-content/uploads/2025/10/Contact-Form-bkg.png") !important;
  background-position: bottom center !important;
  background-repeat: no-repeat !important;
  background-size: cover !important;
}
.elementor-1012 .elementor-element-2ec48f1 > .e-con-inner {
  max-width: 1200px !important;
  width: 100% !important;
  margin: 0 auto !important;
  padding: 0 !important;
  display: flex !important;
  flex-direction: column !important;
}
.elementor-1012 .elementor-element-539e0db {
  --display: flex !important;
  --flex-direction: row !important;
  --flex-wrap: wrap !important;
  --align-items: stretch !important;
  --gap: 24px !important;
  --border-radius: 40px !important;
  --padding-top: 40px !important;
  --padding-bottom: 40px !important;
  --padding-left: 40px !important;
  --padding-right: 40px !important;
  --width: 100% !important;
  width: 100% !important;
  border-radius: 40px !important;
  background-color: #feffff !important;
  overflow: hidden !important;
}
.elementor-1012 .elementor-element-539e0db:not(.elementor-motion-effects-element-type-background),
.elementor-1012 .elementor-element-539e0db > .elementor-motion-effects-container > .elementor-motion-effects-layer {
  background-color: #feffff !important;
  background-image: none !important;
}
.elementor-1012 .elementor-element-fe332f0 {
  --display: flex !important;
  --flex-direction: column !important;
  --gap: 16px !important;
  --padding-top: 0 !important;
  --padding-bottom: 0 !important;
  --padding-left: 0 !important;
  --padding-right: 24px !important;
  --width: 55% !important;
  width: 55% !important;
  max-width: 100% !important;
  flex: 1 1 480px !important;
  min-width: 0 !important;
  align-items: flex-start !important;
  text-align: left !important;
}
.elementor-1012 .elementor-element-a0d83aa,
.elementor-1012 .elementor-element-a0d83aa h2,
.elementor-1012 .elementor-element-a0d83aa p,
.elementor-1012 .elementor-element-a0d83aa .elementor-heading-title {
  margin: 0 !important;
  font-family: "DM Sans", sans-serif !important;
  font-size: 48px !important;
  font-weight: 600 !important;
  line-height: 1.1 !important;
  letter-spacing: -0.96px;
  color: #232932 !important;
  text-align: left !important;
}
.elementor-1012 .elementor-element-2c091a2 {
  margin: 0 !important;
  text-align: left !important;
}
.elementor-1012 .elementor-element-2c091a2 p {
  margin: 0 !important;
  font-family: "DM Sans", sans-serif !important;
  font-size: 16px !important;
  font-weight: 400 !important;
  line-height: 1.5 !important;
  color: #4f545b !important;
  text-align: left !important;
}
.elementor-1012 .elementor-element-184588d {
  margin: 16px 0 0 0 !important;
  text-align: left !important;
}
.elementor-1012 .elementor-element-184588d p {
  margin: 0 !important;
  font-family: "DM Sans", sans-serif !important;
  font-size: 20px !important;
  font-weight: 500 !important;
  line-height: 1.4 !important;
  letter-spacing: -0.4px;
  color: #232932 !important;
  text-align: left !important;
}
.elementor-1012 .elementor-element-32a5f38 {
  margin: 10px 0 0 0 !important;
  padding: 0 !important;
  width: auto !important;
  align-self: flex-start !important;
}
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
  fill: #007eaa !important;
}
.elementor-1012 .elementor-element-de6feb1 {
  --display: flex !important;
  --flex-direction: row !important;
  --flex-wrap: wrap !important;
  --align-items: flex-start !important;
  --gap: 24px !important;
  --padding-top: 24px !important;
  --padding-bottom: 0 !important;
  --padding-left: 0 !important;
  --padding-right: 0 !important;
  --width: 100% !important;
  width: 100% !important;
  margin-top: 8px !important;
  border-top: 1px solid #e9eaea !important;
  padding-top: 24px !important;
  display: flex !important;
  flex-direction: row !important;
  flex-wrap: wrap !important;
  gap: 24px !important;
}
.elementor-1012 .elementor-element-535f030,
.elementor-1012 .elementor-element-bac7426 {
  flex: 1 1 200px !important;
  min-width: 0 !important;
  margin: 0 !important;
  text-align: left !important;
}
.elementor-1012 .elementor-element-535f030 .elementor-icon-box-wrapper,
.elementor-1012 .elementor-element-bac7426 .elementor-icon-box-wrapper {
  display: flex !important;
  flex-direction: row !important;
  align-items: flex-start !important;
  gap: 14px !important;
  text-align: left !important;
}
.elementor-1012 .elementor-element-535f030 .elementor-icon-box-icon,
.elementor-1012 .elementor-element-bac7426 .elementor-icon-box-icon {
  margin: 0 !important;
  flex: 0 0 30px !important;
}
.elementor-1012 .elementor-element-535f030 .elementor-icon-box-title,
.elementor-1012 .elementor-element-bac7426 .elementor-icon-box-title,
.elementor-1012 .elementor-element-535f030 .elementor-icon-box-title a,
.elementor-1012 .elementor-element-bac7426 .elementor-icon-box-title a {
  margin: 0 0 10px 0 !important;
  font-family: "DM Sans", sans-serif !important;
  font-size: 20px !important;
  font-weight: 500 !important;
  line-height: 1.4 !important;
  letter-spacing: -0.4px;
  color: #232932 !important;
  text-align: left !important;
}
.elementor-1012 .elementor-element-535f030 .elementor-icon-box-description,
.elementor-1012 .elementor-element-bac7426 .elementor-icon-box-description,
.elementor-1012 .elementor-element-535f030 .elementor-icon-box-description a,
.elementor-1012 .elementor-element-bac7426 .elementor-icon-box-description a {
  margin: 0 !important;
  font-family: "DM Sans", sans-serif !important;
  font-size: 16px !important;
  font-weight: 400 !important;
  line-height: 1.5 !important;
  color: #7b7f84 !important;
  text-align: left !important;
}
.elementor-1012 .elementor-element-4174e11 {
  --display: flex !important;
  --flex-direction: column !important;
  --border-radius: 20px !important;
  --padding-top: 20px !important;
  --padding-bottom: 20px !important;
  --padding-left: 20px !important;
  --padding-right: 20px !important;
  --width: 42% !important;
  width: 42% !important;
  max-width: 100% !important;
  flex: 0 1 464px !important;
  min-width: 280px !important;
  border-radius: 20px !important;
  background-color: #f9f9fb !important;
  overflow: visible !important;
}
.elementor-1012 .elementor-element-4174e11:not(.elementor-motion-effects-element-type-background),
.elementor-1012 .elementor-element-4174e11 > .elementor-motion-effects-container > .elementor-motion-effects-layer {
  background-color: #f9f9fb !important;
  background-image: none !important;
}
.elementor-1012 .elementor-element-fc832e8,
.elementor-1012 .elementor-element-fc832e8 .main-form {
  width: 100% !important;
}
.elementor-1012 .elementor-element-fc832e8 label,
.elementor-1012 .elementor-element-fc832e8 label.blue_text {
  font-family: "DM Sans", sans-serif !important;
  font-size: 16px !important;
  font-weight: 400 !important;
  line-height: 1.5 !important;
  color: #7b7f84 !important;
}
.elementor-1012 .elementor-element-fc832e8 input[type="text"],
.elementor-1012 .elementor-element-fc832e8 input[type="email"],
.elementor-1012 .elementor-element-fc832e8 input[type="tel"],
.elementor-1012 .elementor-element-fc832e8 textarea,
.elementor-1012 .elementor-element-fc832e8 select {
  font-family: "DM Sans", sans-serif !important;
  font-size: 20px !important;
  font-weight: 500 !important;
  color: #232932 !important;
  background: transparent !important;
}

/* ========== Responsive ========== */
@media (max-width: 1024px) {
  .elementor-1012 .elementor-element-7fd1049.hero_sec > .e-con-inner,
  .elementor-1012 .elementor-element.elementor-element-7b00094,
  .elementor-1012 .elementor-element-7b00094,
  .elementor-1012 .elementor-element.elementor-element-3e576a1,
  .elementor-1012 .elementor-element-3e576a1,
  .elementor-1012 .elementor-element.elementor-element-98abfe4,
  .elementor-1012 .elementor-element-98abfe4,
  .elementor-1012 .elementor-element.elementor-element-3c19722,
  .elementor-1012 .elementor-element-3c19722,
  .elementor-1012 .elementor-element.elementor-element-f783d93,
  .elementor-1012 .elementor-element-f783d93,
  .elementor-1012 .elementor-element.elementor-element-29d0900,
  .elementor-1012 .elementor-element-29d0900,
  .elementor-1012 .elementor-element.elementor-element-2ec48f1,
  .elementor-1012 .elementor-element-2ec48f1 {
    --padding-left: 40px !important;
    --padding-right: 40px !important;
    padding-left: 40px;
    padding-right: 40px;
  }
  .elementor-1012 .elementor-element-7fd1049.hero_sec > .e-con-inner {
    padding-left: 40px;
    padding-right: 40px;
  }
  .elementor-1012 .elementor-element-d9ce90c h1,
  .elementor-1012 .elementor-element-d9ce90c p {
    font-size: 40px !important;
  }
  .elementor-1012 .elementor-element-ce6d229 h2,
  .elementor-1012 .elementor-element-ce6d229 p,
  .elementor-1012 .elementor-element-73dd386 h2,
  .elementor-1012 .elementor-element-80753b1 h2,
  .elementor-1012 .elementor-element-3c4394e h2,
  .elementor-1012 .elementor-element-757df9f h2,
  .elementor-1012 .elementor-element-d42a909 h2,
  .elementor-1012 .elementor-element-a0d83aa h2 {
    font-size: 32px !important;
  }
  .elementor-1012 .elementor-element-ba6612e,
  .elementor-1012 .elementor-element-e3262ed,
  .elementor-1012 .elementor-element-fbae4cc,
  .elementor-1012 .elementor-element-01c98c7,
  .elementor-1012 .elementor-element-b82885e {
    width: 100% !important;
    max-width: 100% !important;
    --width: 100% !important;
  }
  .elementor-1012 .elementor-element-3eafa76 img,
  .elementor-1012 .elementor-element-942b2e3 img,
  .elementor-1012 .elementor-element-bf9d087 img,
  .elementor-1012 .elementor-element-56abb83 img {
    height: auto !important;
    aspect-ratio: 486 / 424;
  }
}

@media (max-width: 767px) {
  .elementor-1012 .elementor-element.elementor-element-7fd1049.hero_sec,
  .elementor-1012 .elementor-element-7fd1049.hero_sec {
    --padding-top: 120px !important;
    --padding-bottom: 48px !important;
    min-height: 520px;
  }
  .elementor-1012 .elementor-element-7fd1049.hero_sec > .e-con-inner {
    padding-left: 20px;
    padding-right: 20px;
  }
  .elementor-1012 .elementor-element.elementor-element-7b00094,
  .elementor-1012 .elementor-element-7b00094,
  .elementor-1012 .elementor-element.elementor-element-3e576a1,
  .elementor-1012 .elementor-element-3e576a1,
  .elementor-1012 .elementor-element.elementor-element-98abfe4,
  .elementor-1012 .elementor-element-98abfe4,
  .elementor-1012 .elementor-element.elementor-element-3c19722,
  .elementor-1012 .elementor-element-3c19722,
  .elementor-1012 .elementor-element.elementor-element-f783d93,
  .elementor-1012 .elementor-element-f783d93,
  .elementor-1012 .elementor-element.elementor-element-29d0900,
  .elementor-1012 .elementor-element-29d0900,
  .elementor-1012 .elementor-element.elementor-element-2ec48f1,
  .elementor-1012 .elementor-element-2ec48f1 {
    --padding-left: 20px !important;
    --padding-right: 20px !important;
    --padding-top: 48px !important;
    --padding-bottom: 48px !important;
  }
  .elementor-1012 .elementor-element-d9ce90c h1,
  .elementor-1012 .elementor-element-d9ce90c p {
    font-size: 32px !important;
  }
}
`;

fs.mkdirSync('public/css/page-design', { recursive: true });
fs.writeFileSync('public/css/page-design/security-systems.css', out);
console.log('wrote', out.length, 'bytes');
execSync('node scripts/patch-security-693.mjs', { stdio: 'inherit' });
