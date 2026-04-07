import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { getUser } from "@/lib/auth"

export async function POST(req: Request) {
  const user = await getUser()
  if (!user?.stripe_customer_id) {
    return NextResponse.json({ error: "No subscription" }, { status: 400 })
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${req.headers.get("origin") || "http://localhost:3000"}/ideas`,
    })
    return NextResponse.json({ url: session.url })
  } catch (e) {
    console.error("Portal error:", e)
    return NextResponse.json({ error: "Portal failed" }, { status: 500 })
  }
}
