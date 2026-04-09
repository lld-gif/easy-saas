"use client"

import { useState, useTransition, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import type { Idea } from "@/types"

interface Props {
  ideas: Idea[]
  categories: string[]
  total: number
  page: number
  totalPages: number
  currentFilters: {
    search: string
    status: string
    category: string
    sort: string
    direction: string
  }
}

const statusColors: Record<string, string> = {
  active: "bg-green-50 text-green-700",
  needs_review: "bg-orange-50 text-orange-700",
  archived: "bg-gray-100 text-gray-500",
}

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "needs_review", label: "Needs Review" },
  { value: "archived", label: "Archived" },
]

export function IdeasTable({
  ideas,
  categories,
  total,
  page,
  totalPages,
  currentFilters,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<Idea>>({})
  const [actionPending, setActionPending] = useState(false)
  const [searchValue, setSearchValue] = useState(currentFilters.search)

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value && value !== "all" && value !== "") {
          params.set(key, value)
        } else {
          params.delete(key)
        }
      }
      if (!("page" in updates)) {
        params.delete("page")
      }
      startTransition(() => {
        router.push(`/admin/ideas?${params.toString()}`)
      })
    },
    [router, searchParams, startTransition]
  )

  const handleStatusChange = async (id: string, newStatus: string) => {
    setActionPending(true)
    try {
      const res = await fetch("/api/admin/ideas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_status", id, status: newStatus }),
      })
      if (res.ok) {
        startTransition(() => router.refresh())
      }
    } finally {
      setActionPending(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!editingId) return
    setActionPending(true)
    try {
      const res = await fetch("/api/admin/ideas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_idea", id: editingId, data: editData }),
      })
      if (res.ok) {
        setEditingId(null)
        setEditData({})
        startTransition(() => router.refresh())
      }
    } finally {
      setActionPending(false)
    }
  }

  const handleBulkAction = async (action: string) => {
    if (selected.size === 0) return
    const ids = Array.from(selected)
    setActionPending(true)
    try {
      let body: any
      if (action === "delete") {
        if (!confirm(`Delete ${ids.length} ideas? This cannot be undone.`)) {
          setActionPending(false)
          return
        }
        body = { action: "bulk_delete", ids }
      } else {
        body = { action: "bulk_status", ids, status: action }
      }
      const res = await fetch("/api/admin/ideas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setSelected(new Set())
        startTransition(() => router.refresh())
      }
    } finally {
      setActionPending(false)
    }
  }

  const toggleSelectAll = () => {
    if (selected.size === ideas.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(ideas.map((i) => i.id)))
    }
  }

  const toggleSelect = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const openEdit = (idea: Idea) => {
    setEditingId(idea.id)
    setEditData({
      title: idea.title,
      summary: idea.summary,
      category: idea.category,
      status: idea.status,
      difficulty: idea.difficulty,
      market_signal: idea.market_signal,
    })
  }

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <input
            type="text"
            placeholder="Search ideas..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") updateParams({ search: searchValue })
            }}
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
          />
          <svg className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </div>

        <select
          value={currentFilters.status}
          onChange={(e) => updateParams({ status: e.target.value })}
          className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
        >
          <option value="all">All Statuses</option>
          {statusOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <select
          value={currentFilters.category}
          onChange={(e) => updateParams({ category: e.target.value })}
          className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {(isPending || actionPending) && (
          <span className="text-xs text-indigo-600 animate-pulse">Updating...</span>
        )}
      </div>

      {/* Bulk Actions Bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-md">
          <span className="text-sm font-medium text-indigo-700">
            {selected.size} selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => handleBulkAction("active")}
              className="px-2.5 py-1 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100 transition-colors"
            >
              Approve
            </button>
            <button
              onClick={() => handleBulkAction("archived")}
              className="px-2.5 py-1 text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200 rounded hover:bg-gray-100 transition-colors"
            >
              Archive
            </button>
            <button
              onClick={() => handleBulkAction("needs_review")}
              className="px-2.5 py-1 text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200 rounded hover:bg-orange-100 transition-colors"
            >
              Flag Review
            </button>
            <button
              onClick={() => handleBulkAction("delete")}
              className="px-2.5 py-1 text-xs font-medium bg-red-50 text-red-700 border border-red-200 rounded hover:bg-red-100 transition-colors"
            >
              Delete
            </button>
          </div>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto text-xs text-gray-500 hover:text-gray-700"
          >
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-left">
              <th className="w-8 px-3 py-2">
                <input
                  type="checkbox"
                  checked={ideas.length > 0 && selected.size === ideas.length}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500/40"
                />
              </th>
              <th className="px-3 py-2 font-medium">Title</th>
              <th className="px-3 py-2 font-medium w-28">Category</th>
              <th className="px-3 py-2 font-medium w-28">Status</th>
              <th className="px-3 py-2 font-medium w-20 text-right">Mentions</th>
              <th className="px-3 py-2 font-medium w-24">Signal</th>
              <th className="px-3 py-2 font-medium w-28">Created</th>
              <th className="w-16 px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {ideas.map((idea) => (
              <tr
                key={idea.id}
                className={`hover:bg-gray-50 transition-colors ${
                  selected.has(idea.id) ? "bg-indigo-50/50" : ""
                }`}
              >
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(idea.id)}
                    onChange={() => toggleSelect(idea.id)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500/40"
                  />
                </td>
                <td className="px-3 py-2">
                  <div className="text-gray-900 font-medium truncate max-w-md">
                    {idea.title}
                  </div>
                  <div className="text-xs text-gray-400 truncate max-w-md">
                    {idea.summary}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <span className="text-xs text-gray-600">{idea.category}</span>
                </td>
                <td className="px-3 py-2">
                  <select
                    value={idea.status}
                    onChange={(e) => handleStatusChange(idea.id, e.target.value)}
                    className={`text-xs font-medium px-2 py-0.5 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${
                      statusColors[idea.status] || "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {statusOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2 text-right text-gray-700">
                  {idea.mention_count}
                </td>
                <td className="px-3 py-2">
                  <span className={`text-xs ${
                    idea.market_signal === "strong" ? "text-green-600" :
                    idea.market_signal === "moderate" ? "text-yellow-600" :
                    idea.market_signal === "weak" ? "text-red-500" : "text-gray-400"
                  }`}>
                    {idea.market_signal}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-gray-400">
                  {new Date(idea.created_at).toLocaleDateString()}
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => openEdit(idea)}
                    className="text-xs text-gray-400 hover:text-indigo-600 transition-colors"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
            {ideas.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-gray-400">
                  No ideas found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            Page {page} of {totalPages} ({total} total)
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => updateParams({ page: String(page - 1) })}
              className="px-3 py-1 bg-white border border-gray-300 rounded text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => updateParams({ page: String(page + 1) })}
              className="px-3 py-1 bg-white border border-gray-300 rounded text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white border border-gray-200 rounded-lg shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">Edit Idea</h2>
              <button
                onClick={() => { setEditingId(null); setEditData({}) }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18" />
                  <path d="M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
                <input
                  value={editData.title || ""}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Summary</label>
                <textarea
                  value={editData.summary || ""}
                  onChange={(e) => setEditData({ ...editData, summary: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                  <select
                    value={editData.category || ""}
                    onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                  <select
                    value={editData.status || ""}
                    onChange={(e) => setEditData({ ...editData, status: e.target.value as Idea["status"] })}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                  >
                    {statusOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Difficulty (1-5)</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={editData.difficulty || 3}
                    onChange={(e) => setEditData({ ...editData, difficulty: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Market Signal</label>
                  <select
                    value={editData.market_signal || "unknown"}
                    onChange={(e) => setEditData({ ...editData, market_signal: e.target.value as Idea["market_signal"] })}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                  >
                    <option value="strong">Strong</option>
                    <option value="moderate">Moderate</option>
                    <option value="weak">Weak</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => { setEditingId(null); setEditData({}) }}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={actionPending}
                className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {actionPending ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
