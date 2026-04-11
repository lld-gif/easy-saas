import type { Metadata } from "next"
import Link from "next/link"
import { HeroSection } from "@/components/HeroSection"
import { IdeaListRow } from "@/components/IdeaListRow"
import { HomeFAQ } from "@/components/HomeFAQ"

import { getTrendingIdeas, getIdeaCount, getAggregateStats } from "@/lib/queries"
import { CATEGORIES } from "@/lib/categories"

export async function generateMetadata(): Promise<Metadata> {
  const ideaCount = await getIdeaCount()
  const roundedCount = Math.max(100, Math.floor(ideaCount / 100) * 100).toLocaleString()
  const description = `Vibe Code Ideas is a free directory of ${roundedCount}+ curated micro-SaaS and SaaS ideas ranked by real demand signals. Browse by category, difficulty, and trending popularity to find your next project to build.`
  return {
    title: "Vibe Code Ideas — Discover Your Next SaaS Idea",
    description,
    openGraph: {
      title: "Vibe Code Ideas — Discover Your Next SaaS Idea",
      description,
      siteName: "Vibe Code Ideas",
    },
  }
}

export default async function Home() {
  const [trending, ideaCount, stats] = await Promise.all([
    getTrendingIdeas(12),
    getIdeaCount(),
    getAggregateStats(),
  ])

  const roundedCount = Math.max(100, Math.floor(ideaCount / 100) * 100).toLocaleString()

  const homeFaqItems = [
    {
      question: "What is Vibe Code Ideas?",
      answer:
        "Vibe Code Ideas was built by someone who was bored at work, wanted side hustle money, and had zero original ideas of their own. It's a free, curated directory of micro-SaaS and SaaS ideas scraped from the corners of the internet where real people complain about software that doesn't exist yet — ranked by demand signals so you can skip the brainstorming and go straight to building.",
    },
    {
      question: "How are SaaS ideas discovered?",
      answer:
        "We lurk in forums, subreddits, and online communities where people are openly begging for software that doesn't exist yet. Every complaint gets cross-checked against upvotes, comment volume, and search trends. If enough strangers are mad about the same missing tool, it becomes an idea in the directory.",
    },
    {
      question: "What categories of SaaS ideas are available?",
      answer:
        "Vibe Code Ideas organizes ideas into 13 categories including Fintech, DevTools, Automation, AI/ML, Ecommerce, Health, Education, Creator Tools, Productivity, Marketing, HR/Recruiting, Real Estate, and Logistics. You can browse or filter by any category.",
    },
    {
      question: "How much does Vibe Code Ideas cost?",
      answer:
        `Vibe Code Ideas is free to browse. The free plan includes access to all ${roundedCount}+ ideas with search, filtering, and difficulty ratings. The Pro plan at $7/month (or $50/year) adds Quick Start Packages with tech specs, brand kits, and launch checklists for each idea.`,
    },
    {
      question: "What's included in the Pro plan?",
      answer:
        "The Vibe Code Ideas Pro plan includes a Quick Start Package for every idea: a recommended tech stack with database schema and API design, a brand kit with suggested names, colors, and taglines, and a launch checklist covering MVP scope, pricing strategy, and distribution channels.",
    },
    {
      question: "How many SaaS ideas are in the database?",
      answer:
        `Over ${roundedCount} and counting. New ones get added whenever more people post about problems they'd happily pay someone else to solve. The supply of bored, frustrated internet users is effectively infinite, so this number only goes up.`,
    },
    {
      question: "What is a micro-SaaS idea?",
      answer:
        "A micro-SaaS is a small, focused software-as-a-service product typically built by a solo developer or small team. Micro-SaaS products on Vibe Code Ideas target a specific niche, require minimal startup costs, and can generate recurring revenue with a lean operation.",
    },
  ]

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: homeFaqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  }

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <HeroSection ideaCount={ideaCount} />

      {/* Browse by category */}
      <nav className="px-4 py-4 border-b border-border/50">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground">
          <span className="font-medium mr-1">Browse by category:</span>
          {CATEGORIES.filter((c) => c.slug !== "other").map((cat, i, arr) => (
            <span key={cat.slug}>
              <Link
                href={`/ideas/category/${cat.slug}`}
                className="hover:text-orange-500 transition-colors"
              >
                {cat.label}
              </Link>
              {i < arr.length - 1 && <span className="ml-1.5">&middot;</span>}
            </span>
          ))}
          <span className="ml-1.5">&middot;</span>
          <Link
            href="/ideas/trending"
            className="hover:text-orange-500 transition-colors font-medium"
          >
            Trending
          </Link>
        </div>
      </nav>

      {/* Trending ideas */}
      {trending.length > 0 && (
        <section className="py-8 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Trending Ideas</h2>
              <Link href="/ideas" className="text-sm text-muted-foreground hover:text-orange-500 transition-colors">
                View all &rarr;
              </Link>
            </div>
            <div className="divide-y divide-border/50">
              {trending.map((idea, index) => (
                <IdeaListRow
                  key={idea.id}
                  idea={idea}
                  rank={index + 1}
                  popThreshold={stats.popularity_threshold}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ section for GEO — visible text for AI crawlers */}
      <section className="py-12 px-4 border-t border-border/50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
          <HomeFAQ items={homeFaqItems} />
        </div>
      </section>

    </main>
  )
}
