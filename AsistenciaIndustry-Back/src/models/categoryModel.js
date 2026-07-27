import { supabase } from '../config/supabase.js';

export const CategoryModel = {
  /**
   * Listar categorías de un evento (excluyendo eliminadas lógicamente por defecto)
   */
  async findByEventId(eventId, { includeDeleted = false, onlyDeleted = false } = {}) {
    let query = supabase
      .from('event_categories')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });

    if (onlyDeleted) {
      query = query.not('deleted_at', 'is', null);
    } else if (!includeDeleted) {
      query = query.is('deleted_at', null);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  /**
   * Obtener categoría por ID
   */
  async findById(id, { includeDeleted = false } = {}) {
    let query = supabase.from('event_categories').select('*').eq('id', id);
    if (!includeDeleted) query = query.is('deleted_at', null);
    const { data } = await query.maybeSingle();
    return data;
  },

  /**
   * Crear categoría
   */
  async create({ eventId, name }) {
    const { data, error } = await supabase
      .from('event_categories')
      .insert([{ event_id: eventId, name }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Actualizar categoría
   */
  async update(id, { name }) {
    const { data, error } = await supabase
      .from('event_categories')
      .update({ name })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Soft Delete categoría
   */
  async softDelete(id) {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('event_categories')
      .update({ deleted_at: now })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Restaurar categoría
   */
  async restore(id) {
    const { data, error } = await supabase
      .from('event_categories')
      .update({ deleted_at: null })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Borrado definitivo de categoría
   */
  async permanentDelete(id) {
    const { error } = await supabase.from('event_categories').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
};
