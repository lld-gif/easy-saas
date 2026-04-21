import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * Supabase Auth callback. Exchanges the short-lived `code` param that
 * Google OAuth / magic-link returns into a session cookie, then
 * redirects the user back into the app.
 *
 * Extra query params this route respects:
 *   - `next` — relative path to redirect to after session exchange
 *     (defaults to "/"). Preserves the page the user was on when they
 *     clicked "Sign in".
 *   - `save` — if present and valid, inserts a user_saves row for the
 *     given idea_id before redirecting. Used by the SaveStar flow so
 *     an unauthenticated click → sign-in round-trips to a saved state
 *     on the original page. Idempotent (upsert on unique constraint).
 *
 * Failure modes fall back to `/?error=auth` without leaking detail.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/"
  const saveIdeaId = searchParams.get("save")

  if (!code) {
    return NextResponse.redirect(`${origin}/?error=auth`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(`${origin}/?error=auth`)
  }

  // Best-effort auto-save for the "click ⭐ while signed out" flow.
  // Failures here are silent — the user can re-click the star if the
  // save didn't stick. RLS enforces that the insert is attributed to
  // the session we just established.
  if (saveIdeaId) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from("user_saves")
        .upsert(
          { user_id: user.id, idea_id: saveIdeaId },
          { onConflict: "user_id,idea_id", ignoreDuplicates: true }
        )
    }
  }

  return NextResponse.redirect(`${origin}${next}`)
}
