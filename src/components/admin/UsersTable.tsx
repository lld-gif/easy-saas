"use client"

import { useState, useTransition, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import type { AdminUser } from "@/lib/admin-queries"

async function togglePlan(userId: string, currentPlan: string): Promise<boolean> {
  const newPlan = currentPlan === "pro" ? "free" : "pro"
  const res = await fetch("/api/admin/users", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, plan: newPlan }),
  })
  return res.ok
}

async function createUser(email: string, plan: string): Promise<{ success: boolean; error?: string }> {
  const res = await fetch("/api/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, plan }),
  })
  const data = await res.json()
  if (!res.ok) return { success: false, error: data.error }
  return { success: true }
}

interface Props {
  users: AdminUser[]
  total: number
  page: number
  totalPages: number
  currentSearch: string
}

export function UsersTable({ users: initialUsers, total, page, totalPages, currentSearch }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [searchValue, setSearchValue] = useState(currentSearch)
  const [users, setUsers] = useState(initialUsers)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [addEmail, setAddEmail] = useState("")
  const [addPlan, setAddPlan] = useState<"free" | "pro">("free")
  const [addLoading, setAddLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const showMessage = useCallback((msg: string) => {
    setMessage(msg)
    setTimeout(() => setMessage(null), 3000)
  }, [])

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value)
        } else {
          params.delete(key)
        }
      }
      if (!("page" in updates)) {
        params.delete("page")
      }
      startTransition(() => {
        router.push(`/admin/users?${params.toString()}`)
      })
    },
    [router, searchParams, startTransition]
  )

  async function handleTogglePlan(userId: string, currentPlan: string) {
    setTogglingId(userId)
    const ok = await togglePlan(userId, currentPlan)
    if (ok) {
      setUsers(prev =>
        prev.map(u =>
          u.id === userId
            ? { ...u, subscription_status: currentPlan === "pro" ? "free" : "pro" }
            : u
        )
      )
      showMessage(`Plan changed to ${currentPlan === "pro" ? "Free" : "Pro"}`)
    } else {
      showMessage("Failed to update plan")
    }
    setTogglingId(null)
  }

  async function handleAddUser() {
    if (!addEmail) return
    setAddLoading(true)
    const result = await createUser(addEmail, addPlan)
    if (result.success) {
      showMessage(`User ${addEmail} created as ${addPlan}`)
      setAddEmail("")
      setShowAddForm(false)
      startTransition(() => router.refresh())
    } else {
      showMessage(result.error || "Failed to create user")
    }
    setAddLoading(false)
  }

  return (
    <div className="space-y-4">
      {/* Toast */}
      {message && (
        <div className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white shadow-lg">
          {message}
        </div>
      )}

      {/* Add User */}
      {showAddForm ? (
        <div className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
          <input
            type="email"
            placeholder="user@example.com"
            value={addEmail}
            onChange={(e) => setAddEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddUser()}
            className="flex-1 max-w-xs px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
          <select
            value={addPlan}
            onChange={(e) => setAddPlan(e.target.value as "free" | "pro")}
            className="px-2 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-gray-700"
          >
            <option value="free">Free</option>
            <option value="pro">Pro</option>
          </select>
          <button
            onClick={handleAddUser}
            disabled={addLoading || !addEmail}
            className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {addLoading ? "Creating..." : "Create"}
          </button>
          <button
            onClick={() => setShowAddForm(false)}
            className="px-2 py-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      ) : null}

      {/* Search + Add button */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Search by email..."
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
        {isPending && (
          <span className="text-xs text-indigo-600 animate-pulse">Loading...</span>
        )}
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add User
        </button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-left">
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium w-28">Plan</th>
              <th className="px-3 py-2 font-medium w-24 text-right">Packages</th>
              <th className="px-3 py-2 font-medium w-32">Stripe</th>
              <th className="px-3 py-2 font-medium w-28">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-3 py-2">
                  <span className="text-gray-900">{user.email}</span>
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => handleTogglePlan(user.id, user.subscription_status)}
                    disabled={togglingId === user.id}
                    title={`Click to change to ${user.subscription_status === "pro" ? "Free" : "Pro"}`}
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-all hover:ring-2 hover:ring-offset-1 disabled:opacity-50 ${
                      user.subscription_status === "pro"
                        ? "bg-violet-50 text-violet-700 hover:ring-violet-300"
                        : "bg-gray-100 text-gray-500 hover:ring-gray-300"
                    }`}
                  >
                    {togglingId === user.id ? "..." : user.subscription_status === "pro" ? "Pro" : "Free"}
                  </button>
                </td>
                <td className="px-3 py-2 text-right text-gray-700">
                  {user.package_count}
                </td>
                <td className="px-3 py-2">
                  {user.stripe_customer_id ? (
                    <a
                      href={`https://dashboard.stripe.com/customers/${user.stripe_customer_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-600 hover:text-indigo-500 transition-colors"
                    >
                      {user.stripe_customer_id.slice(0, 18)}...
                    </a>
                  ) : (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-gray-400">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-gray-400">
                  No users found.
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
    </div>
  )
}
