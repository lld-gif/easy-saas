import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { getUser } from "@/lib/auth"

export async function POST(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  let plan = "monthly"
  try {
    const body = await req.json()
    if (body.plan === "annual") plan = "annual"
  } catch {
    // No body or invalid JSON — default to monthly
  }

  const priceId =
    plan === "annual"
      ? process.env.STRIPE_PRO_ANNUAL_PRICE_ID!
      : process.env.STRIPE_PRO_PRICE_ID!

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email,
      metadata: { supabase_user_id: user.id },
      success_url: `${req.headers.get("origin") || "http://localhost:3000"}/ideas?upgraded=true`,
      cancel_url: `${req.headers.get("origin") || "http://localhost:3000"}/pricing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (e) {
    console.error("Checkout error:", e)
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 })
  }
}
