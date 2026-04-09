import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

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

  // Fetch top 5 trending ideas
  const { data: ideas, error: ideasError } = await supabase
    .from("ideas")
    .select("title, summary, slug")
    .eq("status", "active")
    .order("popularity_score", { ascending: false })
    .limit(5)

  if (ideasError) {
    console.error("Failed to fetch ideas for digest:", ideasError)
    return NextResponse.json(
      { error: "Failed to fetch ideas" },
      { status: 500 }
    )
  }

  // Fetch all active subscribers
  const { data: subscribers, error: subsError } = await supabase
    .from("newsletter_subscribers")
    .select("email")
    .eq("status", "active")

  if (subsError) {
    console.error("Failed to fetch subscribers:", subsError)
    return NextResponse.json(
      { error: "Failed to fetch subscribers" },
      { status: 500 }
    )
  }

  // Generate HTML email
  const ideaListHtml = (ideas || [])
    .map(
      (idea, i) => `
      <tr>
        <td style="padding: 16px 0; border-bottom: 1px solid #e5e7eb;">
          <h3 style="margin: 0 0 4px; font-size: 16px; color: #111827;">
            ${i + 1}. ${idea.title}
          </h3>
          <p style="margin: 0 0 8px; font-size: 14px; color: #6b7280; line-height: 1.5;">
            ${idea.summary}
          </p>
          <a href="https://vibecodeideas.ai/ideas/${idea.slug}" style="font-size: 13px; color: #f97316; text-decoration: none;">
            View idea &rarr;
          </a>
        </td>
      </tr>`
    )
    .join("")

  const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #111827;">
  <h1 style="font-size: 24px; margin-bottom: 4px;">This Week's Top SaaS Ideas</h1>
  <p style="color: #6b7280; font-size: 14px; margin-top: 0;">From <a href="https://vibecodeideas.ai" style="color: #f97316; text-decoration: none;">Vibe Code Ideas</a></p>
  <table style="width: 100%; border-collapse: collapse;">
    ${ideaListHtml}
  </table>
  <p style="margin-top: 24px; font-size: 12px; color: #9ca3af;">
    You're receiving this because you subscribed at vibecodeideas.ai.
    <a href="https://vibecodeideas.ai" style="color: #9ca3af;">Unsubscribe</a>
  </p>
</body>
</html>`

  const subscriberCount = subscribers?.length ?? 0
  const ideaCount = ideas?.length ?? 0

  // TODO: Replace console.log with Resend API call when RESEND_API_KEY is configured
  console.log(`[Newsletter Digest] ${subscriberCount} subscribers, ${ideaCount} ideas`)
  console.log("[Newsletter Digest] Email HTML:", emailHtml)

  return NextResponse.json({
    success: true,
    subscriber_count: subscriberCount,
    idea_count: ideaCount,
  })
}
