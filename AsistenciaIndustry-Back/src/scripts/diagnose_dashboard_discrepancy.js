import { supabase } from '../config/supabase.js';

async function diagnose() {
  const eventId = '983d9797-3a7d-4746-8d82-38cb97a9968c';
  console.log(`=== DIAGNÓSTICO DASHBOARD PARA EVENTO ${eventId} ===`);

  const { data: attendees } = await supabase
    .from('attendees')
    .select('*, event_categories(name)')
    .eq('event_id', eventId)
    .is('deleted_at', null);

  console.log(`Total attendees activos en DB: ${attendees.length}`);

  // Card calculation:
  const publicRegistrations = attendees.filter(a => a.is_public_registration === true || a.status === 'confirmed');
  console.log(`Card "Pre-registrados" (is_public_registration=true OR status=confirmed): ${publicRegistrations.length}`);

  // Attendees by status:
  const statusCounts = {};
  attendees.forEach(a => {
    statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
  });
  console.log('Attendees por status:', statusCounts);

  // Attendees by is_public_registration:
  const publicCounts = {};
  attendees.forEach(a => {
    publicCounts[String(a.is_public_registration)] = (publicCounts[String(a.is_public_registration)] || 0) + 1;
  });
  console.log('Attendees por is_public_registration:', publicCounts);

  // Categories breakdown:
  const categoryCounts = {};
  const isGenericCat = (name) => name && name.trim().toLowerCase().includes('sin categor');
  const isExcludedCat = (name) => {
    if (!name) return false;
    const n = name.trim().toLowerCase();
    return n === 'vip' || n === 'general' || n.includes('general /');
  };

  attendees.forEach(a => {
    const catName = a.event_categories?.name || 'Sin Categoría';
    const isExcluded = isExcludedCat(a.event_categories?.name);
    const isConfirmed = a.status === 'confirmed' || a.status === 'checked_in' || a.status === 'attended';

    if (!categoryCounts[catName]) {
      categoryCounts[catName] = { total: 0, confirmados: 0, isExcluded };
    }
    categoryCounts[catName].total += 1;
    if (isConfirmed) categoryCounts[catName].confirmados += 1;
  });

  console.log('Conteo por categoría interna:');
  let sumConfirmadosCategoryChart = 0;
  let sumConfirmadosCategoryChartIncluded = 0;

  Object.entries(categoryCounts).forEach(([cat, stats]) => {
    console.log(`- "${cat}": total=${stats.total}, confirmados=${stats.confirmados}, isExcluded=${stats.isExcluded}`);
    sumConfirmadosCategoryChart += stats.confirmados;
    if (!stats.isExcluded) {
      sumConfirmadosCategoryChartIncluded += stats.confirmados;
    }
  });

  console.log(`\nSumatoria total confirmados en todas las categorías: ${sumConfirmadosCategoryChart}`);
  console.log(`Sumatoria confirmados en categorías NO EXCLUIDAS (las que muestra la gráfica/tabla): ${sumConfirmadosCategoryChartIncluded}`);
}

diagnose();
