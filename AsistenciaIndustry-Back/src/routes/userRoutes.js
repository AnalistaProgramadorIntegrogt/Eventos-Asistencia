import { Router } from 'express';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import { UserModel } from '../models/userModel.js';
import { RoleModel } from '../models/roleModel.js';
import { prisma } from '../config/prisma.js';
import { requirePermission } from '../middleware/authMiddleware.js';
import { AVAILABLE_PERMISSIONS } from '../config/roles.js';

const router = Router();

// GET /api/users - Listar todos los usuarios (admite búsqueda por query, filtro por rol y estado Soft Delete)
router.get('/', requirePermission(['VIEW_USERS', 'MANAGE_USERS']), async (req, res) => {
  try {
    const { search, role, includeDeleted, onlyDeleted } = req.query;
    const users = await UserModel.findAll({
      search,
      role,
      includeDeleted: includeDeleted === 'true',
      onlyDeleted: onlyDeleted === 'true'
    });
    res.json({
      success: true,
      data: users
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/users/:id - Obtener un usuario por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { includeDeleted } = req.query;
    const user = await UserModel.findById(id, {
      includeDeleted: includeDeleted === 'true'
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/users - Crear nuevo usuario
router.post('/', async (req, res) => {
  try {
    const { email, password, full_name, role = 'operator', is_active = true } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({
        success: false,
        error: 'Los campos email, password y full_name son obligatorios.'
      });
    }

    const dbRoles = await RoleModel.findAll();
    const validNames = new Set(['super_admin', 'admin', 'operator', ...dbRoles.map(r => r.name)]);
    if (!validNames.has(role)) {
      return res.status(400).json({
        success: false,
        error: `El rol '${role}' no es válido en el sistema.`
      });
    }

    // Verificar si el usuario ya existe (incluyendo eliminados)
    const existingUser = await UserModel.findByEmail(email, { includeDeleted: true });
    if (existingUser) {
      if (existingUser.deleted_at) {
        return res.status(400).json({
          success: false,
          error: 'Existe un usuario eliminado con este correo. Puedes restaurarlo desde la papelera de reciclaje.'
        });
      }
      return res.status(400).json({
        success: false,
        error: 'Ya existe un usuario registrado con este correo electrónico.'
      });
    }

    let authUser = null;

    // 1. Crear en Supabase Auth
    if (supabaseAdmin) {
      const { data: newUserData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name, role }
      });

      if (createError) {
        return res.status(400).json({ success: false, error: 'Error en Supabase Auth: ' + createError.message });
      }
      authUser = newUserData.user;
    } else {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name, role } }
      });

      if (signUpError) {
        return res.status(400).json({ success: false, error: 'Error al registrar autenticación: ' + signUpError.message });
      }
      authUser = signUpData.user;

      // Confirmar correo automáticamente vía SQL si se dispone de Prisma
      if (prisma) {
        try {
          await prisma.$executeRawUnsafe(
            `UPDATE auth.users SET email_confirmed_at = NOW() WHERE email = '${email}';`
          );
        } catch (e) {
          // Ignorar error de permisos
        }
      }
    }

    // 2. Guardar en la tabla events.users
    const newUser = await UserModel.create({
      id: authUser ? authUser.id : undefined,
      email,
      full_name,
      role,
      is_active
    });

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: newUser
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/users/:id - Actualizar usuario existente
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, role, is_active, password } = req.body;

    const existingUser = await UserModel.findById(id, { includeDeleted: true });
    if (!existingUser) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    if (role) {
      const dbRoles = await RoleModel.findAll();
      const validNames = new Set(['super_admin', 'admin', 'operator', ...dbRoles.map(r => r.name)]);
      if (!validNames.has(role)) {
        return res.status(400).json({
          success: false,
          error: `El rol '${role}' no es válido en el sistema.`
        });
      }
    }

    // 1. Actualizar datos en events.users
    const updatedUser = await UserModel.updateUser(id, { full_name, role, is_active });

    // 2. Actualizar en Supabase Auth si se cambia la contraseña o datos de usuario
    if (supabaseAdmin) {
      const authUpdates = {};
      if (password) authUpdates.password = password;
      if (full_name || role) {
        authUpdates.user_metadata = {
          full_name: full_name || existingUser.full_name,
          role: role || existingUser.role
        };
      }

      if (Object.keys(authUpdates).length > 0) {
        await supabaseAdmin.auth.admin.updateUserById(id, authUpdates).catch(err => {
          console.warn('⚠️ No se pudo actualizar datos en Supabase Auth:', err.message);
        });
      }
    }

    res.json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      data: updatedUser
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/users/:id - Soft Delete de usuario
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user && req.user.id === id) {
      return res.status(400).json({
        success: false,
        error: 'No puedes eliminar tu propia cuenta de usuario en uso.'
      });
    }

    const existingUser = await UserModel.findById(id);
    if (!existingUser) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado o ya eliminado' });
    }

    const deletedUser = await UserModel.softDelete(id);

    res.json({
      success: true,
      message: 'Usuario enviado a la papelera (desactivado y eliminado lógicamente).',
      data: deletedUser
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/users/:id/restore - Restaurar usuario de la papelera
router.post('/:id/restore', async (req, res) => {
  try {
    const { id } = req.params;

    const existingUser = await UserModel.findById(id, { includeDeleted: true });
    if (!existingUser) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    const restoredUser = await UserModel.restore(id);

    res.json({
      success: true,
      message: 'Usuario restaurado exitosamente.',
      data: restoredUser
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/users/:id/permanent - Borrado físico definitivo de usuario
router.delete('/:id/permanent', async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user && req.user.id === id) {
      return res.status(400).json({
        success: false,
        error: 'No puedes eliminar tu propia cuenta de usuario en uso.'
      });
    }

    // 1. Eliminar de events.users
    await UserModel.permanentDelete(id);

    // 2. Eliminar de Supabase Auth si está disponible la llave de servicio
    if (supabaseAdmin) {
      await supabaseAdmin.auth.admin.deleteUser(id).catch(err => {
        console.warn('⚠️ No se pudo eliminar de Supabase Auth:', err.message);
      });
    }

    res.json({
      success: true,
      message: 'Usuario eliminado permanentemente de la base de datos.'
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
