import { Router } from 'express';
import { supabase } from '../config/supabase.js';
import { generateUniqueAttendeeCode, generateQRDataURL } from '../services/qrService.js';
import { sendRSVPEmail, sendQRTicketEmail } from '../services/emailService.js';

const router = Router();

/**
 * Helper para verificar si un evento ya ha expirado según su fecha límite (end_date o final del día de start_date)
 */
function isEventExpired(event) {
  if (!event) return false;
  const now = new Date();

  if (event.end_date) {
    return now > new Date(event.end_date);
  }

  if (event.start_date) {
    const startDate = new Date(event.start_date);
    // Si solo hay start_date, expira al finalizar el día de start_date (23:59:59)
    const endOfDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 23, 59, 59, 999);
    return now > endOfDay;
  }

  return false;
}

// GET /api/public/events/:id - Obtener configuración pública del evento
router.get('/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data: event, error } = await supabase
      .from('events')
      .select('id, name, description, start_date, end_date, location, banner_url, logo_url, status, invitation_code_required, form_config, confirmation_message, event_categories(id, name)')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !event) {
      return res.status(404).json({ success: false, error: 'Evento no encontrado o inactivo' });
    }

    const expired = isEventExpired(event);

    res.json({
      success: true,
      data: {
        ...event,
        is_expired: expired,
        registration_open: event.status === 'active' && !expired
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/public/events/:id/invitations/:code - Validar código de invitación
router.get('/events/:id/invitations/:code', async (req, res) => {
  try {
    const { id, code } = req.params;
    const { data: invitation, error } = await supabase
      .from('invitations')
      .select('*, event_categories(name)')
      .eq('event_id', id)
      .eq('code', code)
      .is('deleted_at', null)
      .single();

    if (error || !invitation) {
      return res.status(404).json({ success: false, valid: false, error: 'Código de invitación inválido' });
    }

    if (!invitation.is_active) {
      return res.status(400).json({ success: false, valid: false, error: 'Esta invitación ha sido desactivada' });
    }

    res.json({ success: true, valid: true, data: invitation });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/public/events/:id/register - Formulario de Preregistro (Envía Correo Inmediato con Código QR)
router.post('/events/:id/register', async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, email, company, job_title, category_id, invitation_code, additional_data = {} } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'El campo correo electrónico (email) es obligatorio.' });
    }

    // 1. Verificar estado del evento y su configuración de formulario
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (eventError || !event) {
      return res.status(404).json({ success: false, error: 'El evento no existe' });
    }

    if (event.status !== 'active') {
      return res.status(400).json({ success: false, error: 'Este evento no está recibiendo registros actualmente' });
    }

    // 1.5 Verificar si la fecha del evento ya expiró
    if (isEventExpired(event)) {
      return res.status(400).json({
        success: false,
        error: 'La fecha de este evento ya ha concluido. El período de inscripción ha finalizado.'
      });
    }

    // 1.5. Resolución inteligente de company, phone y job_title
    let resolvedCompany = company || req.body.empresa || additional_data.company || additional_data.empresa || additional_data.organizacion || additional_data.company_name || '';
    let resolvedPhone = req.body.phone || req.body.telefono || req.body.celular || additional_data.phone || additional_data.telefono || additional_data.celular || additional_data.movil || '';
    let resolvedJobTitle = job_title || req.body.cargo || req.body.puesto || additional_data.job_title || additional_data.cargo || additional_data.puesto || '';

    if (event && event.form_config) {
      const allFields = [
        ...(event.form_config.fields || []),
        ...(event.form_config.custom_fields || [])
      ];

      allFields.forEach(f => {
        const val = req.body[f.id] || additional_data[f.id];
        if (!val || typeof val !== 'string' || !val.trim()) return;

        const normId = String(f.id).toLowerCase();
        const normLabel = String(f.label || '').toLowerCase();

        if (!resolvedCompany && (normId.includes('company') || normId === 'empresa' || normLabel.includes('empresa') || normLabel.includes('company') || normLabel.includes('organiza'))) {
          resolvedCompany = val.trim();
        }
        if (!resolvedPhone && (normId.includes('phone') || normId.includes('telef') || normId.includes('celular') || normLabel.includes('telef') || normLabel.includes('phone') || normLabel.includes('celular') || normLabel.includes('movil'))) {
          resolvedPhone = val.trim();
        }
        if (!resolvedJobTitle && (normId.includes('job') || normId.includes('cargo') || normId.includes('puesto') || normLabel.includes('cargo') || normLabel.includes('puesto'))) {
          resolvedJobTitle = val.trim();
        }
      });
    }

    const mergedAdditionalData = {
      ...(additional_data || {}),
      company: resolvedCompany || (additional_data.company || ''),
      empresa: resolvedCompany || (additional_data.empresa || ''),
      phone: resolvedPhone || (additional_data.phone || ''),
      telefono: resolvedPhone || (additional_data.telefono || ''),
      job_title: resolvedJobTitle || (additional_data.job_title || ''),
      cargo: resolvedJobTitle || (additional_data.cargo || '')
    };

    // 2. Validar campos requeridos según form_config del evento
    const formConfig = event.form_config || {};
    const fields = formConfig.fields || [];

    for (const field of fields) {
      if (field.visible && field.required) {
        let val = req.body[field.id];
        if (val === undefined || val === null || String(val).trim() === '') {
          val = mergedAdditionalData[field.id];
        }
        if (val === undefined || val === null || String(val).trim() === '') {
          return res.status(400).json({
            success: false,
            error: `El campo '${field.label || field.id}' es obligatorio para registrarse a este evento.`
          });
        }
      }
    }

    // Validar campos personalizados requeridos si los hay
    const customFields = formConfig.custom_fields || [];
    for (const cf of customFields) {
      if (cf.required) {
        const val = mergedAdditionalData[cf.id];
        if (val === undefined || val === null || String(val).trim() === '') {
          return res.status(400).json({
            success: false,
            error: `El campo personalizado '${cf.label || cf.id}' es obligatorio.`
          });
        }
      }
    }

    // 3. Buscar invitación por código (si se envió) o por email en la tabla invitations
    let matchedInvitation = null;
    if (invitation_code) {
      const { data: inv } = await supabase
        .from('invitations')
        .select('*')
        .eq('event_id', id)
        .eq('code', invitation_code)
        .is('deleted_at', null)
        .limit(1)
        .maybeSingle();

      if (inv && inv.is_active) {
        matchedInvitation = inv;
      } else if (event.invitation_code_required) {
        return res.status(400).json({ success: false, error: 'El código de invitación no es válido o ha expirado.' });
      }
    } else if (event.invitation_code_required) {
      return res.status(400).json({ success: false, error: 'Este evento requiere un código de invitación obligatorio.' });
    } else if (email) {
      // Intentar vincular por email con una invitación precargada
      const { data: invByEmail } = await supabase
        .from('invitations')
        .select('*')
        .eq('event_id', id)
        .ilike('guest_email', email.trim())
        .is('deleted_at', null)
        .limit(1)
        .maybeSingle();

      if (invByEmail) matchedInvitation = invByEmail;
    }

    // 4. Generar código aleatorio único de asistente y QR Data URL
    const qrCode = generateUniqueAttendeeCode();
    const qrDataUrl = await generateQRDataURL(qrCode);

    // 4.5. Asignar categoría 'General' por defecto a registros públicos si no especifica
    let finalCategoryId = category_id || (matchedInvitation ? matchedInvitation.category_id : null);
    if (!finalCategoryId) {
      const { data: genCat } = await supabase
        .from('event_categories')
        .select('id')
        .eq('event_id', id)
        .ilike('name', '%General%')
        .limit(1)
        .single();
      if (genCat) finalCategoryId = genCat.id;
    }

    // 5. Buscar si ya existe un registro de asistente guardado
    let existingAttendee = null;

    if (matchedInvitation) {
      const { data: byInvitation } = await supabase
        .from('attendees')
        .select('*')
        .eq('event_id', id)
        .eq('invitation_id', matchedInvitation.id)
        .is('deleted_at', null)
        .limit(1)
        .maybeSingle();

      if (byInvitation) existingAttendee = byInvitation;
    }

    if (!existingAttendee && email) {
      const { data: byEmail } = await supabase
        .from('attendees')
        .select('*')
        .eq('event_id', id)
        .ilike('email', email.trim())
        .is('deleted_at', null)
        .limit(1)
        .maybeSingle();

      if (byEmail) existingAttendee = byEmail;
    }

    let attendee = null;

    const updatePayload = {
      first_name: first_name || (existingAttendee ? existingAttendee.first_name : ''),
      last_name: last_name || (existingAttendee ? existingAttendee.last_name : ''),
      email: email.trim(),
      company: resolvedCompany || (existingAttendee ? existingAttendee.company : ''),
      job_title: resolvedJobTitle || (existingAttendee ? existingAttendee.job_title : ''),
      category_id: finalCategoryId || (existingAttendee ? existingAttendee.category_id : null),
      additional_data: { ...(existingAttendee ? existingAttendee.additional_data || {} : {}), ...(mergedAdditionalData || {}) },
      qr_code: qrCode,
      status: 'confirmed'
    };
    if (resolvedPhone) updatePayload.phone = resolvedPhone;

    if (existingAttendee) {
      try {
        const { data: updated, error: updateError } = await supabase
          .from('attendees')
          .update(updatePayload)
          .eq('id', existingAttendee.id)
          .select()
          .single();

        if (updateError) {
          delete updatePayload.phone;
          const { data: retryUpdated } = await supabase.from('attendees').update(updatePayload).eq('id', existingAttendee.id).select().single();
          attendee = retryUpdated;
        } else {
          attendee = updated;
        }
      } catch (e) {
        delete updatePayload.phone;
        const { data: retryUpdated } = await supabase.from('attendees').update(updatePayload).eq('id', existingAttendee.id).select().single();
        attendee = retryUpdated;
      }
    } else {
      const insertPayload = {
        event_id: id,
        invitation_id: matchedInvitation ? matchedInvitation.id : null,
        category_id: finalCategoryId,
        first_name: first_name || '',
        last_name: last_name || '',
        email: email.trim(),
        company: resolvedCompany || '',
        job_title: resolvedJobTitle || '',
        additional_data: mergedAdditionalData || {},
        qr_code: qrCode,
        status: 'confirmed',
        is_public_registration: !matchedInvitation
      };
      if (resolvedPhone) insertPayload.phone = resolvedPhone;

      try {
        const { data: inserted, error: attendeeError } = await supabase
          .from('attendees')
          .insert([insertPayload])
          .select()
          .single();

        if (attendeeError) {
          delete insertPayload.phone;
          const { data: retryInserted, error: retryErr } = await supabase.from('attendees').insert([insertPayload]).select().single();
          if (retryErr) throw retryErr;
          attendee = retryInserted;
        } else {
          attendee = inserted;
        }
      } catch (err) {
        delete insertPayload.phone;
        const { data: retryInserted, error: retryErr } = await supabase.from('attendees').insert([insertPayload]).select().single();
        if (retryErr) throw retryErr;
        attendee = retryInserted;
      }
    }

    // 6. Enviar CORREO INMEDIATO con el Código QR utilizando la plantilla del frontend
    const fullAttendeeName = `${first_name || ''} ${last_name || ''}`.trim() || email;
    sendQRTicketEmail({
      to: email,
      attendeeName: fullAttendeeName,
      eventName: event.name,
      location: event.location,
      startDate: event.start_date,
      logoUrl: event.logo_url,
      bannerUrl: event.banner_url,
      qrCode: attendee.qr_code,
      qrDataUrl,
      emailConfig: event.email_config,
      formConfig: event.form_config
    }).catch(err => console.error('Error enviando correo con código QR:', err));

    // 7. Responder con datos de registro y QR
    res.status(201).json({
      success: true,
      message: 'Preregistro completado con éxito. Se ha enviado tu código QR de acceso a tu correo electrónico.',
      data: {
        id: attendee.id,
        first_name: attendee.first_name,
        last_name: attendee.last_name,
        email: attendee.email,
        qr_code: attendee.qr_code,
        qr_data_url: qrDataUrl,
        status: attendee.status
      }
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/public/attendees/:id/rsvp - Procesar respuesta RSVP al hacer clic en el correo
router.get('/attendees/:id/rsvp', async (req, res) => {
  try {
    const { id } = req.params;
    const action = (req.query.action || req.query.status || '').toLowerCase();

    // Buscar asistente
    const { data: attendee, error: attError } = await supabase
      .from('attendees')
      .select('*, events(*)')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (attError || !attendee) {
      return res.status(404).send(`
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2 style="color: #e11d48;">Registro no encontrado</h2>
          <p>El registro del asistente no fue encontrado o ha sido eliminado.</p>
        </div>
      `);
    }

    const event = attendee.events;
    const fullAttendeeName = `${attendee.first_name} ${attendee.last_name}`.trim() || attendee.email;

    if (action === 'confirm' || action === 'confirmed') {
      // 1. Actualizar estado a 'confirmed'
      await supabase
        .from('attendees')
        .update({ status: 'confirmed' })
        .eq('id', id);

      // 2. Generar QR Data URL y Enviar CORREO 2: Entrada con Código QR
      const qrDataUrl = await generateQRDataURL(attendee.qr_code);

      sendQRTicketEmail({
        to: attendee.email,
        attendeeName: fullAttendeeName,
        eventName: event ? event.name : 'Evento',
        location: event ? event.location : '',
        startDate: event ? event.start_date : null,
        logoUrl: event ? event.logo_url : null,
        bannerUrl: event ? event.banner_url : null,
        qrCode: attendee.qr_code,
        qrDataUrl,
        emailConfig: event ? event.email_config : null,
        formConfig: event ? event.form_config : null
      }).catch(err => console.error('Error enviando ticket QR post-RSVP:', err));

      if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.json({ success: true, status: 'confirmed', message: 'Asistencia confirmada exitosamente.' });
      }

      // Retornar vista HTML amigable en el navegador
      return res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Asistencia Confirmada</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 20px; }
            .card { background: white; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); padding: 40px; text-align: center; max-width: 480px; width: 100%; }
            .icon { font-size: 64px; color: #16a34a; margin-bottom: 16px; }
            h1 { color: #0f172a; font-size: 24px; margin-bottom: 12px; }
            p { color: #475569; font-size: 16px; line-height: 1.5; margin-bottom: 24px; }
            .badge { background-color: #dcfce7; color: #15803d; padding: 8px 16px; border-radius: 9999px; font-weight: bold; display: inline-block; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">✅</div>
            <h1>¡Asistencia Confirmada!</h1>
            <p>Hola <strong>${fullAttendeeName}</strong>, tu lugar en <strong>${event ? event.name : 'el evento'}</strong> ha sido reservado con éxito.</p>
            <div class="badge">Hemos enviado tu código QR a tu correo (${attendee.email})</div>
          </div>
        </body>
        </html>
      `);
    } else if (action === 'decline' || action === 'declined') {
      // Actualizar estado a 'declined'
      await supabase
        .from('attendees')
        .update({ status: 'declined' })
        .eq('id', id);

      if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.json({ success: true, status: 'declined', message: 'Has indicado que no asistirás.' });
      }

      return res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Respuesta Registrada</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 20px; }
            .card { background: white; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); padding: 40px; text-align: center; max-width: 480px; width: 100%; }
            .icon { font-size: 64px; color: #dc2626; margin-bottom: 16px; }
            h1 { color: #0f172a; font-size: 24px; margin-bottom: 12px; }
            p { color: #475569; font-size: 16px; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">❌</div>
            <h1>Respuesta Registrada</h1>
            <p>Hola <strong>${fullAttendeeName}</strong>, has indicado que <strong>No Asistirás</strong> a <strong>${event ? event.name : 'el evento'}</strong>. Gracias por responder.</p>
          </div>
        </body>
        </html>
      `);
    } else {
      return res.status(400).send(`Acción "${action}" inválida.`);
    }

  } catch (err) {
    res.status(500).send(`Error procesando respuesta: ${err.message}`);
  }
});

// POST /api/public/events/:id/checkin - Escaneo / Check-in público por código QR o alfanumérico
router.post('/events/:id/checkin', async (req, res) => {
  try {
    const { id } = req.params;
    const { qr_code, code, operator_name } = req.body;
    const searchCode = (qr_code || code || '').trim();

    if (!searchCode) {
      return res.status(400).json({ success: false, error: 'Debe proporcionar un código QR o de asistente para validar el ingreso.' });
    }

    // 1. Buscar evento
    const { data: event } = await supabase
      .from('events')
      .select('id, name, status, start_date, end_date')
      .eq('id', id)
      .single();

    if (!event) {
      return res.status(404).json({ success: false, error: 'Evento no encontrado' });
    }

    const rawCode = (qr_code || code || '').trim();
    const dashNormalized = rawCode.replace(/['"`]/g, '-');
    const unhyphenated = rawCode.replace(/['"`\-\s]/g, '');

    const candidates = Array.from(new Set([rawCode, dashNormalized, unhyphenated, rawCode.toUpperCase(), dashNormalized.toUpperCase()])).filter(Boolean);

    // 2. Buscar asistente por qr_code o id o email en el evento actual
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let attendee = null;

    for (const cand of candidates) {
      let query = supabase
        .from('attendees')
        .select('*, event_categories(name)')
        .eq('event_id', id)
        .is('deleted_at', null);

      if (uuidRegex.test(cand)) {
        query = query.or(`qr_code.eq.${cand},id.eq.${cand},email.eq.${cand}`);
      } else {
        query = query.or(`qr_code.eq.${cand},email.eq.${cand}`);
      }

      const { data } = await query.limit(1);
      if (data && data.length > 0) {
        attendee = data[0];
        break;
      }
    }

    // 2.2 Si no se encuentra en attendees, buscar en invitations del evento actual
    if (!attendee) {
      for (const cand of candidates) {
        const { data: invs } = await supabase
          .from('invitations')
          .select('*, event_categories(name)')
          .eq('event_id', id)
          .is('deleted_at', null)
          .or(`code.eq.${cand},invitation_code.eq.${cand},guest_email.eq.${cand}`)
          .limit(1);

        if (invs && invs.length > 0) {
          const inv = invs[0];
          
          // Verificar si ya se había creado un asistente con esta invitación
          const { data: existingAtt } = await supabase
            .from('attendees')
            .select('*, event_categories(name)')
            .eq('invitation_id', inv.id)
            .maybeSingle();

          if (existingAtt) {
            attendee = existingAtt;
          } else {
            // Crear el registro de asistente vinculado a esta invitación para evitar error 500 FK checkins
            const rawName = inv.guest_name || 'Invitado VIP';
            const nameParts = rawName.trim().split(' ');
            const newQrCode = inv.code || `VIP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

            const attendeePayload = {
              event_id: inv.event_id,
              invitation_id: inv.id,
              category_id: inv.category_id || null,
              first_name: nameParts[0] || 'Invitado',
              last_name: nameParts.slice(1).join(' ') || '',
              email: inv.guest_email || inv.email || '',
              company: inv.company || inv.guest_company || '',
              qr_code: newQrCode,
              status: 'pending',
              is_public_registration: false,
              additional_data: inv.additional_data || {}
            };

            const { data: createdAtt, error: createErr } = await supabase
              .from('attendees')
              .insert([attendeePayload])
              .select('*, event_categories(name)')
              .single();

            if (!createErr && createdAtt) {
              attendee = createdAtt;
            } else {
              throw new Error(createErr ? createErr.message : 'Error creando registro de asistencia público.');
            }
          }
          break;
        }
      }
    }

    // 2.4 Si no se encuentra en este evento, buscar en OTROS EVENTOS para advertir WRONG_EVENT
    if (!attendee) {
      for (const cand of candidates) {
        let otherQuery = supabase
          .from('attendees')
          .select('*, events(id, name), event_categories(name)')
          .is('deleted_at', null);

        if (uuidRegex.test(cand)) {
          otherQuery = otherQuery.or(`qr_code.eq.${cand},id.eq.${cand},email.eq.${cand}`);
        } else {
          otherQuery = otherQuery.or(`qr_code.eq.${cand},email.eq.${cand}`);
        }

        const { data: otherAtts } = await otherQuery.limit(1);
        if (otherAtts && otherAtts.length > 0) {
          const other = otherAtts[0];
          const otherEvName = other.events?.name || 'otro evento';
          const otherName = `${other.first_name || ''} ${other.last_name || ''}`.trim() || other.guest_name || 'Invitado';
          return res.status(400).json({
            success: false,
            status_code: 'WRONG_EVENT',
            message: `El código "${dashNormalized}" pertenece al asistente "${otherName}" en el evento "${otherEvName}", no en el evento actual.`,
            other_event_name: otherEvName
          });
        }

        const { data: otherInvs } = await supabase
          .from('invitations')
          .select('*, events(id, name), event_categories(name)')
          .is('deleted_at', null)
          .or(`code.eq.${cand},invitation_code.eq.${cand},guest_email.eq.${cand}`)
          .limit(1);

        if (otherInvs && otherInvs.length > 0) {
          const otherInv = otherInvs[0];
          const otherEvName = otherInv.events?.name || 'otro evento';
          const otherName = otherInv.guest_name || `${otherInv.first_name || ''} ${otherInv.last_name || ''}`.trim() || 'Invitado';
          return res.status(400).json({
            success: false,
            status_code: 'WRONG_EVENT',
            message: `El código "${dashNormalized}" pertenece al asistente "${otherName}" en el evento "${otherEvName}", no en el evento actual.`,
            other_event_name: otherEvName
          });
        }
      }

      return res.status(404).json({
        success: false,
        status_code: 'INVALID',
        message: `El código "${dashNormalized}" no corresponde a ningún asistente registrado en este evento.`
      });
    }

    // 2.5 Verificar que el evento ya haya iniciado y no haya finalizado
    const now = new Date();
    const eventName = event.name || 'el evento';



    // Eliminado: Bloquear checkin por fecha de finalización causa problemas operativos.
    /*
    if (event.end_date) {
      const endDate = new Date(event.end_date);
      if (now > endDate) {
        return res.status(400).json({
          success: false,
          status_code: 'EVENT_ENDED',
          message: `No se puede marcar asistencia. El evento "${eventName}" ya ha finalizado.`
        });
      }
    }
    */

    // 3. Verificar si ya ingresó (buscando en la tabla checkins o el estado del attendee)
    const { data: existingCheckin } = await supabase
      .from('checkins')
      .select('checked_in_at')
      .eq('event_id', id)
      .eq('attendee_id', attendee.id)
      .limit(1)
      .maybeSingle();

    const alreadyAttended = existingCheckin || attendee.status === 'checked_in' || attendee.status === 'attended';
    
    if (attendee.status === 'pending') {
      return res.status(403).json({
        success: false,
        status_code: 'PENDING_REGISTRATION',
        message: `¡ATENCIÓN! ${attendee.first_name} ${attendee.last_name} aún no ha completado su formulario de registro (Estado: Pendiente). Por favor, indique al invitado que se registre antes de ingresar.`
      });
    }

    if (alreadyAttended) {
      return res.status(200).json({
        success: false,
        status_code: 'ALREADY_USED',
        message: `¡ATENCIÓN! ${attendee.first_name} ${attendee.last_name} ya ha ingresado previamente.`,
        data: {
          id: attendee.id,
          first_name: attendee.first_name,
          last_name: attendee.last_name,
          full_name: `${attendee.first_name} ${attendee.last_name}`.trim(),
          email: attendee.email,
          company: attendee.company,
          job_title: attendee.job_title,
          category_name: attendee.event_categories ? attendee.event_categories.name : null,
          check_in_time: existingCheckin ? existingCheckin.checked_in_at : null
        }
      });
    }

    // 4. Registrar ingreso en la tabla checkins y actualizar estado a checked_in
    const checkInTimestamp = new Date().toISOString();
    
    // 4.1 Insertar en checkins
    const { error: checkinErr } = await supabase
      .from('checkins')
      .insert([
        {
          event_id: id,
          attendee_id: attendee.id,
          scanned_by_name: operator_name || 'Terminal Pública',
          checkin_type: 'qr',
          checked_in_at: checkInTimestamp
        }
      ]);

    if (checkinErr) {
      console.error('Error insertando checkin:', checkinErr);
      throw checkinErr;
    }

    // 4.2 Actualizar estado del asistente
    const { data: updatedAttendee, error: updateErr } = await supabase
      .from('attendees')
      .update({
        status: 'checked_in'
      })
      .eq('id', attendee.id)
      .select('*, event_categories(name)')
      .single();

    if (updateErr) {
      throw updateErr;
    }

    return res.status(200).json({
      success: true,
      status_code: 'SUCCESS',
      message: `¡INGRESO AUTORIZADO! Bienvenido/a ${attendee.first_name} ${attendee.last_name}`,
      data: {
        id: updatedAttendee.id,
        first_name: updatedAttendee.first_name,
        last_name: updatedAttendee.last_name,
        full_name: `${updatedAttendee.first_name} ${updatedAttendee.last_name}`.trim(),
        email: updatedAttendee.email,
        company: updatedAttendee.company,
        job_title: updatedAttendee.job_title,
        category_name: updatedAttendee.event_categories ? updatedAttendee.event_categories.name : null,
        check_in_time: checkInTimestamp
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
