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

async function supaUpdate(table, id, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
      'Accept-Profile': 'events',
      'Content-Profile': 'events'
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`Failed to update ${id}:`, err);
  }
}

async function syncCategories() {
  let attendees = await supaFetch(`/attendees?select=invitation_id,category_id,first_name,last_name,email&event_id=eq.${EVENT_ID}&category_id=not.is.null&deleted_at=is.null`);
  let invitations = await supaFetch(`/invitations?select=id,guest_name,guest_email&event_id=eq.${EVENT_ID}&category_id=is.null&deleted_at=is.null`);

  if (!Array.isArray(attendees)) attendees = [];
  if (!Array.isArray(invitations)) invitations = [];

  let updated = 0;
  const normalizeStr = (s) => (s || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, ' ');

  for (const inv of invitations) {
    let att = attendees.find(a => a.invitation_id === inv.id);
    
    if (!att) {
      const invNormName = normalizeStr(inv.guest_name);
      att = attendees.find(a => {
        const attNormName = normalizeStr(`${a.first_name || ''} ${a.last_name || ''}`);
        return attNormName === invNormName;
      });
    }

    if (att) {
      console.log(`Syncing category ${att.category_id} to invitation ${inv.id} (${inv.guest_name})`);
      await supaUpdate('invitations', inv.id, { category_id: att.category_id });
      updated++;
    }
  }
  console.log(`Total invitations updated: ${updated}`);
}

syncCategories();
