"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { track } from "@vercel/analytics/react"
import { createClient } from "@/lib/supabase/client"
import { SignInModal } from "@/components/SignInModal"

interface SaveStarProps {
  ideaId: string
  /**
   * Initial saved state from the server. Passed by the page-level
   * prefetch (see `getUserSavedIdeaIds`) so the star doesn't flash
   * unsaved → saved after a client-side auth check.
   */
  initialSaved: boolean
  /**
   * Variant adjusts sizing + positioning:
   *   - `card`: top-right absolute pin for IdeaCard grid cells
   *   - `detail`: inline, larger, for the idea detail page header
   *   - `row`: compact inline, for IdeaListRow
   */
  variant?: "card" | "detail" | "row"
}

/**
 * The ⭐ save button. Client component with optimistic updates.
 *
 * Click paths:
 *   - Signed in → optimistic toggle → POST or DELETE → router.refresh()
 *     on completion (keeps any server-side save-count UI in sync)
 *   - Signed out → open SignInModal. The modal already handles the
 *     Google OAuth + magic link flow. After the redirect back via
 *     /auth/callback?save={ideaId}, the callback route auto-inserts
 *     the save, so the user lands on the page with the idea already
 *     starred.
 *
 * When placed inside an IdeaCard (wrapped in a <Link>) the button
 * must stopPropagation + preventDefault so the click fires the save
 * instead of navigating to the idea detail page.
 */
export function SaveStar({ ideaId, initialSaved, variant = "card" }: SaveStarProps) {
  const router = useRouter()
  const [saved, setSaved] = useState(initialSaved)
  const [pending, startTransition] = useTransition()
  const [modalOpen, setModalOpen] = useState(false)

  const sizeClasses =
    variant === "detail"
      ? "w-10 h-10 rounded-full"
      : variant === "row"
        ? "w-8 h-8 rounded-full"
        : "w-8 h-8 rounded-full absolute top-2 right-2 z-10 bg-card/90 backdrop-blur-sm shadow-sm"
  const iconSize =
    variant === "detail" ? 22 : variant === "row" ? 16 : 18

  async function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    // Stop the surrounding <Link> (on IdeaCard) from navigating.
    e.preventDefault()
    e.stopPropagation()

    // Check session client-side. We could skip this and let the
    // POST 401 bounce us into the modal, but that burns a round trip.
    const supabase = createClient()
    const { data } = await supabase.auth.getUser()
    if (!data.user) {
      // Funnel checkpoint: an anonymous user intended to save. This is
      // the primary trigger for the OAuth/magic-link flow — tracking it
      // gives the click-to-signup conversion rate a denominator.
      track("save_click_anon", { variant })
      setModalOpen(true)
      return
    }

    // Signed-in save click. Separate event so the anon → signup
    // conversion funnel stays cleanly measurable.
    track("save_click_authed", { variant, action: saved ? "unsave" : "save" })

    // Optimistic toggle — flip UI first, then call the API. If the
    // call fails we flip back and show a minimal error via alert()
    // (the happy path is overwhelmingly common, no need for toast).
    const next = !saved
    setSaved(next)

    startTransition(async () => {
      try {
        const res = next
          ? await fetch("/api/saves", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ idea_id: ideaId }),
            })
          : await fetch(`/api/saves/${ideaId}`, { method: "DELETE" })

        if (!res.ok) {
          setSaved(!next)
          const err = await res.json().catch(() => ({}))
          console.error("Save toggle failed:", err)
          return
        }

        // Refresh the route's server components so /saved (or any
        // save-aware server data) re-reads the table.
        router.refresh()
      } catch (err) {
        setSaved(!next)
        console.error("Save toggle threw:", err)
      }
    })
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={pending}
        aria-label={saved ? "Remove from saved" : "Save idea"}
        aria-pressed={saved}
        title={saved ? "Saved — click to remove" : "Save idea"}
        className={`${sizeClasses} inline-flex items-center justify-center border border-border hover:bg-muted/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group`}
      >
        {/* SVG star — fills orange when saved, hollow when not. Keeps
            a single shape so the fill/stroke transition reads as a
            state change rather than an icon swap. */}
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill={saved ? "#f97316" : "none"}
          stroke={saved ? "#f97316" : "currentColor"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={saved ? "" : "text-muted-foreground group-hover:text-foreground transition-colors"}
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      </button>
      {/* SignInModal: after successful sign-in the user lands back on
          this page via /auth/callback. We pass the idea_id via the
          `save` query param on the redirect so the callback can
          auto-insert the save before the final redirect. */}
      <SignInModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        redirectSave={ideaId}
      />
    </>
  )
}
