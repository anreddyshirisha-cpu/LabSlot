// approvalQueueView.js - Restricted Equipment Authorization Workbench for Operators & Admins

const ApprovalQueueView = {
  init() {
    this.bindEvents();
    this.loadApprovals();
  },

  bindEvents() {
    const filterSelect = document.getElementById('approvals-filter-status');
    const refreshBtn = document.getElementById('btn-refresh-approvals');

    if (filterSelect) {
      filterSelect.addEventListener('change', () => this.loadApprovals());
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.loadApprovals());
    }
  },

  async loadApprovals() {
    const container = document.getElementById('approvals-queue-container');
    const badge = document.getElementById('nav-badge-approvals');
    if (!container) return;

    container.innerHTML = `
      <div class="loading-box">
        <div class="spinner"></div>
        <p>Loading restricted equipment authorization requests...</p>
      </div>
    `;

    try {
      const statusFilter = document.getElementById('approvals-filter-status')?.value || 'pending';
      const res = await API.approvals.list({ status: statusFilter });
      const approvals = res.data || [];

      // Update badge with pending count
      const pendingCount = approvals.filter((a) => a.status === 'pending').length;
      if (badge) {
        badge.textContent = pendingCount;
        badge.style.display = pendingCount > 0 ? 'inline-block' : 'none';
      }

      if (approvals.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">🛡️</div>
            <div class="empty-title">No Requests Found</div>
            <div class="empty-desc">There are no restricted equipment requests matching status "${statusFilter}".</div>
          </div>
        `;
        return;
      }

      container.innerHTML = approvals.map((app) => this.renderCard(app)).join('');
      this.bindActions();
    } catch (err) {
      container.innerHTML = `
        <div class="empty-state" style="border-color: #ef4444;">
          <div class="empty-title" style="color: #ef4444;">Failed to Load Approvals</div>
          <div class="empty-desc">${err.message}</div>
        </div>
      `;
    }
  },

  renderCard(app) {
    const b = app.bookings || {};
    const equip = b.equipment || {};
    const user = b.users || {};

    const sDate = new Date(b.start_time);
    const eDate = new Date(b.end_time);
    const slotStr = `${sDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}, ${sDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${eDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    const statusBadgeMap = {
      pending: '<span class="status-pill pending">Pending Operator Review</span>',
      approved: '<span class="status-pill available">Authorized / Approved</span>',
      rejected: '<span class="status-pill rejected">Rejected</span>'
    };

    return `
      <div class="console-card" data-approval-id="${app.id}">
        <div class="flex justify-between items-start" style="margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
          <div>
            <span class="mono-font" style="font-size: 11px; color: var(--cyan-primary); font-weight: bold;">
              ${equip.code || 'EQUIPMENT'}
            </span>
            <h3 style="font-size: 16px; color: #fff; margin-top: 2px;">${equip.name || 'Restricted Instrument'}</h3>
          </div>
          <div>${statusBadgeMap[app.status] || app.status}</div>
        </div>

        <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; background: #080c14; border: 1px solid var(--border-dim); border-radius: var(--radius-sm); padding: 14px; margin-bottom: 16px; font-size: 12px;">
          <div>
            <div style="color: var(--text-dim); text-transform: uppercase; font-size: 10px; font-family: var(--font-mono);">Applicant / Researcher</div>
            <div style="color: #fff; font-weight: 600; font-size: 13px; margin-top: 2px;">${user.full_name || 'Researcher'}</div>
            <div style="color: var(--text-dim);">${user.department || 'Department'} • <span style="color: var(--cyan-primary);">${user.qualification_level || 'Tier Certified'}</span></div>
          </div>
          <div>
            <div style="color: var(--text-dim); text-transform: uppercase; font-size: 10px; font-family: var(--font-mono);">Requested Time Window</div>
            <div class="mono-font" style="color: #fff; font-size: 13px; margin-top: 2px;">${slotStr}</div>
            <div style="color: var(--text-dim);">Buffer Applied: +${equip.buffer_time_mins || 15} mins</div>
          </div>
        </div>

        <div style="margin-bottom: 16px; font-size: 13px;">
          <div style="font-size: 11px; color: var(--text-dim); text-transform: uppercase; font-family: var(--font-mono); margin-bottom: 4px;">Experimental Rationale</div>
          <div style="color: var(--text-main); line-height: 1.5; background: rgba(18, 27, 45, 0.5); padding: 10px 12px; border-radius: var(--radius-sm); border-left: 2px solid var(--border-dim);">
            <strong>${b.title}</strong>: ${b.research_purpose}
          </div>
        </div>

        ${app.review_notes ? `
          <div style="margin-bottom: 16px; font-size: 12px; background: rgba(31, 47, 76, 0.4); padding: 10px; border-radius: var(--radius-sm);">
            <span style="color: var(--text-dim);">Review Notes:</span> ${app.review_notes}
          </div>
        ` : ''}

        <div class="flex justify-between items-center" style="border-top: 1px solid rgba(31, 47, 76, 0.6); padding-top: 14px;">
          <div style="font-size: 11px; color: var(--text-dim);">
            Requested: ${new Date(app.created_at).toLocaleString()}
          </div>
          <div class="flex items-center gap-2">
            ${app.status === 'pending' ? `
              <button class="btn btn-outline btn-sm btn-reject-approval" data-id="${app.id}">
                ✕ Reject Request
              </button>
              <button class="btn btn-primary btn-sm btn-approve-approval" data-id="${app.id}">
                ✓ Authorize Slot
              </button>
            ` : `
              <span style="font-size: 11px; color: var(--text-dim); font-family: var(--font-mono);">
                Reviewed: ${app.reviewed_at ? new Date(app.reviewed_at).toLocaleDateString() : 'Yes'}
              </span>
            `}
          </div>
        </div>
      </div>
    `;
  },

  bindActions() {
    // Approve
    document.querySelectorAll('.btn-approve-approval').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const notes = prompt('Optional approval notes or special instructions for researcher:', 'Safety qualification verified. Authorized for operation.');
        if (notes === null) return;

        try {
          btn.disabled = true;
          await API.approvals.review(id, 'approved', notes);
          showToast('Restricted equipment booking authorized and confirmed!', 'success');
          ApprovalQueueView.loadApprovals();
          UserBookingsView.loadBookings();
          LandingView.refreshTelemetry();
        } catch (err) {
          showToast(`Approval failed: ${err.message}`, 'error');
          btn.disabled = false;
        }
      });
    });

    // Reject
    document.querySelectorAll('.btn-reject-approval').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const notes = prompt('Please specify the reason for rejection (required):', 'Missing prerequisite Level-2 certification for this instrument.');
        if (!notes) return;

        try {
          btn.disabled = true;
          await API.approvals.review(id, 'rejected', notes);
          showToast('Reservation rejected. Slot has been freed.', 'info');
          ApprovalQueueView.loadApprovals();
          UserBookingsView.loadBookings();
          LandingView.refreshTelemetry();
        } catch (err) {
          showToast(`Rejection failed: ${err.message}`, 'error');
          btn.disabled = false;
        }
      });
    });
  }
};
