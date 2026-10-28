const express = require('express');
const router = express.Router();
const maintenanceService = require('../services/maintenanceService');
const { authenticate, optionalAuth, requireRoles } = require('../middleware/auth');

// GET /api/maintenance (Public/All users can see scheduled maintenance windows)
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const filters = {
      equipment_id: req.query.equipment_id,
      status: req.query.status
    };
    const blocks = await maintenanceService.getMaintenanceBlocks(filters);
    res.json({
      success: true,
      count: blocks.length,
      data: blocks
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/maintenance (Operator or Admin only)
router.post('/', authenticate, requireRoles('operator', 'admin'), async (req, res, next) => {
  try {
    const result = await maintenanceService.scheduleMaintenance(req.body, req.user);
    res.status(201).json({
      success: true,
      data: result.maintenanceBlock,
      collidingBookingsCount: result.collidingBookingsCount,
      collidingBookings: result.collidingBookings,
      message: result.message
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/maintenance/:id/status (Operator or Admin only)
router.patch('/:id/status', authenticate, requireRoles('operator', 'admin'), async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, error: 'Status is required.' });
    }
    const updated = await maintenanceService.updateStatus(req.params.id, status, req.user);
    res.json({
      success: true,
      data: updated,
      message: `Maintenance status updated to ${status}.`
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
