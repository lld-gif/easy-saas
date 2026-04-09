import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get("email")

  if (!email) {
    return new Response(unsubPage("Invalid unsubscribe link."), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    })
  }

  const decoded = decodeURIComponent(email).trim().toLowerCase()

  const { error } = await supabase
    .from("newsletter_subscribers")
    .update({ status: "unsubscribed" })
    .eq("email", decoded)

  if (error) {
    console.error("Unsubscribe error:", error)
    return new Response(unsubPage("Something went wrong. Please try again."), {
      status: 500,
      headers: { "Content-Type": "text/html" },
    })
  }

  return new Response(unsubPage("You've been unsubscribed. You won't receive any more emails from us."), {
    status: 200,
    headers: { "Content-Type": "text/html" },
  })
}

function unsubPage(message: string) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unsubscribe — Vibe Code Ideas</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f9fafb;">
  <div style="text-align: center; padding: 40px; max-width: 400px;">
    <h1 style="font-size: 20px; color: #111827; margin-bottom: 8px;">Vibe Code Ideas</h1>
    <p style="font-size: 15px; color: #6b7280; line-height: 1.6;">${message}</p>
    <a href="https://vibecodeideas.ai" style="display: inline-block; margin-top: 16px; font-size: 14px; color: #4f46e5; text-decoration: none;">Back to Vibe Code Ideas &rarr;</a>
  </div>
</body>
</html>`
}
