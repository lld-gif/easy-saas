import type { Metadata } from "next"
import { PricingCards } from "@/components/PricingCards"
import { HomeFAQ } from "@/components/HomeFAQ"

export const metadata: Metadata = {
  title: "Pricing — Vibe Code Ideas",
  description:
    "Vibe Code Ideas is free to browse 500+ SaaS ideas. Upgrade to Pro for $7/month to unlock Quick Start Packages with tech specs, brand kits, and launch checklists. Cancel anytime.",
}

const pricingFaqItems = [
  {
    question: "Is Vibe Code Ideas free?",
    answer:
      "Yes, Vibe Code Ideas offers a free plan that lets you browse all 500+ SaaS ideas, search and filter by category, and view difficulty ratings. No credit card is required to sign up.",
  },
  {
    question: "What do I get with Vibe Code Ideas Pro?",
    answer:
      "Vibe Code Ideas Pro unlocks a Quick Start Package for every idea. Each package includes a Tech Spec with recommended stack, database schema, and APIs; a Brand Kit with name suggestions, color palettes, and taglines; and a Launch Checklist covering MVP scope, pricing, and go-to-market channels.",
  },
  {
    question: "Can I cancel my Vibe Code Ideas Pro subscription anytime?",
    answer:
      "Yes, you can cancel your Vibe Code Ideas Pro subscription at any time from your account settings. Your Pro access continues until the end of the current billing period. There are no cancellation fees.",
  },
]

const pricingFaqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: pricingFaqItems.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
}

export default function PricingPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingFaqJsonLd) }}
      />
      <h1 className="text-3xl font-bold text-center text-foreground">Simple pricing</h1>
      <p className="mt-2 text-center text-muted-foreground">Everything you need to go from idea to launch.</p>
      <PricingCards />

      {/* Pricing FAQ for GEO */}
      <section className="mt-16 pt-12 border-t border-border/50">
        <h2 className="text-2xl font-bold mb-6">Pricing FAQ</h2>
        <HomeFAQ items={pricingFaqItems} />
      </section>
    </main>
  )
}
