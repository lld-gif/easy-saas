"use client"

import { useState, useCallback } from "react"

interface Source {
  id: string
  platform: string
  source_identifier: string
  label: string | null
  enabled: boolean
  created_at: string
}

const PLATFORMS = ["reddit", "hackernews", "github", "producthunt", "indiehackers", "googletrends"]

export function SourcesTable({ initialSources }: { initialSources: Source[] }) {
  const [sources, setSources] = useState(initialSources)
  const [loading, setLoading] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newPlatform, setNewPlatform] = useState("reddit")
  const [newIdentifier, setNewIdentifier] = useState("")
  const [newLabel, setNewLabel] = useState("")
  const [addLoading, setAddLoading] = useState(false)

  const showMsg = useCallback((msg: string) => {
    setMessage(msg)
    setTimeout(() => setMessage(null), 3000)
  }, [])

  async function handleToggle(id: string, currentEnabled: boolean) {
    setLoading(id)
    const res = await fetch("/api/admin/sources", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, enabled: !currentEnabled }),
    })
    if (res.ok) {
      setSources(prev => prev.map(s => s.id === id ? { ...s, enabled: !currentEnabled } : s))
      showMsg(`Source ${!currentEnabled ? "enabled" : "disabled"}`)
    } else {
      showMsg("Failed to update")
    }
    setLoading(null)
  }

  async function handleDelete(id: string) {
    setLoading(id)
    const res = await fetch("/api/admin/sources", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    if (res.ok) {
      setSources(prev => prev.filter(s => s.id !== id))
      showMsg("Source deleted")
    } else {
      showMsg("Failed to delete")
    }
    setLoading(null)
  }

  async function handleAdd() {
    if (!newIdentifier) return
    setAddLoading(true)
    const res = await fetch("/api/admin/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform: newPlatform,
        source_identifier: newIdentifier,
        label: newLabel || null,
      }),
    })
    if (res.ok) {
      showMsg("Source added")
      setNewIdentifier("")
      setNewLabel("")
      setShowAdd(false)
      // Refetch
      const listRes = await fetch("/api/admin/sources")
      if (listRes.ok) {
        const data = await listRes.json()
        setSources(data.sources)
      }
    } else {
      const data = await res.json()
      showMsg(data.error || "Failed to add")
    }
    setAddLoading(false)
  }

  // Group by platform
  const grouped = PLATFORMS.map(p => ({
    platform: p,
    sources: sources.filter(s => s.platform === p),
  })).filter(g => g.sources.length > 0)

  return (
    <div className="space-y-4">
      {message && (
        <div className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white shadow-lg">{message}</div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">{sources.length} sources across {grouped.length} platforms</span>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add Source
        </button>
      </div>

      {showAdd && (
        <div className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex-wrap">
          <select
            value={newPlatform}
            onChange={(e) => setNewPlatform(e.target.value)}
            className="px-2 py-1.5 bg-white border border-gray-300 rounded-md text-sm"
          >
            {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <input
            placeholder="Subreddit name or search query..."
            value={newIdentifier}
            onChange={(e) => setNewIdentifier(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="flex-1 min-w-[200px] px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
          <input
            placeholder="Label (optional)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="w-40 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
          <button
            onClick={handleAdd}
            disabled={addLoading || !newIdentifier}
            className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {addLoading ? "Adding..." : "Add"}
          </button>
          <button onClick={() => setShowAdd(false)} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
        </div>
      )}

      {grouped.map(({ platform, sources: platformSources }) => (
        <div key={platform} className="rounded-lg border border-gray-200 overflow-hidden bg-white">
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
            <span className="text-sm font-semibold text-gray-700 capitalize">{platform}</span>
            <span className="ml-2 text-xs text-gray-400">{platformSources.length} sources</span>
          </div>
          <div className="divide-y divide-gray-100">
            {platformSources.map((source) => (
              <div key={source.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50">
                <button
                  onClick={() => handleToggle(source.id, source.enabled)}
                  disabled={loading === source.id}
                  className={`w-8 h-5 rounded-full relative transition-colors ${source.enabled ? "bg-green-500" : "bg-gray-300"}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${source.enabled ? "left-3.5" : "left-0.5"}`} />
                </button>
                <span className={`flex-1 text-sm ${source.enabled ? "text-gray-900" : "text-gray-400 line-through"}`}>
                  {source.source_identifier}
                </span>
                {source.label && (
                  <span className="text-xs text-gray-400">{source.label}</span>
                )}
                <button
                  onClick={() => handleDelete(source.id)}
                  disabled={loading === source.id}
                  className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50 transition-colors"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
