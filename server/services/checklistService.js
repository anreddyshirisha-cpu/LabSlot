const db = require('../db/dbAdapter');

class ChecklistService {
  async getChecklistsByBooking(bookingId) {
    return await db.getChecklistsByBooking(bookingId);
  }

  async submitChecklist(bookingId, payload, currentUser) {
    const {
      checklist_type,
      cleanliness_ok = true,
      calibration_verified = true,
      consumables_replenished = true,
      safety_hazards_cleared = true,
      data_transferred = true,
      physical_condition_rating = 5,
      notes = ''
    } = payload;

    if (!['issue', 'return'].includes(checklist_type)) {
      const err = new Error('Checklist type must be either "issue" (pre-run handover) or "return" (post-run handover).');
      err.status = 400;
      err.code = 'INVALID_CHECKLIST_TYPE';
      throw err;
    }

    const booking = await db.getBookingById(bookingId);
    if (!booking) {
      const err = new Error('Booking not found.');
      err.status = 404;
      throw err;
    }

    // Role check: booking owner or operator/admin can complete checklist
    if (currentUser.role === 'student' && booking.user_id !== currentUser.id) {
      const err = new Error('Access Denied: You cannot submit a checklist for another user\'s session.');
      err.status = 403;
      throw err;
    }

    // Check rating boundary
    const rating = parseInt(physical_condition_rating, 10);
    if (isNaN(rating) || rating < 1 || rating > 5) {
      const err = new Error('Physical condition rating must be an integer between 1 and 5.');
      err.status = 400;
      throw err;
    }

    // Insert checklist
    const checklist = await db.createChecklist({
      booking_id: bookingId,
      checklist_type,
      conducted_by: currentUser.id,
      cleanliness_ok: Boolean(cleanliness_ok),
      calibration_verified: Boolean(calibration_verified),
      consumables_replenished: Boolean(consumables_replenished),
      safety_hazards_cleared: Boolean(safety_hazards_cleared),
      data_transferred: Boolean(data_transferred),
      physical_condition_rating: rating,
      notes: notes.trim()
    });

    // Workflow state transitions based on checklist type
    let newBookingStatus = booking.status;
    let newEquipmentStatus = booking.equipment.status;

    if (checklist_type === 'issue') {
      newBookingStatus = 'checked_in';
      newEquipmentStatus = 'in_use';
      await db.updateBooking(bookingId, { status: newBookingStatus });
      await db.updateEquipmentStatus(booking.equipment_id, newEquipmentStatus);
    } else if (checklist_type === 'return') {
      newBookingStatus = 'completed';
      newEquipmentStatus = 'available';
      await db.updateBooking(bookingId, { status: newBookingStatus });
      await db.updateEquipmentStatus(booking.equipment_id, newEquipmentStatus);

      // If condition is poor (1 or 2 stars), auto-generate incident report
      if (rating <= 2) {
        await db.createIncident({
          equipment_id: booking.equipment_id,
          booking_id: bookingId,
          reported_by: currentUser.id,
          incident_type: 'physical_damage',
          severity: rating === 1 ? 'critical_downtime' : 'moderate',
          description: `Flagged via Return Checklist (Condition: ${rating}/5): ${notes || 'Sub-standard equipment condition reported upon return.'}`,
          estimated_downtime_hours: rating === 1 ? 24 : 6
        });
      }
    }

    // Audit log
    await db.logAudit(
      currentUser.id,
      `CHECKLIST_${checklist_type.toUpperCase()}_SUBMITTED`,
      'checklists',
      checklist.id,
      {
        booking_id: bookingId,
        rating,
        equipment_id: booking.equipment_id,
        new_booking_status: newBookingStatus
      }
    );

    return {
      checklist,
      bookingStatus: newBookingStatus,
      equipmentStatus: newEquipmentStatus,
      message: checklist_type === 'issue'
        ? 'Pre-run handover checklist verified. Session active (Checked In).'
        : 'Post-run handover checklist completed. Instrument returned and slot finalized.'
    };
  }
}

module.exports = new ChecklistService();
