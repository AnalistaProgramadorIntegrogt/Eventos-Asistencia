import { supabase } from '../config/supabase.js';

async function repairCorruptedData() {
  console.log('=== INICIANDO REPARACIÓN DE DATOS EN SUPABASE DB ===');

  // 1. Obtener todos los registros de attendees
  const { data: attendees, error: attError } = await supabase
    .from('attendees')
    .select('*');

  if (attError) {
    console.error('Error al consultar la tabla attendees:', attError);
    return;
  }

  console.log(`Analizando ${attendees.length} asistentes en la base de datos...`);

  let repairedCount = 0;

  for (const att of attendees) {
    let needsUpdate = false;
    const updates = {};
    const addData = { ...(att.additional_data || {}) };

    const rawCompany = (att.company || '').trim();
    const rawPhone = (att.phone || '').trim();

    // Comprobar si company contiene un número de teléfono (ej. 38124877, 30162355, 40405002, 56332258, 30643811)
    const isCompanyPhone = /^\+?[\d\s\-\(\)\.]{7,15}$/.test(rawCompany) && rawCompany.length >= 7 && rawCompany.length <= 15;

    if (isCompanyPhone) {
      console.log(`[ATTENDEE ID: ${att.id}] Mapeo incorrecto detectado: company='${rawCompany}' es un teléfono.`);

      // Mover el teléfono de company a phone
      const phoneValue = rawCompany;
      updates.phone = phoneValue;
      addData.phone = phoneValue;
      addData.telefono = phoneValue;
      addData.celular = phoneValue;

      // Buscar si en additional_data existe el nombre real de la empresa
      let realCompany = '';
      for (const [k, v] of Object.entries(addData)) {
        if (!v || typeof v !== 'string') continue;
        const normK = k.toLowerCase();
        const valStr = v.trim();
        if (!/^\+?[\d\s\-\(\)\.]{7,15}$/.test(valStr) && (normK.includes('empresa') || normK.includes('company') || normK.includes('organiza'))) {
          realCompany = valStr;
          break;
        }
      }

      updates.company = realCompany;
      if (realCompany) {
        addData.company = realCompany;
        addData.empresa = realCompany;
      }
      needsUpdate = true;
    }

    // Revisar si additional_data contiene algún campo teléfono o empresa no sincronizado
    for (const [k, v] of Object.entries(addData)) {
      if (!v || typeof v !== 'string') continue;
      const valStr = v.trim();
      const normK = k.toLowerCase();

      // Si es un teléfono y att.phone está vacío
      if (!updates.phone && (!rawPhone || rawPhone === '') && /^\+?[\d\s\-\(\)\.]{7,15}$/.test(valStr) && (normK.includes('telef') || normK.includes('phone') || normK.includes('celular') || normK.includes('movil'))) {
        console.log(`[ATTENDEE ID: ${att.id}] Encontrado teléfono en additional_data.${k}='${valStr}'`);
        updates.phone = valStr;
        addData.phone = valStr;
        addData.telefono = valStr;
        needsUpdate = true;
      }

      // Si es una empresa real y att.company está vacío o era numérico
      if ((!updates.company || updates.company === '') && (!rawCompany || isCompanyPhone) && !/^\+?[\d\s\-\(\)\.]{7,15}$/.test(valStr) && (normK.includes('empresa') || normK.includes('company') || normK.includes('organiza'))) {
        console.log(`[ATTENDEE ID: ${att.id}] Encontrada empresa en additional_data.${k}='${valStr}'`);
        updates.company = valStr;
        addData.company = valStr;
        addData.empresa = valStr;
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      updates.additional_data = addData;
      console.log(`Actualizando asistente ${att.first_name} ${att.last_name} (${att.email}):`, updates);

      try {
        const { error: updErr } = await supabase
          .from('attendees')
          .update(updates)
          .eq('id', att.id);

        if (updErr) {
          delete updates.phone;
          await supabase.from('attendees').update(updates).eq('id', att.id);
        }
        repairedCount++;
      } catch (e) {
        delete updates.phone;
        await supabase.from('attendees').update(updates).eq('id', att.id);
        repairedCount++;
      }
    }
  }

  // 2. Revisar también tabla invitations si aplica
  const { data: invitations } = await supabase.from('invitations').select('*');
  if (invitations) {
    for (const inv of invitations) {
      const addData = { ...(inv.additional_data || {}) };
      let invNeedsUpdate = false;
      const invUpdates = {};

      const rawComp = (inv.company || inv.guest_company || '').trim();
      const isCompPhone = /^\+?[\d\s\-\(\)\.]{7,15}$/.test(rawComp) && rawComp.length >= 7 && rawComp.length <= 15;

      if (isCompPhone) {
        console.log(`[INVITATION ID: ${inv.id}] Mapeo incorrecto en invitaciones: guest_company='${rawComp}' es teléfono.`);
        addData.phone = rawComp;
        addData.telefono = rawComp;
        invUpdates.guest_company = '';
        invNeedsUpdate = true;
      }

      for (const [k, v] of Object.entries(addData)) {
        if (!v || typeof v !== 'string') continue;
        const valStr = v.trim();
        const normK = k.toLowerCase();

        if (/^\+?[\d\s\-\(\)\.]{7,15}$/.test(valStr) && (normK.includes('telef') || normK.includes('phone') || normK.includes('celular') || normK.includes('movil'))) {
          if (!addData.phone) {
            addData.phone = valStr;
            addData.telefono = valStr;
            invNeedsUpdate = true;
          }
        }
      }

      if (invNeedsUpdate) {
        invUpdates.additional_data = addData;
        await supabase.from('invitations').update(invUpdates).eq('id', inv.id);
      }
    }
  }

  console.log(`=== REPARACIÓN COMPLETADA Exitosamente! Se corrigieron ${repairedCount} registros ===`);
}

repairCorruptedData();
