import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { splitByCategory, sumFromItems } from '@mochikin/shared';

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({
        success: true,
        categories: [],
        items: [],
        message: 'Supabase tidak terhubung',
      });
    }

    const { data: categories, error: catErr } = await supabase
      .from('point_categories')
      .select('*')
      .eq('app_id', 'stokis')
      .order('name');

    if (catErr) throw catErr;

    const { data: items, error: itemErr } = await supabase
      .from('point_items')
      .select('*')
      .eq('app_id', 'stokis')
      .order('sort_order');

    if (itemErr) throw itemErr;

    return NextResponse.json({
      success: true,
      categories: categories || [],
      items: items || [],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Kesalahan server';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database tidak tersedia' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { categoryName, setMethod, totalPoints, items } = body;

    if (!categoryName) {
      return NextResponse.json(
        { success: false, error: 'categoryName wajib diisi' },
        { status: 400 }
      );
    }

    const method = setMethod === 'per_category' ? 'per_category' : 'per_item';
    let calculatedTotal = Number(totalPoints || 0);

    // 1. Hitung distribusi poin jika per_category (Method B) atau per_item (Method A)
    let processedItems: Array<{ id?: string; name: string; points: number }> = items || [];
    if (method === 'per_category' && processedItems.length > 0) {
      const splits = splitByCategory(calculatedTotal, processedItems.length);
      processedItems = processedItems.map((it, idx) => ({
        ...it,
        points: splits[idx],
      }));
    } else if (method === 'per_item') {
      calculatedTotal = sumFromItems(processedItems.map((it) => Number(it.points || 0)));
    }

    // 2. Upsert point_categories
    const { data: category, error: catErr } = await supabase
      .from('point_categories')
      .upsert(
        {
          app_id: 'stokis',
          name: categoryName,
          set_method: method,
          total_points: calculatedTotal,
        },
        { onConflict: 'app_id,name' }
      )
      .select()
      .single();

    if (catErr) throw catErr;

    // 3. Upsert point_items jika ada
    if (processedItems.length > 0 && category) {
      const itemsToUpsert = processedItems.map((it, idx) => ({
        category_id: category.id,
        app_id: 'stokis',
        name: it.name,
        points: it.points,
        sort_order: idx + 1,
      }));

      const { error: itemsErr } = await supabase
        .from('point_items')
        .upsert(itemsToUpsert, { onConflict: 'category_id,name' });

      if (itemsErr) throw itemsErr;
    }

    return NextResponse.json({
      success: true,
      category,
      items: processedItems,
      totalPoints: calculatedTotal,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Kesalahan server';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
