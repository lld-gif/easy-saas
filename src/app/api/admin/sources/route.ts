import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { isAdmin } from "@/lib/admin"

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/** GET /api/admin/sources — list all scrape sources */
export async function GET() {
  const admin = await isAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from("scrape_sources")
    .select("*")
    .order("platform")
    .order("source_identifier")

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sources: data })
}

/** POST /api/admin/sources — add a new source */
export async function POST(request: NextRequest) {
  const admin = await isAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { platform, source_identifier, label } = await request.json()
    if (!platform || !source_identifier) {
      return NextResponse.json({ error: "platform and source_identifier required" }, { status: 400 })
    }

    const supabase = getServiceClient()
    const { error } = await supabase.from("scrape_sources").insert({
      platform,
      source_identifier,
      label: label || null,
    })

    if (error) throw new Error(error.message)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}

/** PATCH /api/admin/sources — toggle enabled/disabled */
export async function PATCH(request: NextRequest) {
  const admin = await isAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id, enabled } = await request.json()
    if (!id || typeof enabled !== "boolean") {
      return NextResponse.json({ error: "id and enabled (boolean) required" }, { status: 400 })
    }

    const supabase = getServiceClient()
    const { error } = await supabase
      .from("scrape_sources")
      .update({ enabled })
      .eq("id", id)

    if (error) throw new Error(error.message)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}

/** DELETE /api/admin/sources — remove a source */
export async function DELETE(request: NextRequest) {
  const admin = await isAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

    const supabase = getServiceClient()
    const { error } = await supabase.from("scrape_sources").delete().eq("id", id)

    if (error) throw new Error(error.message)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}
