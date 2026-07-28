import { Router } from 'express';
import { EventModel } from '../models/eventModel.js';
import { CategoryModel } from '../models/categoryModel.js';
import { AttendeeModel } from '../models/attendeeModel.js';
import { requirePermission } from '../middleware/authMiddleware.js';

const router = Router();

// ==========================================
// 1. RUTAS ESPECÍFICAS DE SUB-RECURSOS (DEBEN IR PRIMERO)
// ==========================================

// GET /api/events/:eventId/form-submissions - Listar respuestas del formulario de un evento
router.get('/:eventId/form-submissions', requirePermission('VIEW_EVENTS'), async (req, res) => {
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
      status: att.status,
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

// GET /api/events/:id/email-config - Obtener plantilla de correo configurable del evento
router.get('/:id/email-config', requirePermission('VIEW_EVENTS'), async (req, res) => {
  try {
    const { id } = req.params;
    const event = await EventModel.findById(id);
    if (!event) return res.status(404).json({ success: false, error: 'Evento no encontrado' });

    res.json({
      success: true,
      data: {
        id: event.id,
        name: event.name,
        email_config: event.email_config || {
          rsvp_subject: 'Invitación al evento: {event_name}',
          rsvp_body: '',
          ticket_subject: '¡Asistencia Confirmada! Entrada y QR: {event_name}',
          ticket_body: ''
        },
        available_placeholders: {
          rsvp: [
            { code: '{guest_name}', description: 'Nombre completo del invitado' },
            { code: '{event_name}', description: 'Nombre del evento' },
            { code: '{event_date}', description: 'Fecha y hora del evento' },
            { code: '{event_location}', description: 'Ubicación / Lugar' },
            { code: '{rsvp_buttons}', description: 'Botones HTML de Confirmar Asistencia / No Asistiré' }
          ],
          ticket: [
            { code: '{guest_name}', description: 'Nombre completo del invitado' },
            { code: '{event_name}', description: 'Nombre del evento' },
            { code: '{event_date}', description: 'Fecha y hora del evento' },
            { code: '{event_location}', description: 'Ubicación / Lugar' },
            { code: '{qr_code}', description: 'Código alfanumérico del asistente' },
            { code: '{qr_image}', description: 'Imagen formateada del Código QR de Entrada' }
          ]
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/events/:id/email-config - Crear / Editar plantilla de correo de un evento (Solo Admin)
router.put('/:id/email-config', requirePermission('EDIT_EVENTS'), async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const inputConfig = body.email_config || body.emailConfig || body;

    const rsvp_subject = inputConfig.rsvp_subject || inputConfig.rsvpSubject || inputConfig.subject || inputConfig.title || inputConfig.rsvp_title;
    const rsvp_body = inputConfig.rsvp_body || inputConfig.rsvpBody || inputConfig.rsvp_template || inputConfig.rsvpTemplate || inputConfig.rsvp_html || inputConfig.rsvpHtml || inputConfig.body || inputConfig.template || inputConfig.html;
    const ticket_subject = inputConfig.ticket_subject || inputConfig.ticketSubject || inputConfig.ticket_title;
    const ticket_body = inputConfig.ticket_body || inputConfig.ticketBody || inputConfig.ticket_template || inputConfig.ticketTemplate || inputConfig.ticket_html || inputConfig.ticketHtml;

    const existingEvent = await EventModel.findById(id);
    if (!existingEvent) return res.status(404).json({ success: false, error: 'Evento no encontrado' });

    const currentConfig = existingEvent.email_config || {};
    const updatedEmailConfig = {
      ...currentConfig,
      ...(rsvp_subject !== undefined ? { rsvp_subject } : {}),
      ...(rsvp_body !== undefined ? { rsvp_body } : {}),
      ...(ticket_subject !== undefined ? { ticket_subject } : {}),
      ...(ticket_body !== undefined ? { ticket_body } : {})
    };

    const data = await EventModel.update(id, { email_config: updatedEmailConfig });
    res.json({
      success: true,
      message: 'Plantilla de correo del evento actualizada exitosamente.',
      data
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/events/:id/email-config/reset - Resetear plantilla de correo a valores por defecto (Solo Admin)
router.post('/:id/email-config/reset', requirePermission('EDIT_EVENTS'), async (req, res) => {
  try {
    const { id } = req.params;
    const defaultConfig = {
      rsvp_subject: 'Invitación al evento: {event_name}',
      rsvp_body: '',
      ticket_subject: '¡Asistencia Confirmada! Entrada y QR: {event_name}',
      ticket_body: ''
    };

    const data = await EventModel.update(id, { email_config: defaultConfig });
    res.json({
      success: true,
      message: 'Plantilla de correo reseteada a los valores predeterminados.',
      data
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/events/:id/form-config - Obtener la configuración del formulario dinámico de un evento
router.get('/:id/form-config', requirePermission('VIEW_EVENTS'), async (req, res) => {
  try {
    const { id } = req.params;
    const event = await EventModel.findById(id);
    if (!event) return res.status(404).json({ success: false, error: 'Evento no encontrado' });

    res.json({
      success: true,
      data: {
        id: event.id,
        name: event.name,
        form_config: event.form_config,
        confirmation_message: event.confirmation_message
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/events/:id/form-config - Crear / Editar la configuración del formulario dinámico (Solo Admin)
router.put('/:id/form-config', requirePermission('EDIT_EVENTS'), async (req, res) => {
  try {
    const { id } = req.params;
    const { form_config, confirmation_message } = req.body;

    const updates = {};
    if (form_config) updates.form_config = form_config;
    if (confirmation_message) updates.confirmation_message = confirmation_message;

    const data = await EventModel.update(id, updates);
    res.json({
      success: true,
      message: 'Configuración de formulario actualizada exitosamente.',
      data
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/events/:id/form-config - Resetear/Eliminar configuración del formulario a default (Solo Admin)
router.delete('/:id/form-config', requirePermission('EDIT_EVENTS'), async (req, res) => {
  try {
    const { id } = req.params;
    const defaultConfig = {
      fields: [
        { id: "first_name", label: "Nombre", visible: true, required: true, order: 1 },
        { id: "last_name", label: "Apellido", visible: true, required: true, order: 2 },
        { id: "email", label: "Correo electrónico", visible: true, required: true, order: 3 },
        { id: "company", label: "Empresa", visible: true, required: false, order: 4 },
        { id: "job_title", label: "Cargo", visible: true, required: false, order: 5 },
        { id: "category", label: "Categoría", visible: true, required: false, order: 6 }
      ],
      custom_fields: [],
      styling: {
        background_color: "#f8fafc",
        primary_color: "#2563eb",
        text_color: "#1e293b",
        custom_css: ""
      },
      success_screen: {
        title: "¡Preregistro Exitoso!",
        subtitle: "Tu registro para {event_name} se ha completado correctamente.",
        alert_title: "Revisa tu bandeja de correo electrónico",
        alert_description: "Te hemos enviado tu boleto oficial de ingreso con tu Código QR personalizado directamente a tu e-mail.",
        title_color: "#000000",
        subtitle_color: "#59585a",
        alert_bg_color: "#f8fafc",
        alert_border_color: "#cbd5e1",
        alert_text_color: "#1e293b"
      }
    };

    const data = await EventModel.update(id, {
      form_config: defaultConfig,
      confirmation_message: '¡Confirmación Exitosa! Revisa tu correo para acceder a tu entrada.'
    });

    res.json({
      success: true,
      message: 'Configuración de formulario reseteada a los valores predeterminados.',
      data
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/events/:id/form-config/restore - Restaurar configuración de formulario por defecto (Solo Admin)
router.post('/:id/form-config/restore', requirePermission('EDIT_EVENTS'), async (req, res) => {
  try {
    const { id } = req.params;
    const defaultConfig = {
      fields: [
        { id: "first_name", label: "Nombre", visible: true, required: true, order: 1 },
        { id: "last_name", label: "Apellido", visible: true, required: true, order: 2 },
        { id: "email", label: "Correo electrónico", visible: true, required: true, order: 3 },
        { id: "company", label: "Empresa", visible: true, required: false, order: 4 },
        { id: "job_title", label: "Cargo", visible: true, required: false, order: 5 },
        { id: "category", label: "Categoría", visible: true, required: false, order: 6 }
      ],
      custom_fields: [],
      styling: {
        background_color: "#f8fafc",
        primary_color: "#2563eb",
        text_color: "#1e293b",
        custom_css: ""
      },
      success_screen: {
        title: "¡Preregistro Exitoso!",
        subtitle: "Tu registro para {event_name} se ha completado correctamente.",
        alert_title: "Revisa tu bandeja de correo electrónico",
        alert_description: "Te hemos enviado tu boleto oficial de ingreso con tu Código QR personalizado directamente a tu e-mail.",
        title_color: "#000000",
        subtitle_color: "#59585a",
        alert_bg_color: "#f8fafc",
        alert_border_color: "#cbd5e1",
        alert_text_color: "#1e293b"
      }
    };

    const data = await EventModel.update(id, {
      form_config: defaultConfig,
      confirmation_message: '¡Confirmación Exitosa! Revisa tu correo para acceder a tu entrada.'
    });

    res.json({
      success: true,
      message: 'Configuración de formulario restaurada con éxito.',
      data
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/events/:id/categories - Listar categorías de un evento (Admin y Operador)
router.get('/:id/categories', requirePermission('VIEW_EVENTS'), async (req, res) => {
  try {
    const { id } = req.params;
    const { includeDeleted, onlyDeleted } = req.query;
    const categories = await CategoryModel.findByEventId(id, {
      includeDeleted: includeDeleted === 'true',
      onlyDeleted: onlyDeleted === 'true'
    });

    res.json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/events/:id/categories - Crear categoría de un evento (Solo Admin)
router.post('/:id/categories', requirePermission('EDIT_EVENTS'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'El nombre de la categoría es obligatorio.' });
    }

    const category = await CategoryModel.create({ eventId: id, name });
    res.status(201).json({ success: true, data: category });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/events/categories/:categoryId - Editar categoría (Solo Admin)
router.put('/categories/:categoryId', requirePermission('EDIT_EVENTS'), async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'El nombre de la categoría es obligatorio.' });
    }

    const updated = await CategoryModel.update(categoryId, { name });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/events/categories/:categoryId - Soft Delete de categoría (Solo Admin)
router.delete('/categories/:categoryId', requirePermission('EDIT_EVENTS'), async (req, res) => {
  try {
    const { categoryId } = req.params;
    const deleted = await CategoryModel.softDelete(categoryId);
    res.json({ success: true, message: 'Categoría eliminada lógicamente.', data: deleted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/events/categories/:categoryId/restore - Restaurar categoría (Solo Admin)
router.post('/categories/:categoryId/restore', requirePermission('EDIT_EVENTS'), async (req, res) => {
  try {
    const { categoryId } = req.params;
    const restored = await CategoryModel.restore(categoryId);
    res.json({ success: true, message: 'Categoría restaurada exitosamente.', data: restored });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/events/categories/:categoryId/permanent - Borrado definitivo de categoría (Solo Admin)
router.delete('/categories/:categoryId/permanent', requirePermission('EDIT_EVENTS'), async (req, res) => {
  try {
    const { categoryId } = req.params;
    await CategoryModel.permanentDelete(categoryId);
    res.json({ success: true, message: 'Categoría eliminada definitivamente.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 2. RUTAS GENÉRICAS DE EVENTOS (VAN AL FINAL)
// ==========================================

// GET /api/events - Listar eventos (Admin y Operador)
router.get('/', requirePermission('VIEW_EVENTS'), async (req, res) => {
  try {
    const { search, status, includeDeleted, onlyDeleted } = req.query;
    const events = await EventModel.findAll({
      search,
      status,
      includeDeleted: includeDeleted === 'true',
      onlyDeleted: onlyDeleted === 'true'
    });

    res.json({ success: true, data: events });
  } catch (err) {
    console.error('⚠️ Error en GET /api/events:', err.message);
    res.json({ success: true, data: [] });
  }
});

// POST /api/events - Crear nuevo evento (Solo Admin)
router.post('/', requirePermission('EDIT_EVENTS'), async (req, res) => {
  try {
    const newEvent = await EventModel.create(req.body);
    res.status(201).json({ success: true, data: newEvent });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/events/:id/restore - Restaurar evento de la papelera (Solo Admin)
router.post('/:id/restore', requirePermission('EDIT_EVENTS'), async (req, res) => {
  try {
    const { id } = req.params;
    const restored = await EventModel.restore(id);
    res.json({
      success: true,
      message: 'Evento restaurado exitosamente.',
      data: restored
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/events/:id/permanent - Borrado definitivo de evento (Solo Admin)
router.delete('/:id/permanent', requirePermission('EDIT_EVENTS'), async (req, res) => {
  try {
    const { id } = req.params;
    await EventModel.permanentDelete(id);
    res.json({
      success: true,
      message: 'Evento eliminado permanentemente de la base de datos.'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/events/:id - Obtener evento por ID (Admin y Operador)
router.get('/:id', requirePermission('VIEW_EVENTS'), async (req, res) => {
  try {
    const { id } = req.params;
    const { includeDeleted } = req.query;
    const event = await EventModel.findById(id, {
      includeDeleted: includeDeleted === 'true'
    });

    if (!event) {
      return res.status(404).json({ success: false, error: 'Evento no encontrado' });
    }

    res.json({ success: true, data: event });
  } catch (err) {
    res.status(404).json({ success: false, error: 'Evento no encontrado' });
  }
});

// PUT /api/events/:id - Actualizar evento general (Solo Admin)
router.put('/:id', requirePermission('EDIT_EVENTS'), async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await EventModel.update(id, req.body);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/events/:id - Soft Delete de evento (Solo Admin)
router.delete('/:id', requirePermission('EDIT_EVENTS'), async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await EventModel.softDelete(id);
    res.json({
      success: true,
      message: 'Evento eliminado lógicamente (enviado a la papelera).',
      data: deleted
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
