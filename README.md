# Shared Laboratory Equipment Booking & Conflict Prevention System

A high-reliability laboratory instrument management and collision-immune scheduling terminal designed to eliminate double-booking conflicts, prevent overdue monopolization, enforce safety handover checklists, and automate restricted equipment authorization.

---

## ⚡ Problem & System Overview

Shared scientific research instrumentation (such as Field Emission SEMs, X-Ray Diffractometers, HPLC systems, and Confocal Microscopes) represents multi-million dollar institutional assets. Common issues in shared research facilities include:
1. **Double-Booking & Slot Clashes**: Concurrent reservations across overlapping time windows causing experimental delays.
2. **Maintenance Downtime Blindspots**: Instruments taken offline for routine calibration or emergency repairs without alerting researchers or blocking reservations.
3. **Restricted Equipment Breaches**: Non-qualified users booking sensitive instruments without prerequisite safety qualifications or operator sign-off.
4. **Unreported Damage & Dirty Handovers**: Users failing to clean chambers or report broken components, leaving defects for the next user.
5. **Overdue Sessions**: Researchers overstaying their booked windows without accountability.

This application provides an **atomic collision-prevention engine** backed by **Supabase PostgreSQL**, an **Express REST API**, and a **high-precision instrument console UI** to resolve these problems end-to-end.

---

## 🛠️ Technology Stack

- **Frontend**: Semantic HTML5, Custom CSS3 (Precision Instrument Console design system with charcoal navy `#0c1220` and electric cyan `#00f5ff` glow), and modular Vanilla JavaScript (no external frameworks, zero bundle overhead).
- **Backend**: Node.js & Express.js REST API with structured MVC architecture (Controllers, Middleware, Services, Data Access Adapter, Utils).
- **Database**: Supabase PostgreSQL with Row-Level Security (RLS), atomic conflict prevention triggers, foreign keys, and audit event logs.
- **Security & Sessions**: JWT Bearer tokens, bcrypt password hashing, role-based access control (RBAC), and sanitization.

---

## 🏗️ Core Features & Workflows

### 1. Equipment Catalogue & Fleet Browser
- Browse multi-department laboratory fleets with real-time status beacons: `Available` (green), `In Active Use` (cyan), `Maintenance Lock` (orange), and `Decommissioned` (red).
- Instant search and filtering by Category (*Electron Microscopy*, *Spectroscopy*, *Chromatography*, *Surface Science*, *Laser & Optical*), Room/Building, and Certification Restriction.
- Comprehensive technical specs (vacuum levels, lasers, detectors, radiation sources) and safety instructions.

### 2. Time-Slot Booking & Concurrency Overlap Prevention
- Precision interval reservation engine: mathematical interval test `(startA < endB) && (endA > startB)`.
- **Atomic Concurrency Defense**: Database trigger + server-side pre-flight check blocks duplicate booking attempts and responds with HTTP `409 Conflict` and detailed collision diagnostics.
- Automatic buffer interval enforcement (e.g. +30 minutes for laser cooling or chamber venting).
- Real-time client-side conflict validator checks slot availability as date/times are chosen.

### 3. Interactive 7-Day Timetable Grid
- Visual 14-hour schedule matrix (08:00 to 22:00) across 7 days.
- Color-coded slots:
  - **Open Slots**: Clickable to launch pre-filled booking.
  - **Confirmed**: Cyan reservation with research label.
  - **Active Session**: Pulsing cyan scanline indicator.
  - **Pending Approval**: Amber diagonal hatch.
  - **Maintenance Lockout**: Hazard orange cross-hatch.
- Previous / Next week timeline navigation.

### 4. Restricted Equipment Operator Authorization Workflow
- High-end instruments (e.g. Bruker XRD, JEOL SEM, Kratos XPS) require supervisor authorization.
- When booked by a researcher, the reservation enters `pending_approval` status.
- Lab Operators and Admins review applicant qualification tier, department, and research rationale in the **Approvals Queue Workbench**.
- One-click **Authorize Slot** (transitions booking to `confirmed`) or **Reject Request** (releases slot back into inventory).

### 5. Issue & Return Safety Handover Checklists
- **Pre-Run Check-In (Issue Checklist)**:
  - Mandatory pre-operation GLP verification: Chamber cleanliness, sensor calibration, gas/cryo pressure, safety guards/interlocks, and data readiness.
  - Transitions booking to `checked_in` and instrument fleet status to `in_use`.
- **Post-Run Finalization (Return Checklist)**:
  - Sample removal, optics capping, and 1-to-5 star physical condition rating.
  - Substandard ratings (≤ 2 stars) automatically file an incident escalation for technician inspection.
  - Frees the instrument back to `available`.

### 6. Overdue Detection & Malfunction Incident Reports
- Automated background evaluation marks active sessions exceeding their booked window as `overdue`.
- Direct incident filing for physical damage, optical misalignment, contamination, or software faults.
- Critical incidents automatically transition the instrument to `maintenance` mode to protect equipment.

### 7. Scheduled Maintenance Lockout Manager
- Operators and Facility Directors can schedule preventative maintenance, sensor recalibration, or deep clean cycles.
- Detects and warns of colliding student reservations before locking out the time window.
- Slots during maintenance blocks are strictly locked to prevent any student reservations.

### 8. Facility Operational Telemetry & Utilization Analytics
- Real-time KPIs: Fleet Utilization Rate, Total Booked Hours, Collisions Prevented Counter, Maintenance Downtime Hours, and Active Overdue Sessions.
- Instrument-by-instrument utilization progress bar chart (based on standard 420-hour monthly operating windows).
- Peak Operating Hours Histogram (08:00 to 22:00).
- Live Security & State Transition Audit Ledger.

---

## 👥 Role Hierarchy & Pre-Seeded Demo Personas

The system enforces 4 distinct role tiers with least-privilege security:

| Role | Demo Email | Password | Primary Permissions |
|------|------------|----------|---------------------|
| **Visitor** | *(Guest)* | *N/A* | Browse public catalogue, view public timetable grids, check live fleet availability. |
| **Student / Researcher** | `student@labhub.edu` | `Password123!` | Book open instruments, submit restricted approval requests, execute Pre/Post run checklists, view own reservations. |
| **Lab Operator / Tech** | `operator@labhub.edu` | `Password123!` | Authorize restricted bookings, schedule maintenance lockout blocks, perform check-in/return overrides, log damage reports. |
| **Administrator / Director** | `admin@labhub.edu` | `Password123!` | Full fleet management (add/edit instruments), global audit trail inspection, system configuration, all operator permissions. |

> **Interactive Persona Switcher**: Use the **DEMO ROLE** dropdown in the top-right header to instantly switch between Visitor, Student, Operator, and Admin roles without manual logouts.

---

## 🚀 Quick Start & Local Execution

### Prerequisites
- Node.js (v18.0.0 or higher)
- npm (v9.0.0 or higher)

### 1. Installation
Clone or navigate to the repository directory and install dependencies:
```bash
npm install
```

### 2. Environment Configuration
Create a `.env` file from `.env.example`:
```bash
# Windows PowerShell
Copy-Item .env.example .env
```
Default configuration values:
```env
PORT=3000
NODE_ENV=development
JWT_SECRET=super-secret-lab-jwt-token-key-change-in-production-2026
SESSION_EXPIRY=24h
DEFAULT_BUFFER_TIME_MINS=15
MAX_BOOKING_HOURS=4
AUTO_FLAG_OVERDUE_MINUTES=15
```

### 3. Launching Application
Start the local server:
```bash
npm start
```
The server will boot on `http://localhost:3000`:
- **Web Interface**: Open [http://localhost:3000](http://localhost:3000) in your browser.
- **REST API Base**: `http://localhost:3000/api`
- **Health Check**: `http://localhost:3000/api/health`

---

## 🗄️ Supabase PostgreSQL Setup & Live Connection

The application is connected directly to your live **Supabase PostgreSQL** instance:
- **Project Ref**: `flleiwgoknujhtxtgkpd`
- **Region**: Sydney (`aws-0-ap-southeast-2.pooler.supabase.com:5432`)
- **Status**: **LIVE & CONNECTED (Cloud PostgreSQL)**
- **Schema & Migrations Applied**:
  - `public.users` (4 seeded accounts with bcrypt authentication)
  - `public.equipment` (6 multi-lab scientific instruments)
  - `public.bookings` (with atomic concurrency trigger `trg_prevent_booking_conflict`)
  - `public.maintenance_blocks` (scheduled lockouts)
  - `public.approvals` (restricted instrument review queue)
  - `public.checklists` (GLP Pre/Post run handover checklists)
  - `public.incidents_damage` (malfunction triage)
  - `public.audit_logs` (security & state change telemetry)

All database operations execute in real-time on your cloud Supabase database.

---

## 🧪 Automated Testing

An automated integration and business rule test suite is included in `tests/api.test.js`.

To run the verification suite:
```bash
npm test
```

### Verified Test Cases:
1. `GET /api/health` returns `ONLINE`.
2. Student authentication & JWT token generation.
3. Operator and Admin authentication & privilege checks.
4. Equipment catalogue listing & category query filters.
5. Open equipment reservation creation.
6. **Atomic Overlap Collision Prevention**: Overlapping slot attempt rejected with HTTP 409 Conflict.
7. **Restricted Equipment Workflow**: Booking transitions to `pending_approval`.
8. **Operator Review & Authorization**: Operator authorizes booking into `confirmed`.
9. **Issue Handover Checklist**: Pre-run checklist moves booking to `checked_in` and instrument to `in_use`.
10. **Return Handover Checklist**: Post-run checklist moves booking to `completed` and restores instrument to `available`.
11. **Maintenance Block Scheduling & Lockout**: Maintenance lockout strictly blocks new student bookings.
12. Operational telemetry & utilization metrics calculation.
13. Security Boundaries: Unauthorized role access blocked with HTTP 403 Forbidden.

---

## 📁 Project Structure

```
lab-slot/
├── package.json                   # Dependencies & npm scripts
├── .env.example                   # Environment configuration template
├── README.md                      # Complete system documentation
├── supabase/
│   ├── migrations/
│   │   └── 20261027_001_initial_schema.sql   # PostgreSQL DDL, triggers, RLS
│   └── seed/
│       └── 20261027_002_seed_data.sql       # Multi-lab instruments, users, bookings
├── server/
│   ├── app.js                     # Express application configuration
│   ├── server.js                  # Entry point & HTTP listener
│   ├── config/
│   │   └── env.js                 # Environment variable validation
│   ├── db/
│   │   ├── supabaseClient.js      # Supabase client initializer
│   │   ├── dbAdapter.js           # Unified database access adapter
│   │   ├── seedData.js            # Synthetic seed data generator
│   │   └── seedRunner.js          # Cloud/local seed executor
│   ├── middleware/
│   │   ├── auth.js                # JWT authentication & RBAC middleware
│   │   ├── errorHandler.js        # Centralized error handler
│   │   └── validator.js           # Request payload validation
│   ├── routes/
│   │   ├── auth.routes.js         # /api/auth
│   │   ├── equipment.routes.js    # /api/equipment
│   │   ├── bookings.routes.js     # /api/bookings
│   │   ├── approvals.routes.js    # /api/approvals
│   │   ├── checklists.routes.js   # /api/checklists
│   │   ├── maintenance.routes.js  # /api/maintenance
│   │   ├── incidents.routes.js    # /api/incidents
│   │   └── analytics.routes.js    # /api/analytics
│   ├── services/
│   │   ├── bookingService.js      # Concurrency & conflict business logic
│   │   ├── equipmentService.js    # Equipment fleet management
│   │   ├── approvalService.js     # Authorization state machine
│   │   ├── checklistService.js    # GLP handover checklist transitions
│   │   ├── maintenanceService.js  # Maintenance lockout scheduling
│   │   ├── incidentService.js     # Incident logging & equipment triage
│   │   └── analyticsService.js    # Utilization & telemetry calculations
│   └── utils/
│       └── timeUtils.js           # Half-open interval collision math
├── public/
│   ├── index.html                 # Semantic HTML5 console SPA
│   ├── css/
│   │   ├── main.css               # Base resets & layout variables
│   │   ├── console-theme.css      # Precision scientific console styling
│   │   ├── timetable.css          # Timetable grid & slot matrix
│   │   └── components.css         # Modals, forms, checklists, toasts
│   └── js/
│       ├── api.js                 # REST client wrapper
│       ├── state.js               # Reactive state & modal helpers
│       ├── views/
│       │   ├── landingView.js     # HUD ticker & quick finder
│       │   ├── catalogueView.js   # Fleet cards & search/filter
│       │   ├── timetableModal.js  # 7-day hourly grid inspector
│       │   ├── bookingModal.js    # Time slot booking & live conflict checker
│       │   ├── userBookingsView.js# Reservations list & handover triggers
│       │   ├── approvalQueueView.js # Operator restricted queue workbench
│       │   ├── checklistModal.js  # Issue/Return handover checklist
│       │   ├── maintenanceView.js # Preventative maintenance lockout view
│       │   ├── incidentModal.js   # Malfunction & damage reporting
│       │   └── utilizationDashboard.js # Utilization charts & audit ledger
│       └── app.js                 # App lifecycle & role coordinator
└── tests/
    └── api.test.js                # End-to-end integration test suite
```

---

## 🔒 Application Security & Access Control

- **Server-Side Authorization**: Hiding UI buttons is treated only as a convenience. Express middleware `requireRoles(...)` verifies JWT claims on every mutation.
- **SQL Injection Prevention**: All SQL interactions use parameterized queries via Supabase client and PostgreSQL prepared functions.
- **Atomic Concurrency Protection**: Database trigger `trg_prevent_booking_conflict` and server-side slot verification prevent race conditions during simultaneous booking attempts.
- **Audit Logging**: Sensitive events (`BOOKING_CONFLICT_PREVENTED`, `RESTRICTED_BOOKING_APPROVED`, `MAINTENANCE_LOCK_ENGAGED`, `CHECKLIST_SUBMITTED`) are permanently recorded in `audit_logs` with timestamps and client IP addresses.
