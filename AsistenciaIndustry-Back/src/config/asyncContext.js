import { AsyncLocalStorage } from 'async_hooks';

/**
 * Almacena el contexto de la petición de forma asíncrona (como el ID del usuario actual)
 * para inyectarlo transparentemente en Prisma ORM para el soporte de RLS de Supabase.
 */
export const requestContext = new AsyncLocalStorage();
