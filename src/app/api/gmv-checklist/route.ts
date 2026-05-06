import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface ChecklistItem {
  item_id: string;
  item_text: string;
  completed: boolean;
}

interface ChecklistResponse {
  weekly: ChecklistItem[];
  monthly: ChecklistItem[];
}

export async function GET(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all checklist items
    const { data, error } = await supabase
      .from('gmv_checklist')
      .select('checklist_type, item_id, item_text, completed');

    if (error) {
      console.error('[GMV Checklist API] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Group by type
    const weekly: ChecklistItem[] = [];
    const monthly: ChecklistItem[] = [];

    (data || []).forEach((item: any) => {
      if (item.checklist_type === 'weekly') {
        weekly.push({ item_id: item.item_id, item_text: item.item_text, completed: item.completed });
      } else if (item.checklist_type === 'monthly') {
        monthly.push({ item_id: item.item_id, item_text: item.item_text, completed: item.completed });
      }
    });

    return NextResponse.json({ weekly, monthly });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    console.error('[GMV Checklist API] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { weekly, monthly } = body as ChecklistResponse;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Delete all existing items
    await supabase.from('gmv_checklist').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Insert weekly items
    if (weekly && weekly.length > 0) {
      const weeklyData = weekly.map(item => ({
        checklist_type: 'weekly',
        item_id: item.item_id,
        item_text: item.item_text,
        completed: item.completed,
      }));
      await supabase.from('gmv_checklist').insert(weeklyData);
    }

    // Insert monthly items
    if (monthly && monthly.length > 0) {
      const monthlyData = monthly.map(item => ({
        checklist_type: 'monthly',
        item_id: item.item_id,
        item_text: item.item_text,
        completed: item.completed,
      }));
      await supabase.from('gmv_checklist').insert(monthlyData);
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    console.error('[GMV Checklist API] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
