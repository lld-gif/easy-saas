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
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
        {/* Left: Copy */}
        <div className="flex-1 text-center lg:text-left">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">
            Crowdsourced<br />
            <span className="text-orange-500">shower ideas</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-lg">
            Side hustle money, minus the creativity. Real complaints, real demand, 500+ ideas ready to build.
          </p>
          <form onSubmit={handleSearch} className="mt-6 flex flex-col sm:flex-row max-w-md gap-2 mx-auto lg:mx-0">
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
            <div className="mt-5 flex flex-wrap items-center gap-3 justify-center lg:justify-start">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 border border-orange-200 px-3 py-1 text-xs font-semibold text-orange-700">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
                {ideaCount.toLocaleString()} ideas curated
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-semibold text-indigo-700">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                50+ sources scanned
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>
                Updated daily
              </span>
            </div>
          )}
        </div>

        {/* Right: Hero visual placeholder */}
        <div className="flex-1 max-w-md w-full">
          <div className="bg-gradient-to-br from-indigo-50 to-orange-50 rounded-2xl p-8 border border-border">
            <div className="space-y-3">
              {[
                { icon: "code", bg: "bg-blue-100", iconColor: "text-blue-600", title: "AI Code Assistant", tag: "DevTools", count: 12 },
                { icon: "dollar", bg: "bg-emerald-100", iconColor: "text-emerald-600", title: "Smart Invoice Parser", tag: "Fintech", count: 9 },
                { icon: "chart", bg: "bg-lime-100", iconColor: "text-lime-600", title: "Content Scheduler", tag: "Marketing", count: 6 },
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
