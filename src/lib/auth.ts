import { createClient } from "@/lib/supabase/server"

export interface AppUser {
  id: string
  email: string
  subscription_status: "free" | "pro"
  stripe_customer_id: string | null
}

export async function getUser(): Promise<AppUser | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single()

  return data as AppUser | null
}

export async function isPro(): Promise<boolean> {
  const user = await getUser()
  return user?.subscription_status === "pro"
}
