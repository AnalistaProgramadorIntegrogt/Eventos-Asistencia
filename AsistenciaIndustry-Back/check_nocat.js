const SUPABASE_URL = "https://skswwmqafshlxvhbzmgw.supabase.co";
const SUPABASE_KEY = "sb_publishable_-wdMHdobaUqyMpN2tIdTbg_quxB1JXz";
const EVENT_ID = "983d9797-3a7d-4746-8d82-38cb97a9968c";

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
      'Prefer': 'return=representation',
      ...(options.headers || {})
    }
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

async function analyze() {
  // Total attendees SIN filtrar deleted_at (lo que hace el dashboard actualmente)
  const allAtts = await supaFetch(
    `/attendees?select=id,category_id,status,deleted_at,is_public_registration&event_id=eq.${EVENT_ID}`
  );
  console.log(`Total attendees (SIN filtrar deleted_at): ${allAtts.length}`);
  
  const deletedAtts = allAtts.filter(a => a.deleted_at !== null);
  const activeAtts = allAtts.filter(a => a.deleted_at === null);
  console.log(`  - Con deleted_at (eliminados): ${deletedAtts.length}`);
  console.log(`  - Sin deleted_at (activos)   : ${activeAtts.length}`);

  // Contar sin categoría entre TODOS (como lo hace actualmente el dashboard)
  const noCatAll = allAtts.filter(a => !a.category_id);
  console.log(`\nSin categoría (TODOS, incluyendo eliminados): ${noCatAll.length}`);
  const noCatDeleted = noCatAll.filter(a => a.deleted_at !== null);
  const noCatActive = noCatAll.filter(a => a.deleted_at === null);
  console.log(`  - Eliminados sin categoría: ${noCatDeleted.length}`);
  console.log(`  - Activos sin categoría   : ${noCatActive.length}`);

  // Contar sin categoría solo entre ACTIVOS (lo correcto)
  console.log(`\n✅ Sin categoría CORRECTO (solo activos): ${noCatActive.length}`);

  // También verificar invitations sin categoría
  const invs = await supaFetch(
    `/invitations?select=id,category_id,deleted_at&event_id=eq.${EVENT_ID}&deleted_at=is.null`
  );
  const invNoCat = invs.filter(i => !i.category_id);
  console.log(`\nInvitaciones activas sin categoría: ${invNoCat.length}`);

  // Desglose por status de los attendees activos sin categoría
  console.log('\nDesglose attendees ACTIVOS sin categoría:');
  const statusCount = {};
  noCatActive.forEach(a => {
    const s = a.status || 'null';
    statusCount[s] = (statusCount[s] || 0) + 1;
  });
  Object.entries(statusCount).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
}

analyze().catch(console.error);
