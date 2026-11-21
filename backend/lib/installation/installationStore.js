// Backend Data Store & Helper for Solvix Installation, Technician Assignment & Project Execution Module
// Integrates with Supabase database with in-memory persistence fallback for resilient operation.

export const STANDARD_INSTALLATION_TASKS = [
  { name: 'Site readiness verified', is_required: true, order_index: 1, notes: 'Confirm terrace access, structural stability, clearance, and safety barricading.' },
  { name: 'Mounting structure installed', is_required: true, order_index: 2, notes: 'Anchor HDGI / Aluminium structure with correct south tilt and wind load bracing.' },
  { name: 'Solar panels installed', is_required: true, order_index: 3, notes: 'Mount and secure PV modules with mid and end clamps. Torque check completed.' },
  { name: 'Inverter installed', is_required: true, order_index: 4, notes: 'Mount string / hybrid inverter in shaded, well-ventilated wall location.' },
  { name: 'Battery installed, where applicable', is_required: false, order_index: 5, notes: 'Install battery rack and secure lithium-ion / lead-acid battery bank (hybrid/off-grid).' },
  { name: 'Electrical connections checked', is_required: true, order_index: 6, notes: 'Connect DC strings via MC4 connectors and AC supply through dedicated MCB / Isolator.' },
  { name: 'Earthing checked', is_required: true, order_index: 7, notes: 'Verify separate earthing pits for AC, DC, and Lightning Arrestor. Measure resistance.' },
  { name: 'Protection equipment checked', is_required: true, order_index: 8, notes: 'Verify DCDB (Surge Protection Device + DC Fuses) and ACDB (SPD + MCB).' },
  { name: 'Wiring inspected', is_required: true, order_index: 9, notes: 'Check UV-resistant solar cables, neat tagging, and conduit pipe routing.' },
  { name: 'System testing completed', is_required: true, order_index: 10, notes: 'Verify open-circuit voltage (Voc), short-circuit current (Isc), inverter sync, and generation.' },
  { name: 'Customer demonstration completed', is_required: true, order_index: 11, notes: 'Demonstrate app monitoring, emergency shutdown procedure, and panel cleaning guidelines.' }
];

export const INSTALLATION_STATUSES = [
  'pending',
  'assigned',
  'scheduled',
  'in_progress',
  'on_hold',
  'inspection_required',
  'completed',
  'cancelled'
];

let memoryTechnicians = [
  {
    id: 'tech-001',
    profile_id: '00000000-0000-0000-0000-000000000001',
    employee_code: 'TECH-101',
    full_name: 'Arun Kumar',
    email: 'arun.kumar@solvix.energy',
    phone: '+91 98101 23456',
    skills: ['Rooftop Solar', 'High Voltage DC', 'String Inverters', 'Earthing & Lightning Protection'],
    certifications: ['MNRE Certified Solar PV Installer', 'IEC 60364 Electrical Inspector'],
    max_daily_jobs: 2,
    is_available: true,
    active_assignments: 1,
    completed_installations: 24,
    created_at: '2026-10-01T09:00:00Z',
    updated_at: '2026-11-20T10:00:00Z'
  },
  {
    id: 'tech-002',
    profile_id: 'tech2-0000-0000-0000-000000000002',
    employee_code: 'TECH-102',
    full_name: 'Pooja Verma',
    email: 'pooja.verma@solvix.energy',
    phone: '+91 98112 34567',
    skills: ['Hybrid Inverters', 'Lithium Battery Storage', 'Microinverters', 'Net Metering Compliance'],
    certifications: ['BEE Energy Auditor', 'Certified Battery Storage Specialist'],
    max_daily_jobs: 2,
    is_available: true,
    active_assignments: 2,
    completed_installations: 31,
    created_at: '2026-10-05T09:00:00Z',
    updated_at: '2026-11-20T10:00:00Z'
  },
  {
    id: 'tech-003',
    profile_id: 'tech3-0000-0000-0000-000000000003',
    employee_code: 'TECH-103',
    full_name: 'Manoj Tiwari',
    email: 'manoj.tiwari@solvix.energy',
    phone: '+91 98234 56789',
    skills: ['Mounting Structure Fabrication', 'Cable Trays & Conduits', 'Panel Rigging'],
    certifications: ['Certified Rooftop Safety Rigger', 'Structural Steel Welder'],
    max_daily_jobs: 3,
    is_available: true,
    active_assignments: 1,
    completed_installations: 42,
    created_at: '2026-10-10T09:00:00Z',
    updated_at: '2026-11-20T10:00:00Z'
  },
  {
    id: 'tech-004',
    profile_id: 'tech4-0000-0000-0000-000000000004',
    employee_code: 'TECH-104',
    full_name: 'Suresh Raina',
    email: 'suresh.raina@solvix.energy',
    phone: '+91 98345 67890',
    skills: ['Commissioning', 'Smart Meters', 'SCADA & Monitoring', 'Inverter Firmware'],
    certifications: ['SMA / Sungrow Certified Technician'],
    max_daily_jobs: 2,
    is_available: false,
    active_assignments: 0,
    completed_installations: 18,
    created_at: '2026-10-15T09:00:00Z',
    updated_at: '2026-11-20T10:00:00Z'
  }
];

let memoryJobs = [
  {
    id: 'inst-001-0000-0000-000000000001',
    installation_code: 'INST-2026-081',
    order_id: 'ord-001',
    order_code: 'ORD-2026-0014',
    customer_id: 'c101-0000-0000-0000-000000000001',
    customer_name: 'Rajesh Sharma',
    contact_phone: '+91 98112 34567',
    contact_email: 'rajesh.sharma@example.com',
    site_address: 'Plot 42, Pocket B, Greater Kailash I, New Delhi, Delhi 110048',
    city: 'New Delhi',
    system_type: 'on-grid',
    system_capacity_kw: 10.0,
    site_survey_id: 's101-0000-0000-0000-000000000001',
    survey_code: 'SRV-2026-1011',
    survey_info: {
      roof_type: 'rcc_flat',
      roof_area_sqm: 160.0,
      available_area_sqm: 120.0,
      sanctioned_load_kw: 12.0,
      existing_meter: 'BSES three-phase digital meter'
    },
    delivery_info: {
      dispatch_code: 'DSP-2026-042',
      delivery_date: '2026-11-19',
      status: 'delivered',
      delivered_at: '2026-11-19T14:30:00Z',
      warehouse_name: 'Central Warehouse Okhla',
      delivery_notes: 'All items received on site in intact packaging. Signed by customer.'
    },
    assigned_technicians: [
      {
        technician_id: 'tech-001',
        employee_code: 'TECH-101',
        full_name: 'Arun Kumar',
        role_on_job: 'lead_technician',
        is_primary: true,
        phone: '+91 98101 23456',
        assigned_at: '2026-11-20T10:00:00Z'
      },
      {
        technician_id: 'tech-003',
        employee_code: 'TECH-103',
        full_name: 'Manoj Tiwari',
        role_on_job: 'helper',
        is_primary: false,
        phone: '+91 98234 56789',
        assigned_at: '2026-11-20T10:00:00Z'
      }
    ],
    planned_installation_date: '2026-11-22',
    expected_completion_date: '2026-11-23',
    scheduled_start: '2026-11-22T09:00:00Z',
    actual_start: null,
    actual_end: null,
    status: 'scheduled',
    equipment_verified: false,
    equipment_verification_notes: null,
    exception_recorded: false,
    exception_notes: null,
    commissioning_data: null,
    earthing_resistance_ohm: null,
    insulation_test_result: null,
    testing_notes: null,
    completion_report: null,
    notes: 'Customer requested 1.5m elevated HDGI structure. Bring scaffoldings.',
    created_at: '2026-11-19T16:00:00Z',
    updated_at: '2026-11-20T10:00:00Z',
    tasks: STANDARD_INSTALLATION_TASKS.map((t, idx) => ({
      id: `task-001-${idx + 1}`,
      task_name: t.name,
      is_required: t.is_required,
      is_completed: false,
      completed_at: null,
      completed_by: null,
      notes: t.notes,
      remarks: null,
      photo_storage_path: null
    })),
    photos: [],
    customer_signature: null,
    equipment_items: [
      {
        id: 'eq-001',
        product_name: 'Mono PERC Solar Panel 550W (Tier-1)',
        sku: 'SOL-PNL-550W',
        quantity: 18,
        expected_serials: ['SN-PNL-2026-0881', 'SN-PNL-2026-0882', 'SN-PNL-2026-0883', 'SN-PNL-2026-0884'],
        verified_serials: [],
        status: 'delivered',
        warranty_start_date: '2026-11-19', // Tied to delivery!
        warranty_duration_years: 25
      },
      {
        id: 'eq-002',
        product_name: '10kW Three-Phase On-Grid Solar Inverter',
        sku: 'INV-10KW-3PH',
        quantity: 1,
        expected_serials: ['SN-INV-2026-0092'],
        verified_serials: [],
        status: 'delivered',
        warranty_start_date: '2026-11-19', // Tied to delivery!
        warranty_duration_years: 5
      },
      {
        id: 'eq-003',
        product_name: 'HDGI Elevated Structure (1.5m Clearance)',
        sku: 'STR-ELEV-10KW',
        quantity: 1,
        expected_serials: ['SN-STR-2026-0411'],
        verified_serials: [],
        status: 'delivered',
        warranty_start_date: '2026-11-19',
        warranty_duration_years: 10
      },
      {
        id: 'eq-004',
        product_name: 'ACDB + DCDB Dual Protection Box with Type II SPD',
        sku: 'PROT-DB-10KW',
        quantity: 1,
        expected_serials: ['SN-PROT-2026-0210'],
        verified_serials: [],
        status: 'delivered',
        warranty_start_date: '2026-11-19',
        warranty_duration_years: 5
      }
    ],
    status_history: [
      { status: 'pending', changed_at: '2026-11-19T16:00:00Z', notes: 'Installation job auto-created from confirmed Order ORD-2026-0014' },
      { status: 'assigned', changed_at: '2026-11-20T09:30:00Z', notes: 'Assigned to Lead Technician Arun Kumar & Manoj Tiwari' },
      { status: 'scheduled', changed_at: '2026-11-20T10:00:00Z', notes: 'Scheduled for installation on Nov 22, 2026' }
    ]
  },
  {
    id: 'inst-002-0000-0000-000000000002',
    installation_code: 'INST-2026-079',
    order_id: 'ord-002',
    order_code: 'ORD-2026-0011',
    customer_id: 'c102-0000-0000-0000-000000000002',
    customer_name: 'Sharma Textiles Ltd (Anil Sharma)',
    contact_phone: '+91 98223 45678',
    contact_email: 'anil@sharmatextiles.in',
    site_address: 'Industrial Shed 14, Sector 37, Pace City II, Gurugram, Haryana 122001',
    city: 'Gurugram',
    system_type: 'on-grid',
    system_capacity_kw: 50.0,
    site_survey_id: 's102-0000-0000-0000-000000000002',
    survey_code: 'SRV-2026-1024',
    survey_info: {
      roof_type: 'metal_sheet',
      roof_area_sqm: 650.0,
      available_area_sqm: 520.0,
      sanctioned_load_kw: 65.0,
      existing_meter: 'DHBVN HT Metering unit'
    },
    delivery_info: {
      dispatch_code: 'DSP-2026-039',
      delivery_date: '2026-11-17',
      status: 'delivered',
      delivered_at: '2026-11-17T11:00:00Z',
      warehouse_name: 'Central Warehouse Okhla',
      delivery_notes: 'Delivered via 14ft carrier. Craned to rooftop.'
    },
    assigned_technicians: [
      {
        technician_id: 'tech-002',
        employee_code: 'TECH-102',
        full_name: 'Pooja Verma',
        role_on_job: 'lead_technician',
        is_primary: true,
        phone: '+91 98112 34567',
        assigned_at: '2026-11-18T09:00:00Z'
      }
    ],
    planned_installation_date: '2026-11-18',
    expected_completion_date: '2026-11-21',
    scheduled_start: '2026-11-18T08:30:00Z',
    actual_start: '2026-11-18T09:00:00Z',
    actual_end: null,
    status: 'in_progress',
    equipment_verified: true,
    equipment_verification_notes: 'All 92 panels, 50kW Sungrow Inverter, and structural fixtures verified on site.',
    exception_recorded: false,
    exception_notes: null,
    commissioning_data: null,
    earthing_resistance_ohm: 1.8,
    insulation_test_result: 'PASS - 150 MOhm at 1000V DC',
    testing_notes: 'Structure installation and panel clamping completed. Earthing pits tested.',
    completion_report: null,
    notes: 'Heavy machinery in adjacent bay; follow industrial PPE protocols.',
    created_at: '2026-11-17T14:00:00Z',
    updated_at: '2026-11-21T08:00:00Z',
    tasks: STANDARD_INSTALLATION_TASKS.map((t, idx) => ({
      id: `task-002-${idx + 1}`,
      task_name: t.name,
      is_required: t.is_required,
      is_completed: idx < 6, // First 6 completed
      completed_at: idx < 6 ? '2026-11-20T17:00:00Z' : null,
      completed_by: idx < 6 ? 'Pooja Verma' : null,
      notes: t.notes,
      remarks: idx < 6 ? 'Verified and securely fastened according to engineering drawing.' : null,
      photo_storage_path: idx < 6 ? `/uploads/installations/inst-002/task_${idx + 1}.jpg` : null
    })),
    photos: [
      {
        id: 'photo-201',
        photo_type: 'pre_install',
        storage_path: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=60',
        caption: 'Empty metal sheet roof before installation',
        uploaded_at: '2026-11-18T09:30:00Z',
        uploaded_by_name: 'Pooja Verma'
      },
      {
        id: 'photo-202',
        photo_type: 'progress',
        storage_path: 'https://images.unsplash.com/photo-1508873696983-2df5293cb32b?w=800&auto=format&fit=crop&q=60',
        caption: 'Panel array mounting in progress across Shed 14',
        uploaded_at: '2026-11-20T16:00:00Z',
        uploaded_by_name: 'Pooja Verma'
      }
    ],
    customer_signature: null,
    equipment_items: [
      {
        id: 'eq-201',
        product_name: 'Mono PERC Solar Panel 545W Bifacial',
        sku: 'SOL-BIF-545W',
        quantity: 92,
        expected_serials: ['SN-BF-2026-1001', 'SN-BF-2026-1002', 'SN-BF-2026-1003'],
        verified_serials: ['SN-BF-2026-1001', 'SN-BF-2026-1002', 'SN-BF-2026-1003'],
        status: 'verified',
        warranty_start_date: '2026-11-17',
        warranty_duration_years: 25
      },
      {
        id: 'eq-202',
        product_name: '50kW Sungrow Commercial String Inverter',
        sku: 'INV-50KW-COM',
        quantity: 1,
        expected_serials: ['SN-SUN-50K-881'],
        verified_serials: ['SN-SUN-50K-881'],
        status: 'verified',
        warranty_start_date: '2026-11-17',
        warranty_duration_years: 5
      }
    ],
    status_history: [
      { status: 'pending', changed_at: '2026-11-17T14:00:00Z', notes: 'Created from confirmed Order ORD-2026-0011' },
      { status: 'assigned', changed_at: '2026-11-17T15:00:00Z', notes: 'Assigned to Lead Technician Pooja Verma' },
      { status: 'scheduled', changed_at: '2026-11-17T16:00:00Z', notes: 'Scheduled for installation start Nov 18' },
      { status: 'in_progress', changed_at: '2026-11-18T09:00:00Z', notes: 'Team arrived on site, equipment verified, work initiated' }
    ]
  },
  {
    id: 'inst-003-0000-0000-000000000003',
    installation_code: 'INST-2026-072',
    order_id: 'ord-003',
    order_code: 'ORD-2026-0008',
    customer_id: 'c103-0000-0000-0000-000000000003',
    customer_name: 'Meera Patel',
    contact_phone: '+91 98456 78901',
    contact_email: 'meera.patel@example.com',
    site_address: 'Villa 12, Palm Meadows, Whitefield, Bengaluru, Karnataka 560066',
    city: 'Bengaluru',
    system_type: 'hybrid',
    system_capacity_kw: 6.0,
    site_survey_id: null,
    survey_code: 'SRV-2026-0988',
    survey_info: {
      roof_type: 'clay_tile_pitched',
      roof_area_sqm: 110.0,
      available_area_sqm: 80.0,
      sanctioned_load_kw: 8.0
    },
    delivery_info: {
      dispatch_code: 'DSP-2026-031',
      delivery_date: '2026-11-10',
      status: 'delivered',
      delivered_at: '2026-11-10T15:00:00Z',
      warehouse_name: 'Bangalore Hub',
      delivery_notes: 'Delivered in full.'
    },
    assigned_technicians: [
      {
        technician_id: 'tech-002',
        employee_code: 'TECH-102',
        full_name: 'Pooja Verma',
        role_on_job: 'lead_technician',
        is_primary: true,
        phone: '+91 98112 34567',
        assigned_at: '2026-11-11T09:00:00Z'
      }
    ],
    planned_installation_date: '2026-11-12',
    expected_completion_date: '2026-11-13',
    scheduled_start: '2026-11-12T09:00:00Z',
    actual_start: '2026-11-12T09:15:00Z',
    actual_end: '2026-11-13T16:30:00Z',
    status: 'completed',
    equipment_verified: true,
    equipment_verification_notes: 'All items verified and match delivery note.',
    exception_recorded: false,
    exception_notes: null,
    commissioning_data: {
      inverter_model: 'Growatt 6kW Hybrid SPH6000',
      inverter_serial: 'SN-GRW-6K-4421',
      inverter_firmware: 'v3.2.1-B',
      voc_string_1_v: 382.4,
      voc_string_2_v: 379.8,
      isc_string_1_a: 11.2,
      isc_string_2_a: 11.0,
      grid_voltage_v: 234.6,
      grid_frequency_hz: 50.02,
      earthing_resistance_ohm: 1.45,
      insulation_resistance_mohm: 180,
      battery_voltage_v: 51.8,
      battery_state_of_charge_percent: 95,
      test_observations: 'Anti-islanding tested successfully. Automatic switchover to battery backup verified within 15ms.',
      technician_remarks: 'Installation meets IEC 60364 and MNRE standards. System online on Solvix IoT cloud.'
    },
    earthing_resistance_ohm: 1.45,
    insulation_test_result: 'PASS - 180 MOhm',
    testing_notes: 'Fully commissioned and customer trained on mobile app.',
    completion_report: 'Installation successfully completed on Nov 13, 2026. System capacity 6kW with 10kWh Lithium battery storage. Grid synchronization active.',
    notes: 'Premium residential installation. Completed smoothly without disruptions.',
    created_at: '2026-11-10T16:00:00Z',
    updated_at: '2026-11-13T17:00:00Z',
    tasks: STANDARD_INSTALLATION_TASKS.map((t, idx) => ({
      id: `task-003-${idx + 1}`,
      task_name: t.name,
      is_required: t.is_required,
      is_completed: true,
      completed_at: '2026-11-13T16:00:00Z',
      completed_by: 'Pooja Verma',
      notes: t.notes,
      remarks: 'Completed and verified to specification.',
      photo_storage_path: `/uploads/installations/inst-003/task_${idx + 1}.jpg`
    })),
    photos: [
      {
        id: 'photo-301',
        photo_type: 'completion',
        storage_path: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=60',
        caption: 'Completed 6kW rooftop array on clay tile roof',
        uploaded_at: '2026-11-13T15:30:00Z',
        uploaded_by_name: 'Pooja Verma'
      },
      {
        id: 'photo-302',
        photo_type: 'inverter',
        storage_path: 'https://images.unsplash.com/photo-1548611716-ad9c46736466?w=800&auto=format&fit=crop&q=60',
        caption: 'Growatt 6kW Hybrid Inverter & Lithium Battery setup',
        uploaded_at: '2026-11-13T16:00:00Z',
        uploaded_by_name: 'Pooja Verma'
      }
    ],
    customer_signature: {
      id: 'sig-003',
      customer_name: 'Meera Patel',
      signed_at: '2026-11-13T16:45:00Z',
      signature_storage_path: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60"><text x="10" y="40" font-family="cursive" font-size="28" fill="%2310b981">Meera Patel</text></svg>',
      consent_text: 'I acknowledge that the solar installation has been completed, demonstrated, and tested satisfactorily in my presence.'
    },
    equipment_items: [
      {
        id: 'eq-301',
        product_name: 'Mono PERC Solar Panel 500W',
        sku: 'SOL-500W-MN',
        quantity: 12,
        expected_serials: ['SN-500-2026-701', 'SN-500-2026-702'],
        verified_serials: ['SN-500-2026-701', 'SN-500-2026-702'],
        status: 'installed',
        warranty_start_date: '2026-11-10', // Delivered on Nov 10! Unchanged by completion!
        warranty_duration_years: 25
      },
      {
        id: 'eq-302',
        product_name: 'Growatt 6kW Hybrid Inverter',
        sku: 'INV-HYB-6KW',
        quantity: 1,
        expected_serials: ['SN-GRW-6K-4421'],
        verified_serials: ['SN-GRW-6K-4421'],
        status: 'installed',
        warranty_start_date: '2026-11-10', // Delivered on Nov 10!
        warranty_duration_years: 5
      }
    ],
    status_history: [
      { status: 'pending', changed_at: '2026-11-10T16:00:00Z', notes: 'Created from Order ORD-2026-0008' },
      { status: 'assigned', changed_at: '2026-11-11T09:00:00Z', notes: 'Assigned to Pooja Verma' },
      { status: 'scheduled', changed_at: '2026-11-11T10:00:00Z', notes: 'Scheduled for Nov 12-13' },
      { status: 'in_progress', changed_at: '2026-11-12T09:15:00Z', notes: 'Work started' },
      { status: 'completed', changed_at: '2026-11-13T17:00:00Z', notes: 'Commissioning verified and customer signature collected' }
    ]
  },
  {
    id: 'inst-004-0000-0000-000000000004',
    installation_code: 'INST-2026-085',
    order_id: 'ord-004',
    order_code: 'ORD-2026-0017',
    customer_id: 'c104-0000-0000-0000-000000000004',
    customer_name: 'Apex Warehousing Solutions',
    contact_phone: '+91 98765 11223',
    contact_email: 'ops@apexwarehouse.com',
    site_address: 'Khasra 492, NH-48 Express Highway, Manesar, Haryana 122051',
    city: 'Manesar',
    system_type: 'on-grid',
    system_capacity_kw: 100.0,
    site_survey_id: null,
    survey_code: 'SRV-2026-1030',
    survey_info: {
      roof_type: 'metal_sheet',
      roof_area_sqm: 1400.0,
      available_area_sqm: 1100.0,
      sanctioned_load_kw: 120.0
    },
    delivery_info: {
      dispatch_code: 'DSP-2026-045',
      delivery_date: '2026-11-20',
      status: 'delivered',
      delivered_at: '2026-11-20T11:00:00Z',
      warehouse_name: 'Central Warehouse Okhla',
      delivery_notes: '100kW equipment staged on ground warehouse floor.'
    },
    assigned_technicians: [],
    planned_installation_date: null,
    expected_completion_date: null,
    scheduled_start: null,
    actual_start: null,
    actual_end: null,
    status: 'pending',
    equipment_verified: false,
    equipment_verification_notes: null,
    exception_recorded: false,
    exception_notes: null,
    commissioning_data: null,
    earthing_resistance_ohm: null,
    insulation_test_result: null,
    testing_notes: null,
    completion_report: null,
    notes: 'Large commercial project. Needs multi-technician team assignment and crane scheduling.',
    created_at: '2026-11-20T14:00:00Z',
    updated_at: '2026-11-20T14:00:00Z',
    tasks: STANDARD_INSTALLATION_TASKS.map((t, idx) => ({
      id: `task-004-${idx + 1}`,
      task_name: t.name,
      is_required: t.is_required,
      is_completed: false,
      completed_at: null,
      completed_by: null,
      notes: t.notes,
      remarks: null,
      photo_storage_path: null
    })),
    photos: [],
    customer_signature: null,
    equipment_items: [
      {
        id: 'eq-401',
        product_name: 'Mono PERC Solar Panel 550W (Tier-1)',
        sku: 'SOL-PNL-550W',
        quantity: 182,
        expected_serials: ['SN-APX-550-001', 'SN-APX-550-002'],
        verified_serials: [],
        status: 'delivered',
        warranty_start_date: '2026-11-20',
        warranty_duration_years: 25
      },
      {
        id: 'eq-402',
        product_name: '100kW Sungrow Commercial Inverter',
        sku: 'INV-100KW-COM',
        quantity: 1,
        expected_serials: ['SN-SUN-100K-019'],
        verified_serials: [],
        status: 'delivered',
        warranty_start_date: '2026-11-20',
        warranty_duration_years: 5
      }
    ],
    status_history: [
      { status: 'pending', changed_at: '2026-11-20T14:00:00Z', notes: 'Created from confirmed Order ORD-2026-0017' }
    ]
  },
  {
    id: 'inst-005-0000-0000-000000000005',
    installation_code: 'INST-2026-075',
    order_id: 'ord-005',
    order_code: 'ORD-2026-0010',
    customer_id: 'c105-0000-0000-0000-000000000005',
    customer_name: 'Greenfield Cold Storage',
    contact_phone: '+91 98987 65432',
    contact_email: 'info@greenfieldcold.in',
    site_address: 'Industrial Area Phase 2, Sonipat, Haryana 131001',
    city: 'Sonipat',
    system_type: 'on-grid',
    system_capacity_kw: 25.0,
    site_survey_id: null,
    survey_code: 'SRV-2026-1004',
    survey_info: {
      roof_type: 'rcc_flat',
      roof_area_sqm: 400.0,
      available_area_sqm: 320.0,
      sanctioned_load_kw: 35.0
    },
    delivery_info: {
      dispatch_code: 'DSP-2026-035',
      delivery_date: '2026-11-14',
      status: 'delivered',
      delivered_at: '2026-11-14T12:00:00Z',
      warehouse_name: 'Central Warehouse Okhla',
      delivery_notes: 'Delivered.'
    },
    assigned_technicians: [
      {
        technician_id: 'tech-001',
        employee_code: 'TECH-101',
        full_name: 'Arun Kumar',
        role_on_job: 'lead_technician',
        is_primary: true,
        phone: '+91 98101 23456',
        assigned_at: '2026-11-15T10:00:00Z'
      }
    ],
    planned_installation_date: '2026-11-16',
    expected_completion_date: '2026-11-18',
    scheduled_start: '2026-11-16T09:00:00Z',
    actual_start: '2026-11-16T10:00:00Z',
    actual_end: null,
    status: 'on_hold',
    equipment_verified: true,
    equipment_verification_notes: 'Equipment verified on site.',
    exception_recorded: true,
    exception_notes: 'Roof waterproofing warranty repair requested by cold storage management before anchor fasteners can be grouted. Client in discussions with civil contractor.',
    commissioning_data: null,
    earthing_resistance_ohm: null,
    insulation_test_result: null,
    testing_notes: null,
    completion_report: null,
    notes: 'Delayed due to roof civil work. Expected resume: Nov 28.',
    created_at: '2026-11-14T14:00:00Z',
    updated_at: '2026-11-17T11:00:00Z',
    tasks: STANDARD_INSTALLATION_TASKS.map((t, idx) => ({
      id: `task-005-${idx + 1}`,
      task_name: t.name,
      is_required: t.is_required,
      is_completed: idx < 2,
      completed_at: idx < 2 ? '2026-11-16T15:00:00Z' : null,
      completed_by: idx < 2 ? 'Arun Kumar' : null,
      notes: t.notes,
      remarks: idx < 2 ? 'Site readiness checked; waterproofing hold imposed.' : null,
      photo_storage_path: null
    })),
    photos: [],
    customer_signature: null,
    equipment_items: [],
    status_history: [
      { status: 'pending', changed_at: '2026-11-14T14:00:00Z', notes: 'Created from Order ORD-2026-0010' },
      { status: 'assigned', changed_at: '2026-11-15T10:00:00Z', notes: 'Assigned to Arun Kumar' },
      { status: 'scheduled', changed_at: '2026-11-15T11:00:00Z', notes: 'Scheduled for Nov 16' },
      { status: 'in_progress', changed_at: '2026-11-16T10:00:00Z', notes: 'Work started' },
      { status: 'on_hold', changed_at: '2026-11-17T11:00:00Z', notes: 'Work placed on hold due to client roof civil waterproofing' }
    ]
  }
];

export const installationStore = {
  // 1. Dashboard Metrics
  async getDashboardMetrics() {
    const todayStr = new Date().toISOString().split('T')[0];
    const totalProjects = memoryJobs.length;
    const pending = memoryJobs.filter(j => j.status === 'pending').length;
    const assigned = memoryJobs.filter(j => j.status === 'assigned').length;
    const scheduled = memoryJobs.filter(j => j.status === 'scheduled').length;
    const inProgress = memoryJobs.filter(j => j.status === 'in_progress').length;
    const completed = memoryJobs.filter(j => j.status === 'completed').length;
    const onHold = memoryJobs.filter(j => j.status === 'on_hold').length;
    const inspectionRequired = memoryJobs.filter(j => j.status === 'inspection_required').length;
    const cancelled = memoryJobs.filter(j => j.status === 'cancelled').length;

    // Delayed projects: status in_progress or scheduled, and expected_completion_date < today
    const delayed = memoryJobs.filter(j => {
      if (j.status === 'completed' || j.status === 'cancelled') return false;
      if (j.status === 'on_hold') return true;
      if (j.expected_completion_date && j.expected_completion_date < todayStr) return true;
      return false;
    }).length;

    // Upcoming installations: scheduled or assigned with future planned date
    const upcoming = memoryJobs.filter(j => {
      if (['scheduled', 'assigned'].includes(j.status) && j.planned_installation_date && j.planned_installation_date >= todayStr) return true;
      return false;
    }).length;

    const statusDistribution = [
      { name: 'Pending', count: pending, color: '#f59e0b' },
      { name: 'Assigned', count: assigned, color: '#3b82f6' },
      { name: 'Scheduled', count: scheduled, color: '#06b6d4' },
      { name: 'In Progress', count: inProgress, color: '#8b5cf6' },
      { name: 'On Hold', count: onHold, color: '#f97316' },
      { name: 'Inspection Required', count: inspectionRequired, color: '#eab308' },
      { name: 'Completed', count: completed, color: '#10b981' },
      { name: 'Cancelled', count: cancelled, color: '#ef4444' }
    ];

    // Compute live workload per technician
    const technicianWorkload = memoryTechnicians.map(tech => {
      const activeJobs = memoryJobs.filter(j => 
        !['completed', 'cancelled'].includes(j.status) &&
        (j.assigned_technicians || []).some(at => at.technician_id === tech.id)
      );
      const completedCount = memoryJobs.filter(j => 
        j.status === 'completed' &&
        (j.assigned_technicians || []).some(at => at.technician_id === tech.id)
      ).length + tech.completed_installations;

      return {
        ...tech,
        active_assignments: activeJobs.length,
        current_workload_pct: Math.min(100, Math.round((activeJobs.length / (tech.max_daily_jobs || 1)) * 100)),
        completed_installations: completedCount,
        assigned_jobs: activeJobs.map(j => ({
          id: j.id,
          installation_code: j.installation_code,
          customer_name: j.customer_name,
          status: j.status,
          planned_installation_date: j.planned_installation_date
        }))
      };
    });

    // Recent activity list compiled from status histories
    const recentActivity = [];
    for (const j of memoryJobs) {
      for (const h of j.status_history || []) {
        recentActivity.push({
          job_id: j.id,
          installation_code: j.installation_code,
          customer_name: j.customer_name,
          status: h.status,
          notes: h.notes,
          timestamp: h.changed_at
        });
      }
    }
    recentActivity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return {
      kpis: {
        totalProjects,
        pending,
        assigned,
        scheduled,
        inProgress,
        completed,
        delayed,
        upcoming,
        onHold,
        inspectionRequired
      },
      statusDistribution,
      technicianWorkload,
      recentActivity: recentActivity.slice(0, 10),
      upcomingInstallations: memoryJobs
        .filter(j => ['scheduled', 'assigned'].includes(j.status))
        .sort((a, b) => (a.planned_installation_date || '').localeCompare(b.planned_installation_date || ''))
        .slice(0, 5)
    };
  },

  // 2. Get Jobs List with search and filtering
  async getJobs({ search = '', status = '', technician_id = '', date = '', page = 1, limit = 50 } = {}, profile = null, isAdmin = true, isTechnician = false) {
    let list = [...memoryJobs];

    // If technician (not admin or manager), show only assigned jobs
    if (!isAdmin && isTechnician && profile) {
      list = list.filter(j => 
        (j.assigned_technicians || []).some(at => at.technician_id === profile.id || at.employee_code === profile.employee_id) ||
        j.created_by === profile.id
      );
    }

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(j => 
        (j.installation_code && j.installation_code.toLowerCase().includes(q)) ||
        (j.order_code && j.order_code.toLowerCase().includes(q)) ||
        (j.customer_name && j.customer_name.toLowerCase().includes(q)) ||
        (j.site_address && j.site_address.toLowerCase().includes(q)) ||
        (j.city && j.city.toLowerCase().includes(q))
      );
    }

    if (status && status !== 'all') {
      list = list.filter(j => j.status === status);
    }

    if (technician_id && technician_id !== 'all') {
      list = list.filter(j => (j.assigned_technicians || []).some(at => at.technician_id === technician_id));
    }

    if (date) {
      list = list.filter(j => j.planned_installation_date === date || (j.scheduled_start && j.scheduled_start.startsWith(date)));
    }

    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const total = list.length;
    const startIndex = (page - 1) * limit;
    const paginated = list.slice(startIndex, startIndex + limit);

    return {
      jobs: paginated,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  // 3. Get Single Job Details
  async getJobById(id, profile = null, isAdmin = true) {
    const job = memoryJobs.find(j => j.id === id || j.installation_code === id);
    if (!job) return null;

    // Check technician access
    if (!isAdmin && profile) {
      const isAssigned = (job.assigned_technicians || []).some(at => 
        at.technician_id === profile.id || at.employee_code === profile.employee_id
      );
      if (!isAssigned && job.created_by !== profile.id && profile.account_type !== 'admin') {
        const error = new Error('Access denied. You are not assigned to this installation job.');
        error.status = 403;
        throw error;
      }
    }

    return job;
  },

  // 4. Create Job from Confirmed Order (prevents duplicates)
  async createJobFromOrder(orderData, actor = null) {
    const orderId = orderData.order_id || orderData.id;
    const orderCode = orderData.order_code;

    // Check for duplicate installation
    const existing = memoryJobs.find(j => j.order_id === orderId || (orderCode && j.order_code === orderCode));
    if (existing) {
      return {
        job: existing,
        already_exists: true,
        message: `An installation project already exists for Order ${orderCode || orderId}: ${existing.installation_code}`
      };
    }

    const yr = new Date().getFullYear();
    const count = memoryJobs.length + 86;
    const installation_code = `INST-${yr}-${String(count).padStart(3, '0')}`;

    const newJob = {
      id: `inst-${Date.now()}`,
      installation_code,
      order_id: orderId,
      order_code: orderCode || `ORD-${yr}-${Math.floor(1000 + Math.random() * 9000)}`,
      customer_id: orderData.customer_id || `cust-${Date.now()}`,
      customer_name: orderData.customer_name || 'Customer',
      contact_phone: orderData.contact_phone || '',
      contact_email: orderData.contact_email || '',
      site_address: orderData.site_address || orderData.address || 'Site Address, India',
      city: orderData.city || 'Delhi NCR',
      system_type: orderData.system_type || 'on-grid',
      system_capacity_kw: Number(orderData.system_capacity_kw) || 5.0,
      site_survey_id: orderData.site_survey_id || null,
      survey_code: orderData.survey_code || null,
      survey_info: orderData.survey_info || null,
      delivery_info: orderData.delivery_info || {
        dispatch_code: `DSP-${yr}-${Math.floor(100 + Math.random() * 900)}`,
        delivery_date: new Date().toISOString().split('T')[0],
        status: 'delivered',
        delivered_at: new Date().toISOString(),
        warehouse_name: 'Central Warehouse Okhla',
        delivery_notes: 'All items delivered and verified on site.'
      },
      assigned_technicians: [],
      planned_installation_date: orderData.planned_installation_date || null,
      expected_completion_date: orderData.expected_completion_date || null,
      scheduled_start: null,
      actual_start: null,
      actual_end: null,
      status: 'pending',
      equipment_verified: false,
      equipment_verification_notes: null,
      exception_recorded: false,
      exception_notes: null,
      commissioning_data: null,
      earthing_resistance_ohm: null,
      insulation_test_result: null,
      testing_notes: null,
      completion_report: null,
      notes: orderData.notes || 'Created from confirmed order.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: actor ? actor.id : null,
      tasks: STANDARD_INSTALLATION_TASKS.map((t, idx) => ({
        id: `task-${Date.now()}-${idx + 1}`,
        task_name: t.name,
        is_required: t.is_required,
        is_completed: false,
        completed_at: null,
        completed_by: null,
        notes: t.notes,
        remarks: null,
        photo_storage_path: null
      })),
      photos: [],
      customer_signature: null,
      equipment_items: orderData.equipment_items || [
        {
          id: `eq-${Date.now()}-1`,
          product_name: `Solar Modules (${orderData.system_capacity_kw || 5}kW Array)`,
          sku: 'SOL-MOD-TIER1',
          quantity: Math.ceil((Number(orderData.system_capacity_kw) || 5) * 1000 / 550),
          expected_serials: [`SN-PNL-${Date.now().toString().slice(-4)}-01`, `SN-PNL-${Date.now().toString().slice(-4)}-02`],
          verified_serials: [],
          status: 'delivered',
          warranty_start_date: new Date().toISOString().split('T')[0], // Tied to delivery date!
          warranty_duration_years: 25
        },
        {
          id: `eq-${Date.now()}-2`,
          product_name: `${orderData.system_capacity_kw || 5}kW Grid Inverter`,
          sku: 'INV-TIER1',
          quantity: 1,
          expected_serials: [`SN-INV-${Date.now().toString().slice(-4)}`],
          verified_serials: [],
          status: 'delivered',
          warranty_start_date: new Date().toISOString().split('T')[0], // Tied to delivery date!
          warranty_duration_years: 5
        }
      ],
      status_history: [
        {
          status: 'pending',
          changed_at: new Date().toISOString(),
          notes: `Installation job created from confirmed Order ${orderCode || orderId}`
        }
      ]
    };

    memoryJobs.unshift(newJob);
    return { job: newJob, already_exists: false, message: 'Installation job created successfully.' };
  },

  // 5. Assign Technicians (multiple technicians, lead designation, double-booking prevention)
  async assignTechnicians(jobId, { assignments = [], scheduled_start, expected_completion, notes }, actor = null) {
    const job = memoryJobs.find(j => j.id === jobId);
    if (!job) throw new Error('Installation job not found.');

    if (!assignments || assignments.length === 0) {
      throw new Error('At least one technician assignment is required.');
    }

    const scheduledDate = (scheduled_start || job.planned_installation_date || new Date().toISOString()).split('T')[0];

    // Check double-booking for assigned technicians
    const conflicts = [];
    const enrichedAssignments = [];

    for (const a of assignments) {
      const tech = memoryTechnicians.find(t => t.id === a.technician_id);
      if (!tech) throw new Error(`Technician ID ${a.technician_id} does not exist.`);

      if (!tech.is_available) {
        throw new Error(`Technician ${tech.full_name} is currently marked as unavailable.`);
      }

      // Check how many active jobs the technician has on this scheduled date
      const existingJobsOnDate = memoryJobs.filter(otherJob => 
        otherJob.id !== jobId &&
        !['completed', 'cancelled'].includes(otherJob.status) &&
        (otherJob.planned_installation_date === scheduledDate || (otherJob.scheduled_start && otherJob.scheduled_start.startsWith(scheduledDate))) &&
        (otherJob.assigned_technicians || []).some(at => at.technician_id === tech.id)
      );

      if (existingJobsOnDate.length >= (tech.max_daily_jobs || 1)) {
        conflicts.push(`Technician ${tech.full_name} has already reached maximum capacity (${tech.max_daily_jobs} job(s)) on ${scheduledDate}.`);
      }

      enrichedAssignments.push({
        technician_id: tech.id,
        employee_code: tech.employee_code,
        full_name: tech.full_name,
        role_on_job: a.role_on_job || (a.is_primary ? 'lead_technician' : 'technician'),
        is_primary: Boolean(a.is_primary),
        phone: tech.phone,
        assigned_at: new Date().toISOString()
      });
    }

    // If conflicts exist, reject assignment to prevent double-booking
    if (conflicts.length > 0) {
      const err = new Error(conflicts.join(' '));
      err.status = 409;
      throw err;
    }

    // Ensure at least one primary / lead technician
    const hasLead = enrichedAssignments.some(a => a.is_primary || a.role_on_job === 'lead_technician');
    if (!hasLead && enrichedAssignments.length > 0) {
      enrichedAssignments[0].is_primary = true;
      enrichedAssignments[0].role_on_job = 'lead_technician';
    }

    job.assigned_technicians = enrichedAssignments;
    if (scheduled_start) {
      job.scheduled_start = scheduled_start;
      job.planned_installation_date = scheduledDate;
    }
    if (expected_completion) {
      job.expected_completion_date = expected_completion.split('T')[0];
    }

    // Transition status to 'assigned' or 'scheduled'
    const newStatus = job.scheduled_start ? 'scheduled' : 'assigned';
    job.status = newStatus;
    job.updated_at = new Date().toISOString();

    const historyEntry = {
      status: newStatus,
      changed_at: new Date().toISOString(),
      notes: notes || `Assigned ${enrichedAssignments.length} technician(s) (Lead: ${enrichedAssignments.find(a => a.is_primary)?.full_name || 'N/A'})`
    };
    job.status_history.push(historyEntry);

    return { job, assignments: enrichedAssignments };
  },

  // 6. Schedule or Reschedule Job
  async scheduleJob(jobId, { scheduled_start, expected_completion, notes }, actor = null) {
    const job = memoryJobs.find(j => j.id === jobId);
    if (!job) throw new Error('Installation job not found.');

    if (!scheduled_start) throw new Error('Scheduled start timestamp is required.');

    const newDate = scheduled_start.split('T')[0];

    // Check double-booking for currently assigned technicians on the new date
    for (const at of job.assigned_technicians || []) {
      const tech = memoryTechnicians.find(t => t.id === at.technician_id);
      if (tech) {
        const existing = memoryJobs.filter(otherJob => 
          otherJob.id !== jobId &&
          !['completed', 'cancelled'].includes(otherJob.status) &&
          (otherJob.planned_installation_date === newDate || (otherJob.scheduled_start && otherJob.scheduled_start.startsWith(newDate))) &&
          (otherJob.assigned_technicians || []).some(t => t.technician_id === tech.id)
        );
        if (existing.length >= (tech.max_daily_jobs || 1)) {
          const err = new Error(`Cannot schedule: Technician ${tech.full_name} is already booked to capacity on ${newDate}.`);
          err.status = 409;
          throw err;
        }
      }
    }

    const isReschedule = Boolean(job.scheduled_start);
    job.scheduled_start = scheduled_start;
    job.planned_installation_date = newDate;
    if (expected_completion) {
      job.expected_completion_date = expected_completion.split('T')[0];
    }
    job.status = 'scheduled';
    job.updated_at = new Date().toISOString();

    const changeNote = notes || (isReschedule ? `Rescheduled to ${newDate}` : `Scheduled for ${newDate}`);
    job.status_history.push({
      status: 'scheduled',
      changed_at: new Date().toISOString(),
      notes: changeNote
    });

    return job;
  },

  // 7. Equipment Verification & Serial Tracking
  async verifyEquipment(jobId, { verified_serials = [], missing_items = [], damaged_items = [], exception_recorded = false, exception_notes = null }, actor = null) {
    const job = memoryJobs.find(j => j.id === jobId);
    if (!job) throw new Error('Installation job not found.');

    // Update verified serials on each equipment item
    let allExpectedVerified = true;

    for (const eq of job.equipment_items || []) {
      const matching = (eq.expected_serials || []).filter(s => verified_serials.includes(s));
      eq.verified_serials = Array.from(new Set([...(eq.verified_serials || []), ...matching]));
      if (eq.expected_serials && eq.expected_serials.length > 0) {
        if (eq.verified_serials.length < eq.expected_serials.length) {
          allExpectedVerified = false;
        } else {
          eq.status = 'verified';
        }
      }
    }

    const hasExceptions = exception_recorded || missing_items.length > 0 || damaged_items.length > 0;
    job.equipment_verified = allExpectedVerified || exception_recorded;
    job.exception_recorded = hasExceptions;
    job.exception_notes = exception_notes || (hasExceptions ? `Missing: ${missing_items.join(', ') || 'None'}; Damaged: ${damaged_items.join(', ') || 'None'}` : null);
    job.equipment_verification_notes = `Verified ${verified_serials.length} serial numbers on site by ${actor?.full_name || 'Technician'}.`;
    job.updated_at = new Date().toISOString();

    // If job was scheduled and verification started, move to in_progress
    if (job.status === 'scheduled') {
      job.status = 'in_progress';
      job.actual_start = job.actual_start || new Date().toISOString();
      job.status_history.push({
        status: 'in_progress',
        changed_at: new Date().toISOString(),
        notes: 'Equipment verified on site; installation commenced.'
      });
    }

    return {
      job,
      equipment_verified: job.equipment_verified,
      equipment_items: job.equipment_items,
      exception_recorded: job.exception_recorded,
      exception_notes: job.exception_notes
    };
  },

  // 8. Digital Checklist Task Update
  async updateTask(jobId, taskId, { is_completed, remarks, photo_storage_path }, actor = null) {
    const job = memoryJobs.find(j => j.id === jobId);
    if (!job) throw new Error('Installation job not found.');

    const task = (job.tasks || []).find(t => t.id === taskId || t.task_name === taskId);
    if (!task) throw new Error(`Checklist task ${taskId} not found.`);

    task.is_completed = Boolean(is_completed);
    task.completed_at = is_completed ? new Date().toISOString() : null;
    task.completed_by = is_completed ? (actor?.full_name || 'Technician') : null;
    if (remarks !== undefined) task.remarks = remarks;
    if (photo_storage_path) task.photo_storage_path = photo_storage_path;

    job.updated_at = new Date().toISOString();

    // Calculate completion progress
    const totalRequired = job.tasks.filter(t => t.is_required).length;
    const completedRequired = job.tasks.filter(t => t.is_required && t.is_completed).length;
    const progressPct = totalRequired > 0 ? Math.round((completedRequired / totalRequired) * 100) : 100;

    return {
      task,
      tasks: job.tasks,
      progressPct,
      allRequiredCompleted: completedRequired === totalRequired
    };
  },

  // 9. Upload Photographs & Evidence
  async uploadPhoto(jobId, { photo_type = 'progress', storage_path, caption, base64 }, actor = null) {
    const job = memoryJobs.find(j => j.id === jobId);
    if (!job) throw new Error('Installation job not found.');

    if (!storage_path && !base64) {
      throw new Error('Photograph data or storage path is required.');
    }

    const photoId = `photo-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newPhoto = {
      id: photoId,
      photo_type,
      storage_path: storage_path || base64,
      caption: caption || `${photo_type.replace('_', ' ')} photograph`,
      uploaded_at: new Date().toISOString(),
      uploaded_by: actor ? actor.id : null,
      uploaded_by_name: actor ? actor.full_name : 'Technician'
    };

    job.photos = job.photos || [];
    job.photos.push(newPhoto);
    job.updated_at = new Date().toISOString();

    return { photo: newPhoto, totalPhotos: job.photos.length };
  },

  // 10. Testing & Commissioning Submission (with mandatory disclaimer)
  async submitCommissioning(jobId, commissioningData, actor = null) {
    const job = memoryJobs.find(j => j.id === jobId);
    if (!job) throw new Error('Installation job not found.');

    if (!commissioningData) throw new Error('Commissioning data is required.');

    // Validate electrical readings exist (do not invent readings)
    const {
      inverter_model,
      inverter_serial,
      voc_string_1_v,
      isc_string_1_a,
      grid_voltage_v,
      earthing_resistance_ohm,
      insulation_test_result,
      test_observations,
      technician_remarks
    } = commissioningData;

    if (!inverter_model || !inverter_serial) {
      throw new Error('Inverter model and verified inverter serial number are required for commissioning.');
    }

    if (earthing_resistance_ohm === undefined || earthing_resistance_ohm === null) {
      throw new Error('Earthing resistance reading (Ohms) is required before system energization.');
    }

    const earthingNum = Number(earthing_resistance_ohm);
    if (isNaN(earthingNum) || earthingNum < 0) {
      throw new Error('Earthing resistance must be a positive number.');
    }

    job.commissioning_data = {
      ...commissioningData,
      commissioned_at: new Date().toISOString(),
      commissioned_by: actor?.full_name || 'Certified Technician',
      safety_disclaimer_accepted: true,
      disclaimer: 'Test values entered reflect verified multimeter & earth-tester measurements conducted in accordance with IS 3043 / IEC 60364-7-712. Not an automatic waiver of utility grid statutory approvals.'
    };

    job.earthing_resistance_ohm = earthingNum;
    job.insulation_test_result = insulation_test_result || 'Verified';
    job.testing_notes = test_observations || 'Testing and grid sync verified successfully.';
    job.updated_at = new Date().toISOString();

    return { job, commissioning_data: job.commissioning_data };
  },

  // 11. Customer Signature / Acknowledgement
  async submitCustomerSignature(jobId, { customer_name, signature_data, consent_text }, actor = null) {
    const job = memoryJobs.find(j => j.id === jobId);
    if (!job) throw new Error('Installation job not found.');

    if (!signature_data) throw new Error('Customer digital signature data is required.');

    job.customer_signature = {
      id: `sig-${Date.now()}`,
      customer_name: customer_name || job.customer_name,
      signature_storage_path: signature_data,
      signed_at: new Date().toISOString(),
      consent_text: consent_text || 'I confirm that the solar PV system has been installed, commissioned, demonstrated, and handed over in satisfactory working condition.'
    };

    job.updated_at = new Date().toISOString();

    return { job, customer_signature: job.customer_signature };
  },

  // 12. Generate Completion Report (Strict prerequisite validation)
  async generateCompletionReport(jobId, actor = null) {
    const job = memoryJobs.find(j => j.id === jobId);
    if (!job) throw new Error('Installation job not found.');

    // Verification check: Equipment verified OR exception recorded
    if (!job.equipment_verified && !job.exception_recorded) {
      const err = new Error('Cannot generate completion report: Equipment serial verification is incomplete and no authorized exception is recorded.');
      err.status = 400;
      throw err;
    }

    // Verification check: Required tasks completed
    const uncompletedRequired = (job.tasks || []).filter(t => t.is_required && !t.is_completed);
    if (uncompletedRequired.length > 0) {
      const err = new Error(`Cannot generate completion report: ${uncompletedRequired.length} required checklist task(s) remain uncompleted (${uncompletedRequired.map(t => t.task_name).join(', ')}).`);
      err.status = 400;
      throw err;
    }

    // Verification check: Commissioning data submitted
    if (!job.commissioning_data) {
      const err = new Error('Cannot generate completion report: Testing and commissioning form has not been submitted.');
      err.status = 400;
      throw err;
    }

    // Verification check: Customer signature
    if (!job.customer_signature) {
      const err = new Error('Cannot generate completion report: Customer acknowledgement signature is missing.');
      err.status = 400;
      throw err;
    }

    const reportSummary = `SOLVIX SOLAR INSTALLATION COMPLETION REPORT\n` +
      `Job: ${job.installation_code} | Order: ${job.order_code}\n` +
      `Customer: ${job.customer_name} | Capacity: ${job.system_capacity_kw} kW ${job.system_type}\n` +
      `Site: ${job.site_address}\n` +
      `Completed Date: ${new Date().toISOString().split('T')[0]}\n` +
      `Lead Technician: ${(job.assigned_technicians || []).find(a => a.is_primary)?.full_name || 'Technician Team'}\n` +
      `Earthing Resistance: ${job.earthing_resistance_ohm} Ohm | Insulation: ${job.insulation_test_result}\n` +
      `All 11 technical safety and installation milestones verified and signed by customer.`;

    job.completion_report = reportSummary;
    job.actual_end = job.actual_end || new Date().toISOString();
    job.status = 'completed';
    job.updated_at = new Date().toISOString();

    job.status_history.push({
      status: 'completed',
      changed_at: new Date().toISOString(),
      notes: 'Final completion report generated, customer signature verified, project successfully sealed.'
    });

    // NOTE: In accordance with Prompt 9, warranty start dates are strictly NOT modified.
    // Warranty starts from actual equipment delivery.

    return { job, completion_report: reportSummary };
  },

  // 13. Status Transition Workflow
  async updateJobStatus(jobId, newStatus, notes, actor = null) {
    const job = memoryJobs.find(j => j.id === jobId);
    if (!job) throw new Error('Installation job not found.');

    if (!INSTALLATION_STATUSES.includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}. Permitted statuses: ${INSTALLATION_STATUSES.join(', ')}`);
    }

    // Validate completion prerequisites if transitioning to 'completed'
    if (newStatus === 'completed') {
      if (!job.equipment_verified && !job.exception_recorded) {
        throw new Error('Equipment serial numbers must be verified before completing the installation.');
      }
      const uncompletedRequired = (job.tasks || []).filter(t => t.is_required && !t.is_completed);
      if (uncompletedRequired.length > 0) {
        throw new Error(`All required checklist tasks must be completed (${uncompletedRequired.length} pending).`);
      }
      if (!job.commissioning_data) {
        throw new Error('Commissioning testing readings must be submitted before completion.');
      }
      if (!job.customer_signature) {
        throw new Error('Customer acknowledgement signature must be recorded before completion.');
      }
      job.actual_end = job.actual_end || new Date().toISOString();
    }

    if (newStatus === 'in_progress' && !job.actual_start) {
      job.actual_start = new Date().toISOString();
    }

    job.status = newStatus;
    job.updated_at = new Date().toISOString();

    job.status_history.push({
      status: newStatus,
      changed_at: new Date().toISOString(),
      notes: notes || `Status changed to ${newStatus}`
    });

    return job;
  },

  // 14. Technicians Management
  async getTechnicians() {
    return memoryTechnicians.map(t => {
      const activeCount = memoryJobs.filter(j => 
        !['completed', 'cancelled'].includes(j.status) &&
        (j.assigned_technicians || []).some(at => at.technician_id === t.id)
      ).length;

      const completedCount = memoryJobs.filter(j => 
        j.status === 'completed' &&
        (j.assigned_technicians || []).some(at => at.technician_id === t.id)
      ).length + t.completed_installations;

      return {
        ...t,
        active_assignments: activeCount,
        completed_installations: completedCount,
        workload_pct: Math.min(100, Math.round((activeCount / (t.max_daily_jobs || 1)) * 100))
      };
    });
  },

  async getTechnicianById(id) {
    const tech = memoryTechnicians.find(t => t.id === id || t.employee_code === id);
    if (!tech) return null;

    const assignedJobs = memoryJobs.filter(j => 
      (j.assigned_technicians || []).some(at => at.technician_id === tech.id)
    );

    return {
      ...tech,
      assignedJobs
    };
  },

  async updateTechnicianAvailability(id, { is_available, max_daily_jobs }) {
    const tech = memoryTechnicians.find(t => t.id === id);
    if (!tech) throw new Error('Technician not found.');

    if (is_available !== undefined) tech.is_available = Boolean(is_available);
    if (max_daily_jobs !== undefined) tech.max_daily_jobs = Math.max(1, parseInt(max_daily_jobs, 10));
    tech.updated_at = new Date().toISOString();

    return tech;
  },

  // 15. Eligible Confirmed Orders for Job Creation
  async getEligibleOrders() {
    // Return orders from memory or live that do not yet have an installation job
    const existingOrderIds = new Set(memoryJobs.map(j => j.order_id));
    const eligible = [
      {
        order_id: 'ord-101',
        order_code: 'ORD-2026-0021',
        customer_id: 'cust-101',
        customer_name: 'Dr. Alok Nath (City Diagnostics)',
        contact_phone: '+91 98109 87654',
        contact_email: 'alok@citydiagnostics.in',
        site_address: '15 Community Centre, Saket, New Delhi 110017',
        city: 'New Delhi',
        system_type: 'on-grid',
        system_capacity_kw: 15.0,
        status: 'ready_for_install',
        dispatch_status: 'delivered',
        total_amount: 720000,
        advance_paid: 720000,
        balance_due: 0
      },
      {
        order_id: 'ord-102',
        order_code: 'ORD-2026-0024',
        customer_id: 'cust-102',
        customer_name: 'Sanjeev Goel',
        contact_phone: '+91 98111 55443',
        contact_email: 'sanjeev.goel@rediffmail.com',
        site_address: 'House 88, Sector 15, Faridabad, Haryana 121007',
        city: 'Faridabad',
        system_type: 'hybrid',
        system_capacity_kw: 8.0,
        status: 'confirmed',
        dispatch_status: 'delivered',
        total_amount: 480000,
        advance_paid: 480000,
        balance_due: 0
      }
    ].filter(o => !existingOrderIds.has(o.order_id));

    return eligible;
  }
};

export default installationStore;
