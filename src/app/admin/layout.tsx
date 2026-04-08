import { redirect } from "next/navigation"
import { isAdmin } from "@/lib/admin"
import Link from "next/link"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const admin = await isAdmin()
  if (!admin) redirect("/")

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="border-b border-zinc-800 bg-zinc-900 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-zinc-100">EasySaaS Admin</h1>
            <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-xs font-medium text-orange-400">
              Dashboard
            </span>
          </div>
          <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-200">
            ← Back to site
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-6">{children}</main>
    </div>
  )
}
