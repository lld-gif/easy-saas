import Link from "next/link"
import { AuthButton } from "@/components/AuthButton"

export function Navbar() {
  return (
    <nav className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-tight">
            <span className="text-orange-400">Easy</span><span className="text-zinc-100">SaaS</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/ideas" className="text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors">
              Browse Ideas
            </Link>
            <Link href="/pricing" className="text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors">
              Pricing
            </Link>
            <AuthButton />
          </div>
        </div>
      </div>
    </nav>
  )
}
