/**
 * Limpieza de invitados con "Trato" en el nombre.
 *
 * Estrategia:
 *  - Si ya existe un invitado con el mismo nombre SIN "trato" → eliminar el duplicado con "trato"
 *    y transferir la categoría/teléfono si el original no los tenía.
 *  - Si NO existe versión sin "trato" → actualizar el nombre quitando "Trato" al inicio.
 *
 * Modo simulación (default) → solo muestra qué haría.
 * Modo ejecución → node cleanup_trato.js --execute
 */

const SUPABASE_URL = "https://skswwmqafshlxvhbzmgw.supabase.co";
const SUPABASE_KEY = "sb_publishable_-wdMHdobaUqyMpN2tIdTbg_quxB1JXz";
const EVENT_ID = "983d9797-3a7d-4746-8d82-38cb97a9968c";
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

function cleanName(name) {
  return (name || '')
    .replace(/^Trato\s+/i, '')   // quitar "Trato " al inicio
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeForCompare(name) {
  return (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function cleanup() {
  console.log(DRY_RUN ? '🔍 MODO SIMULACIÓN (usa --execute para aplicar cambios)' : '⚠️ MODO EJECUCIÓN REAL');
  console.log('');

  // 1. Obtener TODOS con "trato" en el nombre (los duplicados del Excel sucio)
  const withTrato = await supaFetch(
    `/invitations?select=id,guest_name,guest_email,category_id,code,created_at&event_id=eq.${EVENT_ID}&deleted_at=is.null&guest_name=ilike.Trato*&order=created_at.asc`
  );

  if (!Array.isArray(withTrato)) {
    console.error('Error obteniendo invitados con trato:', withTrato);
    return;
  }

  // 2. Obtener TODAS las invitaciones sin "trato" para buscar coincidencias
  const all = await supaFetch(
    `/invitations?select=id,guest_name,guest_email,category_id,code,created_at&event_id=eq.${EVENT_ID}&deleted_at=is.null&guest_name=not.ilike.Trato*&order=created_at.asc`
  );

  if (!Array.isArray(all)) {
    console.error('Error obteniendo todas las invitaciones:', all);
    return;
  }

  console.log(`Total con "Trato": ${withTrato.length}`);
  console.log(`Total sin "Trato": ${all.length}`);
  console.log('');

  // Construir mapa de nombres normalizados → invitación original (sin trato)
  const cleanNameMap = new Map();
  all.forEach(inv => {
    const normName = normalizeForCompare(inv.guest_name);
    if (!cleanNameMap.has(normName)) {
      cleanNameMap.set(normName, []);
    }
    cleanNameMap.get(normName).push(inv);
  });

  const toDelete = [];        // IDs con "trato" que tienen duplicado → eliminar
  const toRename = [];        // IDs con "trato" que NO tienen duplicado → renombrar
  const toUpdateOriginal = []; // Originales que necesitan actualizar categoría/datos del trato

  for (const inv of withTrato) {
    const cleanedName = cleanName(inv.guest_name);
    const normClean = normalizeForCompare(cleanedName);

    // Buscar si existe un original con ese nombre limpio
    const matches = cleanNameMap.get(normClean) || [];

    if (matches.length > 0) {
      // Existe original → marcar el de "trato" para eliminar
      const original = matches[0]; // el más antiguo
      console.log(`🗑️  ELIMINAR DUPLICADO:`);
      console.log(`   Con trato : [${inv.id}] "${inv.guest_name}" cat:${inv.category_id || 'null'} | ${inv.created_at?.substring(0,19)}`);
      console.log(`   Original  : [${original.id}] "${original.guest_name}" cat:${original.category_id || 'null'} | ${original.created_at?.substring(0,19)}`);

      // Si el de "trato" tenía categoría y el original no, transferir
      if (inv.category_id && !original.category_id) {
        console.log(`   ✏️  Transferir categoría ${inv.category_id} al original`);
        toUpdateOriginal.push({ id: original.id, category_id: inv.category_id });
      }
      toDelete.push(inv.id);
      console.log('');
    } else {
      // No existe original → solo renombrar (quitar "Trato")
      console.log(`✏️  RENOMBRAR (sin duplicado):`);
      console.log(`   "${inv.guest_name}" → "${cleanedName}"`);
      console.log(`   ID: ${inv.id} | ${inv.created_at?.substring(0,19)}`);
      toRename.push({ id: inv.id, newName: cleanedName, inv });
      console.log('');
    }
  }

  console.log('\n══════════════════════════════════════════');
  console.log(`Duplicados a ELIMINAR  : ${toDelete.length}`);
  console.log(`Registros a RENOMBRAR  : ${toRename.length}`);
  console.log(`Originales a ACTUALIZAR: ${toUpdateOriginal.length}`);
  console.log('══════════════════════════════════════════\n');

  if (DRY_RUN) {
    console.log('⚠️  MODO SIMULACIÓN — Para aplicar cambios ejecuta:');
    console.log('   node cleanup_trato.js --execute');
    return;
  }

  // === EJECUCIÓN REAL ===

  // A) Eliminar duplicados con "trato" (soft delete invitación + attendee)
  console.log(`\n🗑️  Eliminando ${toDelete.length} duplicados con "Trato"...`);
  let deletedOk = 0;
  for (const id of toDelete) {
    const r = await supaFetch(`/invitations?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ deleted_at: new Date().toISOString() }),
      prefer: 'return=minimal'
    });
    // Soft delete attendees vinculados
    await supaFetch(`/attendees?invitation_id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ deleted_at: new Date().toISOString() }),
      prefer: 'return=minimal'
    });
    deletedOk++;
    process.stdout.write(`  Eliminado ${deletedOk}/${toDelete.length}\r`);
  }
  console.log(`\n  ✅ ${deletedOk} duplicados eliminados`);

  // B) Renombrar los que no tenían duplicado (quitar "Trato " del inicio)
  console.log(`\n✏️  Renombrando ${toRename.length} registros...`);
  let renamedOk = 0;
  for (const { id, newName } of toRename) {
    await supaFetch(`/invitations?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ guest_name: newName }),
      prefer: 'return=minimal'
    });
    // También actualizar en attendees
    await supaFetch(`/attendees?invitation_id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        first_name: newName.split(' ')[0] || newName,
        last_name: newName.split(' ').slice(1).join(' ') || ''
      }),
      prefer: 'return=minimal'
    });
    renamedOk++;
    process.stdout.write(`  Renombrado ${renamedOk}/${toRename.length}\r`);
  }
  console.log(`\n  ✅ ${renamedOk} registros renombrados`);

  // C) Actualizar categoría en los originales que la necesitaban
  if (toUpdateOriginal.length > 0) {
    console.log(`\n🏷️  Actualizando categoría en ${toUpdateOriginal.length} registros originales...`);
    for (const { id, category_id } of toUpdateOriginal) {
      await supaFetch(`/invitations?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ category_id }),
        prefer: 'return=minimal'
      });
      await supaFetch(`/attendees?invitation_id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ category_id }),
        prefer: 'return=minimal'
      });
    }
    console.log(`  ✅ Categorías actualizadas`);
  }

  console.log('\n\n✅ LIMPIEZA COMPLETADA:');
  console.log(`   - ${deletedOk} duplicados eliminados`);
  console.log(`   - ${renamedOk} registros renombrados (sin "Trato")`);
  console.log(`   - ${toUpdateOriginal.length} categorías transferidas a originales`);
}

cleanup().catch(console.error);
