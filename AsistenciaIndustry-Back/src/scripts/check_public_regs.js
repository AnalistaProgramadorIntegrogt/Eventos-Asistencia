import { supabase } from '../config/supabase.js';

async function checkPublicRegs() {
  const eventId = '983d9797-3a7d-4746-8d82-38cb97a9968c';
  console.log(`=== BUSCANDO REGISTROS CONFIRMADOS / PÚBLICOS DEL EVENTO ${eventId} ===`);

  const { data: confirmed } = await supabase
    .from('attendees')
    .select('*')
    .eq('event_id', eventId)
    .eq('status', 'confirmed');

  console.log(`Total confirmados: ${confirmed ? confirmed.length : 0}`);
  if (confirmed) {
    confirmed.forEach(a => {
      console.log(`- ${a.first_name} ${a.last_name} (${a.email}):`, {
        company: a.company,
        job_title: a.job_title,
        phone: a.phone,
        additional_data: a.additional_data
      });
    });
  }
}

checkPublicRegs();
