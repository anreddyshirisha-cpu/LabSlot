// api.js - Centralized REST Client for Lab-Slot System

const API = {
  baseUrl: '/api',

  getToken() {
    return localStorage.getItem('lab_auth_token') || null;
  },

  setToken(token) {
    if (token) {
      localStorage.setItem('lab_auth_token', token);
    } else {
      localStorage.removeItem('lab_auth_token');
    }
  },

  getDemoRole() {
    return localStorage.getItem('lab_demo_role') || 'student';
  },

  setDemoRole(role) {
    localStorage.setItem('lab_demo_role', role);
  },

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Include demo role header to allow smooth multi-role evaluation
    const demoRole = this.getDemoRole();
    if (demoRole) {
      headers['x-demo-role'] = demoRole;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const error = new Error(data.error || `HTTP error ${response.status}`);
        error.status = response.status;
        error.code = data.code;
        error.details = data.details;
        throw error;
      }

      return data;
    } catch (err) {
      throw err;
    }
  },

  // Auth endpoints
  auth: {
    login: (email, password) => API.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),
    register: (userData) => API.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    }),
    me: () => API.request('/auth/me'),
    switchDemoRole: (role) => API.request('/auth/switch-demo-role', {
      method: 'POST',
      body: JSON.stringify({ role })
    })
  },

  // Equipment endpoints
  equipment: {
    list: (filters = {}) => {
      const params = new URLSearchParams();
      if (filters.category && filters.category !== 'all') params.append('category', filters.category);
      if (filters.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters.is_restricted !== undefined && filters.is_restricted !== 'all') params.append('is_restricted', filters.is_restricted);
      if (filters.search) params.append('search', filters.search);
      return API.request(`/equipment?${params.toString()}`);
    },
    get: (id) => API.request(`/equipment/${id}`),
    create: (payload) => API.request('/equipment', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
    update: (id, payload) => API.request(`/equipment/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),
    updateStatus: (id, status) => API.request(`/equipment/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    })
  },

  // Bookings & Conflict Prevention endpoints
  bookings: {
    list: (filters = {}) => {
      const params = new URLSearchParams();
      if (filters.equipment_id) params.append('equipment_id', filters.equipment_id);
      if (filters.user_id) params.append('user_id', filters.user_id);
      if (filters.status && filters.status !== 'all') params.append('status', filters.status);
      return API.request(`/bookings?${params.toString()}`);
    },
    get: (id) => API.request(`/bookings/${id}`),
    create: (payload) => API.request('/bookings', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
    checkConflict: (payload) => API.request('/bookings/check-conflict', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
    getTimetable: (equipmentId, startDate = null) => {
      const qs = startDate ? `?startDate=${encodeURIComponent(startDate)}` : '';
      return API.request(`/bookings/timetable/${equipmentId}${qs}`);
    },
    cancel: (id, reason) => API.request(`/bookings/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    }),
    checkIn: (id) => API.request(`/bookings/${id}/check-in`, {
      method: 'POST'
    }),
    complete: (id) => API.request(`/bookings/${id}/complete`, {
      method: 'POST'
    })
  },

  // Restricted Approvals endpoints
  approvals: {
    list: (filters = {}) => {
      const qs = filters.status && filters.status !== 'all' ? `?status=${filters.status}` : '';
      return API.request(`/approvals${qs}`);
    },
    review: (id, decision, notes = '') => API.request(`/approvals/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ decision, notes })
    })
  },

  // Handover Checklists endpoints
  checklists: {
    getByBooking: (bookingId) => API.request(`/checklists/booking/${bookingId}`),
    submit: (bookingId, payload) => API.request(`/checklists/booking/${bookingId}`, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  // Maintenance Locks endpoints
  maintenance: {
    list: (filters = {}) => {
      const params = new URLSearchParams();
      if (filters.equipment_id) params.append('equipment_id', filters.equipment_id);
      if (filters.status && filters.status !== 'all') params.append('status', filters.status);
      return API.request(`/maintenance?${params.toString()}`);
    },
    schedule: (payload) => API.request('/maintenance', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
    updateStatus: (id, status) => API.request(`/maintenance/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    })
  },

  // Incident & Damage Reporting endpoints
  incidents: {
    list: (filters = {}) => {
      const qs = filters.equipment_id ? `?equipment_id=${filters.equipment_id}` : '';
      return API.request(`/incidents${qs}`);
    },
    report: (payload) => API.request('/incidents', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
    updateStatus: (id, status) => API.request(`/incidents/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    })
  },

  // Analytics & Operational Telemetry
  analytics: {
    getMetrics: () => API.request('/analytics/metrics'),
    getAuditLogs: (limit = 30) => API.request(`/analytics/audit-logs?limit=${limit}`)
  }
};
