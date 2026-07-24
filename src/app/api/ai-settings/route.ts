import { NextRequest, NextResponse } from 'next/server'
import { loadAISettingsDb, saveAISettingsDb } from '@/lib/db'

export async function GET() {
  try {
    const settings = await loadAISettingsDb()
    return NextResponse.json({ settings: settings || null })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to load AI settings' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { settings } = body
    if (!settings) {
      return NextResponse.json({ error: 'Settings payload missing' }, { status: 400 })
    }
    await saveAISettingsDb(settings)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save AI settings' }, { status: 500 })
  }
}
