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
  const attendees = await supaFetch(`/attendees?event_id=eq.${EVENT_ID}`);
  console.log(`Total attendees: ${attendees.length}`);
  if (attendees.length > 0) {
    console.log("Sample 5 attendees:");
    console.table(attendees.slice(0, 5).map(a => ({
      first_name: a.first_name,
      last_name: a.last_name,
      email: a.email,
      company: a.company,
      created_at: a.created_at
    })));
  }
}
run();
