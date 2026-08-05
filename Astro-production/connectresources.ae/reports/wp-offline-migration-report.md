# WordPress offline migration report — connectresources.ae

Generated: 2026-08-05T07:39:37.520Z

## Summary

| Metric | Value |
|--------|------:|
| Unique asset URLs discovered | 504 |
| Downloaded (new) | 0 |
| Already local (skipped) | 500 |
| Download failures | 25 |
| Missing on disk after pass | 19 |
| Text files rewritten (media URLs) | 0 |
| Email signature sources | 159 |

## Local path convention

Media is served from Astro `public/` using the same paths as WordPress (`/wp-content/uploads/...`, `/wp-content/plugins/...`).  
This is equivalent to mapping `https://domain.com/wp-content/uploads/foo.png` → `/wp-content/uploads/foo.png` (local static files).

## Missing assets (19)

- `/wp-content/uploads/elementor/css/post-652.css` — https://connectresources.ae/wp-content/uploads/elementor/css/post-652.css
- `/wp-content/themes/hello-elementor/assets/css/theme.css` — https://connectresources.ae/wp-content/themes/hello-elementor/assets/css/theme.css
- `/wp-content/themes/hello-elementor/assets/css/header-footer.css` — https://connectresources.ae/wp-content/themes/hello-elementor/assets/css/header-footer.css
- `/wp-content/uploads/elementor/css/post-19.css` — https://connectresources.ae/wp-content/uploads/elementor/css/post-19.css
- `/wp-content/uploads/elementor/css/post-153.css` — https://connectresources.ae/wp-content/uploads/elementor/css/post-153.css
- `/wp-content/uploads/elementor/css/post-158.css` — https://connectresources.ae/wp-content/uploads/elementor/css/post-158.css
- `/wp-content/themes/hello-elementor/style.css` — https://connectresources.ae/wp-content/themes/hello-elementor/style.css
- `/wp-content/themes/hello-elementor-child-theme/style.css` — https://connectresources.ae/wp-content/themes/hello-elementor-child-theme/style.css
- `/wp-content/plugins/ele-custom-skin/assets/css/ecs-style.css` — https://connectresources.ae/wp-content/plugins/ele-custom-skin/assets/css/ecs-style.css
- `/wp-content/uploads/elementor/google-fonts/css/bebasneue.css` — https://connectresources.ae/wp-content/uploads/elementor/google-fonts/css/bebasneue.css
- `/wp-content/themes/Impreza/common/css/vendor/images/marker-icon.png)}.header_hor` — https://connectresources.ae/wp-content/themes/Impreza/common/css/vendor/images/marker-icon.png)}.header_hor
- `/wp-content/plugins/smart-slider-3/Public/SmartSlider3/Application/Frontend/Assets/dist/smartslider.min.css` — https://connectresources.ae/wp-content/plugins/smart-slider-3/Public/SmartSlider3/Application/Frontend/Assets/dist/smartslider.min.css
- `/wp-content/cache/min/1/assets/images/smile_fonts/Defaults/Defaults.css` — https://connectresources.ae/wp-content/cache/min/1/assets/images/smile_fonts/Defaults/Defaults.css
- `/wp-content/plugins/country-phone-field-contact-form-7/assets/img/flags.png);background-repeat:no-repeat;background-color:` — https://connectresources.ae/wp-content/plugins/country-phone-field-contact-form-7/assets/img/flags.png);background-repeat:no-repeat;background-color:
- `/wp-content/plugins/country-phone-field-contact-form-7/assets/img/flags@2x.png)}}.iti-flag.np{background-color:transparent}.country-select{position:relative}.country-select` — https://connectresources.ae/wp-content/plugins/country-phone-field-contact-form-7/assets/img/flags@2x.png)}}.iti-flag.np{background-color:transparent}.country-select{position:relative}.country-select
- `/wp-content/plugins/country-phone-field-contact-form-7/assets/img/flags@2x.png);background-size:5630px` — https://connectresources.ae/wp-content/plugins/country-phone-field-contact-form-7/assets/img/flags@2x.png);background-size:5630px
- `/assets/images/elementor/google-fonts/fonts/bebasneue-jtusjig69ck48gw7pxoo9wlhyw.woff2` — https://connectresources.ae/assets/images/elementor/google-fonts/fonts/bebasneue-jtusjig69ck48gw7pxoo9wlhyw.woff2
- `/wp-content/plugins/formidable-pro/images/intl-tel-input/globe.png);}@media` — https://connectresources.ae/wp-content/plugins/formidable-pro/images/intl-tel-input/globe.png);}@media
- `/wp-content/plugins/formidable-pro/images/intl-tel-input/globe@2x.png);}}.with_frm_style` — https://connectresources.ae/wp-content/plugins/formidable-pro/images/intl-tel-input/globe@2x.png);}}.with_frm_style



## Download failures (25)

- `https://connectresources.ae/wp-content/uploads/elementor/css/post-652.css` — 404 Not Found
- `https://connectresources.ae/wp-content/themes/hello-elementor/assets/css/theme.css` — 404 Not Found
- `https://connectresources.ae/wp-content/themes/hello-elementor/assets/css/header-footer.css` — 404 Not Found
- `https://connectresources.ae/wp-content/uploads/elementor/css/post-19.css` — 404 Not Found
- `https://connectresources.ae/wp-content/uploads/elementor/css/post-153.css` — 404 Not Found
- `https://connectresources.ae/wp-content/uploads/elementor/css/post-158.css` — 404 Not Found
- `https://connectresources.ae/wp-content/themes/hello-elementor/style.css` — 404 Not Found
- `https://connectresources.ae/wp-content/themes/hello-elementor-child-theme/style.css` — 404 Not Found
- `https://connectresources.ae/wp-content/plugins/ele-custom-skin/assets/css/ecs-style.css` — 404 Not Found
- `https://connectresources.ae/wp-content/uploads/elementor/google-fonts/css/bebasneue.css` — 404 Not Found
- `https://connectresources.ae/wp-content/themes/Impreza/common/css/vendor/images/marker-icon.png)}.header_hor` — 404 Not Found
- `https://connectresources.ae/wp-content/plugins/smart-slider-3/Public/SmartSlider3/Application/Frontend/Assets/dist/smartslider.min.css` — 404 Not Found
- `https://connectresources.ae/wp-content/cache/min/1/assets/images/smile_fonts/Defaults/Defaults.css` — 404 Not Found
- `https://connectresources.ae/wp-content/plugins/country-phone-field-contact-form-7/assets/img/flags.png);background-repeat:no-repeat;background-color:` — 404 Not Found
- `https://connectresources.ae/wp-content/plugins/country-phone-field-contact-form-7/assets/img/flags@2x.png)}}.iti-flag.np{background-color:transparent}.country-select{position:relative}.country-select` — 404 Not Found
- `https://connectresources.ae/wp-content/plugins/country-phone-field-contact-form-7/assets/img/flags@2x.png);background-size:5630px` — 404 Not Found
- `https://connectresources.ae/assets/images/elementor/google-fonts/fonts/bebasneue-jtusjig69ck48gw7pxoo9wlhyw.woff2` — 404 Not Found
- `https://connectresources.ae/wp-content/plugins/formidable-pro/images/intl-tel-input/globe.png);}@media` — 404 Not Found
- `https://connectresources.ae/wp-content/plugins/formidable-pro/images/intl-tel-input/globe@2x.png);}}.with_frm_style` — 404 Not Found
- `https://connectresources.ae/wp-content/plugins/formidable-pro/images/intl-tel-input/globe.png);}@media` — 404 Not Found
- `https://connectresources.ae/wp-content/plugins/formidable-pro/images/intl-tel-input/globe@2x.png);}}.with_frm_style` — 404 Not Found
- `https://connectresources.ae/wp-content/plugins/formidable-pro/images/intl-tel-input/globe.png);}@media` — 404 Not Found
- `https://connectresources.ae/wp-content/plugins/formidable-pro/images/intl-tel-input/globe@2x.png);}}.with_frm_style` — 404 Not Found
- `https://connectresources.ae/wp-content/plugins/formidable-pro/images/intl-tel-input/globe.png);}@media` — 404 Not Found
- `https://connectresources.ae/wp-content/plugins/formidable-pro/images/intl-tel-input/globe@2x.png);}}.with_frm_style` — 404 Not Found

## Remaining absolute WordPress *media* URLs in source (0)

_None in src / wp-content text assets_

## Browser network audit (WordPress media requests)

Set FLEET_LOCAL_URL and run server for live network audit

WP domain media hits: **0**

_Run with server up: `RUN_NETWORK_AUDIT=1 FLEET_LOCAL_URL=http://127.0.0.1:5086 node scripts/wp-offline-migrate.mjs`_

## Next steps

1. `node scripts/parity-fix.mjs` for Impreza/Smart Slider critical scripts.
2. `pnpm build` and fleet smoke on port 5086.
3. Re-run this script after content refreshes from WordPress.
