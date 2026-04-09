import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { CATEGORIES, getCategoryBySlug } from "@/lib/categories"
import { IdeaListRow } from "@/components/IdeaListRow"
import type { Idea } from "@/types"

type Props = {
  params: Promise<{ slug: string }>
}

const categoryDescriptions: Record<string, string> = {
  fintech:
    "Explore SaaS ideas in fintech — from payment tools and budgeting apps to crypto dashboards and invoice automation. These ideas target real pain points in personal finance, B2B payments, and financial operations.",
  devtools:
    "Developer tools are one of the most lucrative SaaS niches. Browse ideas for CLI tools, API platforms, CI/CD helpers, code review bots, and internal tooling that developers actually want to pay for.",
  automation:
    "Automation SaaS ideas that save people time and money. From workflow builders and Zapier alternatives to niche-specific automation for HR, sales, or ops teams.",
  "ai-ml":
    "AI and machine learning are creating entirely new product categories. Explore ideas for AI wrappers, fine-tuning tools, prompt marketplaces, and intelligent agents.",
  ecommerce:
    "E-commerce SaaS ideas to help merchants sell more — product analytics, review management, inventory tools, Shopify apps, and conversion optimization platforms.",
  health:
    "Health and wellness SaaS ideas targeting telemedicine, fitness tracking, mental health apps, patient management, and health data analytics.",
  education:
    "EdTech SaaS ideas spanning online learning platforms, tutoring marketplaces, course builders, quiz tools, and student engagement software.",
  "creator-tools":
    "Tools for content creators — video editing, social scheduling, link-in-bio builders, analytics dashboards, and monetization platforms.",
  productivity:
    "Productivity SaaS ideas including task managers, note-taking tools, calendar apps, meeting assistants, and focus trackers.",
  marketing:
    "Marketing SaaS ideas covering SEO tools, email marketing, social media management, landing page builders, and analytics platforms.",
  "hr-recruiting":
    "HR and recruiting SaaS ideas — applicant tracking systems, employee onboarding, performance reviews, team culture tools, and compensation benchmarking.",
  "real-estate":
    "Real estate SaaS ideas for property management, listing platforms, tenant screening, CRM tools, and market analytics.",
  logistics:
    "Logistics and supply chain SaaS ideas — fleet management, shipment tracking, warehouse optimization, and route planning tools.",
  other:
    "Unique SaaS ideas that defy categorization — novel niches, emerging markets, and cross-industry tools worth exploring.",
}

export async function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const category = getCategoryBySlug(slug)

  return {
    title: `Top ${category.label} SaaS Ideas to Build in 2026 | Vibe Code Ideas`,
    description:
      categoryDescriptions[slug] ??
      `Browse the best ${category.label} SaaS ideas — validated by community mentions and ranked by popularity.`,
  }
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params
  const category = getCategoryBySlug(slug)

  if (!CATEGORIES.some((c) => c.slug === slug)) {
    notFound()
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("ideas")
    .select("*")
    .eq("status", "active")
    .eq("category", slug)
    .order("popularity_score", { ascending: false })
    .limit(20)

  if (error) {
    console.error("Failed to fetch category ideas:", error)
  }

  const ideas = (data ?? []) as Idea[]

  const { count } = await supabase
    .from("ideas")
    .select("*", { count: "exact", head: true })
    .eq("status", "active")
    .eq("category", slug)

  const totalCount = count ?? ideas.length

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-2">
        <Link
          href="/ideas"
          className="text-sm text-muted-foreground hover:text-orange-500 transition-colors"
        >
          &larr; All ideas
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-3">
        {category.label} SaaS Ideas{" "}
        <span className="text-muted-foreground font-normal text-xl">
          &mdash; {totalCount} ideas
        </span>
      </h1>

      <p className="text-muted-foreground mb-8 max-w-2xl leading-relaxed">
        {categoryDescriptions[slug] ??
          `Browse the best ${category.label} SaaS ideas, ranked by popularity and community mentions.`}
      </p>

      {ideas.length > 0 ? (
        <div className="divide-y divide-border/50">
          {ideas.map((idea, index) => (
            <IdeaListRow key={idea.id} idea={idea} rank={index + 1} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground py-12 text-center">
          No ideas found in this category yet. Check back soon.
        </p>
      )}

      {/* CTA */}
      <div className="mt-12 rounded-lg border border-border bg-muted/30 p-6 text-center">
        <p className="text-lg font-semibold mb-2">
          Want the full Quick Start Package for any idea?
        </p>
        <p className="text-muted-foreground text-sm mb-4">
          Get a tech spec, brand kit, and launch checklist — ready to build.
        </p>
        <Link
          href="/pricing"
          className="inline-flex items-center justify-center rounded-md bg-orange-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
        >
          Upgrade to Pro
        </Link>
      </div>
    </main>
  )
}
