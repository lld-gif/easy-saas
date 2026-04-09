"use client"

import { useState } from "react"
import { UpgradeButton } from "@/components/UpgradeButton"
import { cn } from "@/lib/utils"

const features = [
  { name: "Browse all 500+ ideas", free: true, pro: true },
  { name: "Search & filter by category", free: true, pro: true },
  { name: "Difficulty ratings", free: true, pro: true },
  { name: "Quick Start Package", free: false, pro: true },
  { name: "Tech Spec (stack, schema, APIs)", free: false, pro: true },
  { name: "Brand Kit (names, colors, tagline)", free: false, pro: true },
  { name: "Launch Checklist (MVP, pricing, channels)", free: false, pro: true },
]

export function PricingCards() {
  const [billing, setBilling] = useState<"monthly" | "annual">("annual")

  return (
    <>
      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3 mt-10">
        <button
          onClick={() => setBilling("monthly")}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium transition-colors",
            billing === "monthly"
              ? "bg-orange-500 text-white"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Monthly
        </button>
        <button
          onClick={() => setBilling("annual")}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium transition-colors",
            billing === "annual"
              ? "bg-orange-500 text-white"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Annual
          <span className="ml-1.5 text-xs font-bold text-emerald-400">Save 40%</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
        {/* Free tier */}
        <div className="border border-border rounded-xl p-8 bg-card">
          <h2 className="text-xl font-bold text-foreground">Free</h2>
          <p className="text-3xl font-bold mt-2 text-foreground">$0</p>
          <p className="text-sm text-muted-foreground mt-1">Forever free</p>
          <ul className="mt-6 space-y-3">
            {features.map((f) => (
              <li key={f.name} className="flex items-center gap-2 text-sm">
                <span className={f.free ? "text-emerald-400" : "text-muted-foreground/50"}>
                  {f.free ? "\u2713" : "\u2717"}
                </span>
                <span className={f.free ? "text-foreground/80" : "text-muted-foreground/50"}>
                  {f.name}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Pro tier */}
        <div className="border-2 border-orange-500 rounded-xl p-8 relative bg-card">
          <span className="absolute -top-3 left-6 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
            RECOMMENDED
          </span>
          <h2 className="text-xl font-bold text-foreground">Pro</h2>

          {billing === "monthly" ? (
            <>
              <p className="text-3xl font-bold mt-2 text-foreground">
                $7<span className="text-base font-normal text-muted-foreground">/month</span>
              </p>
              <p className="text-sm text-muted-foreground mt-1">Cancel anytime</p>
            </>
          ) : (
            <>
              <p className="text-3xl font-bold mt-2 text-foreground">
                $50<span className="text-base font-normal text-muted-foreground">/year</span>
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                $4.17/mo &mdash; save $34 vs monthly
              </p>
            </>
          )}

          <ul className="mt-6 space-y-3">
            {features.map((f) => (
              <li key={f.name} className="flex items-center gap-2 text-sm">
                <span className="text-emerald-400">{"\u2713"}</span>
                <span className="text-foreground/80">{f.name}</span>
              </li>
            ))}
          </ul>
          <UpgradeButton plan={billing} className="w-full mt-8" />
          <p className="text-xs text-muted-foreground text-center mt-3">
            Cancel anytime. No refunds on generated packages.
          </p>
        </div>
      </div>
    </>
  )
}
