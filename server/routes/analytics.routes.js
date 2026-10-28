const express = require('express');
const router = express.Router();
const analyticsService = require('../services/analyticsService');
const db = require('../db/dbAdapter');
const { authenticate, optionalAuth, requireRoles } = require('../middleware/auth');

// GET /api/analytics/metrics (Public high-level overview or authenticated dashboard)
router.get('/metrics', optionalAuth, async (req, res, next) => {
  try {
    const metrics = await analyticsService.getMetrics();
    res.json({
      success: true,
      data: metrics
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/audit-logs (Admin only)
router.get('/audit-logs', authenticate, requireRoles('admin'), async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit || 50, 10);
    const logs = await db.getAuditLogs(limit);
    res.json({
      success: true,
      count: logs.length,
      data: logs
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
