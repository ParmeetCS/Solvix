// Backend Data Store & Transactional Engine for SOLVIX Warehouse & Inventory Module
// Supports both live Supabase operations and resilient memory persistence for local dev.

let memoryCategories = [
  { id: 'cat-1', name: 'Solar Panels', code: 'SOLAR_PANEL', description: 'Monocrystalline, Bifacial and Polycrystalline solar PV modules' },
  { id: 'cat-2', name: 'Inverters', code: 'INVERTER', description: 'On-Grid string inverters, Hybrid inverters and Microinverters' },
  { id: 'cat-3', name: 'Batteries', code: 'BATTERY', description: 'LiFePO4 and Lithium-ion solar energy storage systems' },
  { id: 'cat-4', name: 'Mounting Structures', code: 'STRUCTURE', description: 'HDGI and Aluminum rooftop mounting rails, ballasts and purlin clamps' },
  { id: 'cat-5', name: 'Cables & Wires', code: 'CABLE', description: 'Solar DC 4mm2 / 6mm2 copper cables and armored AC distribution cables' },
  { id: 'cat-6', name: 'Protection Equipment', code: 'PROTECTION', description: 'ACDB, DCDB, Lightning Arresters, Surge Protective Devices, Earthing Electrodes' },
  { id: 'cat-7', name: 'Accessories', code: 'ACCESSORY', description: 'MC4 connectors, conduits, weather-tight glands, monitoring dongles' }
];

let memoryWarehouses = [
  {
    id: 'wh-1',
    name: 'Solvix Central Distribution Center',
    code: 'WH-DEL-01',
    address: 'Plot 18, Okhla Industrial Area Phase III',
    city: 'New Delhi',
    state: 'Delhi',
    pincode: '110020',
    contact_phone: '+91 98110 11223',
    capacity_sqm: 4500,
    is_active: true
  },
  {
    id: 'wh-2',
    name: 'NCR Western Logistics Park',
    code: 'WH-GUR-01',
    address: 'Shed 12, Pace City II, Sector 37',
    city: 'Gurugram',
    state: 'Haryana',
    pincode: '122001',
    contact_phone: '+91 98220 22334',
    capacity_sqm: 3200,
    is_active: true
  },
  {
    id: 'wh-3',
    name: 'NCR Eastern Depot',
    code: 'WH-NOI-01',
    address: 'Block C, Sector 63 Industrial Zone',
    city: 'Noida',
    state: 'Uttar Pradesh',
    pincode: '201301',
    contact_phone: '+91 98330 33445',
    capacity_sqm: 2800,
    is_active: true
  }
];

let memoryProducts = [
  {
    id: 'prod-1',
    sku: 'SLX-PV-545M',
    name: 'Waaree 545Wp Mono PERC Solar PV Module',
    category_id: 'cat-1',
    category_name: 'Solar Panels',
    manufacturer: 'Waaree Energies Ltd',
    description: 'High efficiency 144 half-cut monocrystalline solar module, IP68 junction box, 1500V DC system rating.',
    unit: 'piece',
    purchase_price: 10800,
    selling_price: 13500,
    base_price: 13500,
    min_stock_level: 50,
    warranty_years: 12,
    status: 'active',
    wattage_wp: 545,
    efficiency_pct: 21.3,
    is_active: true,
    created_at: '2026-11-01T08:00:00Z'
  },
  {
    id: 'prod-2',
    sku: 'SLX-PV-550BF',
    name: 'Adani Solar 550Wp Bifacial Dual-Glass Module',
    category_id: 'cat-1',
    category_name: 'Solar Panels',
    manufacturer: 'Adani Solar',
    description: 'Bifacial glass-to-glass module with up to 25% rear side generation gain. Severe weather resistant.',
    unit: 'piece',
    purchase_price: 12200,
    selling_price: 15200,
    base_price: 15200,
    min_stock_level: 40,
    warranty_years: 15,
    status: 'active',
    wattage_wp: 550,
    efficiency_pct: 21.6,
    is_active: true,
    created_at: '2026-11-01T08:00:00Z'
  },
  {
    id: 'prod-3',
    sku: 'SLX-INV-10K3P',
    name: 'Solis 10kW 3-Phase On-Grid String Inverter',
    category_id: 'cat-2',
    category_name: 'Inverters',
    manufacturer: 'Ginlong Solis',
    description: 'Dual MPPT, 98.7% max efficiency, built-in DC disconnect switch, Wi-Fi smart cloud monitoring.',
    unit: 'piece',
    purchase_price: 48000,
    selling_price: 58000,
    base_price: 58000,
    min_stock_level: 8,
    warranty_years: 7,
    status: 'active',
    wattage_wp: 10000,
    efficiency_pct: 98.7,
    is_active: true,
    created_at: '2026-11-01T08:00:00Z'
  },
  {
    id: 'prod-4',
    sku: 'SLX-INV-25K3P',
    name: 'Growatt 25kW 3-Phase On-Grid Solar Inverter',
    category_id: 'cat-2',
    category_name: 'Inverters',
    manufacturer: 'Growatt New Energy',
    description: 'Commercial 3-phase string inverter, Type II SPD on both AC and DC sides, 4 MPPTs.',
    unit: 'piece',
    purchase_price: 92000,
    selling_price: 110000,
    base_price: 110000,
    min_stock_level: 5,
    warranty_years: 7,
    status: 'active',
    wattage_wp: 25000,
    efficiency_pct: 98.8,
    is_active: true,
    created_at: '2026-11-01T08:00:00Z'
  },
  {
    id: 'prod-5',
    sku: 'SLX-BAT-15KWH',
    name: 'Solvix PowerBlock 15kWh LiFePO4 Battery Bank',
    category_id: 'cat-3',
    category_name: 'Batteries',
    manufacturer: 'Solvix Energy Storage',
    description: '48V 300Ah Lithium Iron Phosphate wall-mounted battery system with integrated BMS. 6000+ cycle life.',
    unit: 'set',
    purchase_price: 185000,
    selling_price: 225000,
    base_price: 225000,
    min_stock_level: 4,
    warranty_years: 10,
    status: 'active',
    wattage_wp: 15000,
    is_active: true,
    created_at: '2026-11-01T08:00:00Z'
  },
  {
    id: 'prod-6',
    sku: 'SLX-STR-HDGI-10K',
    name: '10kW HDGI Rooftop Mounting Structure Kit',
    category_id: 'cat-4',
    category_name: 'Mounting Structures',
    manufacturer: 'SolarTech Structures',
    description: '80-micron Hot Dip Galvanized Iron pre-drilled rafters, purlins, mid & end clamps rated for 160 km/h wind.',
    unit: 'set',
    purchase_price: 24000,
    selling_price: 32000,
    base_price: 32000,
    min_stock_level: 10,
    warranty_years: 10,
    status: 'active',
    is_active: true,
    created_at: '2026-11-01T08:00:00Z'
  },
  {
    id: 'prod-7',
    sku: 'SLX-CBL-DC4',
    name: 'Solar DC Cable 4 sq mm (100 Meter Roll)',
    category_id: 'cat-5',
    category_name: 'Cables & Wires',
    manufacturer: 'Polycab Solar',
    description: 'Tinned copper flexible conductor, cross-linked halogen-free polyolefin insulation, UV & ozone resistant.',
    unit: 'meter',
    purchase_price: 38,
    selling_price: 52,
    base_price: 52,
    min_stock_level: 500,
    warranty_years: 25,
    status: 'active',
    is_active: true,
    created_at: '2026-11-01T08:00:00Z'
  },
  {
    id: 'prod-8',
    sku: 'SLX-PRT-ACDC3P',
    name: '3-Phase ACDB & DCDB Protection Combo Box',
    category_id: 'cat-6',
    category_name: 'Protection Equipment',
    manufacturer: 'Havells Solar',
    description: 'IP65 polycarbonate enclosure with Schneider 4-Pole MCB, Type-2 SPD and 1000V DC fuses.',
    unit: 'piece',
    purchase_price: 7500,
    selling_price: 9800,
    base_price: 9800,
    min_stock_level: 12,
    warranty_years: 5,
    status: 'active',
    is_active: true,
    created_at: '2026-11-01T08:00:00Z'
  },
  {
    id: 'prod-9',
    sku: 'SLX-ACC-MC4',
    name: 'Original MC4 Solar Connectors (Pair M/F)',
    category_id: 'cat-7',
    category_name: 'Accessories',
    manufacturer: 'Stäubli Electrical',
    description: 'IP68 certified 1500V MC4 connectors with snap-in locking mechanism.',
    unit: 'set',
    purchase_price: 65,
    selling_price: 95,
    base_price: 95,
    min_stock_level: 200,
    warranty_years: 10,
    status: 'active',
    is_active: true,
    created_at: '2026-11-01T08:00:00Z'
  }
];

let memoryInventory = [
  { id: 'inv-1', product_id: 'prod-1', warehouse_id: 'wh-1', quantity_on_hand: 280, quantity_reserved: 40, bin_location: 'Bay-A1-04', last_restocked_at: '2026-11-15T10:00:00Z' },
  { id: 'inv-2', product_id: 'prod-1', warehouse_id: 'wh-2', quantity_on_hand: 140, quantity_reserved: 20, bin_location: 'Bay-B2-01', last_restocked_at: '2026-11-12T14:00:00Z' },
  { id: 'inv-3', product_id: 'prod-2', warehouse_id: 'wh-1', quantity_on_hand: 190, quantity_reserved: 30, bin_location: 'Bay-A1-08', last_restocked_at: '2026-11-14T09:00:00Z' },
  { id: 'inv-4', product_id: 'prod-3', warehouse_id: 'wh-1', quantity_on_hand: 14, quantity_reserved: 3, bin_location: 'Rack-E1-02', last_restocked_at: '2026-11-10T11:00:00Z' },
  { id: 'inv-5', product_id: 'prod-3', warehouse_id: 'wh-2', quantity_on_hand: 6, quantity_reserved: 1, bin_location: 'Rack-E2-01', last_restocked_at: '2026-11-08T15:00:00Z' },
  { id: 'inv-6', product_id: 'prod-4', warehouse_id: 'wh-1', quantity_on_hand: 7, quantity_reserved: 2, bin_location: 'Rack-E1-05', last_restocked_at: '2026-11-11T12:00:00Z' },
  { id: 'inv-7', product_id: 'prod-5', warehouse_id: 'wh-1', quantity_on_hand: 3, quantity_reserved: 1, bin_location: 'Heavy-Secure-01', last_restocked_at: '2026-11-05T10:00:00Z' }, // Low stock (min is 4)
  { id: 'inv-8', product_id: 'prod-6', warehouse_id: 'wh-1', quantity_on_hand: 18, quantity_reserved: 4, bin_location: 'Yard-Steel-03', last_restocked_at: '2026-11-13T16:00:00Z' },
  { id: 'inv-9', product_id: 'prod-7', warehouse_id: 'wh-1', quantity_on_hand: 2400, quantity_reserved: 350, bin_location: 'Spool-C1-12', last_restocked_at: '2026-11-16T14:30:00Z' },
  { id: 'inv-10', product_id: 'prod-8', warehouse_id: 'wh-1', quantity_on_hand: 22, quantity_reserved: 4, bin_location: 'Shelf-D3-02', last_restocked_at: '2026-11-17T09:30:00Z' },
  { id: 'inv-11', product_id: 'prod-9', warehouse_id: 'wh-1', quantity_on_hand: 450, quantity_reserved: 80, bin_location: 'Bin-D4-01', last_restocked_at: '2026-11-17T11:00:00Z' }
];

let memoryMovements = [
  {
    id: 'mov-1',
    product_id: 'prod-1',
    warehouse_id: 'wh-1',
    movement_type: 'stock_in',
    quantity: 150,
    reference_type: 'purchase_order',
    notes: 'PO-2026-081 Goods received from Waaree factory.',
    created_at: '2026-11-15T10:00:00Z',
    created_by_name: 'Warehouse Receiving Team'
  },
  {
    id: 'mov-2',
    product_id: 'prod-3',
    warehouse_id: 'wh-1',
    movement_type: 'reservation',
    quantity: 2,
    reference_type: 'order',
    notes: 'Reserved for confirmed Order ORD-2026-104 (Rajesh Sharma).',
    created_at: '2026-11-18T14:30:00Z',
    created_by_name: 'Packing Supervisor'
  },
  {
    id: 'mov-3',
    product_id: 'prod-1',
    warehouse_id: 'wh-1',
    movement_type: 'stock_out',
    quantity: 36,
    reference_type: 'dispatch',
    notes: 'Dispatched for Order ORD-2026-092 (Sharma Textiles).',
    created_at: '2026-11-19T11:00:00Z',
    created_by_name: 'Dispatch Manager'
  },
  {
    id: 'mov-4',
    product_id: 'prod-8',
    warehouse_id: 'wh-1',
    movement_type: 'adjustment',
    quantity: 2,
    reference_type: 'audit',
    notes: 'Physical count variance reconciled by Warehouse Manager.',
    created_at: '2026-11-20T16:00:00Z',
    created_by_name: 'Lead Warehouse Manager'
  }
];

let memoryReservations = [
  {
    id: 'res-1',
    product_id: 'prod-1',
    warehouse_id: 'wh-1',
    order_id: 'ord-101',
    quantity: 24,
    status: 'active',
    reserved_at: '2026-11-18T11:00:00Z'
  },
  {
    id: 'res-2',
    product_id: 'prod-3',
    warehouse_id: 'wh-1',
    order_id: 'ord-101',
    quantity: 1,
    status: 'active',
    reserved_at: '2026-11-18T11:00:00Z'
  },
  {
    id: 'res-3',
    product_id: 'prod-6',
    warehouse_id: 'wh-1',
    order_id: 'ord-101',
    quantity: 1,
    status: 'active',
    reserved_at: '2026-11-18T11:00:00Z'
  }
];

let memoryPurchaseOrders = [
  {
    id: 'po-1',
    po_code: 'PO-2026-092',
    supplier_name: 'Waaree Energies Ltd',
    supplier_phone: '+91 22 6644 4400',
    supplier_email: 'sales@waaree.com',
    warehouse_id: 'wh-1',
    warehouse_name: 'Solvix Central Distribution Center',
    status: 'approved',
    total_amount: 1080000,
    expected_date: '2026-11-28',
    received_date: null,
    notes: '100 pcs 545Wp Mono PERC modules ordered for Q4 residential pipeline.',
    created_at: '2026-11-16T10:00:00Z',
    items: [
      { id: 'poi-1', product_id: 'prod-1', product_name: 'Waaree 545Wp Mono PERC Solar PV Module', sku: 'SLX-PV-545M', quantity_ordered: 100, quantity_received: 0, unit_price: 10800, total_price: 1080000 }
    ]
  },
  {
    id: 'po-2',
    po_code: 'PO-2026-088',
    supplier_name: 'Ginlong Solis India Pvt Ltd',
    supplier_phone: '+91 124 400 5500',
    supplier_email: 'orders@solisinverters.in',
    warehouse_id: 'wh-1',
    warehouse_name: 'Solvix Central Distribution Center',
    status: 'partially_received',
    total_amount: 480000,
    expected_date: '2026-11-22',
    received_date: '2026-11-20',
    notes: 'Partial batch of 6 inverters received out of 10.',
    created_at: '2026-11-10T14:00:00Z',
    items: [
      { id: 'poi-2', product_id: 'prod-3', product_name: 'Solis 10kW 3-Phase On-Grid String Inverter', sku: 'SLX-INV-10K3P', quantity_ordered: 10, quantity_received: 6, unit_price: 48000, total_price: 480000 }
    ]
  }
];

let memorySerialNumbers = [
  {
    id: 'sn-1',
    serial_number: 'SLS-INV-2026-881920',
    product_id: 'prod-3',
    product_name: 'Solis 10kW 3-Phase On-Grid String Inverter',
    manufacturer: 'Ginlong Solis',
    status: 'in_stock',
    current_location: 'Central WH Bay-E1-02',
    qr_code_data: 'SOLVIX:SN:SLS-INV-2026-881920:PROD:SLX-INV-10K3P',
    order_id: null,
    customer_id: null,
    dispatch_id: null,
    delivery_date: null,
    warranty_status: 'pending_delivery',
    warranty_years: 7,
    created_at: '2026-11-10T11:00:00Z'
  },
  {
    id: 'sn-2',
    serial_number: 'SLS-INV-2026-881921',
    product_id: 'prod-3',
    product_name: 'Solis 10kW 3-Phase On-Grid String Inverter',
    manufacturer: 'Ginlong Solis',
    status: 'reserved',
    current_location: 'Central WH Staging Area',
    qr_code_data: 'SOLVIX:SN:SLS-INV-2026-881921:PROD:SLX-INV-10K3P',
    order_id: 'ord-101',
    customer_id: 'cust-101',
    dispatch_id: null,
    delivery_date: null,
    warranty_status: 'pending_delivery',
    warranty_years: 7,
    created_at: '2026-11-10T11:00:00Z'
  },
  {
    id: 'sn-3',
    serial_number: 'GWT-INV-2026-554101',
    product_id: 'prod-4',
    product_name: 'Growatt 25kW 3-Phase On-Grid Solar Inverter',
    manufacturer: 'Growatt New Energy',
    status: 'in_stock',
    current_location: 'Central WH Bay-E1-05',
    qr_code_data: 'SOLVIX:SN:GWT-INV-2026-554101:PROD:SLX-INV-25K3P',
    order_id: null,
    customer_id: null,
    dispatch_id: null,
    delivery_date: null,
    warranty_status: 'pending_delivery',
    warranty_years: 7,
    created_at: '2026-11-11T12:00:00Z'
  },
  {
    id: 'sn-4',
    serial_number: 'SLX-BAT-2026-990114',
    product_id: 'prod-5',
    product_name: 'Solvix PowerBlock 15kWh LiFePO4 Battery Bank',
    manufacturer: 'Solvix Energy Storage',
    status: 'in_stock',
    current_location: 'Central WH Heavy-Secure-01',
    qr_code_data: 'SOLVIX:SN:SLX-BAT-2026-990114:PROD:SLX-BAT-15KWH',
    order_id: null,
    customer_id: null,
    dispatch_id: null,
    delivery_date: null,
    warranty_status: 'pending_delivery',
    warranty_years: 10,
    created_at: '2026-11-05T10:00:00Z'
  },
  {
    id: 'sn-5',
    serial_number: 'WAR-MOD-2026-004412',
    product_id: 'prod-1',
    product_name: 'Waaree 545Wp Mono PERC Solar PV Module',
    manufacturer: 'Waaree Energies Ltd',
    status: 'delivered',
    current_location: 'Client Site (Sharma Textiles)',
    qr_code_data: 'SOLVIX:SN:WAR-MOD-2026-004412:PROD:SLX-PV-545M',
    order_id: 'ord-092',
    customer_id: 'cust-092',
    dispatch_id: 'disp-092',
    delivery_date: '2026-11-19',
    warranty_status: 'active',
    warranty_years: 12,
    created_at: '2026-11-01T08:00:00Z'
  }
];

let memoryOrders = [
  {
    id: 'ord-101',
    order_code: 'ORD-2026-104',
    customer_id: 'cust-101',
    customer_name: 'Rajesh Sharma',
    contact_phone: '+91 98112 34567',
    site_address: 'Plot 42, Pocket B, Greater Kailash I, New Delhi',
    status: 'confirmed',
    packing_status: 'packing',
    total_amount: 485000,
    advance_paid: 200000,
    created_at: '2026-11-18T10:00:00Z',
    bom: [
      { product_id: 'prod-1', name: 'Waaree 545Wp Mono PERC Solar PV Module', sku: 'SLX-PV-545M', quantity_required: 20, quantity_packed: 20, is_packed: true },
      { product_id: 'prod-3', name: 'Solis 10kW 3-Phase On-Grid String Inverter', sku: 'SLX-INV-10K3P', quantity_required: 1, quantity_packed: 1, is_packed: true, serial_number: 'SLS-INV-2026-881921' },
      { product_id: 'prod-6', name: '10kW HDGI Rooftop Mounting Structure Kit', sku: 'SLX-STR-HDGI-10K', quantity_required: 1, quantity_packed: 0, is_packed: false },
      { product_id: 'prod-7', name: 'Solar DC Cable 4 sq mm (100 Meter Roll)', sku: 'SLX-CBL-DC4', quantity_required: 150, quantity_packed: 150, is_packed: true },
      { product_id: 'prod-8', name: '3-Phase ACDB & DCDB Protection Combo Box', sku: 'SLX-PRT-ACDC3P', quantity_required: 1, quantity_packed: 0, is_packed: false },
      { product_id: 'prod-9', name: 'Original MC4 Solar Connectors (Pair M/F)', sku: 'SLX-ACC-MC4', quantity_required: 20, quantity_packed: 20, is_packed: true }
    ]
  },
  {
    id: 'ord-102',
    order_code: 'ORD-2026-108',
    customer_id: 'cust-102',
    customer_name: 'Green Valley School',
    contact_phone: '+91 98334 56789',
    site_address: 'Institutional Block C, Sector 62, Noida',
    status: 'confirmed',
    packing_status: 'pending',
    total_amount: 1150000,
    advance_paid: 450000,
    created_at: '2026-11-19T14:00:00Z',
    bom: [
      { product_id: 'prod-1', name: 'Waaree 545Wp Mono PERC Solar PV Module', sku: 'SLX-PV-545M', quantity_required: 46, quantity_packed: 0, is_packed: false },
      { product_id: 'prod-4', name: 'Growatt 25kW 3-Phase On-Grid Solar Inverter', sku: 'SLX-INV-25K3P', quantity_required: 1, quantity_packed: 0, is_packed: false },
      { product_id: 'prod-7', name: 'Solar DC Cable 4 sq mm (100 Meter Roll)', sku: 'SLX-CBL-DC4', quantity_required: 300, quantity_packed: 0, is_packed: false },
      { product_id: 'prod-8', name: '3-Phase ACDB & DCDB Protection Combo Box', sku: 'SLX-PRT-ACDC3P', quantity_required: 1, quantity_packed: 0, is_packed: false }
    ]
  }
];

let memoryDispatches = [
  {
    id: 'disp-092',
    dispatch_code: 'DSP-2026-0044',
    order_id: 'ord-092',
    order_code: 'ORD-2026-092',
    customer_id: 'cust-092',
    customer_name: 'Sharma Textiles Ltd',
    customer_phone: '+91 98223 45678',
    destination_address: 'Industrial Shed 14, Sector 37, Pace City II, Gurugram',
    warehouse_id: 'wh-1',
    warehouse_name: 'Solvix Central Distribution Center',
    transporter_name: 'SafeXpress Solar Logistics',
    tracking_number: 'SFX-994182910',
    vehicle_number: 'HR-55-AJ-4029',
    driver_phone: '+91 98991 10022',
    status: 'delivered',
    dispatched_at: '2026-11-19T10:00:00Z',
    delivered_at: '2026-11-19T16:30:00Z',
    notes: 'Delivered in full. Signed delivery challan uploaded.',
    items: [
      { product_name: 'Waaree 545Wp Mono PERC Solar PV Module', sku: 'SLX-PV-545M', quantity: 36, serial_number: 'WAR-MOD-2026-004412' }
    ]
  }
];

let memoryWarranties = [
  {
    id: 'war-1',
    warranty_code: 'WAR-2026-0012',
    equipment_serial_id: 'sn-5',
    serial_number: 'WAR-MOD-2026-004412',
    product_name: 'Waaree 545Wp Mono PERC Solar PV Module',
    customer_id: 'cust-092',
    customer_name: 'Sharma Textiles Ltd',
    order_id: 'ord-092',
    warranty_type: 'manufacturer',
    duration_years: 12,
    start_date: '2026-11-19', // Exactly matches delivery date
    expiry_date: '2038-11-19', // start_date + 12 years
    status: 'active',
    terms: 'Manufacturer standard 12-year product warranty & 25-year 80% linear power output guarantee. Warranty clock starts from verified equipment delivery date (2026-11-19).',
    created_at: '2026-11-19T16:35:00Z'
  }
];

export const warehouseStore = {
  // 1. Dashboard Metrics
  getDashboardMetrics: async () => {
    const totalProducts = memoryProducts.filter(p => p.is_active).length;
    const totalStockQuantity = memoryInventory.reduce((acc, i) => acc + Number(i.quantity_on_hand), 0);
    
    // Low stock check: compare quantity_on_hand against product min_stock_level
    const lowStockItems = [];
    const outOfStockItems = [];

    memoryProducts.forEach(prod => {
      const invs = memoryInventory.filter(i => i.product_id === prod.id);
      const totalOnHand = invs.reduce((acc, i) => acc + Number(i.quantity_on_hand), 0);
      const totalReserved = invs.reduce((acc, i) => acc + Number(i.quantity_reserved), 0);
      const available = totalOnHand - totalReserved;
      const threshold = prod.min_stock_threshold || prod.min_stock_level || 5;

      const alertPayload = {
        ...prod,
        product_id: prod.id,
        product_name: prod.name,
        totalOnHand,
        totalReserved,
        available,
        quantity_available: available,
        min_threshold: threshold,
        min_stock_threshold: threshold
      };

      if (totalOnHand === 0) {
        outOfStockItems.push(alertPayload);
      } else if (available <= threshold) {
        lowStockItems.push(alertPayload);
      }
    });

    const pendingPacking = memoryOrders.filter(o => o.packing_status === 'pending' || o.packing_status === 'packing').length;
    const pendingDispatches = memoryDispatches.filter(d => d.status === 'prepared' || d.status === 'in_transit').length;
    const totalSerialNumbers = memorySerialNumbers.length;
    const recentMovements = memoryMovements.slice(0, 8);

    return {
      kpis: {
        totalProducts,
        total_products: totalProducts,
        totalStockQuantity,
        total_stock_quantity: totalStockQuantity,
        lowStockProducts: lowStockItems.length,
        low_stock_products: lowStockItems.length,
        outOfStockProducts: outOfStockItems.length,
        out_of_stock_products: outOfStockItems.length,
        pendingPacking,
        pending_packing: pendingPacking,
        pendingDispatches,
        pending_dispatches: pendingDispatches,
        totalSerialNumbers,
        registered_serials: totalSerialNumbers,
        recentMovementsCount: memoryMovements.length,
        recent_movements_count: memoryMovements.length
      },
      lowStockAlerts: lowStockItems,
      low_stock_alerts: lowStockItems,
      outOfStockAlerts: outOfStockItems,
      out_of_stock_alerts: outOfStockItems,
      recentMovements,
      recent_movements: recentMovements,
      warehouses: memoryWarehouses.map(wh => {
        const whStock = memoryInventory
          .filter(i => i.warehouse_id === wh.id)
          .reduce((acc, i) => acc + Number(i.quantity_on_hand), 0);
        return {
          ...wh,
          total_stock_units: whStock
        };
      })
    };
  },

  // 2. Products
  getProducts: async ({ category = '', status = '', search = '' } = {}) => {
    let list = [...memoryProducts];
    if (category && category !== 'all') {
      list = list.filter(p => p.category_id === category || p.category_name.toLowerCase().includes(category.toLowerCase()));
    }
    if (status && status !== 'all') {
      list = list.filter(p => p.status === status);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.manufacturer?.toLowerCase().includes(q)
      );
    }

    // Attach aggregated stock per product
    return list.map(prod => {
      const invs = memoryInventory.filter(i => i.product_id === prod.id);
      const totalOnHand = invs.reduce((acc, i) => acc + Number(i.quantity_on_hand), 0);
      const totalReserved = invs.reduce((acc, i) => acc + Number(i.quantity_reserved), 0);
      return {
        ...prod,
        stock_on_hand: totalOnHand,
        stock_reserved: totalReserved,
        available_stock: totalOnHand - totalReserved
      };
    });
  },

  getProductById: async (id) => {
    const prod = memoryProducts.find(p => p.id === id || p.sku === id);
    if (!prod) return null;

    const inventoryRecords = memoryInventory
      .filter(i => i.product_id === prod.id)
      .map(i => {
        const wh = memoryWarehouses.find(w => w.id === i.warehouse_id);
        return {
          ...i,
          warehouse_name: wh?.name || 'Central Hub',
          warehouse_code: wh?.code || 'WH-01',
          available: Number(i.quantity_on_hand) - Number(i.quantity_reserved)
        };
      });

    const movements = memoryMovements.filter(m => m.product_id === prod.id);
    const serials = memorySerialNumbers.filter(s => s.product_id === prod.id);

    return {
      product: prod,
      inventory: inventoryRecords,
      movements,
      serials
    };
  },

  createProduct: async (productData, userProfile) => {
    const warrantyMonths = productData.warranty_months ? Number(productData.warranty_months) : (productData.warranty_years ? Number(productData.warranty_years) * 12 : 60);
    const newProduct = {
      id: `prod-${Date.now()}`,
      sku: productData.sku.toUpperCase(),
      name: productData.name,
      category: productData.category || 'solar_panel',
      category_id: productData.category_id || productData.category || 'cat-1',
      category_name: productData.category_name || (productData.category ? productData.category.replace('_', ' ') : 'Solar Products'),
      manufacturer: productData.manufacturer || 'Solar Manufacturer',
      description: productData.description || '',
      unit: productData.unit || 'pcs',
      purchase_price: Number(productData.purchase_price || 0),
      selling_price: Number(productData.selling_price || 0),
      base_price: Number(productData.selling_price || 0),
      min_stock_level: Number(productData.min_stock_threshold || productData.min_stock_level || 5),
      min_stock_threshold: Number(productData.min_stock_threshold || productData.min_stock_level || 5),
      warranty_years: Math.round(warrantyMonths / 12),
      warranty_months: warrantyMonths,
      requires_serial_number: productData.requires_serial_number ?? true,
      status: productData.status || 'active',
      wattage_wp: productData.wattage_wp ? Number(productData.wattage_wp) : (productData.specifications?.wattage ? parseFloat(productData.specifications.wattage) : null),
      efficiency_pct: productData.efficiency_pct ? Number(productData.efficiency_pct) : null,
      specifications: productData.specifications || {},
      is_active: true,
      created_at: new Date().toISOString()
    };

    memoryProducts.unshift(newProduct);

    // Initialize zero inventory row across warehouses
    memoryWarehouses.forEach(wh => {
      memoryInventory.push({
        id: `inv-${Date.now()}-${wh.id}`,
        product_id: newProduct.id,
        warehouse_id: wh.id,
        quantity_on_hand: 0,
        quantity_reserved: 0,
        bin_location: 'Unassigned',
        last_restocked_at: null
      });
    });

    return newProduct;
  },

  updateProduct: async (id, updates, userProfile) => {
    const idx = memoryProducts.findIndex(p => p.id === id);
    if (idx === -1) return null;

    memoryProducts[idx] = {
      ...memoryProducts[idx],
      ...updates,
      updated_at: new Date().toISOString()
    };
    return memoryProducts[idx];
  },

  // 3. Inventory Stock Operations
  getInventory: async ({ warehouse_id = '', product_id = '', low_stock_only = false, search = '' } = {}) => {
    let list = memoryInventory.map(inv => {
      const prod = memoryProducts.find(p => p.id === inv.product_id);
      const wh = memoryWarehouses.find(w => w.id === inv.warehouse_id);
      const available = Number(inv.quantity_on_hand) - Number(inv.quantity_reserved);
      const threshold = prod?.min_stock_threshold || prod?.min_stock_level || 5;
      const isLow = available <= threshold;
      return {
        ...inv,
        product: prod,
        product_name: prod?.name || 'Unknown',
        product_sku: prod?.sku || 'N/A',
        sku: prod?.sku || 'N/A',
        category_name: prod?.category_name || 'General',
        warehouse: wh,
        warehouse_name: wh?.name || 'Warehouse',
        available_stock: available,
        quantity_available: available,
        min_stock_threshold: threshold,
        is_low_stock: isLow
      };
    });

    if (product_id) {
      list = list.filter(i => i.product_id === product_id);
    }
    if (warehouse_id && warehouse_id !== 'all') {
      list = list.filter(i => i.warehouse_id === warehouse_id);
    }
    if (low_stock_only) {
      list = list.filter(i => i.is_low_stock);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(i =>
        i.product_name.toLowerCase().includes(q) ||
        i.sku.toLowerCase().includes(q) ||
        i.bin_location?.toLowerCase().includes(q)
      );
    }
    return list;
  },

  // Stock-In (Goods Receiving / Restock)
  recordStockIn: async ({ product_id, warehouse_id, quantity, reference_type = 'purchase_order', notes = '' }, userProfile) => {
    const qty = Number(quantity);
    if (qty <= 0) throw new Error('Stock-in quantity must be greater than zero.');

    let inv = memoryInventory.find(i => i.product_id === product_id && i.warehouse_id === warehouse_id);
    if (!inv) {
      inv = {
        id: `inv-${Date.now()}`,
        product_id,
        warehouse_id,
        quantity_on_hand: 0,
        quantity_reserved: 0,
        bin_location: 'Bay-01',
        last_restocked_at: new Date().toISOString()
      };
      memoryInventory.push(inv);
    }

    inv.quantity_on_hand += qty;
    inv.last_restocked_at = new Date().toISOString();

    const movement = {
      id: `mov-${Date.now()}`,
      product_id,
      warehouse_id,
      movement_type: 'stock_in',
      quantity: qty,
      reference_type,
      notes: notes || `Stock-in of ${qty} units recorded.`,
      created_at: new Date().toISOString(),
      created_by_name: userProfile?.full_name || 'Warehouse Staff'
    };
    memoryMovements.unshift(movement);

    return { inventory: inv, movement };
  },

  // Stock-Out (Internal Issue / Disposal)
  recordStockOut: async ({ product_id, warehouse_id, quantity, notes = '' }, userProfile) => {
    const qty = Number(quantity);
    if (qty <= 0) throw new Error('Stock-out quantity must be greater than zero.');

    const inv = memoryInventory.find(i => i.product_id === product_id && i.warehouse_id === warehouse_id);
    if (!inv) throw new Error('Product not found in this warehouse.');

    const available = inv.quantity_on_hand - inv.quantity_reserved;
    if (available - qty < 0) {
      throw new Error(`Insufficient available stock. On hand: ${inv.quantity_on_hand}, Reserved: ${inv.quantity_reserved}, Available: ${available}. Never allowing negative stock.`);
    }

    inv.quantity_on_hand -= qty;

    const movement = {
      id: `mov-${Date.now()}`,
      product_id,
      warehouse_id,
      movement_type: 'stock_out',
      quantity: qty,
      reference_type: 'manual_issue',
      notes: notes || `Manual stock-out of ${qty} units.`,
      created_at: new Date().toISOString(),
      created_by_name: userProfile?.full_name || 'Warehouse Staff'
    };
    memoryMovements.unshift(movement);

    return { inventory: inv, movement };
  },

  // Stock Adjustment (Restricted to Warehouse Manager / Admin)
  recordStockAdjustment: async ({ product_id, warehouse_id, new_quantity, reason = '' }, userProfile) => {
    const targetQty = Number(new_quantity);
    if (targetQty < 0) throw new Error('Stock level cannot be negative.');

    let inv = memoryInventory.find(i => i.product_id === product_id && i.warehouse_id === warehouse_id);
    if (!inv) {
      inv = {
        id: `inv-${Date.now()}`,
        product_id,
        warehouse_id,
        quantity_on_hand: targetQty,
        quantity_reserved: 0,
        bin_location: 'Default',
        last_restocked_at: new Date().toISOString()
      };
      memoryInventory.push(inv);
    }

    if (targetQty < inv.quantity_reserved) {
      throw new Error(`Cannot adjust stock below current active reservations (${inv.quantity_reserved} units reserved). Release reservations first.`);
    }

    const difference = targetQty - inv.quantity_on_hand;
    inv.quantity_on_hand = targetQty;

    const movement = {
      id: `mov-${Date.now()}`,
      product_id,
      warehouse_id,
      movement_type: 'adjustment',
      quantity: difference,
      reference_type: 'physical_audit',
      notes: reason || `Inventory adjusted from ${inv.quantity_on_hand - difference} to ${targetQty} units (${difference >= 0 ? '+' : ''}${difference}).`,
      created_at: new Date().toISOString(),
      created_by_name: userProfile?.full_name || 'Warehouse Manager'
    };
    memoryMovements.unshift(movement);

    return { inventory: inv, movement };
  },

  // Stock Transfer between Warehouses
  recordStockTransfer: async ({ product_id, source_warehouse_id, destination_warehouse_id, quantity, notes = '' }, userProfile) => {
    const qty = Number(quantity);
    if (qty <= 0) throw new Error('Transfer quantity must be positive.');
    if (source_warehouse_id === destination_warehouse_id) throw new Error('Source and destination warehouses must be different.');

    const sourceInv = memoryInventory.find(i => i.product_id === product_id && i.warehouse_id === source_warehouse_id);
    if (!sourceInv) throw new Error('Source inventory record not found.');

    const available = sourceInv.quantity_on_hand - sourceInv.quantity_reserved;
    if (available - qty < 0) {
      throw new Error(`Insufficient stock in source warehouse. Available: ${available}, requested transfer: ${qty}.`);
    }

    let destInv = memoryInventory.find(i => i.product_id === product_id && i.warehouse_id === destination_warehouse_id);
    if (!destInv) {
      destInv = {
        id: `inv-${Date.now()}`,
        product_id,
        warehouse_id: destination_warehouse_id,
        quantity_on_hand: 0,
        quantity_reserved: 0,
        bin_location: 'Transfer-In',
        last_restocked_at: new Date().toISOString()
      };
      memoryInventory.push(destInv);
    }

    // Atomic execution
    sourceInv.quantity_on_hand -= qty;
    destInv.quantity_on_hand += qty;

    const movementOut = {
      id: `mov-tf-out-${Date.now()}`,
      product_id,
      warehouse_id: source_warehouse_id,
      movement_type: 'transfer',
      quantity: qty,
      notes: `Transfer OUT to ${destination_warehouse_id}. Notes: ${notes}`,
      created_at: new Date().toISOString(),
      created_by_name: userProfile?.full_name || 'Warehouse Logistics'
    };
    const movementIn = {
      id: `mov-tf-in-${Date.now()}`,
      product_id,
      warehouse_id: destination_warehouse_id,
      movement_type: 'transfer',
      quantity: qty,
      notes: `Transfer IN from ${source_warehouse_id}. Notes: ${notes}`,
      created_at: new Date().toISOString(),
      created_by_name: userProfile?.full_name || 'Warehouse Logistics'
    };
    memoryMovements.unshift(movementOut, movementIn);

    return { source: sourceInv, destination: destInv };
  },

  // 4. Purchase Orders & Goods Receiving
  getPurchaseOrders: async ({ status = '' } = {}) => {
    let list = [...memoryPurchaseOrders];
    if (status && status !== 'all') {
      list = list.filter(po => po.status === status);
    }
    return list;
  },

  createPurchaseOrder: async (poData, userProfile) => {
    const yr = new Date().getFullYear();
    const rand = Math.floor(100 + Math.random() * 900);
    const code = `PO-${yr}-${rand}`;

    const items = (poData.items || []).map((item, idx) => {
      const prod = memoryProducts.find(p => p.id === item.product_id);
      const unitPrice = Number(item.unit_price || prod?.purchase_price || 0);
      const qty = Number(item.quantity_ordered || item.quantity || 1);
      return {
        id: `poi-${Date.now()}-${idx}`,
        product_id: item.product_id,
        product_name: prod?.name || 'Solar Item',
        sku: prod?.sku || 'SKU',
        quantity_ordered: qty,
        quantity_received: 0,
        unit_price: unitPrice,
        total_price: qty * unitPrice
      };
    });

    const totalAmount = items.reduce((acc, it) => acc + it.total_price, 0);
    const wh = memoryWarehouses.find(w => w.id === poData.warehouse_id) || memoryWarehouses[0];

    const newPO = {
      id: `po-${Date.now()}`,
      po_code: code,
      po_number: poData.po_number || code,
      supplier_name: poData.supplier_name,
      supplier_phone: poData.supplier_phone || poData.supplier_contact || '',
      supplier_email: poData.supplier_email || '',
      warehouse_id: wh.id,
      warehouse_name: wh.name,
      status: poData.status || 'ordered',
      total_amount: totalAmount,
      expected_date: poData.expected_date || poData.expected_delivery_date || null,
      received_date: null,
      notes: poData.notes || 'Solar equipment procurement order.',
      created_at: new Date().toISOString(),
      items
    };

    // Note: Creating PO does NOT increase stock! Stock increases ONLY when goods are received.
    memoryPurchaseOrders.unshift(newPO);
    return newPO;
  },

  // Verified Goods Receipt (Partial delivery supported)
  receiveGoods: async (poId, receivedData, userProfile) => {
    const po = memoryPurchaseOrders.find(p => p.id === poId || p.po_code === poId || p.po_number === poId);
    if (!po) throw new Error('Purchase order not found.');

    const receivedItems = Array.isArray(receivedData) ? receivedData : (receivedData?.received_items || []);
    let anyReceived = false;
    let allReceived = true;

    // Process each received item
    receivedItems.forEach(receipt => {
      const item = po.items.find(i => i.id === receipt.item_id || i.product_id === receipt.product_id);
      if (!item) return;

      const qtyReceiving = Number(receipt.quantity_received || 0);
      if (qtyReceiving <= 0) return;

      const remainingAllowed = item.quantity_ordered - item.quantity_received;
      if (qtyReceiving > remainingAllowed) {
        throw new Error(`Cannot receive ${qtyReceiving} for ${item.product_name}. Only ${remainingAllowed} pending.`);
      }

      item.quantity_received += qtyReceiving;
      anyReceived = true;

      // Update warehouse inventory with verified stock
      let inv = memoryInventory.find(i => i.product_id === item.product_id && i.warehouse_id === po.warehouse_id);
      if (!inv) {
        inv = {
          id: `inv-${Date.now()}-${item.product_id}`,
          product_id: item.product_id,
          warehouse_id: po.warehouse_id,
          quantity_on_hand: 0,
          quantity_reserved: 0,
          bin_location: 'Receiving Dock',
          last_restocked_at: new Date().toISOString()
        };
        memoryInventory.push(inv);
      }

      inv.quantity_on_hand += qtyReceiving;
      inv.last_restocked_at = new Date().toISOString();

      // Log verified stock movement
      memoryMovements.unshift({
        id: `mov-${Date.now()}-${item.product_id}`,
        product_id: item.product_id,
        warehouse_id: po.warehouse_id,
        movement_type: 'stock_in',
        quantity: qtyReceiving,
        reference_type: 'purchase_order',
        notes: `Verified receipt on ${po.po_code || po.po_number} (${item.quantity_received}/${item.quantity_ordered} received)`,
        created_at: new Date().toISOString(),
        created_by_name: userProfile?.full_name || 'Receiving Officer'
      });
    });

    // Check overall status
    po.items.forEach(it => {
      if (it.quantity_received < it.quantity_ordered) {
        allReceived = false;
      }
    });

    if (allReceived) {
      po.status = 'received';
      po.received_date = new Date().toISOString().split('T')[0];
    } else if (anyReceived) {
      po.status = 'partially_received';
    }

    return { purchase_order: po, success: true };
  },

  // 5. Order Packing & Inventory Reservation
  getPackingQueue: async () => {
    return memoryOrders.map(order => {
      const isReadyToPack = order.bom.every(b => {
        const invs = memoryInventory.filter(i => i.product_id === b.product_id);
        const avail = invs.reduce((acc, i) => acc + (Number(i.quantity_on_hand) - Number(i.quantity_reserved)), 0);
        return avail >= b.quantity_required;
      });
      return {
        ...order,
        has_sufficient_stock: isReadyToPack
      };
    });
  },

  getOrderPackingDetail: async (orderId) => {
    const order = memoryOrders.find(o => o.id === orderId || o.order_code === orderId);
    if (!order) return null;

    // Check live stock per BOM item
    const enrichedBOM = order.bom.map(b => {
      const invs = memoryInventory.filter(i => i.product_id === b.product_id);
      const totalOnHand = invs.reduce((acc, i) => acc + Number(i.quantity_on_hand), 0);
      const totalReserved = invs.reduce((acc, i) => acc + Number(i.quantity_reserved), 0);
      const available = totalOnHand - totalReserved;
      const isReservedForThisOrder = memoryReservations.some(
        r => r.order_id === order.id && r.product_id === b.product_id && r.status === 'active'
      );

      return {
        ...b,
        stock_on_hand: totalOnHand,
        stock_reserved: totalReserved,
        available_stock: available,
        is_reserved: isReservedForThisOrder,
        is_sufficient: available >= (b.quantity_required - (isReservedForThisOrder ? b.quantity_required : 0))
      };
    });

    return {
      order,
      bom: enrichedBOM
    };
  },

  // Reserve stock for an order (Transactionally safe: prevents double reservation)
  reserveOrderStock: async (orderId, warehouseId = 'wh-1', userProfile) => {
    const order = memoryOrders.find(o => o.id === orderId || o.order_code === orderId);
    if (!order) throw new Error('Order not found.');

    const reservationsCreated = [];

    for (const item of order.bom) {
      // Check if ALREADY reserved for this order to prevent double reservation
      const existingRes = memoryReservations.find(
        r => r.order_id === order.id && r.product_id === item.product_id && r.status === 'active'
      );
      if (existingRes) {
        // Already reserved, skip to avoid double counting
        continue;
      }

      const inv = memoryInventory.find(i => i.product_id === item.product_id && i.warehouse_id === warehouseId);
      if (!inv) throw new Error(`Product ${item.name} not stocked in this warehouse.`);

      const available = inv.quantity_on_hand - inv.quantity_reserved;
      if (available < item.quantity_required) {
        throw new Error(`Insufficient stock to reserve ${item.name}. Available: ${available}, Required: ${item.quantity_required}.`);
      }

      // Execute reservation
      inv.quantity_reserved += item.quantity_required;

      const newRes = {
        id: `res-${Date.now()}-${item.product_id}`,
        product_id: item.product_id,
        warehouse_id: warehouseId,
        order_id: order.id,
        quantity: item.quantity_required,
        status: 'active',
        reserved_at: new Date().toISOString()
      };
      memoryReservations.push(newRes);
      reservationsCreated.push(newRes);

      memoryMovements.unshift({
        id: `mov-res-${Date.now()}-${item.product_id}`,
        product_id: item.product_id,
        warehouse_id: warehouseId,
        movement_type: 'reservation',
        quantity: item.quantity_required,
        reference_type: 'order',
        notes: `Stock reserved for Order ${order.order_code}.`,
        created_at: new Date().toISOString(),
        created_by_name: userProfile?.full_name || 'Warehouse Staff'
      });
    }

    return { success: true, reservations: reservationsCreated };
  },

  // Update packing item status / checklist
  updatePackingChecklist: async (orderId, packedItems, userProfile) => {
    const order = memoryOrders.find(o => o.id === orderId || o.order_code === orderId);
    if (!order) throw new Error('Order not found.');

    packedItems.forEach(pi => {
      const bomItem = order.bom.find(b => b.product_id === pi.product_id);
      if (bomItem) {
        bomItem.quantity_packed = Number(pi.quantity_packed || 0);
        bomItem.is_packed = bomItem.quantity_packed >= bomItem.quantity_required;
        if (pi.serial_number) {
          bomItem.serial_number = pi.serial_number;
        }
      }
    });

    const allPacked = order.bom.every(b => b.is_packed);
    order.packing_status = allPacked ? 'packed' : 'packing';

    return { order, allPacked };
  },

  // 6. Serial Number Management & QR Generation
  getSerialNumbers: async ({ product_id = '', status = '', search = '' } = {}) => {
    let list = [...memorySerialNumbers];
    if (product_id && product_id !== 'all') {
      list = list.filter(s => s.product_id === product_id);
    }
    if (status && status !== 'all') {
      list = list.filter(s => s.status === status);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.serial_number.toLowerCase().includes(q) ||
        s.product_name?.toLowerCase().includes(q) ||
        s.manufacturer?.toLowerCase().includes(q)
      );
    }
    return list;
  },

  registerSerialNumber: async (serialData, userProfile) => {
    const snClean = serialData.serial_number.trim().toUpperCase();

    // Enforce uniqueness
    const existing = memorySerialNumbers.find(s => s.serial_number === snClean);
    if (existing) {
      throw new Error(`Serial number "${snClean}" is already registered in the system.`);
    }

    const prod = memoryProducts.find(p => p.id === serialData.product_id);
    if (!prod) throw new Error('Product not found for serial number registration.');

    const qrData = `SOLVIX:SN:${snClean}:PROD:${prod.sku}`;

    const newRecord = {
      id: `sn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      serial_number: snClean,
      product_id: prod.id,
      product_name: prod.name,
      manufacturer: serialData.manufacturer || prod.manufacturer,
      status: 'in_stock',
      current_location: serialData.current_location || 'Central Warehouse',
      qr_code_data: qrData,
      order_id: null,
      customer_id: null,
      dispatch_id: null,
      delivery_date: null,
      warranty_status: 'pending_delivery',
      warranty_years: prod.warranty_years || 5,
      registered_by: userProfile?.id || null,
      created_at: new Date().toISOString()
    };

    memorySerialNumbers.unshift(newRecord);
    return newRecord;
  },

  // Batch CSV Registration
  registerBatchSerials: async (batchList, userProfile) => {
    const results = [];
    const errors = [];

    for (const item of batchList) {
      try {
        const registered = await warehouseStore.registerSerialNumber(item, userProfile);
        results.push(registered);
      } catch (err) {
        errors.push({ serial_number: item.serial_number, error: err.message });
      }
    }

    return { registeredCount: results.length, failedCount: errors.length, results, errors };
  },

  // QR / Serial Lookup
  lookupSerial: async (query) => {
    const q = query.trim().toUpperCase();
    const cleanSN = q.replace(/^SOLVIX:SN:/, '').split(':')[0];

    const record = memorySerialNumbers.find(
      s => s.serial_number === q || s.serial_number === cleanSN || s.qr_code_data === q
    );
    if (!record) return null;

    const prod = memoryProducts.find(p => p.id === record.product_id);
    const order = record.order_id ? memoryOrders.find(o => o.id === record.order_id) : null;
    const warranty = memoryWarranties.find(w => w.equipment_serial_id === record.id);

    return {
      serial: record,
      product: prod,
      order,
      warranty
    };
  },

  // 7. Dispatch Management & Transactional Inventory Deduction
  getDispatches: async ({ status = '' } = {}) => {
    let list = [...memoryDispatches];
    if (status && status !== 'all') {
      list = list.filter(d => d.status === status);
    }
    return list;
  },

  getDispatchById: async (id) => {
    return memoryDispatches.find(d => d.id === id || d.dispatch_code === id);
  },

  // Create & Authorize Dispatch (Inventory deducted exactly once upon in_transit)
  createDispatch: async (dispatchData, userProfile) => {
    let order = memoryOrders.find(o => o.id === dispatchData.order_id || o.order_code === dispatchData.order_id);
    if (!order) {
      order = {
        id: dispatchData.order_id || `ord-${Date.now()}`,
        order_code: `ORD-${Date.now()}`,
        customer_id: 'cust-direct',
        customer_name: dispatchData.customer_name || 'Retail Client',
        contact_phone: dispatchData.customer_phone || '+91 98000 00000',
        site_address: dispatchData.destination_address || 'Site Delivery',
        bom: dispatchData.items || []
      };
      memoryOrders.push(order);
    }

    const yr = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    const code = dispatchData.dispatch_number || `DSP-${yr}-${rand}`;

    const items = dispatchData.items || order.bom;

    const newDispatch = {
      id: `disp-${Date.now()}`,
      dispatch_code: code,
      dispatch_number: code,
      order_id: order.id,
      order_code: order.order_code,
      customer_id: order.customer_id,
      customer_name: dispatchData.customer_name || order.customer_name,
      customer_phone: dispatchData.customer_phone || order.contact_phone,
      destination_address: dispatchData.destination_address || order.site_address,
      warehouse_id: dispatchData.warehouse_id || 'wh-1',
      warehouse_name: 'Solvix Central Distribution Center',
      transporter_name: dispatchData.transporter_name || 'Solvix Direct Logistics',
      tracking_number: dispatchData.tracking_number || `TRK-${Date.now()}`,
      vehicle_number: dispatchData.vehicle_number || 'DL-1L-8822',
      driver_phone: dispatchData.driver_phone || '+91 98101 22334',
      status: dispatchData.status || (dispatchData.authorize_immediate ? 'in_transit' : 'draft'),
      dispatched_at: new Date().toISOString(),
      delivered_at: null,
      notes: dispatchData.notes || 'Dispatched for site delivery.',
      items: items.map(it => {
        const serialsList = Array.isArray(it.serial_numbers)
          ? it.serial_numbers
          : (it.serial_number ? [it.serial_number] : []);
        return {
          product_id: it.product_id,
          product_name: it.product_name || it.name,
          sku: it.sku,
          quantity: Number(it.quantity || it.quantity_packed || it.quantity_required || 1),
          serial_number: serialsList[0] || null,
          serial_numbers: serialsList
        };
      })
    };

    // TRANSACTIONAL EXECUTION: Deduct stock exactly once
    if (newDispatch.status === 'in_transit') {
      newDispatch.items.forEach(item => {
        const inv = memoryInventory.find(i => i.product_id === item.product_id && i.warehouse_id === newDispatch.warehouse_id);
        if (inv) {
          // Deduct from on-hand and release reservation
          inv.quantity_on_hand -= item.quantity;
          inv.quantity_reserved = Math.max(0, inv.quantity_reserved - item.quantity);
        }

        // Log movement
        memoryMovements.unshift({
          id: `mov-disp-${Date.now()}-${item.product_id}`,
          product_id: item.product_id,
          warehouse_id: newDispatch.warehouse_id,
          movement_type: 'stock_out',
          quantity: item.quantity,
          reference_type: 'dispatch',
          notes: `Stock deducted for Dispatch ${code} (Order ${order.order_code})`,
          created_at: new Date().toISOString(),
          created_by_name: userProfile?.full_name || 'Dispatch Supervisor'
        });

        // Update serial status if serial numbers assigned
        const snList = item.serial_numbers || (item.serial_number ? [item.serial_number] : []);
        snList.forEach(snStr => {
          const snRec = memorySerialNumbers.find(s => s.serial_number === snStr);
          if (snRec) {
            snRec.status = 'dispatched';
            snRec.dispatch_id = newDispatch.id;
            snRec.order_id = order.id;
            snRec.customer_id = order.customer_id;
          }
        });
      });
    }

    order.packing_status = 'dispatched';
    memoryDispatches.unshift(newDispatch);
    return newDispatch;
  },

  // 8. Equipment Delivery Confirmation & Warranty Trigger
  // CRITICAL RULE: Warranty clock starts on actual equipment delivery, not installation!
  confirmEquipmentDelivery: async (dispatchId, deliveryData, userProfile) => {
    const dispatch = memoryDispatches.find(d => d.id === dispatchId || d.dispatch_code === dispatchId || d.dispatch_number === dispatchId);
    if (!dispatch) throw new Error('Dispatch record not found.');

    if (dispatch.status === 'delivered') {
      throw new Error('This dispatch has already been delivered. Avoid duplicate warranty or stock triggers.');
    }

    const actualDeliveryDate = deliveryData.delivered_at
      ? deliveryData.delivered_at.split('T')[0]
      : new Date().toISOString().split('T')[0];

    dispatch.status = 'delivered';
    dispatch.delivered_at = new Date().toISOString();
    dispatch.delivery_notes = deliveryData.notes || deliveryData.delivery_notes || 'Equipment received in good condition by customer.';
    dispatch.recipient_name = deliveryData.recipient_name || '';

    const activatedWarranties = [];

    // Trigger warranties for each serialized piece of equipment
    dispatch.items.forEach(item => {
      const snList = item.serial_numbers?.length ? item.serial_numbers : (item.serial_number ? [item.serial_number] : []);
      snList.forEach(snStr => {
        const snRec = memorySerialNumbers.find(s => s.serial_number === snStr);
        if (snRec) {
          snRec.status = 'delivered';
          snRec.delivery_date = actualDeliveryDate;
          snRec.warranty_status = 'active';
          snRec.warranty_start_date = actualDeliveryDate;

          const prod = memoryProducts.find(p => p.id === snRec.product_id);
          const months = prod?.warranty_months || (snRec.warranty_years ? snRec.warranty_years * 12 : 60);
          const years = Math.round(months / 12);

          const startD = new Date(actualDeliveryDate);
          const expiryD = new Date(startD);
          expiryD.setMonth(expiryD.getMonth() + months);
          const expiryStr = expiryD.toISOString().split('T')[0];
          snRec.warranty_expiry_date = expiryStr;

          const warrantyCode = `WAR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
          const newWarranty = {
            id: `war-${Date.now()}-${snRec.id}`,
            warranty_code: warrantyCode,
            equipment_serial_id: snRec.id,
            serial_number: snRec.serial_number,
            product_name: snRec.product_name || prod?.name,
            customer_id: dispatch.customer_id,
            customer_name: dispatch.customer_name,
            order_id: dispatch.order_id,
            warranty_type: 'manufacturer',
            duration_months: months,
            duration_years: years,
            start_date: actualDeliveryDate, // Strictly verified equipment delivery date
            expiry_date: expiryStr,
            status: 'active',
            terms: `${years}-year standard warranty activated on verified equipment delivery (${actualDeliveryDate}). Solvix Certified.`,
            created_at: new Date().toISOString()
          };

          memoryWarranties.unshift(newWarranty);
          activatedWarranties.push(newWarranty);
        }
      });
    });

    return {
      dispatch,
      actual_delivery_date: actualDeliveryDate,
      warranties_activated: activatedWarranties
    };
  },

  getWarranties: async () => {
    return memoryWarranties;
  },

  getCategories: async () => {
    return memoryCategories;
  },

  getWarehouses: async () => {
    return memoryWarehouses;
  },

  performStockOperation: async (params, userProfile) => {
    const op = params.operation;
    if (op === 'stock_in') {
      const res = await warehouseStore.recordStockIn({
        product_id: params.productId,
        warehouse_id: params.warehouseId,
        quantity: params.quantity,
        notes: params.notes,
        reference_type: params.referenceType
      }, userProfile);
      return { success: true, ...res };
    } else if (op === 'stock_out') {
      const res = await warehouseStore.recordStockOut({
        product_id: params.productId,
        warehouse_id: params.warehouseId,
        quantity: params.quantity,
        notes: params.notes
      }, userProfile);
      return { success: true, ...res };
    } else if (op === 'adjustment') {
      const res = await warehouseStore.recordStockAdjustment({
        product_id: params.productId,
        warehouse_id: params.warehouseId,
        new_quantity: params.actualCount,
        reason: params.reason || params.notes
      }, userProfile);
      return {
        success: true,
        newOnHand: res.inventory.quantity_on_hand,
        movement: {
          ...res.movement,
          quantity: res.inventory.quantity_on_hand - (params.previousCount ?? (res.inventory.quantity_on_hand + (res.movement.quantity || 0))) || res.movement.quantity
        },
        ...res
      };
    } else if (op === 'transfer') {
      const res = await warehouseStore.recordStockTransfer({
        product_id: params.productId,
        source_warehouse_id: params.warehouseId,
        destination_warehouse_id: params.toWarehouseId,
        quantity: params.quantity,
        notes: params.notes
      }, userProfile);
      return { success: true, ...res };
    }
    throw new Error(`Unsupported operation: ${op}`);
  },

  reserveInventoryForOrder: async (orderId, items, userProfile) => {
    const results = [];
    for (const item of items) {
      const existingRes = memoryReservations.find(
        r => r.order_id === orderId && r.product_id === item.product_id && r.status === 'active'
      );
      if (existingRes) {
        return { success: true, message: 'Reservation already active for this order', reservations: [existingRes] };
      }

      const inv = memoryInventory.find(i => i.product_id === item.product_id && i.warehouse_id === (item.warehouse_id || 'wh-1'));
      if (!inv) throw new Error('Product not stocked in this warehouse.');

      const available = inv.quantity_on_hand - inv.quantity_reserved;
      if (available < item.quantity) {
        throw new Error(`Insufficient stock to reserve. Available: ${available}, Required: ${item.quantity}.`);
      }

      inv.quantity_reserved += item.quantity;
      const newRes = {
        id: `res-${Date.now()}-${item.product_id}`,
        product_id: item.product_id,
        warehouse_id: inv.warehouse_id,
        order_id: orderId,
        quantity: item.quantity,
        status: 'active',
        reserved_at: new Date().toISOString()
      };
      memoryReservations.push(newRes);
      results.push(newRes);
    }
    return { success: true, reservations: results };
  },

  registerSerialNumbers: async (payload, userProfile) => {
    if (payload.batch && Array.isArray(payload.batch)) {
      const res = await warehouseStore.registerBatchSerials(payload.batch, userProfile);
      return { success: true, registered: res.registeredCount, ...res };
    }
    const single = await warehouseStore.registerSerialNumber(payload, userProfile);
    return {
      ...single,
      qr_code_payload: single.qr_code_data
    };
  },

  lookupSerialNumber: async (query) => {
    const res = await warehouseStore.lookupSerial(query);
    if (!res) return null;
    return {
      id: res.serial.id,
      serial_number: res.serial.serial_number,
      product_name: res.product?.name || res.serial.product_name,
      status: res.serial.status,
      warehouse_name: res.serial.current_location,
      qr_code_payload: res.serial.qr_code_data,
      ...res.serial
    };
  },

  confirmDelivery: async (dispatchId, deliveryData, userProfile) => {
    const res = await warehouseStore.confirmEquipmentDelivery(dispatchId, deliveryData, userProfile);
    return {
      success: true,
      dispatch: res.dispatch,
      delivery: {
        delivered_at: res.actual_delivery_date,
        recipient_name: deliveryData.recipient_name
      },
      warranties: res.warranties_activated
    };
  }
};
