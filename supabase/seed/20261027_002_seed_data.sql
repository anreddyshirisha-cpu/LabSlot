-- Seed Data: 20261027_002_seed_data.sql
-- Title: Shared Laboratory Equipment Booking and Conflict Prevention System

-- Clean existing data in reverse FK order
TRUNCATE TABLE public.audit_logs CASCADE;
TRUNCATE TABLE public.incidents_damage CASCADE;
TRUNCATE TABLE public.checklists CASCADE;
TRUNCATE TABLE public.approvals CASCADE;
TRUNCATE TABLE public.bookings CASCADE;
TRUNCATE TABLE public.maintenance_blocks CASCADE;
TRUNCATE TABLE public.equipment CASCADE;
TRUNCATE TABLE public.users CASCADE;

-- ============================================================================
-- 1. USERS SEED
-- ============================================================================
-- Default password for all seed accounts: 'Password123!'
INSERT INTO public.users (id, email, password_hash, full_name, role, department, qualification_level, phone)
VALUES
(
    'a0000000-0000-0000-0000-000000000001',
    'admin@labhub.edu',
    '$2b$10$yQmJkPJnXM0rYf9lXl6ahuFLXoGOTqfU50/Hao/COm4TLXJ7mOdeK',
    'Dr. Marcus Vance',
    'admin',
    'Materials Science & Engineering',
    'Level 4 Master Supervisor',
    '+1 (555) 412-8901'
),
(
    'a0000000-0000-0000-0000-000000000002',
    'operator@labhub.edu',
    '$2b$10$yQmJkPJnXM0rYf9lXl6ahuFLXoGOTqfU50/Hao/COm4TLXJ7mOdeK',
    'Sarah Jenkins',
    'operator',
    'Central Instrumentation Facility',
    'Level 3 Senior Technician',
    '+1 (555) 309-4412'
),
(
    'a0000000-0000-0000-0000-000000000003',
    'student@labhub.edu',
    '$2b$10$yQmJkPJnXM0rYf9lXl6ahuFLXoGOTqfU50/Hao/COm4TLXJ7mOdeK',
    'Alex Chen',
    'student',
    'Nanotechnology & Advanced Materials',
    'Level 2 Certified Researcher',
    '+1 (555) 890-2134'
),
(
    'a0000000-0000-0000-0000-000000000004',
    'scholar@labhub.edu',
    '$2b$10$yQmJkPJnXM0rYf9lXl6ahuFLXoGOTqfU50/Hao/COm4TLXJ7mOdeK',
    'Dr. Elena Rostova',
    'student',
    'Biophysics & Structural Biology',
    'Level 2 Certified Researcher',
    '+1 (555) 672-9901'
);

-- ============================================================================
-- 2. EQUIPMENT CATALOGUE SEED
-- ============================================================================
INSERT INTO public.equipment (id, code, name, category, lab_location, building, room, is_restricted, status, hourly_rate, buffer_time_mins, max_booking_hours, specs, safety_instructions, image_url)
VALUES
(
    'e0000000-0000-0000-0000-000000000001',
    'XRD-BRUKER-01',
    'Bruker D8 Advance X-Ray Diffractometer (XRD)',
    'Spectroscopy',
    'Crystalline Phase Characterization Suite',
    'Materials Research Center',
    'Room 104',
    true,
    'available',
    45.00,
    30,
    4,
    '{"radiation_source": "Cu K-alpha (lambda=1.5406 A)", "detector": "LYNXEYE XE-T high resolution", "goniometer": "Theta-Theta radius 280mm", "voltage": "40 kV / 40 mA", "sample_stages": ["Standard 9-position changer", "High-temp chamber Anton Paar HTK 1200N"]}'::jsonb,
    'Personal dosimeter badge mandatory. Verify safety interlock shutter before beam activation. Keep chiller flow rate >= 3.5 L/min.',
    'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=600&q=80'
),
(
    'e0000000-0000-0000-0000-000000000002',
    'SEM-JEOL-02',
    'JEOL JSM-IT800 Field Emission SEM',
    'Electron Microscopy',
    'Ultra-Microscopy Suite',
    'Nanotechnology Complex',
    'Room B12',
    true,
    'available',
    65.00,
    30,
    3,
    '{"electron_gun": "Schottky Field Emission", "resolution": "0.7 nm at 15 kV / 1.0 nm at 1 kV", "magnification": "10x to 2,000,000x", "detectors": ["Upper Secondary Electron (UED)", "Low Angle Backscatter (BED)", "Oxford Ultim Max EDS"]}'::jsonb,
    'Samples must be dry and conductive (or gold/carbon sputter-coated). Do not vent chamber without liquid nitrogen cold trap filled.',
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80'
),
(
    'e0000000-0000-0000-0000-000000000003',
    'HPLC-AGILENT-03',
    'Agilent 1260 Infinity II HPLC System',
    'Chromatography',
    'Separation Science Core',
    'Chemical Sciences Hall',
    'Room 220',
    false,
    'available',
    25.00,
    15,
    6,
    '{"pump_type": "Quaternary Pump up to 600 bar", "autosampler": "Vialsampler with Peltier cooling (4-40 C)", "detectors": ["Diode Array Detector (DAD WR 190-950 nm)", "Refractive Index Detector (RID)"], "column_oven": "Twin Peltier heated/cooled 10-85 C"}'::jsonb,
    'All mobile phases must be 0.22 um filtered and degassed. Flush column with 80% MeOH:H2O after buffer usage.',
    'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=600&q=80'
),
(
    'e0000000-0000-0000-0000-000000000004',
    'FTIR-PKELM-04',
    'PerkinElmer Spectrum Two FT-IR Spectrometer',
    'Spectroscopy',
    'Polymer & Organic Characterization Lab',
    'Chemical Sciences Hall',
    'Room 115',
    false,
    'available',
    15.00,
    15,
    3,
    '{"spectral_range": "8300 - 350 cm-1", "resolution": "Better than 0.5 cm-1", "accessory": "Single reflection diamond ATR top-plate", "signal_to_noise": "14,500:1 peak-to-peak 5-sec scan"}'::jsonb,
    'Clean diamond crystal gently using isopropanol lens wipe only. Do not exceed torque limit on pressure clamp.',
    'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=600&q=80'
),
(
    'e0000000-0000-0000-0000-000000000005',
    'XPS-KRATOS-05',
    'Kratos AXIS Supra+ XPS Spectrometer',
    'Surface Science',
    'Surface Analysis Cleanroom',
    'Nanotechnology Complex',
    'Room 301',
    true,
    'maintenance',
    90.00,
    45,
    5,
    '{"xray_source": "Monochromatic Al K-alpha (1486.6 eV) & Dual Anode Mg/Al", "energy_resolution": "< 0.48 eV on Ag 3d5/2", "analyzer": "165 mm mean radius hemispherical analyzer + Delay Line Detector", "ultra_high_vacuum": "Base pressure 5 x 10^-10 Torr"}'::jsonb,
    'Strict cleanroom protocol. No high vapor pressure polymers allowed. Liquid Nitrogen degassing cycle required prior to entry.',
    'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80'
),
(
    'e0000000-0000-0000-0000-000000000006',
    'CONF-OLYMPUS-06',
    'Olympus FV3000 Confocal Laser Microscope',
    'Laser & Optical',
    'Advanced Cellular Bio-Imaging Facility',
    'Life Sciences Pavilion',
    'Room 408',
    true,
    'in_use',
    50.00,
    20,
    4,
    '{"lasers": ["405nm diode", "488nm diode", "561nm DPSS", "640nm diode"], "detectors": ["4-channel GaAsP spectral high-sensitivity"], "objectives": ["10x Plan-Apo", "20x UPlanSApo", "60x Oil SIL Plan-Apochromat NA 1.40"], "stage": "IX83 motorized inverted with Tokai Hit incubator"}'::jsonb,
    'Laser key safety interlock must be engaged. Use only immersion oil type-F. Turn off 405nm diode laser if idle > 20 mins.',
    'https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&w=600&q=80'
);

-- ============================================================================
-- 3. MAINTENANCE BLOCKS SEED
-- ============================================================================
INSERT INTO public.maintenance_blocks (id, equipment_id, created_by, maintenance_type, technician_name, start_time, end_time, notes, status)
VALUES
(
    'f1000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000005', -- XPS Spectrometer
    'a0000000-0000-0000-0000-000000000002', -- Operator Sarah Jenkins
    'calibration',
    'Dr. David Sterling (Field Service Engineer, Kratos Analytical)',
    now() - INTERVAL '2 hours',
    now() + INTERVAL '22 hours',
    'Semi-annual ultra-high vacuum bakeout, ion source filament replacement, and work function calibration on standard Au/Ag/Cu foil set.',
    'in_progress'
),
(
    'f1000000-0000-0000-0000-000000000002',
    'e0000000-0000-0000-0000-000000000001', -- XRD Bruker
    'a0000000-0000-0000-0000-000000000001', -- Admin Marcus Vance
    'routine',
    'Sarah Jenkins (Lead Tech)',
    now() + INTERVAL '3 days 10 hours',
    now() + INTERVAL '3 days 14 hours',
    'Quarterly optical alignment check, goniometer zero-point calibration using standard Corundum SRM 1976b.',
    'scheduled'
);

-- ============================================================================
-- 4. BOOKINGS SEED
-- ============================================================================
INSERT INTO public.bookings (id, equipment_id, user_id, title, research_purpose, start_time, end_time, status, conflict_detected, created_at)
VALUES
(
    'b0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000006', -- Olympus FV3000
    'a0000000-0000-0000-0000-000000000004', -- Dr. Elena Rostova
    'Live Neuron Synaptic Vesicle Z-Stack Imaging',
    'Characterizing membrane dynamics and vesicle clustering in hippocampal primary cultures under optogenetic stimulation.',
    now() - INTERVAL '1 hour',
    now() + INTERVAL '2 hours',
    'checked_in',
    false,
    now() - INTERVAL '2 days'
),
(
    'b0000000-0000-0000-0000-000000000002',
    'e0000000-0000-0000-0000-000000000002', -- JEOL SEM
    'a0000000-0000-0000-0000-000000000003', -- Alex Chen
    'Nanowire Array Morphological Cross-Section & EDS',
    'High resolution top-view and 45-degree cross section inspection of zinc oxide nanowires grown on silicon substrate.',
    now() + INTERVAL '1 day 2 hours',
    now() + INTERVAL '1 day 5 hours',
    'confirmed',
    false,
    now() - INTERVAL '1 day'
),
(
    'b0000000-0000-0000-0000-000000000003',
    'e0000000-0000-0000-0000-000000000001', -- Bruker XRD (Restricted)
    'a0000000-0000-0000-0000-000000000003', -- Alex Chen
    'Perovskite Thin-Film Crystallographic Phase Rietveld Analysis',
    'High temperature 2Theta-Omega scan to determine tetragonal to cubic phase transition temperature in halide perovskites.',
    now() + INTERVAL '2 days 4 hours',
    now() + INTERVAL '2 days 7 hours',
    'pending_approval',
    false,
    now() - INTERVAL '4 hours'
),
(
    'b0000000-0000-0000-0000-000000000004',
    'e0000000-0000-0000-0000-000000000003', -- Agilent HPLC
    'a0000000-0000-0000-0000-000000000003', -- Alex Chen
    'Bio-Polymer Hydrolysis Product Separation',
    'Isocratic separation using C18 reverse-phase column at 0.8 mL/min with UV detection at 254 nm.',
    now() - INTERVAL '2 days 6 hours',
    now() - INTERVAL '2 days 3 hours',
    'completed',
    false,
    now() - INTERVAL '4 days'
),
(
    'b0000000-0000-0000-0000-000000000005',
    'e0000000-0000-0000-0000-000000000004', -- PerkinElmer FT-IR
    'a0000000-0000-0000-0000-000000000004', -- Elena Rostova
    'Peptide Secondary Structure Amide I/II Verification',
    'ATR-FTIR baseline check and deconvolution of amide I peak to assess beta-sheet content.',
    now() - INTERVAL '3 hours',
    now() - INTERVAL '45 minutes',
    'overdue',
    false,
    now() - INTERVAL '1 day'
);

-- ============================================================================
-- 5. APPROVALS SEED
-- ============================================================================
INSERT INTO public.approvals (id, booking_id, reviewed_by, status, review_notes, reviewed_at, created_at)
VALUES
(
    'c0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000002', -- SEM booking
    'a0000000-0000-0000-0000-000000000002', -- Operator Sarah Jenkins
    'approved',
    'Researcher has completed Level-2 FESEM qualification and cleanroom hazardous materials induction. Approved.',
    now() - INTERVAL '18 hours',
    now() - INTERVAL '1 day'
),
(
    'c0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000003', -- XRD booking
    NULL,
    'pending',
    NULL,
    NULL,
    now() - INTERVAL '4 hours'
);

-- ============================================================================
-- 6. CHECKLISTS SEED (Issue & Return Handover)
-- ============================================================================
INSERT INTO public.checklists (id, booking_id, checklist_type, conducted_by, cleanliness_ok, calibration_verified, consumables_replenished, safety_hazards_cleared, data_transferred, physical_condition_rating, notes, created_at)
VALUES
(
    'f2000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'issue',
    'a0000000-0000-0000-0000-000000000004', -- Elena Rostova
    true, true, true, true, true, 5,
    'Pre-operation checks passed: 488nm & 561nm laser power stable, immersion lens clean, heating chamber reached 37.0 C.',
    now() - INTERVAL '58 minutes'
),
(
    'f2000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000004',
    'issue',
    'a0000000-0000-0000-0000-000000000003', -- Alex Chen
    true, true, true, true, true, 5,
    'Pressure ripple within 1.2%, solvent bottles degassed, waste container empty.',
    now() - INTERVAL '2 days 5 hours 55 minutes'
),
(
    'f2000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000004',
    'return',
    'a0000000-0000-0000-0000-000000000003', -- Alex Chen
    true, true, true, true, true, 5,
    'Session completed successfully. Column flushed with 80/20 MeOH/Water, autosampler needle washed, raw data exported to NAS.',
    now() - INTERVAL '2 days 3 hours 5 minutes'
);

-- ============================================================================
-- 7. INCIDENTS & DAMAGE REPORTS SEED
-- ============================================================================
INSERT INTO public.incidents_damage (id, equipment_id, booking_id, reported_by, incident_type, severity, description, estimated_downtime_hours, repair_status, created_at, resolved_at)
VALUES
(
    'f3000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000005', -- XPS Spectrometer
    NULL,
    'a0000000-0000-0000-0000-000000000002', -- Operator Sarah Jenkins
    'optical_misalignment',
    'moderate',
    'Monochromator quartz crystal Bragg angle drifted by 0.08 degrees following building power surge. Scheduled service engineer visit.',
    24.0,
    'repair_scheduled',
    now() - INTERVAL '1 day',
    NULL
);

-- ============================================================================
-- 8. AUDIT LOGS SEED
-- ============================================================================
INSERT INTO public.audit_logs (id, user_id, action, entity_type, entity_id, details, ip_address, created_at)
VALUES
(
    'd0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000003',
    'BOOKING_CONFLICT_PREVENTED',
    'booking',
    'e0000000-0000-0000-0000-000000000006',
    '{"message": "Blocked overlapping reservation attempt during active session", "requested_slot": "today 14:00-16:00"}'::jsonb,
    '192.168.1.104',
    now() - INTERVAL '1 hour 15 minutes'
),
(
    'd0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000002',
    'RESTRICTED_BOOKING_APPROVED',
    'approval',
    'b0000000-0000-0000-0000-000000000002',
    '{"equipment": "JEOL JSM-IT800", "applicant": "Alex Chen", "decision": "APPROVED"}'::jsonb,
    '192.168.1.15',
    now() - INTERVAL '18 hours'
),
(
    'd0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000002',
    'MAINTENANCE_LOCK_ENGAGED',
    'maintenance_blocks',
    'f1000000-0000-0000-0000-000000000001',
    '{"equipment": "Kratos AXIS Supra+", "type": "calibration", "hours_locked": 24}'::jsonb,
    '192.168.1.15',
    now() - INTERVAL '2 hours'
);
