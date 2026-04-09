import type { Metadata } from "next"
import { PricingCards } from "@/components/PricingCards"

export const metadata: Metadata = {
  title: "Pricing — Vibe Code Ideas",
  description: "Unlock quick-start packages for every SaaS idea.",
}

export default function PricingPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-center text-foreground">Simple pricing</h1>
      <p className="mt-2 text-center text-muted-foreground">Everything you need to go from idea to launch.</p>
      <PricingCards />
    </main>
  )
}
