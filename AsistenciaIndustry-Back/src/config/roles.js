export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  OPERATOR: 'operator',
};

export const AVAILABLE_PERMISSIONS = [
  { id: 'CREATE_EVENTS', name: 'Crear Eventos', category: 'Eventos' },
  { id: 'EDIT_EVENTS', name: 'Editar Eventos', category: 'Eventos' },
  { id: 'DELETE_EVENTS', name: 'Eliminar Eventos', category: 'Eventos' },
  { id: 'VIEW_EVENTS', name: 'Ver Eventos', category: 'Eventos' },

  { id: 'VIEW_GUESTS', name: 'Ver Listado de Invitados', category: 'Invitados' },
  { id: 'ADD_GUEST_SINGLE', name: 'Agregar Invitado VIP Individual', category: 'Invitados' },
  { id: 'IMPORT_GUESTS_EXCEL', name: 'Importar Excel / CSV Masivo', category: 'Invitados' },
  { id: 'EDIT_GUEST_INFO', name: 'Editar Datos Personales de Invitado (Nombre, Correo, Teléfono, Empresa, Cargo)', category: 'Invitados' },
  { id: 'EDIT_GUEST_RSVP', name: 'Cambiar Estado RSVP / Registro de Invitado (Confirmado, Pendiente, Cancelado)', category: 'Invitados' },
  { id: 'DELETE_GUEST', name: 'Eliminar / Cancelar Invitado', category: 'Invitados' },
  { id: 'VIEW_GUEST_QR', name: 'Ver / Descargar Código QR', category: 'Invitados' },
  { id: 'REGENERATE_GUEST_QR', name: 'Regenerar Código QR', category: 'Invitados' },
  { id: 'COPY_GUEST_LINK', name: 'Copiar Enlace Personalizado', category: 'Invitados' },
  
  { id: 'SCAN_QR_CHECKIN', name: 'Escanear QR (Cámara / Lector)', category: 'Check-in' },
  { id: 'MARK_ATTENDANCE_MANUAL', name: 'Marcar Asistencia Manual', category: 'Check-in' },
  { id: 'UNMARK_ATTENDANCE_MANUAL', name: 'Desmarcar Asistencia (Auditoría)', category: 'Check-in' },

  { id: 'VIEW_DASHBOARD', name: 'Ver Métricas y Dashboard', category: 'Dashboard' },
  { id: 'VIEW_USERS', name: 'Ver Directorio de Usuarios', category: 'Administración' },
  { id: 'MANAGE_USERS', name: 'Administrar Usuarios del Sistema', category: 'Administración' },
  { id: 'MANAGE_ROLES', name: 'Administrar Roles y Permisos', category: 'Administración' },

  { id: 'CUSTOMIZE_FORM', name: 'Diseñar Formulario de Registro', category: 'Personalización' },
  { id: 'CUSTOMIZE_SCANNER', name: 'Diseñar Pantalla de Escáner', category: 'Personalización' },
  { id: 'CUSTOMIZE_EMAIL', name: 'Personalizar Plantillas de Correo', category: 'Personalización' },
];

// Mapa de permisos escalable
export const PERMISSIONS = {
  // Eventos
  CREATE_EVENTS: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  EDIT_EVENTS: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  DELETE_EVENTS: [ROLES.SUPER_ADMIN],
  VIEW_EVENTS: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.OPERATOR],

  // Usuarios del sistema
  MANAGE_USERS: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  VIEW_USERS: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  MANAGE_ROLES: [ROLES.SUPER_ADMIN, ROLES.ADMIN],

  // Asistentes (Guests) Granular
  VIEW_GUESTS: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.OPERATOR],
  ADD_GUEST_SINGLE: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  IMPORT_GUESTS_EXCEL: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  EDIT_GUEST_INFO: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  EDIT_GUEST_RSVP: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  EDIT_GUEST: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  DELETE_GUEST: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  VIEW_GUEST_QR: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.OPERATOR],
  REGENERATE_GUEST_QR: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  COPY_GUEST_LINK: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.OPERATOR],
  MANAGE_GUESTS: [ROLES.SUPER_ADMIN, ROLES.ADMIN],

  // Check-In y QR Granular
  SCAN_QR: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.OPERATOR],
  SCAN_QR_CHECKIN: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.OPERATOR],
  MANUAL_CHECKIN: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.OPERATOR],
  MARK_ATTENDANCE_MANUAL: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.OPERATOR],
  UNMARK_ATTENDANCE_MANUAL: [ROLES.SUPER_ADMIN, ROLES.ADMIN],

  // Dashboard / Reportes
  VIEW_DASHBOARD: [ROLES.SUPER_ADMIN, ROLES.ADMIN],

  // Personalización
  CUSTOMIZE_FORM: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  CUSTOMIZE_SCANNER: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  CUSTOMIZE_EMAIL: [ROLES.SUPER_ADMIN, ROLES.ADMIN]
};

/**
 * Verifica si un rol tiene un permiso específico
 * @param {string} role - El rol del usuario
 * @param {string} permissionKey - La clave del permiso (ej: 'CREATE_EVENTS')
 * @returns {boolean}
 */
export function hasPermission(role, permissionKey) {
  const allowedRoles = PERMISSIONS[permissionKey];
  if (!allowedRoles) return false;
  return allowedRoles.includes(role);
}
