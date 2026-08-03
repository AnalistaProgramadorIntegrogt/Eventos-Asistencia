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
  const attendees = await supaFetch(`/attendees?event_id=eq.${EVENT_ID}&select=id,status,invitation_id`);
  const invitations = await supaFetch(`/invitations?event_id=eq.${EVENT_ID}&select=id,is_active`);
  
  console.log(`Total attendees: ${attendees.length}`);
  console.log(`Total invitations: ${invitations.length}`);
  
  const attendeesWithInv = attendees.filter(a => a.invitation_id != null).length;
  console.log(`Attendees with invitation_id linked: ${attendeesWithInv}`);
}
run();
