import { prisma } from '../config/prisma.js';
import { supabase } from '../config/supabase.js';
import { PERMISSIONS } from '../config/roles.js';

export function resolveUserPermissions(roleName, rolePerms = [], userPerms = []) {
  const configPerms = [];
  if (roleName) {
    for (const [permKey, allowedRoles] of Object.entries(PERMISSIONS)) {
      if (Array.isArray(allowedRoles) && allowedRoles.includes(roleName)) {
        configPerms.push(permKey);
      }
    }
  }
  const rPerms = Array.isArray(rolePerms) ? rolePerms : [];
  const uPerms = Array.isArray(userPerms) ? userPerms : [];
  return Array.from(new Set([...configPerms, ...rPerms, ...uPerms]));
}

/**
 * Modelo para la gestión de usuarios en la tabla `events.users` usando Prisma ORM (con fallback a Supabase REST).
 * Incluye soporte completo de Soft Delete, Restauración y Eliminación Permanente.
 */
export const UserModel = {
  /**
   * Buscar usuario por ID
   */
  async findById(id, { includeDeleted = false } = {}) {
    try {
      if (prisma && prisma.user) {
        const whereClause = { id };
        if (!includeDeleted) whereClause.deletedAt = null;
        const user = await prisma.user.findFirst({ 
          where: whereClause,
          include: { role: true }
        });
        if (user) {
          const roleName = user.roleName || user.role?.name || 'operator';
          return {
            id: user.id,
            email: user.email,
            full_name: user.fullName,
            role: roleName,
            permissions: resolveUserPermissions(roleName, user.role?.permissions, user.permissions),
            is_active: user.isActive,
            created_at: user.createdAt,
            updated_at: user.updatedAt,
            deleted_at: user.deletedAt
          };
        }
      }
    } catch (err) {
      // Fallback
    }

    let query = supabase.from('users').select('*').eq('id', id);
    if (!includeDeleted) query = query.is('deleted_at', null);
    const { data } = await query.maybeSingle();
    if (!data) return null;

    const roleName = data.role || data.role_name || 'operator';
    let rolePerms = [];
    try {
      const { data: roleData } = await supabase.from('roles').select('permissions').eq('name', roleName).maybeSingle();
      if (roleData && Array.isArray(roleData.permissions)) {
        rolePerms = roleData.permissions;
      }
    } catch (rErr) {}

    return {
      id: data.id,
      email: data.email,
      full_name: data.full_name || data.fullName,
      role: roleName,
      permissions: resolveUserPermissions(roleName, rolePerms, data.permissions),
      is_active: data.is_active ?? data.isActive ?? true,
      created_at: data.created_at || data.createdAt,
      updated_at: data.updated_at || data.updatedAt,
      deleted_at: data.deleted_at || data.deletedAt
    };
  },

  /**
   * Buscar usuario por correo electrónico
   */
  async findByEmail(email, { includeDeleted = false } = {}) {
    try {
      if (prisma && prisma.user) {
        const whereClause = { email };
        if (!includeDeleted) whereClause.deletedAt = null;
        const user = await prisma.user.findFirst({ 
          where: whereClause,
          include: { role: true }
        });
        if (user) {
          const roleName = user.roleName || user.role?.name || 'operator';
          return {
            id: user.id,
            email: user.email,
            full_name: user.fullName,
            role: roleName,
            permissions: resolveUserPermissions(roleName, user.role?.permissions, user.permissions),
            is_active: user.isActive,
            created_at: user.createdAt,
            updated_at: user.updatedAt,
            deleted_at: user.deletedAt
          };
        }
      }
    } catch (err) {
      // Fallback
    }

    let query = supabase.from('users').select('*').eq('email', email);
    if (!includeDeleted) query = query.is('deleted_at', null);
    const { data } = await query.maybeSingle();
    if (!data) return null;

    const roleName = data.role || data.role_name || 'operator';
    let rolePerms = [];
    try {
      const { data: roleData } = await supabase.from('roles').select('permissions').eq('name', roleName).maybeSingle();
      if (roleData && Array.isArray(roleData.permissions)) {
        rolePerms = roleData.permissions;
      }
    } catch (rErr) {}

    return {
      id: data.id,
      email: data.email,
      full_name: data.full_name || data.fullName,
      role: roleName,
      permissions: resolveUserPermissions(roleName, rolePerms, data.permissions),
      is_active: data.is_active ?? data.isActive ?? true,
      created_at: data.created_at || data.createdAt,
      updated_at: data.updated_at || data.updatedAt,
      deleted_at: data.deleted_at || data.deletedAt
    };
  },

  /**
   * Crear un nuevo usuario en la base de datos
   */
  async create({ id, email, full_name, role = 'operator', permissions = [], is_active = true }) {
    try {
      if (prisma && prisma.user) {
        const user = await prisma.user.create({
          data: {
            id: id || undefined,
            email,
            fullName: full_name,
            roleName: role,
            permissions,
            isActive: is_active
          },
          include: { role: true }
        });
        const rolePerms = user.role?.permissions || [];
        const userPerms = user.permissions || [];
        return {
          id: user.id,
          email: user.email,
          full_name: user.fullName,
          role: user.roleName,
          permissions: Array.from(new Set([...rolePerms, ...userPerms])),
          is_active: user.isActive,
          created_at: user.createdAt
        };
      }
    } catch (err) {
      // Fallback
    }

    const { data, error } = await supabase.from('users').insert([
      { id, email, full_name, role, is_active }
    ]).select().single();

    if (error) throw error;
    return data;
  },

  /**
   * Actualizar usuario por ID
   */
  async updateUser(id, updateData) {
    const { full_name, role, permissions, is_active, email } = updateData;

    try {
      if (prisma && prisma.user) {
        const dataToUpdate = {};
        if (full_name !== undefined) dataToUpdate.fullName = full_name;
        if (role !== undefined) dataToUpdate.roleName = role;
        if (permissions !== undefined) dataToUpdate.permissions = permissions;
        if (is_active !== undefined) dataToUpdate.isActive = is_active;
        if (email !== undefined) dataToUpdate.email = email;
        dataToUpdate.updatedAt = new Date();

        const user = await prisma.user.update({
          where: { id },
          data: dataToUpdate,
          include: { role: true }
        });

        const rolePerms = user.role?.permissions || [];
        const userPerms = user.permissions || [];
        return {
          id: user.id,
          email: user.email,
          full_name: user.fullName,
          role: user.roleName,
          permissions: Array.from(new Set([...rolePerms, ...userPerms])),
          is_active: user.isActive,
          updated_at: user.updatedAt,
          deleted_at: user.deletedAt
        };
      }
    } catch (err) {
      // Fallback
    }

    const updates = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (role !== undefined) updates.role = role;
    if (permissions !== undefined) updates.permissions = permissions;
    if (is_active !== undefined) updates.is_active = is_active;
    if (email !== undefined) updates.email = email;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase.from('users').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  /**
   * Soft Delete de usuario (marca deleted_at e is_active = false)
   */
  async softDelete(id) {
    const now = new Date();
    try {
      if (prisma && prisma.user) {
        const user = await prisma.user.update({
          where: { id },
          data: { deletedAt: now, isActive: false }
        });
        return {
          id: user.id,
          email: user.email,
          full_name: user.fullName,
          role: user.role,
          is_active: user.isActive,
          deleted_at: user.deletedAt
        };
      }
    } catch (err) {
      // Fallback
    }

    const { data, error } = await supabase
      .from('users')
      .update({ deleted_at: now.toISOString(), is_active: false })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /**
   * Restaurar usuario soft-deleted
   */
  async restore(id) {
    try {
      if (prisma && prisma.user) {
        const user = await prisma.user.update({
          where: { id },
          data: { deletedAt: null, isActive: true }
        });
        return {
          id: user.id,
          email: user.email,
          full_name: user.fullName,
          role: user.role,
          is_active: user.isActive,
          deleted_at: null
        };
      }
    } catch (err) {
      // Fallback
    }

    const { data, error } = await supabase
      .from('users')
      .update({ deleted_at: null, is_active: true })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /**
   * Eliminar usuario definitivamente de la base de datos
   */
  async permanentDelete(id) {
    try {
      if (prisma && prisma.user) {
        await prisma.user.delete({ where: { id } });
        return true;
      }
    } catch (err) {
      // Fallback
    }

    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  /**
   * Alias de compatibilidad para deleteUser
   */
  async deleteUser(id) {
    return this.softDelete(id);
  },

  /**
   * Listar todos los usuarios con búsqueda opcional, filtro por rol y estado Soft Delete
   */
  async findAll({ search, role, includeDeleted = false, onlyDeleted = false } = {}) {
    try {
      if (prisma && prisma.user) {
        const whereClause = {};

        if (onlyDeleted) {
          whereClause.deletedAt = { not: null };
        } else if (!includeDeleted) {
          whereClause.deletedAt = null;
        }

        if (role) {
          whereClause.role = role;
        }

        if (search) {
          whereClause.OR = [
            { fullName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } }
          ];
        }

        const users = await prisma.user.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' },
          include: { role: true }
        });

        return users.map(user => {
          const rolePerms = user.role?.permissions || [];
          const userPerms = user.permissions || [];
          return {
            id: user.id,
            email: user.email,
            full_name: user.fullName,
            role: user.roleName,
            permissions: Array.from(new Set([...rolePerms, ...userPerms])),
            is_active: user.isActive,
            created_at: user.createdAt,
            updated_at: user.updatedAt,
            deleted_at: user.deletedAt
          };
        });
      }
    } catch (err) {
      // Fallback
    }

    let query = supabase.from('users').select('*').order('created_at', { ascending: false });

    if (onlyDeleted) {
      query = query.not('deleted_at', 'is', null);
    } else if (!includeDeleted) {
      query = query.is('deleted_at', null);
    }

    if (role) {
      query = query.eq('role', role);
    }
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }
};
