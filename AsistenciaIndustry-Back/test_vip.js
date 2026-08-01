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

const checkIsVip = (record) => {
  if (record.is_public_registration === true) return false;
  if (record.is_imported === true || record.is_public_registration === false || !!record.invitation_id) return true;
  return false;
};

async function testVipFilter() {
  const invitations = await supaFetch(`/invitations?select=*,event_categories(name),attendees(company,job_title,additional_data)&event_id=eq.${EVENT_ID}&deleted_at=is.null`);
  
  const noCat = invitations.filter(i => !i.category_id);
  
  let vipCount = 0;
  let publicCount = 0;
  
  noCat.forEach(item => {
    if (checkIsVip(item)) vipCount++;
    else publicCount++;
  });
  
  console.log(`Total 'Sin categoría' (category_id = null): ${noCat.length}`);
  console.log(`Of those, checkIsVip=true: ${vipCount}`);
  console.log(`Of those, checkIsVip=false: ${publicCount}`);
}

testVipFilter();
