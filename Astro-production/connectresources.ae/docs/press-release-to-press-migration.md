# Press-release CPT → /press/

Connect Resources press-release posts are listed on `/press/` and published at `/press/{slug}/`.

## Old → new URL pairs

| Old | New |
|---|---|
| `/press-release/` | `/press/` |
| `/press-release/aaron-portero-managing-director-of-connect-group-appears-in-an-article-by-khaleej-times/` | `/press/aaron-portero-managing-director-of-connect-group-appears-in-an-article-by-khaleej-times/` |
| `/press-release/aaron-portero-managing-director-of-connect-group-gives-insight-for-agbi-article/` | `/press/aaron-portero-managing-director-of-connect-group-gives-insight-for-agbi-article/` |
| `/press-release/aaron-portero-talk-about-europeans-are-flocking-to-uae-in-khaleej-times/` | `/press/aaron-portero-talk-about-europeans-are-flocking-to-uae-in-khaleej-times/` |
| `/press-release/connect-hr-has-been-appraised-by-one-of-the-worlds-biggest-reviewers/` | `/press/connect-hr-has-been-appraised-by-one-of-the-worlds-biggest-reviewers/` |
| `/press-release/connect-resources-has-appeared-on-one-of-the-top-news-portals-of-the-region/` | `/press/connect-resources-has-appeared-on-one-of-the-top-news-portals-of-the-region/` |
| `/press-release/connect-resources-has-been-awarded-at-the-mea-business-awards/` | `/press/connect-resources-has-been-awarded-at-the-mea-business-awards/` |
| `/press-release/connect-resources-has-been-featured-in-bloomberg/` | `/press/connect-resources-has-been-featured-in-bloomberg/` |
| `/press-release/connect-resources-has-recently-appeared-in-one-of-the-biggest-news-websites-of-the-region/` | `/press/connect-resources-has-recently-appeared-in-one-of-the-biggest-news-websites-of-the-region/` |
| `/press-release/connect-resources-is-joining-forces-with-the-manzil-center-to-give-back-to-the-community/` | `/press/connect-resources-is-joining-forces-with-the-manzil-center-to-give-back-to-the-community/` |
| `/press-release/connect-resources-success-story-is-featured-on-mea-markets-magazine/` | `/press/connect-resources-success-story-is-featured-on-mea-markets-magazine/` |
| `/press-release/connect-resources-team-visit-manzil-center/` | `/press/connect-resources-team-visit-manzil-center/` |
| `/press-release/euronews-appreciated-employment-services-of-connect-resources/` | `/press/euronews-appreciated-employment-services-of-connect-resources/` |
| `/press-release/introducing-connect-resources-hiring-partner-and-talent-marketplace-thetalentpoint/` | `/press/introducing-connect-resources-hiring-partner-and-talent-marketplace-thetalentpoint/` |
| `/press-release/managing-director-of-connect-group-aaron-portero-joins-the-israel-emirates-business-summit-2022-event/` | `/press/managing-director-of-connect-group-aaron-portero-joins-the-israel-emirates-business-summit-2022-event/` |
| `/press-release/signing-of-memorandum-of-understanding-between-connect-resources-and-city-university-college-of-ajman/` | `/press/signing-of-memorandum-of-understanding-between-connect-resources-and-city-university-college-of-ajman/` |

All mappings are **301** in `src/data/redirects.yml` / `public/_redirects`.

## Notes

- `type: "press-release"` is kept for filtering.
- `/press/` SSR injects CPT cards via `src/lib/press.ts` (`rebuildPressListingHtml`) into the existing card layout; external media cards stay external.
- New CPT posts: set `type: "press-release"` and `path`/`link`/`seo.canonical` to `/press/{slug}/`.
