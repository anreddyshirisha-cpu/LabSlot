const express = require('express');
const router = express.Router();
const bookingService = require('../services/bookingService');
const db = require('../db/dbAdapter');
const { authenticate, optionalAuth } = require('../middleware/auth');

// GET /api/bookings
router.get('/', authenticate, async (req, res, next) => {
  try {
    const filters = {
      equipment_id: req.query.equipment_id,
      user_id: req.query.user_id,
      status: req.query.status
    };
    const bookings = await bookingService.getBookings(filters, req.user);
    res.json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/bookings/timetable/:equipmentId (Publicly accessible for viewing calendar)
router.get('/timetable/:equipmentId', optionalAuth, async (req, res, next) => {
  try {
    const { equipmentId } = req.params;
    const { startDate } = req.query;
    const timetable = await bookingService.getTimetableGrid(equipmentId, startDate);
    res.json({
      success: true,
      data: timetable
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/bookings/check-conflict (Dry-run conflict validator before submission)
router.post('/check-conflict', authenticate, async (req, res, next) => {
  try {
    const { equipment_id, start_time, end_time, exclude_booking_id } = req.body;
    if (!equipment_id || !start_time || !end_time) {
      return res.status(400).json({
        success: false,
        error: 'Equipment ID, start time, and end time are required.'
      });
    }

    const check = await db.checkSlotConflict(equipment_id, start_time, end_time, exclude_booking_id);
    res.json({
      success: true,
      conflict: check.conflict,
      reason: check.reason,
      conflictType: check.type || null
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/bookings/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const booking = await bookingService.getBookingById(req.params.id, req.user);
    res.json({
      success: true,
      data: booking
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/bookings (Requires authenticated student, operator, or admin)
router.post('/', authenticate, async (req, res, next) => {
  try {
    const result = await bookingService.createBooking(req.body, req.user);
    res.status(201).json({
      success: true,
      data: result.booking,
      approval: result.approval,
      message: result.message
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/bookings/:id/cancel
router.post('/:id/cancel', authenticate, async (req, res, next) => {
  try {
    const { reason } = req.body;
    const cancelled = await bookingService.cancelBooking(req.params.id, reason, req.user);
    res.json({
      success: true,
      data: cancelled,
      message: 'Booking successfully cancelled. Slot has been released.'
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/bookings/:id/check-in
router.post('/:id/check-in', authenticate, async (req, res, next) => {
  try {
    const checked = await bookingService.checkIn(req.params.id, req.user);
    res.json({
      success: true,
      data: checked,
      message: 'Checked in. Laboratory instrument is now in active use.'
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/bookings/:id/complete
router.post('/:id/complete', authenticate, async (req, res, next) => {
  try {
    const completed = await bookingService.completeSession(req.params.id, req.user);
    res.json({
      success: true,
      data: completed,
      message: 'Instrument session completed. Thank you for logging off.'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
