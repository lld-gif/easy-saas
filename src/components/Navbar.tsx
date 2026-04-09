import Link from "next/link"
import { AuthButton } from "@/components/AuthButton"

export function Navbar() {
  return (
    <nav className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
              <rect width="32" height="32" rx="8" fill="#f97316"/>
              <path d="M12.5 10L7 16l5.5 6" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M19.5 10L25 16l-5.5 6" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M17.5 9L14.5 23" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span><span className="text-orange-500">Vibe</span><span className="text-foreground">Code Ideas</span></span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/ideas" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Browse Ideas
            </Link>
            <Link href="/blog" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Blog
            </Link>
            <Link href="/pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </Link>
            <AuthButton />
          </div>
        </div>
      </div>
    </nav>
  )
}
