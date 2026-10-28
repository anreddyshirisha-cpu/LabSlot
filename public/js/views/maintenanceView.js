// maintenanceView.js - Maintenance Lockout Manager for Operators & Facility Admins

const MaintenanceView = {
  init() {
    this.bindEvents();
    this.loadMaintenance();
  },

  bindEvents() {
    const openBtn = document.getElementById('btn-open-schedule-maintenance');
    const form = document.getElementById('form-schedule-maintenance');

    if (openBtn) {
      openBtn.addEventListener('click', () => this.openScheduleModal());
    }

    if (form) {
      form.onsubmit = (e) => this.handleScheduleSubmit(e);
    }
  },

  async loadMaintenance() {
    const tbody = document.getElementById('maintenance-tbody');
    if (!tbody) return;

    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 32px; color: var(--text-dim);">
          <div class="spinner" style="margin: 0 auto 8px auto;"></div>
          Scanning maintenance blocks & lockout periods...
        </td>
      </tr>
    `;

    try {
      const res = await API.maintenance.list();
      const blocks = res.data || [];

      if (blocks.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align: center; padding: 48px; color: var(--text-dim);">
              <div style="font-size: 28px; margin-bottom: 8px;">⚙️</div>
              <div style="font-size: 14px; color: #fff;">No Maintenance Blocks Active</div>
              <div style="font-size: 12px; margin-top: 4px;">All shared laboratory instruments are operating without scheduled downtime.</div>
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = blocks.map((m) => this.renderRow(m)).join('');
      this.bindRowActions();
    } catch (err) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 32px; color: #ef4444;">
            Failed to load maintenance records: ${err.message}
          </td>
        </tr>
      `;
    }
  },

  renderRow(m) {
    const statusMap = {
      scheduled: { label: 'Scheduled Lock', class: 'pending' },
      in_progress: { label: 'In Progress (Active Lock)', class: 'maintenance' },
      completed: { label: 'Completed', class: 'completed' }
    };

    const statusInfo = statusMap[m.status] || { label: m.status, class: 'maintenance' };
    const sDate = new Date(m.start_time);
    const eDate = new Date(m.end_time);

    const timeStr = `${sDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${sDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${eDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${eDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    const equipName = m.equipment ? m.equipment.name : 'Instrument';
    const equipCode = m.equipment ? m.equipment.code : '';

    return `
      <tr data-maint-id="${m.id}">
        <td>
          <span class="status-pill ${statusInfo.class}">${statusInfo.label}</span>
        </td>
        <td>
          <div style="font-weight: 600; color: #fff;">${equipName}</div>
          <div class="mono-font" style="font-size: 11px; color: var(--cyan-primary);">${equipCode}</div>
        </td>
        <td>
          <span style="font-family: var(--font-mono); font-size: 11px; text-transform: uppercase; color: #fdba74;">
            ${m.maintenance_type.replace('_', ' ')}
          </span>
        </td>
        <td>
          <div class="mono-font" style="font-size: 11px; color: #fff;">${timeStr}</div>
          <div style="font-size: 10px; color: var(--text-dim);">
            Duration: ${((eDate - sDate) / 3600000).toFixed(1)} hrs locked
          </div>
        </td>
        <td>
          <div style="font-size: 12px; color: #fff;">${m.technician_name}</div>
        </td>
        <td>
          <div style="font-size: 12px; max-width: 240px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;" title="${m.notes || ''}">
            ${m.notes || '—'}
          </div>
        </td>
        <td>
          <div class="flex items-center gap-2">
            ${m.status === 'scheduled' ? `
              <button class="btn btn-warning btn-sm btn-maint-start" data-id="${m.id}">
                Start Work
              </button>
            ` : ''}

            ${m.status === 'in_progress' ? `
              <button class="btn btn-primary btn-sm btn-maint-complete" data-id="${m.id}">
                Complete & Restore
              </button>
            ` : ''}

            ${m.status === 'completed' ? `
              <span style="font-size: 11px; color: var(--text-dim); font-family: var(--font-mono);">Resolved</span>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  },

  bindRowActions() {
    // Start maintenance
    document.querySelectorAll('.btn-maint-start').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        try {
          await API.maintenance.updateStatus(id, 'in_progress');
          showToast('Maintenance begun. Instrument locked to "In Maintenance" mode.', 'warning');
          MaintenanceView.loadMaintenance();
          CatalogueView.loadEquipment();
          LandingView.refreshTelemetry();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });

    // Complete maintenance
    document.querySelectorAll('.btn-maint-complete').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        try {
          await API.maintenance.updateStatus(id, 'completed');
          showToast('Maintenance completed. Instrument restored to available fleet inventory!', 'success');
          MaintenanceView.loadMaintenance();
          CatalogueView.loadEquipment();
          LandingView.refreshTelemetry();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });
  },

  openScheduleModal() {
    const select = document.getElementById('maint-equipment-id');
    if (select) {
      select.innerHTML = State.equipmentList.map((e) => `
        <option value="${e.id}">${e.name} (${e.code})</option>
      `).join('');
    }

    // Default dates (tomorrow 09:00 to 15:00)
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
    tomorrow.setHours(9, 0, 0, 0);
    const endTomorrow = new Date(tomorrow.getTime() + 6 * 3600 * 1000);

    const formatLocal = (d) => {
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    document.getElementById('maint-start-time').value = formatLocal(tomorrow);
    document.getElementById('maint-end-time').value = formatLocal(endTomorrow);
    document.getElementById('maint-tech-name').value = '';
    document.getElementById('maint-notes').value = '';

    openModal('modal-maintenance');
  },

  async handleScheduleSubmit(e) {
    e.preventDefault();

    const payload = {
      equipment_id: document.getElementById('maint-equipment-id').value,
      maintenance_type: document.getElementById('maint-type').value,
      technician_name: document.getElementById('maint-tech-name').value.trim(),
      start_time: new Date(document.getElementById('maint-start-time').value).toISOString(),
      end_time: new Date(document.getElementById('maint-end-time').value).toISOString(),
      notes: document.getElementById('maint-notes').value.trim()
    };

    try {
      const res = await API.maintenance.schedule(payload);
      closeModal('modal-maintenance');

      showToast(res.message, res.collidingBookingsCount > 0 ? 'warning' : 'success', 5000);

      MaintenanceView.loadMaintenance();
      CatalogueView.loadEquipment();
      LandingView.refreshTelemetry();
    } catch (err) {
      showToast(`Failed to schedule maintenance: ${err.message}`, 'error');
    }
  }
};
