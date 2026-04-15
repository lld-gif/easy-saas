import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { isAdmin } from "@/lib/admin"

const VALID_PLATFORMS = ["reddit", "hackernews", "github", "producthunt", "indiehackers", "googletrends"]

/**
 * POST /api/admin/scrape — trigger a scrape run for a specific platform
 */
export async function POST(request: NextRequest) {
  const admin = await isAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { platform } = await request.json()

    if (!platform || !VALID_PLATFORMS.includes(platform)) {
      return NextResponse.json(
        { error: `Invalid platform. Must be one of: ${VALID_PLATFORMS.join(", ")}` },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabase.functions.invoke(`scrape-${platform}`)

    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true, result: data })
  } catch (error) {
    console.error("Admin scrape error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}
