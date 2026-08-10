import { supabase } from '../config/supabase.js';

async function searchAllCodes() {
  console.log('=== ESCANEO DE CÓDIGOS EN SUPABASE DB ===');

  const { data: attendees } = await supabase
    .from('attendees')
    .select('id, first_name, last_name, email, qr_code, invitation_id, event_id');

  console.log(`Total attendees: ${attendees ? attendees.length : 0}`);
  let attMatch = [];
  if (attendees) {
    attMatch = attendees.filter(a => {
      const q = (a.qr_code || '').toLowerCase().replace(/['\-\s]/g, '');
      return q.includes('961c') || q.includes('082a');
    });
  }
  console.log('Attendees coincidentes:', attMatch);

  const { data: invitations } = await supabase
    .from('invitations')
    .select('id, guest_name, guest_email, code, invitation_code, event_id');

  console.log(`Total invitations: ${invitations ? invitations.length : 0}`);
  let invMatch = [];
  if (invitations) {
    invMatch = invitations.filter(i => {
      const q = (i.code || i.invitation_code || '').toLowerCase().replace(/['\-\s]/g, '');
      return q.includes('961c') || q.includes('082a');
    });
  }
  console.log('Invitations coincidentes:', invMatch);
}

searchAllCodes();
