const express = require('express');
const router = express.Router();
const checklistService = require('../services/checklistService');
const { authenticate } = require('../middleware/auth');

// GET /api/checklists/booking/:bookingId
router.get('/booking/:bookingId', authenticate, async (req, res, next) => {
  try {
    const list = await checklistService.getChecklistsByBooking(req.params.bookingId);
    res.json({
      success: true,
      data: list
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/checklists/booking/:bookingId
router.post('/booking/:bookingId', authenticate, async (req, res, next) => {
  try {
    const result = await checklistService.submitChecklist(req.params.bookingId, req.body, req.user);
    res.status(201).json({
      success: true,
      data: result.checklist,
      bookingStatus: result.bookingStatus,
      equipmentStatus: result.equipmentStatus,
      message: result.message
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
