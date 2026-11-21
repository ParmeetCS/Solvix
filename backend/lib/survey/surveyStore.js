// Backend Data Store & Helper for Solvix Site Survey & Solar Feasibility Module
// Provides seamless operation against Supabase database with realistic memory fallback for local dev.

let memorySurveys = [
  {
    id: 's101-0000-0000-0000-000000000001',
    survey_code: 'SRV-2026-1011',
    lead_id: 'l101-0000-0000-0000-000000000001',
    customer_id: 'c101-0000-0000-0000-000000000001',
    customer_name: 'Rajesh Sharma',
    contact_phone: '+91 98112 34567',
    contact_email: 'rajesh.sharma@example.com',
    site_address: 'Plot 42, Pocket B, Greater Kailash I',
    city: 'New Delhi',
    state: 'Delhi',
    pincode: '110048',
    property_type: 'residential',
    electricity_connection_type: 'three_phase',
    monthly_electricity_bill: 14500,
    sanctioned_load_kw: 12.0,
    consumer_number: 'DL-BRPL-883921',
    meter_number: 'MTR-291039',
    roof_type: 'rcc_flat',
    roof_area_sqm: 160.0,
    available_installation_area_sqm: 120.0,
    roof_direction: 'south',
    roof_tilt_degrees: 0.0,
    shading_conditions: 'none',
    roof_condition: 'excellent',
    structural_concerns: 'None observed. Parapet wall height 1.0m, staircase room provides easy access.',
    grid_availability: 'stable',
    existing_meter_info: 'BSES three-phase digital meter. Net-metering compatible with standard bi-directional meter replacement.',
    main_panel_condition: 'good',
    earthing_availability: 'adequate',
    cable_distance_m: 22.0,
    other_technical_observations: 'Terrace is completely unobstructed. Water supply available for module cleaning.',
    estimated_usable_area_sqm: 110.0,
    recommended_capacity_kw: 10.0,
    recommended_system_type: 'on-grid',
    potential_constraints: 'Cable route requires conduit through building riser shaft.',
    additional_requirements: 'Elevated HDGI structure (1.5m clearance) requested by customer to retain roof utility.',
    feasibility_status: 'pending',
    status: 'pending',
    priority: 'high',
    survey_date: null,
    scheduled_date: null,
    scheduled_time: null,
    assigned_to: null,
    assigned_to_name: null,
    is_draft: false,
    draft_data: null,
    created_at: '2026-11-18T10:30:00Z',
    updated_at: '2026-11-18T10:30:00Z',
    site_observations: 'Qualified high-value residential lead. Bill verified.',
    created_by: '00000000-0000-0000-0000-000000000001'
  },
  {
    id: 's102-0000-0000-0000-000000000002',
    survey_code: 'SRV-2026-1024',
    lead_id: 'l102-0000-0000-0000-000000000002',
    customer_id: 'c102-0000-0000-0000-000000000002',
    customer_name: 'Sharma Textiles Ltd (Anil Sharma)',
    contact_phone: '+91 98223 45678',
    contact_email: 'anil@sharmatextiles.in',
    site_address: 'Industrial Shed 14, Sector 37, Pace City II',
    city: 'Gurugram',
    state: 'Haryana',
    pincode: '122001',
    property_type: 'industrial',
    electricity_connection_type: 'ht',
    monthly_electricity_bill: 95000,
    sanctioned_load_kw: 65.0,
    consumer_number: 'DHBVN-HT-99214',
    meter_number: 'HTM-55281',
    roof_type: 'metal_sheet',
    roof_area_sqm: 650.0,
    available_installation_area_sqm: 520.0,
    roof_direction: 'south',
    roof_tilt_degrees: 8.0,
    shading_conditions: 'none',
    roof_condition: 'good',
    structural_concerns: 'Trapezoidal metal sheet with sturdy purlins spaced at 1.4m. Roof purlins can support aluminum clamps directly.',
    grid_availability: 'stable',
    existing_meter_info: 'Dedicated HT transformer 100 kVA inside premises. Main switchgear has spare 100A feeder breaker.',
    main_panel_condition: 'good',
    earthing_availability: 'adequate',
    cable_distance_m: 45.0,
    other_technical_observations: 'Direct exterior cable tray path exists from rooftop to the LT distribution room.',
    estimated_usable_area_sqm: 480.0,
    recommended_capacity_kw: 50.0,
    recommended_system_type: 'on-grid',
    potential_constraints: 'Roof safety harness line required during installation work.',
    additional_requirements: 'Non-penetrating standing seam or purlin-anchored riveted brackets with EPDM water-tight gaskets.',
    feasibility_status: 'feasible',
    status: 'assigned',
    priority: 'urgent',
    survey_date: '2026-11-22',
    scheduled_date: '2026-11-22',
    scheduled_time: '11:00 AM - 01:00 PM',
    assigned_to: 'eng1-0000-0000-0000-000000000001',
    assigned_to_name: 'Vikram Singh (Survey Engineer)',
    is_draft: false,
    draft_data: null,
    created_at: '2026-11-19T09:15:00Z',
    updated_at: '2026-11-20T14:30:00Z',
    site_observations: 'Assigned to Senior Surveyor Vikram Singh. Visit scheduled for Nov 22.',
    created_by: '00000000-0000-0000-0000-000000000001'
  },
  {
    id: 's103-0000-0000-0000-000000000003',
    survey_code: 'SRV-2026-1035',
    lead_id: 'l103-0000-0000-0000-000000000003',
    customer_id: 'c103-0000-0000-0000-000000000003',
    customer_name: 'Green Valley School (Principal Verma)',
    contact_phone: '+91 98334 56789',
    contact_email: 'admin@greenvalleyschool.edu',
    site_address: 'Institutional Block C, Sector 62',
    city: 'Noida',
    state: 'Uttar Pradesh',
    pincode: '201309',
    property_type: 'institutional',
    electricity_connection_type: 'three_phase',
    monthly_electricity_bill: 42000,
    sanctioned_load_kw: 30.0,
    consumer_number: 'PVVNL-COMM-3321',
    meter_number: 'NTR-90812',
    roof_type: 'rcc_flat',
    roof_area_sqm: 350.0,
    available_installation_area_sqm: 260.0,
    roof_direction: 'south',
    roof_tilt_degrees: 0.0,
    shading_conditions: 'partial_morning',
    roof_condition: 'good',
    structural_concerns: 'Water tank tower on North-West corner creates negligible shading.',
    grid_availability: 'stable',
    existing_meter_info: 'Three-phase commercial electronic meter with standard MCB breaker panel.',
    main_panel_condition: 'good',
    earthing_availability: 'inadequate',
    cable_distance_m: 35.0,
    other_technical_observations: 'Dedicated chemical earthing pits (2 nos: 1 for inverter AC/DC & 1 for Lightning Arrester) will be required.',
    estimated_usable_area_sqm: 240.0,
    recommended_capacity_kw: 25.0,
    recommended_system_type: 'on-grid',
    potential_constraints: 'Installation work must be conducted on weekends or after school hours.',
    additional_requirements: 'Standard ballasted or anchor-bolted HDGI structure at 28-degree tilt facing true south.',
    feasibility_status: 'feasible',
    status: 'scheduled',
    priority: 'medium',
    survey_date: '2026-11-21', // today
    scheduled_date: '2026-11-21',
    scheduled_time: '02:00 PM - 04:00 PM',
    assigned_to: 'eng2-0000-0000-0000-000000000002',
    assigned_to_name: 'Pooja Kulkarni (Field Surveyor)',
    is_draft: false,
    draft_data: null,
    created_at: '2026-11-19T11:00:00Z',
    updated_at: '2026-11-21T08:30:00Z',
    site_observations: 'Visit confirmed for today at 2 PM with school estate manager.',
    created_by: '00000000-0000-0000-0000-000000000001'
  },
  {
    id: 's104-0000-0000-0000-000000000004',
    survey_code: 'SRV-2026-1048',
    lead_id: 'l104-0000-0000-0000-000000000004',
    customer_id: 'c104-0000-0000-0000-000000000004',
    customer_name: 'Oberoi Heights RWA (Secretary Goel)',
    contact_phone: '+91 98445 67890',
    contact_email: 'rwa@oberoiheights.org',
    site_address: 'Tower A & B Terrace, Sector 21C',
    city: 'Faridabad',
    state: 'Haryana',
    pincode: '121001',
    property_type: 'residential',
    electricity_connection_type: 'three_phase',
    monthly_electricity_bill: 68000,
    sanctioned_load_kw: 50.0,
    consumer_number: 'DHBVN-RWA-1029',
    meter_number: 'DH-399120',
    roof_type: 'rcc_flat',
    roof_area_sqm: 480.0,
    available_installation_area_sqm: 380.0,
    roof_direction: 'south',
    roof_tilt_degrees: 0.0,
    shading_conditions: 'none',
    roof_condition: 'excellent',
    structural_concerns: 'Lift machine room on North side. No shadow impact on southern terrace area.',
    grid_availability: 'stable',
    existing_meter_info: 'Common area services meter installed in basement electrical panel room.',
    main_panel_condition: 'good',
    earthing_availability: 'adequate',
    cable_distance_m: 60.0,
    other_technical_observations: 'Requires AC cable run from 12th floor terrace down electrical shaft to basement LT panel.',
    estimated_usable_area_sqm: 360.0,
    recommended_capacity_kw: 40.0,
    recommended_system_type: 'on-grid',
    potential_constraints: 'Long AC cable run (~60m); 4-core 50 sq mm armored aluminum cable recommended to keep voltage drop < 1.5%.',
    additional_requirements: 'Lightning protection system with early streamer emission (ESE) mast on lift room.',
    feasibility_status: 'requires_review',
    status: 'in_progress',
    priority: 'high',
    survey_date: '2026-11-20',
    scheduled_date: '2026-11-20',
    scheduled_time: '10:00 AM - 01:00 PM',
    assigned_to: 'eng1-0000-0000-0000-000000000001',
    assigned_to_name: 'Vikram Singh (Survey Engineer)',
    is_draft: true,
    draft_data: {
      step: 3,
      measurements: {
        tower_a_sqm: 200,
        tower_b_sqm: 180,
        parapet_height_m: 1.2
      }
    },
    created_at: '2026-11-17T14:20:00Z',
    updated_at: '2026-11-20T17:45:00Z',
    site_observations: 'Surveyor on site, measurements captured, draft saved. Finalizing electrical conduit route.',
    created_by: '00000000-0000-0000-0000-000000000001'
  },
  {
    id: 's105-0000-0000-0000-000000000005',
    survey_code: 'SRV-2026-1052',
    lead_id: 'l105-0000-0000-0000-000000000005',
    customer_id: 'c105-0000-0000-0000-000000000005',
    customer_name: 'Agarwal Cold Storage (Manish Agarwal)',
    contact_phone: '+91 98556 78901',
    contact_email: 'manish@agarwalcold.com',
    site_address: 'GT Karnal Road, Rai Industrial Area',
    city: 'Sonipat',
    state: 'Haryana',
    pincode: '131029',
    property_type: 'commercial',
    electricity_connection_type: 'ht',
    monthly_electricity_bill: 175000,
    sanctioned_load_kw: 120.0,
    consumer_number: 'UHBVN-HT-55410',
    meter_number: 'HT-99412',
    roof_type: 'metal_sheet',
    roof_area_sqm: 1200.0,
    available_installation_area_sqm: 1050.0,
    roof_direction: 'south',
    roof_tilt_degrees: 10.0,
    shading_conditions: 'none',
    roof_condition: 'excellent',
    structural_concerns: 'Heavy-gauge steel truss structure verified with structural engineer certificate. No defects.',
    grid_availability: 'stable',
    existing_meter_info: '200 kVA dedicated distribution transformer with automated HT vacuum circuit breaker (VCB).',
    main_panel_condition: 'good',
    earthing_availability: 'adequate',
    cable_distance_m: 40.0,
    other_technical_observations: 'Substantial day-time refrigeration load matches solar peak generation curve exceptionally well.',
    estimated_usable_area_sqm: 950.0,
    recommended_capacity_kw: 100.0,
    recommended_system_type: 'on-grid',
    potential_constraints: 'Periodic dust accumulation from highway; automated sprinkler cleaning system recommended.',
    additional_requirements: 'Solar-DG synchronization controller required due to 125 kVA backup diesel generator on site.',
    feasibility_status: 'requires_review',
    status: 'submitted',
    priority: 'urgent',
    survey_date: '2026-11-19',
    scheduled_date: '2026-11-19',
    scheduled_time: '10:00 AM - 02:00 PM',
    assigned_to: 'eng2-0000-0000-0000-000000000002',
    assigned_to_name: 'Pooja Kulkarni (Field Surveyor)',
    is_draft: false,
    draft_data: null,
    completed_at: '2026-11-20T16:00:00Z',
    created_at: '2026-11-16T12:00:00Z',
    updated_at: '2026-11-20T16:00:00Z',
    site_observations: 'Full inspection completed. Feasibility report generated. Awaiting Survey Manager approval.',
    created_by: '00000000-0000-0000-0000-000000000001'
  },
  {
    id: 's106-0000-0000-0000-000000000006',
    survey_code: 'SRV-2026-1060',
    lead_id: 'l106-0000-0000-0000-000000000006',
    customer_id: 'c106-0000-0000-0000-000000000006',
    customer_name: 'Sunrise Polymers (Kavita Jain)',
    contact_phone: '+91 98667 89012',
    contact_email: 'kavita@sunrisepolymers.com',
    site_address: 'Plot 78, Phase IV, Udyog Vihar',
    city: 'Gurugram',
    state: 'Haryana',
    pincode: '122015',
    property_type: 'industrial',
    electricity_connection_type: 'three_phase',
    monthly_electricity_bill: 120000,
    sanctioned_load_kw: 85.0,
    consumer_number: 'DH-COMM-88129',
    meter_number: 'DH-77123',
    roof_type: 'metal_sheet',
    roof_area_sqm: 850.0,
    available_installation_area_sqm: 750.0,
    roof_direction: 'south',
    roof_tilt_degrees: 6.0,
    shading_conditions: 'none',
    roof_condition: 'excellent',
    structural_concerns: 'Industrial PEB building built in 2023. Structural safety verified.',
    grid_availability: 'stable',
    existing_meter_info: 'Three-phase TOD meter installed.',
    main_panel_condition: 'good',
    earthing_availability: 'adequate',
    cable_distance_m: 28.0,
    other_technical_observations: 'Site is completely ideal for 75 kW solar installation. Excellent solar irradiation.',
    estimated_usable_area_sqm: 700.0,
    recommended_capacity_kw: 75.0,
    recommended_system_type: 'on-grid',
    potential_constraints: 'None.',
    additional_requirements: 'Walkway along ridge and lifelines for OSHA maintenance compliance.',
    feasibility_status: 'approved',
    status: 'approved',
    priority: 'high',
    survey_date: '2026-11-18',
    scheduled_date: '2026-11-18',
    scheduled_time: '11:00 AM - 01:00 PM',
    assigned_to: 'eng1-0000-0000-0000-000000000001',
    assigned_to_name: 'Vikram Singh (Survey Engineer)',
    is_draft: false,
    draft_data: null,
    completed_at: '2026-11-18T16:30:00Z',
    created_at: '2026-11-15T09:00:00Z',
    updated_at: '2026-11-19T11:00:00Z',
    site_observations: 'Survey approved by Technical Lead. Ready for Sales Quotation workflow.',
    created_by: '00000000-0000-0000-0000-000000000001'
  },
  {
    id: 's107-0000-0000-0000-000000000007',
    survey_code: 'SRV-2026-1073',
    lead_id: 'l107-0000-0000-0000-000000000007',
    customer_id: 'c107-0000-0000-0000-000000000007',
    customer_name: 'Mehta Farmhouse (Sanjeev Mehta)',
    contact_phone: '+91 98778 90123',
    contact_email: 'sanjeev@mehtagroup.org',
    site_address: 'Farmhouse 12, Radhey Mohan Drive, Chattarpur',
    city: 'New Delhi',
    state: 'Delhi',
    pincode: '110074',
    property_type: 'residential',
    electricity_connection_type: 'single_phase',
    monthly_electricity_bill: 8000,
    sanctioned_load_kw: 5.0,
    consumer_number: 'DL-BRPL-10029',
    meter_number: 'BR-88219',
    roof_type: 'tiled',
    roof_area_sqm: 110.0,
    available_installation_area_sqm: 35.0,
    roof_direction: 'north',
    roof_tilt_degrees: 22.0,
    shading_conditions: 'heavy',
    roof_condition: 'needs_repair',
    structural_concerns: 'Clay Mangalore tiles over aging wooden rafters. Cannot bear solar dead weight and wind uplift.',
    grid_availability: 'frequent_outages',
    existing_meter_info: 'Single phase analog meter with loose connections.',
    main_panel_condition: 'aged_needs_upgrade',
    earthing_availability: 'not_available',
    cable_distance_m: 55.0,
    other_technical_observations: 'Mature eucalyptus and neem trees cast dense shadow over 75% of the roof throughout daylight hours.',
    estimated_usable_area_sqm: 25.0,
    recommended_capacity_kw: 3.0,
    recommended_system_type: 'off-grid',
    potential_constraints: 'Roof orientation is predominantly North-East with heavy shading and brittle clay tiles.',
    additional_requirements: 'Complete structural timber replacement or ground mount required if customer insists.',
    feasibility_status: 'rejected',
    status: 'rejected',
    priority: 'low',
    survey_date: '2026-11-17',
    scheduled_date: '2026-11-17',
    scheduled_time: '03:00 PM - 05:00 PM',
    assigned_to: 'eng2-0000-0000-0000-000000000002',
    assigned_to_name: 'Pooja Kulkarni (Field Surveyor)',
    is_draft: false,
    draft_data: null,
    completed_at: '2026-11-17T17:30:00Z',
    rejection_reason: 'Rooftop structurally unsafe with brittle clay tiles. Heavy perennial tree shade reduces yield below 40% feasibility threshold.',
    created_at: '2026-11-14T10:00:00Z',
    updated_at: '2026-11-18T10:00:00Z',
    site_observations: 'Survey rejected due to severe structural hazard and shadow hindrance.',
    created_by: '00000000-0000-0000-0000-000000000001'
  },
  {
    id: 's108-0000-0000-0000-000000000008',
    survey_code: 'SRV-2026-1081',
    lead_id: 'l108-0000-0000-0000-000000000008',
    customer_id: 'c108-0000-0000-0000-000000000008',
    customer_name: 'Gupta Supermarket (Alok Gupta)',
    contact_phone: '+91 98889 01234',
    contact_email: 'alok@guptamart.com',
    site_address: 'Shop 1-4, Central Market, Punjabi Bagh',
    city: 'New Delhi',
    state: 'Delhi',
    pincode: '110026',
    property_type: 'commercial',
    electricity_connection_type: 'three_phase',
    monthly_electricity_bill: 38000,
    sanctioned_load_kw: 20.0,
    consumer_number: 'TPDDL-COM-4432',
    meter_number: 'TP-11209',
    roof_type: 'rcc_flat',
    roof_area_sqm: 180.0,
    available_installation_area_sqm: 140.0,
    roof_direction: 'south',
    roof_tilt_degrees: 0.0,
    shading_conditions: 'partial_evening',
    roof_condition: 'fair',
    structural_concerns: 'Temporary hoarding iron frame installed on parapet that needs removal prior to solar mounting.',
    grid_availability: 'stable',
    existing_meter_info: 'Existing commercial meter located in basement with obstructed wiring.',
    main_panel_condition: 'acceptable',
    earthing_availability: 'adequate',
    cable_distance_m: 35.0,
    other_technical_observations: 'Rooftop access door was locked during initial inspection; building association key was not available.',
    estimated_usable_area_sqm: 130.0,
    recommended_capacity_kw: 15.0,
    recommended_system_type: 'on-grid',
    potential_constraints: 'Rooftop access requires prior coordination with building president.',
    additional_requirements: 'Revisit needed with building maintenance keys to verify water tank height and cable riser.',
    feasibility_status: 'requires_review',
    status: 'revisit_required',
    priority: 'medium',
    survey_date: '2026-11-19',
    scheduled_date: '2026-11-23',
    scheduled_time: '11:00 AM - 01:00 PM',
    assigned_to: 'eng1-0000-0000-0000-000000000001',
    assigned_to_name: 'Vikram Singh (Survey Engineer)',
    is_draft: false,
    draft_data: null,
    revisit_notes: 'Terrace key was not available. Customer has arranged key for Nov 23 morning visit.',
    created_at: '2026-11-16T15:00:00Z',
    updated_at: '2026-11-20T11:00:00Z',
    site_observations: 'Revisit scheduled for Nov 23.',
    created_by: '00000000-0000-0000-0000-000000000001'
  }
];

let memoryAssignments = [
  {
    id: 'asg-1',
    survey_id: 's102-0000-0000-0000-000000000002',
    assigned_to: 'eng1-0000-0000-0000-000000000001',
    assigned_to_name: 'Vikram Singh',
    assigned_by: '00000000-0000-0000-0000-000000000001',
    assigned_by_name: 'Admin / Survey Manager',
    assigned_at: '2026-11-20T14:30:00Z',
    scheduled_at: '2026-11-22T11:00:00Z',
    status: 'assigned',
    is_active: true,
    notes: 'Please inspect the 650 sqm metal roof purlins and take clamp dimensions.'
  },
  {
    id: 'asg-2',
    survey_id: 's103-0000-0000-0000-000000000003',
    assigned_to: 'eng2-0000-0000-0000-000000000002',
    assigned_to_name: 'Pooja Kulkarni',
    assigned_by: '00000000-0000-0000-0000-000000000001',
    assigned_by_name: 'Admin / Survey Manager',
    assigned_at: '2026-11-20T16:00:00Z',
    scheduled_at: '2026-11-21T14:00:00Z',
    status: 'assigned',
    is_active: true,
    notes: 'Meet Estate Manager Mr. Verma at the main gate.'
  },
  {
    id: 'asg-3',
    survey_id: 's104-0000-0000-0000-000000000004',
    assigned_to: 'eng1-0000-0000-0000-000000000001',
    assigned_to_name: 'Vikram Singh',
    assigned_by: '00000000-0000-0000-0000-000000000001',
    assigned_by_name: 'Admin / Survey Manager',
    assigned_at: '2026-11-19T10:00:00Z',
    scheduled_at: '2026-11-20T10:00:00Z',
    status: 'assigned',
    is_active: true,
    notes: 'Tower A and Tower B dual-terrace inspection.'
  },
  {
    id: 'asg-4',
    survey_id: 's105-0000-0000-0000-000000000005',
    assigned_to: 'eng2-0000-0000-0000-000000000002',
    assigned_to_name: 'Pooja Kulkarni',
    assigned_by: '00000000-0000-0000-0000-000000000001',
    assigned_by_name: 'Admin / Survey Manager',
    assigned_at: '2026-11-18T10:00:00Z',
    scheduled_at: '2026-11-19T10:00:00Z',
    status: 'completed',
    is_active: true,
    notes: 'Completed. Feasibility report submitted for review.'
  },
  {
    id: 'asg-5',
    survey_id: 's106-0000-0000-0000-000000000006',
    assigned_to: 'eng1-0000-0000-0000-000000000001',
    assigned_to_name: 'Vikram Singh',
    assigned_by: '00000000-0000-0000-0000-000000000001',
    assigned_by_name: 'Admin / Survey Manager',
    assigned_at: '2026-11-17T11:00:00Z',
    scheduled_at: '2026-11-18T11:00:00Z',
    status: 'completed',
    is_active: true,
    notes: 'Completed and approved.'
  }
];

let memoryPhotos = [
  {
    id: 'p1',
    survey_id: 's105-0000-0000-0000-000000000005',
    storage_path: 'surveys/s105/roof_view_south.jpg',
    photo_type: 'roof',
    caption: 'Southern exposure metal sheet roof — clear horizon',
    description: 'Purlin spacing 1.4m, non-corroded trapezoidal profile.',
    file_name: 'roof_view_south.jpg',
    file_size_bytes: 2840500,
    file_type: 'image/jpeg',
    uploaded_at: '2026-11-19T11:30:00Z',
    signed_url: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 'p2',
    survey_id: 's105-0000-0000-0000-000000000005',
    storage_path: 'surveys/s105/main_electrical_panel.jpg',
    photo_type: 'electrical',
    caption: 'Main LT distribution panel & 120kW meter setup',
    description: 'Shows spare breaker space for solar inverter AC distribution box.',
    file_name: 'main_electrical_panel.jpg',
    file_size_bytes: 1950200,
    file_type: 'image/jpeg',
    uploaded_at: '2026-11-19T12:05:00Z',
    signed_url: 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 'p3',
    survey_id: 's105-0000-0000-0000-000000000005',
    storage_path: 'surveys/s105/site_aerial_elevation.jpg',
    photo_type: 'site',
    caption: 'Complete building exterior showing unobstructed cable drop route',
    description: 'External wall accommodates standard galvanized perforated cable tray.',
    file_name: 'site_aerial_elevation.jpg',
    file_size_bytes: 3105400,
    file_type: 'image/jpeg',
    uploaded_at: '2026-11-19T12:45:00Z',
    signed_url: 'https://images.unsplash.com/photo-1508873696983-2df5293cb32b?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 'p4',
    survey_id: 's106-0000-0000-0000-000000000006',
    storage_path: 'surveys/s106/approved_industrial_roof.jpg',
    photo_type: 'roof',
    caption: 'Industrial shed 75 kW solar layout area',
    description: 'Direct southern tilt with zero obstructions.',
    file_name: 'approved_industrial_roof.jpg',
    file_size_bytes: 2450100,
    file_type: 'image/jpeg',
    uploaded_at: '2026-11-18T13:00:00Z',
    signed_url: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80'
  }
];

let memoryReports = [
  {
    id: 'rep-1',
    survey_id: 's105-0000-0000-0000-000000000005',
    survey_code: 'SRV-2026-1052',
    report_title: 'Detailed Solar Feasibility Assessment — Agarwal Cold Storage',
    feasibility_rating: 'feasible',
    recommended_capacity_kw: 100.0,
    recommended_system_type: 'on-grid',
    estimated_cost: 4200000,
    estimated_usable_area_sqm: 950.0,
    measured_roof_area_sqm: 1200.0,
    executive_summary: 'The site presents an exceptional opportunity for a 100 kWp rooftop solar PV installation. The industrial PEB metal roof features direct southern orientation at an 8-10 degree slope with zero shading obstructions throughout the year. The heavy day-time refrigeration load perfectly aligns with solar generation curves, offering up to 68% offset on grid electricity tariffs.',
    shading_assessment: 'Measured horizon shade: 0% between 08:30 AM and 05:00 PM. Nearest trees are over 35 meters away on the northern side. No shading concerns.',
    electrical_assessment: 'Existing 200 kVA dedicated distribution transformer in healthy operating condition. HT connection (11 kV stepdown). Three-phase LT switchboard has an unutilized 160A MCCB compartment that can accept solar inverter AC feed directly. Dedicated earthing required.',
    installation_constraints: 'Roof safety harness lines and walkway installation recommended for maintenance access. Dust accumulation from neighboring GT road requires quarterly pressurized water wash.',
    calculation_assumptions: 'Assumptions: 1 kWp crystalline silicon module requires approx 9.5 to 10 sqm shadow-free area. Specific generation calculated at 1,480 kWh/kWp/year based on local solar insolation (5.1 kWh/m2/day). System performance ratio assumed at 78%. Estimated annual generation: ~148,000 kWh.',
    submitted_at: '2026-11-20T16:00:00Z',
    submitted_by: 'eng2-0000-0000-0000-000000000002',
    submitted_by_name: 'Pooja Kulkarni'
  },
  {
    id: 'rep-2',
    survey_id: 's106-0000-0000-0000-000000000006',
    survey_code: 'SRV-2026-1060',
    report_title: 'Solar Feasibility & Engineering Report — Sunrise Polymers',
    feasibility_rating: 'feasible',
    recommended_capacity_kw: 75.0,
    recommended_system_type: 'on-grid',
    estimated_cost: 3250000,
    estimated_usable_area_sqm: 700.0,
    measured_roof_area_sqm: 850.0,
    executive_summary: 'Site cleared with 100% feasibility rating. Structurally sound PEB industrial roof with pristine condition. Recommended for high-yield 75 kWp On-Grid solar plant with rapid payback estimated under 3.4 years.',
    shading_assessment: 'No shading elements. Clear 360-degree solar access.',
    electrical_assessment: 'LT three-phase connection with 85 kW sanctioned load. Power factor compensation panel already active on site.',
    installation_constraints: 'Zero structural issues. Standard non-penetrating clamps approved.',
    calculation_assumptions: 'Calculations based on 545 Wp Tier-1 Mono PERC modules (138 modules total) occupying ~690 sqm. Annual estimated generation: 112,500 kWh. PR: 79%.',
    submitted_at: '2026-11-18T16:30:00Z',
    submitted_by: 'eng1-0000-0000-0000-000000000001',
    submitted_by_name: 'Vikram Singh'
  }
];

let memoryApprovals = [
  {
    id: 'app-1',
    survey_id: 's106-0000-0000-0000-000000000006',
    status: 'approved',
    reviewed_by: '00000000-0000-0000-0000-000000000001',
    reviewer_name: 'Lead Survey Engineer / Admin',
    reviewed_at: '2026-11-19T11:00:00Z',
    comments: 'Survey assessment and structural calculations verified. Approved for 75 kW On-Grid proposal in Sales Quotation system.'
  },
  {
    id: 'app-2',
    survey_id: 's107-0000-0000-0000-000000000007',
    status: 'rejected',
    reviewed_by: '00000000-0000-0000-0000-000000000001',
    reviewer_name: 'Lead Survey Engineer / Admin',
    reviewed_at: '2026-11-18T10:00:00Z',
    comments: 'Rejected due to severe structural safety issues with brittle clay tiles and perennial heavy shade. Advised customer regarding ground mount alternatives.'
  }
];

let memorySurveyors = [
  {
    id: 'eng1-0000-0000-0000-000000000001',
    full_name: 'Vikram Singh',
    email: 'vikram.singh@solvix.energy',
    phone: '+91 98101 23456',
    role: 'Senior Survey Engineer',
    department: 'Site Survey & Engineering',
    active_surveys: 3,
    completed_surveys: 18,
    rating: 4.9,
    status: 'active'
  },
  {
    id: 'eng2-0000-0000-0000-000000000002',
    full_name: 'Pooja Kulkarni',
    email: 'pooja.kulkarni@solvix.energy',
    phone: '+91 98202 34567',
    role: 'Field Survey Specialist',
    department: 'Site Survey & Engineering',
    active_surveys: 2,
    completed_surveys: 14,
    rating: 4.85,
    status: 'active'
  },
  {
    id: 'eng3-0000-0000-0000-000000000003',
    full_name: 'Arunav Sengupta',
    email: 'arunav.sengupta@solvix.energy',
    phone: '+91 98303 45678',
    role: 'Solar Electrical Engineer',
    department: 'Site Survey & Engineering',
    active_surveys: 1,
    completed_surveys: 11,
    rating: 4.75,
    status: 'active'
  }
];

export const surveyStore = {
  getSurveys: async ({ search = '', status = '', priority = '', assigned_to = '', date = '' } = {}) => {
    let list = [...memorySurveys];

    if (status && status !== 'all') {
      list = list.filter(s => s.status === status);
    }
    if (priority && priority !== 'all') {
      list = list.filter(s => s.priority === priority);
    }
    if (assigned_to && assigned_to !== 'all') {
      list = list.filter(s => s.assigned_to === assigned_to);
    }
    if (date) {
      list = list.filter(s => s.scheduled_date === date || s.survey_date === date);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.survey_code?.toLowerCase().includes(q) ||
        s.customer_name?.toLowerCase().includes(q) ||
        s.site_address?.toLowerCase().includes(q) ||
        s.city?.toLowerCase().includes(q) ||
        s.contact_phone?.toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  getSurveyById: async (id) => {
    const survey = memorySurveys.find(s => s.id === id || s.survey_code === id);
    if (!survey) return null;

    const assignments = memoryAssignments.filter(a => a.survey_id === survey.id);
    const photos = memoryPhotos.filter(p => p.survey_id === survey.id);
    const report = memoryReports.find(r => r.survey_id === survey.id) || null;
    const approvals = memoryApprovals.filter(ap => ap.survey_id === survey.id);

    return {
      survey,
      assignments,
      photos,
      report,
      approvals
    };
  },

  createSurvey: async (data, userProfile) => {
    const yr = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    const code = `SRV-${yr}-${rand}`;

    const newSurvey = {
      id: `s-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      survey_code: code,
      lead_id: data.lead_id || null,
      customer_id: data.customer_id || null,
      customer_name: data.customer_name || 'Valued Customer',
      contact_phone: data.contact_phone || '',
      contact_email: data.contact_email || '',
      site_address: data.site_address || '',
      city: data.city || 'Delhi NCR',
      state: data.state || 'Delhi',
      pincode: data.pincode || '',
      property_type: data.property_type || 'residential',
      electricity_connection_type: data.electricity_connection_type || 'three_phase',
      monthly_electricity_bill: data.monthly_electricity_bill ? Number(data.monthly_electricity_bill) : 0,
      sanctioned_load_kw: data.sanctioned_load_kw ? Number(data.sanctioned_load_kw) : 0,
      consumer_number: data.consumer_number || '',
      meter_number: data.meter_number || '',
      roof_type: data.roof_type || 'rcc_flat',
      roof_area_sqm: data.roof_area_sqm ? Number(data.roof_area_sqm) : 0,
      available_installation_area_sqm: data.available_installation_area_sqm ? Number(data.available_installation_area_sqm) : 0,
      roof_direction: data.roof_direction || 'south',
      roof_tilt_degrees: data.roof_tilt_degrees ? Number(data.roof_tilt_degrees) : 0,
      shading_conditions: data.shading_conditions || 'none',
      roof_condition: data.roof_condition || 'good',
      structural_concerns: data.structural_concerns || '',
      grid_availability: data.grid_availability || 'stable',
      existing_meter_info: data.existing_meter_info || '',
      main_panel_condition: data.main_panel_condition || 'good',
      earthing_availability: data.earthing_availability || 'adequate',
      cable_distance_m: data.cable_distance_m ? Number(data.cable_distance_m) : 20,
      other_technical_observations: data.other_technical_observations || '',
      estimated_usable_area_sqm: data.estimated_usable_area_sqm ? Number(data.estimated_usable_area_sqm) : 0,
      recommended_capacity_kw: data.recommended_capacity_kw ? Number(data.recommended_capacity_kw) : 0,
      recommended_system_type: data.recommended_system_type || 'on-grid',
      potential_constraints: data.potential_constraints || '',
      additional_requirements: data.additional_requirements || '',
      feasibility_status: 'pending',
      status: 'pending',
      priority: data.priority || 'medium',
      survey_date: data.survey_date || null,
      scheduled_date: data.scheduled_date || data.survey_date || null,
      scheduled_time: data.scheduled_time || null,
      assigned_to: data.assigned_to || null,
      assigned_to_name: data.assigned_to_name || null,
      is_draft: false,
      draft_data: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      site_observations: data.site_observations || 'Survey initiated by Sales team.',
      created_by: userProfile?.id || null
    };

    memorySurveys.unshift(newSurvey);
    return newSurvey;
  },

  updateSurvey: async (id, updates, userProfile) => {
    const idx = memorySurveys.findIndex(s => s.id === id);
    if (idx === -1) return null;

    memorySurveys[idx] = {
      ...memorySurveys[idx],
      ...updates,
      updated_at: new Date().toISOString(),
      updated_by: userProfile?.id || memorySurveys[idx].updated_by
    };

    return memorySurveys[idx];
  },

  assignSurvey: async (id, { assigned_to, scheduled_date, scheduled_time, notes }, userProfile) => {
    const survey = memorySurveys.find(s => s.id === id);
    if (!survey) return null;

    const surveyor = memorySurveyors.find(sr => sr.id === assigned_to);
    const surveyorName = surveyor ? surveyor.full_name : 'Assigned Engineer';

    survey.assigned_to = assigned_to;
    survey.assigned_to_name = surveyorName;
    if (scheduled_date) {
      survey.scheduled_date = scheduled_date;
      survey.survey_date = scheduled_date;
    }
    if (scheduled_time) {
      survey.scheduled_time = scheduled_time;
    }
    survey.status = scheduled_date ? 'scheduled' : 'assigned';
    survey.updated_at = new Date().toISOString();

    const assignmentRecord = {
      id: `asg-${Date.now()}`,
      survey_id: id,
      assigned_to,
      assigned_to_name: surveyorName,
      assigned_by: userProfile?.id || null,
      assigned_by_name: userProfile?.full_name || 'Survey Manager',
      assigned_at: new Date().toISOString(),
      scheduled_at: scheduled_date ? `${scheduled_date}T${scheduled_time ? scheduled_time.split(' ')[0] : '10:00'}:00Z` : null,
      status: 'assigned',
      is_active: true,
      notes: notes || 'Site survey assigned.'
    };

    memoryAssignments.unshift(assignmentRecord);
    return { survey, assignment: assignmentRecord };
  },

  scheduleSurvey: async (id, { scheduled_date, scheduled_time, site_address }, userProfile) => {
    const survey = memorySurveys.find(s => s.id === id);
    if (!survey) return null;

    survey.scheduled_date = scheduled_date;
    survey.survey_date = scheduled_date;
    if (scheduled_time) survey.scheduled_time = scheduled_time;
    if (site_address) survey.site_address = site_address;
    survey.status = 'scheduled';
    survey.updated_at = new Date().toISOString();

    return survey;
  },

  saveDraft: async (id, formData, userProfile) => {
    const survey = memorySurveys.find(s => s.id === id);
    if (!survey) return null;

    survey.draft_data = formData;
    survey.is_draft = true;
    survey.status = 'in_progress';
    survey.updated_at = new Date().toISOString();

    // Also update core fields if present in formData
    Object.keys(formData).forEach(key => {
      if (key in survey && formData[key] !== undefined) {
        survey[key] = formData[key];
      }
    });

    return survey;
  },

  submitInspection: async (id, formData, userProfile) => {
    const survey = memorySurveys.find(s => s.id === id);
    if (!survey) return null;

    Object.assign(survey, formData);
    survey.is_draft = false;
    survey.status = 'submitted';
    survey.completed_at = new Date().toISOString();
    survey.updated_at = new Date().toISOString();

    // Auto-create/update Feasibility Report record
    const existingReportIdx = memoryReports.findIndex(r => r.survey_id === id);
    const capacity = Number(formData.recommended_capacity_kw || survey.recommended_capacity_kw || 10);
    const estCost = Math.round(capacity * 42000); // Rule of thumb: ~₹42,000/kWp for commercial/residential turnkey
    const usableArea = Number(formData.available_installation_area_sqm || formData.estimated_usable_area_sqm || capacity * 10);

    const reportData = {
      id: existingReportIdx >= 0 ? memoryReports[existingReportIdx].id : `rep-${Date.now()}`,
      survey_id: id,
      survey_code: survey.survey_code,
      report_title: `Solar Feasibility Assessment — ${survey.customer_name}`,
      feasibility_rating: formData.feasibility_rating || 'feasible',
      recommended_capacity_kw: capacity,
      recommended_system_type: formData.recommended_system_type || survey.recommended_system_type || 'on-grid',
      estimated_cost: estCost,
      estimated_usable_area_sqm: usableArea,
      measured_roof_area_sqm: Number(formData.roof_area_sqm || survey.roof_area_sqm || 100),
      executive_summary: formData.executive_summary || `Comprehensive site inspection conducted on ${new Date().toLocaleDateString()}. The rooftop exhibits high solar generation potential with a recommended capacity of ${capacity} kWp ${formData.recommended_system_type || 'on-grid'} system.`,
      shading_assessment: formData.shading_assessment || `Shading condition recorded as: ${formData.shading_conditions || survey.shading_conditions || 'None'}. Orientation: ${formData.roof_direction || survey.roof_direction || 'South'}.`,
      electrical_assessment: formData.electrical_assessment || `Grid availability: ${formData.grid_availability || survey.grid_availability || 'Stable'}. Connection: ${formData.electricity_connection_type || survey.electricity_connection_type || 'Three Phase'}. Main panel condition: ${formData.main_panel_condition || survey.main_panel_condition || 'Good'}.`,
      installation_constraints: formData.potential_constraints || 'Standard installation procedures apply.',
      calculation_assumptions: 'Calculations based on 1 kWp requiring ~10 sqm unshaded roof area. Estimated annual specific yield: 1,450 kWh/kWp based on standard 4.8 PSH/day. Performance ratio: 78%.',
      submitted_at: new Date().toISOString(),
      submitted_by: userProfile?.id || null,
      submitted_by_name: userProfile?.full_name || 'Survey Specialist'
    };

    if (existingReportIdx >= 0) {
      memoryReports[existingReportIdx] = reportData;
    } else {
      memoryReports.unshift(reportData);
    }

    return { survey, report: reportData };
  },

  addPhoto: async (id, photoData, userProfile) => {
    const newPhoto = {
      id: `p-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      survey_id: id,
      storage_path: photoData.storage_path || `surveys/${id}/${photoData.file_name}`,
      photo_type: photoData.photo_type || 'site',
      caption: photoData.caption || 'Site Photograph',
      description: photoData.description || '',
      file_name: photoData.file_name || 'photo.jpg',
      file_size_bytes: photoData.file_size_bytes || 1024000,
      file_type: photoData.file_type || 'image/jpeg',
      uploaded_at: new Date().toISOString(),
      uploaded_by: userProfile?.id || null,
      signed_url: photoData.signed_url || 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80'
    };

    memoryPhotos.unshift(newPhoto);
    return newPhoto;
  },

  deletePhoto: async (photoId) => {
    const idx = memoryPhotos.findIndex(p => p.id === photoId);
    if (idx !== -1) {
      memoryPhotos.splice(idx, 1);
      return true;
    }
    return false;
  },

  reviewSurvey: async (id, { action, comments, revisit_notes, rejection_reason }, userProfile) => {
    const survey = memorySurveys.find(s => s.id === id);
    if (!survey) return null;

    let newStatus = 'approved';
    let approvalStatus = 'approved';

    if (action === 'approve') {
      newStatus = 'approved';
      approvalStatus = 'approved';
      survey.feasibility_status = 'approved';
    } else if (action === 'reject') {
      newStatus = 'rejected';
      approvalStatus = 'rejected';
      survey.feasibility_status = 'rejected';
      survey.rejection_reason = rejection_reason || comments;
    } else if (action === 'revisit' || action === 'revision_requested') {
      newStatus = 'revisit_required';
      approvalStatus = 'revisit_required';
      survey.feasibility_status = 'requires_review';
      survey.revisit_notes = revisit_notes || comments;
    }

    survey.status = newStatus;
    survey.updated_at = new Date().toISOString();

    const approvalRecord = {
      id: `app-${Date.now()}`,
      survey_id: id,
      status: approvalStatus,
      reviewed_by: userProfile?.id || null,
      reviewer_name: userProfile?.full_name || 'Technical Reviewer',
      reviewed_at: new Date().toISOString(),
      comments: comments || `${action.toUpperCase()} by ${userProfile?.full_name || 'Reviewer'}`
    };

    memoryApprovals.unshift(approvalRecord);
    return { survey, approval: approvalRecord };
  },

  getDashboardMetrics: async () => {
    const totalRequests = memorySurveys.length;
    const pending = memorySurveys.filter(s => s.status === 'pending').length;
    const assigned = memorySurveys.filter(s => s.status === 'assigned').length;
    const inProgress = memorySurveys.filter(s => s.status === 'in_progress').length;
    const submitted = memorySurveys.filter(s => s.status === 'submitted').length;
    const approved = memorySurveys.filter(s => s.status === 'approved').length;
    const rejected = memorySurveys.filter(s => s.status === 'rejected').length;
    const revisitRequired = memorySurveys.filter(s => s.status === 'revisit_required').length;

    const todayStr = new Date().toISOString().split('T')[0];
    const scheduledToday = memorySurveys.filter(s => s.scheduled_date === todayStr || s.survey_date === todayStr).length;

    // Status breakdown chart data
    const statusDistribution = [
      { name: 'Pending', count: pending, color: '#f59e0b' },
      { name: 'Assigned', count: assigned, color: '#3b82f6' },
      { name: 'Scheduled Today', count: scheduledToday, color: '#06b6d4' },
      { name: 'In Progress', count: inProgress, color: '#8b5cf6' },
      { name: 'Submitted', count: submitted, color: '#ec4899' },
      { name: 'Approved', count: approved, color: '#10b981' },
      { name: 'Rejected', count: rejected, color: '#ef4444' },
      { name: 'Revisit Required', count: revisitRequired, color: '#f97316' },
    ];

    // Recent assignments
    const recentAssignments = memoryAssignments.slice(0, 5).map(asg => {
      const srv = memorySurveys.find(s => s.id === asg.survey_id);
      return {
        ...asg,
        survey_code: srv?.survey_code || 'SRV-REQ',
        customer_name: srv?.customer_name || 'Customer',
        site_address: srv?.site_address || '',
        priority: srv?.priority || 'medium'
      };
    });

    // Upcoming scheduled surveys
    const upcomingSurveys = memorySurveys
      .filter(s => s.scheduled_date && (s.status === 'scheduled' || s.status === 'assigned'))
      .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date))
      .slice(0, 5);

    return {
      kpis: {
        totalRequests,
        pending,
        assigned,
        scheduledToday,
        inProgress,
        submitted,
        approved,
        rejected,
        revisitRequired
      },
      statusDistribution,
      recentAssignments,
      upcomingSurveys,
      surveyorsWorkload: memorySurveyors
    };
  },

  getSurveyors: async () => {
    // Recalculate dynamic workload counts
    return memorySurveyors.map(sr => {
      const activeCount = memorySurveys.filter(
        s => s.assigned_to === sr.id && ['assigned', 'scheduled', 'in_progress'].includes(s.status)
      ).length;
      return {
        ...sr,
        active_surveys: activeCount
      };
    });
  }
};
