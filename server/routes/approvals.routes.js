const express = require('express');
const router = express.Router();
const approvalService = require('../services/approvalService');
const { authenticate, requireRoles } = require('../middleware/auth');

// GET /api/approvals (Operator or Admin can review queue)
router.get('/', authenticate, requireRoles('operator', 'admin'), async (req, res, next) => {
  try {
    const filters = {
      status: req.query.status
    };
    const approvals = await approvalService.getApprovals(filters);
    res.json({
      success: true,
      count: approvals.length,
      data: approvals
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/approvals/:id/review (Operator or Admin decision)
router.post('/:id/review', authenticate, requireRoles('operator', 'admin'), async (req, res, next) => {
  try {
    const { decision, notes } = req.body;
    if (!decision) {
      return res.status(400).json({ success: false, error: 'Decision ("approved" or "rejected") is required.' });
    }

    const result = await approvalService.reviewApproval(req.params.id, req.user, decision, notes);
    res.json({
      success: true,
      data: result.approval,
      bookingStatus: result.bookingStatus,
      message: result.message
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
