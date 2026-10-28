const db = require('../db/dbAdapter');
const { intervalsOverlap } = require('../utils/timeUtils');

class MaintenanceService {
  async getMaintenanceBlocks(filters = {}) {
    return await db.getMaintenanceBlocks(filters);
  }

  async scheduleMaintenance(payload, currentUser) {
    const { equipment_id, maintenance_type, technician_name, start_time, end_time, notes } = payload;

    if (!equipment_id || !maintenance_type || !technician_name || !start_time || !end_time) {
      const err = new Error('Equipment, maintenance type, technician name, start time, and end time are required.');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const startMs = new Date(start_time).getTime();
    const endMs = new Date(end_time).getTime();

    if (isNaN(startMs) || isNaN(endMs) || endMs <= startMs) {
      const err = new Error('End time must be strictly after start time.');
      err.status = 400;
      throw err;
    }

    const equipment = await db.getEquipmentById(equipment_id);
    if (!equipment) {
      const err = new Error('Equipment not found.');
      err.status = 404;
      throw err;
    }

    // Check if there are active bookings colliding with this maintenance window
    const existingBookings = await db.getBookings({ equipment_id });
    const collidingBookings = existingBookings.filter(
      (b) =>
        ['confirmed', 'checked_in', 'pending_approval'].includes(b.status) &&
        intervalsOverlap(startMs, endMs, b.start_time, b.end_time)
    );

    const block = await db.createMaintenanceBlock({
      equipment_id,
      created_by: currentUser.id,
      maintenance_type,
      technician_name: technician_name.trim(),
      start_time: new Date(start_time).toISOString(),
      end_time: new Date(end_time).toISOString(),
      notes: notes ? notes.trim() : 'Scheduled maintenance lockout',
      status: 'scheduled'
    });

    // If maintenance window is active right now, put instrument into maintenance mode
    const now = Date.now();
    if (now >= startMs && now <= endMs) {
      await db.updateEquipmentStatus(equipment_id, 'maintenance');
      await db.updateMaintenanceBlock(block.id, { status: 'in_progress' });
      block.status = 'in_progress';
    }

    await db.logAudit(currentUser.id, 'MAINTENANCE_LOCK_ENGAGED', 'maintenance_blocks', block.id, {
      equipment_name: equipment.name,
      maintenance_type,
      colliding_bookings_count: collidingBookings.length
    });

    return {
      maintenanceBlock: block,
      collidingBookingsCount: collidingBookings.length,
      collidingBookings,
      message: collidingBookings.length > 0
        ? `Maintenance scheduled. Note: ${collidingBookings.length} booking(s) collide with this block and may require operator rescheduling.`
        : 'Maintenance block successfully locked. No existing bookings affected.'
    };
  }

  async updateStatus(id, newStatus, currentUser) {
    const valid = ['scheduled', 'in_progress', 'completed'];
    if (!valid.includes(newStatus)) {
      const err = new Error(`Invalid status "${newStatus}". Must be one of: ${valid.join(', ')}`);
      err.status = 400;
      throw err;
    }

    const blocks = await db.getMaintenanceBlocks();
    const target = blocks.find((b) => b.id === id);
    if (!target) {
      const err = new Error('Maintenance block not found.');
      err.status = 404;
      throw err;
    }

    const updated = await db.updateMaintenanceBlock(id, { status: newStatus });

    // If completed, check if any other active blocks exist; if none, restore equipment status to available
    if (newStatus === 'completed') {
      const remainingActive = blocks.filter(
        (b) => b.equipment_id === target.equipment_id && b.id !== id && ['scheduled', 'in_progress'].includes(b.status)
      );
      if (remainingActive.length === 0) {
        await db.updateEquipmentStatus(target.equipment_id, 'available');
      }
    } else if (newStatus === 'in_progress') {
      await db.updateEquipmentStatus(target.equipment_id, 'maintenance');
    }

    await db.logAudit(currentUser.id, `MAINTENANCE_${newStatus.toUpperCase()}`, 'maintenance_blocks', id, {
      equipment_id: target.equipment_id,
      status: newStatus
    });

    return updated;
  }
}

module.exports = new MaintenanceService();
