"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { BlurredPreview } from "@/components/BlurredPreview"
import { UpgradeButton } from "@/components/UpgradeButton"
import type { User } from "@supabase/supabase-js"

interface PackageSectionProps {
  ideaId: string
  ideaTitle?: string
}

function renderMarkdown(md: string): string {
  // Handle markdown tables — extract before HTML escaping
  const tableBlocks: string[] = []
  const lines = md.split("\n")
  const processed: string[] = []
  let tableLines: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line.startsWith("|") && line.endsWith("|")) {
      tableLines.push(line)
    } else {
      if (tableLines.length > 0) {
        const dataRows = tableLines.filter((l) => !/^\|[\s-:|]+\|$/.test(l))
        if (dataRows.length > 0) {
          let html = '<table class="w-full text-sm border-collapse mt-2 mb-2">'
          const headerCells = dataRows[0].split("|").filter(Boolean).map((c) => c.trim())
          html += "<thead><tr>" + headerCells.map((c) => `<th class="text-left px-2 py-1 border-b border-border font-semibold">${c}</th>`).join("") + "</tr></thead><tbody>"
          for (let j = 1; j < dataRows.length; j++) {
            const cells = dataRows[j].split("|").filter(Boolean).map((c) => c.trim())
            html += "<tr>" + cells.map((c) => `<td class="px-2 py-1 border-b border-border/50">${c}</td>`).join("") + "</tr>"
          }
          html += "</tbody></table>"
          tableBlocks.push(html)
          processed.push("___TABLE_BLOCK___")
        }
        tableLines = []
      }
      processed.push(lines[i])
    }
  }
  if (tableLines.length > 0) {
    const dataRows = tableLines.filter((l) => !/^\|[\s-:|]+\|$/.test(l))
    if (dataRows.length > 0) {
      let html = '<table class="w-full text-sm border-collapse mt-2 mb-2">'
      const headerCells = dataRows[0].split("|").filter(Boolean).map((c) => c.trim())
      html += "<thead><tr>" + headerCells.map((c) => `<th class="text-left px-2 py-1 border-b border-border font-semibold">${c}</th>`).join("") + "</tr></thead><tbody>"
      for (let j = 1; j < dataRows.length; j++) {
        const cells = dataRows[j].split("|").filter(Boolean).map((c) => c.trim())
        html += "<tr>" + cells.map((c) => `<td class="px-2 py-1 border-b border-border/50">${c}</td>`).join("") + "</tr>"
      }
      html += "</tbody></table>"
      tableBlocks.push(html)
      processed.push("___TABLE_BLOCK___")
    }
  }

  let result = processed.join("\n")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^### (.*$)/gm, "<h3 class='font-semibold text-base mt-4 mb-1'>$1</h3>")
    .replace(/^## (.*$)/gm, "<h2 class='font-bold text-lg mt-6 mb-2'>$1</h2>")
    .replace(/^# (.*$)/gm, "<h1 class='font-bold text-xl mt-6 mb-3'>$1</h1>")
    .replace(/^&gt; (.*$)/gm, '<blockquote class="border-l-4 border-orange-400 pl-4 py-1 my-2 italic text-foreground/80">$1</blockquote>')
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs font-mono">$1</code>')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-orange-500 dark:text-orange-400 underline" target="_blank" rel="noopener">$1</a>')
    .replace(/^- \[ \] (.*$)/gm, "<div class='flex gap-2 ml-4'><span>☐</span><span>$1</span></div>")
    .replace(/^- (.*$)/gm, "<div class='flex gap-2 ml-4'><span>•</span><span>$1</span></div>")
    .replace(/^(\d+)\. (.*$)/gm, "<div class='flex gap-2 ml-4'><span>$1.</span><span>$2</span></div>")
    .replace(/\n\n/g, "<br/>")
    .replace(/\n/g, "<br/>")

  // Re-insert table HTML
  let blockIndex = 0
  result = result.replace(/___TABLE_BLOCK___/g, () => tableBlocks[blockIndex++] || "")

  return result
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
}

export function PackageSection({ ideaId, ideaTitle }: PackageSectionProps) {
  const [user, setUser] = useState<User | null>(null)
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>("free")
  const [packageData, setPackageData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        const { data } = await supabase.from("users").select("subscription_status").eq("id", user.id).single()
        setSubscriptionStatus(data?.subscription_status ?? "free")
        if (data?.subscription_status === "pro") {
          const { data: details } = await supabase.from("idea_details").select("package_json").eq("idea_id", ideaId).single()
          if (details?.package_json) setPackageData(details.package_json)
        }
      }
      setLoading(false)
    }
    init()
  }, [ideaId])

  const handleGenerate = async () => {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch("/api/packages/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea_id: ideaId }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message || data.error); return }
      setPackageData(data.package)
    } catch { setError("Failed to generate. Please try again.") }
    finally { setGenerating(false) }
  }

  const getFullMarkdown = useCallback((): string => {
    if (!packageData) return ""
    // Use the pre-built full_package if available, otherwise combine sections
    if (packageData.full_package) return packageData.full_package
    return [packageData.tech_spec, packageData.brand_kit, packageData.launch_checklist]
      .filter(Boolean)
      .join("\n\n---\n\n")
  }, [packageData])

  const handleCopy = async () => {
    const md = getFullMarkdown()
    await navigator.clipboard.writeText(md)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const md = getFullMarkdown()
    const slug = slugify(ideaTitle || "quick-start-package")
    const blob = new Blob([md], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${slug}-quick-start.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return null

  // Not signed in
  if (!user) {
    return (
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Quick Start Package</h2>
        <BlurredPreview />
        <div className="text-center mt-4">
          <p className="text-sm text-muted-foreground mb-3">Sign in to get started — Pro members get the full package</p>
          <Button variant="outline" onClick={async () => {
            const supabase = createClient()
            await supabase.auth.signInWithOAuth({
              provider: "google",
              options: { redirectTo: `${window.location.origin}/auth/callback?next=${window.location.pathname}` },
            })
          }}>
            Sign in with Google
          </Button>
        </div>
      </div>
    )
  }

  // Free user
  if (subscriptionStatus !== "pro") {
    return (
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Quick Start Package</h2>
        <BlurredPreview />
        <div className="text-center mt-4">
          <p className="text-sm text-muted-foreground mb-3">Upgrade to Pro to unlock Tech Spec, Brand Kit, and Launch Checklist</p>
          <UpgradeButton />
        </div>
      </div>
    )
  }

  // Pro + package exists
  if (packageData) {
    return (
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-2">Quick Start Package</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Copy or download the full .md file and paste it into Claude, Cursor, Codex, or any AI coding assistant to start building.
        </p>

        {/* Action buttons */}
        <div className="flex gap-3 mb-6">
          <Button
            onClick={handleCopy}
            className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
          >
            {copied ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                Copy to Clipboard
              </>
            )}
          </Button>
          <Button
            onClick={handleDownload}
            variant="outline"
            className="gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Download .md
          </Button>
        </div>

        {/* Browseable sections */}
        <div className="space-y-4">
          {[
            { title: "Tech Spec", content: packageData.tech_spec, icon: "⚡" },
            { title: "Brand Kit", content: packageData.brand_kit, icon: "🎨" },
            { title: "Launch Checklist", content: packageData.launch_checklist, icon: "🚀" },
          ].map((section) => (
            <details key={section.title} className="border border-border rounded-xl overflow-hidden group">
              <summary className="px-6 py-4 bg-muted/50 cursor-pointer font-semibold text-foreground flex items-center gap-2 hover:bg-muted">
                <span>{section.icon}</span> {section.title}
                <svg className="w-4 h-4 ml-auto text-muted-foreground transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </summary>
              <div className="px-6 py-4 text-sm text-foreground/80 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(section.content) }} />
            </details>
          ))}
        </div>
      </div>
    )
  }

  // Pro + no package yet
  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold mb-4">Quick Start Package</h2>
      <div className="border border-dashed border-input rounded-xl p-8 text-center bg-card">
        <p className="text-foreground/80 mb-1">Get a complete project brief you can paste straight into your AI coding tool</p>
        <p className="text-xs text-muted-foreground mb-4">Tech Spec + Brand Kit + Launch Checklist — generated in ~10 seconds, downloadable as .md</p>
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        <Button onClick={handleGenerate} disabled={generating} className="bg-orange-500 hover:bg-orange-600 text-white">
          {generating ? "Generating..." : "Generate Quick Start Package"}
        </Button>
      </div>
    </div>
  )
}
