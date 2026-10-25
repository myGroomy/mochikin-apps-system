import { createClient } from '@supabase/supabase-js';

async function testConnection() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.log('⚠️ SUPABASE_URL or SUPABASE_KEY not set in environment. Skipping live DB test.');
    console.log('To run live DB test, set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    return;
  }

  console.log(`🔌 Connecting to Supabase at ${supabaseUrl}...`);
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase.from('task_definitions').select('task_code, name').limit(5);

  if (error) {
    console.error('❌ Supabase connection test failed:', error.message);
    process.exit(1);
  }

  console.log('✅ Supabase connection test successful! Sample task definitions:');
  console.table(data);
}

testConnection().catch(err => {
  console.error('❌ Error during DB test:', err);
  process.exit(1);
});
