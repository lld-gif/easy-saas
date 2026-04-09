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
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else if (res.status === 401) {
        // Not signed in — redirect to sign in first
        window.location.href = "/pricing?signin=true"
      } else {
        alert(data.error || "Something went wrong. Please try again.")
      }
    } catch (e) {
      console.error("Checkout failed:", e)
      alert("Something went wrong. Please try again.")
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
