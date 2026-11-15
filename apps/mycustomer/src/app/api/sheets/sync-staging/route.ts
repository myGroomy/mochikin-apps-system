import { NextResponse } from 'next/server'
import { authenticatedUser } from '@/lib/apiAuth'

export async function POST() {
  const auth = await authenticatedUser(['owner', 'admin'])
  if (auth.error) return auth.error
  // shortcut: staging sheets sudah tidak digunakan setelah RDBMS cutover
  return NextResponse.json({
    success: true,
    imported: 0,
    skipped: 0,
    errors: [],
  })
}
