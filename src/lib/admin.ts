import { cookies } from "next/headers"
import { createHash } from "crypto"
import { getUser } from "@/lib/auth"

const COOKIE_NAME = "admin_session"

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

/**
 * Check if the current request has admin access.
 *
 * Two auth paths:
 * 1. Supabase user whose ID matches ADMIN_USER_ID env var
 * 2. Password-based session cookie (set via /api/admin/login)
 */
export async function isAdmin(): Promise<boolean> {
  // Path 1: Check password-based session cookie
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(COOKIE_NAME)
  if (sessionCookie?.value) {
    const [token, storedHash] = sessionCookie.value.split(":")
    if (token && storedHash && hashToken(token) === storedHash) {
      return true
    }
  }

  // Path 2: Check Supabase user against ADMIN_USER_ID
  const adminId = process.env.ADMIN_USER_ID
  if (!adminId) return false

  const user = await getUser()
  if (!user) return false

  return user.id === adminId
}
