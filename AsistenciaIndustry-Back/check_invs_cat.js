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
    `/invitations?select=id,category_id,is_active,deleted_at,event_categories(name)&event_id=eq.${EVENT_ID}&deleted_at=is.null`
  );
  
  if (!Array.isArray(invs)) { console.log('Error:', invs); return; }
  
  const isGenericCat = (name) => {
    if (!name) return true;
    const n = name.trim().toLowerCase();
    return n === 'vip' || n === 'general' || n.includes('sin categor') || n.includes('general /');
  };

  let noCat = 0;
  invs.forEach(inv => {
    const catName = inv.event_categories?.name;
    if (!catName || isGenericCat(catName)) {
      noCat++;
    }
  });

  console.log(`Total active invitations: ${invs.length}`);
  console.log(`Invitations with no or generic category: ${noCat}`);

  const nullCatId = invs.filter(i => !i.category_id).length;
  console.log(`Invitations with category_id = null: ${nullCatId}`);
}
run();
