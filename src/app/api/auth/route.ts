import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const SITE_PASSWORD = process.env.SITE_PASSWORD || 'admin123'
const SESSION_NAME = 'ms_auth'
// Session valid for 7 days
const SESSION_MAX_AGE = 60 * 60 * 24 * 7

function generateToken() {
  const arr = new Uint8Array(32)
  crypto.getRandomValues(arr)
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('')
}

// POST /api/auth — login
export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json()
    if (password !== SITE_PASSWORD) {
      return NextResponse.json({ error: 'Password salah' }, { status: 401 })
    }

    const token = generateToken()
    const cookieStore = await cookies()
    cookieStore.set(SESSION_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    })

    return NextResponse.json({ ok: true, token })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

// GET /api/auth — check session
export async function GET() {
  const cookieStore = await cookies()
  const session = cookieStore.get(SESSION_NAME)
  if (session?.value) {
    return NextResponse.json({ authenticated: true })
  }
  return NextResponse.json({ authenticated: false }, { status: 401 })
}

// DELETE /api/auth — logout
export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_NAME)
  return NextResponse.json({ ok: true })
}
