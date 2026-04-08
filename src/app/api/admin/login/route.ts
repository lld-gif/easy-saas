import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { createHash, randomBytes } from "crypto"

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD
const COOKIE_NAME = "admin_session"
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export async function POST(request: Request) {
  if (!ADMIN_PASSWORD) {
    return NextResponse.json(
      { error: "Admin login not configured" },
      { status: 503 }
    )
  }

  const body = await request.json()
  const { password } = body

  if (!password || password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 })
  }

  // Generate a session token
  const token = randomBytes(32).toString("hex")
  const hashedToken = hashToken(token)

  // Store the hashed token in a cookie
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, `${token}:${hashedToken}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  })

  return NextResponse.json({ success: true })
}
