import Link from "next/link"

export function Navbar() {
  return (
    <nav className="border-b border-gray-200 bg-white sticky top-0 z-50">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-tight">
            <span className="text-orange-500">Easy</span><span className="text-gray-900">SaaS</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/ideas"
              className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
            >
              Browse Ideas
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
