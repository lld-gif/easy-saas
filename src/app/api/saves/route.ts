import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * POST /api/saves — create a save for the currently-signed-in user.
 *
 * Request: { idea_id: string }
 * Responses:
 *   200 { saved: true } — inserted (or already existed; we upsert)
 *   400 — malformed body or missing idea_id
 *   401 — not signed in
 *   404 — idea_id doesn't exist
 *   500 — DB error
 *
 * Idempotent: the UNIQUE (user_id, idea_id) constraint means a repeated
 * POST for the same pair returns 200 without creating a duplicate row.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { idea_id?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const ideaId = body.idea_id
  if (!ideaId || typeof ideaId !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid idea_id" },
      { status: 400 }
    )
  }

  // Verify the idea exists. Without this check a caller could spam
  // user_saves with arbitrary UUIDs — the FK would catch it but we'd
  // rather fail with a clear 404.
  const { data: idea, error: ideaErr } = await supabase
    .from("ideas")
    .select("id")
    .eq("id", ideaId)
    .maybeSingle()
  if (ideaErr) {
    return NextResponse.json(
      { error: "Failed to validate idea" },
      { status: 500 }
    )
  }
  if (!idea) {
    return NextResponse.json({ error: "Idea not found" }, { status: 404 })
  }

  // Upsert so a re-click on an already-saved star resolves without
  // a unique-constraint error. `ignoreDuplicates: true` makes the
  // operation idempotent.
  const { error: insertErr } = await supabase
    .from("user_saves")
    .upsert(
      { user_id: user.id, idea_id: ideaId },
      { onConflict: "user_id,idea_id", ignoreDuplicates: true }
    )
  if (insertErr) {
    console.error("POST /api/saves upsert failed:", insertErr)
    return NextResponse.json({ error: "Failed to save" }, { status: 500 })
  }

  return NextResponse.json({ saved: true })
}
