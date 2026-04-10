import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { Resend } from "resend"
import { displayMentions } from "@/lib/utils"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 })
  }

  const resend = new Resend(resendKey)

  // Fetch top 5 trending ideas
  const { data: ideas, error: ideasError } = await supabase
    .from("ideas")
    .select("title, summary, slug, category, mention_count")
    .eq("status", "active")
    .order("popularity_score", { ascending: false })
    .limit(5)

  if (ideasError) {
    console.error("Failed to fetch ideas for digest:", ideasError)
    return NextResponse.json({ error: "Failed to fetch ideas" }, { status: 500 })
  }

  // Fetch all active subscribers
  const { data: subscribers, error: subsError } = await supabase
    .from("newsletter_subscribers")
    .select("email")
    .eq("status", "active")

  if (subsError) {
    console.error("Failed to fetch subscribers:", subsError)
    return NextResponse.json({ error: "Failed to fetch subscribers" }, { status: 500 })
  }

  if (!subscribers || subscribers.length === 0) {
    return NextResponse.json({ success: true, message: "No subscribers", sent: 0 })
  }

  // Build email HTML
  const baseUrl = "https://vibecodeideas.ai"
  const allIdeas = ideas || []
  const featured = allIdeas[0]
  const quickPicks = allIdeas.slice(1)

  // Featured idea section
  const featuredHtml = featured
    ? `
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px;">
        <tr>
          <td style="padding: 24px; background-color: #f8fafc; border-radius: 12px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td>
                  <span style="display: inline-block; padding: 3px 10px; background-color: #eef2ff; color: #4338ca; font-size: 11px; font-weight: 600; border-radius: 99px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">${featured.category}</span>
                  <h2 style="margin: 12px 0 8px; font-size: 20px; color: #111827; line-height: 1.3;">${featured.title}</h2>
                  <p style="margin: 0 0 16px; font-size: 14px; color: #6b7280; line-height: 1.6;">
                    ${featured.summary.slice(0, 300)}${featured.summary.length > 300 ? "..." : ""}
                  </p>
                  <p style="margin: 0 0 20px; font-size: 13px; color: #9ca3af;">
                    ${displayMentions(featured.mention_count)} mentions across the web
                  </p>
                  <a href="${baseUrl}/ideas/${featured.slug}" style="display: inline-block; padding: 10px 24px; background-color: #f97316; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">Read more &rarr;</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>`
    : ""

  // Quick picks section
  const quickPicksHtml =
    quickPicks.length > 0
      ? `
      <h3 style="margin: 0 0 16px; font-size: 14px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 600;">Quick Picks</h3>
      <table style="width: 100%; border-collapse: collapse;">
        ${quickPicks
          .map(
            (idea) => `
        <tr>
          <td style="padding: 14px 0; border-bottom: 1px solid #f1f5f9;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="vertical-align: middle;">
                  <a href="${baseUrl}/ideas/${idea.slug}" style="font-size: 15px; color: #111827; text-decoration: none; font-weight: 500; line-height: 1.4;">${idea.title}</a>
                  <span style="display: inline-block; margin-left: 8px; padding: 2px 8px; background-color: #f1f5f9; color: #64748b; font-size: 11px; font-weight: 500; border-radius: 99px;">${idea.category}</span>
                </td>
                <td style="text-align: right; white-space: nowrap; vertical-align: middle; padding-left: 12px;">
                  <span style="font-size: 12px; color: #9ca3af;">${displayMentions(idea.mention_count)} mentions</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>`
          )
          .join("")}
      </table>`
      : ""

  const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #111827; background-color: #ffffff;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="font-size: 22px; margin-bottom: 4px; color: #111827;">This Week's Hottest SaaS Idea</h1>
    <p style="color: #6b7280; font-size: 14px; margin-top: 0;">Curated from across the internet by <a href="${baseUrl}" style="color: #f97316; text-decoration: none; font-weight: 500;">Vibe Code Ideas</a></p>
  </div>
  ${featuredHtml}
  ${quickPicksHtml}
  <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center;">
    <a href="${baseUrl}/ideas" style="display: inline-block; padding: 10px 24px; background-color: #f97316; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">Browse all ideas</a>
  </div>
  <p style="margin-top: 32px; font-size: 12px; color: #9ca3af; text-align: center;">
    You're receiving this because you subscribed at vibecodeideas.ai.<br/>
    <a href="${baseUrl}/api/newsletter/unsubscribe?email={{email}}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe</a>
  </p>
</body>
</html>`

  // Send to each subscriber via Resend
  let sent = 0
  let failed = 0

  // Batch send — Resend supports up to 100 emails per batch
  const batchSize = 50
  for (let i = 0; i < subscribers.length; i += batchSize) {
    const batch = subscribers.slice(i, i + batchSize)

    const results = await Promise.allSettled(
      batch.map((sub) =>
        resend.emails.send({
          from: "Vibe Code Ideas <digest@resend.dev>",
          to: sub.email,
          subject: `\u{1F680} This Week's Hottest SaaS Idea + 4 Quick Picks`,
          html: emailHtml.replace("{{email}}", encodeURIComponent(sub.email)),
        })
      )
    )

    for (const result of results) {
      if (result.status === "fulfilled") sent++
      else {
        failed++
        console.error("Resend error:", result.reason)
      }
    }
  }

  return NextResponse.json({
    success: true,
    sent,
    failed,
    subscriber_count: subscribers.length,
    idea_count: ideas?.length ?? 0,
  })
}
