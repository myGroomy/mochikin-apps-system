import { NextRequest, NextResponse } from 'next/server';
import { authenticatedUser } from '@/lib/apiAuth';
import { getCustomers } from '@/lib/customerRepository';
import { getSupabase } from '@/lib/supabase';
import { normalizePhone } from '@/utils/normalizePhone';
import { z } from 'zod';

/**
 * GET /api/customers
 * List customers, limiting staff to their authenticated branch.
 */
export async function GET() {
  try {
    const auth = await authenticatedUser();
    if (auth.error) return auth.error;
    const isPetugas = auth.user.role === 'petugas' || auth.user.role === 'kasir';
    if (isPetugas && !auth.user.branch) {
      return NextResponse.json({ error: 'User belum memiliki cabang' }, { status: 403 });
    }
    const customers = await getCustomers(isPetugas ? auth.user.branch : undefined);

    return NextResponse.json({
      success: true,
      data: customers,
      count: customers.length,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/customers
 * Create a new customer in branch
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticatedUser();
    if (auth.error) return auth.error;

    // Parse request body
    const body = await request.json();
    const schema = z.object({
      name: z.string().min(1),
      phone: z.string().min(10),
      email: z.string().email().optional(),
      address: z.string().optional(),
      notes: z.string().optional(),
    });

    let customerData;
    try {
      customerData = schema.parse(body);
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const branch = auth.user.role === 'petugas' || auth.user.role === 'kasir'
      ? auth.user.branch
      : (typeof body.branch === 'string' ? body.branch : auth.user.branch);
    if (!branch) return NextResponse.json({ error: 'Cabang wajib diisi' }, { status: 400 });
    const supabase = getSupabase();
    const { data: activeBranch, error: branchError } = await supabase
      .from('branches')
      .select('code')
      .eq('code', branch)
      .eq('status', 'active')
      .is('deleted_at', null)
      .maybeSingle();
    if (branchError) throw branchError;
    if (!activeBranch) return NextResponse.json({ error: 'Cabang tidak ditemukan atau tidak aktif' }, { status: 404 });

    const phone = normalizePhone(customerData.phone);
    if (!phone) return NextResponse.json({ error: 'Nomor telepon tidak valid' }, { status: 400 });

    const { data: newCustomer, error: insertError } = await supabase
      .from('mycust_customers')
      .insert({
        name: customerData.name.trim(),
        phone,
        phone_normalized: phone,
        branch,
        first_order_date: new Date().toISOString().slice(0, 10),
        order_count: 0,
        description: customerData.notes || null,
        aliases: [],
        branch_memberships: [branch],
      })
      .select()
      .single();
    if (insertError?.code === '23505') {
      return NextResponse.json({ error: 'Customer dengan nomor ini sudah terdaftar' }, { status: 409 });
    }
    if (insertError) throw insertError;

    return NextResponse.json(
      {
        success: true,
        data: newCustomer,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
