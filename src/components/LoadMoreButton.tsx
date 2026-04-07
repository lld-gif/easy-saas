"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"

interface LoadMoreButtonProps {
  cursor: string
}

export function LoadMoreButton({ cursor }: LoadMoreButtonProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const loadMore = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("cursor", cursor)
    router.push(`/ideas?${params.toString()}`)
  }

  return (
    <div className="flex justify-center py-8">
      <Button variant="outline" onClick={loadMore}>
        Load more ideas
      </Button>
    </div>
  )
}
