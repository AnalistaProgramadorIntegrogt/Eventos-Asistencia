const SUPABASE_URL = "https://skswwmqafshlxvhbzmgw.supabase.co";
const SUPABASE_KEY = "sb_publishable_-wdMHdobaUqyMpN2tIdTbg_quxB1JXz";
const EVENT_ID = "983d9797-3a7d-4746-8d82-38cb97a9968c";

async function supaFetch(ep) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${ep}`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Accept-Profile': 'events'
    }
  });
  return res.json();
}

async function run() {
  const invs = await supaFetch(
    `/invitations?select=id,guest_name,guest_email,category_id,code,is_active,created_at&event_id=eq.${EVENT_ID}&deleted_at=is.null`
  );
  
  const noCat = invs.filter(i => !i.category_id);
  console.log(`Total sin categoría en DB: ${noCat.length}`);
  
  // Group by guest_name to see if there are duplicates
  const names = {};
  noCat.forEach(i => {
    names[i.guest_name] = (names[i.guest_name] || 0) + 1;
  });
  
  let dups = 0;
  for (const [name, count] of Object.entries(names)) {
    if (count > 1) {
      console.log(`Duplicate: "${name}" (${count})`);
      dups += count;
    }
  }
  console.log(`Total duplicated names in noCat: ${dups}`);
  
  // Let's just print the first 10
  console.log('\nPrimeros 10:');
  noCat.slice(0, 10).forEach(i => console.log(`- ${i.guest_name} | ${i.guest_email} | ${i.created_at}`));
}
run();
