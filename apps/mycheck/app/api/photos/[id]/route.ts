import { NextResponse } from 'next/server';
import { withAuth } from '../../../../lib/api-auth';
import { getSupabase } from '../../../../lib/supabase';

export const GET = withAuth(async (req, ctx) => {
  const photoId = new URL(req.url).pathname.split('/').at(-1) ?? '';
  const supabase = getSupabase();
  const { data: branches, error: branchesError } = await supabase
    .from('branches')
    .select('id')
    .in('code', ctx.branchIds)
    .eq('status', 'active')
    .is('deleted_at', null);
  if (branchesError) {
    console.error('MyCheck photo authorization lookup failed:', branchesError);
    return NextResponse.json({ error: 'Foto tidak dapat dimuat.' }, { status: 500 });
  }
  const branchIds = (branches ?? []).map((branch) => branch.id);
  if (!branchIds.length) return NextResponse.json({ error: 'Foto tidak ditemukan' }, { status: 404 });

  const { data: photo, error } = await supabase
    .from('mycheck_photos')
    .select('branch_id,storage_path,mime,status')
    .eq('id', photoId)
    .in('branch_id', branchIds)
    .eq('status', 'uploaded')
    .maybeSingle();
  if (error) {
    console.error('MyCheck photo metadata lookup failed:', error);
    return NextResponse.json({ error: 'Foto tidak dapat dimuat.' }, { status: 500 });
  }
  if (!photo) return NextResponse.json({ error: 'Foto tidak ditemukan' }, { status: 404 });

  const { data: file, error: downloadError } = await supabase.storage
    .from('mycheck-photos')
    .download(photo.storage_path);
  if (downloadError) {
    console.error('MyCheck photo download failed:', downloadError);
    return NextResponse.json({ error: 'File foto tidak dapat dimuat.' }, { status: 502 });
  }
  return new NextResponse(file, {
    headers: {
      'Content-Type': photo.mime || 'application/octet-stream',
      'Cache-Control': 'private, max-age=300',
      'X-Content-Type-Options': 'nosniff',
    },
  });
});
