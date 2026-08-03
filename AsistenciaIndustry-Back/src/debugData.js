import { supabase } from '../config/supabase.js';

export default async function debugData(req, res) {
  const { eventId } = req.params;
  
  // Fetch invitations
  const { data: invs } = await supabase.from('invitations').select('*').eq('event_id', eventId);
  // Fetch attendees
  const { data: atts } = await supabase.from('attendees').select('*').eq('event_id', eventId);

  res.json({
    invitations: invs.map(i => ({ id: i.id, code: i.code, status: i.status, is_active: i.is_active, guest_name: i.guest_name })),
    attendees: atts.map(a => ({ id: a.id, invitation_id: a.invitation_id, email: a.email, status: a.status, qr_code: a.qr_code, first_name: a.first_name }))
  });
}
