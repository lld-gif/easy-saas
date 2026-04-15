import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { isAdmin } from "@/lib/admin"

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * PATCH /api/admin/users — update a user's subscription plan
 */
export async function PATCH(request: NextRequest) {
  const admin = await isAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { userId, plan } = await request.json()

    if (!userId || !plan || !["free", "pro"].includes(plan)) {
      return NextResponse.json(
        { error: "Missing or invalid userId / plan (must be 'free' or 'pro')" },
        { status: 400 }
      )
    }

    const supabase = getServiceClient()
    const { error } = await supabase
      .from("users")
      .update({ subscription_status: plan, updated_at: new Date().toISOString() })
      .eq("id", userId)

    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Admin user update error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/users — create a new user manually
 */
export async function POST(request: NextRequest) {
  const admin = await isAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { email, plan } = await request.json()

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 })
    }

    const subscriptionStatus = plan === "pro" ? "pro" : "free"
    const supabase = getServiceClient()

    // Create the auth user (sends a confirmation email by default)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      email_confirm: true,
    })

    if (authError) {
      if (authError.message.includes("already been registered")) {
        return NextResponse.json({ error: "Email already registered" }, { status: 409 })
      }
      throw new Error(authError.message)
    }

    // The handle_new_user trigger should auto-create the public.users row,
    // but set the plan explicitly in case we want pro
    if (subscriptionStatus === "pro" && authData.user) {
      await supabase
        .from("users")
        .update({ subscription_status: "pro" })
        .eq("id", authData.user.id)
    }

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user?.id,
        email: authData.user?.email,
        plan: subscriptionStatus,
      },
    })
  } catch (error) {
    console.error("Admin user create error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}
