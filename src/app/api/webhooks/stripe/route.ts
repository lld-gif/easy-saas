import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get("stripe-signature")

  if (!sig) return NextResponse.json({ error: "No signature" }, { status: 400 })

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error("Webhook signature verification failed:", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as any
      const userId = session.metadata?.supabase_user_id
      const customerId = session.customer as string
      if (userId) {
        await supabase.from("users").update({ subscription_status: "pro", stripe_customer_id: customerId }).eq("id", userId)
      }
      break
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as any
      const customerId = subscription.customer as string
      await supabase.from("users").update({ subscription_status: "free" }).eq("stripe_customer_id", customerId)
      break
    }
    case "invoice.payment_failed": {
      console.warn("Payment failed for customer:", (event.data.object as any).customer)
      break
    }
  }

  return NextResponse.json({ received: true })
}
