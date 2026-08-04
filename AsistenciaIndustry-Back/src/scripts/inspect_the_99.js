import { supabase } from '../config/supabase.js';

async function inspect99() {
  const eventId = '983d9797-3a7d-4746-8d82-38cb97a9968c';
  console.log(`=== INSPECCIONANDO LOS 99 REGISTROS CON CUSTOM_1785192746749 ===`);

  const { data: attendees } = await supabase
    .from('attendees')
    .select('*')
    .eq('event_id', eventId);

  const matching = attendees.filter(a => a.additional_data && a.additional_data.custom_1785192746749);
  console.log(`Encontrados ${matching.length} asistentes con custom_1785192746749 en additional_data:`);

  matching.forEach((a, idx) => {
    console.log(`[${idx + 1}] ID: ${a.id} | ${a.first_name} ${a.last_name} (${a.email})`);
    console.log(`    Status: ${a.status} | is_public: ${a.is_public_registration} | is_imported: ${a.is_imported}`);
    console.log(`    Categoria (custom_1785192746749): "${a.additional_data.custom_1785192746749}"`);
    console.log(`    Company: "${a.company}" | Phone: "${a.phone}"`);
  });
}

inspect99();
