import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit"

/**
 * DELETE /api/saves/{ideaId} — remove the signed-in user's save for
 * the given idea. Idempotent: deleting a non-existent save returns 200.
 *
 * Auth: RLS policy on user_saves enforces user_id = auth.uid(), so
 * even if a caller crafts a DELETE against another user's idea, the
 * policy filters the target rows to zero. We still early-return 401
 * without a session for the clearer failure mode.
 */
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ ideaId: string }> }
) {
  const { ideaId } = await context.params
  if (!ideaId) {
    return NextResponse.json({ error: "Missing ideaId" }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Share the same bucket as POST /api/saves so a toggle-spammer can't
  // evade by alternating save/unsave.
  const rl = rateLimit(`save:${user.id}`, { max: 30, windowMs: 60_000 })
  if (!rl.ok) return rateLimitResponse(rl)

  const { error } = await supabase
    .from("user_saves")
    .delete()
    .eq("user_id", user.id)
    .eq("idea_id", ideaId)

  if (error) {
    console.error("DELETE /api/saves failed:", error)
    return NextResponse.json({ error: "Failed to unsave" }, { status: 500 })
  }

  return NextResponse.json({ saved: false })
}
