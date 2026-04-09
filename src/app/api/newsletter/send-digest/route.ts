import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { Resend } from "resend"

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

  const ideaListHtml = (ideas || [])
    .map(
      (idea, i) => `
      <tr>
        <td style="padding: 16px 0; border-bottom: 1px solid #e5e7eb;">
          <h3 style="margin: 0 0 4px; font-size: 16px; color: #111827;">
            ${i + 1}. ${idea.title}
          </h3>
          <p style="margin: 0 0 8px; font-size: 14px; color: #6b7280; line-height: 1.5;">
            ${idea.summary.slice(0, 160)}${idea.summary.length > 160 ? "…" : ""}
          </p>
          <a href="${baseUrl}/ideas/${idea.slug}" style="font-size: 13px; color: #4f46e5; text-decoration: none; font-weight: 500;">
            View idea &rarr;
          </a>
        </td>
      </tr>`
    )
    .join("")

  const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #111827; background-color: #ffffff;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h1 style="font-size: 22px; margin-bottom: 4px; color: #111827;">This Week's Top SaaS Ideas</h1>
    <p style="color: #6b7280; font-size: 14px; margin-top: 0;">Curated from across the internet by <a href="${baseUrl}" style="color: #4f46e5; text-decoration: none;">Vibe Code Ideas</a></p>
  </div>
  <table style="width: 100%; border-collapse: collapse;">
    ${ideaListHtml}
  </table>
  <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center;">
    <a href="${baseUrl}/ideas" style="display: inline-block; padding: 10px 24px; background-color: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;">Browse all ideas</a>
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
          from: "Vibe Code Ideas <digest@vibecodeideas.ai>",
          to: sub.email,
          subject: `Top 5 SaaS Ideas This Week — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
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
