# Percentile Viz Variants — Comparison

**Branch:** `feat/percentile-viz-exploration`
**Preview:** run `pnpm dev` and visit `/dev/percentile-preview`
**Files:** `src/components/popularity/Variant{A,B,C,D}-*.tsx`

## Problem

The current shipped display uses five text-only tier labels ("Top 10%", "Top 25%",
"Average", "Below Avg", "Bottom 15%") rendered as a small span next to a star icon.
Feedback: "text-only labels are still not visually distinctive enough."

Goal: make the tier readable at a glance on the card / list row, without overwhelming
the rest of the card.

## Real Distribution (validates midrank fix)

See `percentile-distribution-analysis.md` for the full histogram. Summary:

- 1000 active ideas, raw `popularity_score` compressed into a narrow 3.5–5.47 range
- 99.7% of scores are unique (the log+decay formula barely separates them)
- Midrank `getPercentile` correctly spreads into: **10.5 / 15.0 / 35.0 / 25.0 / 14.5%**
- This matches the synthetic test (11 / 15 / 35 / 25 / 14%) within rounding —
  the midrank fix genuinely works on real data, and "Average" really is the modal tier.

The mid-band is the largest bucket, so whatever variant we pick must make "Average"
feel neutral rather than bad.

## Variants

### A — Colored Pill (`VariantA-ColoredPill.tsx`)

Solid tinted pill with tier label. Hue encodes tier: emerald → lime → amber → orange → rose.
Uses `bg-*/15` + `ring-inset` so it reads as a chip, not a hard button.

**Pros**
- Fastest at-a-glance recognition via pure color
- Matches shadcn chip conventions already present elsewhere in the app
- Low visual weight when used repeatedly in a list
- Dark / light mode safe via `/15` tints and `dark:text-*-400`

**Cons**
- Pure color-coding is weaker for color-blind users (no secondary cue)
- Five distinct hues is at the upper limit of what a list should carry — competes with
  the orange brand color on hover and the existing DifficultyBadge
- "Bottom 15%" in rose next to other muted chips may read as error state

### B — Icon + Label (`VariantB-IconLabel.tsx`)

Lucide icon + colored label text, no background. Icons: `Flame / TrendingUp / Minus /
TrendingDown / Snowflake`. Color follows the tier.

**Pros**
- Very light visual weight — closest to the current shipped display in footprint
- Icon provides a secondary cue independent of color (helps accessibility)
- Icons carry emotional affordance instantly (fire = hot, snowflake = cold)
- Fits tight list rows without shifting layout

**Cons**
- Text-only outside the icon means it still competes with surrounding small text
- Emotional connotation may be too strong: "Bottom 15%" with a snowflake could
  feel punitive for ideas that are still perfectly buildable
- Five-icon vocabulary requires the user to learn the scale

### C — Position Bar (`VariantC-PositionBar.tsx`)

Horizontal gradient track (rose → amber → emerald) with a ringed marker at the
idea's percentile, followed by the label.

**Pros**
- Shows absolute position, not just a bucket — user intuitively sees "this idea is
  in the top quarter" vs. "bang in the middle"
- Richest information density of the four variants
- Gradient legend is self-explanatory; no learning curve
- Beats labels alone at conveying "where in the pack"

**Cons**
- Widest footprint (~96px for the bar + label) — pressures compact list rows
- Needs care at small sizes so the marker doesn't get clipped at p=0 / p=100
- Still carries the label, so it's additive cost vs. A/B rather than a replacement

### D — Tier Badge with Pips (`VariantD-TierBadge.tsx`)

Designed badge: 5-pip meter (1..5 filled by tier) + tier label + gradient tier background.

**Pros**
- Most "designed" of the four — feels like a first-class UI element
- Pip count is an ordinal cue that works even if color is stripped (color-blind safe)
- Gradient background adds polish without being heavy
- Reads as a rating, which aligns with user expectation for a popularity metric

**Cons**
- Highest visual weight of the four — risks competing with DifficultyBadge on the
  same row
- Pip meter is slightly redundant with the color (two signals for the same thing)
- More pixels = more to render in long lists; not a problem at our scale but worth noting

## Recommendation

**Primary: B (Icon + Label)** for the list row and card — it preserves the minimal
footprint of the current shipped display, adds a dual-channel cue (icon + color) that
fixes the "text-only is invisible" complaint, and the icon vocabulary is
intuitive enough to skip a legend.

**Secondary: C (Position Bar)** for the idea detail page (`/ideas/[slug]`) where
there's room to breathe and the extra information density actually earns its cost.

**Avoid as default: A** — a colored pill next to the existing DifficultyBadge pill
creates visual noise. The list row ends up with three chips competing for attention.

**Avoid as default: D** — strongest as a detail-page element but too heavy for the
list row density we ship. Consider if we ever redesign the row.

**Tweak for B before shipping:** the "Bottom 15%" snowflake may feel punitive. Consider
toning the rose down or using `Snowflake` only for the lowest-lowest scores and
`TrendingDown` for "Below Avg" (already the case in the current variant).

## Screenshots

_(User to capture on the morning review. Preview page at `/dev/percentile-preview`
renders the real-data side-by-side table + a synthetic 0-100 sweep for a clean
gallery shot.)_

- [ ] Screenshot: real-data table (light mode)
- [ ] Screenshot: real-data table (dark mode)
- [ ] Screenshot: full sweep table showing each variant across the 0-100 range
