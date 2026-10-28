// Utility functions for laboratory slot calculations and interval collision detection

/**
 * Checks if two half-open intervals [startA, endA) and [startB, endB) overlap.
 * Standard mathematical definition: (startA < endB) && (endA > startB)
 */
function intervalsOverlap(startA, endA, startB, endB) {
  const sA = new Date(startA).getTime();
  const eA = new Date(endA).getTime();
  const sB = new Date(startB).getTime();
  const eB = new Date(endB).getTime();

  return sA < eB && eA > sB;
}

/**
 * Calculates buffer interval around a booking if required
 */
function applyBuffer(date, bufferMinutes, direction = 'after') {
  const d = new Date(date);
  const ms = bufferMinutes * 60 * 1000;
  return direction === 'after' ? new Date(d.getTime() + ms) : new Date(d.getTime() - ms);
}

/**
 * Validates that end is strictly after start and duration is within allowed maximum
 */
function validateSlotWindow(startTime, endTime, maxHours = 4) {
  const s = new Date(startTime).getTime();
  const e = new Date(endTime).getTime();

  if (isNaN(s) || isNaN(e)) {
    return { valid: false, error: 'Invalid date or time format provided.' };
  }

  if (e <= s) {
    return { valid: false, error: 'End time must be strictly after start time.' };
  }

  const durationMs = e - s;
  const maxMs = maxHours * 3600 * 1000;

  if (durationMs > maxMs) {
    return { valid: false, error: `Booking duration exceeds instrument limit of ${maxHours} hours.` };
  }

  const minMs = 15 * 60 * 1000; // minimum 15 mins
  if (durationMs < minMs) {
    return { valid: false, error: 'Booking slot must be at least 15 minutes long.' };
  }

  return { valid: true };
}

/**
 * Determines whether a booking is overdue
 */
function isBookingOverdue(endTime, graceMinutes = 15) {
  const now = Date.now();
  const end = new Date(endTime).getTime();
  const graceMs = graceMinutes * 60 * 1000;
  return now > (end + graceMs);
}

module.exports = {
  intervalsOverlap,
  applyBuffer,
  validateSlotWindow,
  isBookingOverdue
};
