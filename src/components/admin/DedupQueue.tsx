"use client"

import { useState, useCallback } from "react"
import type { DedupPair, DedupStats } from "@/lib/dedup-queries"
import type { Idea } from "@/types"
import { StatCard } from "./StatCard"

interface Props {
  initialPairs: DedupPair[]
  initialStats: DedupStats
}

export function DedupQueue({ initialPairs, initialStats }: Props) {
  const [pairs, setPairs] = useState(initialPairs)
  const [stats, setStats] = useState(initialStats)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const currentPair = pairs[currentIndex] ?? null

  const showMessage = useCallback((msg: string) => {
    setMessage(msg)
    setTimeout(() => setMessage(null), 3000)
  }, [])

  async function handleMerge(winnerId: string, loserId: string) {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/dedup/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ winnerId, loserId }),
      })
      if (!res.ok) throw new Error("Merge failed")

      setPairs((prev) => prev.filter((_, i) => i !== currentIndex))
      setStats((prev) => ({ ...prev, pending: prev.pending - 1, merged: prev.merged + 1 }))
      if (currentIndex >= pairs.length - 1) setCurrentIndex(Math.max(0, currentIndex - 1))
      showMessage("Ideas merged successfully")
    } catch (err) {
      showMessage("Failed to merge ideas")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleDismiss() {
    if (!currentPair) return
    setLoading(true)
    try {
      const res = await fetch("/api/admin/dedup/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId: currentPair.candidate.id }),
      })
      if (!res.ok) throw new Error("Dismiss failed")

      setPairs((prev) => prev.filter((_, i) => i !== currentIndex))
      setStats((prev) => ({ ...prev, pending: prev.pending - 1, dismissed: prev.dismissed + 1 }))
      if (currentIndex >= pairs.length - 1) setCurrentIndex(Math.max(0, currentIndex - 1))
      showMessage("Pair dismissed")
    } catch (err) {
      showMessage("Failed to dismiss pair")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function handleSkip() {
    if (currentIndex < pairs.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  async function handleRefresh() {
    setRefreshing(true)
    try {
      const res = await fetch("/api/admin/dedup/refresh", { method: "POST" })
      if (!res.ok) throw new Error("Refresh failed")
      const data = await res.json()
      showMessage(`Found ${data.newCandidates} new candidate pairs`)

      // Re-fetch the full list
      const listRes = await fetch("/api/admin/dedup")
      if (listRes.ok) {
        const listData = await listRes.json()
        setPairs(listData.pairs)
        setStats(listData.stats)
        setCurrentIndex(0)
      }
    } catch (err) {
      showMessage("Failed to refresh candidates")
      console.error(err)
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Pending" value={stats.pending} accent="orange" />
        <StatCard label="Merged" value={stats.merged} accent="green" />
        <StatCard label="Dismissed" value={stats.dismissed} accent="gray" />
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {pairs.length > 0
            ? `Reviewing ${currentIndex + 1} of ${pairs.length} pending pairs`
            : "No pending pairs"}
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 rounded-md bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 transition-colors"
        >
          <svg
            className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21.5 2v6h-6" />
            <path d="M2.5 22v-6h6" />
            <path d="M2 11.5a10 10 0 0118.8-4.3" />
            <path d="M22 12.5a10 10 0 01-18.8 4.2" />
          </svg>
          {refreshing ? "Scanning..." : "Refresh Candidates"}
        </button>
      </div>

      {/* Toast */}
      {message && (
        <div className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white shadow-lg">
          {message}
        </div>
      )}

      {/* Comparison view */}
      {currentPair ? (
        <div className="space-y-4">
          {/* Similarity badge */}
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-800">
              {(currentPair.candidate.similarity * 100).toFixed(0)}% similar
            </span>
            <span className="text-xs text-gray-400">
              Same category: {currentPair.ideaA.category}
            </span>
          </div>

          {/* Side-by-side cards */}
          <div className="grid gap-4 md:grid-cols-2">
            <IdeaCard
              idea={currentPair.ideaA}
              sourceCount={currentPair.sourceCountA}
              label="A"
              onMerge={() =>
                handleMerge(currentPair.ideaA.id, currentPair.ideaB.id)
              }
              loading={loading}
            />
            <IdeaCard
              idea={currentPair.ideaB}
              sourceCount={currentPair.sourceCountB}
              label="B"
              onMerge={() =>
                handleMerge(currentPair.ideaB.id, currentPair.ideaA.id)
              }
              loading={loading}
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 border-t border-gray-200 pt-4">
            <button
              onClick={handleDismiss}
              disabled={loading}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Dismiss (Not Duplicates)
            </button>
            <button
              onClick={handleSkip}
              disabled={loading || currentIndex >= pairs.length - 1}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Skip
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <svg
            className="mx-auto h-10 w-10 text-gray-300"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 12l2 2 4-4" />
            <circle cx="12" cy="12" r="10" />
          </svg>
          <h3 className="mt-3 text-sm font-medium text-gray-900">
            No pending pairs
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Click &ldquo;Refresh Candidates&rdquo; to scan for new duplicates.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Sub-component: Idea Card ──────────────────────────────────

interface IdeaCardProps {
  idea: Idea
  sourceCount: number
  label: string
  onMerge: () => void
  loading: boolean
}

function IdeaCard({ idea, sourceCount, label, onMerge, loading }: IdeaCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
              {label}
            </span>
            <h3 className="text-sm font-semibold text-gray-900 truncate">
              {idea.title}
            </h3>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
            idea.status === "active"
              ? "bg-green-100 text-green-700"
              : idea.status === "needs_review"
              ? "bg-orange-100 text-orange-700"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {idea.status}
        </span>
      </div>

      {/* Summary */}
      <p className="text-sm text-gray-600 line-clamp-3">{idea.summary}</p>

      {/* Metadata grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded bg-gray-50 px-2 py-1.5">
          <span className="text-gray-400">Mentions</span>
          <span className="ml-1 font-semibold text-gray-700">
            {idea.mention_count}
          </span>
        </div>
        <div className="rounded bg-gray-50 px-2 py-1.5">
          <span className="text-gray-400">Sources</span>
          <span className="ml-1 font-semibold text-gray-700">
            {sourceCount}
          </span>
        </div>
        <div className="rounded bg-gray-50 px-2 py-1.5">
          <span className="text-gray-400">Revenue</span>
          <span className="ml-1 font-semibold text-gray-700">
            {idea.revenue_potential}
          </span>
        </div>
        <div className="rounded bg-gray-50 px-2 py-1.5">
          <span className="text-gray-400">Signal</span>
          <span
            className={`ml-1 font-semibold ${
              idea.market_signal === "strong"
                ? "text-green-600"
                : idea.market_signal === "moderate"
                ? "text-yellow-600"
                : "text-gray-400"
            }`}
          >
            {idea.market_signal}
          </span>
        </div>
      </div>

      {/* Category + difficulty */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600">
          {idea.category}
        </span>
        <span>Difficulty: {idea.difficulty}/5</span>
        <span>Pop: {idea.popularity_score.toFixed(1)}</span>
      </div>

      {/* Merge button */}
      <button
        onClick={onMerge}
        disabled={loading}
        className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        Keep This (Merge Into {label})
      </button>
    </div>
  )
}
