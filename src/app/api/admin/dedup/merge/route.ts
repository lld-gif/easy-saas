import { NextRequest, NextResponse } from "next/server"
import { isAdmin } from "@/lib/admin"
import { mergeIdeas } from "@/lib/dedup-queries"

export async function POST(request: NextRequest) {
  const admin = await isAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { winnerId, loserId } = await request.json()

    if (!winnerId || !loserId) {
      return NextResponse.json(
        { error: "Missing winnerId or loserId" },
        { status: 400 }
      )
    }

    await mergeIdeas(winnerId, loserId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Dedup merge error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}
