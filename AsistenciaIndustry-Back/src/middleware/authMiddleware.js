import { supabase } from '../config/supabase.js';
import { UserModel } from '../models/userModel.js';

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
    const userRecord = await UserModel.findById(user.id);

    req.user = {
      id: user.id,
      email: user.email,
      role: userRecord?.role || user.user_metadata?.role || 'operator',
      full_name: userRecord?.full_name || user.user_metadata?.full_name || user.email,
      is_active: userRecord?.is_active ?? true
    };

    next();
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Error interno durante la verificación de autenticación: ' + err.message
    });
  }
}

/**
 * Middleware para restringir el acceso a ciertos roles (ej: 'admin', 'operator')
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Acceso denegado. Usuario no autenticado.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Acceso restringido. Se requiere rol de: ${allowedRoles.join(' o ')}.`
      });
    }

    next();
  };
}
