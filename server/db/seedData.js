// Seed Data matching PostgreSQL seed schema with dynamic relative timestamps

function getSeedData() {
  const now = new Date();

  // Helper relative dates
  const hoursFromNow = (h) => new Date(now.getTime() + h * 3600 * 1000).toISOString();
  const daysFromNow = (d, h = 0) => new Date(now.getTime() + (d * 24 + h) * 3600 * 1000).toISOString();

  const users = [
    {
      id: 'a0000000-0000-0000-0000-000000000001',
      email: 'admin@labhub.edu',
      password_hash: '$2b$10$yQmJkPJnXM0rYf9lXl6ahuFLXoGOTqfU50/Hao/COm4TLXJ7mOdeK', // Password123!
      full_name: 'Dr. Marcus Vance',
      role: 'admin',
      department: 'Materials Science & Engineering',
      qualification_level: 'Level 4 Master Supervisor',
      phone: '+1 (555) 412-8901',
      created_at: daysFromNow(-30)
    },
    {
      id: 'a0000000-0000-0000-0000-000000000002',
      email: 'operator@labhub.edu',
      password_hash: '$2b$10$yQmJkPJnXM0rYf9lXl6ahuFLXoGOTqfU50/Hao/COm4TLXJ7mOdeK', // Password123!
      full_name: 'Sarah Jenkins',
      role: 'operator',
      department: 'Central Instrumentation Facility',
      qualification_level: 'Level 3 Senior Technician',
      phone: '+1 (555) 309-4412',
      created_at: daysFromNow(-25)
    },
    {
      id: 'a0000000-0000-0000-0000-000000000003',
      email: 'student@labhub.edu',
      password_hash: '$2b$10$yQmJkPJnXM0rYf9lXl6ahuFLXoGOTqfU50/Hao/COm4TLXJ7mOdeK', // Password123!
      full_name: 'Alex Chen',
      role: 'student',
      department: 'Nanotechnology & Advanced Materials',
      qualification_level: 'Level 2 Certified Researcher',
      phone: '+1 (555) 890-2134',
      created_at: daysFromNow(-20)
    },
    {
      id: 'a0000000-0000-0000-0000-000000000004',
      email: 'scholar@labhub.edu',
      password_hash: '$2b$10$yQmJkPJnXM0rYf9lXl6ahuFLXoGOTqfU50/Hao/COm4TLXJ7mOdeK', // Password123!
      full_name: 'Dr. Elena Rostova',
      role: 'student',
      department: 'Biophysics & Structural Biology',
      qualification_level: 'Level 2 Certified Researcher',
      phone: '+1 (555) 672-9901',
      created_at: daysFromNow(-15)
    }
  ];

  const equipment = [
    {
      id: 'e0000000-0000-0000-0000-000000000001',
      code: 'XRD-BRUKER-01',
      name: 'Bruker D8 Advance X-Ray Diffractometer (XRD)',
      category: 'Spectroscopy',
      lab_location: 'Crystalline Phase Characterization Suite',
      building: 'Materials Research Center',
      room: 'Room 104',
      is_restricted: true,
      status: 'available',
      hourly_rate: 45.00,
      buffer_time_mins: 30,
      max_booking_hours: 4,
      specs: {
        radiation_source: 'Cu K-alpha (lambda=1.5406 A)',
        detector: 'LYNXEYE XE-T high resolution',
        goniometer: 'Theta-Theta radius 280mm',
        voltage: '40 kV / 40 mA',
        sample_stages: ['Standard 9-position changer', 'High-temp chamber Anton Paar HTK 1200N']
      },
      safety_instructions: 'Personal dosimeter badge mandatory. Verify safety interlock shutter before beam activation. Keep chiller flow rate >= 3.5 L/min.',
      image_url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=600&q=80',
      created_at: daysFromNow(-60)
    },
    {
      id: 'e0000000-0000-0000-0000-000000000002',
      code: 'SEM-JEOL-02',
      name: 'JEOL JSM-IT800 Field Emission SEM',
      category: 'Electron Microscopy',
      lab_location: 'Ultra-Microscopy Suite',
      building: 'Nanotechnology Complex',
      room: 'Room B12',
      is_restricted: true,
      status: 'available',
      hourly_rate: 65.00,
      buffer_time_mins: 30,
      max_booking_hours: 3,
      specs: {
        electron_gun: 'Schottky Field Emission',
        resolution: '0.7 nm at 15 kV / 1.0 nm at 1 kV',
        magnification: '10x to 2,000,000x',
        detectors: ['Upper Secondary Electron (UED)', 'Low Angle Backscatter (BED)', 'Oxford Ultim Max EDS']
      },
      safety_instructions: 'Samples must be dry and conductive (or gold/carbon sputter-coated). Do not vent chamber without liquid nitrogen cold trap filled.',
      image_url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80',
      created_at: daysFromNow(-60)
    },
    {
      id: 'e0000000-0000-0000-0000-000000000003',
      code: 'HPLC-AGILENT-03',
      name: 'Agilent 1260 Infinity II HPLC System',
      category: 'Chromatography',
      lab_location: 'Separation Science Core',
      building: 'Chemical Sciences Hall',
      room: 'Room 220',
      is_restricted: false,
      status: 'available',
      hourly_rate: 25.00,
      buffer_time_mins: 15,
      max_booking_hours: 6,
      specs: {
        pump_type: 'Quaternary Pump up to 600 bar',
        autosampler: 'Vialsampler with Peltier cooling (4-40 C)',
        detectors: ['Diode Array Detector (DAD WR 190-950 nm)', 'Refractive Index Detector (RID)'],
        column_oven: 'Twin Peltier heated/cooled 10-85 C'
      },
      safety_instructions: 'All mobile phases must be 0.22 um filtered and degassed. Flush column with 80% MeOH:H2O after buffer usage.',
      image_url: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=600&q=80',
      created_at: daysFromNow(-60)
    },
    {
      id: 'e0000000-0000-0000-0000-000000000004',
      code: 'FTIR-PKELM-04',
      name: 'PerkinElmer Spectrum Two FT-IR Spectrometer',
      category: 'Spectroscopy',
      lab_location: 'Polymer & Organic Characterization Lab',
      building: 'Chemical Sciences Hall',
      room: 'Room 115',
      is_restricted: false,
      status: 'available',
      hourly_rate: 15.00,
      buffer_time_mins: 15,
      max_booking_hours: 3,
      specs: {
        spectral_range: '8300 - 350 cm-1',
        resolution: 'Better than 0.5 cm-1',
        accessory: 'Single reflection diamond ATR top-plate',
        signal_to_noise: '14,500:1 peak-to-peak 5-sec scan'
      },
      safety_instructions: 'Clean diamond crystal gently using isopropanol lens wipe only. Do not exceed torque limit on pressure clamp.',
      image_url: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=600&q=80',
      created_at: daysFromNow(-60)
    },
    {
      id: 'e0000000-0000-0000-0000-000000000005',
      code: 'XPS-KRATOS-05',
      name: 'Kratos AXIS Supra+ XPS Spectrometer',
      category: 'Surface Science',
      lab_location: 'Surface Analysis Cleanroom',
      building: 'Nanotechnology Complex',
      room: 'Room 301',
      is_restricted: true,
      status: 'maintenance',
      hourly_rate: 90.00,
      buffer_time_mins: 45,
      max_booking_hours: 5,
      specs: {
        xray_source: 'Monochromatic Al K-alpha (1486.6 eV) & Dual Anode Mg/Al',
        energy_resolution: '< 0.48 eV on Ag 3d5/2',
        analyzer: '165 mm mean radius hemispherical analyzer + Delay Line Detector',
        ultra_high_vacuum: 'Base pressure 5 x 10^-10 Torr'
      },
      safety_instructions: 'Strict cleanroom protocol. No high vapor pressure polymers allowed. Liquid Nitrogen degassing cycle required prior to entry.',
      image_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
      created_at: daysFromNow(-60)
    },
    {
      id: 'e0000000-0000-0000-0000-000000000006',
      code: 'CONF-OLYMPUS-06',
      name: 'Olympus FV3000 Confocal Laser Microscope',
      category: 'Laser & Optical',
      lab_location: 'Advanced Cellular Bio-Imaging Facility',
      building: 'Life Sciences Pavilion',
      room: 'Room 408',
      is_restricted: true,
      status: 'in_use',
      hourly_rate: 50.00,
      buffer_time_mins: 20,
      max_booking_hours: 4,
      specs: {
        lasers: ['405nm diode', '488nm diode', '561nm DPSS', '640nm diode'],
        detectors: ['4-channel GaAsP spectral high-sensitivity'],
        objectives: ['10x Plan-Apo', '20x UPlanSApo', '60x Oil SIL Plan-Apochromat NA 1.40'],
        stage: 'IX83 motorized inverted with Tokai Hit incubator'
      },
      safety_instructions: 'Laser key safety interlock must be engaged. Use only immersion oil type-F. Turn off 405nm diode laser if idle > 20 mins.',
      image_url: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&w=600&q=80',
      created_at: daysFromNow(-60)
    }
  ];

  const maintenance_blocks = [
    {
      id: 'm0000000-0000-0000-0000-000000000001',
      equipment_id: 'e0000000-0000-0000-0000-000000000005', // XPS Spectrometer
      created_by: 'a0000000-0000-0000-0000-000000000002', // Operator
      maintenance_type: 'calibration',
      technician_name: 'Dr. David Sterling (Field Service Engineer, Kratos Analytical)',
      start_time: hoursFromNow(-2),
      end_time: hoursFromNow(22),
      notes: 'Semi-annual ultra-high vacuum bakeout, ion source filament replacement, and work function calibration on standard Au/Ag/Cu foil set.',
      status: 'in_progress',
      created_at: daysFromNow(-1)
    },
    {
      id: 'm0000000-0000-0000-0000-000000000002',
      equipment_id: 'e0000000-0000-0000-0000-000000000001', // XRD Bruker
      created_by: 'a0000000-0000-0000-0000-000000000001', // Admin
      maintenance_type: 'routine',
      technician_name: 'Sarah Jenkins (Lead Tech)',
      start_time: daysFromNow(3, 2),
      end_time: daysFromNow(3, 6),
      notes: 'Quarterly optical alignment check, goniometer zero-point calibration using standard Corundum SRM 1976b.',
      status: 'scheduled',
      created_at: daysFromNow(-2)
    }
  ];

  const bookings = [
    {
      id: 'b0000000-0000-0000-0000-000000000001',
      equipment_id: 'e0000000-0000-0000-0000-000000000006', // Olympus FV3000
      user_id: 'a0000000-0000-0000-0000-000000000004', // Elena Rostova
      title: 'Live Neuron Synaptic Vesicle Z-Stack Imaging',
      research_purpose: 'Characterizing membrane dynamics and vesicle clustering in hippocampal primary cultures under optogenetic stimulation.',
      start_time: hoursFromNow(-1),
      end_time: hoursFromNow(2),
      status: 'checked_in',
      conflict_detected: false,
      created_at: daysFromNow(-2)
    },
    {
      id: 'b0000000-0000-0000-0000-000000000002',
      equipment_id: 'e0000000-0000-0000-0000-000000000002', // JEOL SEM
      user_id: 'a0000000-0000-0000-0000-000000000003', // Alex Chen
      title: 'Nanowire Array Morphological Cross-Section & EDS',
      research_purpose: 'High resolution top-view and 45-degree cross section inspection of zinc oxide nanowires grown on silicon substrate.',
      start_time: daysFromNow(1, 2),
      end_time: daysFromNow(1, 5),
      status: 'confirmed',
      conflict_detected: false,
      created_at: daysFromNow(-1)
    },
    {
      id: 'b0000000-0000-0000-0000-000000000003',
      equipment_id: 'e0000000-0000-0000-0000-000000000001', // Bruker XRD (Restricted)
      user_id: 'a0000000-0000-0000-0000-000000000003', // Alex Chen
      title: 'Perovskite Thin-Film Crystallographic Phase Rietveld Analysis',
      research_purpose: 'High temperature 2Theta-Omega scan to determine tetragonal to cubic phase transition temperature in halide perovskites.',
      start_time: daysFromNow(2, 3),
      end_time: daysFromNow(2, 6),
      status: 'pending_approval',
      conflict_detected: false,
      created_at: hoursFromNow(-4)
    },
    {
      id: 'b0000000-0000-0000-0000-000000000004',
      equipment_id: 'e0000000-0000-0000-0000-000000000003', // Agilent HPLC
      user_id: 'a0000000-0000-0000-0000-000000000003', // Alex Chen
      title: 'Bio-Polymer Hydrolysis Product Separation',
      research_purpose: 'Isocratic separation using C18 reverse-phase column at 0.8 mL/min with UV detection at 254 nm.',
      start_time: daysFromNow(-2, 2),
      end_time: daysFromNow(-2, 5),
      status: 'completed',
      conflict_detected: false,
      created_at: daysFromNow(-4)
    },
    {
      id: 'b0000000-0000-0000-0000-000000000005',
      equipment_id: 'e0000000-0000-0000-0000-000000000004', // PerkinElmer FT-IR
      user_id: 'a0000000-0000-0000-0000-000000000004', // Elena Rostova
      title: 'Peptide Secondary Structure Amide I/II Verification',
      research_purpose: 'ATR-FTIR baseline check and deconvolution of amide I peak to assess beta-sheet content.',
      start_time: hoursFromNow(-3),
      end_time: hoursFromNow(-1),
      status: 'overdue',
      conflict_detected: false,
      created_at: daysFromNow(-1)
    }
  ];

  const approvals = [
    {
      id: 'c0000000-0000-0000-0000-000000000001',
      booking_id: 'b0000000-0000-0000-0000-000000000002',
      reviewed_by: 'a0000000-0000-0000-0000-000000000002',
      status: 'approved',
      review_notes: 'Researcher has completed Level-2 FESEM qualification and cleanroom hazardous materials induction. Approved.',
      reviewed_at: daysFromNow(-1),
      created_at: daysFromNow(-1)
    },
    {
      id: 'c0000000-0000-0000-0000-000000000002',
      booking_id: 'b0000000-0000-0000-0000-000000000003',
      reviewed_by: null,
      status: 'pending',
      review_notes: null,
      reviewed_at: null,
      created_at: hoursFromNow(-4)
    }
  ];

  const checklists = [
    {
      id: 'k0000000-0000-0000-0000-000000000001',
      booking_id: 'b0000000-0000-0000-0000-000000000001',
      checklist_type: 'issue',
      conducted_by: 'a0000000-0000-0000-0000-000000000004',
      cleanliness_ok: true,
      calibration_verified: true,
      consumables_replenished: true,
      safety_hazards_cleared: true,
      data_transferred: true,
      physical_condition_rating: 5,
      notes: 'Pre-operation checks passed: 488nm & 561nm laser power stable, immersion lens clean, heating chamber reached 37.0 C.',
      created_at: hoursFromNow(-1)
    },
    {
      id: 'k0000000-0000-0000-0000-000000000002',
      booking_id: 'b0000000-0000-0000-0000-000000000004',
      checklist_type: 'issue',
      conducted_by: 'a0000000-0000-0000-0000-000000000003',
      cleanliness_ok: true,
      calibration_verified: true,
      consumables_replenished: true,
      safety_hazards_cleared: true,
      data_transferred: true,
      physical_condition_rating: 5,
      notes: 'Pressure ripple within 1.2%, solvent bottles degassed, waste container empty.',
      created_at: daysFromNow(-2, 2)
    },
    {
      id: 'k0000000-0000-0000-0000-000000000003',
      booking_id: 'b0000000-0000-0000-0000-000000000004',
      checklist_type: 'return',
      conducted_by: 'a0000000-0000-0000-0000-000000000003',
      cleanliness_ok: true,
      calibration_verified: true,
      consumables_replenished: true,
      safety_hazards_cleared: true,
      data_transferred: true,
      physical_condition_rating: 5,
      notes: 'Session completed successfully. Column flushed with 80/20 MeOH/Water, autosampler needle washed, raw data exported to NAS.',
      created_at: daysFromNow(-2, 5)
    }
  ];

  const incidents_damage = [
    {
      id: 'i0000000-0000-0000-0000-000000000001',
      equipment_id: 'e0000000-0000-0000-0000-000000000005',
      booking_id: null,
      reported_by: 'a0000000-0000-0000-0000-000000000002',
      incident_type: 'optical_misalignment',
      severity: 'moderate',
      description: 'Monochromator quartz crystal Bragg angle drifted by 0.08 degrees following building power surge. Scheduled service engineer visit.',
      estimated_downtime_hours: 24.0,
      repair_status: 'repair_scheduled',
      created_at: daysFromNow(-1),
      resolved_at: null
    }
  ];

  const audit_logs = [
    {
      id: 'd0000000-0000-0000-0000-000000000001',
      user_id: 'a0000000-0000-0000-0000-000000000003',
      action: 'BOOKING_CONFLICT_PREVENTED',
      entity_type: 'booking',
      entity_id: 'e0000000-0000-0000-0000-000000000006',
      details: { message: 'Blocked overlapping reservation attempt during active session', requested_slot: '14:00-16:00' },
      ip_address: '192.168.1.104',
      created_at: hoursFromNow(-1.2)
    },
    {
      id: 'd0000000-0000-0000-0000-000000000002',
      user_id: 'a0000000-0000-0000-0000-000000000002',
      action: 'RESTRICTED_BOOKING_APPROVED',
      entity_type: 'approval',
      entity_id: 'b0000000-0000-0000-0000-000000000002',
      details: { equipment: 'JEOL JSM-IT800', applicant: 'Alex Chen', decision: 'APPROVED' },
      ip_address: '192.168.1.15',
      created_at: hoursFromNow(-18)
    },
    {
      id: 'd0000000-0000-0000-0000-000000000003',
      user_id: 'a0000000-0000-0000-0000-000000000002',
      action: 'MAINTENANCE_LOCK_ENGAGED',
      entity_type: 'maintenance_blocks',
      entity_id: 'm0000000-0000-0000-0000-000000000001',
      details: { equipment: 'Kratos AXIS Supra+', type: 'calibration', hours_locked: 24 },
      ip_address: '192.168.1.15',
      created_at: hoursFromNow(-2)
    }
  ];

  return {
    users,
    equipment,
    maintenance_blocks,
    bookings,
    approvals,
    checklists,
    incidents_damage,
    audit_logs
  };
}

module.exports = {
  getSeedData
};
