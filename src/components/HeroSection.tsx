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
    <section className="py-24 px-4 text-center bg-gradient-to-b from-indigo-950/30 to-transparent">
      <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
        Discover your next SaaS idea
      </h1>
      <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
        Browse validated SaaS ideas with real demand signals.
      </p>
      <form onSubmit={handleSearch} className="mt-8 flex max-w-lg mx-auto gap-2">
        <Input
          placeholder="Search ideas..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1"
        />
        <Button type="submit">Search</Button>
      </form>
      {ideaCount > 0 && (
        <p className="mt-6 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-primary font-medium">
            {ideaCount} ideas discovered
          </span>
        </p>
      )}
    </section>
  )
}
