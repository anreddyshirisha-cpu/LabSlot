const db = require('../db/dbAdapter');
const { validateSlotWindow } = require('../utils/timeUtils');

class BookingService {
  async getBookings(filters, currentUser) {
    // If regular student/user, they only see their own private bookings, unless filtering for timetable
    const queryFilters = { ...filters };
    if (currentUser && currentUser.role === 'student' && !filters.equipment_id) {
      queryFilters.user_id = currentUser.id;
    }
    return await db.getBookings(queryFilters);
  }

  async getBookingById(id, currentUser) {
    const booking = await db.getBookingById(id);
    if (!booking) {
      const err = new Error(`Booking with ID "${id}" was not found.`);
      err.status = 404;
      err.code = 'BOOKING_NOT_FOUND';
      throw err;
    }

    // Role check: users can only view their own bookings; operators & admins can view all
    if (currentUser && currentUser.role === 'student' && booking.user_id !== currentUser.id) {
      const err = new Error('Access Denied: You do not have permission to view another researcher\'s booking.');
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    return booking;
  }

  async createBooking(payload, currentUser) {
    const { equipment_id, title, research_purpose, start_time, end_time } = payload;

    if (!equipment_id || !start_time || !end_time) {
      const err = new Error('Equipment, start time, and end time are required fields.');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    // 1. Verify equipment existence and status
    const equipment = await db.getEquipmentById(equipment_id);
    if (!equipment) {
      const err = new Error(`Selected equipment instrument "${equipment_id}" does not exist.`);
      err.status = 404;
      err.code = 'EQUIPMENT_NOT_FOUND';
      throw err;
    }

    if (equipment.status === 'decommissioned') {
      const err = new Error('Cannot book an instrument that has been permanently decommissioned.');
      err.status = 400;
      err.code = 'INSTRUMENT_DECOMMISSIONED';
      throw err;
    }

    // 2. Validate time interval and duration limits
    const validation = validateSlotWindow(start_time, end_time, equipment.max_booking_hours);
    if (!validation.valid) {
      const err = new Error(validation.error);
      err.status = 400;
      err.code = 'INVALID_TIME_SLOT';
      throw err;
    }

    // 3. ATOMIC OVERLAP CONFLICT PREVENTION
    const conflictCheck = await db.checkSlotConflict(equipment_id, start_time, end_time);
    if (conflictCheck.conflict) {
      // Record conflict prevented in audit logs for operational metrics
      await db.logAudit(
        currentUser.id,
        'BOOKING_CONFLICT_PREVENTED',
        'booking',
        equipment_id,
        {
          conflictType: conflictCheck.type,
          reason: conflictCheck.reason,
          requestedStart: start_time,
          requestedEnd: end_time
        }
      );

      const err = new Error(`Conflict Detected: ${conflictCheck.reason}`);
      err.status = 409; // 409 Conflict
      err.code = conflictCheck.type;
      err.details = conflictCheck;
      throw err;
    }

    // 4. RESTRICTED EQUIPMENT APPROVAL FLOW
    // If the instrument is restricted, booking enters 'pending_approval'
    const isRestricted = equipment.is_restricted;
    const initialStatus = isRestricted ? 'pending_approval' : 'confirmed';

    const booking = await db.createBooking({
      equipment_id,
      user_id: currentUser.id,
      title: title ? title.trim() : `Reservation on ${equipment.name}`,
      research_purpose: research_purpose ? research_purpose.trim() : 'Unspecified academic research',
      start_time: new Date(start_time).toISOString(),
      end_time: new Date(end_time).toISOString(),
      status: initialStatus
    });

    // If restricted, automatically create an approval queue record
    let approval = null;
    if (isRestricted) {
      approval = await db.createApproval({
        booking_id: booking.id,
        status: 'pending'
      });
    }

    // Audit log
    await db.logAudit(
      currentUser.id,
      isRestricted ? 'RESTRICTED_BOOKING_REQUESTED' : 'BOOKING_CONFIRMED',
      'booking',
      booking.id,
      {
        equipment_name: equipment.name,
        is_restricted: isRestricted,
        status: initialStatus,
        start_time,
        end_time
      }
    );

    return {
      booking: { ...booking, equipment },
      approval,
      message: isRestricted
        ? 'Restricted instrument: Booking submitted and awaiting operator approval.'
        : 'Booking confirmed successfully. No overlaps detected.'
    };
  }

  async cancelBooking(id, reason, currentUser) {
    const booking = await this.getBookingById(id, currentUser);

    if (['completed', 'cancelled', 'rejected'].includes(booking.status)) {
      const err = new Error(`Cannot cancel a booking that is already ${booking.status}.`);
      err.status = 400;
      throw err;
    }

    const updated = await db.updateBooking(id, {
      status: 'cancelled',
      cancellation_reason: reason || 'Cancelled by user'
    });

    // If equipment was in_use for this booking, reset equipment status to available
    if (booking.status === 'checked_in') {
      await db.updateEquipmentStatus(booking.equipment_id, 'available');
    }

    await db.logAudit(currentUser.id, 'BOOKING_CANCELLED', 'booking', id, { reason });
    return updated;
  }

  async checkIn(id, currentUser) {
    const booking = await this.getBookingById(id, currentUser);

    if (booking.status !== 'confirmed') {
      const err = new Error(`Cannot check in for booking with status "${booking.status}". Booking must be confirmed.`);
      err.status = 400;
      throw err;
    }

    const updated = await db.updateBooking(id, { status: 'checked_in' });
    await db.updateEquipmentStatus(booking.equipment_id, 'in_use');

    await db.logAudit(currentUser.id, 'SESSION_CHECKED_IN', 'booking', id, {
      equipment_id: booking.equipment_id
    });

    return updated;
  }

  async completeSession(id, currentUser) {
    const booking = await this.getBookingById(id, currentUser);

    if (!['checked_in', 'overdue'].includes(booking.status)) {
      const err = new Error(`Cannot complete booking with status "${booking.status}". Must be checked_in or overdue.`);
      err.status = 400;
      throw err;
    }

    const updated = await db.updateBooking(id, { status: 'completed' });
    await db.updateEquipmentStatus(booking.equipment_id, 'available');

    await db.logAudit(currentUser.id, 'SESSION_COMPLETED', 'booking', id, {
      equipment_id: booking.equipment_id
    });

    return updated;
  }

  /**
   * Generates a 7-day hourly grid for timetable visualization
   */
  async getTimetableGrid(equipmentId, startDateStr) {
    const equipment = await db.getEquipmentById(equipmentId);
    if (!equipment) {
      const err = new Error('Equipment not found');
      err.status = 404;
      throw err;
    }

    const start = startDateStr ? new Date(startDateStr) : new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    // Fetch all bookings in this 7-day range
    const bookings = await db.getBookings({
      equipment_id: equipmentId,
      startDate: start.toISOString(),
      endDate: end.toISOString()
    });

    // Fetch maintenance blocks
    const maintBlocks = await db.getMaintenanceBlocks({
      equipment_id: equipmentId
    });

    return {
      equipment,
      rangeStart: start.toISOString(),
      rangeEnd: end.toISOString(),
      bookings: bookings.filter((b) => ['confirmed', 'checked_in', 'pending_approval', 'overdue'].includes(b.status)),
      maintenance: maintBlocks.filter((m) => ['scheduled', 'in_progress'].includes(m.status))
    };
  }
}

module.exports = new BookingService();
