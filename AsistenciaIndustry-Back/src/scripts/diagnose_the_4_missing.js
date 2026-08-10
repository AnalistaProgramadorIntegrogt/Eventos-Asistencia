import { supabase } from '../config/supabase.js';

async function diagnoseThe4() {
  const eventId = '983d9797-3a7d-4746-8d82-38cb97a9968c';
  console.log(`=== ANALIZANDO LOS 209 CONFIRMADOS DEL EVENTO ${eventId} ===`);

  const { data: attendees } = await supabase
    .from('attendees')
    .select('id, first_name, last_name, email, status, category_id, is_public_registration, event_categories(id, name)')
    .eq('event_id', eventId)
    .is('deleted_at', null);

  const confirmedAttendees = attendees.filter(a => a.status === 'confirmed' || a.status === 'checked_in' || a.status === 'attended' || a.is_public_registration === true);
  console.log(`Total confirmados/preregistrados en la tarjeta: ${confirmedAttendees.length}`);

  const byCat = {};
  const noCatList = [];

  confirmedAttendees.forEach(a => {
    const catName = a.event_categories?.name || 'Sin Categoría / null';
    if (!byCat[catName]) byCat[catName] = [];
    byCat[catName].push(a);

    if (!a.event_categories || !a.event_categories.name || a.event_categories.name.toLowerCase().includes('sin categor')) {
      noCatList.push(a);
    }
  });

  console.log('\nDesglose de confirmados por categoría:');
  let sum = 0;
  Object.entries(byCat).forEach(([cat, list]) => {
    console.log(`- "${cat}": ${list.length}`);
    sum += list.length;
  });
  console.log(`Sumatoria total: ${sum}`);

  console.log('\nInvitados en "Sin Categoría / null" (los 4 que faltan):');
  noCatList.forEach((a, idx) => {
    console.log(`[${idx+1}] ID: ${a.id} | ${a.first_name} ${a.last_name} (${a.email}) | category_id: ${a.category_id} | status: ${a.status} | is_public: ${a.is_public_registration}`);
  });
}

diagnoseThe4();
