// bookingModal.js - Time-Slot Booking Form with Real-Time Conflict Prevention Engine

const BookingModal = {
  currentEquipment: null,
  debounceTimer: null,

  async open(equipmentId, initialStartTime = null) {
    try {
      const res = await API.equipment.get(equipmentId);
      this.currentEquipment = res.data;
    } catch (err) {
      showToast(`Failed to load equipment details: ${err.message}`, 'error');
      return;
    }

    const modal = document.getElementById('modal-booking');
    if (!modal) return;

    // Populate header info
    const nameElem = document.getElementById('booking-modal-equip-name');
    if (nameElem) {
      nameElem.textContent = `${this.currentEquipment.name} [${this.currentEquipment.code}] • Rate: $${this.currentEquipment.hourly_rate}/hr`;
    }

    document.getElementById('booking-equipment-id').value = equipmentId;

    // Restricted notice banner
    const noticeBanner = document.getElementById('booking-restricted-notice');
    if (noticeBanner) {
      if (this.currentEquipment.is_restricted) {
        noticeBanner.classList.remove('hidden');
      } else {
        noticeBanner.classList.add('hidden');
      }
    }

    // Compute default start & end times
    let start = initialStartTime ? new Date(initialStartTime) : new Date();
    if (!initialStartTime) {
      // Default to next hour
      start.setHours(start.getHours() + 1, 0, 0, 0);
    }
    const end = new Date(start.getTime() + 2 * 3600 * 1000); // 2 hours default

    // Format for datetime-local (YYYY-MM-DDTHH:mm)
    const formatLocal = (d) => {
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    document.getElementById('booking-start-time').value = formatLocal(start);
    document.getElementById('booking-end-time').value = formatLocal(end);
    document.getElementById('booking-title').value = '';
    document.getElementById('booking-purpose').value = '';

    openModal('modal-booking');
    this.bindEvents();
    this.triggerConflictCheck();
  },

  bindEvents() {
    const startInput = document.getElementById('booking-start-time');
    const endInput = document.getElementById('booking-end-time');
    const verifyBtn = document.getElementById('btn-verify-conflict');
    const form = document.getElementById('form-create-booking');

    const handleTimeChange = () => {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.triggerConflictCheck();
      }, 350);
    };

    if (startInput) startInput.onchange = handleTimeChange;
    if (endInput) endInput.onchange = handleTimeChange;

    if (verifyBtn) {
      verifyBtn.onclick = () => this.triggerConflictCheck(true);
    }

    if (form) {
      form.onsubmit = (e) => this.handleSubmit(e);
    }
  },

  async triggerConflictCheck(isManual = false) {
    const banner = document.getElementById('booking-conflict-banner');
    const msg = document.getElementById('booking-conflict-msg');
    const submitBtn = document.getElementById('btn-confirm-booking');

    const equipmentId = document.getElementById('booking-equipment-id').value;
    const startTime = document.getElementById('booking-start-time').value;
    const endTime = document.getElementById('booking-end-time').value;

    if (!equipmentId || !startTime || !endTime) return;

    const s = new Date(startTime).getTime();
    const e = new Date(endTime).getTime();

    if (e <= s) {
      banner.className = 'conflict-banner danger';
      banner.querySelector('.conflict-icon').textContent = '⚠';
      msg.textContent = 'End time must be strictly after start time.';
      if (submitBtn) submitBtn.disabled = true;
      return;
    }

    // Set checking state
    banner.className = 'conflict-banner checking';
    banner.querySelector('.conflict-icon').textContent = '⏳';
    msg.textContent = 'Verifying atomic slot availability against bookings and maintenance locks...';

    try {
      const res = await API.bookings.checkConflict({
        equipment_id: equipmentId,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString()
      });

      if (res.conflict) {
        banner.className = 'conflict-banner danger';
        banner.querySelector('.conflict-icon').textContent = '⚠';
        msg.textContent = `COLLISION DETECTED: ${res.reason}`;
        if (submitBtn) submitBtn.disabled = true;
        if (isManual) showToast(res.reason, 'warning');
      } else {
        banner.className = 'conflict-banner success';
        banner.querySelector('.conflict-icon').textContent = '✓';
        msg.textContent = 'Time slot is 100% available. No collision detected.';
        if (submitBtn) submitBtn.disabled = false;
        if (isManual) showToast('Slot verified and available!', 'success');
      }
    } catch (err) {
      banner.className = 'conflict-banner danger';
      banner.querySelector('.conflict-icon').textContent = '✕';
      msg.textContent = `Verification error: ${err.message}`;
    }
  },

  async handleSubmit(e) {
    e.preventDefault();

    const submitBtn = document.getElementById('btn-confirm-booking');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Locking Slot...';
    }

    const payload = {
      equipment_id: document.getElementById('booking-equipment-id').value,
      title: document.getElementById('booking-title').value.trim(),
      research_purpose: document.getElementById('booking-purpose').value.trim(),
      start_time: new Date(document.getElementById('booking-start-time').value).toISOString(),
      end_time: new Date(document.getElementById('booking-end-time').value).toISOString()
    };

    try {
      const res = await API.bookings.create(payload);
      closeModal('modal-booking');

      if (res.approval) {
        showToast('Restricted equipment booking submitted for operator approval!', 'warning', 5000);
      } else {
        showToast('Reservation confirmed successfully! Concurrency collision prevented.', 'success', 4000);
      }

      // Refresh data
      LandingView.refreshTelemetry();
      CatalogueView.loadEquipment();
      UserBookingsView.loadBookings();
      if (ApprovalQueueView.loadApprovals) ApprovalQueueView.loadApprovals();
    } catch (err) {
      showToast(err.message, 'error', 5000);
      this.triggerConflictCheck();
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Confirm Booking';
      }
    }
  }
};
