import { Router } from 'express';
import multer from 'multer';
import { supabase } from '../config/supabase.js';
import { InvitationModel } from '../models/invitationModel.js';
import { generateUniqueInvitationCode, generateUniqueAttendeeCode } from '../services/qrService.js';
import { parseGuestsFromExcelBuffer } from '../services/excelService.js';
import { sendQRTicketEmail } from '../services/emailService.js';
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
    const { search, category_id, includeDeleted, onlyDeleted } = req.query;

    const invitations = await InvitationModel.findByEventId(eventId, {
      search,
      category_id,
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
    const guests = parseGuestsFromExcelBuffer(req.file.buffer);

    const { data: categories } = await supabase
      .from('event_categories')
      .select('*')
      .eq('event_id', eventId)
      .is('deleted_at', null);

    const categoryMap = new Map((categories || []).map(c => [c.name.toLowerCase(), c.id]));

    const { data: existingInvitations } = await supabase
      .from('invitations')
      .select('id, guest_name, guest_email, code, category_id, attendees(company, additional_data)')
      .eq('event_id', eventId)
      .is('deleted_at', null);

    const normalizeStr = (s) => (s || '').toLowerCase().trim().replace(/\s+/g, ' ');
    const existingMap = new Map();
    const existingNameMap = new Map();

    (existingInvitations || []).forEach(inv => {
      const normName = normalizeStr(inv.guest_name);
      const normEmail = normalizeStr(inv.guest_email);
      const normCode = inv.code ? inv.code.toLowerCase().trim() : '';

      let normComp = '';
      if (Array.isArray(inv.attendees) && inv.attendees.length > 0) {
        normComp = normalizeStr(inv.attendees[0]?.company);
      } else if (inv.attendees?.company) {
        normComp = normalizeStr(inv.attendees.company);
      }

      if (normComp) {
        existingMap.set(`${normName}|${normEmail}|${normComp}`, inv);
      }
      existingMap.set(`${normName}|${normEmail}`, inv);

      if (normCode) {
        existingMap.set(normCode, inv);
      }

      if (normName) {
        if (!existingNameMap.has(normName)) {
          existingNameMap.set(normName, []);
        }
        existingNameMap.get(normName).push(inv);
      }
    });

    let updatedCount = 0;
    const itemsToInsert = [];

    for (const g of guests) {
      let catId = categoryMap.get((g.category || '').toLowerCase());

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
      const email = g.guest_email || g.email || '';
      const company = g.company || '';
      const normName = normalizeStr(rawName);
      const normEmail = normalizeStr(email);
      const normComp = normalizeStr(company);

      let existingMatch = null;
      if (normComp) {
        existingMatch = existingMap.get(`${normName}|${normEmail}|${normComp}`);
      }

      if (!existingMatch) {
        existingMatch = existingMap.get(`${normName}|${normEmail}`) || (g.code ? existingMap.get(g.code.toLowerCase().trim()) : null);
      }

      if (!existingMatch && !email && normName) {
        const nameMatches = existingNameMap.get(normName);
        if (nameMatches && nameMatches.length === 1) {
          existingMatch = nameMatches[0];
        }
      }

      if (existingMatch) {
        await supabase
          .from('invitations')
          .update({ category_id: catId || existingMatch.category_id })
          .eq('id', existingMatch.id);

        const attUpdates = { category_id: catId || existingMatch.category_id };
        if (g.company) attUpdates.company = g.company;
        if (g.job_title) attUpdates.job_title = g.job_title;
        if (g.phone) {
          attUpdates.additional_data = { phone: g.phone, telefono: g.phone };
        }

        await supabase
          .from('attendees')
          .update(attUpdates)
          .eq('invitation_id', existingMatch.id);

        updatedCount++;
      } else {
        const nameParts = rawName.trim().split(' ');
        const firstName = nameParts[0] || 'Invitado';
        const lastName = nameParts.slice(1).join(' ') || '';

        itemsToInsert.push({
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
            qr_code: generateUniqueAttendeeCode(),
            status: 'pending',
            is_public_registration: false,
            additional_data: { phone: g.phone || '', telefono: g.phone || '' }
          }
        });
      }
    }

    const allInserted = [];
    const codeToInvIdMap = new Map();
    const chunkSize = 40;

    for (let i = 0; i < itemsToInsert.length; i += chunkSize) {
      const chunk = itemsToInsert.slice(i, i + chunkSize).map(item => item.invitation);
      const { data: insertedChunk, error: chunkError } = await supabase
        .from('invitations')
        .insert(chunk)
        .select();

      if (chunkError) throw chunkError;
      if (insertedChunk) {
        insertedChunk.forEach(inv => {
          if (inv.code) {
            codeToInvIdMap.set(inv.code.toLowerCase().trim(), inv.id);
          }
        });
        allInserted.push(...insertedChunk);
      }
    }

    // Insertar asistentes correspondientes para las nuevas invitaciones asociando por el código único
    if (allInserted && allInserted.length > 0) {
      const newAttendeesToInsert = itemsToInsert.map(item => {
        const invCode = (item.invitation.code || '').toLowerCase().trim();
        const matchedInvId = codeToInvIdMap.get(invCode);
        return {
          ...item.attendee,
          invitation_id: matchedInvId || null
        };
      });

      for (let i = 0; i < newAttendeesToInsert.length; i += chunkSize) {
        const chunk = newAttendeesToInsert.slice(i, i + chunkSize);
        await supabase
          .from('attendees')
          .insert(chunk);
      }
    }

    const totalProcessed = updatedCount + allInserted.length;
    res.json({
      success: true,
      message: `Proceso completado: ${updatedCount} invitado(s) actualizados y ${allInserted.length} nuevos creado(s).`,
      count: totalProcessed,
      updated_count: updatedCount,
      created_count: allInserted.length
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/events/:eventId/invitations/bulk-category - Asignación masiva de categoría a invitados seleccionados
router.post('/:eventId/invitations/bulk-category', requirePermission(['ASSIGN_BULK_CATEGORY', 'ASSIGN_GUEST_CATEGORY', 'EDIT_GUEST_INFO', 'EDIT_GUEST', 'IMPORT_GUESTS_EXCEL']), async (req, res) => {
  try {
    const { eventId } = req.params;
    const { invitation_ids, category_id, category_name } = req.body;

    if (!Array.isArray(invitation_ids) || invitation_ids.length === 0) {
      return res.status(400).json({ success: false, error: 'Debe seleccionar al menos un invitado.' });
    }

    let finalCategoryId = category_id || null;

    if (!finalCategoryId && category_name && category_name.trim()) {
      const trimmedCatName = category_name.trim();
      const { data: existingCat } = await supabase
        .from('event_categories')
        .select('*')
        .eq('event_id', eventId)
        .ilike('name', trimmedCatName)
        .is('deleted_at', null)
        .maybeSingle();

      if (existingCat) {
        finalCategoryId = existingCat.id;
      } else {
        const { data: newCat } = await supabase
          .from('event_categories')
          .insert([{ event_id: eventId, name: trimmedCatName }])
          .select()
          .single();
        if (newCat) finalCategoryId = newCat.id;
      }
    }

    // Actualizar categoría en invitaciones
    const { error: invErr } = await supabase
      .from('invitations')
      .update({ category_id: finalCategoryId })
      .in('id', invitation_ids)
      .eq('event_id', eventId);

    if (invErr) throw invErr;

    // Actualizar categoría en asistentes vinculados
    await supabase
      .from('attendees')
      .update({ category_id: finalCategoryId })
      .in('invitation_id', invitation_ids)
      .eq('event_id', eventId);

    res.json({
      success: true,
      message: `Categoría asignada a ${invitation_ids.length} invitado(s) correctamente.`,
      updated_count: invitation_ids.length,
      category_id: finalCategoryId
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
      if (category_id !== undefined) attUpdates.category_id = category_id;
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

// POST /api/events/:eventId/resend-qr-email - Reenviar correo con código QR (Individual)
router.post('/:eventId/resend-qr-email', requirePermission('RESEND_QR_EMAIL_SINGLE'), async (req, res) => {
  try {
    const { eventId } = req.params;
    const { guest_id, email: overrideEmail } = req.body;

    if (!guest_id) {
      return res.status(400).json({ success: false, error: 'ID de invitado requerido' });
    }

    const { data: event, error: eventErr } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventErr || !event) {
      return res.status(404).json({ success: false, error: 'Evento no encontrado' });
    }

    let { data: attendee } = await supabase
      .from('attendees')
      .select('*, event_categories(name)')
      .eq('event_id', eventId)
      .or(`id.eq.${guest_id},invitation_id.eq.${guest_id}`)
      .maybeSingle();

    if (!attendee) {
      const { data: inv } = await supabase
        .from('invitations')
        .select('*, event_categories(name)')
        .eq('id', guest_id)
        .maybeSingle();

      if (inv) {
        attendee = {
          first_name: inv.guest_name ? inv.guest_name.split(' ')[0] : 'Invitado',
          last_name: inv.guest_name ? inv.guest_name.split(' ').slice(1).join(' ') : '',
          email: inv.guest_email,
          qr_code: inv.code,
          status: inv.status || 'confirmed'
        };
      }
    }

    if (!attendee) {
      return res.status(404).json({ success: false, error: 'Invitado no encontrado' });
    }

    const recipientEmail = overrideEmail || attendee.email;
    if (!recipientEmail) {
      return res.status(400).json({ success: false, error: 'El invitado no posee correo electrónico registrado' });
    }

    const attendeeName = `${attendee.first_name || ''} ${attendee.last_name || ''}`.trim() || attendee.guest_name || 'Invitado';
    const qrCode = attendee.qr_code || attendee.code || generateUniqueAttendeeCode();

    await sendQRTicketEmail({
      to: recipientEmail,
      attendeeName,
      eventName: event.title || event.name || 'Evento Corporativo',
      location: event.location || '',
      startDate: event.start_date || event.date,
      logoUrl: event.logo_url || event.logo,
      bannerUrl: event.banner_url || event.banner,
      qrCode,
      formConfig: event.form_config,
      emailConfig: event.email_config
    });

    res.json({
      success: true,
      message: `✅ Correo con código QR reenviado exitosamente a ${recipientEmail}`
    });
  } catch (err) {
    console.error('Error re-enviando correo QR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/events/:eventId/resend-qr-email-bulk - Reenviar correo con código QR a confirmados (Masivo)
router.post('/:eventId/resend-qr-email-bulk', requirePermission('RESEND_QR_EMAIL_BULK'), async (req, res) => {
  try {
    const { eventId } = req.params;
    const { guest_ids } = req.body;

    const { data: event, error: eventErr } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventErr || !event) {
      return res.status(404).json({ success: false, error: 'Evento no encontrado' });
    }

    let query = supabase
      .from('attendees')
      .select('*')
      .eq('event_id', eventId)
      .in('status', ['confirmed', 'checked_in'])
      .is('deleted_at', null);

    if (Array.isArray(guest_ids) && guest_ids.length > 0) {
      query = query.in('id', guest_ids);
    }

    const { data: confirmedAttendees } = await query;

    if (!confirmedAttendees || confirmedAttendees.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No se encontraron invitados confirmados para enviar correos.'
      });
    }

    let sentCount = 0;
    let failedCount = 0;

    for (const attendee of confirmedAttendees) {
      if (!attendee.email) continue;
      try {
        const attendeeName = `${attendee.first_name || ''} ${attendee.last_name || ''}`.trim() || 'Invitado';
        const qrCode = attendee.qr_code || generateUniqueAttendeeCode();

        await sendQRTicketEmail({
          to: attendee.email,
          attendeeName,
          eventName: event.title || event.name || 'Evento Corporativo',
          location: event.location || '',
          startDate: event.start_date || event.date,
          logoUrl: event.logo_url || event.logo,
          bannerUrl: event.banner_url || event.banner,
          qrCode,
          formConfig: event.form_config,
          emailConfig: event.email_config
        });
        sentCount++;
      } catch (e) {
        console.error(`Error enviando correo QR a ${attendee.email}:`, e);
        failedCount++;
      }
    }

    res.json({
      success: true,
      sent_count: sentCount,
      failed_count: failedCount,
      message: `✅ Reenvío completado: ${sentCount} correo(s) enviado(s) exitosamente.`
    });
  } catch (err) {
    console.error('Error re-enviando correos masivos:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
