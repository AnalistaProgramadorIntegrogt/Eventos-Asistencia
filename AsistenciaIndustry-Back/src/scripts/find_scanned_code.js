import { supabase } from '../config/supabase.js';

async function findScannedCode() {
  console.log('=== BUSCANDO EL CÓDIGO ESCANEADO ATT-961C-082A EN SUPABASE DB ===');

  const { data: attendees } = await supabase
    .from('attendees')
    .select('*, event_categories(name)')
    .or('qr_code.ilike.%961C%,qr_code.ilike.%082A%,code.ilike.%961C%');

  console.log(`Coincidencias en attendees: ${attendees ? attendees.length : 0}`);
  if (attendees && attendees.length > 0) {
    attendees.forEach(a => {
      console.log('ATTENDEE ENCONTRADO:', {
        id: a.id,
        event_id: a.event_id,
        first_name: a.first_name,
        last_name: a.last_name,
        email: a.email,
        qr_code: a.qr_code,
        status: a.status
      });
    });
  }

  const { data: invitations } = await supabase
    .from('invitations')
    .select('*')
    .or('code.ilike.%961C%,code.ilike.%082A%');

  console.log(`Coincidencias en invitations: ${invitations ? invitations.length : 0}`);
  if (invitations && invitations.length > 0) {
    invitations.forEach(inv => {
      console.log('INVITATION ENCONTRADA:', {
        id: inv.id,
        event_id: inv.event_id,
        guest_name: inv.guest_name,
        guest_email: inv.guest_email,
        code: inv.code,
        status: inv.status
      });
    });
  }
}

findScannedCode();
