import { getUser } from "@/lib/auth"

/**
 * Check if the current user is an admin.
 * Uses ADMIN_USER_ID env var — set this to your own Supabase user ID.
 */
export async function isAdmin(): Promise<boolean> {
  const adminId = process.env.ADMIN_USER_ID
  if (!adminId) return false

  const user = await getUser()
  if (!user) return false

  return user.id === adminId
}
