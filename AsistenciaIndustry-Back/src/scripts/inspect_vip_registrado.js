import { supabase } from '../config/supabase.js';

async function inspectVipRegistrados() {
  const eventId = '983d9797-3a7d-4746-8d82-38cb97a9968c';
  console.log(`=== INSPECCIONANDO ATENDIENTES REGISTRADOS DE ${eventId} ===`);

  const { data: attendees } = await supabase
    .from('attendees')
    .select('*')
    .eq('event_id', eventId);

  if (attendees) {
    const registered = attendees.filter(a => a.status === 'confirmed' || a.status === 'registered' || a.status === 'attended');
    console.log(`Total asistentes registrados / confirmados: ${registered.length}`);

    registered.forEach((a, idx) => {
      console.log(`[${idx + 1}] ${a.first_name} ${a.last_name} (${a.email}):`);
      console.log('  status:', a.status);
      console.log('  company:', a.company);
      console.log('  job_title:', a.job_title);
      console.log('  additional_data:', JSON.stringify(a.additional_data));
    });
  }
}

inspectVipRegistrados();
