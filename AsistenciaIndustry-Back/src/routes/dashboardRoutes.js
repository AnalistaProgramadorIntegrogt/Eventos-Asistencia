import { Router } from 'express';
import { supabase } from '../config/supabase.js';
import { requirePermission } from '../middleware/authMiddleware.js';

const router = Router();

// GET /api/dashboard/events/:eventId - Indicadores y gráficos del evento (Admin y Operador)
router.get('/events/:eventId', requirePermission('VIEW_DASHBOARD'), async (req, res) => {
  try {
    const { eventId } = req.params;

    // 1. Conteo de Invitados (invitaciones activas creadas — excluir eliminados)
    const { count: totalInvitations } = await supabase
      .from('invitations')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .is('deleted_at', null);

    // 2. Todos los asistentes ACTIVOS del evento (excluir eliminados)
    const { data: attendees, error: attError } = await supabase
      .from('attendees')
      .select('*, event_categories(name)')
      .eq('event_id', eventId)
      .is('deleted_at', null);

    if (attError) throw attError;

    const publicRegistrations = (attendees || []).filter(a => a.is_public_registration === true || a.status === 'confirmed');
    const totalPreregistered = publicRegistrations.length;
    const totalAttended = (attendees || []).filter(a => a.status === 'checked_in').length;
    const totalNoShow = (attendees || []).filter(a => a.status === 'no_show').length;
    const totalInv = totalInvitations || 0;
    const publicPendingCount = publicRegistrations.filter(a => a.status !== 'checked_in' && a.status !== 'no_show').length;
    const totalPending = Math.max(0, totalInv + publicPendingCount - totalAttended - totalNoShow);

    // 3. Obtener check-ins para gráfico por horas
    const { data: checkins } = await supabase
      .from('checkins')
      .select('checked_in_at')
      .eq('event_id', eventId);

    // Agrupar check-ins por hora
    const hourlyCounts = {};
    (checkins || []).forEach(c => {
      const date = new Date(c.checked_in_at);
      const hourStr = `${date.getHours().toString().padStart(2, '0')}:00`;
      hourlyCounts[hourStr] = (hourlyCounts[hourStr] || 0) + 1;
    });

    const hourlyChartData = Object.keys(hourlyCounts).sort().map(hour => ({
      hour,
      checkins: hourlyCounts[hour]
    }));

    // 4. Confirmaciones y Preregistros por Categoría Interna
    //    Fuente: invitaciones VIP (tienen category_id asignado al importar Excel)
    //    + attendees de registro web público (is_public_registration=true)
    const { data: allEventCategories } = await supabase
      .from('event_categories')
      .select('id, name')
      .eq('event_id', eventId)
      .is('deleted_at', null);

    const isGenericCat = (name) => {
      if (!name) return true;
      const n = name.trim().toLowerCase();
      return n.includes('sin categor');
    };

    // Obtener invitaciones activas con su categoría
    const { data: activeInvitations } = await supabase
      .from('invitations')
      .select('id, category_id, is_active, event_categories(name)')
      .eq('event_id', eventId)
      .is('deleted_at', null);

    const categoryStats = {};
    (allEventCategories || []).forEach(c => {
      if (c.name && !isGenericCat(c.name)) {
        categoryStats[c.name] = { total: 0, confirmados: 0, asistieron: 0, pendientes: 0 };
      }
    });

    let noCatStats = { total: 0, confirmados: 0, asistieron: 0, pendientes: 0 };

    // Construir mapa de invitados únicos (combinando invitaciones de Excel + registros web)
    const guestMap = new Map();

    (activeInvitations || []).forEach(inv => {
      const catName = inv.event_categories?.name;
      guestMap.set(inv.id, {
        id: inv.id,
        categoryName: (catName && !isGenericCat(catName)) ? catName : 'Sin Categoría',
        isConfirmed: false,
        isCheckedIn: false
      });
    });

    (attendees || []).forEach(att => {
      const catName = att.event_categories?.name;
      const key = att.invitation_id || att.id;
      const isConfirmed = att.status === 'confirmed' || att.status === 'checked_in' || att.status === 'attended';
      const isCheckedIn = att.status === 'checked_in' || att.status === 'attended';

      if (guestMap.has(key)) {
        const g = guestMap.get(key);
        if (catName && !isGenericCat(catName)) g.categoryName = catName;
        if (isConfirmed) g.isConfirmed = true;
        if (isCheckedIn) g.isCheckedIn = true;
      } else {
        guestMap.set(key, {
          id: key,
          categoryName: (catName && !isGenericCat(catName)) ? catName : 'Sin Categoría',
          isConfirmed,
          isCheckedIn
        });
      }
    });

    guestMap.forEach(g => {
      const catName = g.categoryName;
      if (catName && !isGenericCat(catName)) {
        if (!categoryStats[catName]) {
          categoryStats[catName] = { total: 0, confirmados: 0, asistieron: 0, pendientes: 0 };
        }
        categoryStats[catName].total += 1;
        if (g.isConfirmed) categoryStats[catName].confirmados += 1;
        else categoryStats[catName].pendientes += 1;
        if (g.isCheckedIn) categoryStats[catName].asistieron += 1;
      } else {
        noCatStats.total += 1;
        if (g.isConfirmed) noCatStats.confirmados += 1;
        else noCatStats.pendientes += 1;
        if (g.isCheckedIn) noCatStats.asistieron += 1;
      }
    });

    const totalAllGuests = guestMap.size || (attendees || []).length;

    const categoryChartData = Object.keys(categoryStats)
      .filter(cat => categoryStats[cat].total > 0)
      .map(cat => {
        const tot = categoryStats[cat].total;
        const conf = categoryStats[cat].confirmados;
        const asist = categoryStats[cat].asistieron;

        return {
          name: cat,
          confirmados: conf,
          asistentes: asist,
          total: tot,
          pendientes: categoryStats[cat].pendientes,
          confirmation_pct: tot > 0 ? Math.round((conf / tot) * 100) : 0,
          attendance_pct: tot > 0 ? Math.round((asist / tot) * 100) : 0,
          distribution_pct: totalAllGuests > 0 ? Math.round((tot / totalAllGuests) * 100) : 0
        };
      });

    if (noCatStats.total > 0) {
      const tot = noCatStats.total;
      const conf = noCatStats.confirmados;
      const asist = noCatStats.asistieron;

      categoryChartData.push({
        name: 'Sin Categoría',
        is_no_category: true,
        confirmados: conf,
        asistentes: asist,
        total: tot,
        pendientes: noCatStats.pendientes,
        confirmation_pct: tot > 0 ? Math.round((conf / tot) * 100) : 0,
        attendance_pct: tot > 0 ? Math.round((asist / tot) * 100) : 0,
        distribution_pct: totalAllGuests > 0 ? Math.round((tot / totalAllGuests) * 100) : 0
      });
    }

    // 5. Ranking de empresas representadas (por confirmados y check-in)
    const companyCounts = {};
    (attendees || []).forEach(a => {
      const comp = (a.company || a.additional_data?.empresa || a.additional_data?.company || '').trim();
      if (comp && comp !== '' && comp.toLowerCase() !== 'n/a') {
        if (!companyCounts[comp]) {
          companyCounts[comp] = { total: 0, checkedIn: 0 };
        }
        companyCounts[comp].total += 1;
        if (a.status === 'checked_in') {
          companyCounts[comp].checkedIn += 1;
        }
      }
    });

    const companyRanking = Object.keys(companyCounts)
      .map(company => ({
        company,
        count: companyCounts[company].total,
        checked_in_count: companyCounts[company].checkedIn
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 6. Logs de auditoría recientes (Solo visibles para Admin según PRD 5.1 vs 5.2)
    let auditLogs = [];
    if (req.user && req.user.role === 'admin') {
      const { data: logs } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })
        .limit(20);
      auditLogs = logs || [];
    }

    res.json({
      success: true,
      data: {
        metrics: {
          invitados: totalInvitations || 0,
          preregistrados: totalPreregistered,
          asistieron: totalAttended,
          pendientes: totalPending,
          no_show: totalNoShow
        },
        charts: {
          hourly: hourlyChartData,
          categories: categoryChartData,
          top_companies: companyRanking
        },
        audit_logs: auditLogs
      }
    });
  } catch (err) {
    console.warn('⚠️ Advertencia en Dashboard metrics:', err.message);
    res.json({
      success: true,
      data: {
        metrics: { invitados: 0, preregistrados: 0, asistieron: 0, pendientes: 0, no_show: 0 },
        charts: { hourly: [], categories: [], top_companies: [] },
        audit_logs: []
      }
    });
  }
});

export default router;
