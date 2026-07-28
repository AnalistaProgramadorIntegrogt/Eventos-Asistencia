import { Router } from 'express';
import { supabase } from '../config/supabase.js';
import { requirePermission } from '../middleware/authMiddleware.js';

const router = Router();

// POST /api/checkin/scan - Escaneo rápido con Lector QR de teclado (Admin y Operador)
router.post('/scan', requirePermission('SCAN_QR'), async (req, res) => {
  try {
    const { event_id, qr_code, operator_id, operator_name } = req.body;

    if (!qr_code || !event_id) {
      return res.status(400).json({ success: false, status_code: 'INVALID', message: 'Código QR o evento no proporcionado.' });
    }

    const cleanCode = String(qr_code).trim();
    const currentOperatorId = req.user ? req.user.id : operator_id;
    const currentOperatorName = req.user ? req.user.full_name : (operator_name || 'Operador QR');

    // 1. Buscar el preregistro por código QR y obtener datos del evento y categoría
    const { data: attendee, error: attendeeError } = await supabase
      .from('attendees')
      .select('*, events(id, name, start_date, end_date), event_categories(name)')
      .eq('event_id', event_id)
      .eq('qr_code', cleanCode)
      .single();

    // Código Inválido
    if (attendeeError || !attendee) {
      return res.status(404).json({
        success: false,
        status_code: 'INVALID',
        message: 'Código inválido o asistente no registrado para este evento.'
      });
    }

    const event = attendee.events;
    const eventName = event ? event.name : 'el evento';
    const attendeeFullName = `${attendee.first_name} ${attendee.last_name}`.trim();


    // 1.6. Verificar si el evento ya finalizó por completo
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

    // 2. Verificar si el código ya fue utilizado
    const { data: existingCheckin } = await supabase
      .from('checkins')
      .select('*')
      .eq('event_id', event_id)
      .eq('attendee_id', attendee.id)
      .maybeSingle();

    if (existingCheckin || attendee.status === 'checked_in') {
      const timeStr = existingCheckin && existingCheckin.checked_in_at
        ? new Date(existingCheckin.checked_in_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
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
          category_name: attendee.event_categories ? attendee.event_categories.name : 'General',
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
        category_name: attendee.event_categories ? attendee.event_categories.name : 'General',
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
router.post('/manual', requirePermission('SCAN_QR'), async (req, res) => {
  try {
    const { event_id, attendee_id, operator_id, operator_name } = req.body;

    const currentOperatorId = req.user ? req.user.id : operator_id;
    const currentOperatorName = req.user ? req.user.full_name : (operator_name || 'Operador');

    const { data: attendee } = await supabase
      .from('attendees')
      .select('*, events(id, name, start_date, end_date)')
      .eq('id', attendee_id)
      .single();

    if (!attendee) {
      return res.status(404).json({ success: false, error: 'Asistente no encontrado' });
    }

    const event = attendee.events;
    const eventName = event ? event.name : 'el evento';

    // Verificar que el evento ya haya iniciado
    if (event && event.start_date) {
      const startDate = new Date(event.start_date);
      const now = new Date();

      if (now < startDate) {
        const formattedStartDate = startDate.toLocaleDateString('es-ES', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        return res.status(400).json({
          success: false,
          status_code: 'NOT_STARTED',
          error: `No se puede marcar asistencia aún. El evento "${eventName}" inicia el ${formattedStartDate}.`
        });
      }
    }

    // Verificar si ya marcó asistencia anteriormente
    const { data: existingCheckin } = await supabase
      .from('checkins')
      .select('*')
      .eq('event_id', event_id)
      .eq('attendee_id', attendee_id)
      .maybeSingle();

    if (existingCheckin || attendee.status === 'checked_in') {
      const timeStr = existingCheckin && existingCheckin.checked_in_at
        ? new Date(existingCheckin.checked_in_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
        : '';
      const timeMsg = timeStr ? ` a las ${timeStr}` : '';

      return res.status(400).json({
        success: false,
        status_code: 'ALREADY_USED',
        error: `La invitación de ${attendee.first_name} ${attendee.last_name} ya fue utilizada previamente${timeMsg}. No se puede volver a marcar asistencia.`
      });
    }

    // Insertar checkin
    const { data: newCheckin, error: checkinError } = await supabase
      .from('checkins')
      .insert([
        {
          event_id,
          attendee_id,
          scanned_by: currentOperatorId || null,
          scanned_by_name: currentOperatorName,
          checkin_type: 'manual'
        }
      ])
      .select()
      .single();

    if (checkinError) throw checkinError;

    // Actualizar estado del asistente
    await supabase.from('attendees').update({ status: 'checked_in' }).eq('id', attendee_id);

    // Guardar auditoría
    await supabase.from('audit_logs').insert([
      {
        event_id,
        user_id: currentOperatorId || null,
        user_name: currentOperatorName,
        action: 'CHECKIN_MANUAL',
        target_id: attendee_id,
        details: { attendee_name: `${attendee.first_name} ${attendee.last_name}` }
      }
    ]);

    const attendeeFullName = `${attendee.first_name} ${attendee.last_name}`;

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
router.post('/manual/uncheck', requirePermission('MANUAL_CHECKIN'), async (req, res) => {
  try {
    const { event_id, attendee_id, operator_id, operator_name, reason } = req.body;

    const currentOperatorId = req.user ? req.user.id : operator_id;
    const currentOperatorName = req.user ? req.user.full_name : (operator_name || 'Administrador');

    const { data: attendee } = await supabase
      .from('attendees')
      .select('*')
      .eq('id', attendee_id)
      .single();

    if (!attendee) {
      return res.status(404).json({ success: false, error: 'Asistente no encontrado' });
    }

    // Eliminar registro de checkin
    await supabase
      .from('checkins')
      .delete()
      .eq('event_id', event_id)
      .eq('attendee_id', attendee_id);

    // Cambiar estado a pending
    await supabase.from('attendees').update({ status: 'pending' }).eq('id', attendee_id);

    // Guardar en auditoría con el nombre de quién lo modificó y el motivo
    await supabase.from('audit_logs').insert([
      {
        event_id,
        user_id: currentOperatorId || null,
        user_name: currentOperatorName,
        action: 'CHECKIN_REVERSED',
        target_id: attendee_id,
        details: {
          attendee_name: `${attendee.first_name} ${attendee.last_name}`,
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
