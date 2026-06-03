import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const SITE_PASSWORD = process.env.SITE_PASSWORD || 'admin123'
const VIEWER_PASSWORD = process.env.SITE_PASSWORD_VIEWER || '' // kosong = disabled
const SESSION_NAME = 'ms_auth'
const ROLE_COOKIE  = 'ms_role'  // 'admin' | 'viewer'
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

    // Determine role
    let role: 'admin' | 'viewer' | null = null
    if (password === SITE_PASSWORD) {
      role = 'admin'
    } else if (VIEWER_PASSWORD && password === VIEWER_PASSWORD) {
      role = 'viewer'
    }

    if (!role) {
      return NextResponse.json({ error: 'Password salah' }, { status: 401 })
    }

    const token = generateToken()
    const cookieStore = await cookies()
    const cookieOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: SESSION_MAX_AGE,
      path: '/',
    }
    cookieStore.set(SESSION_NAME, token, cookieOpts)
    cookieStore.set(ROLE_COOKIE, role, cookieOpts)

    return NextResponse.json({ ok: true, token, role })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

// GET /api/auth — check session
export async function GET() {
  const cookieStore = await cookies()
  const session = cookieStore.get(SESSION_NAME)
  const roleCookie = cookieStore.get(ROLE_COOKIE)
  if (session?.value) {
    const role = (roleCookie?.value === 'viewer') ? 'viewer' : 'admin'
    return NextResponse.json({ authenticated: true, role })
  }
  return NextResponse.json({ authenticated: false }, { status: 401 })
}

// DELETE /api/auth — logout
export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_NAME)
  cookieStore.delete(ROLE_COOKIE)
  return NextResponse.json({ ok: true })
}
