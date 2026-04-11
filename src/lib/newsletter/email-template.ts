/**
 * Newsletter email template builder.
 *
 * Pure function — given a DigestData payload, returns an HTML string
 * ready to pass to Resend. No I/O, no side effects, so it's trivially
 * unit-testable if we ever want to.
 *
 * Visual style follows the existing send-digest route's brand language
 * (orange #f97316 primary, slate neutrals, 12px radii) but reorganizes
 * the layout into four distinct sections:
 *
 *   1. Featured Idea      — big card, hero of the email
 *   2. Trending Picks     — 4 compact rows, list-style
 *   3. Revenue Spotlight  — one idea with the monthly ceiling prominent
 *   4. Category Highlights — 3 compact rows across distinct categories
 *
 * All link URLs are appended with `?ref=newsletter` so downstream GA /
 * search-console analytics can attribute traffic back to the digest.
 */

import type {
  DigestData,
  DigestIdea,
  CategoryHighlight,
} from "./queries"
import { categoryLabel } from "./queries"
import { displayMentions } from "@/lib/utils"

const BASE_URL = "https://vibecodeideas.ai"
const REF = "?ref=newsletter"

// ---- helpers ---------------------------------------------------------------

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str
  return str.slice(0, max).trimEnd() + "…"
}

function ideaUrl(slug: string): string {
  return `${BASE_URL}/ideas/${slug}${REF}`
}

/**
 * Format a revenue_upper_usd value into a short human string for the
 * spotlight badge. We use "$Xk/mo ceiling" framing so subscribers
 * understand this is the top of the inferred range, not a guarantee.
 */
function formatRevenueCeiling(upperUsd: number | null): string {
  if (!upperUsd) return ""
  if (upperUsd >= 1_000_000) return `$${Math.round(upperUsd / 1_000_000)}M/mo ceiling`
  if (upperUsd >= 1_000) return `$${Math.round(upperUsd / 1_000)}k/mo ceiling`
  return `$${upperUsd}/mo ceiling`
}

// ---- section builders ------------------------------------------------------

function renderFeaturedSection(idea: DigestIdea): string {
  return `
      <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 32px;">
        <tr>
          <td style="padding: 28px; background-color: #fff7ed; border-radius: 12px; border: 1px solid #fed7aa;">
            <span style="display: inline-block; padding: 3px 10px; background-color: #f97316; color: #ffffff; font-size: 11px; font-weight: 600; border-radius: 99px; text-transform: uppercase; letter-spacing: 0.5px;">⭐ Featured</span>
            <h2 style="margin: 14px 0 8px; font-size: 22px; color: #111827; line-height: 1.3;">
              ${escapeHtml(idea.title)}
            </h2>
            <p style="margin: 0 0 18px; font-size: 14px; color: #4b5563; line-height: 1.6;">
              ${escapeHtml(truncate(idea.summary, 320))}
            </p>
            <p style="margin: 0 0 20px; font-size: 12px; color: #78716c;">
              <strong style="color: #c2410c;">${categoryLabel(idea.category)}</strong>
              &middot; ${displayMentions(idea.mention_count)} mentions across the web
              ${idea.revenue_upper_usd ? `&middot; ${formatRevenueCeiling(idea.revenue_upper_usd)}` : ""}
            </p>
            <a href="${ideaUrl(idea.slug)}" style="display: inline-block; padding: 11px 24px; background-color: #f97316; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">Read the full breakdown &rarr;</a>
          </td>
        </tr>
      </table>`
}

function renderTrendingRow(idea: DigestIdea): string {
  return `
        <tr>
          <td style="padding: 14px 0; border-bottom: 1px solid #f1f5f9;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="vertical-align: middle;">
                  <a href="${ideaUrl(idea.slug)}" style="font-size: 15px; color: #111827; text-decoration: none; font-weight: 500; line-height: 1.4;">
                    ${escapeHtml(idea.title)}
                  </a>
                  <span style="display: inline-block; margin-left: 8px; padding: 2px 8px; background-color: #f1f5f9; color: #64748b; font-size: 11px; font-weight: 500; border-radius: 99px;">${categoryLabel(idea.category)}</span>
                </td>
                <td style="text-align: right; white-space: nowrap; vertical-align: middle; padding-left: 12px;">
                  <span style="font-size: 12px; color: #9ca3af;">${displayMentions(idea.mention_count)} mentions</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>`
}

function renderTrendingSection(ideas: DigestIdea[]): string {
  if (ideas.length === 0) return ""
  return `
      <h3 style="margin: 0 0 16px; font-size: 13px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 600;">Trending Picks</h3>
      <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 32px;">
        ${ideas.map(renderTrendingRow).join("")}
      </table>`
}

function renderRevenueSpotlightSection(idea: DigestIdea): string {
  const ceiling = formatRevenueCeiling(idea.revenue_upper_usd)

  return `
      <h3 style="margin: 0 0 16px; font-size: 13px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 600;">💰 Revenue Spotlight</h3>
      <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 32px;">
        <tr>
          <td style="padding: 20px; background-color: #ecfdf5; border-radius: 12px; border: 1px solid #a7f3d0;">
            ${ceiling ? `<span style="display: inline-block; padding: 3px 10px; background-color: #059669; color: #ffffff; font-size: 11px; font-weight: 600; border-radius: 99px; text-transform: uppercase; letter-spacing: 0.5px;">${ceiling}</span>` : ""}
            <h4 style="margin: 12px 0 8px; font-size: 17px; color: #065f46; line-height: 1.3;">
              <a href="${ideaUrl(idea.slug)}" style="color: #065f46; text-decoration: none;">
                ${escapeHtml(idea.title)}
              </a>
            </h4>
            <p style="margin: 0 0 10px; font-size: 13px; color: #047857; line-height: 1.5;">
              ${escapeHtml(truncate(idea.summary, 200))}
            </p>
            <p style="margin: 0; font-size: 12px; color: #059669;">
              ${categoryLabel(idea.category)} &middot; ${displayMentions(idea.mention_count)} mentions
            </p>
          </td>
        </tr>
      </table>`
}

function renderCategoryHighlightRow({ idea }: CategoryHighlight): string {
  return `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9;">
            <div style="font-size: 11px; color: #c2410c; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">${categoryLabel(idea.category)}</div>
            <a href="${ideaUrl(idea.slug)}" style="font-size: 15px; color: #111827; text-decoration: none; font-weight: 500;">
              ${escapeHtml(idea.title)}
            </a>
            <p style="margin: 4px 0 0; font-size: 12px; color: #6b7280; line-height: 1.5;">
              ${escapeHtml(truncate(idea.summary, 140))}
            </p>
          </td>
        </tr>`
}

function renderCategoryHighlightsSection(highlights: CategoryHighlight[]): string {
  if (highlights.length === 0) return ""
  return `
      <h3 style="margin: 0 0 16px; font-size: 13px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 600;">Category Highlights</h3>
      <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 32px;">
        ${highlights.map(renderCategoryHighlightRow).join("")}
      </table>`
}

function renderEmptyState(): string {
  return `
      <div style="padding: 32px; text-align: center; background-color: #f9fafb; border-radius: 12px; color: #6b7280; font-size: 14px;">
        No fresh ideas to feature this week. Check back next Tuesday!
      </div>`
}

// ---- public API ------------------------------------------------------------

export interface RenderOptions {
  /**
   * Unsubscribe URL to embed in the footer. Should already include the
   * subscriber's email as a query param.
   */
  unsubscribeUrl: string
}

/**
 * Render the full digest email HTML from a DigestData payload.
 *
 * Handles the empty-corpus case gracefully — if no featured idea exists,
 * returns a minimal "no ideas this week" email so the cron doesn't blow
 * up on a brand-new deploy or a bad scrape run.
 */
export function renderDigestEmail(
  data: DigestData,
  options: RenderOptions
): string {
  const hasContent = data.featured !== null

  const body = hasContent
    ? [
        renderFeaturedSection(data.featured!),
        renderTrendingSection(data.trending),
        data.revenueSpotlight ? renderRevenueSpotlightSection(data.revenueSpotlight) : "",
        renderCategoryHighlightsSection(data.categoryHighlights),
      ]
        .filter(Boolean)
        .join("\n")
    : renderEmptyState()

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Weekly SaaS Ideas Digest</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111827; background-color: #ffffff;">

  <!-- Header -->
  <div style="text-align: center; margin-bottom: 36px;">
    <h1 style="font-size: 22px; margin: 0 0 6px; color: #111827;">This Week in Micro-SaaS Ideas</h1>
    <p style="color: #6b7280; font-size: 14px; margin: 0;">
      Curated from across the internet by
      <a href="${BASE_URL}${REF}" style="color: #f97316; text-decoration: none; font-weight: 500;">Vibe Code Ideas</a>
    </p>
  </div>

  ${body}

  <!-- Primary CTA -->
  <div style="margin-top: 36px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center;">
    <a href="${BASE_URL}/ideas${REF}" style="display: inline-block; padding: 11px 28px; background-color: #f97316; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">
      Browse all ideas &rarr;
    </a>
  </div>

  <!-- Footer -->
  <p style="margin-top: 36px; font-size: 12px; color: #9ca3af; text-align: center; line-height: 1.6;">
    You're receiving this because you subscribed at
    <a href="${BASE_URL}${REF}" style="color: #9ca3af; text-decoration: underline;">vibecodeideas.ai</a>.<br/>
    <a href="${options.unsubscribeUrl}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe</a>
  </p>

</body>
</html>`
}

/**
 * Canonical subject line for the weekly digest. Pulled out so the route
 * and any future A/B testing harness can share it.
 */
export function digestSubject(data: DigestData): string {
  if (!data.featured) return "Your weekly SaaS ideas digest"
  const featured = truncate(data.featured.title, 40)
  return `🚀 ${featured} + ${data.trending.length} more this week`
}
