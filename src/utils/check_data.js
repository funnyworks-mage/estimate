const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://maalenhkylszhyzwgznm.supabase.co';
const supabaseAnonKey = 'sb_publishable_2Zb7kZBD59a7AcY0BvAhAw_q_oj03aL';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const { data, error } = await supabase
    .from('estimate_projects')
    .select('id, title');

  if (error) {
    console.error('Error fetching:', error);
    return;
  }

  console.log('Project titles in Supabase:');
  data.forEach(p => console.log(`- ${p.title} (ID: ${p.id})`));
}

main();
