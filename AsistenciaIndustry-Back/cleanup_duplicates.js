/**
 * Script para limpiar duplicados creados por re-carga accidental del Excel.
 * Elimina SOLO las invitaciones duplicadas creadas el 2026-07-31 cuando ya
 * existía una versión anterior del mismo invitado con un código diferente.
 *
 * SEGURO: Solo borra registros con deleted_at IS NULL que fueron creados
 * el día de hoy (2026-07-31) y que tienen un duplicado anterior más antiguo.
 */

const SUPABASE_URL = "https://skswwmqafshlxvhbzmgw.supabase.co";
const SUPABASE_KEY = "sb_publishable_-wdMHdobaUqyMpN2tIdTbg_quxB1JXz";
const EVENT_ID = "983d9797-3a7d-4746-8d82-38cb97a9968c"; // Lanzamiento Innova Park
const DRY_RUN = process.argv[2] !== '--execute'; // Sin --execute solo muestra qué se borraría

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

async function cleanup() {
  console.log(DRY_RUN ? '🔍 MODO SIMULACIÓN (usa --execute para borrar realmente)' : '⚠️ MODO EJECUCIÓN REAL');
  console.log('');

  // Obtener TODAS las invitaciones activas del evento
  const invs = await supaFetch(
    `/invitations?select=id,guest_name,guest_email,category_id,code,created_at&event_id=eq.${EVENT_ID}&deleted_at=is.null&order=created_at.asc`
  );

  if (!Array.isArray(invs)) {
    console.error('Error obteniendo invitaciones:', invs);
    return;
  }

  console.log(`Total invitaciones activas: ${invs.length}`);

  // Agrupar por nombre normalizado
  const groups = new Map();
  for (const inv of invs) {
    const normName = (inv.guest_name || '').trim().toLowerCase().replace(/\s+/g, ' ');
    if (!normName) continue;
    if (!groups.has(normName)) groups.set(normName, []);
    groups.get(normName).push(inv);
  }

  const duplicateGroups = Array.from(groups.entries()).filter(([, list]) => list.length > 1);
  console.log(`Grupos de nombres duplicados: ${duplicateGroups.length}`);
  console.log('');

  const toDelete = [];

  for (const [name, list] of duplicateGroups) {
    // Ordenar por fecha de creación (más antiguo primero)
    list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    console.log(`\n📋 Grupo: "${name}" (${list.length} registros)`);

    // Estrategia: mantener el registro más antiguo por grupo de (nombre + email)
    // Si tienen emails distintos, son personas distintas → mantener todos
    // Si tienen el mismo email o email vacío, mantener el más antiguo
    
    const emailGroups = new Map();
    for (const inv of list) {
      const emailKey = (inv.guest_email || '').trim().toLowerCase() || '__no_email__';
      if (!emailGroups.has(emailKey)) emailGroups.set(emailKey, []);
      emailGroups.get(emailKey).push(inv);
    }

    for (const [email, emailList] of emailGroups) {
      if (emailList.length <= 1) {
        console.log(`  ✅ KEEP: "${emailList[0].guest_name}" | email:"${email}" | ${emailList[0].created_at.substring(0,10)} | code:${emailList[0].code}`);
        continue;
      }

      // Hay duplicados con el mismo email (o sin email) → mantener el más antiguo
      const keepInv = emailList[0]; // ya ordenado por fecha asc
      console.log(`  ✅ KEEP: ID=${keepInv.id} | email:"${email}" | ${keepInv.created_at.substring(0, 19)} | code:${keepInv.code} | cat:${keepInv.category_id || 'null'}`);

      for (let i = 1; i < emailList.length; i++) {
        const dupInv = emailList[i];
        const wasCreatedToday = dupInv.created_at.startsWith('2026-07-31');
        
        if (wasCreatedToday) {
          console.log(`  🗑️  DELETE: ID=${dupInv.id} | email:"${email}" | ${dupInv.created_at.substring(0, 19)} | code:${dupInv.code} | cat:${dupInv.category_id || 'null'}`);
          toDelete.push(dupInv.id);
        } else {
          console.log(`  ⚠️  SKIP (not today): ID=${dupInv.id} | ${dupInv.created_at.substring(0, 19)} | code:${dupInv.code}`);
        }
      }
    }
  }

  console.log(`\n\n══════════════════════════════════════════`);
  console.log(`Total a eliminar: ${toDelete.length} invitaciones duplicadas`);
  console.log(`IDs: ${JSON.stringify(toDelete)}`);
  console.log('══════════════════════════════════════════');

  if (toDelete.length === 0) {
    console.log('\n✅ No hay duplicados elegibles para eliminar.');
    return;
  }

  if (DRY_RUN) {
    console.log('\n⚠️  MODO SIMULACIÓN — Ejecuta con --execute para aplicar los cambios:');
    console.log('   node cleanup_duplicates.js --execute');
    return;
  }

  // Eliminar (soft delete: poner deleted_at = now)
  console.log('\n🗑️  Aplicando soft-delete a los duplicados...');
  
  for (const id of toDelete) {
    const result = await supaFetch(`/invitations?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ deleted_at: new Date().toISOString() }),
      prefer: 'return=minimal'
    });
    
    if (typeof result === 'object' && result?.code) {
      console.error(`  ❌ Error eliminando ${id}:`, result);
    } else {
      console.log(`  ✅ Eliminado: ${id}`);
    }

    // También eliminar attendees vinculados (soft delete)
    await supaFetch(`/attendees?invitation_id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ deleted_at: new Date().toISOString() }),
      prefer: 'return=minimal'
    });
  }

  console.log(`\n✅ Limpieza completada. ${toDelete.length} duplicados eliminados correctamente.`);
  console.log('   Los registros originales (más antiguos) fueron preservados.');
}

cleanup().catch(console.error);
