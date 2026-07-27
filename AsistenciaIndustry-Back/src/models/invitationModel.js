import { supabase } from '../config/supabase.js';
import { generateUniqueInvitationCode } from '../services/qrService.js';

export const InvitationModel = {
  /**
   * Listar invitaciones por Evento
   */
  async findByEventId(eventId, { search, includeDeleted = false, onlyDeleted = false } = {}) {
    let query = supabase
      .from('invitations')
      .select('*, event_categories(name)')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (onlyDeleted) {
      query = query.not('deleted_at', 'is', null);
    } else if (!includeDeleted) {
      query = query.is('deleted_at', null);
    }

    if (search) {
      query = query.or(`guest_name.ilike.%${search}%,guest_email.ilike.%${search}%,code.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  /**
   * Obtener invitación por ID
   */
  async findById(id, { includeDeleted = false } = {}) {
    let query = supabase
      .from('invitations')
      .select('*, event_categories(name)')
      .eq('id', id);

    if (!includeDeleted) query = query.is('deleted_at', null);

    const { data } = await query.maybeSingle();
    return data;
  },

  /**
   * Crear invitación
   */
  async create(data) {
    const { event_id, guest_name, guest_email, category_id, code, is_active = true } = data;
    const { data: newInv, error } = await supabase
      .from('invitations')
      .insert([
        {
          event_id,
          guest_name,
          guest_email,
          category_id: category_id || null,
          code: code || generateUniqueInvitationCode('INV'),
          is_active
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return newInv;
  },

  /**
   * Actualizar invitación
   */
  async update(id, updates) {
    const { data, error } = await supabase
      .from('invitations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Soft Delete de invitación
   */
  async softDelete(id) {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('invitations')
      .update({ deleted_at: now, is_active: false })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Restaurar invitación
   */
  async restore(id) {
    const { data, error } = await supabase
      .from('invitations')
      .update({ deleted_at: null, is_active: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Borrado físico definitivo
   */
  async permanentDelete(id) {
    const { error } = await supabase.from('invitations').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
};
