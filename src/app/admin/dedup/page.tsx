import { redirect } from "next/navigation"
import { isAdmin } from "@/lib/admin"
import { getDedupCandidates } from "@/lib/dedup-queries"
import { AdminShell } from "@/components/admin/AdminShell"
import { DedupQueue } from "@/components/admin/DedupQueue"

export const dynamic = "force-dynamic"

export default async function AdminDedupPage() {
  const admin = await isAdmin()
  if (!admin) redirect("/admin/login")

  const { pairs, stats } = await getDedupCandidates()

  return (
    <AdminShell>
      <div className="px-6 py-6 space-y-6">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Dedup Review</h1>
          <p className="text-sm text-gray-500">
            Review potential duplicate ideas and merge or dismiss them
          </p>
        </div>

        <DedupQueue initialPairs={pairs} initialStats={stats} />
      </div>
    </AdminShell>
  )
}
