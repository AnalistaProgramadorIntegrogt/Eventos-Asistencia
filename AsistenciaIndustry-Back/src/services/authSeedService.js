import { supabase, supabaseAdmin } from '../config/supabase.js';
import { prisma } from '../config/prisma.js';
import { UserModel } from '../models/userModel.js';

/**
 * Inicializa automáticamente un usuario Administrador al iniciar el servidor si no existe previamente.
 * Auto-confirma la cuenta en Supabase Auth y la registra en `events.users`.
 */
export async function initAdminUser() {
  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'admin@integro.net.gt';
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'Admin123456!';
  const adminName = process.env.DEFAULT_ADMIN_NAME || process.env.ADMIN_NAME || 'Administrador General';

  try {
    let authUser = null;

    // 1. Opción A: Si existe la clave de servicio (SUPABASE_SERVICE_ROLE_KEY), usar la API de administración
    if (supabaseAdmin) {
      try {
        const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
        if (userList && userList.users) {
          authUser = userList.users.find(u => u.email === adminEmail);
        }

        if (!authUser) {
          const { data: newUserData, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: adminEmail,
            password: adminPassword,
            email_confirm: true,
            user_metadata: {
              full_name: adminName,
              role: 'super_admin'
            }
          });

          if (!createError && newUserData && newUserData.user) {
            authUser = newUserData.user;
          }
        }
      } catch (adminErr) {
        // Si falla la API de admin, continuar con el fallback
      }
    }

    // 2. Opción B (Fallback con Anon Key / Public Signup): Crear/Obtener usuario mediante signUp o signInWithPassword
    if (!authUser) {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: adminEmail,
        password: adminPassword,
        options: {
          data: {
            full_name: adminName,
            role: 'super_admin'
          }
        }
      });

      if (signUpData && signUpData.user) {
        authUser = signUpData.user;
      } else if (signUpError) {
        // Si ya estaba creado en Auth pero faltaba el registro en users, intentar iniciar sesión para obtener el ID
        const { data: loginData } = await supabase.auth.signInWithPassword({
          email: adminEmail,
          password: adminPassword
        });
        if (loginData && loginData.user) {
          authUser = loginData.user;
        }
      }
    }

    // 3. Auto-confirmar el correo en auth.users si fue creado sin confirmar
    if (prisma) {
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE auth.users SET email_confirmed_at = NOW() WHERE email = '${adminEmail}' AND email_confirmed_at IS NULL;`
        );
      } catch (confirmErr) {
        // Ignorar si no se puede actualizar auth.users directamente
      }
    }

    // 4. Asegurar que los roles base existan en la tabla de roles
    const RoleModel = (await import('../models/roleModel.js')).RoleModel;
    const { AVAILABLE_PERMISSIONS } = await import('../config/roles.js');
    const allPerms = Object.keys(AVAILABLE_PERMISSIONS);
    
    for (const roleName of ['super_admin', 'admin', 'operator']) {
      const existingRole = await RoleModel.findByName(roleName);
      if (!existingRole) {
        let perms = [];
        if (roleName === 'super_admin') perms = allPerms;
        if (roleName === 'admin') perms = allPerms.filter(p => p !== 'MANAGE_USERS'); // Admin no puede crear roles/usuarios por defecto
        
        await RoleModel.create({
          name: roleName,
          description: `Rol base del sistema: ${roleName}`,
          permissions: perms
        });
        console.log(`✅ Rol base inicializado: ${roleName}`);
      }
    }

    // 5. Asegurar el registro en la tabla `events.users`
    const existingUser = await UserModel.findByEmail(adminEmail);
    if (!existingUser && authUser) {
      await UserModel.create({
        id: authUser.id,
        email: adminEmail,
        full_name: adminName,
        role: 'super_admin',
        is_active: true
      });
      console.log(`✅ Usuario Administrador inicializado exitosamente en events.users: ${adminEmail}`);
    } else if (existingUser && existingUser.role !== 'super_admin') {
      await UserModel.updateUser(existingUser.id, { role: 'super_admin' });
      console.log(`✅ Usuario Administrador promovido a super_admin en events.users: ${adminEmail}`);
    } else {
      console.log(`ℹ️ Usuario Administrador verificado en el sistema: ${adminEmail}`);
    }
  } catch (err) {
    console.error('⚠️ Error durante la inicialización del Administrador:', err.message);
  }
}
