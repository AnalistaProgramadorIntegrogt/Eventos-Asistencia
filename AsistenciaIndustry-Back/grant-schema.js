import { prisma } from './src/config/prisma.js';

async function applySchemaGrants() {
  console.log('Aplicando permisos al schema events...');
  try {
    await prisma.$executeRawUnsafe(`GRANT USAGE ON SCHEMA events TO anon, authenticated, service_role`);
    console.log('✅ GRANT USAGE aplicado');
    await prisma.$executeRawUnsafe(`GRANT ALL ON ALL TABLES IN SCHEMA events TO anon, authenticated, service_role`);
    console.log('✅ GRANT TABLES aplicado');
    await prisma.$executeRawUnsafe(`GRANT ALL ON ALL SEQUENCES IN SCHEMA events TO anon, authenticated, service_role`);
    console.log('✅ GRANT SEQUENCES aplicado');
    await prisma.$executeRawUnsafe(`ALTER DEFAULT PRIVILEGES IN SCHEMA events GRANT ALL ON TABLES TO anon, authenticated, service_role`);
    console.log('✅ DEFAULT PRIVILEGES TABLES aplicado');
    await prisma.$executeRawUnsafe(`ALTER DEFAULT PRIVILEGES IN SCHEMA events GRANT ALL ON SEQUENCES TO anon, authenticated, service_role`);
    console.log('✅ DEFAULT PRIVILEGES SEQUENCES aplicado');
    console.log('\n✅✅ Todos los permisos aplicados correctamente en schema events');
  } catch (e) {
    console.error('❌ Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

applySchemaGrants();
