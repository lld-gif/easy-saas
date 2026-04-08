import Link from "next/link"
import { AuthButton } from "@/components/AuthButton"
import { ThemeToggle } from "@/components/ThemeToggle"

export function Navbar() {
  return (
    <nav className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-tight">
            <span className="text-orange-500 dark:text-orange-400">Vibe</span><span className="text-foreground">Code Ideas</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/ideas" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Browse Ideas
            </Link>
            <Link href="/pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </Link>
            <ThemeToggle />
            <AuthButton />
          </div>
        </div>
      </div>
    </nav>
  )
}
