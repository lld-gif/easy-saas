"use client"

import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { SignInModal } from "@/components/SignInModal"

interface AuthButtonProps {
  mobile?: boolean
  onAction?: () => void
}

export function AuthButton({ mobile, onAction }: AuthButtonProps) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<string>("free")
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user)
      if (data.user) {
        const { data: profile } = await supabase
          .from("users")
          .select("subscription_status")
          .eq("id", data.user.id)
          .single()
        setStatus(profile?.subscription_status ?? "free")
      }
      setLoading(false)
    })
  }, [])

  const openSignIn = () => {
    setModalOpen(true)
    onAction?.()
  }

  const closeSignIn = () => {
    setModalOpen(false)
  }

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    router.refresh()
    onAction?.()
  }

  const manageSubscription = async () => {
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || "Unable to open billing portal. Please contact support.")
      }
    } catch {
      alert("Something went wrong. Please try again.")
    }
    onAction?.()
  }

  if (loading) return null

  // --- Mobile layout (stacked, large touch targets) ---
  if (mobile) {
    if (!user) {
      return (
        <>
          <button
            onClick={openSignIn}
            className="w-full text-left text-sm font-medium text-foreground py-1"
          >
            Sign in
          </button>
          <SignInModal open={modalOpen} onClose={closeSignIn} />
        </>
      )
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground truncate">
            {user.email}
          </span>
          {status === "pro" && (
            <span className="text-xs font-bold bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">PRO</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {status === "pro" ? (
            <button onClick={manageSubscription} className="text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors">
              Manage subscription
            </button>
          ) : (
            <a href="/pricing" onClick={() => onAction?.()} className="text-sm font-medium text-orange-500 hover:text-orange-600 transition-colors">
              Upgrade to Pro
            </a>
          )}
          <span className="text-border">·</span>
          <button onClick={signOut} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Sign out
          </button>
        </div>
      </div>
    )
  }

  // --- Desktop layout (inline row) ---
  if (!user) {
    return (
      <>
        <button
          onClick={openSignIn}
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Sign in
        </button>
        <SignInModal open={modalOpen} onClose={closeSignIn} />
      </>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground hidden sm:inline">
        {user.email?.split("@")[0]}
      </span>
      {status === "pro" ? (
        <>
          <span className="text-xs font-bold bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">PRO</span>
          <button onClick={manageSubscription} className="text-sm text-muted-foreground hover:text-foreground font-medium transition-colors">
            Manage
          </button>
        </>
      ) : (
        <a href="/pricing" className="text-sm font-medium bg-orange-500 text-white px-3 py-1 rounded-full hover:bg-orange-600 transition-colors">
          Upgrade
        </a>
      )}
      <button onClick={signOut} className="text-sm text-muted-foreground hover:text-foreground font-medium transition-colors">
        Sign out
      </button>
    </div>
  )
}
