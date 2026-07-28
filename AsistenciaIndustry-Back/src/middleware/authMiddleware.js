import { supabase } from '../config/supabase.js';
import { UserModel } from '../models/userModel.js';
import { hasPermission } from '../config/roles.js';
import { requestContext } from '../config/asyncContext.js';

/**
 * Middleware para validar el token de autenticación (JWT) de Supabase en las peticiones.
 */
export async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Acceso no autorizado. Token de autenticación ausente.'
      });
    }

    const token = authHeader.split(' ')[1];

    // Validar token con Supabase Auth
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: 'Sesión inválida o expirada. Por favor inicie sesión de nuevo.'
      });
    }

    // Obtener detalles del usuario desde events.users
    let userRecord = await UserModel.findById(user.id);

    // Si el usuario no existe en la base de datos interna (ej: primer login con Microsoft), lo creamos
    if (!userRecord) {
      const defaultRole = 'operator'; // Rol por defecto para nuevos usuarios de Microsoft
      const fullName = user.user_metadata?.full_name || user.user_metadata?.name || user.email;
      
      userRecord = await UserModel.create({
        id: user.id,
        email: user.email,
        full_name: fullName,
        role: defaultRole,
        is_active: true
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: userRecord.role,
      permissions: userRecord.permissions || [],
      full_name: userRecord.full_name,
      is_active: userRecord.is_active
    };

    // Almacenar el contexto de la petición para RLS
    requestContext.run({ userId: user.id, role: 'authenticated' }, () => {
      next();
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Error interno durante la verificación de autenticación: ' + err.message
    });
  }
}

/**
 * Middleware para restringir el acceso basado en permisos escalables.
 * @param {string} permissionKey - El permiso requerido (ej: 'CREATE_EVENTS')
 */
export function requirePermission(permissionKey) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Acceso denegado. Usuario no autenticado.'
      });
    }

    const keys = Array.isArray(permissionKey) ? permissionKey : [permissionKey];
    const userPerms = req.user.permissions || [];

    const userHasPerm = keys.some(key => userPerms.length > 0 ? userPerms.includes(key) : hasPermission(req.user.role, key));

    // Súper Administrador siempre tiene acceso
    if (!userHasPerm && req.user.role !== 'super_admin') {
      return res.status(403).json({ 
        success: false, 
        error: `Acceso restringido. No tiene permisos para realizar esta acción (${keys.join(', ')}).` 
      });
    }

    next();
  };
}
