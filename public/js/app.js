// app.js - Main Application Coordinator & Role Permission Controller

const App = {
  async init() {
    console.log('[System] Initializing Laboratory Equipment Booking & Conflict Prevention Terminal...');

    this.bindTabNavigation();
    this.bindDemoRoleSwitcher();
    this.bindAuthModals();

    // Initialize Active User Session
    await this.restoreSession();

    // Initialize Component Views
    LandingView.init();
    CatalogueView.init();
    UserBookingsView.init();
    ApprovalQueueView.init();
    MaintenanceView.init();
    IncidentModal.init();
    UtilizationDashboard.init();

    // Listen for tab changes from hash
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.replace('#', '') || 'catalogue';
      this.switchTab(hash);
    });

    // Default to hash or catalogue
    const initialHash = window.location.hash.replace('#', '') || 'catalogue';
    this.switchTab(initialHash);
  },

  async restoreSession() {
    const savedRole = API.getDemoRole();
    const roleSelect = document.getElementById('demo-role-select');
    if (roleSelect && savedRole) {
      roleSelect.value = savedRole;
    }

    if (savedRole === 'visitor') {
      State.setUser({ role: 'visitor', full_name: 'Guest / Visitor', department: 'Public Explorer' });
      this.applyRolePermissions('visitor');
      return;
    }

    try {
      // Sync demo role with backend
      const res = await API.auth.switchDemoRole(savedRole);
      API.setToken(res.token);
      State.setUser(res.user);
      this.applyRolePermissions(res.user.role);
    } catch (err) {
      console.warn('Session restore failed, falling back to student demo persona:', err.message);
      this.applyRolePermissions('student');
    }
  },

  bindTabNavigation() {
    document.querySelectorAll('.nav-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        window.location.hash = targetTab;
        this.switchTab(targetTab);
      });
    });

    const brandLink = document.getElementById('brand-link');
    if (brandLink) {
      brandLink.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.hash = 'catalogue';
        this.switchTab('catalogue');
      });
    }
  },

  switchTab(tabId) {
    // Hide all tab views
    document.querySelectorAll('.tab-view').forEach((view) => {
      view.classList.add('hidden');
      view.classList.remove('active');
    });

    // Deactivate all tab buttons
    document.querySelectorAll('.nav-tab-btn').forEach((btn) => {
      btn.classList.remove('active');
    });

    // Activate selected view
    const targetView = document.getElementById(`view-${tabId}`);
    const targetBtn = document.querySelector(`.nav-tab-btn[data-tab="${tabId}"]`);

    if (targetView) {
      targetView.classList.remove('hidden');
      targetView.classList.add('active');
    }

    if (targetBtn) {
      targetBtn.classList.add('active');
    }

    State.setActiveTab(tabId);

    // Refresh view specific data when opened
    if (tabId === 'catalogue') CatalogueView.loadEquipment();
    if (tabId === 'bookings') UserBookingsView.loadBookings();
    if (tabId === 'approvals') ApprovalQueueView.loadApprovals();
    if (tabId === 'maintenance') MaintenanceView.loadMaintenance();
    if (tabId === 'incidents') IncidentModal.loadIncidents();
    if (tabId === 'analytics') UtilizationDashboard.loadDashboard();
  },

  bindDemoRoleSwitcher() {
    const selector = document.getElementById('demo-role-select');
    if (!selector) return;

    selector.addEventListener('change', async (e) => {
      const selectedRole = e.target.value;
      API.setDemoRole(selectedRole);

      if (selectedRole === 'visitor') {
        API.setToken(null);
        State.setUser({ role: 'visitor', full_name: 'Guest / Visitor', department: 'Public Explorer' });
        this.applyRolePermissions('visitor');
        showToast('Switched to Visitor persona (Public Read-Only View).', 'info');
        return;
      }

      try {
        const res = await API.auth.switchDemoRole(selectedRole);
        API.setToken(res.token);
        State.setUser(res.user);
        this.applyRolePermissions(res.user.role);

        showToast(`Active persona switched: ${res.user.full_name} [${res.user.role.toUpperCase()}]`, 'success');

        // Re-render views with new role permissions
        LandingView.refreshTelemetry();
        CatalogueView.loadEquipment();
        UserBookingsView.loadBookings();
        if (ApprovalQueueView.loadApprovals) ApprovalQueueView.loadApprovals();
        if (MaintenanceView.loadMaintenance) MaintenanceView.loadMaintenance();
      } catch (err) {
        showToast(`Role switch failed: ${err.message}`, 'error');
      }
    });
  },

  applyRolePermissions(role) {
    const userRoleBadge = document.getElementById('current-user-role');
    const userNameElem = document.getElementById('current-user-name');
    const approvalsNav = document.getElementById('nav-item-approvals');
    const maintNav = document.getElementById('nav-item-maintenance');
    const guestActions = document.getElementById('auth-guest-actions');
    const userActions = document.getElementById('auth-user-actions');

    if (userRoleBadge) {
      userRoleBadge.className = `role-badge role-${role}`;
      userRoleBadge.textContent = role.toUpperCase();
    }

    if (userNameElem && State.currentUser) {
      userNameElem.textContent = State.currentUser.full_name;
    }

    // Role-dependent navigation items
    const isOperatorOrAdmin = ['operator', 'admin'].includes(role);

    if (approvalsNav) {
      if (isOperatorOrAdmin) {
        approvalsNav.classList.remove('hidden');
      } else {
        approvalsNav.classList.add('hidden');
      }
    }

    if (maintNav) {
      if (isOperatorOrAdmin) {
        maintNav.classList.remove('hidden');
      } else {
        maintNav.classList.add('hidden');
      }
    }

    // Toggle guest vs authenticated buttons
    if (role === 'visitor') {
      if (guestActions) guestActions.classList.remove('hidden');
      if (userActions) userActions.classList.add('hidden');
    } else {
      if (guestActions) guestActions.classList.add('hidden');
      if (userActions) userActions.classList.remove('hidden');
    }
  },

  bindAuthModals() {
    const loginOpenBtn = document.getElementById('btn-open-login');
    const logoutBtn = document.getElementById('btn-logout');
    const tabLoginBtn = document.getElementById('tab-login-btn');
    const tabRegisterBtn = document.getElementById('tab-register-btn');
    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');

    if (loginOpenBtn) {
      loginOpenBtn.addEventListener('click', () => openModal('modal-auth'));
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        API.setToken(null);
        API.setDemoRole('visitor');
        document.getElementById('demo-role-select').value = 'visitor';
        State.setUser({ role: 'visitor', full_name: 'Guest / Visitor', department: 'Public Explorer' });
        this.applyRolePermissions('visitor');
        showToast('Signed out of session. Switched to guest mode.', 'info');
      });
    }

    if (tabLoginBtn && tabRegisterBtn) {
      tabLoginBtn.onclick = () => {
        tabLoginBtn.className = 'btn btn-sm btn-secondary active';
        tabRegisterBtn.className = 'btn btn-sm btn-outline';
        formLogin.classList.remove('hidden');
        formRegister.classList.add('hidden');
      };

      tabRegisterBtn.onclick = () => {
        tabRegisterBtn.className = 'btn btn-sm btn-secondary active';
        tabLoginBtn.className = 'btn btn-sm btn-outline';
        formRegister.classList.remove('hidden');
        formLogin.classList.add('hidden');
      };
    }

    if (formLogin) {
      formLogin.onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        try {
          const res = await API.auth.login(email, password);
          API.setToken(res.token);
          API.setDemoRole(res.user.role);
          document.getElementById('demo-role-select').value = res.user.role;
          State.setUser(res.user);
          this.applyRolePermissions(res.user.role);
          closeModal('modal-auth');
          showToast(res.message, 'success');
        } catch (err) {
          showToast(`Authentication failed: ${err.message}`, 'error');
        }
      };
    }

    if (formRegister) {
      formRegister.onsubmit = async (e) => {
        e.preventDefault();
        const payload = {
          full_name: document.getElementById('reg-name').value.trim(),
          email: document.getElementById('reg-email').value.trim(),
          department: document.getElementById('reg-dept').value.trim(),
          password: document.getElementById('reg-password').value
        };

        try {
          const res = await API.auth.register(payload);
          API.setToken(res.token);
          API.setDemoRole('student');
          document.getElementById('demo-role-select').value = 'student';
          State.setUser(res.user);
          this.applyRolePermissions('student');
          closeModal('modal-auth');
          showToast('Account registered successfully! Welcome to Lab-Slot.', 'success');
        } catch (err) {
          showToast(`Registration failed: ${err.message}`, 'error');
        }
      };
    }
  }
};

// Bootstrap application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
