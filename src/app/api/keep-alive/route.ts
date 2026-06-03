import { NextResponse } from 'next/server'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

/**
 * Keep-alive endpoint for Supabase.
 * Called by Vercel Cron every 5 days to prevent the free-tier database from pausing.
 * Supabase free tier pauses databases after 7 days of inactivity.
 */
export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ status: 'skipped', reason: 'Supabase not configured' })
  }

  try {
    // Lightweight query — just fetch 1 row from stores (always exists)
    const start = Date.now()
    const { error } = await supabase.from('stores').select('id').limit(1)
    const latency = Date.now() - start

    if (error) {
      console.error('[keep-alive] Supabase ping error:', error.message)
      return NextResponse.json(
        { status: 'error', message: error.message, latency },
        { status: 500 },
      )
    }

    console.log(`[keep-alive] Supabase ping OK (${latency}ms)`)
    return NextResponse.json({
      status: 'ok',
      latency,
      timestamp: new Date().toISOString(),
    })
  } catch (err: any) {
    console.error('[keep-alive] Unexpected error:', err)
    return NextResponse.json(
      { status: 'error', message: err?.message || String(err) },
      { status: 500 },
    )
  }
}
