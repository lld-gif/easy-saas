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
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900">
            Find your next<br />
            <span className="text-orange-500">billion-dollar</span> idea
          </h1>
          <p className="mt-4 text-lg text-gray-500 max-w-lg">
            AI-curated SaaS ideas spotted across the internet. Ranked by demand signals. Ready to build.
          </p>
          <form onSubmit={handleSearch} className="mt-6 flex max-w-md gap-2">
            <Input
              placeholder="Search ideas..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white">
              Search
            </Button>
          </form>
          {ideaCount > 0 && (
            <p className="mt-4 text-sm text-gray-400">
              {ideaCount} ideas and counting
            </p>
          )}
        </div>

        {/* Right: Hero visual placeholder */}
        <div className="flex-1 max-w-md w-full">
          <div className="bg-gradient-to-br from-orange-50 to-indigo-50 rounded-2xl p-8 border border-gray-100">
            <div className="space-y-3">
              {[
                { letter: "A", color: "bg-blue-500", title: "AI Code Assistant", tag: "DevTools" },
                { letter: "S", color: "bg-emerald-500", title: "Smart Invoice Parser", tag: "Fintech" },
                { letter: "C", color: "bg-purple-500", title: "Content Scheduler", tag: "Marketing" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100">
                  <div className={`${item.color} w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm`}>
                    {item.letter}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-800">{item.title}</div>
                    <div className="text-xs text-gray-400">{item.tag}</div>
                  </div>
                  <div className="border border-gray-200 rounded px-2 py-0.5 text-xs text-gray-500">
                    <span className="text-[10px]">▲</span> {12 - i * 3}
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
