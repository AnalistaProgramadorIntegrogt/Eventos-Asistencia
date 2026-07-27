import { Router } from 'express';
import { supabase } from '../config/supabase.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { UserModel } from '../models/userModel.js';

const router = Router();

// POST /api/auth/login - Inicio de Sesión
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Debe proporcionar correo electrónico y contraseña.'
      });
    }

    // Autenticar con Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError || !authData.session) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas. Verifique su correo y contraseña.'
      });
    }

    const { user, session } = authData;

    // Obtener información del usuario en la tabla `events.users`
    const userRecord = await UserModel.findById(user.id);

    res.json({
      success: true,
      message: 'Inicio de sesión exitoso',
      data: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: session.expires_in,
        user: {
          id: user.id,
          email: user.email,
          full_name: userRecord?.full_name || user.user_metadata?.full_name || user.email,
          role: userRecord?.role || user.user_metadata?.role || 'operator',
          is_active: userRecord?.is_active ?? true
        }
      }
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/auth/me - Obtener perfil del usuario actualmente autenticado
router.get('/me', authenticateToken, (req, res) => {
  res.json({
    success: true,
    data: req.user
  });
});

export default router;
