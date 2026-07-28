import { prisma } from '../config/prisma.js';

export const RoleModel = {
  /**
   * Crear un nuevo rol
   */
  async create({ name, description, permissions }) {
    if (!prisma || !prisma.role) throw new Error('Prisma Role model not initialized');
    return await prisma.role.create({
      data: {
        name,
        description,
        permissions: permissions || []
      }
    });
  },

  /**
   * Obtener todos los roles
   */
  async findAll() {
    if (!prisma || !prisma.role) return [];
    return await prisma.role.findMany({
      orderBy: { createdAt: 'desc' }
    });
  },

  /**
   * Obtener un rol por nombre
   */
  async findByName(name) {
    if (!prisma || !prisma.role) return null;
    return await prisma.role.findUnique({
      where: { name }
    });
  },

  /**
   * Actualizar un rol
   */
  async update(name, updateData) {
    if (!prisma || !prisma.role) throw new Error('Prisma Role model not initialized');
    return await prisma.role.update({
      where: { name },
      data: {
        ...updateData,
        updatedAt: new Date()
      }
    });
  },

  /**
   * Eliminar un rol
   */
  async delete(name) {
    if (!prisma || !prisma.role) throw new Error('Prisma Role model not initialized');
    return await prisma.role.delete({
      where: { name }
    });
  }
};
