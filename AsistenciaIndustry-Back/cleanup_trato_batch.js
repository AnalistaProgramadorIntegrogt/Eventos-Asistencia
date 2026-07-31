/**
 * Limpieza de invitados con "Trato" en el nombre — versión BATCH.
 * Usa una sola petición para eliminar todos los duplicados de una vez.
 *
 * node cleanup_trato_batch.js          → simulación
 * node cleanup_trato_batch.js --execute → ejecución real
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
  return (name || '').replace(/^Trato\s+/i, '').replace(/\s+/g, ' ').trim();
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
  console.log(DRY_RUN ? '🔍 MODO SIMULACIÓN' : '⚠️ MODO EJECUCIÓN REAL');

  // 1. Obtener todos con "Trato" (pendientes, sin deleted_at)
  const withTrato = await supaFetch(
    `/invitations?select=id,guest_name,guest_email,category_id,code,created_at&event_id=eq.${EVENT_ID}&deleted_at=is.null&guest_name=ilike.Trato*&order=created_at.asc`
  );

  if (!Array.isArray(withTrato)) { console.error('Error:', withTrato); return; }

  // 2. Obtener todos sin "Trato"
  const all = await supaFetch(
    `/invitations?select=id,guest_name,guest_email,category_id,code,created_at&event_id=eq.${EVENT_ID}&deleted_at=is.null&guest_name=not.ilike.Trato*&order=created_at.asc`
  );

  if (!Array.isArray(all)) { console.error('Error:', all); return; }

  console.log(`Pendientes con "Trato": ${withTrato.length}`);
  console.log(`Existentes sin "Trato": ${all.length}`);

  // Mapa de nombres normalizados
  const cleanNameMap = new Map();
  all.forEach(inv => {
    const norm = normalizeForCompare(inv.guest_name);
    if (!cleanNameMap.has(norm)) cleanNameMap.set(norm, []);
    cleanNameMap.get(norm).push(inv);
  });

  const toDeleteInvIds = [];    // invitation IDs para soft-delete en batch
  const toRename = [];          // { id, newName } para PATCH individual
  const toUpdateOriginal = [];  // { id, category_id } originales a actualizar

  for (const inv of withTrato) {
    const cleanedName = cleanName(inv.guest_name);
    const norm = normalizeForCompare(cleanedName);
    const matches = cleanNameMap.get(norm) || [];

    if (matches.length > 0) {
      const original = matches[0];
      console.log(`🗑️  ELIMINAR: "${inv.guest_name}" → tiene original "${original.guest_name}"`);
      toDeleteInvIds.push(inv.id);
      if (inv.category_id && !original.category_id) {
        toUpdateOriginal.push({ id: original.id, category_id: inv.category_id });
      }
    } else {
      console.log(`✏️  RENOMBRAR: "${inv.guest_name}" → "${cleanedName}"`);
      toRename.push({ id: inv.id, newName: cleanedName });
    }
  }

  console.log(`\n══════════════════════════════════════════`);
  console.log(`Duplicados a ELIMINAR  : ${toDeleteInvIds.length}`);
  console.log(`Registros a RENOMBRAR  : ${toRename.length}`);
  console.log(`Originales a ACTUALIZAR: ${toUpdateOriginal.length}`);
  console.log(`══════════════════════════════════════════`);

  if (withTrato.length === 0) {
    console.log('\n✅ No quedan registros con "Trato". ¡Limpieza completada!');
    return;
  }

  if (DRY_RUN) {
    console.log('\n⚠️  SIMULACIÓN — Para aplicar: node cleanup_trato_batch.js --execute');
    return;
  }

  // === EJECUCIÓN REAL — todo en batch ===

  // A) Soft-delete en LOTE de todas las invitations con "Trato"
  if (toDeleteInvIds.length > 0) {
    console.log(`\n🗑️  Eliminando ${toDeleteInvIds.length} invitations en LOTE...`);
    const idList = toDeleteInvIds.map(id => `"${id}"`).join(',');
    const delResult = await supaFetch(
      `/invitations?id=in.(${idList})`,
      {
        method: 'PATCH',
        body: JSON.stringify({ deleted_at: new Date().toISOString() }),
        prefer: 'return=minimal'
      }
    );
    console.log(`  ✅ Invitations eliminadas`);

    // Soft-delete attendees vinculados en lote
    console.log(`  🗑️  Eliminando attendees vinculados en lote...`);
    const attDelResult = await supaFetch(
      `/attendees?invitation_id=in.(${idList})`,
      {
        method: 'PATCH',
        body: JSON.stringify({ deleted_at: new Date().toISOString() }),
        prefer: 'return=minimal'
      }
    );
    console.log(`  ✅ Attendees eliminados`);
  }

  // B) Renombrar los que no tienen duplicado (uno por uno, suelen ser pocos)
  if (toRename.length > 0) {
    console.log(`\n✏️  Renombrando ${toRename.length} registros...`);
    for (const { id, newName } of toRename) {
      await supaFetch(`/invitations?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ guest_name: newName }),
        prefer: 'return=minimal'
      });
      await supaFetch(`/attendees?invitation_id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          first_name: newName.split(' ')[0] || newName,
          last_name: newName.split(' ').slice(1).join(' ') || ''
        }),
        prefer: 'return=minimal'
      });
    }
    console.log(`  ✅ Renombrados`);
  }

  // C) Actualizar categorías en originales
  if (toUpdateOriginal.length > 0) {
    console.log(`\n🏷️  Actualizando ${toUpdateOriginal.length} categorías en originales...`);
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
  console.log(`   - ${toDeleteInvIds.length} duplicados "Trato" eliminados (batch)`);
  console.log(`   - ${toRename.length} registros renombrados`);
  console.log(`   - ${toUpdateOriginal.length} categorías transferidas`);
}

cleanup().catch(console.error);
