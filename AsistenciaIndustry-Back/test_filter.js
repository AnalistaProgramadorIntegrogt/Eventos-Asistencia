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

async function testFrontendFilter() {
  // 1. Fetch categories
  const categories = await supaFetch(`/event_categories?select=id,name&event_id=eq.${EVENT_ID}&deleted_at=is.null`);
  
  // 2. Fetch invitations just like findByEventId does
  const invitations = await supaFetch(`/invitations?select=*,event_categories(name),attendees(company,job_title,additional_data)&event_id=eq.${EVENT_ID}&deleted_at=is.null`);
  
  // 3. Simulate frontend filter "Sin categoría" (categoryFilter === 'none')
  const filtered = invitations.filter(item => {
    const catId = item.category_id;
    const catName = item.event_categories?.name;
    
    // logic in GuestManagement.jsx for categoryFilter === 'none'
    if (catId || (catName && categories.some(c => c.name.toLowerCase() === catName.toLowerCase()))) {
      return false;
    }
    
    return true;
  });

  console.log(`Total invitations: ${invitations.length}`);
  console.log(`Filtered 'Sin categoría': ${filtered.length}`);
  console.log(`Records with category_id = null: ${invitations.filter(i => !i.category_id).length}`);
  
  if (filtered.length !== invitations.filter(i => !i.category_id).length) {
    console.log('Discrepancy found! The ones excluded are:');
    const excluded = invitations.filter(i => !i.category_id && !filtered.includes(i));
    console.log(excluded);
  }
}

testFrontendFilter();
