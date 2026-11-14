import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
// Try direct query via REST - Supabase doesn't expose DDL via PostgREST normally
// Instead update stokis_opnames via a no-op to check connectivity
const { data, error } = await supabase
  .from('stokis_opnames')
  .select('id, wa_sent_at')
  .limit(1);
if (error && error.message.includes('wa_sent_at')) {
  console.log("Column wa_sent_at tidak ada - perlu ALTER manual di SQL Editor");
} else if (error) {
  console.error("Error:", error.message);
} else {
  console.log("Column wa_sent_at sudah ada:", data);
}
