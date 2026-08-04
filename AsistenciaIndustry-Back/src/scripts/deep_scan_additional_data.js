import { supabase } from '../config/supabase.js';

async function deepScan() {
  const eventId = '983d9797-3a7d-4746-8d82-38cb97a9968c';
  console.log(`=== ESCANEO PROFUNDO DE ADDITIONAL_DATA PARA EVENTO ${eventId} ===`);

  // 1. Obtener todos los attendees
  const { data: attendees } = await supabase
    .from('attendees')
    .select('*')
    .eq('event_id', eventId);

  const keysMap = new Map();
  const allValuesForKeys = {};

  if (attendees) {
    attendees.forEach(a => {
      if (a.additional_data && typeof a.additional_data === 'object') {
        Object.entries(a.additional_data).forEach(([k, v]) => {
          if (!keysMap.has(k)) keysMap.set(k, 0);
          keysMap.set(k, keysMap.get(k) + 1);

          if (!allValuesForKeys[k]) allValuesForKeys[k] = new Set();
          if (v !== undefined && v !== null && String(v).trim() !== '') {
            allValuesForKeys[k].add(String(v).trim());
          }
        });
      }
    });
  }

  console.log(`Total attendees en DB: ${attendees ? attendees.length : 0}`);
  console.log('Claves encontradas en additional_data de attendees:');
  for (const [key, count] of keysMap.entries()) {
    const vals = Array.from(allValuesForKeys[key] || []).slice(0, 10);
    console.log(`- Clave "${key}": usada ${count} veces. Muestra de valores:`, vals);
  }

  // 2. Obtener todas las invitaciones
  const { data: invitations } = await supabase
    .from('invitations')
    .select('*')
    .eq('event_id', eventId);

  const invKeysMap = new Map();
  const invValuesForKeys = {};

  if (invitations) {
    invitations.forEach(inv => {
      if (inv.additional_data && typeof inv.additional_data === 'object') {
        Object.entries(inv.additional_data).forEach(([k, v]) => {
          if (!invKeysMap.has(k)) invKeysMap.set(k, 0);
          invKeysMap.set(k, invKeysMap.get(k) + 1);

          if (!invValuesForKeys[k]) invValuesForKeys[k] = new Set();
          if (v !== undefined && v !== null && String(v).trim() !== '') {
            invValuesForKeys[k].add(String(v).trim());
          }
        });
      }
    });
  }

  console.log(`Total invitations en DB: ${invitations ? invitations.length : 0}`);
  console.log('Claves encontradas en additional_data de invitations:');
  for (const [key, count] of invKeysMap.entries()) {
    const vals = Array.from(invValuesForKeys[key] || []).slice(0, 10);
    console.log(`- Clave "${key}": usada ${count} veces. Muestra de valores:`, vals);
  }
}

deepScan();
