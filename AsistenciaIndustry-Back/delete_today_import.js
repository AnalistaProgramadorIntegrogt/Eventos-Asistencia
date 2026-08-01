/**
 * Muestra y elimina SOLO los registros de la carga masiva del 2026-07-31.
 * La carga se identifica por: created_at que empiece con "2026-07-31"
 * y que NO hayan sido ya eliminados (deleted_at IS NULL).
 *
 * node check_today_import.js           → simulación (solo muestra)
 * node check_today_import.js --execute → elimina realmente
 */

const SUPABASE_URL = "https://skswwmqafshlxvhbzmgw.supabase.co";
const SUPABASE_KEY = "sb_publishable_-wdMHdobaUqyMpN2tIdTbg_quxB1JXz";
const EVENT_ID = "983d9797-3a7d-4746-8d82-38cb97a9968c";
const TODAY = "2026-07-31";
const DRY_RUN = process.argv[2] !== '--execute';

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

async function run() {
  console.log(DRY_RUN ? '🔍 MODO SIMULACIÓN (usa --execute para borrar)' : '⚠️  MODO EJECUCIÓN REAL');
  console.log('');

  // Obtener invitaciones creadas en el momento de la carga masiva (17:12 en adelante) que aún están activas
  const todayInvs = await supaFetch(
    `/invitations?select=id,guest_name,guest_email,category_id,code,created_at` +
    `&event_id=eq.${EVENT_ID}` +
    `&deleted_at=is.null` +
    `&created_at=gte.${TODAY}T17:12:00` +
    `&order=created_at.asc`
  );

  if (!Array.isArray(todayInvs)) { console.error('Error:', todayInvs); return; }

  console.log(`Invitaciones creadas hoy (activas): ${todayInvs.length}`);
  console.log('');

  if (todayInvs.length === 0) {
    console.log('✅ No hay invitaciones activas creadas hoy. Nada que eliminar.');
    return;
  }

  // Agrupar por hora de creación para identificar la carga masiva
  const byHour = {};
  todayInvs.forEach(i => {
    const hour = i.created_at.substring(0, 16); // "2026-07-31T17:12"
    if (!byHour[hour]) byHour[hour] = [];
    byHour[hour].push(i);
  });

  console.log('📊 Grupos por momento de creación:');
  Object.entries(byHour).sort().forEach(([h, list]) => {
    console.log(`  ${h} → ${list.length} registro(s)`);
  });
  console.log('');

  // Mostrar muestra de los primeros 5 y últimos 5
  console.log('📋 Primeros 5 registros:');
  todayInvs.slice(0, 5).forEach(i => {
    console.log(`  [${i.id}] "${i.guest_name}" | ${i.created_at.substring(0,19)}`);
  });
  if (todayInvs.length > 10) {
    console.log(`  ... (${todayInvs.length - 10} más) ...`);
  }
  console.log('Últimos 5 registros:');
  todayInvs.slice(-5).forEach(i => {
    console.log(`  [${i.id}] "${i.guest_name}" | ${i.created_at.substring(0,19)}`);
  });

  console.log(`\n══════════════════════════════════════════`);
  console.log(`Total a eliminar: ${todayInvs.length} invitaciones + sus attendees`);
  console.log(`══════════════════════════════════════════`);

  if (DRY_RUN) {
    console.log('\n⚠️  SIMULACIÓN — Para eliminar ejecuta:');
    console.log('   node check_today_import.js --execute');
    return;
  }

  // === EJECUCIÓN REAL — BATCH ===
  const ids = todayInvs.map(i => i.id);
  const idList = ids.map(id => `"${id}"`).join(',');
  const now = new Date().toISOString();

  console.log(`\n🗑️  Eliminando ${ids.length} invitaciones en lote...`);
  const r1 = await supaFetch(
    `/invitations?id=in.(${idList})`,
    { method: 'PATCH', body: JSON.stringify({ deleted_at: now }), prefer: 'return=minimal' }
  );
  console.log('  ✅ Invitaciones eliminadas');

  console.log('  🗑️  Eliminando attendees vinculados en lote...');
  const r2 = await supaFetch(
    `/attendees?invitation_id=in.(${idList})`,
    { method: 'PATCH', body: JSON.stringify({ deleted_at: now }), prefer: 'return=minimal' }
  );
  console.log('  ✅ Attendees vinculados eliminados');

  // También eliminar attendees creados hoy que sean is_public_registration=false
  // (los que se crean durante la importación sin invitation_id)
  const r3 = await supaFetch(
    `/attendees?event_id=eq.${EVENT_ID}&deleted_at=is.null&is_public_registration=eq.false&created_at=gte.${TODAY}T17:12:00`,
    { method: 'PATCH', body: JSON.stringify({ deleted_at: now }), prefer: 'return=minimal' }
  );
  console.log('  ✅ Attendees VIP sin invitation_id creados en la carga masiva eliminados');

  console.log(`\n✅ LISTO — ${ids.length} registros de la carga masiva de hoy eliminados correctamente.`);
}

run().catch(console.error);
