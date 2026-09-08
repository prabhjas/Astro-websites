/**
 * Clear H1→H6 visual hierarchy for Blog / Insights only.
 * Scoped so loop card titles, related-posts grids, and non-blog pages stay untouched.
 *
 * Scale (desktop) keeps Libre Franklin + existing title treatment:
 *   H1 post title — already 42px/700 via post-190 (reinforced)
 *   H2 sections   — ~36px (near Figma major headings)
 *   H3 subsections — ~26px (clear step down from former flat 34–42px)
 *   H4+           — progressively smaller
 */

export const BLOG_HEADING_HIERARCHY_STYLES = `<style id="astro-blog-heading-hierarchy">
/* —— Single post: main title (H1) only — not related-post / loop card titles —— */
body.single-post .elementor-element-e9fcffc.elementor-widget-theme-post-title .elementor-heading-title {
  font-family: "Libre Franklin", Sans-serif !important;
  font-size: 42px !important;
  font-weight: 700 !important;
  line-height: 1.35 !important;
}

/* Related / Latest articles cards — keep compact card titles */
body.single-post .elementor-element-540c02a .elementor-widget-theme-post-title .elementor-heading-title,
body.single-post .post-g .elementor-widget-theme-post-title .elementor-heading-title {
  font-family: "Libre Franklin", Sans-serif !important;
  font-size: 20px !important;
  font-weight: 500 !important;
  line-height: 1.35 !important;
}

/* —— Single post: article body (left column 42f7471) —— */
/* Tighten Elementor widget stack so H2/H3 blocks are not sparse */
body.single-post .elementor-element-42f7471 > .elementor-widget-wrap > .elementor-element.elementor-widget-heading,
body.single-post .elementor-element-42f7471 .elementor-element.elementor-widget-heading {
  margin-block: 0 !important;
}
body.single-post .elementor-element-42f7471 .elementor-widget-heading > .elementor-widget-container {
  margin: 0 !important;
  padding-block: 0 !important;
}
body.single-post .elementor-element-42f7471 .elementor-widget-text-editor > .elementor-widget-container {
  margin-top: 0 !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}
body.single-post .elementor-element-42f7471 .elementor-widget-text-editor p {
  margin-top: 0.25em !important;
  margin-bottom: 0.65em !important;
}
body.single-post .elementor-element-42f7471 .elementor-widget-text-editor p:last-child {
  margin-bottom: 0.35em !important;
}

body.single-post .elementor-element-42f7471 h2.elementor-heading-title,
body.single-post .elementor-element-42f7471 .elementor-widget-text-editor h2,
body.single-post .elementor-element-42f7471 .elementor-widget-heading h2 {
  font-family: "Libre Franklin", Sans-serif !important;
  font-size: 36px !important;
  font-weight: 600 !important;
  line-height: 1.3 !important;
  margin: 0.85em 0 0.2em !important;
  color: #1F2125;
}

body.single-post .elementor-element-42f7471 h3.elementor-heading-title,
body.single-post .elementor-element-42f7471 .elementor-widget-text-editor h3,
body.single-post .elementor-element-42f7471 .elementor-widget-heading h3 {
  font-family: "Libre Franklin", Sans-serif !important;
  font-size: 26px !important;
  font-weight: 500 !important;
  line-height: 1.35 !important;
  margin: 0.7em 0 0.12em !important;
  color: #1F2125;
}

body.single-post .elementor-element-42f7471 h4,
body.single-post .elementor-element-42f7471 h4.elementor-heading-title {
  font-family: "Libre Franklin", Sans-serif !important;
  font-size: 22px !important;
  font-weight: 500 !important;
  line-height: 1.4 !important;
  margin: 0.6em 0 0.12em !important;
  color: #1F2125;
}

body.single-post .elementor-element-42f7471 h5,
body.single-post .elementor-element-42f7471 h5.elementor-heading-title {
  font-family: "Libre Franklin", Sans-serif !important;
  font-size: 18px !important;
  font-weight: 500 !important;
  line-height: 1.45 !important;
  margin: 0.55em 0 0.1em !important;
  color: #1F2125;
}

body.single-post .elementor-element-42f7471 h6,
body.single-post .elementor-element-42f7471 h6.elementor-heading-title {
  font-family: "Libre Franklin", Sans-serif !important;
  font-size: 16px !important;
  font-weight: 500 !important;
  line-height: 1.5 !important;
  margin: 0.5em 0 0.1em !important;
  color: #1F2125;
}

/* Rare H1 inside body copy (keep below page title) */
body.single-post .elementor-element-42f7471 h1.elementor-heading-title,
body.single-post .elementor-element-42f7471 .elementor-widget-text-editor h1 {
  font-family: "Libre Franklin", Sans-serif !important;
  font-size: 36px !important;
  font-weight: 600 !important;
  line-height: 1.3 !important;
  margin: 0.85em 0 0.2em !important;
}

/* FAQ accordion titles stay readable but below H2 */
body.single-post .elementor-element-42f7471 .elementor-accordion-title {
  font-family: "Libre Franklin", Sans-serif !important;
  font-size: 20px !important;
  font-weight: 500 !important;
  line-height: 1.4 !important;
}

/* —— Blog listing: archive H1 only (card titles keep loop CSS) —— */
body.page-id-118 .elementor-element-b933190 .elementor-heading-title {
  font-family: "Libre Franklin", Sans-serif !important;
  font-size: 56px !important;
  font-weight: 700 !important;
  line-height: 1.2 !important;
}

/* —— Tablet —— */
@media (max-width: 1024px) {
  body.single-post .elementor-element-e9fcffc.elementor-widget-theme-post-title .elementor-heading-title {
    font-size: 34px !important;
    line-height: 1.3 !important;
  }
  body.single-post .elementor-element-540c02a .elementor-widget-theme-post-title .elementor-heading-title,
  body.single-post .post-g .elementor-widget-theme-post-title .elementor-heading-title {
    font-size: 18px !important;
  }
  body.single-post .elementor-element-42f7471 h2.elementor-heading-title,
  body.single-post .elementor-element-42f7471 .elementor-widget-text-editor h2,
  body.single-post .elementor-element-42f7471 .elementor-widget-heading h2,
  body.single-post .elementor-element-42f7471 h1.elementor-heading-title,
  body.single-post .elementor-element-42f7471 .elementor-widget-text-editor h1 {
    font-size: 30px !important;
  }
  body.single-post .elementor-element-42f7471 h3.elementor-heading-title,
  body.single-post .elementor-element-42f7471 .elementor-widget-text-editor h3,
  body.single-post .elementor-element-42f7471 .elementor-widget-heading h3 {
    font-size: 24px !important;
  }
  body.single-post .elementor-element-42f7471 h4,
  body.single-post .elementor-element-42f7471 h4.elementor-heading-title {
    font-size: 20px !important;
  }
  body.page-id-118 .elementor-element-b933190 .elementor-heading-title {
    font-size: 44px !important;
  }
}

/* —— Mobile —— */
@media (max-width: 767px) {
  body.single-post .elementor-element-e9fcffc.elementor-widget-theme-post-title .elementor-heading-title {
    font-size: 28px !important;
    line-height: 1.3 !important;
  }
  body.single-post .elementor-element-540c02a .elementor-widget-theme-post-title .elementor-heading-title,
  body.single-post .post-g .elementor-widget-theme-post-title .elementor-heading-title {
    font-size: 17px !important;
  }
  body.single-post .elementor-element-42f7471 h2.elementor-heading-title,
  body.single-post .elementor-element-42f7471 .elementor-widget-text-editor h2,
  body.single-post .elementor-element-42f7471 .elementor-widget-heading h2,
  body.single-post .elementor-element-42f7471 h1.elementor-heading-title,
  body.single-post .elementor-element-42f7471 .elementor-widget-text-editor h1 {
    font-size: 26px !important;
    line-height: 1.3 !important;
  }
  body.single-post .elementor-element-42f7471 h3.elementor-heading-title,
  body.single-post .elementor-element-42f7471 .elementor-widget-text-editor h3,
  body.single-post .elementor-element-42f7471 .elementor-widget-heading h3 {
    font-size: 22px !important;
  }
  body.single-post .elementor-element-42f7471 h4,
  body.single-post .elementor-element-42f7471 h4.elementor-heading-title {
    font-size: 18px !important;
  }
  body.single-post .elementor-element-42f7471 h5,
  body.single-post .elementor-element-42f7471 h5.elementor-heading-title {
    font-size: 16px !important;
  }
  body.single-post .elementor-element-42f7471 .elementor-accordion-title {
    font-size: 18px !important;
  }
  body.page-id-118 .elementor-element-b933190 .elementor-heading-title {
    font-size: 36px !important;
    line-height: 1.2 !important;
  }
}
</style>`;

export function injectBlogHeadingHierarchy(html: string): string {
  if (html.includes('astro-blog-heading-hierarchy')) return html;
  if (!html.includes('</head>')) return html;
  return html.replace('</head>', `${BLOG_HEADING_HIERARCHY_STYLES}\n</head>`);
}
