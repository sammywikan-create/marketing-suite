/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

function err(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

// ─── GET: fetch daily logs & pipeline ──────────────────
export async function GET(req: NextRequest) {
  if (!isSupabaseConfigured) return err('Supabase not configured', 500);

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type'); // 'logs' | 'pipeline'
  const period = searchParams.get('period');
  const role = searchParams.get('role');

  try {
    if (type === 'pipeline') {
      let q = supabase.from('creator_pipeline').select('*').order('created_at', { ascending: false });
      if (role) q = q.eq('assigned_to', role);
      const { data, error } = await q;
      if (error) throw error;
      return NextResponse.json({ data: data || [] });
    }

    // Default: daily logs
    let q = supabase.from('staff_daily_logs').select('*').order('tanggal', { ascending: false });
    if (period) q = q.eq('period', period);
    if (role) q = q.eq('staff_role', role);
    const { data, error } = await q;
    if (error) throw error;
    return NextResponse.json({ data: data || [] });
  } catch (e: any) {
    return err(e.message || 'Failed to fetch', 500);
  }
}

// ─── POST: save daily log or create pipeline entry ─────
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured) return err('Supabase not configured', 500);

  try {
    const body = await req.json();
    const { type, ...rest } = body;

    if (type === 'pipeline') {
      const { data, error } = await supabase
        .from('creator_pipeline')
        .insert(rest)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ data });
    }

    // Daily log — upsert (update if same staff_role + tanggal exists)
    const { data, error } = await supabase
      .from('staff_daily_logs')
      .upsert(rest, { onConflict: 'staff_role,tanggal' })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (e: any) {
    return err(e.message || 'Failed to save', 500);
  }
}

// ─── PUT: update pipeline entry ────────────────────────
export async function PUT(req: NextRequest) {
  if (!isSupabaseConfigured) return err('Supabase not configured', 500);

  try {
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return err('Missing id');

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('creator_pipeline')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (e: any) {
    return err(e.message || 'Failed to update', 500);
  }
}

// ─── DELETE: remove log or pipeline entry ──────────────
export async function DELETE(req: NextRequest) {
  if (!isSupabaseConfigured) return err('Supabase not configured', 500);

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');
    if (!id) return err('Missing id');

    const table = type === 'pipeline' ? 'creator_pipeline' : 'staff_daily_logs';
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return err(e.message || 'Failed to delete', 500);
  }
}
