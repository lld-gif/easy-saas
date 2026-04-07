import type { Metadata } from "next"
import { UpgradeButton } from "@/components/UpgradeButton"

export const metadata: Metadata = {
  title: "Pricing — EasySaaS",
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
      <h1 className="text-3xl font-bold text-center">Simple pricing</h1>
      <p className="mt-2 text-center text-gray-500">Everything you need to go from idea to launch.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
        <div className="border border-gray-200 rounded-xl p-8">
          <h2 className="text-xl font-bold">Free</h2>
          <p className="text-3xl font-bold mt-2">$0</p>
          <p className="text-sm text-gray-500 mt-1">Forever free</p>
          <ul className="mt-6 space-y-3">
            {features.map((f) => (
              <li key={f.name} className="flex items-center gap-2 text-sm">
                <span className={f.free ? "text-emerald-500" : "text-gray-300"}>{f.free ? "✓" : "✗"}</span>
                <span className={f.free ? "text-gray-700" : "text-gray-400"}>{f.name}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-2 border-orange-500 rounded-xl p-8 relative">
          <span className="absolute -top-3 left-6 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">RECOMMENDED</span>
          <h2 className="text-xl font-bold">Pro</h2>
          <p className="text-3xl font-bold mt-2">$5<span className="text-base font-normal text-gray-500">/month</span></p>
          <p className="text-sm text-gray-500 mt-1">Cancel anytime</p>
          <ul className="mt-6 space-y-3">
            {features.map((f) => (
              <li key={f.name} className="flex items-center gap-2 text-sm">
                <span className="text-emerald-500">✓</span>
                <span className="text-gray-700">{f.name}</span>
              </li>
            ))}
          </ul>
          <UpgradeButton className="w-full mt-8" />
        </div>
      </div>
    </main>
  )
}
