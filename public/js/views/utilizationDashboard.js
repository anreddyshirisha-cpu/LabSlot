// utilizationDashboard.js - Operational Metrics, Utilization Rates & Audit Ledger

const UtilizationDashboard = {
  init() {
    this.bindEvents();
    this.loadDashboard();
  },

  bindEvents() {
    const refreshBtn = document.getElementById('btn-refresh-analytics');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.loadDashboard());
    }
  },

  async loadDashboard() {
    try {
      const res = await API.analytics.getMetrics();
      if (!res.success) return;

      const { summary, equipment_utilization, hourly_distribution, recent_audit_logs } = res.data;

      // KPI Overview
      const hrsElem = document.getElementById('tele-total-hours');
      if (hrsElem) hrsElem.textContent = summary.total_booked_hours;

      const confElem = document.getElementById('tele-conflicts');
      if (confElem) confElem.textContent = summary.conflicts_prevented;

      const downElem = document.getElementById('tele-downtime');
      if (downElem) downElem.textContent = summary.total_downtime_hours;

      const incElem = document.getElementById('tele-open-incidents');
      if (incElem) incElem.textContent = summary.open_incidents_count;

      // Equipment Utilization Bars
      this.renderUtilizationBars(equipment_utilization);

      // Hourly Distribution Histogram
      this.renderHourlyDistribution(hourly_distribution);

      // Audit Trail
      this.renderAuditTrail(recent_audit_logs);
    } catch (err) {
      console.warn('Dashboard error:', err.message);
    }
  },

  renderUtilizationBars(items = []) {
    const container = document.getElementById('utilization-bars-container');
    if (!container) return;

    if (items.length === 0) {
      container.innerHTML = '<div style="color: var(--text-dim); text-align: center; padding: 20px;">No utilization data available.</div>';
      return;
    }

    container.innerHTML = items.map((item) => `
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <div class="flex justify-between items-center" style="font-size: 13px;">
          <div>
            <span class="mono-font" style="font-weight: bold; color: var(--cyan-primary);">${item.code}</span>
            <span style="color: #fff; margin-left: 8px;">${item.name}</span>
            <span style="color: var(--text-dim); font-size: 11px; margin-left: 6px;">(${item.category})</span>
          </div>
          <div class="mono-font" style="font-weight: 600;">
            <span style="color: #fff;">${item.booked_hours} hrs</span>
            <span style="color: ${item.utilization_rate > 70 ? '#f59e0b' : 'var(--cyan-primary)'}; margin-left: 8px;">
              ${item.utilization_rate}%
            </span>
          </div>
        </div>
        <div class="util-progress-bar">
          <div class="util-fill ${item.utilization_rate > 70 ? 'high' : ''}" style="width: ${Math.max(2, item.utilization_rate)}%;"></div>
        </div>
      </div>
    `).join('');
  },

  renderHourlyDistribution(distribution = []) {
    const container = document.getElementById('hourly-bars-container');
    if (!container) return;

    const maxVal = Math.max(1, ...distribution);

    container.innerHTML = distribution.map((val, idx) => {
      const hour = 8 + idx;
      const heightPercent = Math.max(8, Math.round((val / maxVal) * 100));
      const isPeak = val === maxVal && val > 0;

      return `
        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: flex-end;" title="${String(hour).padStart(2, '0')}:00 – ${val} session(s) booked">
          <div style="width: 100%; height: ${heightPercent}%; background: ${isPeak ? 'var(--cyan-primary)' : 'rgba(0, 245, 255, 0.3)'}; border-radius: 2px 2px 0 0; transition: height 0.4s ease; box-shadow: ${isPeak ? '0 0 10px rgba(0, 245, 255, 0.5)' : 'none'};"></div>
        </div>
      `;
    }).join('');
  },

  renderAuditTrail(logs = []) {
    const container = document.getElementById('audit-trail-container');
    if (!container) return;

    if (logs.length === 0) {
      container.innerHTML = '<div style="color: var(--text-dim); text-align: center; padding: 20px;">No recent audit events.</div>';
      return;
    }

    const actionColors = {
      BOOKING_CONFLICT_PREVENTED: '#ef4444',
      RESTRICTED_BOOKING_APPROVED: '#10b981',
      MAINTENANCE_LOCK_ENGAGED: '#f97316',
      CHECKLIST_ISSUE_SUBMITTED: '#00f5ff',
      CHECKLIST_RETURN_SUBMITTED: '#34d399',
      INCIDENT_REPORTED: '#ef4444'
    };

    container.innerHTML = logs.map((log) => {
      const color = actionColors[log.action] || 'var(--text-muted)';
      const timeStr = new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const userStr = log.users ? log.users.full_name : 'System';

      return `
        <div style="background: #080c14; border: 1px solid var(--border-dim); border-radius: var(--radius-sm); padding: 8px 12px; font-size: 11px; display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="mono-font" style="font-weight: bold; color: ${color}; font-size: 10px;">
              [${log.action}]
            </span>
            <span style="color: var(--text-main);">${userStr}</span>
          </div>
          <span class="mono-font" style="color: var(--text-dim); font-size: 10px;">${timeStr}</span>
        </div>
      `;
    }).join('');
  }
};
