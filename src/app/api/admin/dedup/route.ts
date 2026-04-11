import { NextResponse } from "next/server"
import { isAdmin } from "@/lib/admin"
import { getDedupCandidates } from "@/lib/dedup-queries"

export async function GET() {
  const admin = await isAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const data = await getDedupCandidates()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Dedup API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}
