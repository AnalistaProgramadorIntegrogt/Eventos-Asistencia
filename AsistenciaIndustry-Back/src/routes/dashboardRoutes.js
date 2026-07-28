import { Router } from 'express';
import { supabase } from '../config/supabase.js';
import { requirePermission } from '../middleware/authMiddleware.js';

const router = Router();

// GET /api/dashboard/events/:eventId - Indicadores y gráficos del evento (Admin y Operador)
router.get('/events/:eventId', requirePermission('VIEW_DASHBOARD'), async (req, res) => {
  try {
    const { eventId } = req.params;

    // 1. Conteo de Invitados (invitaciones creadas)
    const { count: totalInvitations } = await supabase
      .from('invitations')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId);

    // 2. Todos los asistentes del evento
    const { data: attendees, error: attError } = await supabase
      .from('attendees')
      .select('*, event_categories(name)')
      .eq('event_id', eventId);

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

    // 4. Asistentes por Categoría
    const categoryCounts = {};
    (attendees || []).forEach(a => {
      const catName = a.event_categories ? a.event_categories.name : 'General / Sin categoría';
      categoryCounts[catName] = (categoryCounts[catName] || 0) + (a.status === 'checked_in' ? 1 : 0);
    });

    const categoryChartData = Object.keys(categoryCounts).map(cat => ({
      name: cat,
      asistentes: categoryCounts[cat]
    }));

    // 5. Ranking de empresas con más asistentes
    const companyCounts = {};
    (attendees || []).forEach(a => {
      if (a.company && a.status === 'checked_in') {
        const comp = a.company.trim();
        companyCounts[comp] = (companyCounts[comp] || 0) + 1;
      }
    });

    const companyRanking = Object.keys(companyCounts)
      .map(company => ({ company, count: companyCounts[company] }))
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
