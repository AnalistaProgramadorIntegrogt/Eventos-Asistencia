import { supabase } from './src/config/supabase.js';

async function cleanup() {
  console.log('🧹 Limpiando registros pendientes pre-creados de la tabla attendees...');
  const { data, error } = await supabase
    .from('attendees')
    .delete()
    .eq('status', 'pending')
    .select();
  
  if (error) {
    console.error('❌ Error limpiando asistentes pendientes:', error.message);
  } else {
    console.log(`✅ Se eliminaron ${data ? data.length : 0} registros duplicados/pendientes de la tabla 'attendees'.`);
  }
  process.exit(0);
}

cleanup();
