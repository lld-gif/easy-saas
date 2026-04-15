import { redirect } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import { isAdmin } from "@/lib/admin"
import { AdminShell } from "@/components/admin/AdminShell"
import { SourcesTable } from "@/components/admin/SourcesTable"

export const dynamic = "force-dynamic"

export default async function AdminSourcesPage() {
  const admin = await isAdmin()
  if (!admin) redirect("/admin/login")

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: sources } = await supabase
    .from("scrape_sources")
    .select("*")
    .order("platform")
    .order("source_identifier")

  return (
    <AdminShell>
      <div className="px-6 py-6 space-y-6">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Scrape Sources</h1>
          <p className="text-sm text-gray-500">
            Manage the sources each scraper monitors. Changes here don&apos;t affect the live scrapers yet — that requires redeploying the Edge Functions.
          </p>
        </div>
        <SourcesTable initialSources={sources ?? []} />
      </div>
    </AdminShell>
  )
}
