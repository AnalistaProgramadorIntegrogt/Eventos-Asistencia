import { Router } from 'express';
import { EventModel } from '../models/eventModel.js';
import { CategoryModel } from '../models/categoryModel.js';
import { InvitationModel } from '../models/invitationModel.js';
import { AttendeeModel } from '../models/attendeeModel.js';
import { UserModel } from '../models/userModel.js';
import { requireRole } from '../middleware/authMiddleware.js';

const router = Router();

// GET /api/trash - Consultar todos los elementos eliminados lógicamente (Solo Admin)
router.get('/', requireRole('admin'), async (req, res) => {
  try {
    const { type } = req.query;

    const trashData = {
      events: [],
      invitations: [],
      attendees: [],
      categories: [],
      users: []
    };

    if (!type || type === 'events') {
      trashData.events = await EventModel.findAll({ onlyDeleted: true });
    }
    if (!type || type === 'categories') {
      // Para categorías eliminadas lógicamente de cualquier evento
      const allEvents = await EventModel.findAll({ includeDeleted: true });
      const categoryPromises = allEvents.map(ev => CategoryModel.findByEventId(ev.id, { onlyDeleted: true }));
      const categoriesNested = await Promise.all(categoryPromises);
      trashData.categories = categoriesNested.flat();
    }
    if (!type || type === 'invitations') {
      const allEvents = await EventModel.findAll({ includeDeleted: true });
      const invPromises = allEvents.map(ev => InvitationModel.findByEventId(ev.id, { onlyDeleted: true }));
      const invsNested = await Promise.all(invPromises);
      trashData.invitations = invsNested.flat();
    }
    if (!type || type === 'attendees') {
      const allEvents = await EventModel.findAll({ includeDeleted: true });
      const attPromises = allEvents.map(ev => AttendeeModel.findByEventId(ev.id, { onlyDeleted: true }));
      const attsNested = await Promise.all(attPromises);
      trashData.attendees = attsNested.flat();
    }
    if (!type || type === 'users') {
      trashData.users = await UserModel.findAll({ onlyDeleted: true });
    }

    res.json({
      success: true,
      data: trashData
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/trash/restore - Restaurar un elemento desde la papelera por su tipo e ID (Solo Admin)
router.post('/restore', requireRole('admin'), async (req, res) => {
  try {
    const { type, id } = req.body;

    if (!type || !id) {
      return res.status(400).json({
        success: false,
        error: 'Los parámetros "type" (events, invitations, attendees, categories, users) e "id" son requeridos.'
      });
    }

    let restored = null;

    switch (type) {
      case 'events':
        restored = await EventModel.restore(id);
        break;
      case 'categories':
        restored = await CategoryModel.restore(id);
        break;
      case 'invitations':
        restored = await InvitationModel.restore(id);
        break;
      case 'attendees':
        restored = await AttendeeModel.restore(id);
        break;
      case 'users':
        restored = await UserModel.restore(id);
        break;
      default:
        return res.status(400).json({ success: false, error: `Tipo "${type}" no reconocido.` });
    }

    res.json({
      success: true,
      message: `Elemento de tipo "${type}" restaurado con éxito.`,
      data: restored
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/trash/empty - Vaciar la papelera (Eliminación permanente de todos los ítems borrados lógicamente) (Solo Admin)
router.delete('/empty', requireRole('admin'), async (req, res) => {
  try {
    const events = await EventModel.findAll({ onlyDeleted: true });
    for (const ev of events) {
      await EventModel.permanentDelete(ev.id);
    }

    const users = await UserModel.findAll({ onlyDeleted: true });
    for (const u of users) {
      await UserModel.permanentDelete(u.id);
    }

    res.json({
      success: true,
      message: 'Papelera vaciada correctamente. Todos los elementos eliminados lógicamente han sido purgados.'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
