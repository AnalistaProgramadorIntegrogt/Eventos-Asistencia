import { supabase } from '../config/supabase.js';

async function inspectFullData() {
  const eventId = '983d9797-3a7d-4746-8d82-38cb97a9968c';
  console.log(`=== INSPECCIÓN COMPLETA DE EVENTO ${eventId} ===`);

  const { data: event } = await supabase.from('events').select('*').eq('id', eventId).single();
  console.log('form_config custom_fields:', JSON.stringify(event?.form_config?.custom_fields, null, 2));

  const { data: attendees } = await supabase
    .from('attendees')
    .select('*')
    .eq('event_id', eventId);

  console.log(`Total attendees: ${attendees ? attendees.length : 0}`);
  if (attendees) {
    console.log('--- MUESTRA DE ATTENDEES (Primeros 15) ---');
    attendees.slice(0, 15).forEach((a, idx) => {
      console.log(`[${idx + 1}] ${a.first_name} ${a.last_name} (${a.email}):`);
      console.log('  company:', a.company);
      console.log('  job_title:', a.job_title);
      console.log('  phone:', a.phone);
      console.log('  category_id:', a.category_id);
      console.log('  is_public_registration:', a.is_public_registration);
      console.log('  additional_data:', JSON.stringify(a.additional_data));
    });
  }

  const { data: invitations } = await supabase
    .from('invitations')
    .select('*')
    .eq('event_id', eventId);

  console.log(`Total invitations: ${invitations ? invitations.length : 0}`);
  if (invitations) {
    console.log('--- MUESTRA DE INVITATIONS (Primeros 15) ---');
    invitations.slice(0, 15).forEach((inv, idx) => {
      console.log(`[${idx + 1}] ${inv.guest_name} (${inv.guest_email}):`);
      console.log('  guest_company:', inv.guest_company);
      console.log('  category_id:', inv.category_id);
      console.log('  additional_data:', JSON.stringify(inv.additional_data));
    });
  }
}

inspectFullData();
