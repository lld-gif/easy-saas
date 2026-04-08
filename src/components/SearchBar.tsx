"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"

export function SearchBar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get("q") ?? "")

  useEffect(() => {
    // Skip navigation if value hasn't changed from URL
    if (query.trim() === (searchParams.get("q") ?? "")) return

    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (query.trim()) {
        params.set("q", query.trim())
      } else {
        params.delete("q")
      }
      params.delete("cursor")
      router.push(`/ideas?${params.toString()}`)
    }, 300)

    return () => clearTimeout(timeout)
  }, [query]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Input
      placeholder="Search SaaS ideas..."
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      className="max-w-sm bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-primary/30"
    />
  )
}
