// userBookingsView.js - User Reservations Dashboard & Handover Workflow Actions

const UserBookingsView = {
  init() {
    this.bindEvents();
    this.loadBookings();
  },

  bindEvents() {
    const filterSelect = document.getElementById('bookings-filter-status');
    const refreshBtn = document.getElementById('btn-refresh-bookings');

    if (filterSelect) {
      filterSelect.addEventListener('change', () => this.loadBookings());
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.loadBookings());
    }
  },

  async loadBookings() {
    const tbody = document.getElementById('bookings-tbody');
    if (!tbody) return;

    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 32px; color: var(--text-dim);">
          <div class="spinner" style="margin: 0 auto 8px auto;"></div>
          Fetching active research bookings...
        </td>
      </tr>
    `;

    try {
      const statusFilter = document.getElementById('bookings-filter-status')?.value || 'all';
      const res = await API.bookings.list({ status: statusFilter });
      const bookings = res.data || [];

      if (bookings.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; padding: 48px; color: var(--text-dim);">
              <div style="font-size: 28px; margin-bottom: 8px;">📋</div>
              <div style="font-size: 14px; color: #fff; margin-bottom: 4px;">No Bookings Found</div>
              <div style="font-size: 12px;">You do not have any bookings matching the current filter.</div>
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = bookings.map((b) => this.renderRow(b)).join('');
      this.bindRowActions();
    } catch (err) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 32px; color: #ef4444;">
            Failed to retrieve bookings: ${err.message}
          </td>
        </tr>
      `;
    }
  },

  renderRow(b) {
    const statusMap = {
      confirmed: { label: 'Confirmed', class: 'available' },
      checked_in: { label: 'Checked In', class: 'in_use' },
      pending_approval: { label: 'Pending Approval', class: 'pending_approval' },
      overdue: { label: 'Overdue Alert', class: 'overdue' },
      completed: { label: 'Completed', class: 'completed' },
      cancelled: { label: 'Cancelled', class: 'completed' },
      rejected: { label: 'Rejected', class: 'rejected' }
    };

    const statusInfo = statusMap[b.status] || { label: b.status, class: 'available' };
    const sDate = new Date(b.start_time);
    const eDate = new Date(b.end_time);

    const timeFormatted = `${sDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${sDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${eDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    const equipName = b.equipment ? b.equipment.name : 'Laboratory Instrument';
    const equipCode = b.equipment ? b.equipment.code : '';
    const researcherName = b.users ? b.users.full_name : 'Researcher';
    const researcherDept = b.users ? b.users.department : '';

    return `
      <tr data-booking-id="${b.id}">
        <td>
          <span class="status-pill ${statusInfo.class}">${statusInfo.label}</span>
        </td>
        <td>
          <div style="font-weight: 600; color: #fff;">${equipName}</div>
          <div class="mono-font" style="font-size: 11px; color: var(--cyan-primary);">${equipCode}</div>
        </td>
        <td>
          <div class="mono-font" style="font-size: 12px;">${timeFormatted}</div>
          <div style="font-size: 11px; color: var(--text-dim); margin-top: 2px;">
            Duration: ${((eDate - sDate) / 3600000).toFixed(1)} hrs
          </div>
        </td>
        <td>
          <div style="font-size: 13px; color: #fff; max-width: 260px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
            ${b.title}
          </div>
          <div style="font-size: 11px; color: var(--text-dim); max-width: 260px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
            ${b.research_purpose}
          </div>
        </td>
        <td>
          <div style="font-size: 12px; font-weight: 500;">${researcherName}</div>
          <div style="font-size: 10px; color: var(--text-dim);">${researcherDept}</div>
        </td>
        <td>
          <div class="flex items-center gap-2">
            ${b.status === 'confirmed' ? `
              <button class="btn btn-primary btn-sm btn-action-checkin" data-id="${b.id}">
                Pre-Run Check-In
              </button>
              <button class="btn btn-outline btn-sm btn-action-cancel" data-id="${b.id}">
                Cancel
              </button>
            ` : ''}

            ${['checked_in', 'overdue'].includes(b.status) ? `
              <button class="btn btn-warning btn-sm btn-action-return" data-id="${b.id}">
                Return & Finalize
              </button>
            ` : ''}

            ${b.status === 'pending_approval' ? `
              <span style="font-size: 11px; color: var(--status-pending); font-family: var(--font-mono);">Awaiting Operator</span>
              <button class="btn btn-outline btn-sm btn-action-cancel" data-id="${b.id}" style="margin-left: 6px;">
                Cancel
              </button>
            ` : ''}

            ${['completed', 'cancelled', 'rejected'].includes(b.status) ? `
              <button class="btn btn-outline btn-sm btn-view-handover" data-id="${b.id}">
                View Checklist
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  },

  bindRowActions() {
    // Check-in (Issue checklist)
    document.querySelectorAll('.btn-action-checkin').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        ChecklistModal.open(id, 'issue');
      });
    });

    // Return (Post-run checklist)
    document.querySelectorAll('.btn-action-return').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        ChecklistModal.open(id, 'return');
      });
    });

    // Cancel
    document.querySelectorAll('.btn-action-cancel').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const reason = prompt('Please specify a reason for cancellation (e.g. sample preparation delayed):');
        if (reason === null) return;

        try {
          await API.bookings.cancel(id, reason);
          showToast('Booking cancelled. Slot has been released back into available inventory.', 'info');
          UserBookingsView.loadBookings();
          CatalogueView.loadEquipment();
          LandingView.refreshTelemetry();
        } catch (err) {
          showToast(`Cancellation error: ${err.message}`, 'error');
        }
      });
    });

    // View checklist
    document.querySelectorAll('.btn-view-handover').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        try {
          const res = await API.checklists.getByBooking(id);
          const lists = res.data || [];
          if (lists.length === 0) {
            showToast('No safety handover checklists were logged for this session.', 'info');
            return;
          }
          const summary = lists.map((l) => `[${l.checklist_type.toUpperCase()}]: Condition ${l.physical_condition_rating}/5 - ${l.notes || 'All checks OK'}`).join('\n');
          alert(`Handover Audit Records:\n\n${summary}`);
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });
  }
};
