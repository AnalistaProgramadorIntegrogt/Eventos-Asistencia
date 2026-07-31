/**
 * Script para encontrar todos los invitados que tienen "trato" en el nombre.
 */

const SUPABASE_URL = "https://skswwmqafshlxvhbzmgw.supabase.co";
const SUPABASE_KEY = "sb_publishable_-wdMHdobaUqyMpN2tIdTbg_quxB1JXz";
const EVENT_ID = "983d9797-3a7d-4746-8d82-38cb97a9968c"; // Lanzamiento Innova Park

async function supaFetch(endpoint, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Accept-Profile': 'events',
      'Content-Profile': 'events',
      'Content-Type': 'application/json',
      'Prefer': options.prefer || 'return=representation',
      ...(options.headers || {})
    }
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

async function findTrato() {
  console.log('🔍 Buscando invitados con "trato" en el nombre...\n');

  // Buscar en invitations (ilike = insensible a mayúsculas/acentos)
  const invs = await supaFetch(
    `/invitations?select=id,guest_name,guest_email,category_id,code,created_at&event_id=eq.${EVENT_ID}&deleted_at=is.null&guest_name=ilike.*trato*&order=guest_name.asc`
  );

  if (!Array.isArray(invs)) {
    console.error('Error:', invs);
    return;
  }

  console.log(`📋 Invitaciones con "trato" en nombre: ${invs.length}\n`);
  invs.forEach(i => {
    console.log(`  ID: ${i.id}`);
    console.log(`  Nombre: "${i.guest_name}"`);
    console.log(`  Email: "${i.guest_email || ''}"`);
    console.log(`  Code: ${i.code}`);
    console.log(`  CatID: ${i.category_id || 'null'}`);
    console.log(`  Creado: ${i.created_at?.substring(0, 19)}`);
    console.log('');
  });

  // También buscar en attendees
  const atts = await supaFetch(
    `/attendees?select=id,first_name,last_name,email,company,category_id,invitation_id,created_at&event_id=eq.${EVENT_ID}&deleted_at=is.null&or=(first_name.ilike.*trato*,last_name.ilike.*trato*)&order=first_name.asc`
  );

  console.log(`\n📋 Attendees con "trato" en nombre: ${Array.isArray(atts) ? atts.length : 'error'}`);
  if (Array.isArray(atts)) {
    atts.forEach(a => {
      console.log(`  ID: ${a.id} | "${a.first_name} ${a.last_name}" | inv:${a.invitation_id} | ${a.created_at?.substring(0, 19)}`);
    });
  }

  // Mostrar también el nombre "limpio" de cada uno (quitando "trato")
  if (invs.length > 0) {
    console.log('\n\n🔧 Nombres "limpios" (sin la palabra "trato"):');
    invs.forEach(i => {
      const clean = i.guest_name
        .replace(/\btrato\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
      console.log(`  "${i.guest_name}" → "${clean}"`);
    });
  }
}

findTrato().catch(console.error);
