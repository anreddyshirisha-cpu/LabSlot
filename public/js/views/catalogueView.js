// catalogueView.js - Equipment Catalogue Rendering, Filters & Actions

const CatalogueView = {
  currentFilters: {
    category: 'all',
    status: 'all',
    search: ''
  },

  init() {
    this.bindFilters();
    this.loadEquipment();
  },

  bindFilters() {
    const searchInput = document.getElementById('catalogue-search-input');
    const statusFilter = document.getElementById('catalogue-status-filter');

    if (searchInput) {
      let debounceTimer;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this.currentFilters.search = e.target.value.trim();
          this.loadEquipment(this.currentFilters);
        }, 250);
      });
    }

    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        this.currentFilters.status = e.target.value;
        this.loadEquipment(this.currentFilters);
      });
    }
  },

  async loadEquipment(filters = {}) {
    const container = document.getElementById('equipment-grid');
    if (!container) return;

    this.currentFilters = { ...this.currentFilters, ...filters };

    container.innerHTML = `
      <div class="loading-box" style="grid-column: 1 / -1;">
        <div class="spinner"></div>
        <p>Scanning analytical instrument fleet & live status...</p>
      </div>
    `;

    try {
      const res = await API.equipment.list(this.currentFilters);
      const items = res.data || [];
      State.setEquipmentList(items);

      if (items.length === 0) {
        container.innerHTML = `
          <div class="empty-state" style="grid-column: 1 / -1;">
            <div class="empty-icon">🔬</div>
            <div class="empty-title">No Instruments Match Current Filter</div>
            <div class="empty-desc">Try resetting your search query or expanding your category filter.</div>
            <button class="btn btn-outline" id="btn-reset-filters">Reset Filters</button>
          </div>
        `;
        const resetBtn = document.getElementById('btn-reset-filters');
        if (resetBtn) {
          resetBtn.addEventListener('click', () => {
            document.getElementById('catalogue-search-input').value = '';
            document.getElementById('catalogue-status-filter').value = 'all';
            this.currentFilters = { category: 'all', status: 'all', search: '' };
            this.loadEquipment();
          });
        }
        return;
      }

      container.innerHTML = items.map((item) => this.renderCard(item)).join('');
      this.bindCardActions();
    } catch (err) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1; border-color: rgba(239, 68, 68, 0.4);">
          <div class="empty-icon" style="color: #ef4444;">⚠</div>
          <div class="empty-title">Fleet Synchronization Error</div>
          <div class="empty-desc">${err.message}</div>
          <button class="btn btn-secondary" onclick="CatalogueView.loadEquipment()">Retry Connection</button>
        </div>
      `;
    }
  },

  renderCard(item) {
    const statusMap = {
      available: { label: 'Available', class: 'available' },
      in_use: { label: 'In Active Use', class: 'in_use' },
      maintenance: { label: 'Maintenance Lock', class: 'maintenance' },
      decommissioned: { label: 'Decommissioned', class: 'danger' }
    };

    const statusInfo = statusMap[item.status] || { label: item.status, class: 'available' };
    const specsList = item.specs ? Object.entries(item.specs).slice(0, 3) : [];

    return `
      <div class="console-card" data-equipment-id="${item.id}">
        <!-- Top Metadata Header -->
        <div class="flex justify-between items-start" style="margin-bottom: 12px;">
          <div>
            <span class="mono-font" style="font-size: 11px; color: var(--cyan-primary); letter-spacing: 0.05em; font-weight: bold;">
              ${item.code}
            </span>
            <div style="font-size: 11px; color: var(--text-dim); margin-top: 2px;">
              ${item.building} • ${item.room}
            </div>
          </div>
          <span class="status-pill ${statusInfo.class}">
            ${statusInfo.label}
          </span>
        </div>

        <!-- Instrument Title & Category -->
        <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 6px; color: #fff; min-height: 42px;">
          ${item.name}
        </h3>
        
        <div class="flex items-center gap-2" style="margin-bottom: 14px; flex-wrap: wrap;">
          <span style="font-family: var(--font-mono); font-size: 10px; background: rgba(31, 47, 76, 0.6); padding: 2px 8px; border-radius: var(--radius-sm); color: var(--text-muted);">
            ${item.category}
          </span>
          <span style="font-family: var(--font-mono); font-size: 10px; background: rgba(0, 245, 255, 0.1); border: 1px solid rgba(0, 245, 255, 0.2); padding: 2px 8px; border-radius: var(--radius-sm); color: var(--cyan-primary);">
            ⏱ +${item.buffer_time_mins}m buffer
          </span>
          ${item.is_restricted ? `
            <span style="font-family: var(--font-mono); font-size: 10px; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.35); padding: 2px 8px; border-radius: var(--radius-sm); color: #fbbf24;">
              🛡️ Approval Required
            </span>
          ` : `
            <span style="font-family: var(--font-mono); font-size: 10px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.35); padding: 2px 8px; border-radius: var(--radius-sm); color: #34d399;">
              ✓ Open Access
            </span>
          `}
        </div>

        <!-- Technical Specifications Summary -->
        <div style="background: #080c14; border: 1px solid var(--border-dim); border-radius: var(--radius-sm); padding: 10px; margin-bottom: 16px; font-size: 11px;">
          ${specsList.map(([key, val]) => `
            <div class="flex justify-between" style="padding: 2px 0;">
              <span style="color: var(--text-dim); text-transform: capitalize;">${key.replace(/_/g, ' ')}:</span>
              <span class="mono-font" style="color: var(--text-main); font-weight: 500; text-align: right; max-width: 60%; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
                ${Array.isArray(val) ? val.join(', ') : val}
              </span>
            </div>
          `).join('')}
        </div>

        <!-- Hourly Rate & Action Buttons -->
        <div class="flex justify-between items-center" style="border-top: 1px solid rgba(31, 47, 76, 0.6); padding-top: 14px;">
          <div>
            <div class="mono-font" style="font-size: 16px; font-weight: 700; color: #fff;">
              $${parseFloat(item.hourly_rate).toFixed(2)}
              <span style="font-size: 11px; font-weight: normal; color: var(--text-dim);">/ hr</span>
            </div>
            <div style="font-size: 10px; color: var(--text-dim);">Max: ${item.max_booking_hours} hrs</div>
          </div>
          <div class="flex items-center gap-2">
            <button class="btn btn-outline btn-sm btn-inspect-tt" data-id="${item.id}">
              📅 Timetable
            </button>
            <button class="btn btn-primary btn-sm btn-quick-book" data-id="${item.id}" ${item.status === 'decommissioned' ? 'disabled' : ''}>
              Book Slot
            </button>
          </div>
        </div>
      </div>
    `;
  },

  bindCardActions() {
    document.querySelectorAll('.btn-inspect-tt').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        TimetableModal.open(id);
      });
    });

    document.querySelectorAll('.btn-quick-book').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        BookingModal.open(id);
      });
    });
  }
};
