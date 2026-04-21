import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { rateLimit, rateLimitResponse, callerIp } from "@/lib/rate-limit"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function POST(request: Request) {
  // Per-IP: 5 subscribe attempts / 10 min. Blocks the "enumerate a
  // million emails" pattern without inconveniencing a real user who
  // mistyped once. Unauthed endpoint so we can't key on user_id.
  const rl = rateLimit(`newsletter:${callerIp(request)}`, {
    max: 5,
    windowMs: 10 * 60_000,
  })
  if (!rl.ok) return rateLimitResponse(rl)

  try {
    const body = await request.json()
    const { email } = body

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }

    const trimmed = email.trim().toLowerCase()

    if (!isValidEmail(trimmed)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from("newsletter_subscribers")
      .upsert(
        { email: trimmed, status: "active" },
        { onConflict: "email" }
      )

    if (error) {
      console.error("Newsletter subscribe error:", error)
      return NextResponse.json(
        { error: "Something went wrong. Please try again." },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    )
  }
}
