const express = require('express');
const router = express.Router();
const equipmentService = require('../services/equipmentService');
const { authenticate, optionalAuth, requireRoles } = require('../middleware/auth');

// GET /api/equipment (Public / with filters)
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const filters = {
      category: req.query.category,
      status: req.query.status,
      is_restricted: req.query.is_restricted,
      search: req.query.search
    };
    const items = await equipmentService.listEquipment(filters);
    res.json({
      success: true,
      count: items.length,
      data: items
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/equipment/:id
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const item = await equipmentService.getEquipmentById(req.params.id);
    res.json({
      success: true,
      data: item
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/equipment (Operator or Admin only)
router.post('/', authenticate, requireRoles('operator', 'admin'), async (req, res, next) => {
  try {
    const created = await equipmentService.createEquipment(req.body, req.user);
    res.status(201).json({
      success: true,
      data: created,
      message: 'New laboratory instrument added to catalogue.'
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/equipment/:id (Operator or Admin only)
router.put('/:id', authenticate, requireRoles('operator', 'admin'), async (req, res, next) => {
  try {
    const updated = await equipmentService.updateEquipment(req.params.id, req.body, req.user);
    res.json({
      success: true,
      data: updated,
      message: 'Instrument specifications successfully updated.'
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/equipment/:id/status (Operator or Admin only)
router.patch('/:id/status', authenticate, requireRoles('operator', 'admin'), async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, error: 'Status is required.' });
    }
    const updated = await equipmentService.updateStatus(req.params.id, status, req.user);
    res.json({
      success: true,
      data: updated,
      message: `Instrument status updated to ${status}.`
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
