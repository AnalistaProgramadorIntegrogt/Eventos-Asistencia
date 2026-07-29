import { Router } from 'express';
import multer from 'multer';
import { supabase } from '../config/supabase.js';
import { InvitationModel } from '../models/invitationModel.js';
import { generateUniqueInvitationCode, generateUniqueAttendeeCode } from '../services/qrService.js';
import { parseGuestsFromExcelBuffer } from '../services/excelService.js';
import { requirePermission } from '../middleware/authMiddleware.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const getFrontendBaseUrl = () => process.env.FRONTEND_URL || 'http://localhost:3000';

/**
 * Función auxiliar para formatear la respuesta de la invitación con su enlace copiable
 */
const formatInvitationResponse = (invitation) => {
  if (!invitation) return null;
  const baseUrl = getFrontendBaseUrl();
  return {
    ...invitation,
    invitation_link: `${baseUrl}/public/events/${invitation.event_id}/invitations/${invitation.code}`
  };
};

// GET /api/events/:eventId/invitations - Listar invitaciones de un evento (Admin y Operador)
router.get('/:eventId/invitations', requirePermission('VIEW_GUESTS'), async (req, res) => {
  try {
    const { eventId } = req.params;
    const { search, includeDeleted, onlyDeleted } = req.query;

    const invitations = await InvitationModel.findByEventId(eventId, {
      search,
      includeDeleted: includeDeleted === 'true',
      onlyDeleted: onlyDeleted === 'true'
    });

    const formattedData = (invitations || []).map(formatInvitationResponse);
    res.json({ success: true, data: formattedData });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/invitations/:id - Obtener invitación por ID (Admin y Operador)
router.get('/invitations/:id', requirePermission('VIEW_GUESTS'), async (req, res) => {
  try {
    const { id } = req.params;
    const { includeDeleted } = req.query;

    const invitation = await InvitationModel.findById(id, {
      includeDeleted: includeDeleted === 'true'
    });

    if (!invitation) {
      return res.status(404).json({ success: false, error: 'Invitación no encontrada' });
    }

    res.json({ success: true, data: formatInvitationResponse(invitation) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/events/:eventId/invitations - Crear invitación manual (Solo Admin)
router.post('/:eventId/invitations', requirePermission('ADD_GUEST_SINGLE'), async (req, res) => {
  try {
    const { eventId } = req.params;
    const { guest_name, guest_email, phone, category_id, custom_code, company, job_title } = req.body;

    const code = custom_code || generateUniqueInvitationCode('INV');

    const newInv = await InvitationModel.create({
      event_id: eventId,
      guest_name,
      guest_email,
      category_id: category_id || null,
      code,
      is_active: true
    });

    // Guardar registro en attendees para preservar empresa, cargo y teléfono
    if (company || job_title || phone) {
      const rawName = guest_name || 'Invitado VIP';
      const nameParts = rawName.trim().split(' ');
      const firstName = nameParts[0] || 'Invitado';
      const lastName = nameParts.slice(1).join(' ') || '';

      const attendeePayload = {
        event_id: eventId,
        invitation_id: newInv.id,
        category_id: category_id || null,
        first_name: firstName,
        last_name: lastName,
        email: guest_email || '',
        company: company || '',
        job_title: job_title || '',
        qr_code: generateUniqueAttendeeCode(),
        status: 'pending',
        is_public_registration: false,
        additional_data: { phone: phone || '' }
      };

      if (phone) attendeePayload.phone = phone;

      try {
        const { error: insErr } = await supabase.from('attendees').insert([attendeePayload]);
        if (insErr) {
          delete attendeePayload.phone;
          await supabase.from('attendees').insert([attendeePayload]);
        }
      } catch (insertErr) {
        delete attendeePayload.phone;
        await supabase.from('attendees').insert([attendeePayload]);
      }
    }

    res.status(201).json({ success: true, data: formatInvitationResponse(newInv) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/events/:eventId/invitations/import - Importar masivo desde Excel / CSV (Solo Admin)
router.post('/:eventId/invitations/import', requirePermission('IMPORT_GUESTS_EXCEL'), upload.single('file'), async (req, res) => {
  try {
    const { eventId } = req.params;
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No se subió ningún archivo' });
    }

    const parsedGuests = parseGuestsFromExcelBuffer(req.file.buffer);

    // Obtener las categorías existentes del evento para asociarlas
    const { data: categories } = await supabase
      .from('event_categories')
      .select('*')
      .eq('event_id', eventId)
      .is('deleted_at', null);

    const categoryMap = new Map((categories || []).map(c => [c.name.toLowerCase(), c.id]));

    // Mapa de datos por índice para luego vincular attendees a sus invitations
    const guestDataList = [];

    for (const g of parsedGuests) {
      let catId = categoryMap.get((g.category || '').toLowerCase());

      // Si la categoría no existe, se crea dinámicamente
      if (!catId && g.category) {
        const { data: newCat } = await supabase
          .from('event_categories')
          .insert([{ event_id: eventId, name: g.category }])
          .select()
          .single();
        if (newCat) {
          catId = newCat.id;
          categoryMap.set(g.category.toLowerCase(), catId);
        }
      }

      const rawName = g.guest_name || g.name || g.full_name || 'Invitado VIP';
      const nameParts = rawName.trim().split(' ');
      const firstName = nameParts[0] || 'Invitado';
      const lastName = nameParts.slice(1).join(' ') || '';
      const email = g.guest_email || g.email || '';

      guestDataList.push({
        invitation: {
          event_id: eventId,
          guest_name: rawName,
          guest_email: email,
          category_id: catId || null,
          code: g.code || generateUniqueInvitationCode('INV'),
          is_active: true
        },
        attendee: {
          event_id: eventId,
          first_name: firstName,
          last_name: lastName,
          email: email,
          company: g.company || '',
          job_title: g.job_title || '',
          category_id: catId || null,
          qr_code: generateUniqueAttendeeCode(),    // Generar un código temporal para cumplir la regla NOT NULL
          status: 'pending', // Pendiente de registro por formulario
          is_public_registration: false,
          additional_data: {}
        }
      });
    }

    // 1. Insertar todas las invitaciones en bloques (chunks) para evitar límites de tamaño por consulta de PostgREST
    const allInserted = [];
    const chunkSize = 40;
    const itemsToInsert = guestDataList.map(g => g.invitation);

    for (let i = 0; i < itemsToInsert.length; i += chunkSize) {
      const chunk = itemsToInsert.slice(i, i + chunkSize);
      const { data: insertedChunk, error: chunkError } = await supabase
        .from('invitations')
        .insert(chunk)
        .select();

      if (chunkError) throw chunkError;
      if (insertedChunk) {
        allInserted.push(...insertedChunk);
      }
    }

    // 2. Insertar los asistentes correspondientes para mantener vinculadas la empresa y el cargo
    if (allInserted && allInserted.length > 0) {
      const attendeesToInsert = allInserted.map((inv, idx) => ({
        ...guestDataList[idx].attendee,
        invitation_id: inv.id
      }));

      for (let i = 0; i < attendeesToInsert.length; i += chunkSize) {
        const chunk = attendeesToInsert.slice(i, i + chunkSize);
        await supabase
          .from('attendees')
          .insert(chunk);
      }
    }

    const formattedData = (allInserted || []).map(formatInvitationResponse);

    res.json({
      success: true,
      message: `Se importaron ${formattedData.length} invitaciones correctamente.`,
      data: formattedData
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/invitations/:id - Actualizar información del invitado (Solo Admin con permiso EDIT_GUEST_INFO o EDIT_GUEST)
router.put('/invitations/:id', requirePermission(['EDIT_GUEST_INFO', 'EDIT_GUEST']), async (req, res) => {
  try {
    const { id } = req.params;
    const { guest_name, guest_email, company, job_title, phone, category_id, code, is_active } = req.body;

    const updates = {};
    if (guest_name !== undefined) updates.guest_name = guest_name;
    if (guest_email !== undefined) updates.guest_email = guest_email;
    if (category_id !== undefined) updates.category_id = category_id;
    if (code !== undefined) updates.code = code;
    if (is_active !== undefined) updates.is_active = is_active;

    const updated = await InvitationModel.update(id, updates);

    // Actualizar también en la tabla attendees si existe registro vinculado
    const { data: existingAttendee } = await supabase
      .from('attendees')
      .select('*')
      .eq('invitation_id', id)
      .maybeSingle();

    if (existingAttendee) {
      const attUpdates = {};
      if (guest_name !== undefined) {
        const nameParts = guest_name.trim().split(' ');
        attUpdates.first_name = nameParts[0] || 'Invitado';
        attUpdates.last_name = nameParts.slice(1).join(' ') || '';
      }
      if (guest_email !== undefined) attUpdates.email = guest_email;
      if (company !== undefined) attUpdates.company = company;
      if (job_title !== undefined) attUpdates.job_title = job_title;
      if (phone !== undefined) {
        attUpdates.additional_data = { ...(existingAttendee.additional_data || {}), phone };
        attUpdates.phone = phone;
      }

      if (Object.keys(attUpdates).length > 0) {
        try {
          const { error: updErr } = await supabase.from('attendees').update(attUpdates).eq('invitation_id', id);
          if (updErr) {
            delete attUpdates.phone;
            await supabase.from('attendees').update(attUpdates).eq('invitation_id', id);
          }
        } catch (uErr) {
          delete attUpdates.phone;
          await supabase.from('attendees').update(attUpdates).eq('invitation_id', id);
        }
      }
    }

    res.json({ success: true, data: formatInvitationResponse(updated) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/invitations/:id/toggle - Activar o desactivar invitación / cambiar RSVP (Solo Admin)
router.put('/invitations/:id/toggle', requirePermission(['EDIT_GUEST_RSVP', 'EDIT_GUEST']), async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const updated = await InvitationModel.update(id, { is_active });
    res.json({ success: true, data: formatInvitationResponse(updated) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/invitations/:id/regenerate - Regenerar código de invitación (Solo Admin)
router.post('/invitations/:id/regenerate', requirePermission('REGENERATE_GUEST_QR'), async (req, res) => {
  try {
    const { id } = req.params;
    const newCode = generateUniqueInvitationCode('REGEN');

    const updated = await InvitationModel.update(id, { code: newCode });

    // Registrar en auditoría
    await supabase.from('audit_logs').insert([
      {
        event_id: updated.event_id,
        user_id: req.user ? req.user.id : null,
        user_name: req.user ? req.user.full_name : 'Administrador',
        action: 'INVITATION_REGENERATED',
        target_id: id,
        details: { new_code: newCode }
      }
    ]);

    res.json({ success: true, data: formatInvitationResponse(updated) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/invitations/:id - Soft Delete de invitación (Solo Admin)
router.delete('/invitations/:id', requirePermission('DELETE_GUEST'), async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await InvitationModel.softDelete(id);
    res.json({
      success: true,
      message: 'Invitación enviada a la papelera.',
      data: formatInvitationResponse(deleted)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/invitations/:id/restore - Restaurar invitación eliminada lógicamente (Solo Admin)
router.post('/invitations/:id/restore', requirePermission('MANAGE_GUESTS'), async (req, res) => {
  try {
    const { id } = req.params;
    const restored = await InvitationModel.restore(id);
    res.json({
      success: true,
      message: 'Invitación restaurada exitosamente.',
      data: formatInvitationResponse(restored)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/invitations/:id/permanent - Borrado definitivo de invitación (Solo Admin)
router.delete('/invitations/:id/permanent', requirePermission('MANAGE_GUESTS'), async (req, res) => {
  try {
    const { id } = req.params;
    await InvitationModel.permanentDelete(id);
    res.json({
      success: true,
      message: 'Invitación eliminada permanentemente de la base de datos.'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
