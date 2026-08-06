import { supabase } from '../config/supabase.js';

async function inspectEventDetails() {
  const eventId = '983d9797-3a7d-4746-8d82-38cb97a9968c';
  const { data: event } = await supabase.from('events').select('*').eq('id', eventId).single();
  console.log('Event details:', {
    name: event.name,
    start_date: event.start_date,
    end_date: event.end_date,
    location: event.location
  });
}

inspectEventDetails();
