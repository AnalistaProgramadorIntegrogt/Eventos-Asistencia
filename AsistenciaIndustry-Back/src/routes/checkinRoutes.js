import { Router } from 'express';
import { supabase } from '../config/supabase.js';
import { requirePermission } from '../middleware/authMiddleware.js';

const router = Router();

// POST /api/checkin/scan - Escaneo rápido con Lector QR de teclado (Admin y Operador)
router.post('/scan', requirePermission('SCAN_QR_CHECKIN'), async (req, res) => {
  try {
    const { event_id, qr_code, operator_id, operator_name } = req.body;

    if (!qr_code || !event_id) {
      return res.status(400).json({ success: false, status_code: 'INVALID', message: 'Código QR o evento no proporcionado.' });
    }

    const rawCode = String(qr_code).trim();
    const dashNormalized = rawCode.replace(/['"`]/g, '-');
    const unhyphenated = rawCode.replace(/['"`\-\s]/g, '');

    const candidates = Array.from(new Set([rawCode, dashNormalized, unhyphenated, rawCode.toUpperCase(), dashNormalized.toUpperCase()])).filter(Boolean);

    const currentOperatorId = req.user ? req.user.id : operator_id;
    const currentOperatorName = req.user ? req.user.full_name : (operator_name || 'Operador QR');

    // 1. Buscar en el evento actual por qr_code, id (si es UUID) o email
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let foundAttendee = null;

    for (const cand of candidates) {
      let query = supabase
        .from('attendees')
        .select('*, events(id, name, start_date, end_date), event_categories(name)')
        .eq('event_id', event_id)
        .is('deleted_at', null);

      if (uuidRegex.test(cand)) {
        query = query.or(`qr_code.eq.${cand},id.eq.${cand},email.eq.${cand}`);
      } else {
        query = query.or(`qr_code.eq.${cand},email.eq.${cand}`);
      }

      const { data } = await query.limit(1);
      if (data && data.length > 0) {
        foundAttendee = data[0];
        break;
      }
    }

    // 1.5. Si no se encuentra en attendees del evento actual, buscar en invitations del evento actual
    if (!foundAttendee) {
      for (const cand of candidates) {
        const { data: invs } = await supabase
          .from('invitations')
          .select('*, events(id, name, start_date, end_date), event_categories(name)')
          .eq('event_id', event_id)
          .is('deleted_at', null)
          .or(`code.eq.${cand},invitation_code.eq.${cand},guest_email.eq.${cand}`)
          .limit(1);

        if (invs && invs.length > 0) {
          const inv = invs[0];
          foundAttendee = {
            id: inv.id,
            first_name: inv.guest_name || `${inv.first_name || ''} ${inv.last_name || ''}`.trim() || 'Invitado',
            last_name: '',
            company: inv.company || inv.guest_company || '',
            email: inv.guest_email || inv.email || '',
            status: inv.status || 'pending',
            events: inv.events,
            event_categories: inv.event_categories
          };
          break;
        }
      }
    }

    // 1.8. Si aún NO se encuentra en este evento, BUSCAR EN OTROS EVENTOS para dar mensaje inteligente "WRONG_EVENT"
    if (!foundAttendee) {
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
            message: `El código "${dashNormalized}" pertenece al asistente "${otherName}" en el evento "${otherEvName}", no en el evento actual.`
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
            message: `El código "${dashNormalized}" pertenece al asistente "${otherName}" en el evento "${otherEvName}", no en el evento actual.`
          });
        }
      }

      return res.status(404).json({
        success: false,
        status_code: 'INVALID',
        message: `El código "${dashNormalized}" no corresponde a ningún asistente registrado en este evento.`
      });
    }

    const attendee = foundAttendee;

    const event = attendee.events;
    const eventName = event ? event.name : 'el evento';
    const attendeeFullName = `${attendee.first_name} ${attendee.last_name}`.trim();


    // 1.6. Verificar si el evento ya finalizó por completo
    // Eliminado: Bloquear el check-in si el evento "terminó" causa problemas en la vida real si el evento se atrasa.
    /*
    if (event && event.end_date) {
      const endDate = new Date(event.end_date);
      const now = new Date();

      if (now > endDate) {
        return res.status(400).json({
          success: false,
          status_code: 'EVENT_ENDED',
          message: `No se puede marcar asistencia. El evento "${eventName}" ya ha finalizado.`,
          error: `El evento ha concluido.`
        });
      }
    }
    */

    // 2. Verificar si el código ya fue utilizado
    const { data: existingCheckin } = await supabase
      .from('checkins')
      .select('*')
      .eq('event_id', event_id)
      .eq('attendee_id', attendee.id)
      .maybeSingle();

const parseUtcDate = (dateStr) => {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;
  let s = String(dateStr).trim();
  if (!s) return null;
  if (!s.endsWith('Z') && !s.includes('+') && !/[-+]\d{2}:\d{2}$/.test(s)) {
    s = s.replace(' ', 'T') + 'Z';
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

    if (existingCheckin || attendee.status === 'checked_in') {
      const timeStr = existingCheckin && existingCheckin.checked_in_at
        ? parseUtcDate(existingCheckin.checked_in_at)?.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Guatemala' })
        : '';
      const timeMsg = timeStr ? ` a las ${timeStr}` : '';

      return res.status(400).json({
        success: false,
        status_code: 'ALREADY_USED',
        message: `La invitación de ${attendeeFullName} ya fue utilizada anteriormente${timeMsg}. No se puede volver a marcar la hora de entrada.`,
        attendee: {
          id: attendee.id,
          first_name: attendee.first_name,
          last_name: attendee.last_name,
          full_name: attendeeFullName,
          email: attendee.email,
          company: attendee.company,
          job_title: attendee.job_title,
          event_name: eventName,
          category_name: attendee.event_categories ? attendee.event_categories.name : null,
          checked_in_at: existingCheckin ? existingCheckin.checked_in_at : null
        }
      });
    }

    // 3. Registrar el check-in (Control de concurrencia atómica mediante clave única)
    const { data: newCheckin, error: checkinError } = await supabase
      .from('checkins')
      .insert([
        {
          event_id,
          attendee_id: attendee.id,
          scanned_by: currentOperatorId || null,
          scanned_by_name: currentOperatorName,
          checkin_type: 'qr_scan'
        }
      ])
      .select()
      .single();

    if (checkinError) {
      if (checkinError.code === '23505') {
        return res.status(400).json({
          success: false,
          status_code: 'ALREADY_USED',
          message: `El código de ${attendeeFullName} ya fue utilizado.`
        });
      }
      throw checkinError;
    }

    // 4. Actualizar estado del asistente a 'checked_in'
    await supabase
      .from('attendees')
      .update({ status: 'checked_in' })
      .eq('id', attendee.id);

    return res.json({
      success: true,
      status_code: 'SUCCESS',
      message: `Hola ${attendeeFullName}, bienvenido a ${eventName}. Es un gusto tenerte con nosotros.`,
      attendee: {
        id: attendee.id,
        first_name: attendee.first_name,
        last_name: attendee.last_name,
        full_name: attendeeFullName,
        email: attendee.email,
        company: attendee.company,
        job_title: attendee.job_title,
        event_name: eventName,
        category_name: attendee.event_categories ? attendee.event_categories.name : null,
        checked_in_at: newCheckin.checked_in_at
      }
    });

  } catch (err) {
    res.status(500).json({ success: false, status_code: 'ERROR', message: err.message });
  }
});

// GET /api/checkin/events/:eventId/search - Búsqueda manual de preregistrados (Admin y Operador)
router.get('/events/:eventId/search', requirePermission('SCAN_QR'), async (req, res) => {
  try {
    const { eventId } = req.params;
    const { query } = req.query;

    let dbQuery = supabase
      .from('attendees')
      .select('*, event_categories(name), checkins(*)')
      .eq('event_id', eventId);

    if (query) {
      const q = `%${query}%`;
      dbQuery = dbQuery.or(`first_name.ilike.${q},last_name.ilike.${q},email.ilike.${q},company.ilike.${q},qr_code.ilike.${q}`);
    }

    const { data, error } = await dbQuery.order('first_name', { ascending: true }).limit(100);

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/checkin/manual - Marcar asistencia manualmente (Admin y Operador)
// POST /api/checkin/manual - Marcar asistencia manualmente (Admin y Operador)
router.post('/manual', requirePermission('MARK_ATTENDANCE_MANUAL'), async (req, res) => {
  try {
    const { event_id, attendee_id, operator_id, operator_name } = req.body;

    const currentOperatorId = req.user ? req.user.id : operator_id;
    const currentOperatorName = req.user ? req.user.full_name : (operator_name || 'Operador');

    let { data: attendee } = await supabase
      .from('attendees')
      .select('*, events(id, name, start_date, end_date)')
      .eq('id', attendee_id)
      .maybeSingle();

    // Si no se encuentra en attendees, buscar en la tabla invitations
    if (!attendee) {
      const { data: inv } = await supabase
        .from('invitations')
        .select('*, events(id, name, start_date, end_date)')
        .or(`id.eq.${attendee_id},code.eq.${attendee_id}`)
        .maybeSingle();

      if (inv) {
        // Verificar si ya se había creado un asistente con esta invitación
        const { data: existingAtt } = await supabase
          .from('attendees')
          .select('*, events(id, name, start_date, end_date)')
          .eq('invitation_id', inv.id)
          .maybeSingle();

        if (existingAtt) {
          attendee = existingAtt;
        } else {
          // Crear el registro de asistente vinculado a esta invitación
          const rawName = inv.guest_name || 'Invitado VIP';
          const nameParts = rawName.trim().split(' ');
          const newQrCode = inv.code || `VIP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

          const attendeePayload = {
            event_id: inv.event_id,
            invitation_id: inv.id,
            category_id: inv.category_id || null,
            first_name: nameParts[0] || 'Invitado',
            last_name: nameParts.slice(1).join(' ') || '',
            email: inv.guest_email || '',
            qr_code: newQrCode,
            status: 'pending',
            is_public_registration: false,
            additional_data: inv.additional_data || {}
          };

          const { data: createdAtt, error: createErr } = await supabase
            .from('attendees')
            .insert([attendeePayload])
            .select('*, events(id, name, start_date, end_date)')
            .single();

          if (!createErr && createdAtt) {
            attendee = createdAtt;
          }
        }
      }
    }

    if (!attendee) {
      return res.status(404).json({ success: false, error: 'Asistente o invitación no encontrada' });
    }

    const event = attendee.events;
    const eventName = event ? event.name : 'el evento';
    const targetAttendeeId = attendee.id;

    // Verificar si el evento ya finalizó por completo
    // Eliminado: Bloquear asistencia manual por hora de fin causa fricción operativa
    /*
    if (event && event.end_date) {
      const endDate = new Date(event.end_date);
      const now = new Date();
      if (now > endDate) {
        return res.status(400).json({
          success: false,
          status_code: 'EVENT_ENDED',
          error: `No se puede marcar asistencia. El evento "${eventName}" ya ha concluido.`
        });
      }
    }
    */

    // Verificar si ya marcó asistencia anteriormente
    const { data: existingCheckin } = await supabase
      .from('checkins')
      .select('*')
      .eq('event_id', event_id || attendee.event_id)
      .eq('attendee_id', targetAttendeeId)
      .maybeSingle();

    if (existingCheckin || attendee.status === 'checked_in') {
      const timeStr = existingCheckin && existingCheckin.checked_in_at
        ? parseUtcDate(existingCheckin.checked_in_at)?.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Guatemala' })
        : '';
      const timeMsg = timeStr ? ` a las ${timeStr}` : '';
      const attendeeFullName = `${attendee.first_name || ''} ${attendee.last_name || ''}`.trim() || 'El invitado';

      return res.status(400).json({
        success: false,
        status_code: 'ALREADY_USED',
        error: `La invitación de ${attendeeFullName} ya fue utilizada previamente${timeMsg}. No se puede volver a marcar asistencia.`
      });
    }

    // Insertar checkin
    const { data: newCheckin, error: checkinError } = await supabase
      .from('checkins')
      .insert([
        {
          event_id: event_id || attendee.event_id,
          attendee_id: targetAttendeeId,
          scanned_by: currentOperatorId || null,
          scanned_by_name: currentOperatorName,
          checkin_type: 'manual'
        }
      ])
      .select()
      .single();

    if (checkinError) throw checkinError;

    // Actualizar estado del asistente
    await supabase.from('attendees').update({ status: 'checked_in' }).eq('id', targetAttendeeId);

    // Guardar auditoría
    await supabase.from('audit_logs').insert([
      {
        event_id: event_id || attendee.event_id,
        user_id: currentOperatorId || null,
        user_name: currentOperatorName,
        action: 'CHECKIN_MANUAL',
        target_id: targetAttendeeId,
        details: { attendee_name: `${attendee.first_name || ''} ${attendee.last_name || ''}`.trim() || attendee.email }
      }
    ]);

    const attendeeFullName = `${attendee.first_name || ''} ${attendee.last_name || ''}`.trim() || attendee.email;

    res.json({
      success: true,
      message: `Hola ${attendeeFullName}, bienvenido a ${eventName}. Asistencia marcada manualmente.`,
      data: newCheckin
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/checkin/manual/uncheck - Desmarcar asistencia manualmente (Solo Admin - PRD 5.1)
router.post('/manual/uncheck', requirePermission('UNMARK_ATTENDANCE_MANUAL'), async (req, res) => {
  try {
    const { event_id, attendee_id, operator_id, operator_name, reason } = req.body;

    const currentOperatorId = req.user ? req.user.id : operator_id;
    const currentOperatorName = req.user ? req.user.full_name : (operator_name || 'Administrador');

    let { data: attendee } = await supabase
      .from('attendees')
      .select('*')
      .eq('id', attendee_id)
      .maybeSingle();

    if (!attendee) {
      const { data: attByInv } = await supabase
        .from('attendees')
        .select('*')
        .eq('invitation_id', attendee_id)
        .maybeSingle();

      if (attByInv) attendee = attByInv;
    }

    if (!attendee) {
      return res.status(404).json({ success: false, error: 'Asistente no encontrado' });
    }

    const targetAttendeeId = attendee.id;
    const targetEventId = event_id || attendee.event_id;

    // Eliminar registro de checkin
    await supabase
      .from('checkins')
      .delete()
      .eq('event_id', targetEventId)
      .eq('attendee_id', targetAttendeeId);

    // Cambiar estado a pending
    await supabase.from('attendees').update({ status: 'pending' }).eq('id', targetAttendeeId);

    // Guardar en auditoría con el nombre de quién lo modificó y el motivo
    await supabase.from('audit_logs').insert([
      {
        event_id: targetEventId,
        user_id: currentOperatorId || null,
        user_name: currentOperatorName,
        action: 'CHECKIN_REVERSED',
        target_id: targetAttendeeId,
        details: {
          attendee_name: `${attendee.first_name || ''} ${attendee.last_name || ''}`.trim() || attendee.email,
          reason: reason || 'Reversión manual realizada'
        }
      }
    ]);

    res.json({ success: true, message: 'Asistencia desmarcada correctamente.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
