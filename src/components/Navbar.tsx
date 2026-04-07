import Link from "next/link"

export function Navbar() {
  return (
    <nav className="border-b bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            EasySaaS
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/ideas"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Browse Ideas
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
