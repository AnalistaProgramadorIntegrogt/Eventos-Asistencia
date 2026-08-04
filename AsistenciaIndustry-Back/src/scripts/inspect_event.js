import { supabase } from '../config/supabase.js';

async function inspectEvent() {
  const eventId = '983d9797-3a7d-4746-8d82-38cb97a9968c';
  console.log(`=== INSPECCIONANDO EVENTO ${eventId} ===`);

  const { data: event, error: evErr } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (evErr) console.error('Error obteniendo evento:', evErr);
  else {
    console.log('Form Config del evento:', JSON.stringify(event.form_config, null, 2));
  }

  const { data: attendees } = await supabase
    .from('attendees')
    .select('*')
    .eq('event_id', eventId)
    .limit(10);

  console.log(`Muestra de ${attendees ? attendees.length : 0} asistentes del evento:`);
  if (attendees) {
    attendees.forEach(a => {
      console.log(`- ${a.first_name} ${a.last_name} (${a.email}):`, {
        company: a.company,
        phone: a.phone,
        category_id: a.category_id,
        is_public: a.is_public_registration,
        additional_data: a.additional_data
      });
    });
  }
}

inspectEvent();
