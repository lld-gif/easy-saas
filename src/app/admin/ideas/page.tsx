import { redirect } from "next/navigation"
import { isAdmin } from "@/lib/admin"
import { getAdminIdeas, getIdeaCategories } from "@/lib/admin-queries"
import { AdminShell } from "@/components/admin/AdminShell"
import { IdeasTable } from "@/components/admin/IdeasTable"

export const dynamic = "force-dynamic"

interface Props {
  searchParams: Promise<{
    page?: string
    search?: string
    status?: string
    category?: string
    sort?: string
    direction?: string
  }>
}

export default async function AdminIdeasPage({ searchParams }: Props) {
  const admin = await isAdmin()
  if (!admin) redirect("/admin/login")

  const params = await searchParams
  const page = parseInt(params.page || "1", 10)
  const pageSize = 50

  const [{ ideas, total }, categories] = await Promise.all([
    getAdminIdeas({
      page,
      pageSize,
      search: params.search,
      status: params.status,
      category: params.category,
      sort: params.sort || "created_at",
      direction: (params.direction as "asc" | "desc") || "desc",
    }),
    getIdeaCategories(),
  ])

  const totalPages = Math.ceil(total / pageSize)

  return (
    <AdminShell>
      <div className="px-6 py-6 space-y-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Ideas</h1>
          <p className="text-sm text-gray-500">
            {total} ideas total · Manage status, edit details, bulk actions
          </p>
        </div>

        <IdeasTable
          ideas={ideas}
          categories={categories}
          total={total}
          page={page}
          totalPages={totalPages}
          currentFilters={{
            search: params.search || "",
            status: params.status || "all",
            category: params.category || "all",
            sort: params.sort || "created_at",
            direction: params.direction || "desc",
          }}
        />
      </div>
    </AdminShell>
  )
}
