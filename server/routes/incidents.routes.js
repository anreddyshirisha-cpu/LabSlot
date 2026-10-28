const express = require('express');
const router = express.Router();
const incidentService = require('../services/incidentService');
const { authenticate, optionalAuth, requireRoles } = require('../middleware/auth');

// GET /api/incidents
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const filters = {
      equipment_id: req.query.equipment_id,
      repair_status: req.query.repair_status
    };
    const incidents = await incidentService.getIncidents(filters);
    res.json({
      success: true,
      count: incidents.length,
      data: incidents
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/incidents (Any authenticated user can file an incident report)
router.post('/', authenticate, async (req, res, next) => {
  try {
    const result = await incidentService.reportIncident(req.body, req.user);
    res.status(201).json({
      success: true,
      data: result.incident,
      message: result.message
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/incidents/:id/status (Operator or Admin updates repair status)
router.patch('/:id/status', authenticate, requireRoles('operator', 'admin'), async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, error: 'Status is required.' });
    }
    const updated = await incidentService.updateIncidentStatus(req.params.id, status, req.user);
    res.json({
      success: true,
      data: updated,
      message: `Incident repair status changed to ${status}.`
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
