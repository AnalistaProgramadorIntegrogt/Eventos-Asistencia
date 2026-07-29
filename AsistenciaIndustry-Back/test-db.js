import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const roles = await prisma.role.findMany();
  console.log("Roles in DB:", JSON.stringify(roles, null, 2));
  const users = await prisma.user.findMany({ include: { role: true } });
  console.log("Users in DB:", JSON.stringify(users.map(u => ({ email: u.email, role: u.roleName, permissions: u.permissions, rolePermissions: u.role?.permissions })), null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
