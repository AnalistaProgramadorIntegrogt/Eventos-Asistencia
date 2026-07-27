import { Router } from 'express';
import { AttendeeModel } from '../models/attendeeModel.js';
import { generateUniqueAttendeeCode, generateQRDataURL } from '../services/qrService.js';
import { requireRole } from '../middleware/authMiddleware.js';

const router = Router();

// =========================================================================
// GET /api/events/:eventId/form-submissions - Listar respuestas del formulario de un evento
// =========================================================================
router.get('/:eventId/form-submissions', requireRole('admin', 'operator'), async (req, res) => {
  try {
    const { eventId } = req.params;
    const { search, category_id, status } = req.query;

    const rawAttendees = await AttendeeModel.findByEventId(eventId, {
      search,
      category_id,
      status
    });

    const formattedSubmissions = rawAttendees.map(att => ({
      id: att.id,
      event_id: att.event_id,
      first_name: att.first_name,
      last_name: att.last_name,
      full_name: `${att.first_name} ${att.last_name}`.trim(),
      email: att.email,
      company: att.company,
      job_title: att.job_title,
      category_id: att.category_id,
      category_name: att.event_categories ? att.event_categories.name : null,
      invitation_code: att.invitations ? att.invitations.code : null,
      status: att.status, // 'pending', 'confirmed', 'declined'
      qr_code: att.qr_code,
      is_public_registration: att.is_public_registration,
      additional_data: att.additional_data || {},
      created_at: att.created_at
    }));

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
router.get('/:eventId/attendees', requireRole('admin', 'operator'), async (req, res) => {
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
router.get(['/attendees/:id', '/:eventId/attendees/:id'], requireRole('admin', 'operator'), async (req, res) => {
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
router.post('/:eventId/attendees', requireRole('admin', 'operator'), async (req, res) => {
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
router.put(['/attendees/:id', '/:eventId/attendees/:id'], requireRole('admin', 'operator'), async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, email, company, job_title, category_id, status, additional_data } = req.body;

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
    if (additional_data !== undefined) updates.additional_data = additional_data;

    const updated = await AttendeeModel.update(id, updates);

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
router.delete(['/attendees/:id', '/:eventId/attendees/:id'], requireRole('admin', 'operator'), async (req, res) => {
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
router.post('/attendees/:id/restore', requireRole('admin'), async (req, res) => {
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
router.delete('/attendees/:id/permanent', requireRole('admin'), async (req, res) => {
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

export default router;
