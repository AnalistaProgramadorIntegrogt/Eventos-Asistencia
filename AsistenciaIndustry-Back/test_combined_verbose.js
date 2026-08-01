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

const normalizeStr = (s) => (s || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, ' ');

async function run() {
  const invitations = await supaFetch(`/invitations?select=*,event_categories(name),attendees(company,job_title,additional_data)&event_id=eq.${EVENT_ID}&deleted_at=is.null`);
  
  const formSubmissions = await supaFetch(`/attendees?select=*,event_categories(name)&event_id=eq.${EVENT_ID}&deleted_at=is.null`);
  
  const combinedMap = new Map();
  const invitationIdMap = new Map();
  const codeMap = new Map();
  const emailMap = new Map();
  const nameCompanyMap = new Map();
  const nameMap = new Map();

  invitations.forEach(inv => {
    const cleanEmail = (inv.guest_email || inv.email || '').trim().toLowerCase();
    const cleanCode = (inv.code || inv.invitation_code || '').trim().toLowerCase();
    const internalCat = inv.category_name || (inv.event_categories ? inv.event_categories.name : null);

    const invItem = {
      id: inv.id,
      full_name: inv.guest_name,
      email: cleanEmail,
      category_id: inv.category_id,
      internal_category: internalCat || null,
      was_no_cat: !inv.category_id
    };

    combinedMap.set(inv.id, invItem);
    invitationIdMap.set(inv.id, invItem);
    if (cleanCode) codeMap.set(cleanCode, invItem);

    const normName = normalizeStr(invItem.full_name);
    if (cleanEmail) {
      emailMap.set(cleanEmail, invItem);
    }
    if (normName) {
      if (!nameMap.has(normName)) nameMap.set(normName, invItem);
    }
  });

  formSubmissions.forEach(sub => {
    const subEmail = (sub.email || '').trim().toLowerCase();
    const subCode = (sub.invitation_code || sub.code || sub.qr_code || '').trim().toLowerCase();
    const subInvId = sub.invitation_id;
    const subNormName = normalizeStr(sub.full_name || `${sub.first_name || ''} ${sub.last_name || ''}`);

    let existing = null;
    if (subInvId && invitationIdMap.has(subInvId)) existing = invitationIdMap.get(subInvId);
    else if (subCode && codeMap.has(subCode)) existing = codeMap.get(subCode);
    else if (subEmail && emailMap.has(subEmail)) existing = emailMap.get(subEmail);
    else if (subNormName && nameMap.has(subNormName)) existing = nameMap.get(subNormName);

    const subInternalCat = sub.category_name || (sub.event_categories ? sub.event_categories.name : null);

    if (existing) {
      if (subInternalCat) {
        existing.internal_category = existing.internal_category || subInternalCat;
      }
      if (sub.category_id) {
        existing.category_id = existing.category_id || sub.category_id;
      }
      if (existing.was_no_cat && existing.category_id) {
        console.log(`Gained category from attendee: ${existing.full_name}`);
      }
    }
  });
  
  // Wait, does nameMap overwriting cause data loss?
  // Let's check how many originally had no category vs after merge.
  
  const finalArray = Array.from(combinedMap.values());
  const categories = await supaFetch(`/event_categories?select=id,name&event_id=eq.${EVENT_ID}&deleted_at=is.null`);

  const filtered = finalArray.filter(item => {
    const catId = item.category_id;
    const catName = item.internal_category || item.category_name;
    if (catId || (catName && categories.some(c => c.name.toLowerCase() === catName.toLowerCase()))) return false;
    return true;
  });

  console.log(`\nFiltered 'Sin categoría': ${filtered.length}`);
}
run();
