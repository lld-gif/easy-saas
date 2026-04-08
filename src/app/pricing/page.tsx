import type { Metadata } from "next"
import { UpgradeButton } from "@/components/UpgradeButton"

export const metadata: Metadata = {
  title: "Pricing — Vibe Code Ideas",
  description: "Unlock quick-start packages for every SaaS idea.",
}

const features = [
  { name: "Browse all 500+ ideas", free: true, pro: true },
  { name: "Search & filter by category", free: true, pro: true },
  { name: "Difficulty ratings", free: true, pro: true },
  { name: "Quick Start Package", free: false, pro: true },
  { name: "Tech Spec (stack, schema, APIs)", free: false, pro: true },
  { name: "Brand Kit (names, colors, tagline)", free: false, pro: true },
  { name: "Launch Checklist (MVP, pricing, channels)", free: false, pro: true },
]

export default function PricingPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-center text-foreground">Simple pricing</h1>
      <p className="mt-2 text-center text-muted-foreground">Everything you need to go from idea to launch.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
        <div className="border border-border rounded-xl p-8 bg-card">
          <h2 className="text-xl font-bold text-foreground">Free</h2>
          <p className="text-3xl font-bold mt-2 text-foreground">$0</p>
          <p className="text-sm text-muted-foreground mt-1">Forever free</p>
          <ul className="mt-6 space-y-3">
            {features.map((f) => (
              <li key={f.name} className="flex items-center gap-2 text-sm">
                <span className={f.free ? "text-emerald-500 dark:text-emerald-400" : "text-muted-foreground/50"}>{f.free ? "✓" : "✗"}</span>
                <span className={f.free ? "text-foreground/80" : "text-muted-foreground/50"}>{f.name}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-2 border-orange-500 rounded-xl p-8 relative bg-card">
          <span className="absolute -top-3 left-6 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">RECOMMENDED</span>
          <h2 className="text-xl font-bold text-foreground">Pro</h2>
          <p className="text-3xl font-bold mt-2 text-foreground">$5<span className="text-base font-normal text-muted-foreground">/month</span></p>
          <p className="text-sm text-muted-foreground mt-1">Cancel anytime</p>
          <ul className="mt-6 space-y-3">
            {features.map((f) => (
              <li key={f.name} className="flex items-center gap-2 text-sm">
                <span className="text-emerald-500 dark:text-emerald-400">✓</span>
                <span className="text-foreground/80">{f.name}</span>
              </li>
            ))}
          </ul>
          <UpgradeButton className="w-full mt-8" />
        </div>
      </div>
    </main>
  )
}
