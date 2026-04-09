"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

interface UpgradeButtonProps {
  plan?: "monthly" | "annual"
  className?: string
}

export function UpgradeButton({ plan = "monthly", className }: UpgradeButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleUpgrade = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      })
      const { url, error } = await res.json()
      if (url) window.location.href = url
      else console.error("No checkout URL:", error)
    } catch (e) {
      console.error("Checkout failed:", e)
    } finally {
      setLoading(false)
    }
  }

  const label = plan === "annual" ? "Get Pro — $50/year" : "Get Pro — $7/month"

  return (
    <Button
      onClick={handleUpgrade}
      disabled={loading}
      className={`bg-orange-500 hover:bg-orange-600 text-white ${className ?? ""}`}
    >
      {loading ? "Loading..." : label}
    </Button>
  )
}
