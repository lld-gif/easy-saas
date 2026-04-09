import { NextResponse } from "next/server"
import { getUser } from "@/lib/auth"
import { generatePackage, checkRateLimit } from "@/lib/packages"
import { createClient } from "@supabase/supabase-js"

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: Request) {
  const supabase = getServiceClient()
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  if (user.subscription_status !== "pro") return NextResponse.json({ error: "Pro subscription required" }, { status: 403 })

  const { idea_id } = await req.json()
  if (!idea_id) return NextResponse.json({ error: "idea_id required" }, { status: 400 })

  // Check cache
  const { data: existing } = await supabase
    .from("idea_details")
    .select("package_json")
    .eq("idea_id", idea_id)
    .single()

  if (existing?.package_json) {
    return NextResponse.json({ package: existing.package_json, cached: true })
  }

  // Check rate limit
  const { allowed, count } = await checkRateLimit(user.id)
  if (!allowed) {
    return NextResponse.json({
      error: "Daily limit reached",
      message: `You've explored ${count} ideas today. Come back tomorrow!`,
    }, { status: 429 })
  }

  // Fetch idea
  const { data: idea } = await supabase
    .from("ideas")
    .select("id, title, summary, category, difficulty, tags")
    .eq("id", idea_id)
    .single()

  if (!idea) return NextResponse.json({ error: "Idea not found" }, { status: 404 })

  try {
    const packageJson = await generatePackage(idea)

    await supabase.from("idea_details").upsert({
      idea_id: idea.id,
      package_json: packageJson,
      generated_by: user.id,
    })

    await supabase.from("generation_log").insert({
      user_id: user.id,
      idea_id: idea.id,
    })

    return NextResponse.json({ package: packageJson, cached: false })
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e))
    console.error("Package generation failed:", err.message)
    console.error("Stack:", err.stack)
    if ("status" in (e as any)) console.error("API status:", (e as any).status)
    if ("error" in (e as any)) console.error("API error:", JSON.stringify((e as any).error))
    return NextResponse.json({
      error: "Generation temporarily unavailable",
      message: err.message || "Please try again later.",
    }, { status: 500 })
  }
}
