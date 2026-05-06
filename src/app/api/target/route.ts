import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { period, target_value, type = 'omzet' } = body;

    if (!period || target_value === undefined) {
      return NextResponse.json({ error: 'Missing required fields: period, target_value' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Upsert target (insert or update if exists)
    const { data, error } = await supabase
      .from('target_settings')
      .upsert({ period, type, target_value }, { onConflict: 'period,type' })
      .select()
      .single();

    if (error) {
      console.error('[Target API] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    console.error('[Target API] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || new Date().toISOString().slice(0, 7);
    const type = searchParams.get('type') || 'omzet';

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('target_settings')
      .select('target_value, period, type')
      .eq('period', period)
      .eq('type', type)
      .single();

    if (error) {
      // Return 0 if not found (target not set yet)
      if (error.code === 'PGRST116') {
        return NextResponse.json({ target_value: 0, period, type });
      }
      console.error('[Target API] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || { target_value: 0, period, type });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    console.error('[Target API] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
