import { NextRequest, NextResponse } from "next/server"
import { isAdmin } from "@/lib/admin"
import { dismissCandidate } from "@/lib/dedup-queries"

export async function POST(request: NextRequest) {
  const admin = await isAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { candidateId } = await request.json()

    if (!candidateId) {
      return NextResponse.json(
        { error: "Missing candidateId" },
        { status: 400 }
      )
    }

    await dismissCandidate(candidateId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Dedup dismiss error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}
