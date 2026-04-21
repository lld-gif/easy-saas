"use client"

import { useState } from "react"
import Link from "next/link"
import { AuthButton } from "@/components/AuthButton"

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

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

          {/* Desktop nav. "Saved" is always visible; the /saved page
              route-gates and shows a sign-in prompt for signed-out users,
              so there's no value in client-checking auth just to hide it
              and introducing a flicker. */}
          <div className="hidden md:flex items-center gap-4">
            <Link href="/ideas" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Browse Ideas
            </Link>
            <Link href="/saved" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Saved
            </Link>
            <Link href="/blog" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Blog
            </Link>
            <Link href="/pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </Link>
            <AuthButton />
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle menu"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {menuOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="px-4 py-3 space-y-1">
            <Link
              href="/ideas"
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2.5 rounded-md text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Browse Ideas
            </Link>
            <Link
              href="/saved"
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2.5 rounded-md text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Saved
            </Link>
            <Link
              href="/blog"
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2.5 rounded-md text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Blog
            </Link>
            <Link
              href="/pricing"
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2.5 rounded-md text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Pricing
            </Link>
            <div className="px-3 py-2.5 border-t border-border mt-2 pt-3">
              <AuthButton mobile onAction={() => setMenuOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
