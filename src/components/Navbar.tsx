import Link from "next/link"

export function Navbar() {
  return (
    <nav className="border-b border-border/60 bg-background/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-tight">
            <span className="text-primary">Easy</span>SaaS
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
