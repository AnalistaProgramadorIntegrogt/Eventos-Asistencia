import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

// ⚠️ IMPORTANTE: Las tablas están en el schema 'events' de Supabase (NO en 'public').
// Esto fue configurado al ejecutar `prisma db push` con schema=events en prisma/schema.prisma.
const supabaseSchema = process.env.SUPABASE_SCHEMA || 'events';

if (!supabaseUrl.includes('supabase.co') || supabaseKey === 'placeholder-key') {
  console.warn('⚠️ ADVERTENCIA: Variables de Supabase no configuradas completamente en .env.');
}

// Cliente Supabase configurado con el esquema 'events'
export const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: supabaseSchema }
});

// Cliente con privilegios administrativos (service_role) configurado con el esquema 'events'
export const supabaseAdmin = (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY !== 'your-supabase-service-role-key')
  ? createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, { db: { schema: supabaseSchema } })
  : null;
