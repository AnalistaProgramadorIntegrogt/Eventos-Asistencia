import { supabase } from '../config/supabase.js';

async function inspectCats() {
  const eventId = '983d9797-3a7d-4746-8d82-38cb97a9968c';
  const { data: cats } = await supabase
    .from('event_categories')
    .select('*')
    .eq('event_id', eventId);

  console.log('Event categories en DB:', cats);
}

inspectCats();
