"use client"

import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"

export function AuthButton() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<string>("free")
  const [loading, setLoading] = useState(true)

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

  const signIn = async () => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    router.refresh()
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
  }

  if (loading) return null

  if (!user) {
    return (
      <button
        onClick={signIn}
        className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        Sign in
      </button>
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
          <button onClick={manageSubscription} className="text-xs text-muted-foreground hover:text-foreground">
            Manage
          </button>
        </>
      ) : (
        <a href="/pricing" className="text-xs font-medium bg-orange-500 text-white px-3 py-1 rounded-full hover:bg-orange-600 transition-colors">
          Upgrade
        </a>
      )}
      <button onClick={signOut} className="text-xs text-muted-foreground hover:text-foreground">
        Sign out
      </button>
    </div>
  )
}
