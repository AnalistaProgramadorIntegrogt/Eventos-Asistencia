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

  { id: 'VIEW_GUESTS', name: 'Ver Invitados', category: 'Invitados' },
  { id: 'MANAGE_GUESTS', name: 'Administrar Invitados', category: 'Invitados' },
  
  { id: 'SCAN_QR', name: 'Escanear QR', category: 'Check-in' },
  { id: 'MANUAL_CHECKIN', name: 'Check-in Manual', category: 'Check-in' },

  { id: 'VIEW_DASHBOARD', name: 'Ver Dashboard', category: 'Dashboard' },
  { id: 'MANAGE_USERS', name: 'Administrar Usuarios', category: 'Administración' },

  { id: 'CUSTOMIZE_FORM', name: 'Diseñar Formulario', category: 'Personalización' },
  { id: 'CUSTOMIZE_SCANNER', name: 'Diseñar Escáner QR', category: 'Personalización' },
  { id: 'CUSTOMIZE_EMAIL', name: 'Plantillas de Correo', category: 'Personalización' },
];

// Mapa de permisos escalable
export const PERMISSIONS = {
  // Eventos
  CREATE_EVENTS: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  EDIT_EVENTS: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  DELETE_EVENTS: [ROLES.SUPER_ADMIN], // Solo el super admin puede borrar eventos
  VIEW_EVENTS: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.OPERATOR],

  // Usuarios del sistema
  MANAGE_USERS: [ROLES.SUPER_ADMIN], // Solo super admin puede crear/borrar usuarios y cambiar roles
  VIEW_USERS: [ROLES.SUPER_ADMIN, ROLES.ADMIN],

  // Asistentes (Guests)
  MANAGE_GUESTS: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  VIEW_GUESTS: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.OPERATOR],

  // Check-In y QR
  SCAN_QR: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.OPERATOR],
  MANUAL_CHECKIN: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.OPERATOR],

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
