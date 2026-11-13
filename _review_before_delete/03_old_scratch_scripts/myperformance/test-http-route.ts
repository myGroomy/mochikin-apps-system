import { NextRequest } from 'next/server';
import { POST as emitRoute } from '../src/app/api/events/emit/route';
import { GET as getTodayRoute } from '../src/app/api/points/[person_id]/today/route';
import { GET as getSummaryRoute } from '../src/app/api/points/[person_id]/summary/route';
import { signEvent } from '@mochikin/shared/sso';
import { TaskEvent } from '@mochikin/shared/events';
import { createClient } from '@supabase/supabase-js';

const secret = process.env.MOCHIKIN_EVENTS_SECRET || 'dev-events-secret-key-12345';
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testHttpRoutes() {
  console.log('================================================================');
  console.log('🌐 PENGUJIAN HTTP ROUTE HANDLER (MYPERFORMANCE API)');
  console.log('================================================================\n');

  // Ambil person & branch
  const { data: person } = await supabase
    .from('people')
    .select('id, name, branch_id')
    .eq('status', 'active')
    .not('branch_id', 'is', null)
    .limit(1)
    .single();

  if (!person) throw new Error('Person not found');

  const testKey = `route-test-${Date.now()}`;
  const eventPayload: TaskEvent = {
    taskId: 'MYCHECK_HADIR',
    personId: person.id,
    branchId: person.branch_id,
    appId: 'mycheck',
    outputQty: 1,
    occurredAt: new Date().toISOString(),
    idempotencyKey: testKey,
  };

  // 1. Test POST /api/events/emit tanpa signature -> Harus 401
  console.log('1. Menguji Request tanpa X-Event-Signature...');
  const reqNoSig = new Request('http://localhost:3004/api/events/emit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventPayload),
  });
  const resNoSig = await emitRoute(reqNoSig);
  console.log(`   Status: ${resNoSig.status} (Diharapkan 401)`);
  if (resNoSig.status !== 401) throw new Error('Harus 401 tanpa signature');

  // 2. Test POST /api/events/emit dengan signature salah -> Harus 401
  console.log('\n2. Menguji Request dengan X-Event-Signature PALSU/SALAH...');
  const reqBadSig = new Request('http://localhost:3004/api/events/emit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Event-Signature': 'invalid-signature-12345',
    },
    body: JSON.stringify(eventPayload),
  });
  const resBadSig = await emitRoute(reqBadSig);
  console.log(`   Status: ${resBadSig.status} (Diharapkan 401)`);
  if (resBadSig.status !== 401) throw new Error('Harus 401 jika signature salah');

  // 3. Test POST /api/events/emit dengan signature valid -> Harus 201
  console.log('\n3. Menguji Request RESMI dengan valid HMAC Signature...');
  const validSig = signEvent(eventPayload, secret);
  const reqValid = new Request('http://localhost:3004/api/events/emit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Event-Signature': validSig,
    },
    body: JSON.stringify(eventPayload),
  });
  const resValid = await emitRoute(reqValid);
  const jsonValid = await resValid.json();
  console.log(`   Status: ${resValid.status} (Diharapkan 201)`);
  console.log(`   Response:`, jsonValid);
  if (resValid.status !== 201 || !jsonValid.success) {
    throw new Error('Harus 201 Created dengan success: true');
  }

  // 4. Test Idempotency melalui Route (Kirim Ulang payload yang sama) -> Harus 200
  console.log('\n4. Menguji Idempotency melalui Route (Kirim ulang payload yang sama)...');
  const reqDup = new Request('http://localhost:3004/api/events/emit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Event-Signature': validSig,
    },
    body: JSON.stringify(eventPayload),
  });
  const resDup = await emitRoute(reqDup);
  const jsonDup = await resDup.json();
  console.log(`   Status: ${resDup.status} (Diharapkan 200)`);
  console.log(`   Idempotent Flag: ${jsonDup.idempotent}`);
  if (resDup.status !== 200 || !jsonDup.idempotent) {
    throw new Error('Kirim ulang harus 200 dengan idempotent: true');
  }

  // 5. Test GET /api/points/[person_id]/today Route
  console.log(`\n5. Menguji Route GET /api/points/${person.id}/today...`);
  const reqToday = new NextRequest(`http://localhost:3004/api/points/${person.id}/today`, {
    headers: {
      'X-Person-Id': person.id,
      'X-Branch-Id': person.branch_id,
      'X-Role': 'role_staff',
    },
  });
  const resToday = await getTodayRoute(reqToday, {
    params: Promise.resolve({ person_id: person.id }),
  });
  const jsonToday = await resToday.json();
  console.log(`   Status: ${resToday.status}`);
  console.log(`   Data Poin Hari Ini:`, jsonToday);
  if (resToday.status !== 200 || !jsonToday.success) {
    throw new Error('GET today route failed');
  }

  // 6. Test GET /api/points/[person_id]/summary Route
  console.log(`\n6. Menguji Route GET /api/points/${person.id}/summary...`);
  const reqSummary = new NextRequest(`http://localhost:3004/api/points/${person.id}/summary`, {
    headers: {
      'X-Person-Id': person.id,
      'X-Branch-Id': person.branch_id,
      'X-Role': 'role_staff',
    },
  });
  const resSummary = await getSummaryRoute(reqSummary, {
    params: Promise.resolve({ person_id: person.id }),
  });
  const jsonSummary = await resSummary.json();
  console.log(`   Status: ${resSummary.status}`);
  console.log(`   Data Ringkasan Bulanan:`, jsonSummary);
  if (resSummary.status !== 200 || !jsonSummary.success) {
    throw new Error('GET summary route failed');
  }

  console.log('\n================================================================');
  console.log('🎉 SEMUA ROUTE HANDLER HTTP BERFUNGSI DENGAN SEMPURNA!');
  console.log('================================================================');
}

testHttpRoutes().catch((err) => {
  console.error('❌ Error during HTTP route testing:', err);
  process.exit(1);
});
