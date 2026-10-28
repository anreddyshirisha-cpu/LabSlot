const db = require('../db/dbAdapter');

class EquipmentService {
  async listEquipment(filters = {}) {
    return await db.getEquipmentList(filters);
  }

  async getEquipmentById(id) {
    const item = await db.getEquipmentById(id);
    if (!item) {
      const err = new Error(`Equipment instrument with ID "${id}" was not found.`);
      err.status = 404;
      err.code = 'EQUIPMENT_NOT_FOUND';
      throw err;
    }
    return item;
  }

  async createEquipment(payload, creatorUser) {
    if (!payload.name || !payload.code || !payload.category || !payload.lab_location) {
      const err = new Error('Name, instrument code, category, and lab location are required fields.');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const created = await db.createEquipment({
      code: payload.code.toUpperCase().trim(),
      name: payload.name.trim(),
      category: payload.category,
      lab_location: payload.lab_location,
      building: payload.building || 'Main Science Complex',
      room: payload.room || 'General Lab',
      is_restricted: Boolean(payload.is_restricted),
      status: payload.status || 'available',
      hourly_rate: parseFloat(payload.hourly_rate || 0),
      buffer_time_mins: parseInt(payload.buffer_time_mins || 15, 10),
      max_booking_hours: parseInt(payload.max_booking_hours || 4, 10),
      specs: payload.specs || {},
      safety_instructions: payload.safety_instructions || 'Follow standard GLP protocols.',
      image_url: payload.image_url || 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=600&q=80'
    });

    await db.logAudit(creatorUser.id, 'EQUIPMENT_CREATED', 'equipment', created.id, {
      code: created.code,
      name: created.name
    });

    return created;
  }

  async updateEquipment(id, updates, user) {
    await this.getEquipmentById(id);
    const updated = await db.updateEquipment(id, updates);
    await db.logAudit(user.id, 'EQUIPMENT_UPDATED', 'equipment', id, updates);
    return updated;
  }

  async updateStatus(id, status, user) {
    const valid = ['available', 'in_use', 'maintenance', 'decommissioned'];
    if (!valid.includes(status)) {
      const err = new Error(`Invalid status "${status}". Allowed values: ${valid.join(', ')}`);
      err.status = 400;
      throw err;
    }
    const updated = await db.updateEquipmentStatus(id, status);
    await db.logAudit(user.id, 'EQUIPMENT_STATUS_CHANGED', 'equipment', id, { status });
    return updated;
  }
}

module.exports = new EquipmentService();
