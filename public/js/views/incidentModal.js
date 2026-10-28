// incidentModal.js - Damage, Misalignment & Incident Reports View and Form

const IncidentModal = {
  init() {
    this.bindEvents();
    this.loadIncidents();
  },

  bindEvents() {
    const openBtn = document.getElementById('btn-open-report-incident');
    const form = document.getElementById('form-report-incident');

    if (openBtn) {
      openBtn.addEventListener('click', () => this.openReportModal());
    }

    if (form) {
      form.onsubmit = (e) => this.handleIncidentSubmit(e);
    }
  },

  async loadIncidents() {
    const container = document.getElementById('incidents-container');
    if (!container) return;

    container.innerHTML = `
      <div class="loading-box" style="grid-column: 1 / -1;">
        <div class="spinner"></div>
        <p>Retrieving active incident records...</p>
      </div>
    `;

    try {
      const res = await API.incidents.list();
      const incidents = res.data || [];

      if (incidents.length === 0) {
        container.innerHTML = `
          <div class="empty-state" style="grid-column: 1 / -1;">
            <div class="empty-icon">✓</div>
            <div class="empty-title">Zero Active Incidents</div>
            <div class="empty-desc">No equipment damages, beam misalignments, or critical safety violations reported.</div>
          </div>
        `;
        return;
      }

      container.innerHTML = incidents.map((inc) => this.renderCard(inc)).join('');
      this.bindActions();
    } catch (err) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1; border-color: #ef4444;">
          <div class="empty-title" style="color: #ef4444;">Failed to Load Incidents</div>
          <div class="empty-desc">${err.message}</div>
        </div>
      `;
    }
  },

  renderCard(inc) {
    const severityBadge = {
      minor: '<span class="status-pill available">Minor Wear</span>',
      moderate: '<span class="status-pill pending">Moderate Degradation</span>',
      critical_downtime: '<span class="status-pill danger">Critical Downtime</span>'
    };

    const repairBadge = {
      open: '<span style="color: #ef4444; font-weight: bold; font-family: var(--font-mono); font-size: 11px;">[OPEN ESCALATION]</span>',
      repair_scheduled: '<span style="color: #fbbf24; font-weight: bold; font-family: var(--font-mono); font-size: 11px;">[REPAIR SCHEDULED]</span>',
      resolved: '<span style="color: #10b981; font-weight: bold; font-family: var(--font-mono); font-size: 11px;">[RESOLVED]</span>'
    };

    const equip = inc.equipment || {};
    const reporter = inc.users || {};

    return `
      <div class="console-card" data-incident-id="${inc.id}">
        <div class="flex justify-between items-start" style="margin-bottom: 12px; gap: 8px;">
          <div>
            <span class="mono-font" style="font-size: 11px; color: var(--cyan-primary); font-weight: bold;">
              ${equip.code || 'EQUIPMENT'}
            </span>
            <h3 style="font-size: 15px; color: #fff; margin-top: 2px;">${equip.name || 'Instrument'}</h3>
          </div>
          <div>${severityBadge[inc.severity] || inc.severity}</div>
        </div>

        <div style="background: #080c14; border: 1px solid var(--border-dim); border-radius: var(--radius-sm); padding: 12px; margin-bottom: 14px; font-size: 12px;">
          <div class="flex justify-between" style="margin-bottom: 4px;">
            <span style="color: var(--text-dim);">Classification:</span>
            <span class="mono-font" style="color: #fff; text-transform: capitalize;">${inc.incident_type.replace('_', ' ')}</span>
          </div>
          <div class="flex justify-between" style="margin-bottom: 4px;">
            <span style="color: var(--text-dim);">Reported By:</span>
            <span style="color: #fff;">${reporter.full_name || 'Staff'} (${reporter.department || 'Lab'})</span>
          </div>
          <div class="flex justify-between">
            <span style="color: var(--text-dim);">Estimated Downtime:</span>
            <span class="mono-font" style="color: #f97316;">${inc.estimated_downtime_hours} Hours</span>
          </div>
        </div>

        <div style="margin-bottom: 16px; font-size: 13px; color: var(--text-muted); line-height: 1.5;">
          ${inc.description}
        </div>

        <div class="flex justify-between items-center" style="border-top: 1px solid rgba(31, 47, 76, 0.6); padding-top: 12px;">
          <div>${repairBadge[inc.repair_status] || inc.repair_status}</div>
          <div class="flex items-center gap-2">
            ${inc.repair_status === 'open' ? `
              <button class="btn btn-warning btn-sm btn-incident-schedule" data-id="${inc.id}">
                Schedule Repair
              </button>
            ` : ''}

            ${inc.repair_status !== 'resolved' ? `
              <button class="btn btn-primary btn-sm btn-incident-resolve" data-id="${inc.id}">
                Mark Resolved
              </button>
            ` : `
              <span style="font-size: 11px; color: var(--text-dim); font-family: var(--font-mono);">
                Resolved: ${inc.resolved_at ? new Date(inc.resolved_at).toLocaleDateString() : 'Yes'}
              </span>
            `}
          </div>
        </div>
      </div>
    `;
  },

  bindActions() {
    // Schedule Repair
    document.querySelectorAll('.btn-incident-schedule').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        try {
          await API.incidents.updateStatus(id, 'repair_scheduled');
          showToast('Incident marked: Service engineer scheduled.', 'warning');
          IncidentModal.loadIncidents();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });

    // Mark Resolved
    document.querySelectorAll('.btn-incident-resolve').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        try {
          await API.incidents.updateStatus(id, 'resolved');
          showToast('Incident resolved! Equipment restored if no other locks exist.', 'success');
          IncidentModal.loadIncidents();
          CatalogueView.loadEquipment();
          LandingView.refreshTelemetry();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });
  },

  openReportModal() {
    const select = document.getElementById('incident-equipment-id');
    if (select) {
      select.innerHTML = State.equipmentList.map((e) => `
        <option value="${e.id}">${e.name} (${e.code})</option>
      `).join('');
    }

    document.getElementById('incident-desc').value = '';
    document.getElementById('incident-downtime').value = '4';

    openModal('modal-incident');
  },

  async handleIncidentSubmit(e) {
    e.preventDefault();

    const payload = {
      equipment_id: document.getElementById('incident-equipment-id').value,
      incident_type: document.getElementById('incident-type').value,
      severity: document.getElementById('incident-severity').value,
      estimated_downtime_hours: parseFloat(document.getElementById('incident-downtime').value || 0),
      description: document.getElementById('incident-desc').value.trim()
    };

    try {
      const res = await API.incidents.report(payload);
      closeModal('modal-incident');
      showToast(res.message, payload.severity === 'critical_downtime' ? 'error' : 'success', 5000);

      IncidentModal.loadIncidents();
      CatalogueView.loadEquipment();
      LandingView.refreshTelemetry();
    } catch (err) {
      showToast(`Failed to submit incident: ${err.message}`, 'error');
    }
  }
};
