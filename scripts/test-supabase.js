import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || 'https://yxhpbiyfkllnitqlmrjk.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(url, serviceKey);

async function main() {
  console.log('Testing Supabase connection...');
  const { data, error } = await supabase.from('land_records').select('*').limit(5);
  console.log('Result:', { data, error });
}

main();
