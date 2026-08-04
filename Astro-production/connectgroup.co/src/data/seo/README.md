# SEO content files

SEO team owns these YAML files after WordPress cutover (replaces Rank Math for public pages).

| File | Page |
|------|------|
| `home.yml` | Homepage meta (also used by demo pages) |
| `about-us.yml` | About Us page meta |
| `staff-outsourcing.yml` | Staff Outsourcing page meta |
| `visa-services.yml` | Visa Services page meta |
| `payroll-services.yml` | Payroll Services page meta |
| `remote-workers-hire.yml` | Remote Workers Hire page meta |
| `global-workforce-solutions.yml` | Global Workforce Solutions page meta |
| `payroll-outsourcing.yml` | Payroll Outsourcing page meta |
| `hr-payroll-software-uae.yml` | HR & Payroll Software UAE page meta |
| `hr-outsourcing.yml` | HR Outsourcing page meta |
| `professional-employer-organization-uae.yml` | PEO UAE page meta |
| `freelance-visa.yml` | Freelance Visa page meta |

## Edit workflow

1. Change `title`, `description`, `canonical`, `og`, `twitter`, `schema`
2. Open a pull request
3. Preview deploy → View Source to verify tags
4. Merge → production build

Astro loads these via `src/lib/seo.ts` → `BaseLayout.astro`.

See `docs/08-seo-strategy.md`.
