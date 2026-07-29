import { prisma } from '../config/prisma.js';
import { supabase } from '../config/supabase.js';

export const EventModel = {
  /**
   * Listar todos los eventos (filtrando soft-deleted por defecto)
   */
  async findAll({ search, status, includeDeleted = false, onlyDeleted = false } = {}) {
    try {
      if (prisma && prisma.event) {
        const whereClause = {};
        if (onlyDeleted) {
          whereClause.deletedAt = { not: null };
        } else if (!includeDeleted) {
          whereClause.deletedAt = null;
        }
        if (status) whereClause.status = status;
        if (search) {
          whereClause.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { location: { contains: search, mode: 'insensitive' } }
          ];
        }

        const events = await prisma.event.findMany({
          where: whereClause,
          include: { categories: true },
          orderBy: { createdAt: 'desc' }
        });

        return events.map(e => ({
          id: e.id,
          name: e.name,
          description: e.description,
          start_date: e.startDate,
          end_date: e.endDate,
          location: e.location,
          banner_url: e.bannerUrl,
          logo_url: e.logoUrl,
          status: e.status,
          invitation_code_required: e.invitationCodeRequired,
          form_config: e.formConfig,
          email_config: e.emailConfig,
          confirmation_message: e.confirmationMessage,
          created_at: e.createdAt,
          deleted_at: e.deletedAt,
          event_categories: e.categories
        }));
      }
    } catch (err) {
      // Fallback
    }

    let query = supabase
      .from('events')
      .select('*, event_categories(*)')
      .order('created_at', { ascending: false });

    if (onlyDeleted) {
      query = query.not('deleted_at', 'is', null);
    } else if (!includeDeleted) {
      query = query.is('deleted_at', null);
    }

    if (status) query = query.eq('status', status);
    if (search) query = query.or(`name.ilike.%${search}%,location.ilike.%${search}%`);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  /**
   * Buscar evento por ID
   */
  async findById(id, { includeDeleted = false } = {}) {
    try {
      if (prisma && prisma.event) {
        const whereClause = { id };
        if (!includeDeleted) whereClause.deletedAt = null;

        const event = await prisma.event.findFirst({
          where: whereClause,
          include: { categories: true }
        });

        if (event) {
          return {
            id: event.id,
            name: event.name,
            description: event.description,
            start_date: event.startDate,
            end_date: event.endDate,
            location: event.location,
            banner_url: event.bannerUrl,
            logo_url: event.logoUrl,
            status: event.status,
            invitation_code_required: event.invitationCodeRequired,
            form_config: event.formConfig,
            email_config: event.emailConfig,
            confirmation_message: event.confirmationMessage,
            created_at: event.createdAt,
            deleted_at: event.deletedAt,
            event_categories: event.categories
          };
        }
      }
    } catch (err) {
      // Fallback
    }

    let query = supabase.from('events').select('*, event_categories(*)').eq('id', id);
    if (!includeDeleted) query = query.is('deleted_at', null);

    const { data } = await query.maybeSingle();
    return data;
  },

  async create(data) {
    const { name, description, start_date, end_date, location, banner_url, logo_url, invitation_code_required, form_config, confirmation_message, email_config } = data;
    const defaultConfig = form_config || {
      fields: [
        { id: "first_name", label: "Nombre", visible: true, required: true, order: 1 },
        { id: "last_name", label: "Apellido", visible: true, required: true, order: 2 },
        { id: "email", label: "Correo electrónico", visible: true, required: true, order: 3 },
        { id: "company", label: "Empresa", visible: true, required: false, order: 4 },
        { id: "job_title", label: "Cargo", visible: true, required: false, order: 5 },
        { id: "category", label: "Categoría", visible: true, required: false, order: 6 }
      ],
      custom_fields: [],
      styling: {
        background_color: "#f8fafc",
        primary_color: "#2563eb",
        text_color: "#1e293b",
        custom_css: ""
      }
    };

    try {
      if (prisma && prisma.event) {
        const newEvent = await prisma.event.create({
          data: {
            name,
            description,
            startDate: start_date ? new Date(start_date) : new Date(),
            endDate: end_date ? new Date(end_date) : null,
            location,
            bannerUrl: banner_url,
            logoUrl: logo_url,
            status: 'active',
            invitationCodeRequired: invitation_code_required || false,
            formConfig: defaultConfig,
            emailConfig: email_config || null,
            confirmationMessage: confirmation_message || '¡Confirmación Exitosa! Revisa tu correo para acceder a tu entrada.',
            categories: {
              create: [
                { name: 'VIP' },
                { name: 'General' }
              ]
            }
          }
        });
        
        return {
          ...newEvent,
          start_date: newEvent.startDate,
          end_date: newEvent.endDate,
          banner_url: newEvent.bannerUrl,
          logo_url: newEvent.logoUrl,
          invitation_code_required: newEvent.invitationCodeRequired,
          form_config: newEvent.formConfig,
          email_config: newEvent.emailConfig,
          confirmation_message: newEvent.confirmationMessage,
          created_at: newEvent.createdAt,
          deleted_at: newEvent.deletedAt
        };
      }
    } catch (err) {
      console.error("Prisma error in EventModel.create:", err);
      throw err;
    }

    // Fallback original a Supabase
    const { data: newEvent, error } = await supabase
      .from('events')
      .insert([
        {
          name,
          description,
          start_date: start_date || new Date().toISOString(),
          end_date,
          location,
          banner_url,
          logo_url,
          status: 'active',
          invitation_code_required: invitation_code_required || false,
          form_config: defaultConfig,
          email_config: email_config || null,
          confirmation_message: confirmation_message || '¡Confirmación Exitosa! Revisa tu correo para acceder a tu entrada.'
        }
      ])
      .select()
      .single();

    if (error) throw error;

    // Crear categorías por defecto
    await supabase.from('event_categories').insert([
      { event_id: newEvent.id, name: 'VIP' },
      { event_id: newEvent.id, name: 'General' }
    ]);

    return newEvent;
  },

  /**
   * Actualizar evento
   */
  async update(id, updates) {
    try {
      if (prisma && prisma.event) {
        const prismaData = {};
        if (updates.name !== undefined) prismaData.name = updates.name;
        if (updates.description !== undefined) prismaData.description = updates.description;
        if (updates.start_date !== undefined) prismaData.startDate = updates.start_date ? new Date(updates.start_date) : null;
        if (updates.end_date !== undefined) prismaData.endDate = updates.end_date ? new Date(updates.end_date) : null;
        if (updates.location !== undefined) prismaData.location = updates.location;
        if (updates.banner_url !== undefined) prismaData.bannerUrl = updates.banner_url;
        if (updates.logo_url !== undefined) prismaData.logoUrl = updates.logo_url;
        if (updates.status !== undefined) prismaData.status = updates.status;
        if (updates.invitation_code_required !== undefined) prismaData.invitationCodeRequired = updates.invitation_code_required;
        if (updates.form_config !== undefined) prismaData.formConfig = updates.form_config;
        if (updates.email_config !== undefined) prismaData.emailConfig = updates.email_config;
        if (updates.confirmation_message !== undefined) prismaData.confirmationMessage = updates.confirmation_message;
        if (updates.deleted_at !== undefined) prismaData.deletedAt = updates.deleted_at ? new Date(updates.deleted_at) : null;

        const updatedEvent = await prisma.event.update({
          where: { id },
          data: prismaData
        });

        return {
          ...updatedEvent,
          start_date: updatedEvent.startDate,
          end_date: updatedEvent.endDate,
          banner_url: updatedEvent.bannerUrl,
          logo_url: updatedEvent.logoUrl,
          invitation_code_required: updatedEvent.invitationCodeRequired,
          form_config: updatedEvent.formConfig,
          email_config: updatedEvent.emailConfig,
          confirmation_message: updatedEvent.confirmationMessage,
          created_at: updatedEvent.createdAt,
          deleted_at: updatedEvent.deletedAt
        };
      }
    } catch (err) {
      console.error("Prisma error in EventModel.update:", err);
    }

    const { data, error } = await supabase
      .from('events')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Soft Delete de evento
   */
  async softDelete(id) {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('events')
      .update({ deleted_at: now, status: 'inactive' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Restaurar evento eliminado lógicamente
   */
  async restore(id) {
    const { data, error } = await supabase
      .from('events')
      .update({ deleted_at: null, status: 'active' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Eliminar evento permanentemente
   */
  async permanentDelete(id) {
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
};
