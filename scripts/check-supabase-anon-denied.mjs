const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/+$/, '');
const anonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  throw new Error('Set SUPABASE_URL and SUPABASE_ANON_KEY to run the anon access probe.');
}

const tables = ['branches', 'people', 'mycheck_shift_instances'];
let failed = false;

for (const table of tables) {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/${table}?select=id&limit=0`,
    {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    },
  );
  const denied = response.status === 401 || response.status === 403;
  console.log(`${table}: HTTP ${response.status}${denied ? ' (denied)' : ' (UNEXPECTED)'}`);
  failed ||= !denied;
}

if (failed) process.exitCode = 1;
