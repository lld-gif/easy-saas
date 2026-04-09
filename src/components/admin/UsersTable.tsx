"use client"

import { useState, useTransition, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import type { AdminUser } from "@/lib/admin-queries"

interface Props {
  users: AdminUser[]
  total: number
  page: number
  totalPages: number
  currentSearch: string
}

export function UsersTable({ users, total, page, totalPages, currentSearch }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [searchValue, setSearchValue] = useState(currentSearch)

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

  return (
    <div className="space-y-4">
      {/* Search */}
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
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      user.subscription_status === "pro"
                        ? "bg-violet-50 text-violet-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {user.subscription_status === "pro" ? "Pro" : "Free"}
                  </span>
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
