const SUPABASE_URL = "https://skswwmqafshlxvhbzmgw.supabase.co";
const SUPABASE_KEY = "sb_publishable_-wdMHdobaUqyMpN2tIdTbg_quxB1JXz";

async function supaFetch(endpoint, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Accept-Profile': 'events',
      'Content-Profile': 'events',
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  return res.json();
}

async function checkDuplicates() {
  console.log('--- Inspecting Events via REST API ---');
  const events = await supaFetch('/events?select=id,name');
  console.log('Events found:', events);

  if (Array.isArray(events) && events.length > 0) {
    for (const ev of events) {
      console.log(`\n=== Event ID: ${ev.id} (${ev.name}) ===`);
      const invs = await supaFetch(`/invitations?select=id,guest_name,guest_email,category_id,code,is_active,created_at,deleted_at&event_id=eq.${ev.id}&deleted_at=is.null`);
      console.log(`Invitations count: ${Array.isArray(invs) ? invs.length : 0}`);

      const atts = await supaFetch(`/attendees?select=id,first_name,last_name,email,company,job_title,category_id,invitation_id,additional_data,created_at,deleted_at&event_id=eq.${ev.id}&deleted_at=is.null`);
      console.log(`Attendees count: ${Array.isArray(atts) ? atts.length : 0}`);

      if (!Array.isArray(invs)) {
        console.log('Invitations response error:', invs);
        continue;
      }

      // Group invitations by normalized guest_name
      const nameGroup = new Map();
      invs.forEach(i => {
        const norm = (i.guest_name || '').trim().toLowerCase();
        if (!norm) return;
        if (!nameGroup.has(norm)) nameGroup.set(norm, []);
        nameGroup.get(norm).push(i);
      });

      const duplicates = Array.from(nameGroup.entries()).filter(([k, list]) => list.length > 1);
      console.log(`Duplicate guest names count: ${duplicates.length}`);

      duplicates.forEach(([name, list]) => {
        console.log(`\n--- Duplicate Guest: "${name}" (${list.length} records) ---`);
        list.forEach(i => {
          console.log(`   ID: ${i.id} | Email: "${i.guest_email || ''}" | Code: ${i.code} | CatID: ${i.category_id} | Created: ${i.created_at}`);
        });
      });
    }
  }
}

checkDuplicates().catch(console.error);
