/**
 * Elementor + Elementor Pro frontend config for Connect Zone (Astro).
 * Must load before elementor frontend.min.js / pro frontend.min.js.
 */
window.elementorFrontendConfig = window.elementorFrontendConfig || {
  environmentMode: { edit: false, wpPreview: false, isScriptDebug: false },
  i18n: {
    shareOnFacebook: "Share on Facebook",
    shareOnTwitter: "Share on Twitter",
    pinIt: "Pin it",
    download: "Download",
    downloadImage: "Download image",
    fullscreen: "Fullscreen",
    zoom: "Zoom",
    share: "Share",
    playVideo: "Play Video",
    previous: "Previous",
    next: "Next",
    close: "Close",
  },
  is_rtl: false,
  breakpoints: { xs: 0, sm: 480, md: 768, lg: 1025, xl: 1440, xxl: 1600 },
  responsive: {
    breakpoints: {
      mobile: { label: "Mobile Portrait", value: 767, default_value: 767, direction: "max", is_enabled: true },
      mobile_extra: { label: "Mobile Landscape", value: 880, default_value: 880, direction: "max", is_enabled: false },
      tablet: { label: "Tablet Portrait", value: 1024, default_value: 1024, direction: "max", is_enabled: true },
      tablet_extra: { label: "Tablet Landscape", value: 1200, default_value: 1200, direction: "max", is_enabled: false },
      laptop: { label: "Laptop", value: 1366, default_value: 1366, direction: "max", is_enabled: false },
      widescreen: { label: "Widescreen", value: 2400, default_value: 2400, direction: "min", is_enabled: false },
    },
    hasCustomBreakpoints: false,
  },
  version: "4.1.4",
  is_static: false,
  experimentalFeatures: {},
  urls: {
    assets: "/wp-content/plugins/elementor/assets/",
    ajaxurl: "/api/contact/",
    uploadUrl: "/wp-content/uploads",
  },
  swiperClass: "swiper",
  settings: { page: [], editorPreferences: [] },
  kit: {
    active_breakpoints: ["viewport_mobile", "viewport_tablet"],
    global_image_lightbox: "yes",
  },
  post: { id: 10536, title: "Connect Zone", excerpt: "", featuredImage: false },
};

window.ElementorProFrontendConfig = window.ElementorProFrontendConfig || {
  ajaxurl: "/api/contact/",
  nonce: "astro",
  urls: {
    assets: "/wp-content/plugins/elementor-pro/assets/",
    rest: "/wp-json/",
  },
  settings: { lazy_load_background_images: true },
  popup: { hasPopUps: false },
  shareButtonsNetworks: {},
  facebook_sdk: { lang: "en_US", app_id: "" },
  lottie: { defaultAnimationUrl: "" },
};
