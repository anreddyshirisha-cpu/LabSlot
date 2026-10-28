// Unified Database Adapter: Seamlessly operates with live Supabase PostgreSQL
const crypto = require('crypto');
const { supabase, isConfigured } = require('./supabaseClient');
const { getSeedData } = require('./seedData');
const { intervalsOverlap, isBookingOverdue } = require('../utils/timeUtils');

// Local in-memory persistent store initialized from seed data as fallback
let localStore = getSeedData();

function refreshOverdueBookings() {
  const now = Date.now();
  localStore.bookings.forEach((b) => {
    if (b.status === 'checked_in') {
      const endTime = new Date(b.end_time).getTime();
      if (now > endTime) {
        b.status = 'overdue';
        b.updated_at = new Date().toISOString();
      }
    }
  });
}
setInterval(refreshOverdueBookings, 60000);

const db = {
  // --------------------------------------------------------------------------
  // USERS
  // --------------------------------------------------------------------------
  async getUserByEmail(email) {
    if (isConfigured()) {
      const { data, error } = await supabase.from('users').select('*').ilike('email', email.trim()).single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    }
    return localStore.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  async getUserById(id) {
    if (isConfigured()) {
      const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    }
    return localStore.users.find((u) => u.id === id) || null;
  },

  async createUser(userData) {
    const id = userData.id || crypto.randomUUID();
    const record = { ...userData, id, created_at: new Date().toISOString() };
    if (isConfigured()) {
      const { data, error } = await supabase.from('users').insert(record).select().single();
      if (error) throw error;
      return data;
    }
    localStore.users.push(record);
    return record;
  },

  // --------------------------------------------------------------------------
  // EQUIPMENT
  // --------------------------------------------------------------------------
  async getEquipmentList(filters = {}) {
    if (isConfigured()) {
      let query = supabase.from('equipment').select('*').order('name');
      if (filters.category && filters.category !== 'all') query = query.eq('category', filters.category);
      if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);
      if (filters.is_restricted !== undefined) query = query.eq('is_restricted', filters.is_restricted === 'true' || filters.is_restricted === true);
      const { data, error } = await query;
      if (error) throw error;

      if (filters.search) {
        const q = filters.search.toLowerCase();
        return (data || []).filter(
          (e) =>
            e.name.toLowerCase().includes(q) ||
            e.code.toLowerCase().includes(q) ||
            e.lab_location.toLowerCase().includes(q) ||
            e.building.toLowerCase().includes(q)
        );
      }
      return data || [];
    }

    refreshOverdueBookings();
    let result = [...localStore.equipment];
    if (filters.category && filters.category !== 'all') {
      result = result.filter((e) => e.category.toLowerCase() === filters.category.toLowerCase());
    }
    if (filters.status && filters.status !== 'all') {
      result = result.filter((e) => e.status === filters.status);
    }
    if (filters.is_restricted !== undefined) {
      const restrictedBool = filters.is_restricted === 'true' || filters.is_restricted === true;
      result = result.filter((e) => e.is_restricted === restrictedBool);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.code.toLowerCase().includes(q) ||
          e.lab_location.toLowerCase().includes(q) ||
          e.building.toLowerCase().includes(q)
      );
    }
    return result;
  },

  async getEquipmentById(id) {
    if (isConfigured()) {
      const { data, error } = await supabase.from('equipment').select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    }
    return localStore.equipment.find((e) => e.id === id) || null;
  },

  async updateEquipmentStatus(id, status) {
    if (isConfigured()) {
      const { data, error } = await supabase.from('equipment').update({ status, updated_at: new Date().toISOString() }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    }
    const item = localStore.equipment.find((e) => e.id === id);
    if (!item) throw new Error('Equipment not found');
    item.status = status;
    item.updated_at = new Date().toISOString();
    return item;
  },

  async createEquipment(item) {
    const id = item.id || crypto.randomUUID();
    const record = { ...item, id, created_at: new Date().toISOString() };
    if (isConfigured()) {
      const { data, error } = await supabase.from('equipment').insert(record).select().single();
      if (error) throw error;
      return data;
    }
    localStore.equipment.push(record);
    return record;
  },

  async updateEquipment(id, updates) {
    if (isConfigured()) {
      const { data, error } = await supabase.from('equipment').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    }
    const idx = localStore.equipment.findIndex((e) => e.id === id);
    if (idx === -1) throw new Error('Equipment not found');
    localStore.equipment[idx] = { ...localStore.equipment[idx], ...updates, updated_at: new Date().toISOString() };
    return localStore.equipment[idx];
  },

  // --------------------------------------------------------------------------
  // BOOKINGS & CONFLICT DETECTION
  // --------------------------------------------------------------------------
  async getBookings(filters = {}) {
    if (isConfigured()) {
      let query = supabase.from('bookings').select('*, equipment(*), users(id, full_name, email, department, role)').order('start_time', { ascending: true });
      if (filters.equipment_id) query = query.eq('equipment_id', filters.equipment_id);
      if (filters.user_id) query = query.eq('user_id', filters.user_id);
      if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }

    refreshOverdueBookings();
    let list = localStore.bookings.map((b) => {
      const eq = localStore.equipment.find((e) => e.id === b.equipment_id) || {};
      const us = localStore.users.find((u) => u.id === b.user_id) || {};
      return {
        ...b,
        equipment: eq,
        users: { id: us.id, full_name: us.full_name, email: us.email, department: us.department, role: us.role }
      };
    });

    if (filters.equipment_id) list = list.filter((b) => b.equipment_id === filters.equipment_id);
    if (filters.user_id) list = list.filter((b) => b.user_id === filters.user_id);
    if (filters.status && filters.status !== 'all') list = list.filter((b) => b.status === filters.status);
    return list.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
  },

  async getBookingById(id) {
    if (!id || id === 'null' || id === 'undefined') return null;
    if (isConfigured()) {
      const { data, error } = await supabase.from('bookings').select('*, equipment(*), users(id, full_name, email, department, role)').eq('id', id).single();
      if (error) throw error;
      return data;
    }
    const b = localStore.bookings.find((item) => item.id === id);
    if (!b) return null;
    const eq = localStore.equipment.find((e) => e.id === b.equipment_id) || {};
    const us = localStore.users.find((u) => u.id === b.user_id) || {};
    return {
      ...b,
      equipment: eq,
      users: { id: us.id, full_name: us.full_name, email: us.email, department: us.department, role: us.role }
    };
  },

  async checkSlotConflict(equipmentId, startTime, endTime, excludeBookingId = null) {
    const reqStart = new Date(startTime).getTime();
    const reqEnd = new Date(endTime).getTime();

    // 1. Check existing active bookings
    let existingBookings = [];
    if (isConfigured()) {
      const { data } = await supabase
        .from('bookings')
        .select('*')
        .eq('equipment_id', equipmentId)
        .in('status', ['confirmed', 'checked_in', 'pending_approval']);
      existingBookings = data || [];
    } else {
      existingBookings = localStore.bookings.filter(
        (b) =>
          b.equipment_id === equipmentId &&
          ['confirmed', 'checked_in', 'pending_approval'].includes(b.status) &&
          b.id !== excludeBookingId
      );
    }

    for (const b of existingBookings) {
      if (excludeBookingId && b.id === excludeBookingId) continue;
      if (intervalsOverlap(reqStart, reqEnd, b.start_time, b.end_time)) {
        return {
          conflict: true,
          type: 'BOOKING_CONFLICT',
          reason: `Requested time slot clashes with an existing ${b.status.replace('_', ' ')} booking: "${b.title}" (${new Date(b.start_time).toLocaleTimeString()} - ${new Date(b.end_time).toLocaleTimeString()}).`,
          conflictingItem: b
        };
      }
    }

    // 2. Check maintenance blocks
    let maintBlocks = [];
    if (isConfigured()) {
      const { data } = await supabase
        .from('maintenance_blocks')
        .select('*')
        .eq('equipment_id', equipmentId)
        .in('status', ['scheduled', 'in_progress']);
      maintBlocks = data || [];
    } else {
      maintBlocks = localStore.maintenance_blocks.filter(
        (m) =>
          m.equipment_id === equipmentId &&
          ['scheduled', 'in_progress'].includes(m.status)
      );
    }

    for (const m of maintBlocks) {
      if (intervalsOverlap(reqStart, reqEnd, m.start_time, m.end_time)) {
        return {
          conflict: true,
          type: 'MAINTENANCE_LOCK',
          reason: `Requested time slot clashes with scheduled ${m.maintenance_type} maintenance (${new Date(m.start_time).toLocaleTimeString()} - ${new Date(m.end_time).toLocaleTimeString()}).`,
          conflictingItem: m
        };
      }
    }

    return { conflict: false, reason: null, conflictingItem: null };
  },

  async createBooking(bookingData) {
    const id = bookingData.id || crypto.randomUUID();
    const record = {
      ...bookingData,
      id,
      conflict_detected: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (isConfigured()) {
      const { data, error } = await supabase.from('bookings').insert(record).select().single();
      if (error) throw error;
      return data;
    }
    localStore.bookings.push(record);
    return record;
  },

  async updateBooking(id, updates) {
    const updated_at = new Date().toISOString();
    if (isConfigured()) {
      const { data, error } = await supabase.from('bookings').update({ ...updates, updated_at }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    }
    const idx = localStore.bookings.findIndex((b) => b.id === id);
    if (idx === -1) throw new Error('Booking not found');
    localStore.bookings[idx] = { ...localStore.bookings[idx], ...updates, updated_at };
    return localStore.bookings[idx];
  },

  // --------------------------------------------------------------------------
  // APPROVALS
  // --------------------------------------------------------------------------
  async getApprovals(filters = {}) {
    if (isConfigured()) {
      let query = supabase.from('approvals').select('*, bookings(*, equipment(*), users(*))').order('created_at', { ascending: false });
      if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }

    let list = localStore.approvals.map((app) => {
      const booking = localStore.bookings.find((b) => b.id === app.booking_id) || {};
      const equipment = localStore.equipment.find((e) => e.id === booking.equipment_id) || {};
      const user = localStore.users.find((u) => u.id === booking.user_id) || {};
      const reviewer = app.reviewed_by ? localStore.users.find((u) => u.id === app.reviewed_by) : null;
      return {
        ...app,
        bookings: { ...booking, equipment, users: user },
        reviewed_by_user: reviewer
      };
    });

    if (filters.status && filters.status !== 'all') {
      list = list.filter((a) => a.status === filters.status);
    }
    return list;
  },

  async createApproval(approvalData) {
    const id = approvalData.id || crypto.randomUUID();
    const record = { ...approvalData, id, status: 'pending', created_at: new Date().toISOString() };
    if (isConfigured()) {
      const { data, error } = await supabase.from('approvals').insert(record).select().single();
      if (error) throw error;
      return data;
    }
    localStore.approvals.push(record);
    return record;
  },

  async reviewApproval(id, reviewerId, status, reviewNotes) {
    const reviewed_at = new Date().toISOString();
    if (isConfigured()) {
      const { data, error } = await supabase
        .from('approvals')
        .update({ status, reviewed_by: reviewerId, review_notes: reviewNotes, reviewed_at })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    const item = localStore.approvals.find((a) => a.id === id);
    if (!item) throw new Error('Approval request not found');
    item.status = status;
    item.reviewed_by = reviewerId;
    item.review_notes = reviewNotes;
    item.reviewed_at = reviewed_at;
    return item;
  },

  // --------------------------------------------------------------------------
  // CHECKLISTS
  // --------------------------------------------------------------------------
  async getChecklistsByBooking(bookingId) {
    if (!bookingId || bookingId === 'null' || bookingId === 'undefined') return [];
    if (isConfigured()) {
      const { data, error } = await supabase.from('checklists').select('*, conducted_by_user:users(*)').eq('booking_id', bookingId).order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    }
    return localStore.checklists
      .filter((c) => c.booking_id === bookingId)
      .map((c) => ({
        ...c,
        conducted_by_user: localStore.users.find((u) => u.id === c.conducted_by) || null
      }));
  },

  async createChecklist(checklistData) {
    const id = checklistData.id || crypto.randomUUID();
    const record = { ...checklistData, id, created_at: new Date().toISOString() };
    if (isConfigured()) {
      const { data, error } = await supabase.from('checklists').insert(record).select().single();
      if (error) throw error;
      return data;
    }
    localStore.checklists.push(record);
    return record;
  },

  // --------------------------------------------------------------------------
  // MAINTENANCE BLOCKS
  // --------------------------------------------------------------------------
  async getMaintenanceBlocks(filters = {}) {
    if (isConfigured()) {
      let query = supabase.from('maintenance_blocks').select('*, equipment(*), users(*)').order('start_time', { ascending: false });
      if (filters.equipment_id) query = query.eq('equipment_id', filters.equipment_id);
      if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }
    let list = localStore.maintenance_blocks.map((m) => {
      const eq = localStore.equipment.find((e) => e.id === m.equipment_id) || {};
      const creator = localStore.users.find((u) => u.id === m.created_by) || {};
      return { ...m, equipment: eq, users: creator };
    });
    if (filters.equipment_id) list = list.filter((m) => m.equipment_id === filters.equipment_id);
    if (filters.status && filters.status !== 'all') list = list.filter((m) => m.status === filters.status);
    return list;
  },

  async createMaintenanceBlock(maintData) {
    const id = maintData.id || crypto.randomUUID();
    const record = { ...maintData, id, status: maintData.status || 'scheduled', created_at: new Date().toISOString() };
    if (isConfigured()) {
      const { data, error } = await supabase.from('maintenance_blocks').insert(record).select().single();
      if (error) throw error;
      return data;
    }
    localStore.maintenance_blocks.push(record);
    return record;
  },

  async updateMaintenanceBlock(id, updates) {
    if (isConfigured()) {
      const { data, error } = await supabase.from('maintenance_blocks').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    }
    const idx = localStore.maintenance_blocks.findIndex((m) => m.id === id);
    if (idx === -1) throw new Error('Maintenance block not found');
    localStore.maintenance_blocks[idx] = { ...localStore.maintenance_blocks[idx], ...updates };
    return localStore.maintenance_blocks[idx];
  },

  // --------------------------------------------------------------------------
  // INCIDENTS & DAMAGE
  // --------------------------------------------------------------------------
  async getIncidents(filters = {}) {
    if (isConfigured()) {
      let query = supabase.from('incidents_damage').select('*, equipment(*), users(*)').order('created_at', { ascending: false });
      if (filters.equipment_id) query = query.eq('equipment_id', filters.equipment_id);
      if (filters.repair_status && filters.repair_status !== 'all') query = query.eq('repair_status', filters.repair_status);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }
    let list = localStore.incidents_damage.map((i) => {
      const eq = localStore.equipment.find((e) => e.id === i.equipment_id) || {};
      const reporter = localStore.users.find((u) => u.id === i.reported_by) || {};
      return { ...i, equipment: eq, users: reporter };
    });
    if (filters.equipment_id) list = list.filter((i) => i.equipment_id === filters.equipment_id);
    if (filters.repair_status && filters.repair_status !== 'all') list = list.filter((i) => i.repair_status === filters.repair_status);
    return list;
  },

  async createIncident(incidentData) {
    const id = incidentData.id || crypto.randomUUID();
    const record = { ...incidentData, id, repair_status: 'open', created_at: new Date().toISOString() };
    if (isConfigured()) {
      const { data, error } = await supabase.from('incidents_damage').insert(record).select().single();
      if (error) throw error;
      return data;
    }
    localStore.incidents_damage.push(record);
    return record;
  },

  async updateIncident(id, updates) {
    if (isConfigured()) {
      const { data, error } = await supabase.from('incidents_damage').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    }
    const idx = localStore.incidents_damage.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error('Incident not found');
    localStore.incidents_damage[idx] = { ...localStore.incidents_damage[idx], ...updates };
    return localStore.incidents_damage[idx];
  },

  // --------------------------------------------------------------------------
  // AUDIT LOGS
  // --------------------------------------------------------------------------
  async logAudit(userId, action, entityType, entityId, details = {}, ip = '127.0.0.1') {
    const id = crypto.randomUUID();
    // Validate entityId format; if not a valid UUID, pass null
    const isValidUuid = typeof entityId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(entityId);
    const safeEntityId = isValidUuid ? entityId : null;

    const record = {
      id,
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: safeEntityId,
      details,
      ip_address: ip,
      created_at: new Date().toISOString()
    };
    if (isConfigured()) {
      try {
        await supabase.from('audit_logs').insert(record);
      } catch (err) {
        console.warn('Audit log write warning:', err.message);
      }
    }
    localStore.audit_logs.unshift(record);
    if (localStore.audit_logs.length > 200) localStore.audit_logs.pop();
    return record;
  },

  async getAuditLogs(limit = 50) {
    if (isConfigured()) {
      const { data, error } = await supabase.from('audit_logs').select('*, users(full_name, email, role)').order('created_at', { ascending: false }).limit(limit);
      if (error) throw error;
      return data || [];
    }
    return localStore.audit_logs.slice(0, limit).map((a) => ({
      ...a,
      users: localStore.users.find((u) => u.id === a.user_id) || null
    }));
  },

  resetLocalStore() {
    localStore = getSeedData();
    return localStore;
  },

  getLocalStore() {
    return localStore;
  }
};

module.exports = db;
