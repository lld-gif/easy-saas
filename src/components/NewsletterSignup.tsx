"use client"

import { useState } from "react"

export function NewsletterSignup() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setStatus("loading")
    setErrorMessage("")

    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setStatus("error")
        setErrorMessage(data.error || "Something went wrong.")
        return
      }

      setStatus("success")
      setEmail("")
    } catch {
      setStatus("error")
      setErrorMessage("Something went wrong. Please try again.")
    }
  }

  if (status === "success") {
    return (
      <div className="text-center py-8">
        <p className="text-lg font-medium text-green-600">
          You&apos;re in! Watch for weekly ideas.
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Weekly top SaaS ideas. No spam. Unsubscribe anytime.
        </p>
      </div>
    )
  }

  return (
    <div className="text-center py-8">
      <h3 className="text-lg font-semibold mb-2">Get the best ideas in your inbox</h3>
      <form onSubmit={handleSubmit} className="flex items-center justify-center gap-2 max-w-md mx-auto">
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
        >
          {status === "loading" ? "..." : "Subscribe"}
        </button>
      </form>
      {status === "error" && (
        <p className="text-sm text-red-500 mt-2">{errorMessage}</p>
      )}
      <p className="text-xs text-muted-foreground mt-3">
        Weekly top SaaS ideas. No spam. Unsubscribe anytime.
      </p>
    </div>
  )
}
