"use client"

import { useEffect } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { track } from "@vercel/analytics/react"

/**
 * Reads short-lived URL flags set by server redirects and fires the
 * corresponding Vercel Analytics event, then strips the flag from the
 * URL with router.replace() so a shared or bookmarked link doesn't
 * re-fire the event.
 *
 * Currently handles:
 *   - `?authed=1`   — the Supabase auth callback just completed a sign-in
 *                     (Google OAuth or magic link). Emits `auth_complete`.
 *
 * Kept as a layout-level component so every post-auth landing page emits
 * the same event regardless of the `next` destination. Avoids adding
 * server-side Vercel Analytics SDK wiring just to measure one funnel step.
 */
export function AnalyticsFlagEmitter() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    if (searchParams.get("authed") === "1") {
      track("auth_complete")
      const remaining = new URLSearchParams(searchParams.toString())
      remaining.delete("authed")
      const qs = remaining.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname)
    }
  }, [pathname, searchParams, router])

  return null
}
