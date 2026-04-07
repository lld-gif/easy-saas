"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"

export function ViewToggle() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const view = searchParams.get("view") ?? "list"

  const toggle = (newView: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("view", newView)
    router.push(`/ideas?${params.toString()}`)
  }

  return (
    <div className="flex gap-1">
      <Button variant={view === "card" ? "default" : "outline"} size="sm" onClick={() => toggle("card")}>
        Cards
      </Button>
      <Button variant={view === "list" ? "default" : "outline"} size="sm" onClick={() => toggle("list")}>
        List
      </Button>
    </div>
  )
}
