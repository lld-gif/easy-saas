"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { BlurredPreview } from "@/components/BlurredPreview"
import { UpgradeButton } from "@/components/UpgradeButton"
import type { User } from "@supabase/supabase-js"

interface PackageSectionProps {
  ideaId: string
}

function renderMarkdown(md: string): string {
  return md
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^### (.*$)/gm, "<h3 class='font-semibold text-base mt-4 mb-1'>$1</h3>")
    .replace(/^## (.*$)/gm, "<h2 class='font-bold text-lg mt-6 mb-2'>$1</h2>")
    .replace(/^# (.*$)/gm, "<h1 class='font-bold text-xl mt-6 mb-3'>$1</h1>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-orange-600 underline" target="_blank" rel="noopener">$1</a>')
    .replace(/^- \[ \] (.*$)/gm, "<div class='flex gap-2 ml-4'><span>☐</span><span>$1</span></div>")
    .replace(/^- (.*$)/gm, "<div class='flex gap-2 ml-4'><span>•</span><span>$1</span></div>")
    .replace(/^(\d+)\. (.*$)/gm, "<div class='flex gap-2 ml-4'><span>$1.</span><span>$2</span></div>")
    .replace(/\n\n/g, "<br/>")
    .replace(/\n/g, "<br/>")
}

export function PackageSection({ ideaId }: PackageSectionProps) {
  const [user, setUser] = useState<User | null>(null)
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>("free")
  const [packageData, setPackageData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  if (loading) return null

  // Not signed in
  if (!user) {
    return (
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Quick Start Package</h2>
        <BlurredPreview />
        <div className="text-center mt-4">
          <p className="text-sm text-gray-500 mb-3">Sign in to unlock the full package</p>
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
          <p className="text-sm text-gray-500 mb-3">Upgrade to Pro to unlock Tech Spec, Brand Kit, and Launch Checklist</p>
          <UpgradeButton />
        </div>
      </div>
    )
  }

  // Pro + package exists
  if (packageData) {
    return (
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-6">Quick Start Package</h2>
        <div className="space-y-6">
          {[
            { title: "Tech Spec", content: packageData.tech_spec, icon: "⚡" },
            { title: "Brand Kit", content: packageData.brand_kit, icon: "🎨" },
            { title: "Launch Checklist", content: packageData.launch_checklist, icon: "🚀" },
          ].map((section) => (
            <details key={section.title} className="border border-gray-200 rounded-xl overflow-hidden" open>
              <summary className="px-6 py-4 bg-gray-50 cursor-pointer font-semibold flex items-center gap-2 hover:bg-gray-100">
                <span>{section.icon}</span> {section.title}
              </summary>
              <div className="px-6 py-4 text-sm text-gray-700 leading-relaxed"
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
      <div className="border border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50">
        <p className="text-gray-600 mb-1">Get a personalized Tech Spec, Brand Kit, and Launch Checklist</p>
        <p className="text-xs text-gray-400 mb-4">Generated by AI in ~10 seconds. Cached forever.</p>
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        <Button onClick={handleGenerate} disabled={generating} className="bg-orange-500 hover:bg-orange-600 text-white">
          {generating ? "Generating..." : "Generate Quick Start Package"}
        </Button>
      </div>
    </div>
  )
}
