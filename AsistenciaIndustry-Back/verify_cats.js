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

// Primero ver qué columnas existen en invitations
const sample = await supaFetch(
  `/invitations?select=*&event_id=eq.${EVENT_ID}&deleted_at=is.null&limit=1`
);

if (Array.isArray(sample) && sample.length > 0) {
  console.log('Columnas disponibles en invitations:');
  console.log(Object.keys(sample[0]).join(', '));
  console.log('\nEjemplo:', JSON.stringify(sample[0], null, 2));
} else {
  console.log('Error o sin datos:', sample);
}
