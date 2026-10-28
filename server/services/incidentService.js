const db = require('../db/dbAdapter');

class IncidentService {
  async getIncidents(filters = {}) {
    return await db.getIncidents(filters);
  }

  async reportIncident(payload, currentUser) {
    const { equipment_id, booking_id, incident_type, severity, description, estimated_downtime_hours } = payload;

    if (!equipment_id || !incident_type || !severity || !description) {
      const err = new Error('Equipment, incident type, severity, and description are required fields.');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const equipment = await db.getEquipmentById(equipment_id);
    if (!equipment) {
      const err = new Error('Equipment not found.');
      err.status = 404;
      throw err;
    }

    const downtime = parseFloat(estimated_downtime_hours || 0);

    const incident = await db.createIncident({
      equipment_id,
      booking_id: booking_id || null,
      reported_by: currentUser.id,
      incident_type,
      severity,
      description: description.trim(),
      estimated_downtime_hours: downtime
    });

    // If critical or moderate with substantial downtime, lock instrument status to maintenance
    if (severity === 'critical_downtime' || downtime >= 12) {
      await db.updateEquipmentStatus(equipment_id, 'maintenance');
    }

    await db.logAudit(currentUser.id, 'INCIDENT_REPORTED', 'incidents_damage', incident.id, {
      equipment_name: equipment.name,
      incident_type,
      severity,
      downtime_hours: downtime
    });

    return {
      incident,
      message: severity === 'critical_downtime'
        ? 'Critical incident recorded. Instrument has been automatically shifted to Maintenance mode.'
        : 'Incident report filed successfully.'
    };
  }

  async updateIncidentStatus(id, newStatus, currentUser) {
    const valid = ['open', 'repair_scheduled', 'resolved'];
    if (!valid.includes(newStatus)) {
      const err = new Error(`Invalid status "${newStatus}". Must be one of: ${valid.join(', ')}`);
      err.status = 400;
      throw err;
    }

    const updates = { repair_status: newStatus };
    if (newStatus === 'resolved') {
      updates.resolved_at = new Date().toISOString();
    }

    const updated = await db.updateIncident(id, updates);

    // If resolved, check if equipment should be restored to available
    if (newStatus === 'resolved' && updated.equipment_id) {
      const activeIncidents = (await db.getIncidents({ equipment_id: updated.equipment_id }))
        .filter((i) => i.id !== id && i.repair_status !== 'resolved' && i.severity === 'critical_downtime');

      const activeMaintenance = (await db.getMaintenanceBlocks({ equipment_id: updated.equipment_id }))
        .filter((m) => ['scheduled', 'in_progress'].includes(m.status));

      if (activeIncidents.length === 0 && activeMaintenance.length === 0) {
        await db.updateEquipmentStatus(updated.equipment_id, 'available');
      }
    }

    await db.logAudit(currentUser.id, `INCIDENT_STATUS_${newStatus.toUpperCase()}`, 'incidents_damage', id, {
      repair_status: newStatus
    });

    return updated;
  }
}

module.exports = new IncidentService();
