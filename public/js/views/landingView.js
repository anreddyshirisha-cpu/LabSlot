// landingView.js - Live Telemetry HUD and Landing Page Hero Metrics

const LandingView = {
  async init() {
    await this.refreshTelemetry();
    this.bindQuickFinder();
  },

  async refreshTelemetry() {
    try {
      const res = await API.analytics.getMetrics();
      if (!res.success) return;
      const { summary } = res.data;

      // Update HUD Top Bar
      const conflictsElem = document.getElementById('hud-conflicts-count');
      if (conflictsElem) conflictsElem.textContent = summary.conflicts_prevented;

      const downtimeElem = document.getElementById('hud-downtime-text');
      if (downtimeElem) downtimeElem.textContent = `${summary.total_downtime_hours} HRS`;

      const overdueAlert = document.getElementById('hud-overdue-alert');
      const overdueText = document.getElementById('hud-overdue-text');
      if (overdueAlert && overdueText) {
        if (summary.overdue_sessions_count > 0) {
          overdueAlert.style.display = 'flex';
          overdueText.textContent = `${summary.overdue_sessions_count} OVERDUE SESSION${summary.overdue_sessions_count > 1 ? 'S' : ''}`;
        } else {
          overdueAlert.style.display = 'none';
        }
      }

      // Update Hero Metrics Cards
      const statInst = document.getElementById('stat-instruments-count');
      if (statInst) statInst.textContent = summary.total_instruments;

      const statUtil = document.getElementById('stat-utilization-rate');
      if (statUtil) statUtil.textContent = `${summary.average_utilization_rate}%`;

      const statConf = document.getElementById('stat-conflicts-prevented');
      if (statConf) statConf.textContent = summary.conflicts_prevented;

      const statPeak = document.getElementById('stat-peak-window');
      if (statPeak) statPeak.textContent = summary.peak_usage_window;
    } catch (err) {
      console.warn('Telemetry update failed:', err.message);
    }
  },

  bindQuickFinder() {
    const btn = document.getElementById('btn-apply-finder');
    if (!btn) return;

    // Set today as default date in finder
    const dateInput = document.getElementById('finder-date');
    if (dateInput) {
      const today = new Date().toISOString().split('T')[0];
      dateInput.value = today;
    }

    btn.addEventListener('click', () => {
      const cat = document.getElementById('finder-category').value;
      const restricted = document.getElementById('finder-restricted').value;

      // Propagate to Catalogue View
      CatalogueView.loadEquipment({
        category: cat,
        is_restricted: restricted !== 'all' ? restricted : undefined
      });

      // Smooth scroll to catalogue grid
      const grid = document.getElementById('equipment-grid');
      if (grid) {
        grid.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }
};
