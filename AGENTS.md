# AGENTS.md

## Goal

You are working on this repository.

Your job is to understand the existing project before making changes, preserve current functionality, improve code quality where appropriate, and keep the project maintainable.

---

## Before You Start

Before making changes:

1. Read ARCHITECTURE.md if it exists.
2. Inspect the relevant code.
3. Understand how the existing implementation works.
4. Follow existing patterns instead of introducing new ones.

If the documentation disagrees with the code, the code is correct.

If your work changes the architecture, update ARCHITECTURE.md.

---

## How to Work

Do the work directly.

Only ask questions if:

* the requested behaviour is unclear
* there is a business decision to make
* multiple valid implementations would produce different user behaviour

Do not ask implementation questions.

Use your own judgment.

---

## Coding Standards

* Follow the existing project structure.
* Reuse existing components, utilities and helpers whenever possible.
* Avoid duplicate logic.
* Keep files focused on a single responsibility.
* Avoid creating unnecessarily large files.
* Refactor instead of adding complexity when appropriate.
* Preserve existing behaviour unless the task requires changing it.

Never hardcode values that should reasonably be configurable.

---

## Architecture

Keep responsibilities separated.

Routes/pages should handle requests and rendering.

Business logic belongs in services or reusable modules.

Shared logic should live in shared utilities.

Avoid circular dependencies.

---

## Code Quality

Every change should aim to leave the codebase slightly better than before.

Prefer:

* readability
* maintainability
* simplicity
* consistency

Avoid unnecessary abstraction.

Avoid unnecessary complexity.

---

## WordPress Migration

This project is migrating from WordPress to Astro.

When migrating pages:

* Preserve URLs whenever possible.
* Preserve SEO metadata.
* Preserve structured data if present.
* Preserve canonical URLs.
* Preserve redirects where necessary.
* Preserve page content and hierarchy unless instructed otherwise.
* Improve performance without changing the visible behaviour.

Do not remove content unless explicitly requested.

---

## Testing

After making changes:

* check for errors
* verify the affected pages
* ensure existing functionality still works

Fix issues introduced by your changes before considering the task complete.

---

## Communication

If clarification is needed, ask using business language instead of technical language.

Example:

> Business clarification needed: Should this page remain identical to the current website, or can its design be modernized?

Do not ask implementation questions unless absolutely necessary.
