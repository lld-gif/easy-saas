import { NextRequest, NextResponse } from "next/server"
import { isAdmin } from "@/lib/admin"
import {
  updateIdeaStatus,
  updateIdea,
  bulkUpdateIdeaStatus,
  deleteIdeas,
} from "@/lib/admin-queries"

export async function PATCH(request: NextRequest) {
  const admin = await isAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { action, id, ids, status, data } = body

    switch (action) {
      case "update_status": {
        if (!id || !status) {
          return NextResponse.json({ error: "Missing id or status" }, { status: 400 })
        }
        await updateIdeaStatus(id, status)
        return NextResponse.json({ success: true })
      }

      case "update_idea": {
        if (!id || !data) {
          return NextResponse.json({ error: "Missing id or data" }, { status: 400 })
        }
        await updateIdea(id, data)
        return NextResponse.json({ success: true })
      }

      case "bulk_status": {
        if (!ids?.length || !status) {
          return NextResponse.json({ error: "Missing ids or status" }, { status: 400 })
        }
        await bulkUpdateIdeaStatus(ids, status)
        return NextResponse.json({ success: true, count: ids.length })
      }

      case "bulk_delete": {
        if (!ids?.length) {
          return NextResponse.json({ error: "Missing ids" }, { status: 400 })
        }
        await deleteIdeas(ids)
        return NextResponse.json({ success: true, count: ids.length })
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Admin ideas API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}
