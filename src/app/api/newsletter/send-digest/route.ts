/**
 * Newsletter send-digest cron route.
 *
 * Auth paths:
 * - Cron: Authorization: Bearer ${CRON_SECRET}  → sends to all subscribers
 * - Dry-run: ?dryRun=1 with cron auth            → returns HTML + data preview,
 *                                                  does NOT touch Resend
 *
 * The dry-run path lets admins smoke-test the template + data layer
 * locally (or on a preview deploy) without spamming subscribers. Output
 * is a JSON payload with the generated HTML, the digest data, and the
 * subscriber count that WOULD have been notified.
 *
 * Data and template are factored into @/lib/newsletter for reuse and
 * testability. This route is just glue: auth → fetch → render → send.
 */

import { NextResponse } from "next/server"
import { Resend } from "resend"
import { getDigestData, getActiveSubscribers } from "@/lib/newsletter/queries"
import { renderDigestEmail, digestSubject } from "@/lib/newsletter/email-template"

export const dynamic = "force-dynamic"

const BATCH_SIZE = 50

export async function GET(request: Request) {
  // --- Auth check -----------------------------------------------------------
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const dryRun = url.searchParams.get("dryRun") === "1"

  // --- Fetch digest data ----------------------------------------------------
  const data = await getDigestData()

  if (!data.featured) {
    return NextResponse.json({
      success: true,
      message: "No active ideas to feature — skipping digest",
      sent: 0,
    })
  }

  // --- Render email (template-only, no subscriber embedded yet) ------------
  // We render with a placeholder unsubscribe URL that gets replaced
  // per-recipient inside the batch loop. This keeps the expensive
  // render out of the per-recipient path.
  const htmlTemplate = renderDigestEmail(data, {
    unsubscribeUrl: "https://vibecodeideas.ai/api/newsletter/unsubscribe?email={{EMAIL_PLACEHOLDER}}",
  })

  const subject = digestSubject(data)

  // --- Dry-run path: return preview payload, do NOT send --------------------
  if (dryRun) {
    const subscriberCount = (await getActiveSubscribers()).length
    return NextResponse.json(
      {
        dryRun: true,
        subject,
        subscriberCount,
        ideaCount:
          (data.featured ? 1 : 0) +
          data.trending.length +
          (data.revenueSpotlight ? 1 : 0) +
          data.categoryHighlights.length,
        data: {
          featured: data.featured && {
            id: data.featured.id,
            title: data.featured.title,
            category: data.featured.category,
            revenue_upper_usd: data.featured.revenue_upper_usd,
          },
          trending: data.trending.map((i) => ({
            id: i.id,
            title: i.title,
            category: i.category,
          })),
          revenueSpotlight: data.revenueSpotlight && {
            id: data.revenueSpotlight.id,
            title: data.revenueSpotlight.title,
            revenue_upper_usd: data.revenueSpotlight.revenue_upper_usd,
          },
          categoryHighlights: data.categoryHighlights.map((c) => ({
            category: c.category,
            title: c.idea.title,
          })),
        },
        htmlLength: htmlTemplate.length,
        html: htmlTemplate,
      },
      { status: 200 }
    )
  }

  // --- Real send: fetch subscribers, batch through Resend ------------------
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return NextResponse.json(
      { error: "RESEND_API_KEY not configured" },
      { status: 500 }
    )
  }
  const resend = new Resend(resendKey)

  const subscribers = await getActiveSubscribers()
  if (subscribers.length === 0) {
    return NextResponse.json({
      success: true,
      message: "No active subscribers",
      sent: 0,
    })
  }

  let sent = 0
  let failed = 0

  for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
    const batch = subscribers.slice(i, i + BATCH_SIZE)
    const results = await Promise.allSettled(
      batch.map((email) =>
        resend.emails.send({
          from: "Vibe Code Ideas <digest@resend.dev>",
          to: email,
          subject,
          html: htmlTemplate.replace(
            "{{EMAIL_PLACEHOLDER}}",
            encodeURIComponent(email)
          ),
        })
      )
    )

    for (const result of results) {
      if (result.status === "fulfilled") {
        sent++
      } else {
        failed++
        console.error("[newsletter] Resend error:", result.reason)
      }
    }
  }

  return NextResponse.json({
    success: true,
    sent,
    failed,
    subscriber_count: subscribers.length,
    subject,
    idea_count:
      (data.featured ? 1 : 0) +
      data.trending.length +
      (data.revenueSpotlight ? 1 : 0) +
      data.categoryHighlights.length,
  })
}
