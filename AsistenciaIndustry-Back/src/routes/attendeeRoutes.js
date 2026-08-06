import { Router } from 'express';
import { AttendeeModel } from '../models/attendeeModel.js';
import { generateUniqueAttendeeCode, generateQRDataURL } from '../services/qrService.js';
import { requirePermission } from '../middleware/authMiddleware.js';

const router = Router();

// =========================================================================
// GET /api/events/:eventId/form-submissions - Listar respuestas del formulario de un evento
// =========================================================================
router.get('/:eventId/form-submissions', requirePermission('VIEW_GUESTS'), async (req, res) => {
  try {
    const { eventId } = req.params;
    const { search, category_id, status } = req.query;

    const rawAttendees = await AttendeeModel.findByEventId(eventId, {
      search,
      category_id,
      status
    });

    const formattedSubmissions = rawAttendees.map(att => {
      const addData = att.additional_data || {};
      const companyVal = att.company || addData.company || addData.empresa || addData.organizacion || addData.company_name || '';
      const jobVal = att.job_title || addData.job_title || addData.cargo || addData.puesto || '';
      const phoneVal = att.phone || addData.phone || addData.telefono || addData.celular || addData.movil || '';

      return {
        id: att.id,
        event_id: att.event_id,
        first_name: att.first_name,
        last_name: att.last_name,
        full_name: `${att.first_name || ''} ${att.last_name || ''}`.trim(),
        email: att.email,
        company: companyVal,
        job_title: jobVal,
        phone: phoneVal,
        category_id: att.category_id,
        category_name: att.event_categories ? att.event_categories.name : null,
        invitation_code: att.invitations ? att.invitations.code : null,
        status: att.status, // 'pending', 'confirmed', 'declined'
        qr_code: att.qr_code,
        invitation_id: att.invitation_id,
        is_public_registration: att.is_public_registration,
        additional_data: addData,
        created_at: att.created_at
      };
    });

    const summary = {
      total_submissions: formattedSubmissions.length,
      confirmed_count: formattedSubmissions.filter(a => a.status === 'confirmed').length,
      pending_count: formattedSubmissions.filter(a => a.status === 'pending').length,
      declined_count: formattedSubmissions.filter(a => a.status === 'declined').length
    };

    res.json({
      success: true,
      summary,
      data: formattedSubmissions
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/events/:eventId/attendees - Listar asistentes de un evento (Admin y Operador)
router.get('/:eventId/attendees', requirePermission('VIEW_GUESTS'), async (req, res) => {
  try {
    const { eventId } = req.params;
    const { search, category_id, status, includeDeleted, onlyDeleted } = req.query;

    const attendees = await AttendeeModel.findByEventId(eventId, {
      search,
      category_id,
      status,
      includeDeleted: includeDeleted === 'true',
      onlyDeleted: onlyDeleted === 'true'
    });

    res.json({ success: true, data: attendees });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/attendees/:id - Obtener detalle de asistente por ID (Admin y Operador)
router.get(['/attendees/:id', '/:eventId/attendees/:id'], requirePermission('VIEW_GUESTS'), async (req, res) => {
  try {
    const { id } = req.params;
    const { includeDeleted } = req.query;

    const attendee = await AttendeeModel.findById(id, {
      includeDeleted: includeDeleted === 'true'
    });

    if (!attendee) {
      return res.status(404).json({ success: false, error: 'Asistente no encontrado' });
    }

    res.json({ success: true, data: attendee });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/events/:eventId/attendees - Crear asistente manualmente (Admin y Operador)
router.post('/:eventId/attendees', requirePermission('VIEW_GUESTS'), async (req, res) => {
  try {
    const { eventId } = req.params;
    const { first_name, last_name, email, company, job_title, category_id, invitation_id, additional_data, status } = req.body;

    if (!first_name || !last_name || !email) {
      return res.status(400).json({ success: false, error: 'Los campos first_name, last_name y email son obligatorios.' });
    }

    const qrCode = generateUniqueAttendeeCode();
    const qrDataUrl = await generateQRDataURL(qrCode);

    const newAttendee = await AttendeeModel.create({
      event_id: eventId,
      invitation_id: invitation_id || null,
      category_id: category_id || null,
      first_name,
      last_name,
      email,
      company: company || '',
      job_title: job_title || '',
      additional_data: additional_data || {},
      qr_code: qrCode,
      status: status || 'pending',
      is_public_registration: false
    });

    res.status(201).json({
      success: true,
      message: 'Asistente registrado manualmente con éxito.',
      data: {
        ...newAttendee,
        qr_data_url: qrDataUrl
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/attendees/:id & /api/events/:eventId/attendees/:id - Actualizar / Editar datos del asistente
router.put(['/attendees/:id', '/:eventId/attendees/:id'], requirePermission('VIEW_GUESTS'), async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, email, company, job_title, category_id, status, additional_data, phone } = req.body;

    const existingAttendee = await AttendeeModel.findById(id);
    if (!existingAttendee) {
      return res.status(404).json({ success: false, error: 'Asistente no encontrado' });
    }

    const updates = {};
    if (first_name !== undefined) updates.first_name = first_name;
    if (last_name !== undefined) updates.last_name = last_name;
    if (email !== undefined) updates.email = email;
    if (company !== undefined) updates.company = company;
    if (job_title !== undefined) updates.job_title = job_title;
    if (category_id !== undefined) updates.category_id = category_id;
    if (status !== undefined) updates.status = status;
    
    let mergedAdditionalData = additional_data !== undefined ? { ...additional_data } : { ...(existingAttendee.additional_data || {}) };
    
    if (company !== undefined) {
      mergedAdditionalData.company = company;
      mergedAdditionalData.empresa = company;
    }
    if (phone !== undefined) {
      mergedAdditionalData.phone = phone;
      mergedAdditionalData.telefono = phone;
      mergedAdditionalData.celular = phone;
      updates.phone = phone;
    }
    if (job_title !== undefined) {
      mergedAdditionalData.job_title = job_title;
      mergedAdditionalData.cargo = job_title;
      mergedAdditionalData.puesto = job_title;
    }

    Object.keys(existingAttendee.additional_data || {}).forEach(key => {
      const normKey = key.toLowerCase();
      if (company !== undefined && (normKey.includes('empresa') || normKey.includes('company'))) {
        mergedAdditionalData[key] = company;
      }
      if (phone !== undefined && (normKey.includes('telef') || normKey.includes('phone') || normKey.includes('celular'))) {
        mergedAdditionalData[key] = phone;
      }
      if (job_title !== undefined && (normKey.includes('cargo') || normKey.includes('puesto') || normKey.includes('job'))) {
        mergedAdditionalData[key] = job_title;
      }
    });

    updates.additional_data = mergedAdditionalData;

    let updated;
    try {
      updated = await AttendeeModel.update(id, updates);
    } catch (e) {
      delete updates.phone;
      updated = await AttendeeModel.update(id, updates);
    }

    // Si el estado cambia a 'confirmed' y antes no lo estaba, enviar el ticket QR automáticamente
    if (status === 'confirmed' && existingAttendee && existingAttendee.status !== 'confirmed') {
      const { sendQRTicketEmail } = await import('../services/emailService.js');
      const { EventModel } = await import('../models/eventModel.js');
      const event = await EventModel.findById(updated.event_id);
      const qrDataUrl = await generateQRDataURL(updated.qr_code);
      const fullAttendeeName = `${updated.first_name} ${updated.last_name}`.trim() || updated.email;

      sendQRTicketEmail({
        to: updated.email,
        attendeeName: fullAttendeeName,
        eventName: event ? event.name : 'Evento',
        location: event ? event.location : '',
        startDate: event ? event.start_date : null,
        logoUrl: event ? event.logo_url : null,
        bannerUrl: event ? event.banner_url : null,
        qrCode: updated.qr_code,
        qrDataUrl,
        emailConfig: event ? event.email_config : null
      }).catch(err => console.error('Error enviando ticket QR post-confirmación manual:', err));
    }

    res.json({
      success: true,
      message: 'Datos del asistente actualizados con éxito.',
      data: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/attendees/:id & /api/events/:eventId/attendees/:id - Eliminar asistente
router.delete(['/attendees/:id', '/:eventId/attendees/:id'], requirePermission('DELETE_GUEST'), async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent } = req.query;

    if (permanent === 'true') {
      await AttendeeModel.permanentDelete(id);
      return res.json({
        success: true,
        message: 'Asistente eliminado permanentemente.'
      });
    }

    const deleted = await AttendeeModel.softDelete(id);
    res.json({
      success: true,
      message: 'Asistente eliminado exitosamente.',
      data: deleted
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/attendees/:id/restore - Restaurar asistente
router.post('/attendees/:id/restore', requirePermission('MANAGE_GUESTS'), async (req, res) => {
  try {
    const { id } = req.params;
    const restored = await AttendeeModel.restore(id);
    res.json({
      success: true,
      message: 'Asistente restaurado con éxito.',
      data: restored
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/attendees/:id/permanent - Borrado definitivo del asistente (Admin)
router.delete('/attendees/:id/permanent', requirePermission('MANAGE_GUESTS'), async (req, res) => {
  try {
    const { id } = req.params;
    await AttendeeModel.permanentDelete(id);
    res.json({
      success: true,
      message: 'Asistente eliminado permanentemente de la base de datos.'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/attendees/:id/send-whatsapp - Enviar QR por WhatsApp manualmente
router.post('/attendees/:id/send-whatsapp', requirePermission('VIEW_GUESTS'), async (req, res) => {
  try {
    const { id } = req.params;
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, error: 'El número de teléfono es requerido.' });
    }

    let targetRecord = await AttendeeModel.findById(id);
    let eventId = targetRecord?.event_id;

    if (!targetRecord) {
      const { InvitationModel } = await import('../models/invitationModel.js');
      const inv = await InvitationModel.findById(id);
      if (inv) {
        targetRecord = {
          first_name: inv.guest_name || `${inv.first_name || ''} ${inv.last_name || ''}`.trim() || 'Invitado',
          last_name: '',
          qr_code: inv.code || inv.invitation_code || inv.id,
          event_id: inv.event_id
        };
        eventId = inv.event_id;
      }
    }

    if (!targetRecord) {
      return res.status(404).json({ success: false, error: 'Asistente o invitación no encontrada' });
    }

    const { EventModel } = await import('../models/eventModel.js');
    const event = await EventModel.findById(eventId || targetRecord.event_id);
    const eventName = event ? event.name : 'el evento';
    const eventLocation = event?.location || 'Por confirmar';

    const formatDateGT = (dateStr) => {
      if (!dateStr) return 'Por confirmar';
      try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const formatted = d.toLocaleDateString('es-GT', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
        return formatted.charAt(0).toUpperCase() + formatted.slice(1);
      } catch (e) {
        return dateStr || 'Por confirmar';
      }
    };

    const formatTimeGT = (dateStr) => {
      if (!dateStr) return 'Por confirmar';
      try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return 'Por confirmar';
        return d.toLocaleTimeString('es-GT', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      } catch (e) {
        return 'Por confirmar';
      }
    };

    const fechaStr = formatDateGT(event?.start_date);
    const horaStr = formatTimeGT(event?.start_date);

    const guestName = (targetRecord.guest_name || `${targetRecord.first_name || ''} ${targetRecord.last_name || ''}`).trim() || 'Invitado(a)';

    const caption = `Estimado(a) ${guestName},

Queremos recordarte tu asistencia a ${eventName}. Será un honor contar con tu presencia en este proyecto que representa una nueva visión para el desarrollo industrial en Guatemala.

Para tu comodidad, compartimos nuevamente tu código QR de acceso, el cual será requerido para ingresar al evento.

📅 Fecha: ${fechaStr}

🕒 Hora: ${horaStr}

📍 Lugar: ${eventLocation}`;

    const { sendQRWhatsApp } = await import('../services/whatsappService.js');
    const qrDataUrl = await generateQRDataURL(targetRecord.qr_code || targetRecord.id);

    await sendQRWhatsApp(phone, qrDataUrl, caption);

    res.json({
      success: true,
      message: 'Código QR enviado por WhatsApp exitosamente.'
    });
  } catch (err) {
    console.error('Error in send-whatsapp route:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
