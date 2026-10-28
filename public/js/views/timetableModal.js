// timetableModal.js - 7-Day Precision Hourly Slot Matrix Inspector

const TimetableModal = {
  currentEquipmentId: null,
  startDate: new Date(),

  async open(equipmentId, initialDate = null) {
    this.currentEquipmentId = equipmentId;
    this.startDate = initialDate ? new Date(initialDate) : new Date();
    this.startDate.setHours(0, 0, 0, 0);

    const modal = document.getElementById('modal-timetable');
    if (!modal) return;

    openModal('modal-timetable');
    this.bindControls();
    await this.renderGrid();
  },

  bindControls() {
    const prevBtn = document.getElementById('btn-tt-prev');
    const nextBtn = document.getElementById('btn-tt-next');
    const bookBtn = document.getElementById('btn-tt-open-booking');

    if (prevBtn) {
      prevBtn.onclick = () => {
        this.startDate.setDate(this.startDate.getDate() - 7);
        this.renderGrid();
      };
    }

    if (nextBtn) {
      nextBtn.onclick = () => {
        this.startDate.setDate(this.startDate.getDate() + 7);
        this.renderGrid();
      };
    }

    if (bookBtn) {
      bookBtn.onclick = () => {
        closeModal('modal-timetable');
        BookingModal.open(this.currentEquipmentId);
      };
    }
  },

  async renderGrid() {
    const target = document.getElementById('timetable-grid-target');
    const title = document.getElementById('tt-modal-title');
    const sub = document.getElementById('tt-modal-sub');
    const weekLabel = document.getElementById('tt-week-label');

    if (!target) return;

    target.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 40px; text-align: center; color: var(--text-dim);">
        <div class="spinner" style="margin: 0 auto 12px auto;"></div>
        Querying laboratory schedule matrix...
      </div>
    `;

    try {
      const res = await API.bookings.getTimetable(this.currentEquipmentId, this.startDate.toISOString());
      const { equipment, bookings, maintenance } = res.data;

      if (title) title.textContent = `${equipment.name} // Timetable`;
      if (sub) sub.textContent = `${equipment.code} • ${equipment.building} ${equipment.room} • Max: ${equipment.max_booking_hours} hrs`;

      const endDate = new Date(this.startDate);
      endDate.setDate(endDate.getDate() + 6);
      if (weekLabel) {
        weekLabel.textContent = `${this.startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
      }

      // Hours to display: 08:00 to 21:00 (14 hours)
      const startHour = 8;
      const endHour = 21;
      const hoursCount = endHour - startHour + 1;

      // Construct Grid Cells
      let html = '';

      // Top Header Row
      html += `<div class="grid-cell header-time">Date / Time</div>`;
      for (let h = startHour; h <= endHour; h++) {
        const timeStr = `${String(h).padStart(2, '0')}:00`;
        html += `<div class="grid-cell header-time">${timeStr}</div>`;
      }

      // Loop through 7 Days
      for (let d = 0; d < 7; d++) {
        const dayDate = new Date(this.startDate);
        dayDate.setDate(dayDate.getDate() + d);
        const dayStr = dayDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

        // Left day label
        html += `<div class="grid-cell day-label">${dayStr}</div>`;

        // Hours for this day
        for (let h = startHour; h <= endHour; h++) {
          const slotStart = new Date(dayDate);
          slotStart.setHours(h, 0, 0, 0);
          const slotEnd = new Date(dayDate);
          slotEnd.setHours(h + 1, 0, 0, 0);

          const slotStartMs = slotStart.getTime();
          const slotEndMs = slotEnd.getTime();

          // Check maintenance collisions first
          const collidingMaint = maintenance.find((m) => {
            const mStart = new Date(m.start_time).getTime();
            const mEnd = new Date(m.end_time).getTime();
            return mStart < slotEndMs && mEnd > slotStartMs;
          });

          // Check booking collisions
          const collidingBooking = bookings.find((b) => {
            const bStart = new Date(b.start_time).getTime();
            const bEnd = new Date(b.end_time).getTime();
            return bStart < slotEndMs && bEnd > slotStartMs;
          });

          if (collidingMaint) {
            html += `
              <div class="grid-cell slot-maintenance" title="MAINTENANCE LOCK: ${collidingMaint.maintenance_type} (${collidingMaint.technician_name})">
                <span>LOCK</span>
                <span style="font-size: 8px;">MAINT</span>
              </div>
            `;
          } else if (collidingBooking) {
            const bStatus = collidingBooking.status;
            let statusClass = 'slot-booked';
            let label = 'BOOKED';

            if (bStatus === 'checked_in') {
              statusClass = 'slot-in-use';
              label = 'ACTIVE';
            } else if (bStatus === 'pending_approval') {
              statusClass = 'slot-pending';
              label = 'PENDING';
            } else if (bStatus === 'overdue') {
              statusClass = 'slot-overdue';
              label = 'OVERDUE';
            }

            html += `
              <div class="grid-cell ${statusClass}" title="${collidingBooking.title} (${collidingBooking.users ? collidingBooking.users.full_name : 'User'})">
                <span style="font-weight: bold;">${label}</span>
              </div>
            `;
          } else {
            // Free slot
            const isPast = slotEndMs < Date.now();
            if (isPast) {
              html += `<div class="grid-cell" style="opacity: 0.3; background: #070a12;">—</div>`;
            } else {
              const isoStart = slotStart.toISOString();
              html += `
                <div class="grid-cell slot-free" data-slot-start="${isoStart}" title="Slot Available. Click to book ${dayStr} at ${String(h).padStart(2, '0')}:00">
                  <span style="font-size: 10px; color: var(--status-available);">OPEN</span>
                </div>
              `;
            }
          }
        }
      }

      target.innerHTML = html;

      // Bind free slot clicks
      target.querySelectorAll('.slot-free').forEach((cell) => {
        cell.addEventListener('click', () => {
          const isoStart = cell.getAttribute('data-slot-start');
          closeModal('modal-timetable');
          BookingModal.open(this.currentEquipmentId, isoStart);
        });
      });
    } catch (err) {
      target.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 30px; text-align: center; color: #ef4444;">
          Failed to load schedule: ${err.message}
        </div>
      `;
    }
  }
};
