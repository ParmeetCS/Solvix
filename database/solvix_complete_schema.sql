-- ============================================================================
-- SOLVIX — Solar Installation Management Platform
-- Complete initial database schema (single executable SQL file)
--
-- Designed for a single execution in a fresh Supabase PostgreSQL project
-- via the Supabase SQL Editor.
--
-- WARNING: This script is intended for a FRESH project. It does NOT drop
-- existing tables or data. Do not blindly rerun it on a populated database.
-- ============================================================================

--------------------------------------------------------------------------------
-- 1. PostgreSQL extensions
--------------------------------------------------------------------------------
-- gen_random_uuid() is provided by pgcrypto (bundled with Supabase Postgres).
create extension if not exists pgcrypto;

--------------------------------------------------------------------------------
-- 2. Enum / CHECK-constrained status types
--------------------------------------------------------------------------------
-- We use CHECK constraints rather than CREATE TYPE enums so status values can
-- evolve without schema migrations and remain portable across Supabase versions.

--------------------------------------------------------------------------------
-- Section A — User and Department Management
--------------------------------------------------------------------------------

create table if not exists departments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  code text unique not null,
  description text,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists permissions (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  code text unique not null,
  resource text not null,
  action text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists role_permissions (
  role_id uuid not null references roles(id) on delete cascade,
  permission_id uuid not null references permissions(id) on delete cascade,
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users(id),
  primary key (role_id, permission_id)
);

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  -- Linked to Supabase Auth. Do NOT store passwords here.
  auth_user_id uuid unique not null references auth.users(id) on delete cascade,
  email text,
  full_name text,
  -- Department requested by employee during access request (Section D).
  -- Null for customers; set to employee's requested department during registration.
  department_requested text,
  phone text,
  avatar_url text,
  role_id uuid references roles(id) on delete set null,
  department_id uuid references departments(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists employee_departments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references profiles(id) on delete cascade,
  department_id uuid not null references departments(id) on delete cascade,
  is_primary boolean not null default false,
  is_approved boolean not null default false,
  approved_by uuid references profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, department_id)
);

-- Indexes for Section A
create index if not exists idx_profiles_auth_user_id on profiles(auth_user_id);
create index if not exists idx_profiles_role_id on profiles(role_id);
create index if not exists idx_profiles_department_id on profiles(department_id);
create index if not exists idx_employee_departments_employee on employee_departments(employee_id);
create index if not exists idx_employee_departments_department on employee_departments(department_id);

--------------------------------------------------------------------------------
-- Section B — Customer and Lead Management
--------------------------------------------------------------------------------

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  customer_code text unique not null,
  profile_id uuid references profiles(id) on delete set null,
  company_name text,
  contact_name text not null,
  email text not null,
  phone text,
  customer_type text not null default 'residential'
    check (customer_type in ('residential','commercial','industrial')),
  status text not null default 'active'
    check (status in ('active','inactive','suspended','archived')),
  tax_id text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references profiles(id) on delete set null,
  updated_by uuid references profiles(id) on delete set null
);

create table if not exists customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  label text not null default 'Primary',
  street text not null,
  city text not null,
  state text,
  postal_code text,
  country text not null default 'IN',
  latitude double precision,
  longitude double precision,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  lead_code text unique not null,
  customer_id uuid references customers(id) on delete set null,
  source text not null default 'website'
    check (source in ('whatsapp','phone','website','walkin','referral','other')),
  status text not null default 'new'
    check (status in ('new','contacted','qualified','proposal_sent','negotiation','converted','lost','disqualified')),
  estimated_value numeric(12,2) default 0,
  expected_close_date date,
  assigned_to uuid references profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references profiles(id) on delete set null,
  updated_by uuid references profiles(id) on delete set null
);

create table if not exists lead_assignments (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  assigned_to uuid not null references profiles(id) on delete cascade,
  assigned_by uuid references profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  is_active boolean not null default true,
  notes text
);

create table if not exists follow_ups (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  scheduled_at timestamptz not null,
  completed_at timestamptz,
  status text not null default 'pending'
    check (status in ('pending','completed','missed','rescheduled')),
  outcome text,
  notes text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists customer_interactions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete set null,
  lead_id uuid references leads(id) on delete set null,
  interaction_type text not null default 'call'
    check (interaction_type in ('call','email','meeting','site_visit','whatsapp','other')),
  subject text not null,
  summary text,
  occurred_at timestamptz not null default now(),
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Indexes for Section B
create index if not exists idx_customers_profile_id on customers(profile_id);
create index if not exists idx_customer_addresses_customer on customer_addresses(customer_id);
create index if not exists idx_leads_customer_id on leads(customer_id);
create index if not exists idx_leads_status on leads(status);
create index if not exists idx_leads_assigned_to on leads(assigned_to);
create index if not exists idx_lead_assignments_lead on lead_assignments(lead_id);
create index if not exists idx_follow_ups_lead on follow_ups(lead_id);
create index if not exists idx_customer_interactions_customer on customer_interactions(customer_id);
create index if not exists idx_customer_interactions_lead on customer_interactions(lead_id);

--------------------------------------------------------------------------------
-- Section C — Site Survey and Feasibility
--------------------------------------------------------------------------------

create table if not exists site_surveys (
  id uuid primary key default gen_random_uuid(),
  survey_code text unique not null,
  lead_id uuid not null references leads(id) on delete cascade,
  customer_id uuid references customers(id) on delete cascade,
  roof_area_sqm numeric(10,2),
  roof_direction text
    check (roof_direction in ('north','south','east','west','flat','mixed')),
  roof_tilt_degrees numeric(5,2),
  shading_info text,
  cable_distance_m numeric(10,2),
  site_observations text,
  feasibility_status text not null default 'pending'
    check (feasibility_status in ('pending','feasible','not_feasible','requires_review','approved','rejected')),
  survey_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references profiles(id) on delete set null,
  updated_by uuid references profiles(id) on delete set null
);

create table if not exists survey_assignments (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references site_surveys(id) on delete cascade,
  assigned_to uuid not null references profiles(id) on delete cascade,
  assigned_by uuid references profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table if not exists survey_photos (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references site_surveys(id) on delete cascade,
  storage_path text not null,
  caption text,
  photo_type text not null default 'site'
    check (photo_type in ('site','roof','shading','electrical','other')),
  uploaded_at timestamptz not null default now(),
  uploaded_by uuid references profiles(id) on delete set null
);

create table if not exists survey_reports (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references site_surveys(id) on delete cascade,
  report_text text,
  recommended_capacity_kw numeric(6,2),
  estimated_cost numeric(12,2),
  storage_path text,
  submitted_at timestamptz,
  submitted_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists survey_approvals (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references site_surveys(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending','approved','rejected','revision_requested')),
  reviewed_by uuid references profiles(id) on delete set null,
  reviewed_at timestamptz,
  comments text,
  created_at timestamptz not null default now()
);

-- Indexes for Section C
create index if not exists idx_site_surveys_lead on site_surveys(lead_id);
create index if not exists idx_site_surveys_customer on site_surveys(customer_id);
create index if not exists idx_site_surveys_feasibility on site_surveys(feasibility_status);
create index if not exists idx_survey_photos_survey on survey_photos(survey_id);
create index if not exists idx_survey_reports_survey on survey_reports(survey_id);
create index if not exists idx_survey_approvals_survey on survey_approvals(survey_id);

-- Product definitions required by quotations and inventory
create table if not exists product_categories (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  code text unique not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  sku text unique not null,
  name text not null,
  category_id uuid references product_categories(id) on delete set null,
  description text,
  unit text not null default 'piece'
    check (unit in ('piece','kw','kva','meter','set','kg','box')),
  base_price numeric(12,2) not null default 0,
  warranty_years integer default 0,
  min_stock_level numeric(10,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_category on products(category_id);

--------------------------------------------------------------------------------
-- Section D — Quotation and Order Management
--------------------------------------------------------------------------------

create table if not exists quotations (
  id uuid primary key default gen_random_uuid(),
  quotation_code text unique not null,
  lead_id uuid not null references leads(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  site_survey_id uuid references site_surveys(id) on delete set null,
  system_type text not null
    check (system_type in ('on-grid','off-grid','hybrid')),
  system_capacity_kw numeric(6,2) not null,
  subtotal numeric(12,2) not null default 0,
  tax_amount numeric(12,2) not null default 0,
  discount_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  validity_date date,
  status text not null default 'draft'
    check (status in ('draft','sent','under_review','approved','rejected','expired','converted')),
  customer_approved_at timestamptz,
  customer_approved_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references profiles(id) on delete set null,
  updated_by uuid references profiles(id) on delete set null
);

create table if not exists quotation_items (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references quotations(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  line_item text not null,
  quantity numeric(10,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  total_price numeric(12,2) not null default 0,
  notes text
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_code text unique not null,
  quotation_id uuid not null references quotations(id) on delete restrict,
  customer_id uuid not null references customers(id) on delete restrict,
  status text not null default 'pending'
    check (status in ('pending','confirmed','in_production','ready_for_install','installing','completed','cancelled','refunded')),
  total_amount numeric(12,2) not null default 0,
  advance_paid numeric(12,2) not null default 0,
  balance_due numeric(12,2) not null default 0,
  scheduled_install_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references profiles(id) on delete set null,
  updated_by uuid references profiles(id) on delete set null
);

create table if not exists order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  previous_status text,
  new_status text not null,
  changed_by uuid references profiles(id) on delete set null,
  changed_at timestamptz not null default now(),
  notes text
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  payment_code text unique not null,
  order_id uuid not null references orders(id) on delete restrict,
  customer_id uuid not null references customers(id) on delete restrict,
  amount numeric(12,2) not null,
  payment_type text not null default 'advance'
    check (payment_type in ('advance','partial','full','refund')),
  payment_method text not null default 'other'
    check (payment_method in ('cash','cheque','bank_transfer','upi','card','finance','other')),
  transaction_reference text,
  paid_at timestamptz not null default now(),
  recorded_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Indexes for Section D
create index if not exists idx_quotations_lead on quotations(lead_id);
create index if not exists idx_quotations_customer on quotations(customer_id);
create index if not exists idx_quotations_status on quotations(status);
create index if not exists idx_quotation_items_quotation on quotation_items(quotation_id);
create index if not exists idx_quotation_items_product on quotation_items(product_id);
create index if not exists idx_orders_quotation on orders(quotation_id);
create index if not exists idx_orders_customer on orders(customer_id);
create index if not exists idx_orders_status on orders(status);
create index if not exists idx_order_status_history_order on order_status_history(order_id);
create index if not exists idx_payments_order on payments(order_id);
create index if not exists idx_payments_customer on payments(customer_id);

--------------------------------------------------------------------------------
-- Section E — Product and Warehouse Management
--------------------------------------------------------------------------------

create table if not exists warehouses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique not null,
  address text,
  city text,
  manager_id uuid references profiles(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists inventory (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  warehouse_id uuid not null references warehouses(id) on delete cascade,
  quantity_on_hand numeric(10,2) not null default 0,
  quantity_reserved numeric(10,2) not null default 0,
  last_restocked_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (product_id, warehouse_id)
);

create table if not exists stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete restrict,
  warehouse_id uuid not null references warehouses(id) on delete restrict,
  movement_type text not null
    check (movement_type in ('stock_in','stock_out','reservation','release','adjustment','damage','return')),
  quantity numeric(10,2) not null,
  reference_type text,
  reference_id uuid,
  notes text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists inventory_reservations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete restrict,
  warehouse_id uuid not null references warehouses(id) on delete restrict,
  order_id uuid references orders(id) on delete set null,
  quantity numeric(10,2) not null,
  reserved_at timestamptz not null default now(),
  released_at timestamptz,
  status text not null default 'active'
    check (status in ('active','fulfilled','released','expired')),
  created_by uuid references profiles(id) on delete set null
);

create table if not exists purchase_orders (
  id uuid primary key default gen_random_uuid(),
  po_code text unique not null,
  supplier_name text not null,
  status text not null default 'draft'
    check (status in ('draft','sent','approved','received','partially_received','cancelled')),
  total_amount numeric(12,2) not null default 0,
  expected_date date,
  received_date date,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references purchase_orders(id) on delete cascade,
  product_id uuid not null references products(id) on delete restrict,
  quantity_ordered numeric(10,2) not null,
  quantity_received numeric(10,2) not null default 0,
  unit_price numeric(12,2) not null default 0,
  total_price numeric(12,2) not null default 0
);

-- Indexes for Section E
create index if not exists idx_inventory_product on inventory(product_id);
create index if not exists idx_inventory_warehouse on inventory(warehouse_id);
create index if not exists idx_stock_movements_product on stock_movements(product_id);
create index if not exists idx_stock_movements_warehouse on stock_movements(warehouse_id);
create index if not exists idx_inventory_reservations_order on inventory_reservations(order_id);
create index if not exists idx_purchase_order_items_po on purchase_order_items(purchase_order_id);

--------------------------------------------------------------------------------
-- Section F — Equipment Serial Number and Dispatch Management
--------------------------------------------------------------------------------

create table if not exists equipment_serial_numbers (
  id uuid primary key default gen_random_uuid(),
  serial_number text unique not null,
  product_id uuid not null references products(id) on delete restrict,
  status text not null default 'in_stock'
    check (status in ('in_stock','reserved','dispatched','delivered','installed','warranty_replacement','retired')),
  warranty_start_date date,
  warranty_expiry_date date,
  current_location text,
  customer_id uuid references customers(id) on delete set null,
  order_id uuid references orders(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists dispatches (
  id uuid primary key default gen_random_uuid(),
  dispatch_code text unique not null,
  order_id uuid not null references orders(id) on delete restrict,
  warehouse_id uuid not null references warehouses(id) on delete restrict,
  dispatched_by uuid references profiles(id) on delete set null,
  dispatched_at timestamptz,
  delivery_date date,
  status text not null default 'prepared'
    check (status in ('prepared','in_transit','delivered','returned','cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references profiles(id) on delete set null
);

create table if not exists dispatch_items (
  id uuid primary key default gen_random_uuid(),
  dispatch_id uuid not null references dispatches(id) on delete cascade,
  equipment_serial_id uuid not null references equipment_serial_numbers(id) on delete restrict,
  quantity integer not null default 1,
  scanned_at timestamptz,
  scanned_by uuid references profiles(id) on delete set null
);

create table if not exists equipment_deliveries (
  id uuid primary key default gen_random_uuid(),
  dispatch_id uuid not null references dispatches(id) on delete restrict,
  customer_id uuid not null references customers(id) on delete restrict,
  delivery_person_id uuid references profiles(id) on delete set null,
  delivered_at timestamptz not null default now(),
  proof_of_delivery_storage_path text,
  customer_signature_storage_path text,
  notes text
);

-- Indexes for Section F
create index if not exists idx_equipment_serial_numbers_product on equipment_serial_numbers(product_id);
create index if not exists idx_equipment_serial_numbers_status on equipment_serial_numbers(status);
create index if not exists idx_equipment_serial_numbers_order on equipment_serial_numbers(order_id);
create index if not exists idx_equipment_serial_numbers_customer on equipment_serial_numbers(customer_id);
create index if not exists idx_dispatches_order on dispatches(order_id);
create index if not exists idx_dispatch_items_dispatch on dispatch_items(dispatch_id);
create index if not exists idx_dispatch_items_serial on dispatch_items(equipment_serial_id);
create index if not exists idx_equipment_deliveries_dispatch on equipment_deliveries(dispatch_id);

--------------------------------------------------------------------------------
-- Section G — Technician and Installation Management
--------------------------------------------------------------------------------

create table if not exists technicians (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  employee_code text unique not null,
  skills text[],
  certifications text[],
  max_daily_jobs integer not null default 1,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists installations (
  id uuid primary key default gen_random_uuid(),
  installation_code text unique not null,
  order_id uuid not null references orders(id) on delete restrict,
  customer_id uuid not null references customers(id) on delete restrict,
  site_survey_id uuid references site_surveys(id) on delete set null,
  scheduled_start timestamptz,
  actual_start timestamptz,
  actual_end timestamptz,
  status text not null default 'scheduled'
    check (status in ('scheduled','in_progress','on_hold','completed','failed','cancelled')),
  system_capacity_kw numeric(6,2),
  earthing_resistance_ohm numeric(6,2),
  insulation_test_result text,
  testing_notes text,
  completion_report text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references profiles(id) on delete set null,
  updated_by uuid references profiles(id) on delete set null
);

create table if not exists technician_assignments (
  id uuid primary key default gen_random_uuid(),
  technician_id uuid not null references technicians(id) on delete cascade,
  installation_id uuid references installations(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  unassigned_at timestamptz,
  role_on_job text not null default 'technician'
    check (role_on_job in ('technician','lead_technician','helper','supervisor')),
  is_primary boolean not null default false
);

create table if not exists installation_tasks (
  id uuid primary key default gen_random_uuid(),
  installation_id uuid not null references installations(id) on delete cascade,
  task_name text not null,
  is_required boolean not null default true,
  is_completed boolean not null default false,
  completed_at timestamptz,
  completed_by uuid references profiles(id) on delete set null,
  notes text
);

create table if not exists installation_photos (
  id uuid primary key default gen_random_uuid(),
  installation_id uuid not null references installations(id) on delete cascade,
  storage_path text not null,
  caption text,
  photo_type text not null default 'progress'
    check (photo_type in ('pre_install','progress','completion','earthing','wiring','other')),
  uploaded_at timestamptz not null default now(),
  uploaded_by uuid references profiles(id) on delete set null
);

create table if not exists installation_reports (
  id uuid primary key default gen_random_uuid(),
  installation_id uuid not null references installations(id) on delete cascade,
  report_text text,
  submitted_at timestamptz,
  submitted_by uuid references profiles(id) on delete set null,
  storage_path text,
  created_at timestamptz not null default now()
);

create table if not exists customer_signatures (
  id uuid primary key default gen_random_uuid(),
  installation_id uuid not null references installations(id) on delete cascade,
  customer_name text not null,
  signature_storage_path text not null,
  signed_at timestamptz not null default now(),
  consent_text text,
  created_at timestamptz not null default now()
);

-- Indexes for Section G
create index if not exists idx_technicians_profile on technicians(profile_id);
create index if not exists idx_technician_assignments_technician on technician_assignments(technician_id);
create index if not exists idx_technician_assignments_installation on technician_assignments(installation_id);
create index if not exists idx_installations_order on installations(order_id);
create index if not exists idx_installations_customer on installations(customer_id);
create index if not exists idx_installations_status on installations(status);
create index if not exists idx_installation_tasks_installation on installation_tasks(installation_id);
create index if not exists idx_installation_photos_installation on installation_photos(installation_id);
create index if not exists idx_installation_reports_installation on installation_reports(installation_id);
create index if not exists idx_customer_signatures_installation on customer_signatures(installation_id);

--------------------------------------------------------------------------------
-- Section H — Warranty Management
--------------------------------------------------------------------------------

-- Warranty clock starts from equipment DELIVERY milestone (not installation).
create table if not exists warranties (
  id uuid primary key default gen_random_uuid(),
  warranty_code text unique not null,
  equipment_serial_id uuid not null references equipment_serial_numbers(id) on delete restrict,
  customer_id uuid not null references customers(id) on delete restrict,
  order_id uuid references orders(id) on delete set null,
  warranty_type text not null default 'manufacturer'
    check (warranty_type in ('manufacturer','installer','extended')),
  duration_years numeric(5,2) not null,
  start_date date not null,
  expiry_date date not null,
  status text not null default 'active'
    check (status in ('active','expired','voided','claimed')),
  terms text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists warranty_claims (
  id uuid primary key default gen_random_uuid(),
  claim_code text unique not null,
  warranty_id uuid not null references warranties(id) on delete restrict,
  customer_id uuid not null references customers(id) on delete restrict,
  claim_type text not null default 'repair'
    check (claim_type in ('repair','replacement')),
  description text not null,
  status text not null default 'submitted'
    check (status in ('submitted','under_review','approved','rejected','completed')),
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references profiles(id) on delete set null,
  reviewed_at timestamptz,
  resolution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists warranty_history (
  id uuid primary key default gen_random_uuid(),
  warranty_id uuid not null references warranties(id) on delete cascade,
  claim_id uuid references warranty_claims(id) on delete set null,
  action text not null,
  performed_by uuid references profiles(id) on delete set null,
  performed_at timestamptz not null default now(),
  notes text
);

-- Indexes for Section H
create index if not exists idx_warranties_equipment on warranties(equipment_serial_id);
create index if not exists idx_warranties_customer on warranties(customer_id);
create index if not exists idx_warranties_status on warranties(status);
create index if not exists idx_warranty_claims_warranty on warranty_claims(warranty_id);
create index if not exists idx_warranty_history_warranty on warranty_history(warranty_id);

--------------------------------------------------------------------------------
-- Section I — Customer Support and Service Management
--------------------------------------------------------------------------------

create table if not exists service_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_code text unique not null,
  customer_id uuid not null references customers(id) on delete restrict,
  installation_id uuid references installations(id) on delete set null,
  warranty_claim_id uuid references warranty_claims(id) on delete set null,
  subject text not null,
  description text not null,
  priority text not null default 'medium'
    check (priority in ('low','medium','high','critical')),
  status text not null default 'open'
    check (status in ('open','assigned','in_progress','waiting_for_parts','resolved','closed')),
  assigned_to uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  closed_at timestamptz
);

create table if not exists service_ticket_updates (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references service_tickets(id) on delete cascade,
  update_text text not null,
  status text,
  updated_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists repair_assignments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references service_tickets(id) on delete cascade,
  technician_id uuid not null references technicians(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  completed_at timestamptz,
  repair_cost numeric(12,2) default 0,
  is_warranty_covered boolean not null default false,
  notes text
);

create table if not exists replacement_records (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references service_tickets(id) on delete cascade,
  old_serial_id uuid references equipment_serial_numbers(id) on delete set null,
  new_serial_id uuid references equipment_serial_numbers(id) on delete set null,
  replacement_reason text not null,
  replaced_at timestamptz not null default now(),
  replaced_by uuid references profiles(id) on delete set null
);

create table if not exists customer_feedback (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references service_tickets(id) on delete set null,
  installation_id uuid references installations(id) on delete set null,
  customer_id uuid not null references customers(id) on delete restrict,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text,
  submitted_at timestamptz not null default now()
);

-- Indexes for Section I
create index if not exists idx_service_tickets_customer on service_tickets(customer_id);
create index if not exists idx_service_tickets_status on service_tickets(status);
create index if not exists idx_service_tickets_assigned_to on service_tickets(assigned_to);
create index if not exists idx_service_ticket_updates_ticket on service_ticket_updates(ticket_id);
create index if not exists idx_repair_assignments_ticket on repair_assignments(ticket_id);
create index if not exists idx_replacement_records_ticket on replacement_records(ticket_id);
create index if not exists idx_customer_feedback_customer on customer_feedback(customer_id);

--------------------------------------------------------------------------------
-- Section J — Accounts and Finance
--------------------------------------------------------------------------------

-- Totals are calculated from transaction records rather than duplicated.
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_code text unique not null,
  order_id uuid references orders(id) on delete restrict,
  customer_id uuid not null references customers(id) on delete restrict,
  status text not null default 'draft'
    check (status in ('draft','sent','paid','partially_paid','overdue','cancelled','refunded')),
  issue_date date not null,
  due_date date,
  currency text not null default 'INR',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references profiles(id) on delete set null
);

create table if not exists invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  line_item text not null,
  quantity numeric(10,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  tax_amount numeric(12,2) not null default 0,
  total_price numeric(12,2) not null default 0
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  expense_code text unique not null,
  category text not null
    check (category in ('equipment_purchase','labour','logistics','utilities','marketing','other')),
  description text not null,
  amount numeric(12,2) not null,
  incurred_date date not null,
  project_id uuid,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists project_costs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete restrict,
  cost_category text not null
    check (cost_category in ('equipment','labour','logistics','permits','other')),
  amount numeric(12,2) not null,
  incurred_date date not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists technician_payments (
  id uuid primary key default gen_random_uuid(),
  technician_id uuid not null references technicians(id) on delete restrict,
  order_id uuid references orders(id) on delete set null,
  amount numeric(12,2) not null,
  payment_type text not null default 'labour'
    check (payment_type in ('labour','bonus','advance','reimbursement')),
  paid_at timestamptz not null default now(),
  payment_method text not null default 'bank_transfer'
    check (payment_method in ('cash','bank_transfer','upi','cheque')),
  reference text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists financial_transactions (
  id uuid primary key default gen_random_uuid(),
  transaction_code text unique not null,
  transaction_type text not null
    check (transaction_type in ('payment_received','expense','technician_payment','refund','adjustment')),
  amount numeric(12,2) not null,
  currency text not null default 'INR',
  reference_type text,
  reference_id uuid,
  transaction_date timestamptz not null default now(),
  recorded_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Indexes for Section J
create index if not exists idx_invoices_customer on invoices(customer_id);
create index if not exists idx_invoices_order on invoices(order_id);
create index if not exists idx_invoices_status on invoices(status);
create index if not exists idx_invoice_items_invoice on invoice_items(invoice_id);
create index if not exists idx_expenses_project on expenses(project_id);
create index if not exists idx_project_costs_order on project_costs(order_id);
create index if not exists idx_technician_payments_technician on technician_payments(technician_id);
create index if not exists idx_financial_transactions_type on financial_transactions(transaction_type);

--------------------------------------------------------------------------------
-- Section K — Subsidy and Documentation
--------------------------------------------------------------------------------

create table if not exists subsidy_applications (
  id uuid primary key default gen_random_uuid(),
  application_code text unique not null,
  customer_id uuid not null references customers(id) on delete restrict,
  order_id uuid references orders(id) on delete set null,
  subsidy_program text not null,
  amount_applied numeric(12,2) not null,
  amount_approved numeric(12,2),
  status text not null default 'draft'
    check (status in ('draft','submitted','under_review','approved','rejected','disbursed')),
  submitted_at timestamptz,
  approved_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists subsidy_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references subsidy_applications(id) on delete cascade,
  document_type text not null,
  storage_path text not null,
  uploaded_at timestamptz not null default now(),
  uploaded_by uuid references profiles(id) on delete set null
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  document_code text unique not null,
  customer_id uuid references customers(id) on delete set null,
  order_id uuid references orders(id) on delete set null,
  installation_id uuid references installations(id) on delete set null,
  document_type text not null,
  title text not null,
  storage_path text not null,
  mime_type text,
  file_size_bytes bigint,
  uploaded_at timestamptz not null default now(),
  uploaded_by uuid references profiles(id) on delete set null
);

create table if not exists document_verification_history (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending','verified','rejected','requires_resubmission')),
  verified_by uuid references profiles(id) on delete set null,
  verified_at timestamptz,
  comments text,
  created_at timestamptz not null default now()
);

-- Indexes for Section K
create index if not exists idx_subsidy_applications_customer on subsidy_applications(customer_id);
create index if not exists idx_subsidy_applications_status on subsidy_applications(status);
create index if not exists idx_subsidy_documents_application on subsidy_documents(application_id);
create index if not exists idx_documents_customer on documents(customer_id);
create index if not exists idx_documents_order on documents(order_id);
create index if not exists idx_document_verification_history_document on document_verification_history(document_id);

--------------------------------------------------------------------------------
-- Section L — Notifications and Activity Tracking
--------------------------------------------------------------------------------

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  body text,
  type text not null default 'info'
    check (type in ('info','success','warning','error','assignment','approval','reminder')),
  read boolean not null default false,
  read_at timestamptz,
  link text,
  created_at timestamptz not null default now()
);

create table if not exists activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb,
  department_id uuid references departments(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Indexes for Section L
create index if not exists idx_notifications_recipient on notifications(recipient_id);
create index if not exists idx_notifications_read on notifications(read);
create index if not exists idx_activity_logs_actor on activity_logs(actor_id);
create index if not exists idx_activity_logs_entity on activity_logs(entity_type, entity_id);
create index if not exists idx_activity_logs_created_at on activity_logs(created_at);

--------------------------------------------------------------------------------
-- 3. updated_at triggers (function + per-table trigger)
--------------------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists _audit_tables (
  table_name text primary key
);

do $$
declare
  rec record;
begin
  for rec in (
    select c.table_name
    from information_schema.columns c
    join information_schema.tables t
      on t.table_name = c.table_name
     and t.table_schema = c.table_schema
    where c.table_schema = 'public'
      and c.column_name = 'updated_at'
      and t.table_type = 'BASE TABLE'
      and t.table_name not in ('_audit_tables')
  )
  loop
    execute format($f$
      drop trigger if exists trg_%1$I_updated_at on %1$I;
      create trigger trg_%1$I_updated_at
      before update on %1$I
      for each row
      execute function set_updated_at();
    $f$, rec.table_name);
  end loop;
end $$;

--------------------------------------------------------------------------------
-- 4. Row Level Security (RLS)
--------------------------------------------------------------------------------

-- Helper function: current user's profile id from auth.uid()
create or replace function current_profile_id()
returns uuid
language plpgsql
as $$
declare
  pid uuid;
begin
  select id into pid from profiles where auth_user_id = auth.uid();
  return pid;
end;
$$;

-- Helper function: is the current user an admin?
create or replace function is_admin()
returns boolean
language plpgsql
as $$
declare
  r text;
begin
  select r.code into r
  from profiles p
  join roles r on p.role_id = r.id
  where p.auth_user_id = auth.uid() and p.is_active = true;
  return r = 'admin';
end;
$$;

-- Helper function: departments the current employee belongs to
create or replace function current_user_department_ids()
returns uuid[]
language plpgsql
as $$
declare
  ids uuid[];
begin
  select array_agg(department_id) into ids
  from employee_departments ed
  join profiles p on p.id = ed.employee_id
  where p.auth_user_id = auth.uid()
    and ed.is_approved = true;
  return coalesce(ids, '{}');
end;
$$;

--------------------------------------------------------------------------------
-- Section A RLS
--------------------------------------------------------------------------------
alter table departments enable row level security;
alter table roles enable row level security;
alter table permissions enable row level security;
alter table role_permissions enable row level security;
alter table profiles enable row level security;
alter table employee_departments enable row level security;

-- Departments: authenticated users can read; only admins write
create policy departments_select on departments
  for select using (auth.uid() is not null);
create policy departments_admin_write on departments
  for all using (is_admin()) with check (is_admin());

-- Roles: read for all authenticated; write for admins
create policy roles_select on roles for select using (auth.uid() is not null);
create policy roles_admin_write on roles for all using (is_admin()) with check (is_admin());

-- Permissions: read for all authenticated; write for admins
create policy permissions_select on permissions for select using (auth.uid() is not null);
create policy permissions_admin_write on permissions for all using (is_admin()) with check (is_admin());

-- Role permissions: read for all authenticated; write for admins
create policy role_permissions_select on role_permissions for select using (auth.uid() is not null);
create policy role_permissions_admin_write on role_permissions for all using (is_admin()) with check (is_admin());

-- Profiles: users read their own; admins read/write all
create policy profiles_own on profiles
  for select using (auth_user_id = auth.uid());
create policy profiles_admin_all on profiles for all using (is_admin()) with check (is_admin());

-- Employee departments: read own assignments; admins all
create policy employee_departments_own on employee_departments
  for select using (
    employee_id = current_profile_id() or is_admin()
  );
create policy employee_departments_admin_write on employee_departments
  for all using (is_admin()) with check (is_admin());

--------------------------------------------------------------------------------
-- Section B RLS
--------------------------------------------------------------------------------
alter table customers enable row level security;
alter table customer_addresses enable row level security;
alter table leads enable row level security;
alter table lead_assignments enable row level security;
alter table follow_ups enable row level security;
alter table customer_interactions enable row level security;

create policy customers_own_department on customers
  for select using (
    exists (
      select 1 from profiles p
      where p.auth_user_id = auth.uid()
        and p.id = customers.created_by
    )
    or is_admin()
  );
create policy customers_admin_write on customers for all using (is_admin()) with check (is_admin());

create policy customer_addresses_own on customer_addresses
  for select using (
    exists (select 1 from customers c where c.id = customer_addresses.customer_id
      and (c.created_by = current_profile_id() or is_admin()))
  );
create policy customer_addresses_admin_write on customer_addresses for all using (is_admin()) with check (is_admin());

create policy leads_own on leads for select using (
  assigned_to = current_profile_id()
  or created_by = current_profile_id()
  or is_admin()
);
create policy leads_admin_write on leads for all using (is_admin()) with check (is_admin());

create policy lead_assignments_own on lead_assignments for select using (
  assigned_to = current_profile_id() or is_admin()
);
create policy lead_assignments_admin_write on lead_assignments for all using (is_admin()) with check (is_admin());

create policy follow_ups_own on follow_ups for select using (
  exists (select 1 from leads l where l.id = follow_ups.lead_id
    and (l.assigned_to = current_profile_id() or l.created_by = current_profile_id() or is_admin()))
);
create policy follow_ups_admin_write on follow_ups for all using (is_admin()) with check (is_admin());

create policy customer_interactions_own on customer_interactions for select using (
  created_by = current_profile_id() or is_admin()
);
create policy customer_interactions_admin_write on customer_interactions for all using (is_admin()) with check (is_admin());

--------------------------------------------------------------------------------
-- Section C RLS
--------------------------------------------------------------------------------
alter table site_surveys enable row level security;
alter table survey_assignments enable row level security;
alter table survey_photos enable row level security;
alter table survey_reports enable row level security;
alter table survey_approvals enable row level security;

create policy site_surveys_own on site_surveys for select using (
  created_by = current_profile_id() or is_admin()
);
create policy site_surveys_admin_write on site_surveys for all using (is_admin()) with check (is_admin());

create policy survey_assignments_own on survey_assignments for select using (
  assigned_to = current_profile_id() or is_admin()
);
create policy survey_assignments_admin_write on survey_assignments for all using (is_admin()) with check (is_admin());

create policy survey_photos_own on survey_photos for select using (
  exists (select 1 from site_surveys s where s.id = survey_photos.survey_id
    and (s.created_by = current_profile_id() or is_admin()))
);
create policy survey_photos_admin_write on survey_photos for all using (is_admin()) with check (is_admin());

create policy survey_reports_own on survey_reports for select using (
  submitted_by = current_profile_id() or is_admin()
);
create policy survey_reports_admin_write on survey_reports for all using (is_admin()) with check (is_admin());

create policy survey_approvals_admin on survey_approvals for all using (is_admin()) with check (is_admin());

--------------------------------------------------------------------------------
-- Section D RLS
--------------------------------------------------------------------------------
alter table quotations enable row level security;
alter table quotation_items enable row level security;
alter table orders enable row level security;
alter table order_status_history enable row level security;
alter table payments enable row level security;

create policy quotations_own on quotations for select using (
  created_by = current_profile_id() or is_admin()
);
create policy quotations_admin_write on quotations for all using (is_admin()) with check (is_admin());

create policy quotation_items_own on quotation_items for select using (
  exists (select 1 from quotations q where q.id = quotation_items.quotation_id
    and (q.created_by = current_profile_id() or is_admin()))
);
create policy quotation_items_admin_write on quotation_items for all using (is_admin()) with check (is_admin());

create policy orders_own on orders for select using (
  created_by = current_profile_id() or is_admin()
);
create policy orders_admin_write on orders for all using (is_admin()) with check (is_admin());

create policy order_status_history_own on order_status_history for select using (
  exists (select 1 from orders o where o.id = order_status_history.order_id
    and (o.created_by = current_profile_id() or is_admin()))
);
create policy order_status_history_admin_write on order_status_history for all using (is_admin()) with check (is_admin());

create policy payments_own on payments for select using (
  recorded_by = current_profile_id() or is_admin()
);
create policy payments_admin_write on payments for all using (is_admin()) with check (is_admin());

--------------------------------------------------------------------------------
-- Section E RLS
--------------------------------------------------------------------------------
alter table product_categories enable row level security;
alter table products enable row level security;
alter table warehouses enable row level security;
alter table inventory enable row level security;
alter table stock_movements enable row level security;
alter table inventory_reservations enable row level security;
alter table purchase_orders enable row level security;
alter table purchase_order_items enable row level security;

-- Product/catalog read for authenticated employees; write for admins
create policy product_categories_select on product_categories for select using (auth.uid() is not null);
create policy product_categories_admin_write on product_categories for all using (is_admin()) with check (is_admin());
create policy products_select on products for select using (auth.uid() is not null);
create policy products_admin_write on products for all using (is_admin()) with check (is_admin());
create policy warehouses_select on warehouses for select using (auth.uid() is not null);
create policy warehouses_admin_write on warehouses for all using (is_admin()) with check (is_admin());

-- Inventory: read for assigned department employees; write for admins
create policy inventory_own_department on inventory for select using (
  exists (
    select 1 from employee_departments ed
    join profiles p on p.id = ed.employee_id
    where p.auth_user_id = auth.uid()
      and ed.is_approved = true
      and ed.department_id = inventory.warehouse_id
  )
  or is_admin()
);
create policy inventory_admin_write on inventory for all using (is_admin()) with check (is_admin());

create policy stock_movements_own on stock_movements for select using (
  created_by = current_profile_id() or is_admin()
);
create policy stock_movements_admin_write on stock_movements for all using (is_admin()) with check (is_admin());

create policy inventory_reservations_own on inventory_reservations for select using (
  created_by = current_profile_id() or is_admin()
);
create policy inventory_reservations_admin_write on inventory_reservations for all using (is_admin()) with check (is_admin());

create policy purchase_orders_select on purchase_orders for select using (auth.uid() is not null);
create policy purchase_orders_admin_write on purchase_orders for all using (is_admin()) with check (is_admin());
create policy purchase_order_items_select on purchase_order_items for select using (auth.uid() is not null);
create policy purchase_order_items_admin_write on purchase_order_items for all using (is_admin()) with check (is_admin());

--------------------------------------------------------------------------------
-- Section F RLS
--------------------------------------------------------------------------------
alter table equipment_serial_numbers enable row level security;
alter table dispatches enable row level security;
alter table dispatch_items enable row level security;
alter table equipment_deliveries enable row level security;

create policy equipment_serial_numbers_own on equipment_serial_numbers for select using (
  customer_id = current_profile_id() or is_admin()
);
create policy equipment_serial_numbers_admin_write on equipment_serial_numbers for all using (is_admin()) with check (is_admin());

create policy dispatches_own on dispatches for select using (
  created_by = current_profile_id() or dispatched_by = current_profile_id() or is_admin()
);
create policy dispatches_admin_write on dispatches for all using (is_admin()) with check (is_admin());

create policy dispatch_items_own on dispatch_items for select using (
  exists (select 1 from dispatches d where d.id = dispatch_items.dispatch_id
    and (d.created_by = current_profile_id() or d.dispatched_by = current_profile_id() or is_admin()))
);
create policy dispatch_items_admin_write on dispatch_items for all using (is_admin()) with check (is_admin());

create policy equipment_deliveries_own on equipment_deliveries for select using (
  customer_id = current_profile_id() or is_admin()
);
create policy equipment_deliveries_admin_write on equipment_deliveries for all using (is_admin()) with check (is_admin());

--------------------------------------------------------------------------------
-- Section G RLS
--------------------------------------------------------------------------------
alter table technicians enable row level security;
alter table technician_assignments enable row level security;
alter table installations enable row level security;
alter table installation_tasks enable row level security;
alter table installation_photos enable row level security;
alter table installation_reports enable row level security;
alter table customer_signatures enable row level security;

create policy technicians_own on technicians for select using (
  profile_id = current_profile_id() or is_admin()
);
create policy technicians_admin_write on technicians for all using (is_admin()) with check (is_admin());

create policy technician_assignments_own on technician_assignments for select using (
  technician_id = (select id from technicians where profile_id = current_profile_id())
  or is_admin()
);
create policy technician_assignments_admin_write on technician_assignments for all using (is_admin()) with check (is_admin());

create policy installations_own on installations for select using (
  created_by = current_profile_id() or is_admin()
);
create policy installations_admin_write on installations for all using (is_admin()) with check (is_admin());

create policy installation_tasks_own on installation_tasks for select using (
  exists (select 1 from installations i where i.id = installation_tasks.installation_id
    and (i.created_by = current_profile_id() or is_admin()))
);
create policy installation_tasks_admin_write on installation_tasks for all using (is_admin()) with check (is_admin());

create policy installation_photos_own on installation_photos for select using (
  uploaded_by = current_profile_id() or is_admin()
);
create policy installation_photos_admin_write on installation_photos for all using (is_admin()) with check (is_admin());

create policy installation_reports_own on installation_reports for select using (
  submitted_by = current_profile_id() or is_admin()
);
create policy installation_reports_admin_write on installation_reports for all using (is_admin()) with check (is_admin());

create policy customer_signatures_own on customer_signatures for select using (
  exists (select 1 from installations i where i.id = customer_signatures.installation_id
    and (i.created_by = current_profile_id() or is_admin()))
);
create policy customer_signatures_admin_write on customer_signatures for all using (is_admin()) with check (is_admin());

--------------------------------------------------------------------------------
-- Section H RLS
--------------------------------------------------------------------------------
alter table warranties enable row level security;
alter table warranty_claims enable row level security;
alter table warranty_history enable row level security;

create policy warranties_own on warranties for select using (
  customer_id = current_profile_id() or is_admin()
);
create policy warranties_admin_write on warranties for all using (is_admin()) with check (is_admin());

create policy warranty_claims_own on warranty_claims for select using (
  customer_id = current_profile_id() or is_admin()
);
create policy warranty_claims_admin_write on warranty_claims for all using (is_admin()) with check (is_admin());

create policy warranty_history_own on warranty_history for select using (
  exists (select 1 from warranties w where w.id = warranty_history.warranty_id
    and (w.customer_id = current_profile_id() or is_admin()))
);
create policy warranty_history_admin_write on warranty_history for all using (is_admin()) with check (is_admin());

--------------------------------------------------------------------------------
-- Section I RLS
--------------------------------------------------------------------------------
alter table service_tickets enable row level security;
alter table service_ticket_updates enable row level security;
alter table repair_assignments enable row level security;
alter table replacement_records enable row level security;
alter table customer_feedback enable row level security;

create policy service_tickets_own on service_tickets for select using (
  customer_id = current_profile_id()
  or assigned_to = current_profile_id()
  or is_admin()
);
create policy service_tickets_admin_write on service_tickets for all using (is_admin()) with check (is_admin());

create policy service_ticket_updates_own on service_ticket_updates for select using (
  updated_by = current_profile_id() or is_admin()
);
create policy service_ticket_updates_admin_write on service_ticket_updates for all using (is_admin()) with check (is_admin());

create policy repair_assignments_own on repair_assignments for select using (
  technician_id = (select id from technicians where profile_id = current_profile_id())
  or is_admin()
);
create policy repair_assignments_admin_write on repair_assignments for all using (is_admin()) with check (is_admin());

create policy replacement_records_own on replacement_records for select using (
  exists (select 1 from service_tickets t where t.id = replacement_records.ticket_id
    and (t.customer_id = current_profile_id() or t.assigned_to = current_profile_id() or is_admin()))
);
create policy replacement_records_admin_write on replacement_records for all using (is_admin()) with check (is_admin());

create policy customer_feedback_own on customer_feedback for select using (
  customer_id = current_profile_id() or is_admin()
);
create policy customer_feedback_admin_write on customer_feedback for all using (is_admin()) with check (is_admin());

--------------------------------------------------------------------------------
-- Section J RLS
--------------------------------------------------------------------------------
alter table invoices enable row level security;
alter table invoice_items enable row level security;
alter table expenses enable row level security;
alter table project_costs enable row level security;
alter table technician_payments enable row level security;
alter table financial_transactions enable row level security;

create policy invoices_own on invoices for select using (
  customer_id = current_profile_id() or is_admin()
);
create policy invoices_admin_write on invoices for all using (is_admin()) with check (is_admin());

create policy invoice_items_own on invoice_items for select using (
  exists (select 1 from invoices inv where inv.id = invoice_items.invoice_id
    and (inv.customer_id = current_profile_id() or is_admin()))
);
create policy invoice_items_admin_write on invoice_items for all using (is_admin()) with check (is_admin());

create policy expenses_admin on expenses for all using (is_admin()) with check (is_admin());
create policy project_costs_admin on project_costs for all using (is_admin()) with check (is_admin());
create policy technician_payments_own on technician_payments for select using (
  technician_id = (select id from technicians where profile_id = current_profile_id())
  or is_admin()
);
create policy technician_payments_admin_write on technician_payments for all using (is_admin()) with check (is_admin());

create policy financial_transactions_admin on financial_transactions for all using (is_admin()) with check (is_admin());

--------------------------------------------------------------------------------
-- Section K RLS
--------------------------------------------------------------------------------
alter table subsidy_applications enable row level security;
alter table subsidy_documents enable row level security;
alter table documents enable row level security;
alter table document_verification_history enable row level security;

create policy subsidy_applications_own on subsidy_applications for select using (
  customer_id = current_profile_id() or is_admin()
);
create policy subsidy_applications_admin_write on subsidy_applications for all using (is_admin()) with check (is_admin());

create policy subsidy_documents_own on subsidy_documents for select using (
  exists (select 1 from subsidy_applications sa where sa.id = subsidy_documents.application_id
    and (sa.customer_id = current_profile_id() or is_admin()))
);
create policy subsidy_documents_admin_write on subsidy_documents for all using (is_admin()) with check (is_admin());

create policy documents_own on documents for select using (
  customer_id = current_profile_id() or is_admin()
);
create policy documents_admin_write on documents for all using (is_admin()) with check (is_admin());

create policy document_verification_history_admin on document_verification_history for all using (is_admin()) with check (is_admin());

--------------------------------------------------------------------------------
-- Section L RLS
--------------------------------------------------------------------------------
alter table notifications enable row level security;
alter table activity_logs enable row level security;

create policy notifications_own on notifications for select using (
  recipient_id = current_profile_id()
);
create policy notifications_own_update on notifications for update using (
  recipient_id = current_profile_id()
);
create policy notifications_admin_write on notifications for all using (is_admin()) with check (is_admin());

create policy activity_logs_own on activity_logs for select using (
  actor_id = current_profile_id() or is_admin()
);
create policy activity_logs_admin_write on activity_logs for all using (is_admin()) with check (is_admin());

--------------------------------------------------------------------------------
-- 5. Completion message
--------------------------------------------------------------------------------
do $$
begin
  raise notice 'SOLVIX complete schema created successfully.';
end $$;
