import { redirect } from "next/navigation"
import { isAdmin } from "@/lib/admin"
import { getAdminUsers } from "@/lib/admin-queries"
import { AdminShell } from "@/components/admin/AdminShell"
import { UsersTable } from "@/components/admin/UsersTable"

export const dynamic = "force-dynamic"

interface Props {
  searchParams: Promise<{
    page?: string
    search?: string
  }>
}

export default async function AdminUsersPage({ searchParams }: Props) {
  const admin = await isAdmin()
  if (!admin) redirect("/admin/login")

  const params = await searchParams
  const page = parseInt(params.page || "1", 10)
  const pageSize = 50

  const { users, total } = await getAdminUsers({
    page,
    pageSize,
    search: params.search,
  })

  const totalPages = Math.ceil(total / pageSize)

  return (
    <AdminShell>
      <div className="px-6 py-6 space-y-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500">
            {total} registered users · Subscription status and package usage
          </p>
        </div>

        <UsersTable
          users={users}
          total={total}
          page={page}
          totalPages={totalPages}
          currentSearch={params.search || ""}
        />
      </div>
    </AdminShell>
  )
}
