const db = require('../db/dbAdapter');

class ApprovalService {
  async getApprovals(filters = {}) {
    return await db.getApprovals(filters);
  }

  async reviewApproval(approvalId, reviewerUser, decision, reviewNotes) {
    if (!['approved', 'rejected'].includes(decision)) {
      const err = new Error('Decision must be either "approved" or "rejected".');
      err.status = 400;
      err.code = 'INVALID_DECISION';
      throw err;
    }

    const approvals = await db.getApprovals();
    const targetApproval = approvals.find((a) => a.id === approvalId);

    if (!targetApproval) {
      const err = new Error(`Approval request "${approvalId}" not found.`);
      err.status = 404;
      err.code = 'APPROVAL_NOT_FOUND';
      throw err;
    }

    if (targetApproval.status !== 'pending') {
      const err = new Error(`This request has already been reviewed (Status: ${targetApproval.status}).`);
      err.status = 400;
      throw err;
    }

    // Update approval record
    const updatedApproval = await db.reviewApproval(approvalId, reviewerUser.id, decision, reviewNotes);

    // Update corresponding booking
    const newBookingStatus = decision === 'approved' ? 'confirmed' : 'rejected';
    await db.updateBooking(targetApproval.booking_id, {
      status: newBookingStatus,
      cancellation_reason: decision === 'rejected' ? (reviewNotes || 'Rejected by lab supervisor') : null
    });

    // Audit log
    await db.logAudit(reviewerUser.id, `RESTRICTED_BOOKING_${decision.toUpperCase()}`, 'approval', approvalId, {
      booking_id: targetApproval.booking_id,
      reviewer: reviewerUser.full_name,
      notes: reviewNotes
    });

    return {
      approval: updatedApproval,
      bookingStatus: newBookingStatus,
      message: `Request successfully ${decision}. Booking status updated to ${newBookingStatus}.`
    };
  }
}

module.exports = new ApprovalService();
