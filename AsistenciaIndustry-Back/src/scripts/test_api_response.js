import { supabase } from '../config/supabase.js';

async function testApiResponse() {
  const eventId = '983d9797-3a7d-4746-8d82-38cb97a9968c';
  console.log(`=== TEST BACKEND DATA FOR EVENT ${eventId} ===`);

  // 1. Invitations query (same as invitationRoutes GET /api/invitations/event/:eventId)
  const { data: invitations } = await supabase
    .from('invitations')
    .select(`
      *,
      event_categories (id, name),
      attendees (id, status, check_in_time, qr_code, company, job_title, phone, additional_data)
    `)
    .eq('event_id', eventId)
    .is('deleted_at', null);

  console.log(`Invitations count: ${invitations ? invitations.length : 0}`);
  if (invitations && invitations.length > 0) {
    console.log('Muestra de invitation[0]:', {
      id: invitations[0].id,
      guest_name: invitations[0].guest_name,
      category_id: invitations[0].category_id,
      event_categories: invitations[0].event_categories,
      additional_data: invitations[0].additional_data
    });
  }

  // 2. Attendees query (same as attendeeRoutes GET /api/events/:eventId/form-submissions)
  const { data: rawAttendees } = await supabase
    .from('attendees')
    .select(`
      *,
      event_categories (id, name),
      invitations (id, code, guest_name, guest_email)
    `)
    .eq('event_id', eventId)
    .is('deleted_at', null);

  console.log(`Attendees count: ${rawAttendees ? rawAttendees.length : 0}`);
  if (rawAttendees && rawAttendees.length > 0) {
    console.log('Muestra de attendee[0]:', {
      id: rawAttendees[0].id,
      first_name: rawAttendees[0].first_name,
      category_id: rawAttendees[0].category_id,
      event_categories: rawAttendees[0].event_categories,
      additional_data: rawAttendees[0].additional_data
    });
  }

  // 3. Obtener todas las categorías del evento
  const { data: categories } = await supabase
    .from('event_categories')
    .select('*')
    .eq('event_id', eventId);

  console.log('Event Categories:', categories);
}

testApiResponse();
