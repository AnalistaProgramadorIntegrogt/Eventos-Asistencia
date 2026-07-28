const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (window.location.hostname === 'localhost' && window.location.port !== '5001'
  ? 'http://localhost:5001/api'
  : '/api');

/**
 * Get stored Bearer authentication token from localStorage
 */
export function getAuthToken() {
  return localStorage.getItem('integro_access_token') || '';
}

/**
 * Store Bearer authentication token and user profile
 */
export function setAuthSession(token, user) {
  if (token) localStorage.setItem('integro_access_token', token);
  if (user) localStorage.setItem('integro_user', JSON.stringify(user));
}

/**
 * Clear stored auth session
 */
export function clearAuthSession() {
  localStorage.removeItem('integro_access_token');
  localStorage.removeItem('integro_user');
}

/**
 * Get stored user metadata
 */
export function getStoredUser() {
  try {
    const raw = localStorage.getItem('integro_user');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (e) {
    return null;
  }
}

/**
 * Helper to execute fetch request with Authorization Bearer header
 */
async function request(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    ...(options.headers || {})
  };

  // Add JSON Content-Type unless payload is FormData
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers
  });

  const json = await response.json().catch(() => ({ success: false, error: 'Error parseando respuesta del servidor' }));

  if (!response.ok && json.error) {
    throw new Error(json.error);
  }

  return json;
}

export const api = {
  // 1. Auth Endpoints
  auth: {
    login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    microsoft: (redirectTo) => request(`/auth/microsoft?redirectTo=${encodeURIComponent(redirectTo)}`),
    me: () => request('/auth/me'),
  },

  // 2. User CRUD Endpoints
  users: {
    list: (search = '', role = '') => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (role) params.append('role', role);
      return request(`/users?${params.toString()}`);
    },
    getPermissions: () => request('/roles/permissions'),
    getById: (id) => request(`/users/${id}`),
    create: (userData) => request('/users', { method: 'POST', body: JSON.stringify(userData) }),
    update: (id, userData) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(userData) }),
    delete: (id) => request(`/users/${id}`, { method: 'DELETE' })
  },

  // Roles CRUD Endpoints
  roles: {
    list: () => request('/roles'),
    create: (roleData) => request('/roles', { method: 'POST', body: JSON.stringify(roleData) }),
    update: (name, roleData) => request(`/roles/${name}`, { method: 'PUT', body: JSON.stringify(roleData) }),
    delete: (name) => request(`/roles/${name}`, { method: 'DELETE' })
  },

  // 3. Events Endpoints
  events: {
    list: () => request('/events'),
    getById: (id) => request(`/events/${id}`),
    create: (eventData) => request('/events', { method: 'POST', body: JSON.stringify(eventData) }),
    update: (id, eventData) => request(`/events/${id}`, { method: 'PUT', body: JSON.stringify(eventData) }),
    updateFormConfig: (eventId, formConfig) => request(`/events/${eventId}/form-config`, { method: 'PUT', body: JSON.stringify({ form_config: formConfig }) }),
    delete: (id) => request(`/events/${id}`, { method: 'DELETE' }),
    getEmailConfig: (eventId) => request(`/events/${eventId}/email-config`),
    updateEmailConfig: (eventId, configData) => request(`/events/${eventId}/email-config`, { method: 'PUT', body: JSON.stringify(configData) }),
    resetEmailConfig: (eventId) => request(`/events/${eventId}/email-config/reset`, { method: 'POST' })
  },

  // 4. Attendees CRUD Endpoints
  attendees: {
    list: (eventId, search = '', status = '') => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (status) params.append('status', status);
      return request(`/events/${eventId}/attendees?${params.toString()}`);
    },
    getById: (id) => request(`/attendees/${id}`),
    create: (eventId, attendeeData) => request(`/events/${eventId}/attendees`, { method: 'POST', body: JSON.stringify(attendeeData) }),
    update: (id, attendeeData) => request(`/attendees/${id}`, { method: 'PUT', body: JSON.stringify(attendeeData) }),
    delete: (id) => request(`/attendees/${id}`, { method: 'DELETE' })
  },

  // 5. Invitations & Form Submissions Endpoints
  invitations: {
    list: (eventId, search = '', status = '', categoryId = '') => {
      return api.invitations.listByEvent(eventId, { search, status, categoryId });
    },
    listByEvent: async (eventId, queryObj = {}) => {
      const search = typeof queryObj === 'string' ? queryObj : (queryObj.search || '');
      const status = typeof queryObj === 'object' ? (queryObj.status || '') : '';
      const categoryId = typeof queryObj === 'object' ? (queryObj.categoryId || '') : '';

      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (status) params.append('status', status);
      if (categoryId) params.append('category_id', categoryId);

      try {
        const [subRes, invRes] = await Promise.allSettled([
          request(`/events/${eventId}/form-submissions?${params.toString()}`),
          request(`/events/${eventId}/invitations?${params.toString()}`)
        ]);

        const formSubmissions = (subRes.status === 'fulfilled' && subRes.value?.data) ? subRes.value.data : [];
        const invitations = (invRes.status === 'fulfilled' && invRes.value?.data) ? invRes.value.data : [];

        const combinedMap = new Map();

        invitations.forEach(inv => {
          combinedMap.set(inv.id, {
            ...inv,
            full_name: inv.guest_name || inv.full_name || `${inv.first_name || ''} ${inv.last_name || ''}`.trim(),
            email: inv.guest_email || inv.email,
            category_name: inv.category_name || 'VIP',
            is_imported: true
          });
        });

        formSubmissions.forEach(sub => {
          if (!combinedMap.has(sub.id)) {
            combinedMap.set(sub.id, {
              ...sub,
              category_name: sub.category_name || 'General'
            });
          }
        });

        const combinedList = Array.from(combinedMap.values());

        const confirmedCount = combinedList.filter(i => i.status === 'confirmed' || i.attended).length;
        const pendingCount = combinedList.filter(i => !i.status || i.status === 'pending' || (!i.attended && i.status !== 'declined')).length;
        const declinedCount = combinedList.filter(i => i.status === 'declined').length;

        return {
          success: true,
          summary: {
            total_submissions: combinedList.length,
            confirmed_count: confirmedCount,
            pending_count: pendingCount,
            declined_count: declinedCount
          },
          data: combinedList
        };
      } catch (err) {
        console.error('Error al obtener lista combinada:', err);
        return { success: true, summary: { total_submissions: 0, confirmed_count: 0, pending_count: 0, declined_count: 0 }, data: [] };
      }
    },
    getFormSubmissions: (eventId, search = '', status = '', categoryId = '') => {
      return api.invitations.listByEvent(eventId, { search, status, categoryId });
    },
    create: (eventId, invitationData) => request(`/events/${eventId}/invitations`, { method: 'POST', body: JSON.stringify(invitationData) }),
    update: (id, invitationData) => request(`/invitations/${id}`, { method: 'PUT', body: JSON.stringify(invitationData) }),
    importExcel: (eventId, file) => {
      const formData = file instanceof FormData ? file : new FormData();
      if (!(file instanceof FormData)) {
        formData.append('file', file);
      }
      return request(`/events/${eventId}/invitations/import`, {
        method: 'POST',
        body: formData
      });
    },
    importCSV: (eventId, file) => api.invitations.importExcel(eventId, file),
    toggle: (id, is_active) => request(`/events/invitations/${id}/toggle`, { method: 'PUT', body: JSON.stringify({ is_active }) }),
    regenerate: (id) => request(`/events/invitations/${id}/regenerate`, { method: 'POST' })
  },

  // 6. Public Registration Endpoints
  public: {
    getEvent: (eventId) => request(`/public/events/${eventId}`),
    getInvitation: (eventId, code) => request(`/public/events/${eventId}/invitations/${code}`),
    register: (eventId, registerData) => request(`/public/events/${eventId}/register`, { method: 'POST', body: JSON.stringify(registerData) }),
    checkIn: (eventId, code) => request(`/public/events/${eventId}/checkin`, { method: 'POST', body: JSON.stringify({ qr_code: code }) })
  },

  // 6. QR Check-In & Manual Search Endpoints
  checkin: {
    scan: (eventId, qrCode, operatorName = 'Operador QR') => request('/checkin/scan', {
      method: 'POST',
      body: JSON.stringify({ event_id: eventId, qr_code: qrCode, operator_name: operatorName })
    }),
    search: (eventId, query = '') => request(`/checkin/events/${eventId}/search?query=${encodeURIComponent(query)}`),
    manualMark: (eventId, attendeeId, operatorName = 'Administrador (Manual)') => request('/checkin/manual', {
      method: 'POST',
      body: JSON.stringify({ event_id: eventId, attendee_id: attendeeId, operator_name: operatorName })
    }),
    manualUnmark: (eventId, attendeeId, operatorName = 'Administrador (Manual)', reason = '') => request('/checkin/manual/uncheck', {
      method: 'POST',
      body: JSON.stringify({ event_id: eventId, attendee_id: attendeeId, operator_name: operatorName, reason })
    })
  },

  // 7. Dashboard & Audit Metrics
  dashboard: {
    getMetrics: (eventId) => request(`/dashboard/events/${eventId}`)
  }
};
