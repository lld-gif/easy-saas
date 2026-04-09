import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { getUser } from "@/lib/auth"
import { createClient } from "@supabase/supabase-js"

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: Request) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  let customerId = user.stripe_customer_id

  // Fallback: if Pro but no customer ID (e.g. webhook missed), look up by email
  if (!customerId && user.email) {
    const customers = await stripe.customers.list({ email: user.email, limit: 1 })
    if (customers.data.length > 0) {
      customerId = customers.data[0].id
      // Backfill the missing customer ID
      await getServiceClient()
        .from("users")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id)
    }
  }

  if (!customerId) {
    return NextResponse.json({ error: "No billing account found" }, { status: 400 })
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${req.headers.get("origin") || "http://localhost:3000"}/ideas`,
    })
    return NextResponse.json({ url: session.url })
  } catch (e) {
    console.error("Portal error:", e)
    return NextResponse.json({ error: "Portal failed" }, { status: 500 })
  }
}
