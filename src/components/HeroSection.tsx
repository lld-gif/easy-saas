"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface HeroSectionProps {
  ideaCount: number
}

export function HeroSection({ ideaCount }: HeroSectionProps) {
  const router = useRouter()
  const [query, setQuery] = useState("")

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/ideas?q=${encodeURIComponent(query.trim())}`)
    } else {
      router.push("/ideas")
    }
  }

  return (
    <section className="py-16 px-4">
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-12">
        {/* Left: Copy */}
        <div className="flex-1 text-center lg:text-left">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground">
            Crowdsourced<br />
            <span className="text-orange-500 dark:text-orange-400">shower ideas</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-lg">
            AI-curated SaaS ideas spotted across the internet. Ranked by demand signals. Ready to build.
          </p>
          <form onSubmit={handleSearch} className="mt-6 flex max-w-md gap-2">
            <Input
              placeholder="Search ideas..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-card border-input text-foreground placeholder:text-muted-foreground"
            />
            <Button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white">
              Search
            </Button>
          </form>
          {ideaCount > 0 && (
            <p className="mt-4 text-sm text-muted-foreground">
              {ideaCount} ideas and counting
            </p>
          )}
        </div>

        {/* Right: Hero visual placeholder */}
        <div className="flex-1 max-w-md w-full">
          <div className="bg-gradient-to-br from-indigo-100/50 to-orange-100/30 dark:from-indigo-950/50 dark:to-orange-950/30 rounded-2xl p-8 border border-border">
            <div className="space-y-3">
              {[
                { icon: "code", bg: "bg-blue-500/15", iconColor: "text-blue-600 dark:text-blue-400", title: "AI Code Assistant", tag: "DevTools", count: 12 },
                { icon: "dollar", bg: "bg-emerald-500/15", iconColor: "text-emerald-600 dark:text-emerald-400", title: "Smart Invoice Parser", tag: "Fintech", count: 9 },
                { icon: "chart", bg: "bg-lime-500/15", iconColor: "text-lime-600 dark:text-lime-400", title: "Content Scheduler", tag: "Marketing", count: 6 },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-card/80 rounded-xl px-4 py-3 border border-border">
                  <div className={`${item.bg} w-9 h-9 rounded-xl flex items-center justify-center`}>
                    <svg className={`w-4 h-4 ${item.iconColor}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      {item.icon === "code" && <><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></>}
                      {item.icon === "dollar" && <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />}
                      {item.icon === "chart" && <path d="M22 12h-4l-3 9L9 3l-3 9H2" />}
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground">{item.title}</div>
                    <div className="text-xs text-muted-foreground">{item.tag}</div>
                  </div>
                  <div className="border border-input rounded px-2 py-0.5 text-xs text-muted-foreground">
                    <span className="text-[10px]">▲</span> {item.count}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
