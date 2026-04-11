import { NextResponse } from "next/server"
import { isAdmin } from "@/lib/admin"
import { refreshDedupCandidates } from "@/lib/dedup-queries"

export async function POST() {
  const admin = await isAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const count = await refreshDedupCandidates()
    return NextResponse.json({ success: true, newCandidates: count })
  } catch (error) {
    console.error("Dedup refresh error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}
