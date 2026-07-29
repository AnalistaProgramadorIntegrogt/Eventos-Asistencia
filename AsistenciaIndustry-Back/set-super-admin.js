import { PrismaClient } from '@prisma/client';
import { AVAILABLE_PERMISSIONS, ROLES } from './src/config/roles.js';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@integro.net.gt';
  
  // Extract all permission IDs
  const allPerms = AVAILABLE_PERMISSIONS.map(p => p.id);
  if (!allPerms.includes('VIEW_USERS')) allPerms.push('VIEW_USERS');
  if (!allPerms.includes('MANAGE_USERS')) allPerms.push('MANAGE_USERS');

  console.log("Upserting super_admin role...");
  // Ensure the super_admin role exists
  await prisma.role.upsert({
    where: { name: ROLES.SUPER_ADMIN },
    update: { permissions: allPerms },
    create: {
      name: ROLES.SUPER_ADMIN,
      description: 'Super Administrador del sistema',
      permissions: allPerms
    }
  });

  console.log(`Looking for user ${email}...`);
  const user = await prisma.user.findUnique({ where: { email } });
  
  if (user) {
    await prisma.user.update({
      where: { email },
      data: {
        roleName: ROLES.SUPER_ADMIN,
        permissions: allPerms,
        isActive: true
      }
    });
    console.log(`Success! User ${email} has been granted the super_admin role and ALL permissions.`);
  } else {
    // We can also create it if they want, but usually Supabase Auth creates the initial user record.
    // So if it doesn't exist, we will just inform.
    console.log(`User ${email} not found in the database. If this user hasn't signed in or been created via Supabase yet, please do that first.`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
