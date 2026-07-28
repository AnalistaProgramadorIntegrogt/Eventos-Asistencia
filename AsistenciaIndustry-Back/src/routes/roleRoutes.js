import { Router } from 'express';
import { RoleModel } from '../models/roleModel.js';
import { requirePermission } from '../middleware/authMiddleware.js';
import { AVAILABLE_PERMISSIONS } from '../config/roles.js';

const router = Router();

// GET /api/roles/permissions - Obtener catálogo estático de permisos
router.get('/permissions', (req, res) => {
  res.json({
    success: true,
    data: AVAILABLE_PERMISSIONS
  });
});

// GET /api/roles - Listar todos los roles
router.get('/', requirePermission('MANAGE_USERS'), async (req, res) => {
  try {
    const roles = await RoleModel.findAll();
    res.json({ success: true, data: roles });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/roles - Crear un nuevo rol
router.post('/', requirePermission('MANAGE_USERS'), async (req, res) => {
  try {
    const { name, description, permissions } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'El nombre del rol es requerido.' });

    const newRole = await RoleModel.create({ name, description, permissions });
    res.status(201).json({ success: true, data: newRole });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, error: 'Ya existe un rol con ese nombre.' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/roles/:name - Actualizar un rol
router.put('/:name', requirePermission('MANAGE_USERS'), async (req, res) => {
  try {
    const { name } = req.params;
    
    if (name === 'super_admin') {
      return res.status(403).json({ success: false, error: 'El rol super_admin no puede ser modificado.' });
    }

    const updatedRole = await RoleModel.update(name, req.body);
    res.json({ success: true, data: updatedRole });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/roles/:name - Eliminar un rol
router.delete('/:name', requirePermission('MANAGE_USERS'), async (req, res) => {
  try {
    const { name } = req.params;
    
    if (name === 'super_admin' || name === 'operator' || name === 'admin') {
      return res.status(403).json({ success: false, error: 'Los roles base del sistema no pueden ser eliminados.' });
    }

    await RoleModel.delete(name);
    res.json({ success: true, message: 'Rol eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
