/**
 * Server-side helpers for Feature #2 (user saves / watchlist).
 *
 * Used by /saved, idea list pages, and the idea detail page to
 * efficiently figure out which ideas the current user has already
 * starred. Paired with the POST/DELETE /api/saves routes that handle
 * mutations.
 *
 * All reads below go through the RLS-gated `user_saves` table — even
 * with a service-role client, the `user_id = auth.uid()` filter keeps
 * cross-user leaks impossible.
 */

import { createClient } from "@/lib/supabase/server"

/**
 * Return the set of `idea.id` values the currently-signed-in user has
 * saved. Returns an empty set when the user is signed out.
 *
 * Why a Set: callers iterate over ~20-40 ideas per page render and need
 * O(1) `.has(id)` lookups. Returning an array would force callers to
 * build the set themselves on every card.
 */
export async function getUserSavedIdeaIds(): Promise<Set<string>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Set()

  const { data, error } = await supabase
    .from("user_saves")
    .select("idea_id")
    .eq("user_id", user.id)

  if (error) {
    console.error("getUserSavedIdeaIds failed:", error)
    return new Set()
  }

  return new Set((data ?? []).map((row) => row.idea_id as string))
}

/**
 * Whether a specific idea is saved by the currently-signed-in user.
 * Cheap enough for server components that need a single boolean (idea
 * detail page) vs. a whole set. Returns `false` when signed out.
 */
export async function isIdeaSavedByCurrentUser(
  ideaId: string
): Promise<boolean> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false

  const { data, error } = await supabase
    .from("user_saves")
    .select("id")
    .eq("user_id", user.id)
    .eq("idea_id", ideaId)
    .maybeSingle()

  if (error) {
    console.error("isIdeaSavedByCurrentUser failed:", error)
    return false
  }
  return !!data
}
