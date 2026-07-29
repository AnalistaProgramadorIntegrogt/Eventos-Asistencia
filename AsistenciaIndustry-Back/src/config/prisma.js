import { PrismaClient } from '@prisma/client';
import { requestContext } from './asyncContext.js';

/**
 * Instancia base del cliente de Prisma ORM
 */
const globalForPrisma = globalThis;

const basePrisma = globalForPrisma.basePrisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.basePrisma = basePrisma;
}

/**
 * Instancia extendida de Prisma con soporte para RLS
 */
export const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ args, query }) {
        const ctx = requestContext.getStore();
        
        // Si hay contexto de usuario, configuramos la base de datos para RLS
        if (ctx && ctx.userId) {
          const [, , result] = await basePrisma.$transaction([
            // 1. Cambiamos el rol al de un usuario normal (para que PostgreSQL NO ignore el RLS)
            basePrisma.$executeRawUnsafe(`SET LOCAL ROLE ${ctx.role || 'authenticated'}`),
            // 2. Simulamos la variable de sesión que usa Supabase para auth.uid()
            basePrisma.$executeRaw`SELECT set_config('request.jwt.claim.sub', ${ctx.userId}, true)`,
            // 3. Ejecutamos la consulta real de Prisma
            query(args),
          ]);
          return result;
        }

        // Si es un script interno o ruta no protegida, ejecuta normal (como admin / postgres)
        return query(args);
      }
    }
  }
});
