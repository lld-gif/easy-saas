"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export function UpgradeButton({ className }: { className?: string }) {
  const [loading, setLoading] = useState(false)

  const handleUpgrade = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" })
      const { url, error } = await res.json()
      if (url) window.location.href = url
      else console.error("No checkout URL:", error)
    } catch (e) {
      console.error("Checkout failed:", e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleUpgrade}
      disabled={loading}
      className={`bg-orange-500 hover:bg-orange-600 text-white ${className ?? ""}`}
    >
      {loading ? "Loading..." : "Get Pro — $5/month"}
    </Button>
  )
}
