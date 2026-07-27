import { supabase } from '../config/supabase.js';

export const AttendeeModel = {
  /**
   * Listar asistentes por evento con filtros de búsqueda, categoría, estado y Soft Delete
   */
  async findByEventId(eventId, { search, category_id, status, includeDeleted = false, onlyDeleted = false } = {}) {
    let query = supabase
      .from('attendees')
      .select('*, event_categories(name), invitations(code)')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (onlyDeleted) {
      query = query.not('deleted_at', 'is', null);
    } else if (!includeDeleted) {
      query = query.is('deleted_at', null);
    }

    if (category_id) {
      query = query.eq('category_id', category_id);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  /**
   * Obtener asistente por ID
   */
  async findById(id, { includeDeleted = false } = {}) {
    let query = supabase
      .from('attendees')
      .select('*, event_categories(name), invitations(code)')
      .eq('id', id);

    if (!includeDeleted) query = query.is('deleted_at', null);

    const { data } = await query.maybeSingle();
    return data;
  },

  /**
   * Crear asistente de manera manual o pública
   */
  async create(data) {
    const { data: newAttendee, error } = await supabase
      .from('attendees')
      .insert([data])
      .select()
      .single();

    if (error) throw error;
    return newAttendee;
  },

  /**
   * Actualizar asistente
   */
  async update(id, updates) {
    const { data, error } = await supabase
      .from('attendees')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Soft Delete de asistente
   */
  async softDelete(id) {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('attendees')
      .update({ deleted_at: now })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Restaurar asistente eliminado lógicamente
   */
  async restore(id) {
    const { data, error } = await supabase
      .from('attendees')
      .update({ deleted_at: null })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Borrado definitivo de asistente
   */
  async permanentDelete(id) {
    const { error } = await supabase.from('attendees').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
};
