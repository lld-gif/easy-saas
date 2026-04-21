"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { track } from "@vercel/analytics/react"
import { createClient } from "@/lib/supabase/client"

interface SignInModalProps {
  open: boolean
  onClose: () => void
  /**
   * If provided, the sign-in callback will auto-save this idea_id for
   * the newly-authenticated user before redirecting back. Used by
   * SaveStar so an unauthenticated click round-trips to a saved state
   * on the original page. Leave undefined for the generic
   * "Sign in" Navbar click path.
   */
  redirectSave?: string
}

export function SignInModal({ open, onClose, redirectSave }: SignInModalProps) {
  /**
   * Build the Supabase Auth redirectTo URL. Preserves the current
   * path in `next` so the user lands where they were, and forwards
   * `save` if SaveStar asked for an auto-save. Runs only in the
   * browser (window.location) so the usual "is this SSR?" guard
   * isn't needed — this is a client component.
   */
  function buildRedirectUrl(): string {
    const params = new URLSearchParams()
    if (typeof window !== "undefined") {
      const nextPath = window.location.pathname + window.location.search
      if (nextPath && nextPath !== "/auth/callback") {
        params.set("next", nextPath)
      }
    }
    if (redirectSave) {
      params.set("save", redirectSave)
    }
    const qs = params.toString()
    return `${window.location.origin}/auth/callback${qs ? `?${qs}` : ""}`
  }

  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, onClose])

  // Reset state when modal reopens
  useEffect(() => {
    if (open) {
      setEmail("")
      setSent(false)
      setError(null)
      setLoading(false)
    }
  }, [open])

  async function handleGoogle() {
    // Funnel checkpoint: provider_start (Google). Pair this with the
    // auth/callback success event to compute OAuth completion rate.
    track("auth_provider_start", {
      provider: "google",
      from_save: redirectSave ? true : false,
    })
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: buildRedirectUrl(),
        queryParams: { prompt: "select_account" },
      },
    })
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: buildRedirectUrl(),
      },
    })
    setLoading(false)
    if (authError) {
      setError(authError.message)
      track("auth_provider_error", { provider: "magic_link" })
    } else {
      setSent(true)
      track("auth_provider_start", {
        provider: "magic_link",
        from_save: redirectSave ? true : false,
      })
    }
  }

  if (!open) return null
  if (typeof document === "undefined") return null

  return createPortal(
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] overflow-y-auto"
      onClick={onClose}
    >
      <div className="min-h-full flex items-center justify-center p-4">
      <div
        className="bg-card border border-border rounded-xl p-6 sm:p-8 max-w-sm w-full relative shadow-xl my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-xl font-bold text-foreground mb-1">Sign in</h2>
        <p className="text-muted-foreground text-sm mb-6">
          Free forever. Upgrade when you&apos;re ready.
        </p>

        {sent ? (
          <div className="text-center py-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-foreground font-medium mb-1">Check your inbox</p>
            <p className="text-muted-foreground text-sm">
              We sent a sign-in link to <span className="font-medium text-foreground">{email}</span>.
            </p>
          </div>
        ) : (
          <>
            {/* Google button */}
            <button
              onClick={handleGoogle}
              className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-50 border border-border text-foreground font-medium py-2.5 rounded-lg transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
                <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
                <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
                <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
              </svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground uppercase tracking-wide">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Magic link form */}
            <form onSubmit={handleMagicLink} className="space-y-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              />
              {error && <p className="text-destructive text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full bg-primary hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground font-medium py-2.5 rounded-lg transition-colors"
              >
                {loading ? "Sending…" : "Send magic link"}
              </button>
            </form>

            <p className="text-xs text-muted-foreground mt-5 text-center">
              By signing in you agree to our{" "}
              <a href="/terms" className="underline hover:text-foreground">Terms</a>{" "}
              and{" "}
              <a href="/privacy" className="underline hover:text-foreground">Privacy Policy</a>.
            </p>
          </>
        )}
      </div>
      </div>
    </div>,
    document.body
  )
}
