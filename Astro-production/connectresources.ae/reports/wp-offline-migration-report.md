# WordPress offline migration report — connectresources.ae

Generated: 2026-08-05T07:17:27.782Z

## Summary

| Metric | Value |
|--------|------:|
| Unique asset URLs discovered | 3829 |
| Downloaded (new) | 15 |
| Already local (skipped) | 3796 |
| Download failures | 39 |
| Missing on disk after pass | 33 |
| Text files rewritten (media URLs) | 3 |
| Email signature sources | 159 |

## Local path convention

Media is served from Astro `public/` using the same paths as WordPress (`/wp-content/uploads/...`, `/wp-content/plugins/...`).  
This is equivalent to mapping `https://domain.com/wp-content/uploads/foo.png` → `/wp-content/uploads/foo.png` (local static files).

## Missing assets (33)

- `/wp-content/themes/hello-elementor/assets/css/theme.css` — https://connectresources.ae/wp-content/themes/hello-elementor/assets/css/theme.css
- `/wp-content/themes/hello-elementor/assets/css/header-footer.css` — https://connectresources.ae/wp-content/themes/hello-elementor/assets/css/header-footer.css
- `/wp-content/themes/hello-elementor/style.css` — https://connectresources.ae/wp-content/themes/hello-elementor/style.css
- `/wp-content/themes/hello-elementor-child-theme/style.css` — https://connectresources.ae/wp-content/themes/hello-elementor-child-theme/style.css
- `/wp-content/plugins/ele-custom-skin/assets/css/ecs-style.css` — https://connectresources.ae/wp-content/plugins/ele-custom-skin/assets/css/ecs-style.css
- `/wp-content/themes/Impreza/common/css/vendor/images/marker-icon.png)}.header_hor` — https://connectresources.ae/wp-content/themes/Impreza/common/css/vendor/images/marker-icon.png)}.header_hor
- `/wp-content/plugins/smart-slider-3/Public/SmartSlider3/Application/Frontend/Assets/dist/smartslider.min.css` — https://connectresources.ae/wp-content/plugins/smart-slider-3/Public/SmartSlider3/Application/Frontend/Assets/dist/smartslider.min.css
- `/wp-content/uploads/2022/06/Recruitment-u2013-Dubai-UAE-with-Connect-Resources-min-300x300.png` — https://connectresources.ae/wp-content/uploads/2022/06/Recruitment-u2013-Dubai-UAE-with-Connect-Resources-min-300x300.png
- `/wp-content/uploads/2022/06/Recruitment-u2013-Dubai-UAE-with-Connect-Resources-min-150x150.png` — https://connectresources.ae/wp-content/uploads/2022/06/Recruitment-u2013-Dubai-UAE-with-Connect-Resources-min-150x150.png
- `/wp-content/uploads/2022/06/Recruitment-u2013-Dubai-UAE-with-Connect-Resources-min-75x75.png` — https://connectresources.ae/wp-content/uploads/2022/06/Recruitment-u2013-Dubai-UAE-with-Connect-Resources-min-75x75.png
- `/wp-content/uploads/2022/05/Employment-Visa-Outsourcing-Services-in-Dubai-u2013-UAE-Connect-Resources-min-300x300.png` — https://connectresources.ae/wp-content/uploads/2022/05/Employment-Visa-Outsourcing-Services-in-Dubai-u2013-UAE-Connect-Resources-min-300x300.png
- `/wp-content/uploads/2022/05/Employment-Visa-Outsourcing-Services-in-Dubai-u2013-UAE-Connect-Resources-min-150x150.png` — https://connectresources.ae/wp-content/uploads/2022/05/Employment-Visa-Outsourcing-Services-in-Dubai-u2013-UAE-Connect-Resources-min-150x150.png
- `/wp-content/uploads/2022/05/Employment-Visa-Outsourcing-Services-in-Dubai-u2013-UAE-Connect-Resources-min-75x75.png` — https://connectresources.ae/wp-content/uploads/2022/05/Employment-Visa-Outsourcing-Services-in-Dubai-u2013-UAE-Connect-Resources-min-75x75.png
- `/wp-content/uploads/2022/06/PEO-u2013-Professional-Employer-Organization-Dubai-UAE-with-connect-resources-min-2-271x300.png` — https://connectresources.ae/wp-content/uploads/2022/06/PEO-u2013-Professional-Employer-Organization-Dubai-UAE-with-connect-resources-min-2-271x300.png
- `/wp-content/uploads/2025/09/u4e3au4ec0u4e48u9009u62e9u6211u4eec-comment-150x150.webp` — https://connectresources.ae/wp-content/uploads/2025/09/u4e3au4ec0u4e48u9009u62e9u6211u4eec-comment-150x150.webp
- `/wp-content/uploads/2025/09/u4e3au4ec0u4e48u9009u62e9u6211u4eec-comment-75x75.webp` — https://connectresources.ae/wp-content/uploads/2025/09/u4e3au4ec0u4e48u9009u62e9u6211u4eec-comment-75x75.webp
- `/wp-content/uploads/2025/09/u540du4e49u96c7u4e3buff08u5916u5305uff09u2014u2014u5febu901fu5f00u5c55u8fd0u8425uff0cu6ce8u518cu624bu7eedu65e0u9700u963bu788d-image-258x300.webp` — https://connectresources.ae/wp-content/uploads/2025/09/u540du4e49u96c7u4e3buff08u5916u5305uff09u2014u2014u5febu901fu5f00u5c55u8fd0u8425uff0cu6ce8u518cu624bu7eedu65e0u9700u963bu788d-image-258x300.webp
- `/wp-content/uploads/2025/09/u4f01u4e1au6ce8u518cu2014u2014u7ec4u5efau60a8u5728u963fu8054u914bu7684u4e13u5c5eu5b9eu4f53u516cu53f8-image-257x300.webp` — https://connectresources.ae/wp-content/uploads/2025/09/u4f01u4e1au6ce8u518cu2014u2014u7ec4u5efau60a8u5728u963fu8054u914bu7684u4e13u5c5eu5b9eu4f53u516cu53f8-image-257x300.webp
- `/wp-content/uploads/2025/09/u4ebau529bu8d44u6e90u5916u5305uff08Staff-Outsourcinguff09u2014u4e13u4e1au3001u53efu9760u7684u4ebau529bu8d44u6e90u7ba1u7406-image-300x300.webp` — https://connectresources.ae/wp-content/uploads/2025/09/u4ebau529bu8d44u6e90u5916u5305uff08Staff-Outsourcinguff09u2014u4e13u4e1au3001u53efu9760u7684u4ebau529bu8d44u6e90u7ba1u7406-image-300x300.webp
- `/wp-content/uploads/2025/09/u4ebau529bu8d44u6e90u5916u5305uff08Staff-Outsourcinguff09u2014u4e13u4e1au3001u53efu9760u7684u4ebau529bu8d44u6e90u7ba1u7406-image-150x150.webp` — https://connectresources.ae/wp-content/uploads/2025/09/u4ebau529bu8d44u6e90u5916u5305uff08Staff-Outsourcinguff09u2014u4e13u4e1au3001u53efu9760u7684u4ebau529bu8d44u6e90u7ba1u7406-image-150x150.webp
- `/wp-content/uploads/2025/09/u4ebau529bu8d44u6e90u5916u5305uff08Staff-Outsourcinguff09u2014u4e13u4e1au3001u53efu9760u7684u4ebau529bu8d44u6e90u7ba1u7406-image-75x75.webp` — https://connectresources.ae/wp-content/uploads/2025/09/u4ebau529bu8d44u6e90u5916u5305uff08Staff-Outsourcinguff09u2014u4e13u4e1au3001u53efu9760u7684u4ebau529bu8d44u6e90u7ba1u7406-image-75x75.webp
- `/wp-content/uploads/2025/09/u62dbu8058u670du52a1u2014u2014u4e3au60a8u7504u9009u7cbeu82f1u56e2u961f-image-258x300.webp` — https://connectresources.ae/wp-content/uploads/2025/09/u62dbu8058u670du52a1u2014u2014u4e3au60a8u7504u9009u7cbeu82f1u56e2u961f-image-258x300.webp
- `/wp-content/uploads/2025/09/u4e13u6ce8u4e8eu4f01u4e1au589eu957fuff0cu5176u4f59u8fd0u8425u4e0eu652fu6301u4e8bu52a1u5168u90e8u7531u6211u4eecu4ee3u7ba1u3002-image-258x300.webp` — https://connectresources.ae/wp-content/uploads/2025/09/u4e13u6ce8u4e8eu4f01u4e1au589eu957fuff0cu5176u4f59u8fd0u8425u4e0eu652fu6301u4e8bu52a1u5168u90e8u7531u6211u4eecu4ee3u7ba1u3002-image-258x300.webp
- `/wp-content/uploads/2025/09/u670du52a1u4f18u52bf-image-section-237x300.webp` — https://connectresources.ae/wp-content/uploads/2025/09/u670du52a1u4f18u52bf-image-section-237x300.webp
- `/wp-content/uploads/2024/01/JORDAN-VISA-ON-ARRIVAL-u2013-VISA-POLICY-REQUIREMENTS-ELIGIBILITY-300x169.jpg` — https://connectresources.ae/wp-content/uploads/2024/01/JORDAN-VISA-ON-ARRIVAL-u2013-VISA-POLICY-REQUIREMENTS-ELIGIBILITY-300x169.jpg
- `/wp-content/uploads/2024/01/JORDAN-VISA-ON-ARRIVAL-u2013-VISA-POLICY-REQUIREMENTS-ELIGIBILITY-1024x576.jpg` — https://connectresources.ae/wp-content/uploads/2024/01/JORDAN-VISA-ON-ARRIVAL-u2013-VISA-POLICY-REQUIREMENTS-ELIGIBILITY-1024x576.jpg
- `/wp-content/uploads/2022/06/Executive-Search-firm-u2013-Industries-of-work-with-connect-resources-min-271x300.png` — https://connectresources.ae/wp-content/uploads/2022/06/Executive-Search-firm-u2013-Industries-of-work-with-connect-resources-min-271x300.png
- `/wp-content/uploads/2022/06/Recruitment-u2013-Dubai-UAE-with-Connect-Resources2-min-300x300.png` — https://connectresources.ae/wp-content/uploads/2022/06/Recruitment-u2013-Dubai-UAE-with-Connect-Resources2-min-300x300.png
- `/wp-content/uploads/2022/06/Recruitment-u2013-Dubai-UAE-with-Connect-Resources2-min-150x150.png` — https://connectresources.ae/wp-content/uploads/2022/06/Recruitment-u2013-Dubai-UAE-with-Connect-Resources2-min-150x150.png
- `/wp-content/uploads/2022/06/Recruitment-u2013-Dubai-UAE-with-Connect-Resources2-min-75x75.png` — https://connectresources.ae/wp-content/uploads/2022/06/Recruitment-u2013-Dubai-UAE-with-Connect-Resources2-min-75x75.png
- `/wp-content/uploads/2022/06/Employment-Visa-Outsourcing-Services-in-Dubai-u2013-UAE-with-Connect-Resources-min-253x300.png` — https://connectresources.ae/wp-content/uploads/2022/06/Employment-Visa-Outsourcing-Services-in-Dubai-u2013-UAE-with-Connect-Resources-min-253x300.png
- `/wp-content/plugins/formidable-pro/images/intl-tel-input/globe.png);}@media` — https://connectresources.ae/wp-content/plugins/formidable-pro/images/intl-tel-input/globe.png);}@media
- `/wp-content/plugins/formidable-pro/images/intl-tel-input/globe@2x.png);}}.with_frm_style` — https://connectresources.ae/wp-content/plugins/formidable-pro/images/intl-tel-input/globe@2x.png);}}.with_frm_style



## Download failures (39)

- `https://connectresources.ae/wp-content/themes/hello-elementor/assets/css/theme.css` — 404 Not Found
- `https://connectresources.ae/wp-content/themes/hello-elementor/assets/css/header-footer.css` — 404 Not Found
- `https://connectresources.ae/wp-content/themes/hello-elementor/style.css` — 404 Not Found
- `https://connectresources.ae/wp-content/themes/hello-elementor-child-theme/style.css` — 404 Not Found
- `https://connectresources.ae/wp-content/plugins/ele-custom-skin/assets/css/ecs-style.css` — 404 Not Found
- `https://connectresources.ae/wp-content/themes/Impreza/common/css/vendor/images/marker-icon.png)}.header_hor` — 404 Not Found
- `https://connectresources.ae/wp-content/plugins/smart-slider-3/Public/SmartSlider3/Application/Frontend/Assets/dist/smartslider.min.css` — 404 Not Found
- `https://connectresources.ae/wp-content/uploads/2022/06/Recruitment-u2013-Dubai-UAE-with-Connect-Resources-min-300x300.png` — 404 Not Found
- `https://connectresources.ae/wp-content/uploads/2022/06/Recruitment-u2013-Dubai-UAE-with-Connect-Resources-min-150x150.png` — 404 Not Found
- `https://connectresources.ae/wp-content/uploads/2022/06/Recruitment-u2013-Dubai-UAE-with-Connect-Resources-min-75x75.png` — 404 Not Found
- `https://connectresources.ae/wp-content/uploads/2022/05/Employment-Visa-Outsourcing-Services-in-Dubai-u2013-UAE-Connect-Resources-min-300x300.png` — 404 Not Found
- `https://connectresources.ae/wp-content/uploads/2022/05/Employment-Visa-Outsourcing-Services-in-Dubai-u2013-UAE-Connect-Resources-min-150x150.png` — 404 Not Found
- `https://connectresources.ae/wp-content/uploads/2022/05/Employment-Visa-Outsourcing-Services-in-Dubai-u2013-UAE-Connect-Resources-min-75x75.png` — 404 Not Found
- `https://connectresources.ae/wp-content/uploads/2022/06/PEO-u2013-Professional-Employer-Organization-Dubai-UAE-with-connect-resources-min-2-271x300.png` — 404 Not Found
- `https://connectresources.ae/wp-content/uploads/2025/09/u4e3au4ec0u4e48u9009u62e9u6211u4eec-comment-150x150.webp` — 404 Not Found
- `https://connectresources.ae/wp-content/uploads/2025/09/u4e3au4ec0u4e48u9009u62e9u6211u4eec-comment-75x75.webp` — 404 Not Found
- `https://connectresources.ae/wp-content/uploads/2025/09/u540du4e49u96c7u4e3buff08u5916u5305uff09u2014u2014u5febu901fu5f00u5c55u8fd0u8425uff0cu6ce8u518cu624bu7eedu65e0u9700u963bu788d-image-258x300.webp` — 404 Not Found
- `https://connectresources.ae/wp-content/uploads/2025/09/u4f01u4e1au6ce8u518cu2014u2014u7ec4u5efau60a8u5728u963fu8054u914bu7684u4e13u5c5eu5b9eu4f53u516cu53f8-image-257x300.webp` — 404 Not Found
- `https://connectresources.ae/wp-content/uploads/2025/09/u4ebau529bu8d44u6e90u5916u5305uff08Staff-Outsourcinguff09u2014u4e13u4e1au3001u53efu9760u7684u4ebau529bu8d44u6e90u7ba1u7406-image-300x300.webp` — 404 Not Found
- `https://connectresources.ae/wp-content/uploads/2025/09/u4ebau529bu8d44u6e90u5916u5305uff08Staff-Outsourcinguff09u2014u4e13u4e1au3001u53efu9760u7684u4ebau529bu8d44u6e90u7ba1u7406-image-150x150.webp` — 404 Not Found
- `https://connectresources.ae/wp-content/uploads/2025/09/u4ebau529bu8d44u6e90u5916u5305uff08Staff-Outsourcinguff09u2014u4e13u4e1au3001u53efu9760u7684u4ebau529bu8d44u6e90u7ba1u7406-image-75x75.webp` — 404 Not Found
- `https://connectresources.ae/wp-content/uploads/2025/09/u62dbu8058u670du52a1u2014u2014u4e3au60a8u7504u9009u7cbeu82f1u56e2u961f-image-258x300.webp` — 404 Not Found
- `https://connectresources.ae/wp-content/uploads/2025/09/u4e13u6ce8u4e8eu4f01u4e1au589eu957fuff0cu5176u4f59u8fd0u8425u4e0eu652fu6301u4e8bu52a1u5168u90e8u7531u6211u4eecu4ee3u7ba1u3002-image-258x300.webp` — 404 Not Found
- `https://connectresources.ae/wp-content/uploads/2025/09/u670du52a1u4f18u52bf-image-section-237x300.webp` — 404 Not Found
- `https://connectresources.ae/wp-content/uploads/2024/01/JORDAN-VISA-ON-ARRIVAL-u2013-VISA-POLICY-REQUIREMENTS-ELIGIBILITY-300x169.jpg` — 404 Not Found
- `https://connectresources.ae/wp-content/uploads/2024/01/JORDAN-VISA-ON-ARRIVAL-u2013-VISA-POLICY-REQUIREMENTS-ELIGIBILITY-1024x576.jpg` — 404 Not Found
- `https://connectresources.ae/wp-content/uploads/2022/06/Executive-Search-firm-u2013-Industries-of-work-with-connect-resources-min-271x300.png` — 404 Not Found
- `https://connectresources.ae/wp-content/uploads/2022/06/Recruitment-u2013-Dubai-UAE-with-Connect-Resources2-min-300x300.png` — 404 Not Found
- `https://connectresources.ae/wp-content/uploads/2022/06/Recruitment-u2013-Dubai-UAE-with-Connect-Resources2-min-150x150.png` — 404 Not Found
- `https://connectresources.ae/wp-content/uploads/2022/06/Recruitment-u2013-Dubai-UAE-with-Connect-Resources2-min-75x75.png` — 404 Not Found
- `https://connectresources.ae/wp-content/uploads/2022/06/Employment-Visa-Outsourcing-Services-in-Dubai-u2013-UAE-with-Connect-Resources-min-253x300.png` — 404 Not Found
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
