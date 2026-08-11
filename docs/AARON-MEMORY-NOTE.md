# Aaron memory note — per-site caps, not one shared pool (FQ-03)

**Date:** 2026-08-11
**For:** Aaron (owner / host)
**Decision:** keep **per-site** `MemoryMax` / `MemoryHigh`. Do **not** put all 34 processes in one shared cgroup.
**This is a recommendation to paste to Aaron — no live systemd / `site-ctl` / `/etc/systemd` change was made.**

---

## Question Aaron asked

> More memory **for each** unit, or **shared** for all?

## Recommendation

Keep **per-site cgroups**. Raise the caps on **heavy WP mirrors first**; leave thin leads-only sites where they are.

### Why not one shared pool

| | Per-site `MemoryMax` (keep) | One shared slice for all 34 |
|--|-----------------------------|------------------------------|
| Isolation | One fat site (CR) cannot starve the others | Noisy neighbour (CR) takes the whole pool |
| Debugging | `MemoryAvailable=0` points at **that** unit | Whole fleet degrades together, hard to attribute |
| Host RAM | Caps are **limits, not reservations** — idle sites do not lock 256 Mi each | Looks "efficient", hides the real hog |
| Fits today | Matches the immutable-security units (`MemoryHigh=200M`, `MemoryMax=256M`) | Fights Aaron's isolation model |

## The actual facts

- Host has **~15 Gi RAM**. Connect Resources is dying because the **unit** is capped at `MemoryHigh=200M` / `MemoryMax=256M` (`MemoryAvailable=0`) — **not** because the box is full.
- Pages are static, but the **process is still Node** (`output: "static"` + `@astrojs/node`). Caddy proxies HTML/CSS/JS **through Node**, which is why a "static" Smart Slider asset can time out under the cap.
- **Per-site caps stay.** A shared pool = noisy-neighbour: CR starves everyone.

## What to do (owner)

1. **Raise heavy WP mirrors first.** `connectresources.ae` → `MemoryHigh=384M`, `MemoryMax=512M`. Thin leads-only (`cbss`, `iberiaworkforce`) can stay at `256M`.
2. **Better than a huge Node cap:** serve `/wp-content/`, `/css/`, `/js/` with Caddy `file_server` so Node is not the static CDN.
3. Optional host-level **slice** as a backstop only (sum of peaks), never *instead of* per-unit caps.
4. **A restart alone will not stick** — the cap is the constraint, not transient memory.

## Git-side (already staged, template hint only — not a live change)

`deploy/*.service` examples for **heavy mirrors** may carry `MemoryHigh=384M` / `MemoryMax=512M` as a template hint for Aaron. This is a git template only; live units are owner-applied.

---

*No `/etc/systemd`, `site-ctl`, or live unit was edited. Per fleet hard rules, memory changes on the host are owner-only.*
