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

    // 2. Validar campos requeridos según form_config del evento
    const formConfig = event.form_config || {};
    const fields = formConfig.fields || [];

    for (const field of fields) {
      if (field.visible && field.required) {
        let val = req.body[field.id];
        if (val === undefined || val === null || String(val).trim() === '') {
          val = additional_data[field.id];
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
        const val = additional_data[cf.id];
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

    if (existingAttendee) {
      // Actualizar registro precargado con los datos del formulario + nuevo QR + estado 'confirmed'
      // Si el invitado puso un email diferente al del CSV, se actualiza con el que él ingresó
      const { data: updated, error: updateError } = await supabase
        .from('attendees')
        .update({
          first_name: first_name || existingAttendee.first_name,
          last_name: last_name || existingAttendee.last_name,
          email: email.trim(),  // Siempre usar el email que el invitado ingresó en el formulario
          company: company || existingAttendee.company,
          job_title: job_title || existingAttendee.job_title,
          category_id: finalCategoryId || existingAttendee.category_id,
          additional_data: { ...(existingAttendee.additional_data || {}), ...(additional_data || {}) },
          qr_code: qrCode,
          status: 'confirmed'
        })
        .eq('id', existingAttendee.id)
        .select()
        .single();

      if (updateError) throw updateError;
      attendee = updated;
    } else {
      // Insertar nuevo registro del asistente público
      const { data: inserted, error: attendeeError } = await supabase
        .from('attendees')
        .insert([
          {
            event_id: id,
            invitation_id: matchedInvitation ? matchedInvitation.id : null,
            category_id: finalCategoryId,
            first_name: first_name || '',
            last_name: last_name || '',
            email: email.trim(),
            company: company || '',
            job_title: job_title || '',
            additional_data: additional_data || {},
            qr_code: qrCode,
            status: 'confirmed',
            is_public_registration: !matchedInvitation
          }
        ])
        .select()
        .single();

      if (attendeeError) throw attendeeError;
      attendee = inserted;
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

    // 2. Buscar asistente por qr_code o id o email
    // NOTA: 'id' es tipo UUID. Si enviamos un string como 'ATT-1234' a id.eq, la base de datos lanza error.
    // Por lo tanto, solo buscamos por 'id' si el searchCode tiene formato UUID.
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUuid = uuidRegex.test(searchCode);
    
    let orQuery = `qr_code.eq.${searchCode},email.eq.${searchCode}`;
    if (isUuid) {
      orQuery += `,id.eq.${searchCode}`;
    }

    const { data: attendee, error: attError } = await supabase
      .from('attendees')
      .select('*, event_categories(name)')
      .eq('event_id', id)
      .or(orQuery)
      .is('deleted_at', null)
      .single();

    if (attError || !attendee) {
      if (attError) console.error('Checkin query error:', attError);
      return res.status(404).json({
        success: false,
        status_code: 'INVALID',
        message: `El código "${searchCode}" no corresponde a ningún asistente registrado en este evento.`
      });
    }

    // 2.5 Verificar que el evento ya haya iniciado y no haya finalizado
    const now = new Date();
    const eventName = event.name || 'el evento';



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

    // 3. Verificar si ya ingresó (buscando en la tabla checkins o el estado del attendee)
    const { data: existingCheckin } = await supabase
      .from('checkins')
      .select('checked_in_at')
      .eq('event_id', id)
      .eq('attendee_id', attendee.id)
      .maybeSingle();

    const alreadyAttended = existingCheckin || attendee.status === 'checked_in' || attendee.status === 'attended';
    
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
          category_name: attendee.event_categories ? attendee.event_categories.name : 'General',
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
        category_name: updatedAttendee.event_categories ? updatedAttendee.event_categories.name : 'General',
        check_in_time: checkInTimestamp
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
