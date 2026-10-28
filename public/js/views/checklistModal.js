// checklistModal.js - Pre-Run and Post-Run Safety Handover Checklist Modal

const ChecklistModal = {
  currentBookingId: null,
  currentType: 'issue',
  currentRating: 5,

  open(bookingId, type = 'issue') {
    this.currentBookingId = bookingId;
    this.currentType = type;
    this.currentRating = 5;

    const modal = document.getElementById('modal-checklist');
    const title = document.getElementById('checklist-modal-title');
    const instructions = document.getElementById('checklist-instructions');
    const submitBtn = document.getElementById('btn-submit-checklist');
    const bookingIdInput = document.getElementById('checklist-booking-id');
    const typeInput = document.getElementById('checklist-type');

    if (!modal) return;

    if (bookingIdInput) bookingIdInput.value = bookingId;
    if (typeInput) typeInput.value = type;

    if (type === 'issue') {
      if (title) title.textContent = 'Pre-Operation Safety Handover Checklist (Issue)';
      if (instructions) instructions.textContent = 'Verify that the instrument is clean, safety interlocks are operational, and consumables/gases are ready before starting your run.';
      if (submitBtn) submitBtn.textContent = 'Verify & Check In Instrument';
    } else {
      if (title) title.textContent = 'Post-Operation Handover Checklist (Return)';
      if (instructions) instructions.textContent = 'Confirm sample retrieval, beam/laser shutoff, workspace sanitization, and assess the instrument condition upon return.';
      if (submitBtn) submitBtn.textContent = 'Complete Session & Free Instrument';
    }

    // Reset switches
    document.getElementById('chk-cleanliness').checked = true;
    document.getElementById('chk-calibration').checked = true;
    document.getElementById('chk-consumables').checked = true;
    document.getElementById('chk-safety').checked = true;
    document.getElementById('chk-data').checked = true;
    document.getElementById('checklist-notes').value = '';

    this.setRating(5);
    this.bindRatingPicker();
    this.bindForm();

    openModal('modal-checklist');
  },

  setRating(rating) {
    this.currentRating = rating;
    const ratingInput = document.getElementById('checklist-rating');
    const ratingText = document.getElementById('condition-rating-text');

    if (ratingInput) ratingInput.value = rating;

    const ratingDescriptions = {
      1: '1 / 5 (Severe Damage / Fault)',
      2: '2 / 5 (Substandard / Wear Observed)',
      3: '3 / 5 (Acceptable / Fair)',
      4: '4 / 5 (Good Condition)',
      5: '5 / 5 (Pristine / Optimal)'
    };

    if (ratingText) {
      ratingText.textContent = ratingDescriptions[rating] || `${rating} / 5`;
    }

    // Highlight stars
    document.querySelectorAll('#condition-rating-picker .star-btn').forEach((btn) => {
      const starVal = parseInt(btn.getAttribute('data-rating'), 10);
      if (starVal <= rating) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  },

  bindRatingPicker() {
    document.querySelectorAll('#condition-rating-picker .star-btn').forEach((btn) => {
      btn.onclick = () => {
        const rating = parseInt(btn.getAttribute('data-rating'), 10);
        this.setRating(rating);
      };
    });
  },

  bindForm() {
    const form = document.getElementById('form-checklist');
    if (!form) return;

    form.onsubmit = async (e) => {
      e.preventDefault();

      const submitBtn = document.getElementById('btn-submit-checklist');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Recording Handover...';
      }

      const payload = {
        checklist_type: this.currentType,
        cleanliness_ok: document.getElementById('chk-cleanliness').checked,
        calibration_verified: document.getElementById('chk-calibration').checked,
        consumables_replenished: document.getElementById('chk-consumables').checked,
        safety_hazards_cleared: document.getElementById('chk-safety').checked,
        data_transferred: document.getElementById('chk-data').checked,
        physical_condition_rating: this.currentRating,
        notes: document.getElementById('checklist-notes').value.trim()
      };

      try {
        const res = await API.checklists.submit(this.currentBookingId, payload);
        closeModal('modal-checklist');

        showToast(res.message, 'success', 4500);

        if (this.currentRating <= 2) {
          showToast('Low condition rating recorded: Automated incident report logged for operator review.', 'warning', 6000);
        }

        // Refresh views
        UserBookingsView.loadBookings();
        CatalogueView.loadEquipment();
        LandingView.refreshTelemetry();
        if (IncidentModal.loadIncidents) IncidentModal.loadIncidents();
      } catch (err) {
        showToast(`Checklist submission failed: ${err.message}`, 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = this.currentType === 'issue' ? 'Verify & Check In Instrument' : 'Complete Session & Free Instrument';
        }
      }
    };
  }
};
