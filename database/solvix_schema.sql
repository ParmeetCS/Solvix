-- ==============================================================================
-- SOLVIX - complete database schema (single file)
--
-- Run ONCE on a NEW, empty Supabase project: SQL Editor -> paste -> Run.
--
-- Contents, in dependency order:
--   1. Base tables (users & departments, CRM, survey, quotations, warehouse,
--      installation, warranty, support, finance, subsidy, notifications)
--   2. Column / constraint alignment required by the application code
--   3. Quotation -> order -> payment workflow and its transactional functions
--   4. Survey, support, warehouse, finance & subsidy extensions
--   5. Row Level Security (deny by default), grants, seed roles & departments
--
-- Security model
--   * The Next.js backend uses the service_role key and performs its own role
--     and department checks. Row Level Security is enabled on EVERY table as a
--     second line of defence: with no matching policy, anon and authenticated
--     users cannot read or write directly through the Supabase API.
--   * anon has no table privileges at all.
--
-- After running this file, create your first administrator with
-- database/02_bootstrap_admin.sql.
-- ==============================================================================
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
-- (gen_random_uuid() is built in; no extension needed)

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
-- Profile columns required by authentication
--------------------------------------------------------------------------------

alter table profiles add column if not exists account_type text not null default 'customer';
alter table profiles drop constraint if exists profiles_account_type_check;
alter table profiles add constraint profiles_account_type_check check (account_type in ('customer', 'employee', 'admin'));
alter table profiles add column if not exists employee_id text;
create index if not exists idx_profiles_account_type on profiles(account_type);


--------------------------------------------------------------------------------
-- Access helper functions used by Row Level Security
--------------------------------------------------------------------------------

create or replace function current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from profiles where auth_user_id = auth.uid() limit 1;
$$;

create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from profiles p
    left join roles r on r.id = p.role_id
    where p.auth_user_id = auth.uid()
      and p.is_active = true
      and (p.account_type = 'admin' or r.code = 'admin')
  );
$$;

create or replace function current_user_department_ids()
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(ed.department_id), '{}')
  from employee_departments ed
  join profiles p on p.id = ed.employee_id
  where p.auth_user_id = auth.uid() and ed.is_approved = true;
$$;


--------------------------------------------------------------------------------
-- Profile, customer and CRM column alignment
--------------------------------------------------------------------------------
-- ==============================================================================
-- SOLVIX: Complete Schema Sync & PostgREST Cache Reload Script
-- Run this in your Supabase Project -> SQL Editor to resolve all schema errors in one go.
-- It is idempotent (safe to run multiple times) and will not delete any existing data.
-- ==============================================================================

-- 1. PROFILES TABLE FIXES
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_type text DEFAULT 'customer';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS department_requested text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS employee_id text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Update account_type constraint safely
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_account_type_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_account_type_check 
  CHECK (account_type IN ('customer', 'employee', 'admin'));

-- 2. CUSTOMERS TABLE FIXES
ALTER TABLE customers ADD COLUMN IF NOT EXISTS contact_name text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_name text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_type text DEFAULT 'residential';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- Synchronize contact_name and customer_name
UPDATE customers SET customer_name = contact_name WHERE customer_name IS NULL AND contact_name IS NOT NULL;
UPDATE customers SET contact_name = customer_name WHERE contact_name IS NULL AND customer_name IS NOT NULL;

-- 3. LEADS TABLE FIXES
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_source_check;
ALTER TABLE leads ADD CONSTRAINT leads_source_check 
  CHECK (source IN ('whatsapp','phone','website','walkin','referral','social_media','other'));

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_status_check 
  CHECK (status IN ('new','contacted','follow_up_required','qualified','survey_requested','proposal_sent','quotation_sent','negotiation','converted','lost','disqualified'));

ALTER TABLE leads ADD COLUMN IF NOT EXISTS customer_name text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS system_type text DEFAULT 'on-grid';
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_system_type_check;
ALTER TABLE leads ADD CONSTRAINT leads_system_type_check CHECK (system_type IN ('on-grid','off-grid','hybrid'));

ALTER TABLE leads ADD COLUMN IF NOT EXISTS expected_capacity_kw numeric(6,2);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS monthly_electricity_bill numeric(12,2);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS additional_requirements text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium';
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_priority_check;
ALTER TABLE leads ADD CONSTRAINT leads_priority_check CHECK (priority IN ('low','medium','high','urgent'));

ALTER TABLE leads ADD COLUMN IF NOT EXISTS lost_reason text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- 4. FOLLOW_UPS TABLE FIXES
ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS follow_up_type text DEFAULT 'phone_call';
ALTER TABLE follow_ups DROP CONSTRAINT IF EXISTS follow_ups_follow_up_type_check;
ALTER TABLE follow_ups ADD CONSTRAINT follow_ups_follow_up_type_check 
  CHECK (follow_up_type IN ('phone_call','whatsapp','email','meeting','other'));

-- 5. WHATSAPP ENQUIRIES TABLE
CREATE TABLE IF NOT EXISTS whatsapp_enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_name text NOT NULL,
  phone text NOT NULL,
  message text NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','in_conversation','converted_to_lead','resolved','spam')),
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

-- 6. ENSURE LEAD ASSIGNMENTS TABLE EXISTS
CREATE TABLE IF NOT EXISTS lead_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  assigned_to uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  notes text
);

-- 7. ENSURE CUSTOMER INTERACTIONS TABLE EXISTS
CREATE TABLE IF NOT EXISTS customer_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  interaction_type text NOT NULL DEFAULT 'call'
    CHECK (interaction_type IN ('call','email','meeting','site_visit','whatsapp','other')),
  subject text NOT NULL,
  summary text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 8. DISPATCHES TABLE (Safety fix for created_by)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'dispatches') THEN
    ALTER TABLE dispatches ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 9. REFRESH SUPABASE SCHEMA CACHE
-- Forces Supabase PostgREST cache to reload immediately and recognize the new columns
NOTIFY pgrst, 'reload schema';


--------------------------------------------------------------------------------
-- Installation module alignment
--------------------------------------------------------------------------------
-- ==============================================================================
-- SOLVIX: Installation, Technician Assignment & Project Execution Schema Update
-- Run this in your Supabase Project -> SQL Editor to update installation constraints and columns.
-- Idempotent and safe to run multiple times.
-- ==============================================================================

-- 1. EXPAND INSTALLATION STATUS CHECK CONSTRAINT
-- Allows all required prompt 9 statuses:
-- pending, assigned, scheduled, in_progress, on_hold, inspection_required, completed, cancelled, failed
DO $$
BEGIN
  ALTER TABLE installations DROP CONSTRAINT IF EXISTS installations_status_check;
  ALTER TABLE installations ADD CONSTRAINT installations_status_check 
    CHECK (status IN ('pending', 'assigned', 'scheduled', 'in_progress', 'on_hold', 'inspection_required', 'completed', 'cancelled', 'failed'));
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 2. ENHANCE INSTALLATIONS TABLE COLUMNS
ALTER TABLE installations ADD COLUMN IF NOT EXISTS system_type text DEFAULT 'on-grid';
ALTER TABLE installations ADD COLUMN IF NOT EXISTS site_address text;
ALTER TABLE installations ADD COLUMN IF NOT EXISTS planned_installation_date date;
ALTER TABLE installations ADD COLUMN IF NOT EXISTS expected_completion_date date;
ALTER TABLE installations ADD COLUMN IF NOT EXISTS equipment_verified boolean DEFAULT false;
ALTER TABLE installations ADD COLUMN IF NOT EXISTS equipment_verification_notes text;
ALTER TABLE installations ADD COLUMN IF NOT EXISTS exception_recorded boolean DEFAULT false;
ALTER TABLE installations ADD COLUMN IF NOT EXISTS exception_notes text;
ALTER TABLE installations ADD COLUMN IF NOT EXISTS commissioning_data jsonb DEFAULT '{}'::jsonb;
ALTER TABLE installations ADD COLUMN IF NOT EXISTS notes text;
-- Serial numbers the technician has confirmed on site (read by the installation module)
ALTER TABLE installations ADD COLUMN IF NOT EXISTS verified_serials text[] NOT NULL DEFAULT '{}';

-- 3. ENHANCE TECHNICIANS TABLE COLUMNS
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS full_name text;

-- 4. ENHANCE INSTALLATION TASKS TABLE COLUMNS
ALTER TABLE installation_tasks ADD COLUMN IF NOT EXISTS remarks text;
ALTER TABLE installation_tasks ADD COLUMN IF NOT EXISTS photo_storage_path text;
ALTER TABLE installation_tasks ADD COLUMN IF NOT EXISTS order_index integer DEFAULT 0;

-- 5. ENHANCE INSTALLATION PHOTOS TABLE COLUMNS
DO $$
BEGIN
  ALTER TABLE installation_photos DROP CONSTRAINT IF EXISTS installation_photos_photo_type_check;
  ALTER TABLE installation_photos ADD CONSTRAINT installation_photos_photo_type_check
    CHECK (photo_type IN ('pre_install', 'progress', 'completion', 'panel', 'inverter', 'earthing', 'wiring', 'other'));
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 6. REFRESH SCHEMA CACHE
NOTIFY pgrst, 'reload schema';


--------------------------------------------------------------------------------
-- 001 CRM / Sales
--------------------------------------------------------------------------------
-- ==============================================================================
-- Migration: 001_crm_sales_module.sql
-- Description: Adds CRM/Sales enhancements to leads, follow_ups, and adds
--              whatsapp_enquiries table while strictly preserving existing schema.
-- ==============================================================================

-- 1. Extend lead sources constraint if needed
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_source_check;
ALTER TABLE leads ADD CONSTRAINT leads_source_check 
  CHECK (source IN ('whatsapp','phone','website','walkin','referral','social_media','other'));

-- 2. Extend lead status constraint
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_status_check 
  CHECK (status IN ('new','contacted','follow_up_required','qualified','survey_requested','proposal_sent','quotation_sent','negotiation','converted','lost','disqualified'));

-- 3. Add CRM specific columns to leads table (preserving all existing columns)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS customer_name text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS system_type text DEFAULT 'on-grid' CHECK (system_type IN ('on-grid','off-grid','hybrid'));
ALTER TABLE leads ADD COLUMN IF NOT EXISTS expected_capacity_kw numeric(6,2);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS monthly_electricity_bill numeric(12,2);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS additional_requirements text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent'));
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lost_reason text;

-- 4. Extend follow-up types
ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS follow_up_type text DEFAULT 'phone_call' 
  CHECK (follow_up_type IN ('phone_call','whatsapp','email','meeting','other'));

-- 5. WhatsApp Enquiries Table
CREATE TABLE IF NOT EXISTS whatsapp_enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_name text NOT NULL,
  phone text NOT NULL,
  message text NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','in_conversation','converted_to_lead','resolved','spam')),
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_priority ON leads(priority);
CREATE INDEX IF NOT EXISTS idx_follow_ups_status_sched ON follow_ups(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_enquiries_phone ON whatsapp_enquiries(phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_enquiries_lead ON whatsapp_enquiries(lead_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_enquiries_status ON whatsapp_enquiries(status);



--------------------------------------------------------------------------------
-- 002 Quotations, orders, payments
--------------------------------------------------------------------------------
-- ==============================================================================
-- Migration: 002_quotation_order_module.sql
-- Description:
--   Quotation, bill-of-materials, package catalogue, customer acceptance,
--   order conversion and payment-record integration for SOLVIX.
--
--   This migration is additive. It reuses the existing customers, leads,
--   site_surveys, survey_reports, products, product_categories, quotations,
--   quotation_items, orders, order_status_history, payments and activity_logs
--   tables from solvix_complete_schema.sql.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Product catalogue extensions
-- ------------------------------------------------------------------------------
alter table products add column if not exists brand text;
alter table products add column if not exists model_number text;
alter table products add column if not exists specifications jsonb not null default '{}'::jsonb;
alter table products add column if not exists tax_rate numeric(5,2) not null default 0;
alter table products add column if not exists system_types text[] not null default '{}'::text[];
alter table products add column if not exists item_type text not null default 'product';
alter table products add column if not exists is_quotable boolean not null default true;
alter table products add column if not exists hsn_code text;

alter table products drop constraint if exists products_tax_rate_check;
alter table products add constraint products_tax_rate_check
  check (tax_rate >= 0 and tax_rate <= 100);

alter table products drop constraint if exists products_item_type_check;
alter table products add constraint products_item_type_check
  check (item_type in ('product','installation','service','other'));

-- Package definitions are deliberately separate from products. A package is
-- a configurable template, not a fixed bundle: package_items can be edited by
-- an Admin at any time.
create table if not exists product_packages (
  id uuid primary key default gen_random_uuid(),
  package_code text unique not null,
  name text not null,
  system_type text not null
    check (system_type in ('on-grid','off-grid','hybrid')),
  capacity_kw numeric(6,2) not null
    check (capacity_kw >= 1 and capacity_kw <= 5),
  description text,
  tax_rate numeric(5,2) not null default 0
    check (tax_rate >= 0 and tax_rate <= 100),
  warranty_terms text,
  is_active boolean not null default true,
  is_template boolean not null default true,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists package_items (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references product_packages(id) on delete cascade,
  product_id uuid not null references products(id) on delete restrict,
  quantity numeric(10,2) not null default 1 check (quantity > 0),
  is_optional boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  unique (package_id, product_id)
);

create index if not exists idx_products_category on products(category_id);
create index if not exists idx_products_system_types on products using gin(system_types);
create index if not exists idx_product_packages_type_capacity
  on product_packages(system_type, capacity_kw);
create index if not exists idx_package_items_package on package_items(package_id);

-- ------------------------------------------------------------------------------
-- 2. Quotation extensions
-- ------------------------------------------------------------------------------
alter table quotations add column if not exists package_id uuid
  references product_packages(id) on delete set null;
alter table quotations add column if not exists installation_address text;
alter table quotations add column if not exists installation_charges numeric(12,2) not null default 0;
alter table quotations add column if not exists other_charges numeric(12,2) not null default 0;
alter table quotations add column if not exists tax_rate numeric(5,2) not null default 0;
alter table quotations add column if not exists discount_type text not null default 'fixed';
alter table quotations add column if not exists discount_value numeric(12,2) not null default 0;
alter table quotations add column if not exists payment_terms text;
alter table quotations add column if not exists warranty_terms text;
alter table quotations add column if not exists terms_and_conditions text;
alter table quotations add column if not exists approval_required boolean not null default false;
alter table quotations add column if not exists approved_at timestamptz;
alter table quotations add column if not exists approved_by uuid references profiles(id) on delete set null;
alter table quotations add column if not exists sent_at timestamptz;
alter table quotations add column if not exists viewed_at timestamptz;
alter table quotations add column if not exists accepted_at timestamptz;
alter table quotations add column if not exists rejected_at timestamptz;
alter table quotations add column if not exists rejection_reason text;
alter table quotations add column if not exists expired_at timestamptz;
alter table quotations add column if not exists customer_notes text;
alter table quotations add column if not exists internal_notes text;
alter table quotations add column if not exists currency text not null default 'INR';
alter table quotations add column if not exists survey_verified boolean not null default false;

alter table quotations drop constraint if exists quotations_discount_type_check;
alter table quotations add constraint quotations_discount_type_check
  check (discount_type in ('fixed','percentage'));

alter table quotations drop constraint if exists quotations_tax_rate_check;
alter table quotations add constraint quotations_tax_rate_check
  check (tax_rate >= 0 and tax_rate <= 100);

-- Keep legacy statuses for existing rows while adding the full workflow.
alter table quotations drop constraint if exists quotations_status_check;
alter table quotations add constraint quotations_status_check
  check (status in (
    'draft',
    'pending_approval',
    'under_review',          -- legacy value retained for compatibility
    'approved',
    'sent',
    'viewed',
    'accepted',
    'rejected',
    'expired',
    'converted',
    'converted_to_order'
  ));

alter table quotation_items add column if not exists item_type text not null default 'product';
alter table quotation_items add column if not exists category_name text;
alter table quotation_items add column if not exists unit text;
alter table quotation_items add column if not exists tax_rate numeric(5,2) not null default 0;
alter table quotation_items add column if not exists discount_amount numeric(12,2) not null default 0;
alter table quotation_items add column if not exists package_id uuid
  references product_packages(id) on delete set null;
alter table quotation_items add column if not exists sort_order integer not null default 0;
alter table quotation_items add column if not exists hsn_code text;

alter table quotation_items drop constraint if exists quotation_items_item_type_check;
alter table quotation_items add constraint quotation_items_item_type_check
  check (item_type in ('product','installation','service','other'));

create table if not exists quotation_status_history (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references quotations(id) on delete cascade,
  previous_status text,
  new_status text not null,
  changed_by uuid references profiles(id) on delete set null,
  changed_at timestamptz not null default now(),
  notes text,
  metadata jsonb
);

create table if not exists quotation_comments (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references quotations(id) on delete cascade,
  author_profile_id uuid references profiles(id) on delete set null,
  author_type text not null default 'staff'
    check (author_type in ('staff','customer','system')),
  message text not null,
  is_internal boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_quotations_status_created
  on quotations(status, created_at desc);
create index if not exists idx_quotations_validity on quotations(validity_date);
create index if not exists idx_quotation_status_history_quotation
  on quotation_status_history(quotation_id, changed_at desc);
create index if not exists idx_quotation_comments_quotation
  on quotation_comments(quotation_id, created_at desc);

-- ------------------------------------------------------------------------------
-- 3. Order and payment extensions
-- ------------------------------------------------------------------------------
alter table orders add column if not exists system_type text;
alter table orders add column if not exists system_capacity_kw numeric(6,2);
alter table orders add column if not exists payment_status text not null default 'pending';
alter table orders add column if not exists notes text;
alter table orders add column if not exists quotation_code text;
alter table orders add column if not exists warehouse_handoff_at timestamptz;
alter table orders add column if not exists warehouse_handoff_by uuid references profiles(id) on delete set null;
alter table orders add column if not exists handoff_notes text;
alter table orders add column if not exists cancelled_reason text;

alter table orders drop constraint if exists orders_status_check;
alter table orders add constraint orders_status_check
  check (status in (
    'pending',                 -- legacy
    'pending_payment',
    'confirmed',
    'processing',
    'in_production',           -- legacy
    'awaiting_dispatch',
    'ready_for_install',       -- legacy
    'dispatched',
    'installing',              -- legacy
    'installation_in_progress',
    'completed',
    'cancelled',
    'refunded'
  ));

alter table orders drop constraint if exists orders_payment_status_check;
alter table orders add constraint orders_payment_status_check
  check (payment_status in ('pending','partial','paid','overdue','refunded'));

alter table payments add column if not exists notes text;
alter table payments add column if not exists gateway_verified boolean not null default false;
alter table payments add column if not exists gateway_reference text;
alter table payments add column if not exists status text not null default 'recorded';

alter table payments drop constraint if exists payments_status_check;
alter table payments add constraint payments_status_check
  check (status in ('recorded','verified','failed','refunded'));

create index if not exists idx_orders_payment_status on orders(payment_status);
create index if not exists idx_orders_handoff on orders(warehouse_handoff_at);
create index if not exists idx_payments_paid_at on payments(paid_at desc);

-- Prevent duplicate order conversion. If historical duplicates already exist,
-- the conversion function below still serialises conversions by locking the
-- quotation row; the index is created only when the data allows it.
do $$
begin
  if exists (
    select 1 from orders group by quotation_id having count(*) > 1
  ) then
    raise notice 'Skipping unique order index: duplicate orders exist. Resolve them manually.';
  else
    execute 'create unique index if not exists uq_orders_quotation_id on orders(quotation_id)';
  end if;
end $$;

create sequence if not exists solvix_order_code_seq start 1000;
create sequence if not exists solvix_payment_code_seq start 1000;

-- ------------------------------------------------------------------------------
-- 4. RLS helper functions
-- ------------------------------------------------------------------------------
create or replace function current_customer_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.id
  from customers c
  join profiles p on p.id = current_profile_id()
  where c.profile_id = p.id
     or (c.profile_id is null and lower(c.email) = lower(p.email))
  order by case when c.profile_id = p.id then 0 else 1 end
  limit 1;
$$;

create or replace function is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from profiles p
    left join roles r on r.id = p.role_id
    where p.auth_user_id = auth.uid()
      and p.is_active = true
      and (
        p.account_type in ('employee','admin')
        or r.code in ('admin','manager','sales','sales_manager','sales_executive')
      )
  );
$$;

-- ------------------------------------------------------------------------------
-- 5. RLS policies (defence in depth; APIs also enforce scope)
-- ------------------------------------------------------------------------------
alter table product_packages enable row level security;
alter table package_items enable row level security;
alter table quotation_status_history enable row level security;
alter table quotation_comments enable row level security;

-- Packages: authenticated staff may read; only admins write.
drop policy if exists product_packages_select on product_packages;
create policy product_packages_select on product_packages
  for select using (auth.uid() is not null);
drop policy if exists product_packages_admin_write on product_packages;
create policy product_packages_admin_write on product_packages
  for all using (is_admin()) with check (is_admin());

drop policy if exists package_items_select on package_items;
create policy package_items_select on package_items
  for select using (auth.uid() is not null);
drop policy if exists package_items_admin_write on package_items;
create policy package_items_admin_write on package_items
  for all using (is_admin()) with check (is_admin());

-- Quotations: staff see their own, customers see their own, admins see all.
drop policy if exists quotations_own on quotations;
drop policy if exists quotations_admin_write on quotations;
drop policy if exists quotations_select on quotations;
create policy quotations_select on quotations
  for select using (
    is_admin()
    or created_by = current_profile_id()
    or customer_id = current_customer_id()
  );

drop policy if exists quotations_staff_insert on quotations;
create policy quotations_staff_insert on quotations
  for insert with check (
    is_admin()
    or (is_staff() and created_by = current_profile_id())
  );

drop policy if exists quotations_staff_update on quotations;
create policy quotations_staff_update on quotations
  for update using (
    is_admin() or (is_staff() and created_by = current_profile_id())
  ) with check (
    is_admin() or (is_staff() and created_by = current_profile_id())
  );

drop policy if exists quotations_customer_update on quotations;
create policy quotations_customer_update on quotations
  for update using (
    customer_id = current_customer_id()
    and status in ('sent','viewed')
  ) with check (
    customer_id = current_customer_id()
    and status in ('viewed','accepted','rejected')
  );

drop policy if exists quotations_admin_delete on quotations;
create policy quotations_admin_delete on quotations
  for delete using (is_admin() or (is_staff() and created_by = current_profile_id() and status = 'draft'));

-- Quotation items.
drop policy if exists quotation_items_own on quotation_items;
drop policy if exists quotation_items_admin_write on quotation_items;
drop policy if exists quotation_items_select on quotation_items;
create policy quotation_items_select on quotation_items
  for select using (
    exists (
      select 1 from quotations q
      where q.id = quotation_items.quotation_id
        and (q.created_by = current_profile_id() or q.customer_id = current_customer_id() or is_admin())
    )
  );
drop policy if exists quotation_items_staff_write on quotation_items;
create policy quotation_items_staff_write on quotation_items
  for all using (
    exists (
      select 1 from quotations q
      where q.id = quotation_items.quotation_id
        and (q.created_by = current_profile_id() or is_admin())
    )
  ) with check (
    exists (
      select 1 from quotations q
      where q.id = quotation_items.quotation_id
        and (q.created_by = current_profile_id() or is_admin())
    )
  );

-- Quotation status history.
drop policy if exists quotation_status_history_select on quotation_status_history;
create policy quotation_status_history_select on quotation_status_history
  for select using (
    exists (
      select 1 from quotations q
      where q.id = quotation_status_history.quotation_id
        and (q.created_by = current_profile_id() or q.customer_id = current_customer_id() or is_admin())
    )
  );
drop policy if exists quotation_status_history_staff_write on quotation_status_history;
create policy quotation_status_history_staff_write on quotation_status_history
  for all using (
    exists (
      select 1 from quotations q
      where q.id = quotation_status_history.quotation_id
        and (q.created_by = current_profile_id() or is_admin())
    )
  ) with check (
    exists (
      select 1 from quotations q
      where q.id = quotation_status_history.quotation_id
        and (q.created_by = current_profile_id() or is_admin())
    )
  );

-- Quotation comments: customers may read public comments on their quotation
-- and add their own; staff may read/write all comments on their quotations.
drop policy if exists quotation_comments_select on quotation_comments;
create policy quotation_comments_select on quotation_comments
  for select using (
    exists (
      select 1 from quotations q
      where q.id = quotation_comments.quotation_id
        and (
          q.created_by = current_profile_id()
          or is_admin()
          or (q.customer_id = current_customer_id() and quotation_comments.is_internal = false)
        )
    )
  );
drop policy if exists quotation_comments_staff_write on quotation_comments;
create policy quotation_comments_staff_write on quotation_comments
  for insert with check (
    exists (
      select 1 from quotations q
      where q.id = quotation_comments.quotation_id
        and (q.created_by = current_profile_id() or is_admin())
    )
  );
drop policy if exists quotation_comments_customer_insert on quotation_comments;
create policy quotation_comments_customer_insert on quotation_comments
  for insert with check (
    author_type = 'customer'
    and is_internal = false
    and author_profile_id = current_profile_id()
    and exists (
      select 1 from quotations q
      where q.id = quotation_comments.quotation_id
        and q.customer_id = current_customer_id()
    )
  );

-- Orders: staff see their own; customers see their own; admins all.
drop policy if exists orders_own on orders;
drop policy if exists orders_admin_write on orders;
drop policy if exists orders_select on orders;
create policy orders_select on orders
  for select using (
    is_admin()
    or created_by = current_profile_id()
    or customer_id = current_customer_id()
  );
drop policy if exists orders_staff_write on orders;
create policy orders_staff_write on orders
  for all using (
    is_admin() or (is_staff() and created_by = current_profile_id())
  ) with check (
    is_admin() or (is_staff() and created_by = current_profile_id())
  );

-- Order status history.
drop policy if exists order_status_history_own on order_status_history;
drop policy if exists order_status_history_admin_write on order_status_history;
drop policy if exists order_status_history_select on order_status_history;
create policy order_status_history_select on order_status_history
  for select using (
    exists (
      select 1 from orders o
      where o.id = order_status_history.order_id
        and (o.created_by = current_profile_id() or o.customer_id = current_customer_id() or is_admin())
    )
  );
drop policy if exists order_status_history_staff_write on order_status_history;
create policy order_status_history_staff_write on order_status_history
  for all using (
    exists (
      select 1 from orders o
      where o.id = order_status_history.order_id
        and (o.created_by = current_profile_id() or is_admin())
    )
  ) with check (
    exists (
      select 1 from orders o
      where o.id = order_status_history.order_id
        and (o.created_by = current_profile_id() or is_admin())
    )
  );

-- Payments.
drop policy if exists payments_own on payments;
drop policy if exists payments_admin_write on payments;
drop policy if exists payments_select on payments;
create policy payments_select on payments
  for select using (
    is_admin()
    or recorded_by = current_profile_id()
    or exists (
      select 1 from orders o
      where o.id = payments.order_id
        and (o.created_by = current_profile_id() or o.customer_id = current_customer_id())
    )
  );
drop policy if exists payments_staff_write on payments;
create policy payments_staff_write on payments
  for all using (
    is_admin()
    or exists (
      select 1 from orders o
      where o.id = payments.order_id
        and o.created_by = current_profile_id()
    )
  ) with check (
    is_admin()
    or exists (
      select 1 from orders o
      where o.id = payments.order_id
        and o.created_by = current_profile_id()
    )
  );

-- ------------------------------------------------------------------------------
-- 6. Transactional RPCs
-- ------------------------------------------------------------------------------

-- Atomic package create/update with composition replacement.
create or replace function save_product_package(
  p_package_id uuid,
  p_package_code text,
  p_name text,
  p_system_type text,
  p_capacity_kw numeric,
  p_description text,
  p_tax_rate numeric,
  p_warranty_terms text,
  p_is_active boolean,
  p_items jsonb,
  p_actor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pkg product_packages;
  v_item jsonb;
  v_product_id uuid;
  v_qty numeric;
begin
  if p_capacity_kw is null or p_capacity_kw < 1 or p_capacity_kw > 5 then
    raise exception 'Package capacity must be between 1 and 5 kW.';
  end if;
  if p_system_type not in ('on-grid','off-grid','hybrid') then
    raise exception 'Invalid system type.';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'A package must contain at least one component.';
  end if;

  if p_package_id is null then
    insert into product_packages (
      package_code, name, system_type, capacity_kw, description,
      tax_rate, warranty_terms, is_active, created_by
    ) values (
      p_package_code, p_name, p_system_type, p_capacity_kw, p_description,
      coalesce(p_tax_rate, 0), p_warranty_terms, coalesce(p_is_active, true), p_actor_id
    ) returning * into v_pkg;
  else
    update product_packages set
      package_code = p_package_code,
      name = p_name,
      system_type = p_system_type,
      capacity_kw = p_capacity_kw,
      description = p_description,
      tax_rate = coalesce(p_tax_rate, 0),
      warranty_terms = p_warranty_terms,
      is_active = coalesce(p_is_active, true),
      updated_at = now()
    where id = p_package_id
    returning * into v_pkg;

    if not found then
      raise exception 'Package not found.';
    end if;

    delete from package_items where package_id = p_package_id;
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty := coalesce((v_item->>'quantity')::numeric, 0);

    if v_qty <= 0 then
      raise exception 'Package component quantities must be greater than zero.';
    end if;
    if not exists (select 1 from products where id = v_product_id) then
      raise exception 'Package component product not found: %', v_product_id;
    end if;

    insert into package_items (package_id, product_id, quantity, is_optional, notes)
    values (
      v_pkg.id,
      v_product_id,
      v_qty,
      coalesce((v_item->>'is_optional')::boolean, false),
      v_item->>'notes'
    )
    on conflict (package_id, product_id) do update
      set quantity = excluded.quantity,
          is_optional = excluded.is_optional,
          notes = excluded.notes;
  end loop;

  return jsonb_build_object(
    'package', to_jsonb(v_pkg),
    'items', (
      select coalesce(jsonb_agg(to_jsonb(pi) order by pi.created_at), '[]'::jsonb)
      from package_items pi
      where pi.package_id = v_pkg.id
    )
  );
end;
$$;

-- Atomic quotation -> order conversion. Idempotent: repeated calls return the
-- existing order and do not create a duplicate.
create or replace function convert_quotation_to_order(
  p_quotation_id uuid,
  p_actor_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_q quotations;
  v_o orders;
  v_prev_status text;
  v_code text;
begin
  select * into v_q from quotations where id = p_quotation_id for update;
  if not found then
    raise exception 'Quotation not found.';
  end if;

  select * into v_o from orders where quotation_id = p_quotation_id limit 1;
  if found then
    return jsonb_build_object('order', to_jsonb(v_o), 'already_exists', true);
  end if;

  if v_q.status not in ('accepted','converted_to_order') then
    raise exception 'Quotation must be accepted before conversion (current status: %).', v_q.status;
  end if;

  v_code := 'ORD-' || to_char(now(), 'YYYY') || '-' ||
            lpad(nextval('solvix_order_code_seq')::text, 6, '0');

  begin
    insert into orders (
      order_code, quotation_id, customer_id, status,
      total_amount, advance_paid, balance_due,
      system_type, system_capacity_kw, quotation_code,
      payment_status, created_by, updated_by
    ) values (
      v_code, v_q.id, v_q.customer_id, 'pending_payment',
      v_q.total_amount, 0, v_q.total_amount,
      v_q.system_type, v_q.system_capacity_kw, v_q.quotation_code,
      'pending', coalesce(v_q.created_by, p_actor_id), p_actor_id
    ) returning * into v_o;
  exception when unique_violation then
    select * into v_o from orders where quotation_id = p_quotation_id limit 1;
    return jsonb_build_object('order', to_jsonb(v_o), 'already_exists', true);
  end;

  insert into order_status_history (
    order_id, previous_status, new_status, changed_by, notes
  ) values (
    v_o.id, null, 'pending_payment', p_actor_id,
    'Order created from quotation ' || v_q.quotation_code
  );

  v_prev_status := v_q.status;

  update quotations
  set status = 'converted_to_order',
      updated_at = now(),
      updated_by = p_actor_id
  where id = p_quotation_id;

  insert into quotation_status_history (
    quotation_id, previous_status, new_status, changed_by, notes
  ) values (
    p_quotation_id, v_prev_status, 'converted_to_order', p_actor_id,
    'Converted to order ' || v_o.order_code
  );

  return jsonb_build_object('order', to_jsonb(v_o), 'already_exists', false);
end;
$$;

-- Atomic payment recording with balance and payment-status recalculation.
create or replace function record_order_payment(
  p_order_id uuid,
  p_actor_id uuid,
  p_amount numeric,
  p_payment_type text,
  p_payment_method text,
  p_transaction_reference text,
  p_paid_at timestamptz,
  p_notes text,
  p_gateway_verified boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_o orders;
  v_p payments;
  v_paid numeric;
  v_new_payment_status text;
  v_prev_order_status text;
  v_new_order_status text;
  v_code text;
begin
  select * into v_o from orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found.';
  end if;
  if v_o.status in ('cancelled','refunded') then
    raise exception 'Cannot record a payment against a cancelled or refunded order.';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be greater than zero.';
  end if;
  if p_payment_type not in ('advance','partial','full','refund') then
    raise exception 'Invalid payment type.';
  end if;
  if p_payment_method not in ('cash','cheque','bank_transfer','upi','card','finance','other') then
    raise exception 'Invalid payment method.';
  end if;

  select coalesce(sum(case when payment_type = 'refund' then -amount else amount end), 0)
    into v_paid
  from payments
  where order_id = p_order_id;

  if p_payment_type = 'refund' then
    if p_amount > v_paid then
      raise exception 'Refund exceeds recorded payments.';
    end if;
  elsif v_paid + p_amount > v_o.total_amount + 0.01 then
    raise exception 'Payment exceeds the remaining order balance.';
  end if;

  v_code := 'PAY-' || to_char(now(), 'YYYY') || '-' ||
            lpad(nextval('solvix_payment_code_seq')::text, 6, '0');

  insert into payments (
    payment_code, order_id, customer_id, amount, payment_type,
    payment_method, transaction_reference, paid_at, recorded_by,
    notes, gateway_verified, status
  ) values (
    v_code, p_order_id, v_o.customer_id, p_amount, p_payment_type,
    p_payment_method, p_transaction_reference, coalesce(p_paid_at, now()),
    p_actor_id, p_notes, coalesce(p_gateway_verified, false),
    case when coalesce(p_gateway_verified, false) then 'verified' else 'recorded' end
  ) returning * into v_p;

  select coalesce(sum(case when payment_type = 'refund' then -amount else amount end), 0)
    into v_paid
  from payments
  where order_id = p_order_id;

  v_new_payment_status := case
    when v_paid >= v_o.total_amount then 'paid'
    when v_paid > 0 then 'partial'
    else 'pending'
  end;

  v_prev_order_status := v_o.status;
  v_new_order_status := v_o.status;

  if v_o.status = 'pending_payment' and v_new_payment_status in ('partial','paid') then
    v_new_order_status := 'confirmed';
  end if;

  update orders
  set advance_paid = v_paid,
      balance_due = greatest(v_o.total_amount - v_paid, 0),
      payment_status = v_new_payment_status,
      status = v_new_order_status,
      updated_at = now(),
      updated_by = p_actor_id
  where id = p_order_id
  returning * into v_o;

  if v_prev_order_status = 'pending_payment' and v_new_order_status <> 'pending_payment' then
    insert into order_status_history (
      order_id, previous_status, new_status, changed_by, notes
    ) values (
      p_order_id, 'pending_payment', v_new_order_status, p_actor_id,
      'Order confirmed on recorded payment'
    );
  end if;

  return jsonb_build_object('payment', to_jsonb(v_p), 'order', to_jsonb(v_o));
end;
$$;

-- Expire quotations whose validity date has passed. Called by an authorised
-- maintenance endpoint or a scheduled job.
create or replace function expire_quotations(p_actor_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rec record;
  v_count integer := 0;
begin
  for v_rec in
    select id, status
    from quotations
    where status in ('draft','pending_approval','under_review','approved','sent','viewed')
      and validity_date is not null
      and validity_date < current_date
  loop
    update quotations
    set status = 'expired', expired_at = now(), updated_at = now(), updated_by = p_actor_id
    where id = v_rec.id;

    insert into quotation_status_history (
      quotation_id, previous_status, new_status, changed_by, notes
    ) values (
      v_rec.id, v_rec.status, 'expired', p_actor_id, 'Validity date passed'
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- The order always belongs to the sales owner of its quotation. Backfill any
-- order that was created with a customer profile as created_by so sales staff
-- retain access to orders raised through customer acceptance.
update orders o
set created_by = q.created_by,
    updated_at = now()
from quotations q
where o.quotation_id = q.id
  and q.created_by is not null
  and o.created_by is distinct from q.created_by
  and exists (
    select 1 from customers c where c.profile_id = o.created_by
  );

-- ------------------------------------------------------------------------------
-- 6b. Lock down security-definer RPCs
-- ------------------------------------------------------------------------------
-- These functions bypass RLS, so only the backend service role may execute
-- them. Browser/anon/authenticated roles must never call them directly.
-- (The RLS helper functions above intentionally stay executable: policies
-- evaluated as authenticated/anon need to call them.)
revoke all on function save_product_package(
  uuid, text, text, text, numeric, text, numeric, text, boolean, jsonb, uuid
) from public, anon, authenticated;
revoke all on function convert_quotation_to_order(uuid, uuid) from public, anon, authenticated;
revoke all on function record_order_payment(
  uuid, uuid, numeric, text, text, text, timestamptz, text, boolean
) from public, anon, authenticated;
revoke all on function expire_quotations(uuid) from public, anon, authenticated;

grant execute on function save_product_package(
  uuid, text, text, text, numeric, text, numeric, text, boolean, jsonb, uuid
) to service_role;
grant execute on function convert_quotation_to_order(uuid, uuid) to service_role;
grant execute on function record_order_payment(
  uuid, uuid, numeric, text, text, text, timestamptz, text, boolean
) to service_role;
grant execute on function expire_quotations(uuid) to service_role;

-- ------------------------------------------------------------------------------
-- 7. Seed catalogue (configurable; Admin can edit every field and composition)
-- ------------------------------------------------------------------------------
insert into product_categories (name, code, description)
select v.name, v.code, v.description
from (values
  ('Solar Panels', 'solar_panels', 'Photovoltaic modules'),
  ('Solar Inverters', 'solar_inverters', 'On-grid and off-grid inverters'),
  ('Batteries', 'batteries', 'Battery storage'),
  ('Mounting Structures', 'mounting_structures', 'Module mounting structures'),
  ('Cables', 'cables', 'DC and AC cabling'),
  ('Electrical Protection', 'electrical_protection', 'Distribution boards, MCBs and isolators'),
  ('Earthing Equipment', 'earthing_equipment', 'Earthing kits and conductors'),
  ('Accessories', 'accessories', 'Connectors, glands and consumables'),
  ('Installation & Services', 'installation_services', 'Installation, commissioning and service charges')
) as v(name, code, description)
where not exists (
  select 1 from product_categories c
  where c.code = v.code or c.name = v.name
);

-- Synchronize category codes if existing rows matched by name
update product_categories set code = 'solar_inverters' where name = 'Solar Inverters' and code != 'solar_inverters' and not exists (select 1 from product_categories where code = 'solar_inverters');
update product_categories set code = 'solar_panels' where name = 'Solar Panels' and code != 'solar_panels' and not exists (select 1 from product_categories where code = 'solar_panels');
update product_categories set code = 'batteries' where name = 'Batteries' and code != 'batteries' and not exists (select 1 from product_categories where code = 'batteries');

insert into products (
  sku, name, category_id, description, unit, base_price, warranty_years,
  min_stock_level, is_active, tax_rate, system_types, item_type, is_quotable, hsn_code
)
select v.sku, v.name, c.id, v.description, v.unit, v.base_price, 0,
       v.min_stock, true, v.tax_rate, v.system_types, v.item_type, true, v.hsn
from (values
  ('SP-550', 'Solar PV Module 550W (mono PERC)', 'solar_panels',
   'Generic 550 Wp module. Manufacturer datasheet and warranty must be configured before quotation claims are made.',
   'piece', 12000.00, 0, 12.00, array['on-grid','off-grid','hybrid'], 'product', '8541'),
  ('INV-ONG-3', 'On-Grid String Inverter 3 kW', 'solar_inverters',
   'Generic 3 kW on-grid inverter. Configure brand, model and verified warranty in Admin catalogue.',
   'piece', 28000.00, 0, 12.00, array['on-grid'], 'product', '8504'),
  ('INV-ONG-5', 'On-Grid String Inverter 5 kW', 'solar_inverters',
   'Generic 5 kW on-grid inverter. Configure brand, model and verified warranty in Admin catalogue.',
   'piece', 42000.00, 0, 12.00, array['on-grid'], 'product', '8504'),
  ('INV-OFF-3', 'Off-Grid Inverter 3 kW', 'solar_inverters',
   'Generic 3 kW off-grid inverter. Configure brand, model and verified warranty in Admin catalogue.',
   'piece', 36000.00, 0, 12.00, array['off-grid'], 'product', '8504'),
  ('INV-OFF-5', 'Off-Grid Inverter 5 kW', 'solar_inverters',
   'Generic 5 kW off-grid inverter. Configure brand, model and verified warranty in Admin catalogue.',
   'piece', 52000.00, 0, 12.00, array['off-grid'], 'product', '8504'),
  ('BAT-100AH', 'Solar Battery 100Ah', 'batteries',
   'Generic 100 Ah solar battery. Chemistry and warranty must be configured before quotation claims are made.',
   'piece', 15000.00, 0, 12.00, array['off-grid','hybrid'], 'product', '8507'),
  ('MNT-STD', 'Module Mounting Structure', 'mounting_structures',
   'Galvanised module mounting structure, priced per kW.',
   'kw', 4500.00, 0, 12.00, array['on-grid','off-grid','hybrid'], 'product', '7308'),
  ('CBL-DC', 'DC Solar Cable', 'cables',
   'UV-rated DC solar cable, priced per metre.',
   'meter', 45.00, 0, 12.00, array['on-grid','off-grid','hybrid'], 'product', '8544'),
  ('CBL-AC', 'AC Cable', 'cables',
   'AC cable, priced per metre.',
   'meter', 35.00, 0, 12.00, array['on-grid','off-grid','hybrid'], 'product', '8544'),
  ('ELE-ACDB', 'AC Distribution Box', 'electrical_protection',
   'AC distribution box with isolator.',
   'piece', 3500.00, 0, 12.00, array['on-grid','off-grid','hybrid'], 'product', '8537'),
  ('ELE-DCDB', 'DC Distribution Box', 'electrical_protection',
   'DC distribution box with surge protection.',
   'piece', 2800.00, 0, 12.00, array['on-grid','off-grid','hybrid'], 'product', '8537'),
  ('ELE-MCB', 'MCB & Isolator Set', 'electrical_protection',
   'MCB and isolator protection set.',
   'set', 1200.00, 0, 12.00, array['on-grid','off-grid','hybrid'], 'product', '8536'),
  ('ERT-KIT', 'Earthing Kit', 'earthing_equipment',
   'Earthing rod, conductor and accessories.',
   'set', 4500.00, 0, 12.00, array['on-grid','off-grid','hybrid'], 'product', '8538'),
  ('ACC-MC4', 'MC4 Connector Pair', 'accessories',
   'MC4 connector pair.',
   'piece', 250.00, 0, 12.00, array['on-grid','off-grid','hybrid'], 'product', '8536'),
  ('ACC-GLAND', 'Cable Glands & Consumables', 'accessories',
   'Cable glands, ties and consumables.',
   'set', 600.00, 0, 12.00, array['on-grid','off-grid','hybrid'], 'product', '8536'),
  ('SRV-INST', 'Installation & Commissioning', 'installation_services',
   'Installation and commissioning charge, priced per kW.',
   'kw', 3500.00, 0, 18.00, array['on-grid','off-grid','hybrid'], 'installation', '9954'),
  ('SRV-SURVEY', 'Site Survey & System Design', 'installation_services',
   'Site survey and system design service.',
   'piece', 1500.00, 0, 18.00, array['on-grid','off-grid','hybrid'], 'service', '9983')
) as v(sku, name, category_code, description, unit, base_price, min_stock, tax_rate, system_types, item_type, hsn)
join product_categories c on (c.code = v.category_code or c.name = case v.category_code when 'solar_inverters' then 'Solar Inverters' when 'solar_panels' then 'Solar Panels' when 'batteries' then 'Batteries' else null end)
on conflict (sku) do nothing;

-- Seed ten configurable packages (1-5 kW, on-grid and off-grid).
do $$
declare
  v_sys text;
  v_cap integer;
  v_pkg_id uuid;
  v_code text;
  v_inverter_sku text;
begin
  foreach v_sys in array array['on-grid','off-grid'] loop
    for v_cap in 1..5 loop
      v_code := 'PKG-' || case when v_sys = 'on-grid' then 'ONG' else 'OFF' end || '-' || v_cap::text;

      if v_sys = 'on-grid' then
        v_inverter_sku := case when v_cap <= 3 then 'INV-ONG-3' else 'INV-ONG-5' end;
      else
        v_inverter_sku := case when v_cap <= 3 then 'INV-OFF-3' else 'INV-OFF-5' end;
      end if;

      insert into product_packages (
        package_code, name, system_type, capacity_kw, description,
        tax_rate, warranty_terms, is_active
      ) values (
        v_code,
        initcap(replace(v_sys, '-', ' ')) || ' Package ' || v_cap || ' kW',
        v_sys,
        v_cap,
        'Configurable ' || v_sys || ' package template. Composition and pricing can be edited by an Admin.',
        0,
        null,
        true
      )
      on conflict (package_code) do update
        set name = excluded.name,
            system_type = excluded.system_type,
            capacity_kw = excluded.capacity_kw,
            description = excluded.description,
            updated_at = now()
      returning id into v_pkg_id;

      delete from package_items where package_id = v_pkg_id;

      insert into package_items (package_id, product_id, quantity)
      select v_pkg_id, p.id, v.qty
      from (values
        ('SP-550', ceil(v_cap * 1000.0 / 550.0)),
        (v_inverter_sku, 1::numeric),
        ('MNT-STD', v_cap::numeric),
        ('CBL-DC', (v_cap * 20)::numeric),
        ('CBL-AC', (v_cap * 10)::numeric),
        ('ELE-ACDB', 1::numeric),
        ('ELE-DCDB', 1::numeric),
        ('ELE-MCB', 1::numeric),
        ('ERT-KIT', 1::numeric),
        ('ACC-MC4', 2::numeric),
        ('ACC-GLAND', 1::numeric),
        ('SRV-INST', v_cap::numeric)
      ) as v(sku, qty)
      join products p on p.sku = v.sku;

      if v_sys = 'off-grid' then
        insert into package_items (package_id, product_id, quantity)
        select v_pkg_id, p.id, ceil(v_cap / 2.0)
        from products p
        where p.sku = 'BAT-100AH'
        on conflict (package_id, product_id) do update
          set quantity = excluded.quantity;
      end if;
    end loop;
  end loop;
end $$;

-- Documentation note:
-- Seed prices and package compositions are starting points only. They are
-- editable in the Admin catalogue. No manufacturer warranty or product
-- specification is asserted by the seed data.


--------------------------------------------------------------------------------
-- 002 Site survey
--------------------------------------------------------------------------------
-- ==============================================================================
-- Migration: 002_site_survey_module.sql
-- Description: Enhances site survey, assignment, photos, reports & approval tables
--              to fulfill SOLVIX Site Survey and Solar Feasibility Module.
-- ==============================================================================

-- 1. Extend site_surveys table
ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending','assigned','scheduled','in_progress','submitted','approved','rejected','revisit_required'));

ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium'
  CHECK (priority IN ('low','medium','high','urgent'));

ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS scheduled_date date;
ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS scheduled_time text;

-- Property & connection details
ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS property_type text DEFAULT 'residential'
  CHECK (property_type IN ('residential','commercial','industrial','agricultural','institutional','other'));

ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS electricity_connection_type text DEFAULT 'single_phase'
  CHECK (electricity_connection_type IN ('single_phase','three_phase','lt','ht','other'));

ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS monthly_electricity_bill numeric(12,2);
ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS sanctioned_load_kw numeric(6,2);
ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS consumer_number text;
ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS meter_number text;
ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS site_address text;
ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS pincode text;

-- Roof assessment details
ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS roof_type text DEFAULT 'rcc_flat'
  CHECK (roof_type IN ('rcc_flat','metal_sheet','tiled','asbestos','shed','curved','ground','other'));

ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS available_installation_area_sqm numeric(10,2);
ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS roof_condition text DEFAULT 'good'
  CHECK (roof_condition IN ('excellent','good','fair','needs_repair','unsuitable'));

ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS structural_concerns text;

-- Electrical assessment details
ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS grid_availability text DEFAULT 'stable'
  CHECK (grid_availability IN ('stable','frequent_outages','highly_intermittent','off_grid'));

ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS existing_meter_info text;
ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS main_panel_condition text DEFAULT 'good'
  CHECK (main_panel_condition IN ('good','acceptable','aged_needs_upgrade','dangerous'));

ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS earthing_availability text DEFAULT 'adequate'
  CHECK (earthing_availability IN ('adequate','inadequate','not_available','dedicated_needed'));

ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS other_technical_observations text;

-- Installation feasibility & recommendations
ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS estimated_usable_area_sqm numeric(10,2);
ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS recommended_capacity_kw numeric(6,2);
ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS recommended_system_type text DEFAULT 'on-grid'
  CHECK (recommended_system_type IN ('on-grid','off-grid','hybrid'));

ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS potential_constraints text;
ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS additional_requirements text;

-- Form draft & completion tracking
ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS is_draft boolean NOT NULL DEFAULT false;
ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS draft_data jsonb;
ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS surveyor_notes text;
ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE site_surveys ADD COLUMN IF NOT EXISTS revisit_notes text;

-- 2. Extend survey_assignments table
ALTER TABLE survey_assignments ADD COLUMN IF NOT EXISTS status text DEFAULT 'assigned'
  CHECK (status IN ('assigned','rescheduled','completed','cancelled'));

ALTER TABLE survey_assignments ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;
ALTER TABLE survey_assignments ADD COLUMN IF NOT EXISTS notes text;

-- 3. Extend survey_photos table
ALTER TABLE survey_photos ADD COLUMN IF NOT EXISTS file_name text;
ALTER TABLE survey_photos ADD COLUMN IF NOT EXISTS file_size_bytes bigint;
ALTER TABLE survey_photos ADD COLUMN IF NOT EXISTS file_type text;
ALTER TABLE survey_photos ADD COLUMN IF NOT EXISTS description text;

-- 4. Extend survey_reports table
ALTER TABLE survey_reports ADD COLUMN IF NOT EXISTS executive_summary text;
ALTER TABLE survey_reports ADD COLUMN IF NOT EXISTS feasibility_rating text DEFAULT 'feasible'
  CHECK (feasibility_rating IN ('feasible','partially_feasible','not_feasible','requires_special_engineering'));

ALTER TABLE survey_reports ADD COLUMN IF NOT EXISTS shading_assessment text;
ALTER TABLE survey_reports ADD COLUMN IF NOT EXISTS electrical_assessment text;
ALTER TABLE survey_reports ADD COLUMN IF NOT EXISTS installation_constraints text;
ALTER TABLE survey_reports ADD COLUMN IF NOT EXISTS calculation_assumptions text;

-- 5. Extend survey_approvals table
ALTER TABLE survey_approvals DROP CONSTRAINT IF EXISTS survey_approvals_status_check;
ALTER TABLE survey_approvals ADD CONSTRAINT survey_approvals_status_check
  CHECK (status IN ('pending','approved','rejected','revision_requested','revisit_required'));

-- 6. Indexes for survey querying and scheduling
CREATE INDEX IF NOT EXISTS idx_site_surveys_status ON site_surveys(status);
CREATE INDEX IF NOT EXISTS idx_site_surveys_priority ON site_surveys(priority);
CREATE INDEX IF NOT EXISTS idx_site_surveys_assigned_to ON site_surveys(assigned_to);
CREATE INDEX IF NOT EXISTS idx_site_surveys_scheduled_date ON site_surveys(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_survey_assignments_assigned_to ON survey_assignments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_survey_assignments_survey ON survey_assignments(survey_id);

-- 7. Supabase Storage bucket for survey documents and photos
-- Bucket name: 'survey-attachments' (private, authenticated)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'survey-attachments',
  'survey-attachments',
  false,
  10485760, -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760;

-- Files are private. Only the backend (service role) reads or writes them and hands
-- out short-lived signed URLs after its own authorisation check.


--------------------------------------------------------------------------------
-- 002 Support & warranty
--------------------------------------------------------------------------------
-- ==============================================================================
-- Migration: 002_support_warranty_module.sql
-- Description: Adds Customer Support, Warranty Verification, Repair & Replacement
--              enhancements while strictly preserving existing schema.
-- ==============================================================================

-- 1. Extend service_tickets status constraint if needed
ALTER TABLE service_tickets DROP CONSTRAINT IF EXISTS service_tickets_status_check;
ALTER TABLE service_tickets ADD CONSTRAINT service_tickets_status_check 
  CHECK (status IN ('new','open','assigned','in_progress','waiting_for_customer','waiting_for_technician','waiting_for_parts','resolved','closed'));

-- 2. Extend service_tickets priority constraint
ALTER TABLE service_tickets DROP CONSTRAINT IF EXISTS service_tickets_priority_check;
ALTER TABLE service_tickets ADD CONSTRAINT service_tickets_priority_check 
  CHECK (priority IN ('low','medium','high','critical','urgent'));

-- 3. Enhance service_tickets columns
ALTER TABLE service_tickets ADD COLUMN IF NOT EXISTS ticket_number text;
ALTER TABLE service_tickets ADD COLUMN IF NOT EXISTS contact_phone text;
ALTER TABLE service_tickets ADD COLUMN IF NOT EXISTS contact_email text;
ALTER TABLE service_tickets ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES orders(id) ON DELETE SET NULL;
ALTER TABLE service_tickets ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES products(id) ON DELETE SET NULL;
ALTER TABLE service_tickets ADD COLUMN IF NOT EXISTS equipment_serial_id uuid REFERENCES equipment_serial_numbers(id) ON DELETE SET NULL;
ALTER TABLE service_tickets ADD COLUMN IF NOT EXISTS issue_category text DEFAULT 'other';
ALTER TABLE service_tickets ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- Synchronize ticket_number and ticket_code
UPDATE service_tickets SET ticket_number = ticket_code WHERE ticket_number IS NULL AND ticket_code IS NOT NULL;
UPDATE service_tickets SET ticket_code = ticket_number WHERE ticket_code IS NULL AND ticket_number IS NOT NULL;

-- 4. Extend service_ticket_updates
ALTER TABLE service_ticket_updates ADD COLUMN IF NOT EXISTS is_internal boolean NOT NULL DEFAULT false;

-- 5. Extend warranties table
ALTER TABLE warranties DROP CONSTRAINT IF EXISTS warranties_status_check;
ALTER TABLE warranties ADD CONSTRAINT warranties_status_check 
  CHECK (status IN ('active','expired','pending_activation','claim_under_review','voided','claimed'));

ALTER TABLE warranties ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES products(id) ON DELETE SET NULL;
ALTER TABLE warranties ADD COLUMN IF NOT EXISTS delivery_id uuid REFERENCES equipment_deliveries(id) ON DELETE SET NULL;

-- 6. Extend warranty_claims table
ALTER TABLE warranty_claims ADD COLUMN IF NOT EXISTS ticket_id uuid REFERENCES service_tickets(id) ON DELETE SET NULL;
ALTER TABLE warranty_claims ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE warranty_claims ADD COLUMN IF NOT EXISTS evidence_notes text;
ALTER TABLE warranty_claims ADD COLUMN IF NOT EXISTS evidence_urls text[];

-- 7. Extend repair_assignments table
ALTER TABLE repair_assignments ADD COLUMN IF NOT EXISTS investigation_findings text;
ALTER TABLE repair_assignments ADD COLUMN IF NOT EXISTS repair_actions text;
ALTER TABLE repair_assignments ADD COLUMN IF NOT EXISTS outcome text;

-- 8. Extend replacement_records table
ALTER TABLE replacement_records ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE replacement_records ADD COLUMN IF NOT EXISTS warranty_policy_applied text;

-- 9. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_service_tickets_category ON service_tickets(issue_category);
CREATE INDEX IF NOT EXISTS idx_service_tickets_serial ON service_tickets(equipment_serial_id);
CREATE INDEX IF NOT EXISTS idx_service_tickets_order ON service_tickets(order_id);
CREATE INDEX IF NOT EXISTS idx_warranties_serial ON warranties(equipment_serial_id);
CREATE INDEX IF NOT EXISTS idx_warranties_dates ON warranties(start_date, expiry_date);
CREATE INDEX IF NOT EXISTS idx_warranty_claims_status ON warranty_claims(status);

-- 12. Reload schema cache immediately
NOTIFY pgrst, 'reload schema';


--------------------------------------------------------------------------------
-- 003 Warehouse & inventory
--------------------------------------------------------------------------------
-- ==============================================================================
-- Migration: 003_warehouse_inventory_module.sql
-- Description: Enhances products, warehouses, inventory, stock movements,
--              purchase orders, serial numbers, dispatches, and warranties
--              for the SOLVIX Warehouse & Inventory Management Module.
-- ==============================================================================

-- 1. Ensure Solar Product Categories exist
INSERT INTO product_categories (name, code, description)
SELECT v.name, v.code, v.description
FROM (VALUES
  ('Solar Panels', 'SOLAR_PANEL', 'Photovoltaic solar modules (Mono PERC, Bifacial, Poly)'),
  ('Inverters', 'INVERTER', 'Solar inverters (On-grid, Hybrid, Microinverters)'),
  ('Batteries', 'BATTERY', 'Solar energy storage systems (Lithium-ion, LiFePO4, Lead-acid)'),
  ('Mounting Structures', 'STRUCTURE', 'Rooftop and ground mounting structures, HDGI/Aluminum rails and clamps'),
  ('Cables & Wires', 'CABLE', 'Solar DC cables (4 sq mm, 6 sq mm) and AC armored cables'),
  ('Protection Equipment', 'PROTECTION', 'ACDB, DCDB, lightning arresters, surge protection devices, earthing rods'),
  ('Accessories', 'ACCESSORY', 'MC4 connectors, conduits, cable trays, monitoring dongles')
) AS v(name, code, description)
WHERE NOT EXISTS (
  SELECT 1 FROM product_categories c
  WHERE c.code = v.code OR c.name = v.name
);

-- 2. Extend products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS manufacturer text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS purchase_price numeric(12,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS selling_price numeric(12,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
  CHECK (status IN ('active','discontinued','out_of_stock','pre_order'));
ALTER TABLE products ADD COLUMN IF NOT EXISTS wattage_wp numeric(8,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS efficiency_pct numeric(5,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS dimensions text;

-- 3. Extend warehouses table
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS contact_phone text;
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS contact_email text;
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS capacity_sqm numeric(10,2);
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS pincode text;


-- 4. Extend inventory table
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS bin_location text;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS min_threshold numeric(10,2) DEFAULT 5;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS max_capacity numeric(10,2) DEFAULT 1000;

-- 5. Extend stock_movements table
ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS stock_movements_movement_type_check;
ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_movement_type_check
  CHECK (movement_type IN ('stock_in','stock_out','reservation','release','adjustment','transfer','damage','return'));

ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS batch_number text;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS destination_warehouse_id uuid REFERENCES warehouses(id);

-- 6. Extend inventory_reservations
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_status ON inventory_reservations(status);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_product ON inventory_reservations(product_id);

-- 7. Extend purchase_orders & purchase_order_items
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS warehouse_id uuid REFERENCES warehouses(id) ON DELETE SET NULL;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS supplier_phone text;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS supplier_email text;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS tracking_ref text;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS notes text;

-- 8. Extend equipment_serial_numbers
ALTER TABLE equipment_serial_numbers ADD COLUMN IF NOT EXISTS manufacturer text;
ALTER TABLE equipment_serial_numbers ADD COLUMN IF NOT EXISTS qr_code_data text;
ALTER TABLE equipment_serial_numbers ADD COLUMN IF NOT EXISTS registered_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE equipment_serial_numbers ADD COLUMN IF NOT EXISTS dispatch_id uuid;
ALTER TABLE equipment_serial_numbers ADD COLUMN IF NOT EXISTS delivery_date date;
ALTER TABLE equipment_serial_numbers ADD COLUMN IF NOT EXISTS warranty_status text DEFAULT 'pending_delivery'
  CHECK (warranty_status IN ('pending_delivery','active','expired','voided','claimed'));

-- 9. Extend dispatches
ALTER TABLE dispatches ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE dispatches ADD COLUMN IF NOT EXISTS transporter_name text;
ALTER TABLE dispatches ADD COLUMN IF NOT EXISTS tracking_number text;
ALTER TABLE dispatches ADD COLUMN IF NOT EXISTS vehicle_number text;
ALTER TABLE dispatches ADD COLUMN IF NOT EXISTS driver_phone text;
ALTER TABLE dispatches ADD COLUMN IF NOT EXISTS dispatch_document_path text;
ALTER TABLE dispatches ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

-- 10. Extend dispatch_items
ALTER TABLE dispatch_items ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES products(id) ON DELETE SET NULL;

-- 11. Extend equipment_deliveries
ALTER TABLE equipment_deliveries ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES orders(id) ON DELETE SET NULL;
ALTER TABLE equipment_deliveries ADD COLUMN IF NOT EXISTS recipient_name text;
ALTER TABLE equipment_deliveries ADD COLUMN IF NOT EXISTS recipient_phone text;

-- 12. Extend warranties to enforce delivery-triggered start date
ALTER TABLE warranties ADD COLUMN IF NOT EXISTS delivery_id uuid REFERENCES equipment_deliveries(id) ON DELETE SET NULL;
ALTER TABLE warranties ADD COLUMN IF NOT EXISTS activated_at timestamptz;

-- 13. Indexes for fast inventory and serial lookups
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_equipment_serial_numbers_qr ON equipment_serial_numbers(qr_code_data);
CREATE INDEX IF NOT EXISTS idx_dispatches_status ON dispatches(status);
CREATE INDEX IF NOT EXISTS idx_dispatches_code ON dispatches(dispatch_code);
CREATE INDEX IF NOT EXISTS idx_warranties_start_date ON warranties(start_date);
CREATE INDEX IF NOT EXISTS idx_warranties_code ON warranties(warranty_code);


--------------------------------------------------------------------------------
-- 004 Finance, invoices, subsidy
--------------------------------------------------------------------------------
-- ==============================================================================
-- Migration: 004_finance_subsidy_module.sql
-- Description:
--   Accounts, Finance, Project Profitability and Subsidy & Documentation module.
--
--   This migration is ADDITIVE. It reuses and extends the existing tables from
--   solvix_complete_schema.sql (Sections J and K) and 002_quotation_order_module:
--     invoices, invoice_items, payments, expenses, project_costs,
--     technician_payments, financial_transactions, subsidy_applications,
--     subsidy_documents, documents, document_verification_history,
--     orders, customers, installations, activity_logs.
--
--   New tables (no existing equivalent):
--     subsidy_schemes                 - configurable scheme rules, verified by staff
--     subsidy_application_history     - status audit trail for applications
--
--   Accounting rules enforced here:
--     * financial_transactions is append-only (corrections are new rows).
--     * payments are never deleted; they are failed, reversed or refunded.
--     * a payment only counts as COLLECTED once it is 'verified'
--       (gateway verification or authorised manual reconciliation).
--     * all multi-row financial updates run inside a single RPC transaction
--       with row locks on the order / invoice being changed.
--     * every RPC is executable only by service_role (the backend); the backend
--       performs authorisation before calling them.
--
--   Safe to run more than once.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. Sequences and code helper
-- ------------------------------------------------------------------------------
create sequence if not exists solvix_payment_code_seq start 1000;
create sequence if not exists solvix_invoice_code_seq start 1;
create sequence if not exists solvix_expense_code_seq start 1;
create sequence if not exists solvix_tech_payment_code_seq start 1;
create sequence if not exists solvix_txn_code_seq start 1;
create sequence if not exists solvix_subsidy_code_seq start 1;
create sequence if not exists solvix_document_code_seq start 1;

create or replace function solvix_next_code(p_prefix text, p_seq text)
returns text
language sql
volatile
set search_path = public
as $$
  select p_prefix || '-' || to_char(now(), 'YYYY') || '-' ||
         lpad(nextval(p_seq::regclass)::text, 6, '0');
$$;

-- ------------------------------------------------------------------------------
-- 1. Access helpers used by RLS (backend uses service_role and checks again)
-- ------------------------------------------------------------------------------
create or replace function current_user_in_department(p_patterns text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from profiles p
    join departments d on d.id = p.department_id
    where p.auth_user_id = auth.uid()
      and p.is_active = true
      and exists (
        select 1 from unnest(p_patterns) pat
        where lower(d.name) like pat or lower(d.code) like pat
      )
  )
  or exists (
    select 1
    from employee_departments ed
    join profiles p on p.id = ed.employee_id
    join departments d on d.id = ed.department_id
    where p.auth_user_id = auth.uid()
      and p.is_active = true
      and ed.is_approved = true
      and exists (
        select 1 from unnest(p_patterns) pat
        where lower(d.name) like pat or lower(d.code) like pat
      )
  );
$$;

create or replace function is_finance_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(is_admin(), false)
      or current_user_in_department(array['%finance%', '%account%']);
$$;

create or replace function is_subsidy_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(is_admin(), false)
      or current_user_in_department(array['%subsidy%', '%documentation%']);
$$;

-- ------------------------------------------------------------------------------
-- 2. Invoices and invoice items
-- ------------------------------------------------------------------------------
alter table invoices add column if not exists billing_event text not null default 'full';
alter table invoices add column if not exists is_supplementary boolean not null default false;
alter table invoices add column if not exists supplementary_reason text;
alter table invoices add column if not exists subtotal numeric(12,2) not null default 0;
alter table invoices add column if not exists discount_amount numeric(12,2) not null default 0;
alter table invoices add column if not exists tax_amount numeric(12,2) not null default 0;
alter table invoices add column if not exists total_amount numeric(12,2) not null default 0;
alter table invoices add column if not exists amount_paid numeric(12,2) not null default 0;
alter table invoices add column if not exists tax_mode text not null default 'intra_state';
alter table invoices add column if not exists place_of_supply text;
alter table invoices add column if not exists terms text;
alter table invoices add column if not exists discount_reason text;
alter table invoices add column if not exists issued_at timestamptz;
alter table invoices add column if not exists issued_by uuid references profiles(id) on delete set null;
alter table invoices add column if not exists cancelled_at timestamptz;
alter table invoices add column if not exists cancelled_by uuid references profiles(id) on delete set null;
alter table invoices add column if not exists cancellation_reason text;
alter table invoices add column if not exists updated_by uuid references profiles(id) on delete set null;

alter table invoices drop constraint if exists invoices_status_check;
alter table invoices add constraint invoices_status_check
  check (status in (
    'draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled',
    'sent',      -- legacy, treated as issued
    'refunded'   -- legacy
  ));

alter table invoices drop constraint if exists invoices_billing_event_check;
alter table invoices add constraint invoices_billing_event_check
  check (billing_event in ('advance', 'milestone', 'final', 'full', 'service', 'other'));

alter table invoices drop constraint if exists invoices_tax_mode_check;
alter table invoices add constraint invoices_tax_mode_check
  check (tax_mode in ('intra_state', 'inter_state'));

alter table invoices drop constraint if exists invoices_amounts_check;
alter table invoices add constraint invoices_amounts_check
  check (subtotal >= 0 and discount_amount >= 0 and tax_amount >= 0 and total_amount >= 0);

alter table invoice_items add column if not exists product_id uuid references products(id) on delete set null;
alter table invoice_items add column if not exists hsn_code text;
alter table invoice_items add column if not exists tax_rate numeric(5,2) not null default 0;
alter table invoice_items add column if not exists discount_amount numeric(12,2) not null default 0;
alter table invoice_items add column if not exists taxable_value numeric(12,2) not null default 0;
alter table invoice_items add column if not exists sort_order integer not null default 0;

alter table invoice_items drop constraint if exists invoice_items_values_check;
alter table invoice_items add constraint invoice_items_values_check
  check (quantity > 0 and unit_price >= 0 and discount_amount >= 0
         and tax_rate >= 0 and tax_rate <= 100);

create index if not exists idx_invoices_due_date on invoices(due_date);
create index if not exists idx_invoices_issue_date on invoices(issue_date desc);

-- One active (non-cancelled) invoice per order and billing event. A separate
-- invoice for the same event must be explicitly flagged as supplementary
-- with a reason, which is an authorised, audited action.
do $$
begin
  if exists (
    select 1 from invoices
    where order_id is not null and status <> 'cancelled' and is_supplementary = false
    group by order_id, billing_event having count(*) > 1
  ) then
    raise notice 'Skipping uq_invoices_order_billing_event: duplicate invoices exist. Resolve them, then re-run.';
  else
    execute 'create unique index if not exists uq_invoices_order_billing_event
             on invoices(order_id, billing_event)
             where order_id is not null and status <> ''cancelled'' and is_supplementary = false';
  end if;
end $$;

-- ------------------------------------------------------------------------------
-- 3. Payments: invoice link, reconciliation, reversal and duplicate prevention
-- ------------------------------------------------------------------------------
alter table payments add column if not exists invoice_id uuid references invoices(id) on delete restrict;
alter table payments add column if not exists reversal_of uuid references payments(id) on delete restrict;
alter table payments add column if not exists reconciled_by uuid references profiles(id) on delete set null;
alter table payments add column if not exists reconciled_at timestamptz;
alter table payments add column if not exists reconciliation_method text;
alter table payments add column if not exists reconciliation_notes text;
alter table payments add column if not exists bank_reference text;
alter table payments add column if not exists status_reason text;
-- These three are added by 002; repeated here so this migration also works alone.
alter table payments add column if not exists notes text;
alter table payments add column if not exists gateway_verified boolean not null default false;
alter table payments add column if not exists gateway_reference text;
alter table payments add column if not exists status text not null default 'recorded';

alter table payments drop constraint if exists payments_status_check;
alter table payments add constraint payments_status_check
  check (status in ('recorded', 'verified', 'failed', 'refunded', 'reversed'));

alter table payments drop constraint if exists payments_reconciliation_method_check;
alter table payments add constraint payments_reconciliation_method_check
  check (reconciliation_method is null or reconciliation_method in ('manual', 'gateway'));

alter table payments drop constraint if exists payments_amount_positive_check;
alter table payments add constraint payments_amount_positive_check check (amount > 0) not valid;

create index if not exists idx_payments_invoice on payments(invoice_id);
create index if not exists idx_payments_status on payments(status);
create index if not exists idx_payments_reversal_of on payments(reversal_of);

do $$
begin
  if exists (
    select 1 from payments
    where transaction_reference is not null and btrim(transaction_reference) <> ''
      and status not in ('failed', 'reversed')
    group by payment_method, (payment_type = 'refund'), lower(btrim(transaction_reference))
    having count(*) > 1
  ) then
    raise notice 'Skipping uq_payments_reference: duplicate payment references exist. Resolve them, then re-run.';
  else
    execute 'create unique index if not exists uq_payments_reference
             on payments(payment_method, (payment_type = ''refund''), lower(btrim(transaction_reference)))
             where transaction_reference is not null and btrim(transaction_reference) <> ''''
               and status not in (''failed'', ''reversed'')';
  end if;
end $$;

-- ------------------------------------------------------------------------------
-- 4. Ledger: financial_transactions is append-only
-- ------------------------------------------------------------------------------
alter table financial_transactions add column if not exists description text;
alter table financial_transactions add column if not exists order_id uuid references orders(id) on delete set null;
create index if not exists idx_financial_transactions_date on financial_transactions(transaction_date desc);
create index if not exists idx_financial_transactions_reference on financial_transactions(reference_type, reference_id);

create or replace function prevent_financial_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception '% records cannot be % - record a correction, reversal or refund instead.',
    tg_table_name, case tg_op when 'DELETE' then 'deleted' else 'modified' end;
end;
$$;

drop trigger if exists trg_financial_transactions_append_only on financial_transactions;
create trigger trg_financial_transactions_append_only
  before update or delete on financial_transactions
  for each row execute function prevent_financial_mutation();

drop trigger if exists trg_payments_no_delete on payments;
create trigger trg_payments_no_delete
  before delete on payments
  for each row execute function prevent_financial_mutation();

-- Issued invoices are never deleted; they are cancelled.
create or replace function prevent_issued_invoice_delete()
returns trigger
language plpgsql
as $$
begin
  if old.status <> 'draft' then
    raise exception 'Issued invoices cannot be deleted - cancel the invoice instead.';
  end if;
  return old;
end;
$$;

drop trigger if exists trg_invoices_no_delete on invoices;
create trigger trg_invoices_no_delete
  before delete on invoices
  for each row execute function prevent_issued_invoice_delete();

-- Once issued, the billed amounts and parties of an invoice are frozen.
create or replace function protect_issued_invoice()
returns trigger
language plpgsql
as $$
begin
  if old.status <> 'draft' and (
       new.subtotal is distinct from old.subtotal
    or new.discount_amount is distinct from old.discount_amount
    or new.tax_amount is distinct from old.tax_amount
    or new.total_amount is distinct from old.total_amount
    or new.customer_id is distinct from old.customer_id
    or new.order_id is distinct from old.order_id
    or new.invoice_code is distinct from old.invoice_code
  ) then
    raise exception 'Issued invoice amounts cannot be changed - cancel and re-issue instead.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_invoices_protect_issued on invoices;
create trigger trg_invoices_protect_issued
  before update on invoices
  for each row execute function protect_issued_invoice();

create or replace function protect_issued_invoice_items()
returns trigger
language plpgsql
as $$
declare
  v_status text;
begin
  select status into v_status from invoices
  where id = coalesce(new.invoice_id, old.invoice_id);
  if v_status is not null and v_status <> 'draft' then
    raise exception 'Line items of an issued invoice cannot be changed.';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_invoice_items_protect_issued on invoice_items;
create trigger trg_invoice_items_protect_issued
  before insert or update or delete on invoice_items
  for each row execute function protect_issued_invoice_items();

create or replace function finance_ledger_entry(
  p_type text,
  p_amount numeric,
  p_reference_type text,
  p_reference_id uuid,
  p_order_id uuid,
  p_actor_id uuid,
  p_description text,
  p_date timestamptz default now()
)
returns financial_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_t financial_transactions;
begin
  insert into financial_transactions (
    transaction_code, transaction_type, amount, currency, reference_type,
    reference_id, transaction_date, recorded_by, description, order_id
  ) values (
    solvix_next_code('TXN', 'solvix_txn_code_seq'), p_type, round(p_amount, 2), 'INR',
    p_reference_type, p_reference_id, coalesce(p_date, now()), p_actor_id,
    p_description, p_order_id
  ) returning * into v_t;
  return v_t;
end;
$$;

-- ------------------------------------------------------------------------------
-- 5. Expenses
-- ------------------------------------------------------------------------------
alter table expenses add column if not exists vendor_name text;
alter table expenses add column if not exists vendor_invoice_number text;
alter table expenses add column if not exists approval_status text not null default 'pending';
alter table expenses add column if not exists approved_by uuid references profiles(id) on delete set null;
alter table expenses add column if not exists approved_at timestamptz;
alter table expenses add column if not exists review_notes text;
alter table expenses add column if not exists document_id uuid references documents(id) on delete set null;
alter table expenses add column if not exists installation_id uuid references installations(id) on delete set null;
alter table expenses add column if not exists payment_method text;
alter table expenses add column if not exists updated_by uuid references profiles(id) on delete set null;
alter table expenses add column if not exists voided_by uuid references profiles(id) on delete set null;
alter table expenses add column if not exists voided_at timestamptz;
alter table expenses add column if not exists void_reason text;

alter table expenses drop constraint if exists expenses_category_check;
alter table expenses add constraint expenses_category_check
  check (category in (
    'purchase', 'transportation', 'installation_labour', 'technician_payment',
    'maintenance', 'office', 'other',
    -- legacy values from the initial schema
    'equipment_purchase', 'labour', 'logistics', 'utilities', 'marketing'
  ));

alter table expenses drop constraint if exists expenses_approval_status_check;
alter table expenses add constraint expenses_approval_status_check
  check (approval_status in ('pending', 'approved', 'rejected', 'void'));

alter table expenses drop constraint if exists expenses_amount_positive_check;
alter table expenses add constraint expenses_amount_positive_check check (amount > 0) not valid;

-- expenses.project_id already exists without a foreign key. A project in
-- SOLVIX is an order, so link it (NOT VALID keeps any historical rows intact).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'expenses_project_id_fkey'
  ) then
    alter table expenses
      add constraint expenses_project_id_fkey
      foreign key (project_id) references orders(id) on delete set null not valid;
  end if;
end $$;

create index if not exists idx_expenses_approval_status on expenses(approval_status);
create index if not exists idx_expenses_incurred_date on expenses(incurred_date desc);

drop trigger if exists trg_expenses_no_delete on expenses;
create trigger trg_expenses_no_delete
  before delete on expenses
  for each row execute function prevent_financial_mutation();

-- ------------------------------------------------------------------------------
-- 6. Project costs: single source of truth for per-project cost
-- ------------------------------------------------------------------------------
alter table project_costs add column if not exists source_type text not null default 'manual';
alter table project_costs add column if not exists source_id uuid;
alter table project_costs add column if not exists description text;
alter table project_costs add column if not exists created_by uuid references profiles(id) on delete set null;
alter table project_costs add column if not exists is_void boolean not null default false;
alter table project_costs add column if not exists voided_by uuid references profiles(id) on delete set null;
alter table project_costs add column if not exists voided_at timestamptz;
alter table project_costs add column if not exists void_reason text;

alter table project_costs drop constraint if exists project_costs_source_type_check;
alter table project_costs add constraint project_costs_source_type_check
  check (source_type in ('manual', 'expense', 'technician_payment', 'dispatch'));

alter table project_costs drop constraint if exists project_costs_amount_positive_check;
alter table project_costs add constraint project_costs_amount_positive_check check (amount > 0) not valid;

create unique index if not exists uq_project_costs_source
  on project_costs(source_type, source_id)
  where source_id is not null and is_void = false;

drop trigger if exists trg_project_costs_no_delete on project_costs;
create trigger trg_project_costs_no_delete
  before delete on project_costs
  for each row execute function prevent_financial_mutation();

-- ------------------------------------------------------------------------------
-- 7. Technician payments
-- ------------------------------------------------------------------------------
alter table technician_payments add column if not exists payment_code text;
alter table technician_payments add column if not exists installation_id uuid references installations(id) on delete set null;
alter table technician_payments add column if not exists status text not null default 'paid';
alter table technician_payments add column if not exists period_start date;
alter table technician_payments add column if not exists period_end date;
alter table technician_payments add column if not exists notes text;
alter table technician_payments add column if not exists approved_by uuid references profiles(id) on delete set null;
alter table technician_payments add column if not exists approved_at timestamptz;
alter table technician_payments add column if not exists paid_by uuid references profiles(id) on delete set null;
alter table technician_payments add column if not exists status_reason text;
alter table technician_payments add column if not exists updated_by uuid references profiles(id) on delete set null;
alter table technician_payments add column if not exists updated_at timestamptz not null default now();
-- A pending payment has not been paid yet, so it has no payment date.
alter table technician_payments alter column paid_at drop not null;

alter table technician_payments drop constraint if exists technician_payments_status_check;
alter table technician_payments add constraint technician_payments_status_check
  check (status in ('pending', 'approved', 'paid', 'cancelled', 'reversed'));

alter table technician_payments drop constraint if exists technician_payments_payment_method_check;
alter table technician_payments add constraint technician_payments_payment_method_check
  check (payment_method in ('cash', 'bank_transfer', 'upi', 'cheque', 'other'));

alter table technician_payments drop constraint if exists technician_payments_amount_positive_check;
alter table technician_payments add constraint technician_payments_amount_positive_check check (amount > 0) not valid;

create unique index if not exists uq_technician_payments_code
  on technician_payments(payment_code) where payment_code is not null;
create index if not exists idx_technician_payments_installation on technician_payments(installation_id);
create index if not exists idx_technician_payments_status on technician_payments(status);

drop trigger if exists trg_technician_payments_updated_at on technician_payments;
create trigger trg_technician_payments_updated_at
  before update on technician_payments
  for each row execute function set_updated_at();

drop trigger if exists trg_technician_payments_no_delete on technician_payments;
create trigger trg_technician_payments_no_delete
  before delete on technician_payments
  for each row execute function prevent_financial_mutation();

-- ------------------------------------------------------------------------------
-- 8. Subsidy schemes, applications, history and documents
-- ------------------------------------------------------------------------------
create table if not exists subsidy_schemes (
  id uuid primary key default gen_random_uuid(),
  scheme_code text unique not null,
  name text not null,
  authority text,
  description text,
  -- Human-readable rules exactly as verified from the official source.
  eligibility_rules text,
  min_capacity_kw numeric(8,2),
  max_capacity_kw numeric(8,2),
  customer_types text[] not null default '{}'::text[],
  -- [{ "type": "electricity_bill", "label": "Latest electricity bill", "required": true }]
  required_documents jsonb not null default '[]'::jsonb,
  official_source_url text,
  rules_verified_by uuid references profiles(id) on delete set null,
  rules_verified_at timestamptz,
  verification_notes text,
  is_active boolean not null default true,
  created_by uuid references profiles(id) on delete set null,
  updated_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (min_capacity_kw is null or min_capacity_kw >= 0),
  check (max_capacity_kw is null or max_capacity_kw >= 0),
  check (jsonb_typeof(required_documents) = 'array')
);

drop trigger if exists trg_subsidy_schemes_updated_at on subsidy_schemes;
create trigger trg_subsidy_schemes_updated_at
  before update on subsidy_schemes
  for each row execute function set_updated_at();

alter table subsidy_applications add column if not exists scheme_id uuid references subsidy_schemes(id) on delete restrict;
alter table subsidy_applications add column if not exists installation_id uuid references installations(id) on delete set null;
alter table subsidy_applications add column if not exists system_capacity_kw numeric(8,2);
alter table subsidy_applications add column if not exists application_reference text;
alter table subsidy_applications add column if not exists assigned_to uuid references profiles(id) on delete set null;
alter table subsidy_applications add column if not exists rejection_reason text;
alter table subsidy_applications add column if not exists last_status_change_at timestamptz;
alter table subsidy_applications add column if not exists created_by uuid references profiles(id) on delete set null;
alter table subsidy_applications add column if not exists updated_by uuid references profiles(id) on delete set null;
-- The subsidy amount is unknown until the authority decides; never default it.
alter table subsidy_applications alter column amount_applied drop not null;

alter table subsidy_applications drop constraint if exists subsidy_applications_status_check;
alter table subsidy_applications add constraint subsidy_applications_status_check
  check (status in (
    'draft', 'documents_required', 'ready_for_submission', 'submitted',
    'under_review', 'approved', 'rejected', 'completed',
    'disbursed'  -- legacy
  ));

create index if not exists idx_subsidy_applications_assigned on subsidy_applications(assigned_to);
create index if not exists idx_subsidy_applications_order on subsidy_applications(order_id);

do $$
begin
  if exists (
    select 1 from subsidy_applications
    where order_id is not null and scheme_id is not null and status <> 'rejected'
    group by order_id, scheme_id having count(*) > 1
  ) then
    raise notice 'Skipping uq_subsidy_applications_order_scheme: duplicates exist.';
  else
    execute 'create unique index if not exists uq_subsidy_applications_order_scheme
             on subsidy_applications(order_id, scheme_id)
             where order_id is not null and scheme_id is not null and status <> ''rejected''';
  end if;
end $$;

create unique index if not exists uq_subsidy_applications_reference
  on subsidy_applications(scheme_id, lower(btrim(application_reference)))
  where application_reference is not null and btrim(application_reference) <> '';

create table if not exists subsidy_application_history (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references subsidy_applications(id) on delete restrict,
  from_status text,
  to_status text not null,
  changed_by uuid references profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists idx_subsidy_application_history_app
  on subsidy_application_history(application_id, created_at desc);

alter table documents add column if not exists storage_bucket text;
alter table documents add column if not exists original_filename text;

alter table subsidy_documents add column if not exists document_id uuid references documents(id) on delete restrict;
alter table subsidy_documents add column if not exists verification_status text not null default 'pending';
alter table subsidy_documents add column if not exists reviewer_comments text;
alter table subsidy_documents add column if not exists verified_by uuid references profiles(id) on delete set null;
alter table subsidy_documents add column if not exists verified_at timestamptz;
alter table subsidy_documents add column if not exists is_sensitive boolean not null default false;
alter table subsidy_documents add column if not exists is_current boolean not null default true;
alter table subsidy_documents add column if not exists superseded_by uuid references subsidy_documents(id) on delete set null;
alter table subsidy_documents add column if not exists mime_type text;
alter table subsidy_documents add column if not exists file_size_bytes bigint;
alter table subsidy_documents add column if not exists original_filename text;

alter table subsidy_documents drop constraint if exists subsidy_documents_verification_status_check;
alter table subsidy_documents add constraint subsidy_documents_verification_status_check
  check (verification_status in ('pending', 'verified', 'rejected', 'requires_resubmission'));

create index if not exists idx_subsidy_documents_status on subsidy_documents(verification_status);

-- ------------------------------------------------------------------------------
-- 9. Private storage buckets (no storage.objects policies are created, so only
--    the service role - i.e. the authorised backend - can read or write them;
--    users receive short-lived signed URLs after an authorisation check).
-- ------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('subsidy-documents', 'subsidy-documents', false, 10485760,
   array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  ('finance-documents', 'finance-documents', false, 10485760,
   array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ------------------------------------------------------------------------------
-- 10. Shared recalculation helpers
-- ------------------------------------------------------------------------------

-- Order totals as maintained by the sales module (advance_paid / balance_due).
-- Failed and reversed payments are excluded. Unreconciled ('recorded')
-- payments still count here for compatibility with the sales workflow; the
-- finance module reports them separately as "awaiting reconciliation".
create or replace function recalc_order_payment_totals(p_order_id uuid, p_actor_id uuid)
returns orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_o orders;
  v_paid numeric;
  v_status text;
begin
  select * into v_o from orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found.';
  end if;

  select coalesce(sum(case when payment_type = 'refund' then -amount else amount end), 0)
    into v_paid
  from payments
  where order_id = p_order_id
    and status not in ('failed', 'reversed');

  v_status := case
    when v_paid <= 0 and exists (
      select 1 from payments where order_id = p_order_id and payment_type = 'refund'
        and status not in ('failed', 'reversed')
    ) then 'refunded'
    when v_paid >= v_o.total_amount and v_o.total_amount > 0 then 'paid'
    when v_paid > 0 then 'partial'
    else 'pending'
  end;

  update orders
  set advance_paid = greatest(v_paid, 0),
      balance_due = greatest(v_o.total_amount - greatest(v_paid, 0), 0),
      payment_status = v_status,
      updated_at = now(),
      updated_by = coalesce(p_actor_id, updated_by)
  where id = p_order_id
  returning * into v_o;

  return v_o;
end;
$$;

-- Invoice amount_paid counts VERIFIED payments only (collected money).
create or replace function finance_refresh_invoice(p_invoice_id uuid, p_actor_id uuid default null)
returns invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  v_i invoices;
  v_paid numeric;
  v_status text;
begin
  select * into v_i from invoices where id = p_invoice_id for update;
  if not found then
    raise exception 'Invoice not found.';
  end if;

  select coalesce(sum(case when payment_type = 'refund' then -amount else amount end), 0)
    into v_paid
  from payments
  where invoice_id = p_invoice_id
    and status = 'verified';

  v_status := case
    when v_i.status in ('draft', 'cancelled') then v_i.status
    when v_i.total_amount > 0 and v_paid >= v_i.total_amount - 0.005 then 'paid'
    when v_i.due_date is not null and v_i.due_date < current_date then 'overdue'
    when v_paid > 0 then 'partially_paid'
    else 'issued'
  end;

  update invoices
  set amount_paid = greatest(v_paid, 0),
      status = v_status,
      updated_at = now(),
      updated_by = coalesce(p_actor_id, updated_by)
  where id = p_invoice_id
  returning * into v_i;

  return v_i;
end;
$$;

-- Persist 'overdue' for invoices whose due date has passed. Safe to schedule
-- daily (e.g. pg_cron: select finance_mark_overdue_invoices();).
create or replace function finance_mark_overdue_invoices()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update invoices
  set status = 'overdue', updated_at = now()
  where status in ('issued', 'sent', 'partially_paid')
    and due_date is not null
    and due_date < current_date
    and amount_paid < total_amount - 0.005;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Redefine the sales payment RPC (same signature) so failed / reversed
-- payments are excluded and order totals use the shared helper.
create or replace function record_order_payment(
  p_order_id uuid,
  p_actor_id uuid,
  p_amount numeric,
  p_payment_type text,
  p_payment_method text,
  p_transaction_reference text,
  p_paid_at timestamptz,
  p_notes text,
  p_gateway_verified boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_o orders;
  v_p payments;
  v_paid numeric;
  v_prev_order_status text;
begin
  select * into v_o from orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found.';
  end if;
  if v_o.status in ('cancelled', 'refunded') then
    raise exception 'Cannot record a payment against a cancelled or refunded order.';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be greater than zero.';
  end if;
  if p_payment_type not in ('advance', 'partial', 'full', 'refund') then
    raise exception 'Invalid payment type.';
  end if;
  if p_payment_method not in ('cash', 'cheque', 'bank_transfer', 'upi', 'card', 'finance', 'other') then
    raise exception 'Invalid payment method.';
  end if;

  if p_transaction_reference is not null and btrim(p_transaction_reference) <> '' and exists (
    select 1 from payments
    where payment_method = p_payment_method
      and (payment_type = 'refund') = (p_payment_type = 'refund')
      and lower(btrim(transaction_reference)) = lower(btrim(p_transaction_reference))
      and status not in ('failed', 'reversed')
  ) then
    raise exception 'A payment with this reference has already been recorded.';
  end if;

  select coalesce(sum(case when payment_type = 'refund' then -amount else amount end), 0)
    into v_paid
  from payments
  where order_id = p_order_id and status not in ('failed', 'reversed');

  if p_payment_type = 'refund' then
    if p_amount > v_paid then
      raise exception 'Refund exceeds recorded payments.';
    end if;
  elsif v_paid + p_amount > v_o.total_amount + 0.01 then
    raise exception 'Payment exceeds the remaining order balance.';
  end if;

  insert into payments (
    payment_code, order_id, customer_id, amount, payment_type,
    payment_method, transaction_reference, paid_at, recorded_by,
    notes, gateway_verified, status
  ) values (
    solvix_next_code('PAY', 'solvix_payment_code_seq'), p_order_id, v_o.customer_id, p_amount,
    p_payment_type, p_payment_method, nullif(btrim(p_transaction_reference), ''),
    coalesce(p_paid_at, now()), p_actor_id, p_notes, coalesce(p_gateway_verified, false),
    case when coalesce(p_gateway_verified, false) then 'verified' else 'recorded' end
  ) returning * into v_p;

  v_prev_order_status := v_o.status;
  v_o := recalc_order_payment_totals(p_order_id, p_actor_id);

  if v_prev_order_status = 'pending_payment' and v_o.payment_status in ('partial', 'paid') then
    update orders set status = 'confirmed', updated_at = now(), updated_by = p_actor_id
    where id = p_order_id
    returning * into v_o;
    insert into order_status_history (order_id, previous_status, new_status, changed_by, notes)
    values (p_order_id, 'pending_payment', 'confirmed', p_actor_id, 'Order confirmed on recorded payment');
  end if;

  if v_p.status = 'verified' then
    perform finance_ledger_entry('payment_received', v_p.amount, 'payment', v_p.id,
      p_order_id, p_actor_id, 'Gateway-verified payment ' || v_p.payment_code, v_p.paid_at);
  end if;

  return jsonb_build_object('payment', to_jsonb(v_p), 'order', to_jsonb(v_o));
end;
$$;

-- ------------------------------------------------------------------------------
-- 11. Invoice RPCs
-- ------------------------------------------------------------------------------

-- Replace the items of a draft invoice and recompute its totals. Totals are
-- always computed here from quantity, unit price, discount and tax rate;
-- client-supplied totals are ignored.
create or replace function finance_write_invoice_items(p_invoice_id uuid, p_items jsonb)
returns invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_idx integer := 0;
  v_qty numeric;
  v_unit numeric;
  v_disc numeric;
  v_rate numeric;
  v_gross numeric;
  v_taxable numeric;
  v_tax numeric;
  v_i invoices;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'An invoice needs at least one line item.';
  end if;

  delete from invoice_items where invoice_id = p_invoice_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_idx := v_idx + 1;
    v_qty := (v_item->>'quantity')::numeric;
    v_unit := (v_item->>'unit_price')::numeric;
    v_disc := coalesce((v_item->>'discount_amount')::numeric, 0);
    v_rate := coalesce((v_item->>'tax_rate')::numeric, 0);

    if coalesce(btrim(v_item->>'line_item'), '') = '' then
      raise exception 'Line % needs a description.', v_idx;
    end if;
    if v_qty is null or v_qty <= 0 then
      raise exception 'Line % quantity must be greater than zero.', v_idx;
    end if;
    if v_unit is null or v_unit < 0 then
      raise exception 'Line % unit price cannot be negative.', v_idx;
    end if;
    if v_rate < 0 or v_rate > 100 then
      raise exception 'Line % tax rate must be between 0 and 100.', v_idx;
    end if;

    v_gross := round(v_qty * v_unit, 2);
    if v_disc < 0 or v_disc > v_gross then
      raise exception 'Line % discount must be between 0 and the line amount.', v_idx;
    end if;
    v_taxable := round(v_gross - v_disc, 2);
    v_tax := round(v_taxable * v_rate / 100, 2);

    insert into invoice_items (
      invoice_id, line_item, quantity, unit_price, discount_amount, taxable_value,
      tax_rate, tax_amount, total_price, hsn_code, product_id, sort_order
    ) values (
      p_invoice_id, btrim(v_item->>'line_item'), v_qty, v_unit, round(v_disc, 2), v_taxable,
      v_rate, v_tax, v_taxable + v_tax, nullif(btrim(v_item->>'hsn_code'), ''),
      nullif(v_item->>'product_id', '')::uuid, v_idx
    );
  end loop;

  update invoices i
  set subtotal = s.subtotal,
      discount_amount = s.discount,
      tax_amount = s.tax,
      total_amount = s.total,
      updated_at = now()
  from (
    select coalesce(sum(round(quantity * unit_price, 2)), 0) as subtotal,
           coalesce(sum(discount_amount), 0) as discount,
           coalesce(sum(tax_amount), 0) as tax,
           coalesce(sum(total_price), 0) as total
    from invoice_items where invoice_id = p_invoice_id
  ) s
  where i.id = p_invoice_id
  returning i.* into v_i;

  if v_i.total_amount <= 0 then
    raise exception 'Invoice total must be greater than zero.';
  end if;

  return v_i;
end;
$$;

-- Guard against billing more than the order value across all active invoices.
create or replace function finance_assert_order_not_overbilled(p_order_id uuid, p_invoice_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_total numeric;
  v_billed numeric;
  v_this_supp boolean;
begin
  if p_order_id is null then
    return;
  end if;
  select is_supplementary into v_this_supp from invoices where id = p_invoice_id;
  if coalesce(v_this_supp, false) then
    return; -- supplementary invoices are separately authorised extra billing
  end if;
  select total_amount into v_order_total from orders where id = p_order_id;
  select coalesce(sum(total_amount), 0) into v_billed
  from invoices
  where order_id = p_order_id
    and status <> 'cancelled'
    and is_supplementary = false;
  if v_billed > v_order_total + 0.01 then
    raise exception 'Invoices for this order (INR %) would exceed the order value (INR %). Use a supplementary invoice for authorised extra billing.',
      round(v_billed, 2), round(v_order_total, 2);
  end if;
end;
$$;

create or replace function finance_create_invoice(
  p_actor_id uuid,
  p_header jsonb,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_o orders;
  v_i invoices;
  v_order_id uuid := nullif(p_header->>'order_id', '')::uuid;
  v_customer_id uuid := nullif(p_header->>'customer_id', '')::uuid;
  v_event text := coalesce(nullif(p_header->>'billing_event', ''), 'full');
  v_supp boolean := coalesce((p_header->>'is_supplementary')::boolean, false);
begin
  if v_order_id is not null then
    -- Serialise invoice creation per order.
    select * into v_o from orders where id = v_order_id for update;
    if not found then
      raise exception 'Order not found.';
    end if;
    if v_o.status = 'cancelled' then
      raise exception 'Cannot invoice a cancelled order.';
    end if;
    if v_customer_id is not null and v_customer_id <> v_o.customer_id then
      raise exception 'Customer does not match the order.';
    end if;
    v_customer_id := v_o.customer_id;

    if not v_supp and exists (
      select 1 from invoices
      where order_id = v_order_id and billing_event = v_event
        and status <> 'cancelled' and is_supplementary = false
    ) then
      raise exception 'DUPLICATE_INVOICE: an active % invoice already exists for this order.', v_event;
    end if;
  end if;

  if v_customer_id is null then
    raise exception 'Customer is required.';
  end if;
  if v_supp and coalesce(btrim(p_header->>'supplementary_reason'), '') = '' then
    raise exception 'A reason is required for a supplementary invoice.';
  end if;

  insert into invoices (
    invoice_code, order_id, customer_id, status, issue_date, due_date, currency,
    notes, terms, billing_event, is_supplementary, supplementary_reason, tax_mode,
    place_of_supply, discount_reason, created_by, updated_by
  ) values (
    -- Final, gap-free invoice numbers are assigned on issue.
    'DRAFT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
    v_order_id, v_customer_id, 'draft',
    coalesce(nullif(p_header->>'issue_date', '')::date, current_date),
    nullif(p_header->>'due_date', '')::date, 'INR',
    nullif(btrim(p_header->>'notes'), ''), nullif(btrim(p_header->>'terms'), ''),
    v_event, v_supp, nullif(btrim(p_header->>'supplementary_reason'), ''),
    coalesce(nullif(p_header->>'tax_mode', ''), 'intra_state'),
    nullif(btrim(p_header->>'place_of_supply'), ''),
    nullif(btrim(p_header->>'discount_reason'), ''),
    p_actor_id, p_actor_id
  ) returning * into v_i;

  if v_i.due_date is not null and v_i.due_date < v_i.issue_date then
    raise exception 'Due date cannot be before the invoice date.';
  end if;

  v_i := finance_write_invoice_items(v_i.id, p_items);
  perform finance_assert_order_not_overbilled(v_order_id, v_i.id);

  return to_jsonb(v_i);
end;
$$;

create or replace function finance_update_draft_invoice(
  p_actor_id uuid,
  p_invoice_id uuid,
  p_header jsonb,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_i invoices;
begin
  select * into v_i from invoices where id = p_invoice_id for update;
  if not found then
    raise exception 'Invoice not found.';
  end if;
  if v_i.status <> 'draft' then
    raise exception 'Only draft invoices can be edited. Cancel and re-issue to correct an issued invoice.';
  end if;
  if v_i.order_id is not null then
    perform 1 from orders where id = v_i.order_id for update;
  end if;

  update invoices
  set issue_date = coalesce(nullif(p_header->>'issue_date', '')::date, issue_date),
      due_date = case when p_header ? 'due_date' then nullif(p_header->>'due_date', '')::date else due_date end,
      notes = case when p_header ? 'notes' then nullif(btrim(p_header->>'notes'), '') else notes end,
      terms = case when p_header ? 'terms' then nullif(btrim(p_header->>'terms'), '') else terms end,
      tax_mode = coalesce(nullif(p_header->>'tax_mode', ''), tax_mode),
      place_of_supply = case when p_header ? 'place_of_supply' then nullif(btrim(p_header->>'place_of_supply'), '') else place_of_supply end,
      discount_reason = case when p_header ? 'discount_reason' then nullif(btrim(p_header->>'discount_reason'), '') else discount_reason end,
      updated_by = p_actor_id,
      updated_at = now()
  where id = p_invoice_id
  returning * into v_i;

  if v_i.due_date is not null and v_i.due_date < v_i.issue_date then
    raise exception 'Due date cannot be before the invoice date.';
  end if;

  if p_items is not null then
    v_i := finance_write_invoice_items(p_invoice_id, p_items);
    perform finance_assert_order_not_overbilled(v_i.order_id, v_i.id);
  end if;

  return to_jsonb(v_i);
end;
$$;

create or replace function finance_issue_invoice(p_actor_id uuid, p_invoice_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_i invoices;
begin
  select * into v_i from invoices where id = p_invoice_id for update;
  if not found then
    raise exception 'Invoice not found.';
  end if;
  if v_i.status <> 'draft' then
    raise exception 'Only draft invoices can be issued.';
  end if;
  if v_i.total_amount <= 0 then
    raise exception 'Invoice total must be greater than zero.';
  end if;
  if v_i.order_id is not null then
    perform 1 from orders where id = v_i.order_id for update;
    perform finance_assert_order_not_overbilled(v_i.order_id, v_i.id);
  end if;

  update invoices
  set invoice_code = solvix_next_code('INV', 'solvix_invoice_code_seq'),
      status = 'issued',
      issued_at = now(),
      issued_by = p_actor_id,
      updated_by = p_actor_id,
      updated_at = now()
  where id = p_invoice_id;

  -- Payments already allocated (e.g. advances) are reflected immediately.
  v_i := finance_refresh_invoice(p_invoice_id, p_actor_id);
  return to_jsonb(v_i);
end;
$$;

create or replace function finance_cancel_invoice(p_actor_id uuid, p_invoice_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_i invoices;
begin
  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'A cancellation reason is required.';
  end if;
  select * into v_i from invoices where id = p_invoice_id for update;
  if not found then
    raise exception 'Invoice not found.';
  end if;
  if v_i.status = 'cancelled' then
    raise exception 'Invoice is already cancelled.';
  end if;
  if exists (
    select 1 from payments
    where invoice_id = p_invoice_id and status in ('recorded', 'verified')
      and payment_type <> 'refund'
      and amount > coalesce((
        select sum(r.amount) from payments r
        where r.reversal_of = payments.id and r.status in ('recorded', 'verified')
      ), 0)
  ) then
    raise exception 'This invoice has payments allocated. Refund, reverse or re-allocate them before cancelling.';
  end if;

  update invoices
  set status = 'cancelled',
      cancelled_at = now(),
      cancelled_by = p_actor_id,
      cancellation_reason = btrim(p_reason),
      updated_by = p_actor_id,
      updated_at = now()
  where id = p_invoice_id
  returning * into v_i;

  return to_jsonb(v_i);
end;
$$;

-- ------------------------------------------------------------------------------
-- 12. Payment RPCs (record -> reconcile; refund; reverse; allocate)
-- ------------------------------------------------------------------------------
create or replace function finance_invoice_open_balance(p_invoice_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  -- Outstanding after ALL non-failed, non-reversed payments (verified or
  -- awaiting reconciliation) so the same balance cannot be recorded twice.
  select i.total_amount - coalesce((
    select sum(case when p.payment_type = 'refund' then -p.amount else p.amount end)
    from payments p
    where p.invoice_id = i.id and p.status not in ('failed', 'reversed')
  ), 0)
  from invoices i where i.id = p_invoice_id;
$$;

create or replace function finance_record_payment(
  p_actor_id uuid,
  p_order_id uuid,
  p_invoice_id uuid,
  p_amount numeric,
  p_payment_type text,
  p_payment_method text,
  p_transaction_reference text,
  p_paid_at timestamptz,
  p_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_o orders;
  v_i invoices;
  v_p payments;
  v_order_id uuid := p_order_id;
  v_paid numeric;
  v_ref text := nullif(btrim(p_transaction_reference), '');
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be greater than zero.';
  end if;
  if round(p_amount, 2) <> p_amount then
    raise exception 'Payment amount can have at most two decimal places.';
  end if;
  if p_payment_type not in ('advance', 'partial', 'full') then
    raise exception 'Invalid payment type. Use the refund action for refunds.';
  end if;
  if p_payment_method not in ('cash', 'cheque', 'bank_transfer', 'upi', 'card', 'finance', 'other') then
    raise exception 'Invalid payment method.';
  end if;
  if p_payment_method <> 'cash' and v_ref is null then
    raise exception 'A transaction reference is required for non-cash payments.';
  end if;
  if p_paid_at is not null and p_paid_at > now() + interval '1 day' then
    raise exception 'Payment date cannot be in the future.';
  end if;

  if p_invoice_id is not null then
    select * into v_i from invoices where id = p_invoice_id for update;
    if not found then
      raise exception 'Invoice not found.';
    end if;
    if v_i.status in ('draft', 'cancelled') then
      raise exception 'Payments can only be recorded against an issued invoice.';
    end if;
    if v_order_id is not null and v_i.order_id is distinct from v_order_id then
      raise exception 'Invoice does not belong to this order.';
    end if;
    v_order_id := v_i.order_id;
  end if;

  if v_order_id is null then
    raise exception 'An order or an order-linked invoice is required.';
  end if;

  select * into v_o from orders where id = v_order_id for update;
  if not found then
    raise exception 'Order not found.';
  end if;
  if v_o.status in ('cancelled', 'refunded') then
    raise exception 'Cannot record a payment against a cancelled or refunded order.';
  end if;

  if v_ref is not null and exists (
    select 1 from payments
    where payment_method = p_payment_method
      and payment_type <> 'refund'
      and lower(btrim(transaction_reference)) = lower(v_ref)
      and status not in ('failed', 'reversed')
  ) then
    raise exception 'DUPLICATE_PAYMENT: a payment with this % reference has already been recorded.', p_payment_method;
  end if;

  if p_invoice_id is not null and p_amount > finance_invoice_open_balance(p_invoice_id) + 0.005 then
    raise exception 'Payment exceeds the invoice balance (INR %).',
      round(finance_invoice_open_balance(p_invoice_id), 2);
  end if;

  select coalesce(sum(case when payment_type = 'refund' then -amount else amount end), 0)
    into v_paid
  from payments where order_id = v_order_id and status not in ('failed', 'reversed');
  if v_paid + p_amount > v_o.total_amount + 0.01 then
    raise exception 'Payment exceeds the remaining order balance (INR %).',
      round(v_o.total_amount - v_paid, 2);
  end if;

  insert into payments (
    payment_code, order_id, customer_id, invoice_id, amount, payment_type,
    payment_method, transaction_reference, paid_at, recorded_by, notes,
    gateway_verified, status
  ) values (
    solvix_next_code('PAY', 'solvix_payment_code_seq'), v_order_id, v_o.customer_id, p_invoice_id,
    p_amount, p_payment_type, p_payment_method, v_ref, coalesce(p_paid_at, now()),
    p_actor_id, nullif(btrim(p_notes), ''), false, 'recorded'
  ) returning * into v_p;

  v_o := recalc_order_payment_totals(v_order_id, p_actor_id);

  return jsonb_build_object('payment', to_jsonb(v_p), 'order', to_jsonb(v_o));
end;
$$;

create or replace function finance_record_refund(
  p_actor_id uuid,
  p_original_payment_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_transaction_reference text,
  p_paid_at timestamptz,
  p_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_orig payments;
  v_p payments;
  v_o orders;
  v_refunded numeric;
  v_ref text := nullif(btrim(p_transaction_reference), '');
begin
  if coalesce(btrim(p_notes), '') = '' then
    raise exception 'A refund reason is required.';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Refund amount must be greater than zero.';
  end if;
  if p_payment_method not in ('cash', 'cheque', 'bank_transfer', 'upi', 'card', 'finance', 'other') then
    raise exception 'Invalid refund method.';
  end if;
  if p_payment_method <> 'cash' and v_ref is null then
    raise exception 'A transaction reference is required for non-cash refunds.';
  end if;

  select * into v_orig from payments where id = p_original_payment_id for update;
  if not found then
    raise exception 'Original payment not found.';
  end if;
  if v_orig.payment_type = 'refund' then
    raise exception 'A refund cannot itself be refunded.';
  end if;
  if v_orig.status <> 'verified' then
    raise exception 'Only verified (collected) payments can be refunded.';
  end if;

  perform 1 from orders where id = v_orig.order_id for update;

  select coalesce(sum(amount), 0) into v_refunded
  from payments
  where reversal_of = v_orig.id and payment_type = 'refund'
    and status not in ('failed', 'reversed');

  if p_amount > v_orig.amount - v_refunded + 0.005 then
    raise exception 'Refund exceeds the refundable amount (INR %).', round(v_orig.amount - v_refunded, 2);
  end if;

  if v_ref is not null and exists (
    select 1 from payments
    where payment_method = p_payment_method and payment_type = 'refund'
      and lower(btrim(transaction_reference)) = lower(v_ref)
      and status not in ('failed', 'reversed')
  ) then
    raise exception 'DUPLICATE_PAYMENT: a refund with this reference has already been recorded.';
  end if;

  insert into payments (
    payment_code, order_id, customer_id, invoice_id, amount, payment_type,
    payment_method, transaction_reference, paid_at, recorded_by, notes,
    gateway_verified, status, reversal_of
  ) values (
    solvix_next_code('RFD', 'solvix_payment_code_seq'), v_orig.order_id, v_orig.customer_id,
    v_orig.invoice_id, p_amount, 'refund', p_payment_method, v_ref,
    coalesce(p_paid_at, now()), p_actor_id, btrim(p_notes), false, 'recorded', v_orig.id
  ) returning * into v_p;

  v_o := recalc_order_payment_totals(v_orig.order_id, p_actor_id);
  return jsonb_build_object('payment', to_jsonb(v_p), 'order', to_jsonb(v_o));
end;
$$;

-- p_action: 'verify' (recorded -> verified, writes ledger),
--           'fail'   (recorded -> failed; e.g. bounced cheque, not in statement),
--           'reverse'(verified -> reversed; correcting entry in the ledger).
create or replace function finance_reconcile_payment(
  p_actor_id uuid,
  p_payment_id uuid,
  p_action text,
  p_notes text,
  p_bank_reference text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_p payments;
  v_o orders;
  v_i invoices;
  v_type text;
begin
  select * into v_p from payments where id = p_payment_id for update;
  if not found then
    raise exception 'Payment not found.';
  end if;
  perform 1 from orders where id = v_p.order_id for update;

  if p_action = 'verify' then
    if v_p.status <> 'recorded' then
      raise exception 'Only payments awaiting reconciliation can be verified (current status: %).', v_p.status;
    end if;
    if v_p.payment_method <> 'cash' and coalesce(btrim(p_bank_reference), '') = ''
       and coalesce(btrim(p_notes), '') = '' then
      raise exception 'Record the bank statement reference or reconciliation notes.';
    end if;
    update payments
    set status = 'verified',
        reconciled_by = p_actor_id,
        reconciled_at = now(),
        reconciliation_method = 'manual',
        reconciliation_notes = nullif(btrim(p_notes), ''),
        bank_reference = nullif(btrim(p_bank_reference), '')
    where id = p_payment_id
    returning * into v_p;

    v_type := case when v_p.payment_type = 'refund' then 'refund' else 'payment_received' end;
    perform finance_ledger_entry(
      v_type,
      case when v_p.payment_type = 'refund' then -v_p.amount else v_p.amount end,
      'payment', v_p.id, v_p.order_id, p_actor_id,
      initcap(replace(v_type, '_', ' ')) || ' ' || v_p.payment_code || ' reconciled',
      v_p.paid_at
    );

  elsif p_action = 'fail' then
    if v_p.status <> 'recorded' then
      raise exception 'Only payments awaiting reconciliation can be marked failed.';
    end if;
    if coalesce(btrim(p_notes), '') = '' then
      raise exception 'A reason is required to mark a payment as failed.';
    end if;
    update payments
    set status = 'failed',
        status_reason = btrim(p_notes),
        reconciled_by = p_actor_id,
        reconciled_at = now(),
        reconciliation_method = 'manual'
    where id = p_payment_id
    returning * into v_p;

  elsif p_action = 'reverse' then
    if v_p.status <> 'verified' then
      raise exception 'Only verified payments can be reversed.';
    end if;
    if coalesce(btrim(p_notes), '') = '' then
      raise exception 'A reason is required to reverse a payment.';
    end if;
    if v_p.payment_type <> 'refund' and exists (
      select 1 from payments where reversal_of = v_p.id and status in ('recorded', 'verified')
    ) then
      raise exception 'This payment has active refunds. Reverse those first.';
    end if;
    update payments
    set status = 'reversed', status_reason = btrim(p_notes)
    where id = p_payment_id
    returning * into v_p;

    perform finance_ledger_entry(
      'adjustment',
      case when v_p.payment_type = 'refund' then v_p.amount else -v_p.amount end,
      'payment', v_p.id, v_p.order_id, p_actor_id,
      'Reversal of ' || v_p.payment_code || ': ' || btrim(p_notes)
    );
  else
    raise exception 'Invalid reconciliation action.';
  end if;

  v_o := recalc_order_payment_totals(v_p.order_id, p_actor_id);
  if v_p.invoice_id is not null then
    v_i := finance_refresh_invoice(v_p.invoice_id, p_actor_id);
  end if;

  return jsonb_build_object('payment', to_jsonb(v_p), 'order', to_jsonb(v_o),
                            'invoice', case when v_i.id is null then null else to_jsonb(v_i) end);
end;
$$;

create or replace function finance_allocate_payment(p_actor_id uuid, p_payment_id uuid, p_invoice_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_p payments;
  v_i invoices;
begin
  select * into v_p from payments where id = p_payment_id for update;
  if not found then
    raise exception 'Payment not found.';
  end if;
  if v_p.invoice_id is not null then
    raise exception 'Payment is already allocated to an invoice.';
  end if;
  if v_p.payment_type = 'refund' or v_p.status not in ('recorded', 'verified') then
    raise exception 'Only active, non-refund payments can be allocated.';
  end if;

  select * into v_i from invoices where id = p_invoice_id for update;
  if not found then
    raise exception 'Invoice not found.';
  end if;
  if v_i.order_id is distinct from v_p.order_id then
    raise exception 'Invoice and payment belong to different orders.';
  end if;
  if v_i.status in ('draft', 'cancelled') then
    raise exception 'Payments can only be allocated to an issued invoice.';
  end if;
  if v_p.amount > finance_invoice_open_balance(p_invoice_id) + 0.005 then
    raise exception 'Payment exceeds the invoice balance.';
  end if;

  update payments set invoice_id = p_invoice_id where id = p_payment_id returning * into v_p;
  v_i := finance_refresh_invoice(p_invoice_id, p_actor_id);
  return jsonb_build_object('payment', to_jsonb(v_p), 'invoice', to_jsonb(v_i));
end;
$$;

-- ------------------------------------------------------------------------------
-- 13. Expense RPCs
-- ------------------------------------------------------------------------------
create or replace function finance_expense_cost_category(p_category text)
returns text
language sql
immutable
as $$
  select case
    when p_category in ('purchase', 'equipment_purchase') then 'equipment'
    when p_category in ('installation_labour', 'technician_payment', 'labour') then 'labour'
    when p_category in ('transportation', 'logistics') then 'logistics'
    else 'other'
  end;
$$;

create or replace function finance_review_expense(
  p_actor_id uuid,
  p_expense_id uuid,
  p_action text,
  p_notes text,
  p_allow_self_approval boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_e expenses;
begin
  select * into v_e from expenses where id = p_expense_id for update;
  if not found then
    raise exception 'Expense not found.';
  end if;
  if v_e.approval_status <> 'pending' then
    raise exception 'Only pending expenses can be reviewed (current status: %).', v_e.approval_status;
  end if;
  if v_e.created_by = p_actor_id and not coalesce(p_allow_self_approval, false) then
    raise exception 'You cannot review an expense you submitted.';
  end if;

  if p_action = 'approve' then
    update expenses
    set approval_status = 'approved', approved_by = p_actor_id, approved_at = now(),
        review_notes = nullif(btrim(p_notes), ''), updated_by = p_actor_id, updated_at = now()
    where id = p_expense_id
    returning * into v_e;

    perform finance_ledger_entry('expense', -v_e.amount, 'expense', v_e.id, v_e.project_id,
      p_actor_id, 'Approved expense ' || v_e.expense_code, v_e.incurred_date::timestamptz);

    if v_e.project_id is not null then
      insert into project_costs (order_id, cost_category, amount, incurred_date, notes,
                                 source_type, source_id, description, created_by)
      values (v_e.project_id, finance_expense_cost_category(v_e.category), v_e.amount,
              v_e.incurred_date, 'From approved expense ' || v_e.expense_code,
              'expense', v_e.id, v_e.description, p_actor_id);
    end if;
  elsif p_action = 'reject' then
    if coalesce(btrim(p_notes), '') = '' then
      raise exception 'A reason is required to reject an expense.';
    end if;
    update expenses
    set approval_status = 'rejected', approved_by = p_actor_id, approved_at = now(),
        review_notes = btrim(p_notes), updated_by = p_actor_id, updated_at = now()
    where id = p_expense_id
    returning * into v_e;
  else
    raise exception 'Invalid review action.';
  end if;

  return to_jsonb(v_e);
end;
$$;

create or replace function finance_void_expense(p_actor_id uuid, p_expense_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_e expenses;
  v_was text;
begin
  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'A reason is required to void an expense.';
  end if;
  select * into v_e from expenses where id = p_expense_id for update;
  if not found then
    raise exception 'Expense not found.';
  end if;
  if v_e.approval_status = 'void' then
    raise exception 'Expense is already void.';
  end if;
  v_was := v_e.approval_status;

  update expenses
  set approval_status = 'void', voided_by = p_actor_id, voided_at = now(),
      void_reason = btrim(p_reason), updated_by = p_actor_id, updated_at = now()
  where id = p_expense_id
  returning * into v_e;

  if v_was = 'approved' then
    perform finance_ledger_entry('adjustment', v_e.amount, 'expense', v_e.id, v_e.project_id,
      p_actor_id, 'Void of approved expense ' || v_e.expense_code || ': ' || btrim(p_reason));
    update project_costs
    set is_void = true, voided_by = p_actor_id, voided_at = now(), void_reason = btrim(p_reason)
    where source_type = 'expense' and source_id = v_e.id and is_void = false;
  end if;

  return to_jsonb(v_e);
end;
$$;

-- ------------------------------------------------------------------------------
-- 14. Project cost RPCs
-- ------------------------------------------------------------------------------

-- Post the equipment cost of a dispatch (serials x product purchase price).
-- Refuses when any dispatched product has no purchase price recorded, so a
-- missing cost is never silently treated as zero.
create or replace function finance_post_dispatch_cost(p_actor_id uuid, p_dispatch_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_d dispatches;
  v_missing text;
  v_total numeric;
  v_c project_costs;
begin
  select * into v_d from dispatches where id = p_dispatch_id for update;
  if not found then
    raise exception 'Dispatch not found.';
  end if;
  if v_d.status = 'cancelled' then
    raise exception 'Cannot cost a cancelled dispatch.';
  end if;

  select string_agg(distinct pr.name, ', ')
    into v_missing
  from dispatch_items di
  join equipment_serial_numbers esn on esn.id = di.equipment_serial_id
  join products pr on pr.id = esn.product_id
  where di.dispatch_id = p_dispatch_id
    and coalesce(pr.purchase_price, 0) <= 0;

  if v_missing is not null then
    raise exception 'MISSING_COST_PRICE: purchase price not recorded for: %', v_missing;
  end if;

  select coalesce(sum(di.quantity * pr.purchase_price), 0)
    into v_total
  from dispatch_items di
  join equipment_serial_numbers esn on esn.id = di.equipment_serial_id
  join products pr on pr.id = esn.product_id
  where di.dispatch_id = p_dispatch_id;

  if v_total <= 0 then
    raise exception 'Dispatch has no costed items.';
  end if;

  insert into project_costs (order_id, cost_category, amount, incurred_date, notes,
                             source_type, source_id, description, created_by)
  values (v_d.order_id, 'equipment', round(v_total, 2),
          coalesce(v_d.dispatched_at::date, v_d.delivery_date, current_date),
          'Equipment cost from dispatch ' || v_d.dispatch_code || ' at recorded purchase prices',
          'dispatch', v_d.id, 'Dispatched equipment ' || v_d.dispatch_code, p_actor_id)
  returning * into v_c;

  return to_jsonb(v_c);
end;
$$;

create or replace function finance_void_project_cost(p_actor_id uuid, p_cost_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_c project_costs;
begin
  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'A reason is required to void a cost entry.';
  end if;
  select * into v_c from project_costs where id = p_cost_id for update;
  if not found then
    raise exception 'Cost entry not found.';
  end if;
  if v_c.is_void then
    raise exception 'Cost entry is already void.';
  end if;
  if v_c.source_type in ('expense', 'technician_payment') then
    raise exception 'This cost comes from a % record. Void or reverse that record instead.', v_c.source_type;
  end if;
  update project_costs
  set is_void = true, voided_by = p_actor_id, voided_at = now(), void_reason = btrim(p_reason)
  where id = p_cost_id
  returning * into v_c;
  return to_jsonb(v_c);
end;
$$;

-- ------------------------------------------------------------------------------
-- 15. Technician payment RPC
-- ------------------------------------------------------------------------------
-- p_action: approve | pay | cancel | reverse
create or replace function finance_technician_payment_action(
  p_actor_id uuid,
  p_payment_id uuid,
  p_action text,
  p_payload jsonb,
  p_allow_self_approval boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_t technician_payments;
  v_order uuid;
  v_method text;
  v_ref text;
  v_reason text := nullif(btrim(p_payload->>'reason'), '');
begin
  select * into v_t from technician_payments where id = p_payment_id for update;
  if not found then
    raise exception 'Technician payment not found.';
  end if;

  v_order := v_t.order_id;
  if v_order is null and v_t.installation_id is not null then
    select order_id into v_order from installations where id = v_t.installation_id;
  end if;

  if p_action = 'approve' then
    if v_t.status <> 'pending' then
      raise exception 'Only pending technician payments can be approved.';
    end if;
    if v_t.created_by = p_actor_id and not coalesce(p_allow_self_approval, false) then
      raise exception 'You cannot approve a technician payment you created.';
    end if;
    update technician_payments
    set status = 'approved', approved_by = p_actor_id, approved_at = now(), updated_by = p_actor_id
    where id = p_payment_id returning * into v_t;

  elsif p_action = 'pay' then
    if v_t.status <> 'approved' then
      raise exception 'Only approved technician payments can be marked paid.';
    end if;
    v_method := coalesce(nullif(p_payload->>'payment_method', ''), v_t.payment_method);
    v_ref := nullif(btrim(p_payload->>'reference'), '');
    if v_method not in ('cash', 'bank_transfer', 'upi', 'cheque', 'other') then
      raise exception 'Invalid payment method.';
    end if;
    if v_method <> 'cash' and v_ref is null then
      raise exception 'A payment reference is required for non-cash payments.';
    end if;
    if v_ref is not null and exists (
      select 1 from technician_payments
      where id <> p_payment_id and payment_method = v_method
        and lower(btrim(reference)) = lower(v_ref) and status in ('paid')
    ) then
      raise exception 'DUPLICATE_PAYMENT: this payment reference is already used.';
    end if;

    update technician_payments
    set status = 'paid',
        payment_method = v_method,
        reference = v_ref,
        paid_at = coalesce(nullif(p_payload->>'paid_at', '')::timestamptz, now()),
        paid_by = p_actor_id,
        order_id = coalesce(order_id, v_order),
        updated_by = p_actor_id
    where id = p_payment_id returning * into v_t;

    if v_t.paid_at > now() + interval '1 day' then
      raise exception 'Payment date cannot be in the future.';
    end if;

    perform finance_ledger_entry('technician_payment', -v_t.amount, 'technician_payment', v_t.id,
      v_order, p_actor_id, 'Technician payment ' || coalesce(v_t.payment_code, v_t.id::text), v_t.paid_at);

    if v_order is not null and v_t.payment_type in ('labour', 'bonus') then
      insert into project_costs (order_id, cost_category, amount, incurred_date, notes,
                                 source_type, source_id, description, created_by)
      values (v_order, 'labour', v_t.amount, v_t.paid_at::date,
              'From technician payment ' || coalesce(v_t.payment_code, ''),
              'technician_payment', v_t.id, 'Installation labour', p_actor_id);
    end if;

  elsif p_action = 'cancel' then
    if v_t.status not in ('pending', 'approved') then
      raise exception 'Only pending or approved technician payments can be cancelled.';
    end if;
    if v_reason is null then
      raise exception 'A reason is required to cancel.';
    end if;
    update technician_payments
    set status = 'cancelled', status_reason = v_reason, updated_by = p_actor_id
    where id = p_payment_id returning * into v_t;

  elsif p_action = 'reverse' then
    if v_t.status <> 'paid' then
      raise exception 'Only paid technician payments can be reversed.';
    end if;
    if v_reason is null then
      raise exception 'A reason is required to reverse a payment.';
    end if;
    update technician_payments
    set status = 'reversed', status_reason = v_reason, updated_by = p_actor_id
    where id = p_payment_id returning * into v_t;

    perform finance_ledger_entry('adjustment', v_t.amount, 'technician_payment', v_t.id,
      v_order, p_actor_id, 'Reversal of technician payment ' || coalesce(v_t.payment_code, '') || ': ' || v_reason);
    update project_costs
    set is_void = true, voided_by = p_actor_id, voided_at = now(), void_reason = v_reason
    where source_type = 'technician_payment' and source_id = v_t.id and is_void = false;
  else
    raise exception 'Invalid technician payment action.';
  end if;

  return to_jsonb(v_t);
end;
$$;

-- ------------------------------------------------------------------------------
-- 16. Subsidy RPCs
-- ------------------------------------------------------------------------------
create or replace function subsidy_allowed_transition(p_from text, p_to text)
returns boolean
language sql
immutable
as $$
  select case p_from
    when 'draft' then p_to in ('documents_required', 'ready_for_submission')
    when 'documents_required' then p_to in ('draft', 'ready_for_submission')
    when 'ready_for_submission' then p_to in ('documents_required', 'submitted')
    when 'submitted' then p_to in ('under_review', 'documents_required', 'approved', 'rejected')
    when 'under_review' then p_to in ('documents_required', 'approved', 'rejected')
    when 'approved' then p_to in ('completed')
    when 'rejected' then p_to in ('draft')
    else false
  end;
$$;

create or replace function subsidy_missing_documents(p_application_id uuid)
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(req->>'type'), '{}'::text[])
  from subsidy_applications a
  join subsidy_schemes s on s.id = a.scheme_id
  cross join lateral jsonb_array_elements(s.required_documents) req
  where a.id = p_application_id
    and coalesce((req->>'required')::boolean, true)
    and not exists (
      select 1 from subsidy_documents d
      where d.application_id = a.id
        and d.document_type = req->>'type'
        and d.is_current = true
        and d.verification_status = 'verified'
    );
$$;

create or replace function subsidy_create_application(p_actor_id uuid, p_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_a subsidy_applications;
  v_s subsidy_schemes;
  v_customer uuid := nullif(p_data->>'customer_id', '')::uuid;
  v_order uuid := nullif(p_data->>'order_id', '')::uuid;
  v_order_customer uuid;
begin
  select * into v_s from subsidy_schemes where id = nullif(p_data->>'scheme_id', '')::uuid;
  if not found then
    raise exception 'Subsidy scheme not found.';
  end if;
  if not v_s.is_active then
    raise exception 'This subsidy scheme is inactive.';
  end if;

  if v_order is not null then
    select customer_id into v_order_customer from orders where id = v_order for update;
    if not found then
      raise exception 'Order not found.';
    end if;
    if v_customer is not null and v_customer <> v_order_customer then
      raise exception 'Customer does not match the order.';
    end if;
    v_customer := v_order_customer;
    if exists (
      select 1 from subsidy_applications
      where order_id = v_order and scheme_id = v_s.id and status <> 'rejected'
    ) then
      raise exception 'DUPLICATE_APPLICATION: an active application for this order and scheme already exists.';
    end if;
  end if;
  if v_customer is null then
    raise exception 'Customer is required.';
  end if;

  insert into subsidy_applications (
    application_code, customer_id, order_id, installation_id, scheme_id, subsidy_program,
    system_capacity_kw, amount_applied, application_reference, assigned_to, notes,
    status, last_status_change_at, created_by, updated_by
  ) values (
    solvix_next_code('SUB', 'solvix_subsidy_code_seq'), v_customer, v_order,
    nullif(p_data->>'installation_id', '')::uuid, v_s.id, v_s.name,
    nullif(p_data->>'system_capacity_kw', '')::numeric,
    nullif(p_data->>'amount_applied', '')::numeric,
    nullif(btrim(p_data->>'application_reference'), ''),
    nullif(p_data->>'assigned_to', '')::uuid,
    nullif(btrim(p_data->>'notes'), ''),
    'draft', now(), p_actor_id, p_actor_id
  ) returning * into v_a;

  insert into subsidy_application_history (application_id, from_status, to_status, changed_by, notes)
  values (v_a.id, null, 'draft', p_actor_id, 'Application created');

  return to_jsonb(v_a);
end;
$$;

create or replace function subsidy_change_status(
  p_actor_id uuid,
  p_application_id uuid,
  p_to_status text,
  p_notes text,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_a subsidy_applications;
  v_s subsidy_schemes;
  v_from text;
  v_missing text[];
  v_ref text;
begin
  select * into v_a from subsidy_applications where id = p_application_id for update;
  if not found then
    raise exception 'Application not found.';
  end if;
  v_from := v_a.status;

  if not subsidy_allowed_transition(v_from, p_to_status) then
    raise exception 'Cannot move an application from % to %.', v_from, p_to_status;
  end if;

  select * into v_s from subsidy_schemes where id = v_a.scheme_id;

  if p_to_status = 'ready_for_submission' then
    if v_s.id is null then
      raise exception 'Select a subsidy scheme before marking the application ready.';
    end if;
    if v_s.rules_verified_at is null then
      raise exception 'The scheme rules have not been verified against the official source by authorised personnel.';
    end if;
    v_missing := subsidy_missing_documents(p_application_id);
    if array_length(v_missing, 1) > 0 then
      raise exception 'MISSING_DOCUMENTS: required documents not yet verified: %', array_to_string(v_missing, ', ');
    end if;
  end if;

  if p_to_status = 'submitted' then
    v_ref := coalesce(nullif(btrim(p_payload->>'application_reference'), ''), v_a.application_reference);
    if v_ref is null then
      raise exception 'Enter the official application reference issued on submission.';
    end if;
    update subsidy_applications
    set application_reference = v_ref,
        submitted_at = coalesce(nullif(p_payload->>'submission_date', '')::timestamptz, now())
    where id = p_application_id;
  end if;

  if p_to_status = 'approved' then
    if not exists (
      select 1 from subsidy_documents
      where application_id = p_application_id and document_type = 'approval_document'
        and is_current = true and verification_status = 'verified'
    ) then
      raise exception 'Upload and verify the official approval document before marking the application approved.';
    end if;
    update subsidy_applications
    set approved_at = coalesce(nullif(p_payload->>'approval_date', '')::timestamptz, now()),
        amount_approved = case when p_payload ? 'amount_approved'
                               then nullif(p_payload->>'amount_approved', '')::numeric
                               else amount_approved end
    where id = p_application_id;
  end if;

  if p_to_status in ('rejected', 'documents_required') and coalesce(btrim(p_notes), '') = '' then
    raise exception 'A note explaining the reason is required.';
  end if;

  update subsidy_applications
  set status = p_to_status,
      rejection_reason = case when p_to_status = 'rejected' then btrim(p_notes) else rejection_reason end,
      last_status_change_at = now(),
      updated_by = p_actor_id,
      updated_at = now()
  where id = p_application_id
  returning * into v_a;

  insert into subsidy_application_history (application_id, from_status, to_status, changed_by, notes)
  values (p_application_id, v_from, p_to_status, p_actor_id, nullif(btrim(p_notes), ''));

  return to_jsonb(v_a);
end;
$$;

create or replace function subsidy_register_document(
  p_actor_id uuid,
  p_application_id uuid,
  p_document_type text,
  p_storage_bucket text,
  p_storage_path text,
  p_title text,
  p_mime_type text,
  p_file_size bigint,
  p_original_filename text,
  p_is_sensitive boolean,
  p_replaces uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_a subsidy_applications;
  v_doc documents;
  v_sd subsidy_documents;
  v_old subsidy_documents;
begin
  select * into v_a from subsidy_applications where id = p_application_id for update;
  if not found then
    raise exception 'Application not found.';
  end if;
  if v_a.status in ('completed', 'rejected') then
    raise exception 'Documents cannot be added to a % application.', v_a.status;
  end if;

  if p_replaces is not null then
    select * into v_old from subsidy_documents where id = p_replaces for update;
    if not found or v_old.application_id <> p_application_id then
      raise exception 'Document to replace was not found on this application.';
    end if;
  end if;

  insert into documents (
    document_code, customer_id, order_id, installation_id, document_type, title,
    storage_path, storage_bucket, mime_type, file_size_bytes, original_filename, uploaded_by
  ) values (
    solvix_next_code('DOC', 'solvix_document_code_seq'), v_a.customer_id, v_a.order_id,
    v_a.installation_id, p_document_type, p_title, p_storage_path, p_storage_bucket,
    p_mime_type, p_file_size, p_original_filename, p_actor_id
  ) returning * into v_doc;

  insert into subsidy_documents (
    application_id, document_type, storage_path, uploaded_by, document_id,
    verification_status, is_sensitive, is_current, mime_type, file_size_bytes, original_filename
  ) values (
    p_application_id, p_document_type, p_storage_path, p_actor_id, v_doc.id,
    'pending', coalesce(p_is_sensitive, false), true, p_mime_type, p_file_size, p_original_filename
  ) returning * into v_sd;

  insert into document_verification_history (document_id, status, comments)
  values (v_doc.id, 'pending', 'Uploaded');

  if v_old.id is not null then
    update subsidy_documents set is_current = false, superseded_by = v_sd.id where id = v_old.id;
  end if;

  update subsidy_applications set updated_at = now(), updated_by = p_actor_id where id = p_application_id;

  return jsonb_build_object('document', to_jsonb(v_doc), 'subsidy_document', to_jsonb(v_sd));
end;
$$;

create or replace function subsidy_verify_document(
  p_actor_id uuid,
  p_subsidy_document_id uuid,
  p_status text,
  p_comments text,
  p_allow_self boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sd subsidy_documents;
begin
  if p_status not in ('verified', 'rejected', 'requires_resubmission') then
    raise exception 'Invalid verification status.';
  end if;
  if p_status <> 'verified' and coalesce(btrim(p_comments), '') = '' then
    raise exception 'Reviewer comments are required when a document is not verified.';
  end if;

  select * into v_sd from subsidy_documents where id = p_subsidy_document_id for update;
  if not found then
    raise exception 'Document not found.';
  end if;
  if not v_sd.is_current then
    raise exception 'This document has been superseded by a newer upload.';
  end if;
  if v_sd.uploaded_by = p_actor_id and not coalesce(p_allow_self, false) then
    raise exception 'A document must be verified by someone other than the uploader.';
  end if;

  update subsidy_documents
  set verification_status = p_status,
      reviewer_comments = nullif(btrim(p_comments), ''),
      verified_by = p_actor_id,
      verified_at = now()
  where id = p_subsidy_document_id
  returning * into v_sd;

  if v_sd.document_id is not null then
    insert into document_verification_history (document_id, status, verified_by, verified_at, comments)
    values (v_sd.document_id, p_status, p_actor_id, now(), nullif(btrim(p_comments), ''));
  end if;

  return to_jsonb(v_sd);
end;
$$;

-- ------------------------------------------------------------------------------
-- 17. Restrict RPC execution to the backend (service_role)
-- ------------------------------------------------------------------------------
do $$
declare
  fn text;
begin
  foreach fn in array array[
    'solvix_next_code(text,text)',
    'finance_ledger_entry(text,numeric,text,uuid,uuid,uuid,text,timestamptz)',
    'recalc_order_payment_totals(uuid,uuid)',
    'finance_refresh_invoice(uuid,uuid)',
    'finance_mark_overdue_invoices()',
    'record_order_payment(uuid,uuid,numeric,text,text,text,timestamptz,text,boolean)',
    'finance_write_invoice_items(uuid,jsonb)',
    'finance_assert_order_not_overbilled(uuid,uuid)',
    'finance_create_invoice(uuid,jsonb,jsonb)',
    'finance_update_draft_invoice(uuid,uuid,jsonb,jsonb)',
    'finance_issue_invoice(uuid,uuid)',
    'finance_cancel_invoice(uuid,uuid,text)',
    'finance_invoice_open_balance(uuid)',
    'finance_record_payment(uuid,uuid,uuid,numeric,text,text,text,timestamptz,text)',
    'finance_record_refund(uuid,uuid,numeric,text,text,timestamptz,text)',
    'finance_reconcile_payment(uuid,uuid,text,text,text)',
    'finance_allocate_payment(uuid,uuid,uuid)',
    'finance_review_expense(uuid,uuid,text,text,boolean)',
    'finance_void_expense(uuid,uuid,text)',
    'finance_post_dispatch_cost(uuid,uuid)',
    'finance_void_project_cost(uuid,uuid,text)',
    'finance_technician_payment_action(uuid,uuid,text,jsonb,boolean)',
    'subsidy_create_application(uuid,jsonb)',
    'subsidy_change_status(uuid,uuid,text,text,jsonb)',
    'subsidy_register_document(uuid,uuid,text,text,text,text,text,bigint,text,boolean,uuid)',
    'subsidy_verify_document(uuid,uuid,text,text,boolean)',
    'subsidy_missing_documents(uuid)'
  ] loop
    execute format('revoke all on function %s from public', fn);
    execute format('revoke all on function %s from anon', fn);
    execute format('revoke all on function %s from authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;
end $$;

-- ------------------------------------------------------------------------------
-- 18. Row Level Security for finance and subsidy tables
--     (enabled even if disable_all_rls.sql was run previously)
-- ------------------------------------------------------------------------------
alter table invoices enable row level security;
alter table invoice_items enable row level security;
alter table payments enable row level security;
alter table expenses enable row level security;
alter table project_costs enable row level security;
alter table technician_payments enable row level security;
alter table financial_transactions enable row level security;
alter table subsidy_schemes enable row level security;
alter table subsidy_applications enable row level security;
alter table subsidy_application_history enable row level security;
alter table subsidy_documents enable row level security;
alter table documents enable row level security;
alter table document_verification_history enable row level security;

-- Anonymous users never touch financial or subsidy data directly.
revoke all on invoices, invoice_items, payments, expenses, project_costs,
  technician_payments, financial_transactions, subsidy_schemes,
  subsidy_applications, subsidy_application_history, subsidy_documents,
  documents, document_verification_history from anon;

-- Invoices: finance staff manage; customers read their own non-draft invoices.
drop policy if exists invoices_own on invoices;
drop policy if exists invoices_admin_write on invoices;
drop policy if exists invoices_finance_all on invoices;
drop policy if exists invoices_customer_select on invoices;
create policy invoices_finance_all on invoices
  for all using (is_finance_user()) with check (is_finance_user());
create policy invoices_customer_select on invoices
  for select using (customer_id = current_customer_id() and status not in ('draft'));

drop policy if exists invoice_items_own on invoice_items;
drop policy if exists invoice_items_admin_write on invoice_items;
drop policy if exists invoice_items_finance_all on invoice_items;
drop policy if exists invoice_items_customer_select on invoice_items;
create policy invoice_items_finance_all on invoice_items
  for all using (is_finance_user()) with check (is_finance_user());
create policy invoice_items_customer_select on invoice_items
  for select using (exists (
    select 1 from invoices i
    where i.id = invoice_items.invoice_id
      and i.customer_id = current_customer_id() and i.status <> 'draft'
  ));

-- Payments: keep the sales-module policies from 002 and add finance access.
drop policy if exists payments_finance_all on payments;
create policy payments_finance_all on payments
  for all using (is_finance_user()) with check (is_finance_user());

drop policy if exists expenses_admin on expenses;
drop policy if exists expenses_finance_all on expenses;
create policy expenses_finance_all on expenses
  for all using (is_finance_user()) with check (is_finance_user());

drop policy if exists project_costs_admin on project_costs;
drop policy if exists project_costs_finance_all on project_costs;
create policy project_costs_finance_all on project_costs
  for all using (is_finance_user()) with check (is_finance_user());

-- Technician payments: technicians may read their own; finance manages.
drop policy if exists technician_payments_admin_write on technician_payments;
drop policy if exists technician_payments_finance_all on technician_payments;
create policy technician_payments_finance_all on technician_payments
  for all using (is_finance_user()) with check (is_finance_user());

-- Ledger: readable by finance; inserts only via RPC; never updated or deleted.
drop policy if exists financial_transactions_admin on financial_transactions;
drop policy if exists financial_transactions_finance_select on financial_transactions;
create policy financial_transactions_finance_select on financial_transactions
  for select using (is_finance_user());

-- Subsidy schemes: readable by subsidy staff; managed by subsidy staff/admin.
drop policy if exists subsidy_schemes_subsidy_all on subsidy_schemes;
create policy subsidy_schemes_subsidy_all on subsidy_schemes
  for all using (is_subsidy_user()) with check (is_subsidy_user());

drop policy if exists subsidy_applications_own on subsidy_applications;
drop policy if exists subsidy_applications_admin_write on subsidy_applications;
drop policy if exists subsidy_applications_subsidy_all on subsidy_applications;
drop policy if exists subsidy_applications_customer_select on subsidy_applications;
create policy subsidy_applications_subsidy_all on subsidy_applications
  for all using (is_subsidy_user()) with check (is_subsidy_user());
create policy subsidy_applications_customer_select on subsidy_applications
  for select using (customer_id = current_customer_id());

drop policy if exists subsidy_application_history_subsidy_select on subsidy_application_history;
create policy subsidy_application_history_subsidy_select on subsidy_application_history
  for select using (is_subsidy_user());

drop policy if exists subsidy_documents_own on subsidy_documents;
drop policy if exists subsidy_documents_admin_write on subsidy_documents;
drop policy if exists subsidy_documents_subsidy_all on subsidy_documents;
create policy subsidy_documents_subsidy_all on subsidy_documents
  for all using (is_subsidy_user()) with check (is_subsidy_user());

-- Generic documents: the original policy compared customer_id with a profile
-- id; replace it with the customer helper and add department access.
drop policy if exists documents_own on documents;
drop policy if exists documents_customer_select on documents;
drop policy if exists documents_subsidy_select on documents;
drop policy if exists documents_finance_select on documents;
create policy documents_customer_select on documents
  for select using (customer_id = current_customer_id());
create policy documents_subsidy_select on documents
  for select using (is_subsidy_user() and exists (
    select 1 from subsidy_documents sd where sd.document_id = documents.id
  ));
create policy documents_finance_select on documents
  for select using (is_finance_user() and exists (
    select 1 from expenses e where e.document_id = documents.id
  ));

drop policy if exists document_verification_history_subsidy_select on document_verification_history;
create policy document_verification_history_subsidy_select on document_verification_history
  for select using (is_subsidy_user());

grant select, insert, update on invoices, invoice_items, payments, expenses, project_costs,
  technician_payments, subsidy_schemes, subsidy_applications, subsidy_documents
  to authenticated;
grant select on financial_transactions, subsidy_application_history, documents,
  document_verification_history to authenticated;

notify pgrst, 'reload schema';

do $$
begin
  raise notice 'SOLVIX finance and subsidy module migration applied.';
end $$;


--------------------------------------------------------------------------------
-- 5. Final: updated_at triggers, Row Level Security, grants, seed data
--------------------------------------------------------------------------------

-- 5.0 Columns the application code reads/writes that no earlier section defines
alter table site_surveys add column if not exists customer_name text;
alter table site_surveys add column if not exists contact_phone text;
alter table site_surveys add column if not exists contact_email text;
alter table site_surveys add column if not exists shading_conditions text;

-- 5.1 updated_at trigger on every table that has the column
do $$
declare
  rec record;
begin
  for rec in (
    select c.table_name
    from information_schema.columns c
    join information_schema.tables t
      on t.table_name = c.table_name and t.table_schema = c.table_schema
    where c.table_schema = 'public'
      and c.column_name = 'updated_at'
      and t.table_type = 'BASE TABLE'
  ) loop
    execute format('drop trigger if exists trg_%1$s_updated_at on public.%1$I', rec.table_name);
    execute format(
      'create trigger trg_%1$s_updated_at before update on public.%1$I for each row execute function set_updated_at()',
      rec.table_name);
  end loop;
end $$;

-- 5.2 Row Level Security on every table, with an administrator policy.
--     Customer / finance / subsidy / staff policies defined in the sections above are kept.
do $$
declare
  rec record;
begin
  for rec in (select tablename from pg_tables where schemaname = 'public') loop
    execute format('alter table public.%I enable row level security', rec.tablename);
    execute format('drop policy if exists %I on public.%I', rec.tablename || '_admin_all', rec.tablename);
    execute format(
      'create policy %I on public.%I for all using (is_admin()) with check (is_admin())',
      rec.tablename || '_admin_all', rec.tablename);
  end loop;
end $$;

-- Users may always read their own profile and update nothing directly.
drop policy if exists profiles_self_select on profiles;
create policy profiles_self_select on profiles for select using (auth_user_id = auth.uid());

drop policy if exists notifications_own_select on notifications;
create policy notifications_own_select on notifications for select using (recipient_id = current_profile_id());

-- 5.3 Privileges: anon gets nothing; signed-in users are limited by RLS above.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon;

grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to authenticated, service_role;
grant execute on all functions in schema public to authenticated, service_role;

-- 5.4 Seed: roles and departments (names/codes are matched by the access rules)
insert into roles (name, code, description, is_system) values
  ('Administrator', 'admin',   'Full access to every module', true),
  ('Manager',       'manager', 'Department manager', true),
  ('Employee',      'employee','Standard employee', true),
  ('Customer',      'customer','Customer portal user', true)
on conflict (code) do nothing;

insert into departments (name, code, description) values
  ('Sales & CRM',                     'SALES',        'Leads, follow-ups, quotations and orders'),
  ('Site Survey & Engineering',       'SURVEY',       'Rooftop surveys and feasibility reports'),
  ('Installation & Technical Operations', 'INSTALLATION', 'Technicians and installation jobs'),
  ('Warehouse & Logistics',           'WAREHOUSE',    'Inventory, packing, dispatch and serial numbers'),
  ('Support & Warranty',              'SUPPORT',      'Service tickets, warranty and repairs'),
  ('Accounts & Finance',              'FINANCE',      'Invoices, payments, expenses and reports'),
  ('Subsidy & Documentation',         'SUBSIDY',      'Subsidy applications and documents')
on conflict (code) do nothing;

notify pgrst, 'reload schema';

do $$
begin
  raise notice 'SOLVIX schema created successfully.';
end $$;

--------------------------------------------------------------------------------
-- 6. Administrator overview and reports (one round trip each)
--------------------------------------------------------------------------------

create or replace function admin_overview()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'leads', jsonb_build_object(
      'total',            (select count(*) from leads),
      'new',              (select count(*) from leads where status = 'new'),
      'unassigned_new',   (select count(*) from leads where status = 'new' and assigned_to is null),
      'in_progress',      (select count(*) from leads where status not in ('new','converted','lost','disqualified')),
      'converted',        (select count(*) from leads where status = 'converted'),
      'lost',             (select count(*) from leads where status in ('lost','disqualified'))
    ),
    'pipeline', jsonb_build_object(
      'enquiries',        (select count(*) from leads where status = 'new'),
      'leads',            (select count(*) from leads where status not in ('new','converted','lost','disqualified')),
      'surveys',          (select count(*) from site_surveys where status not in ('approved','rejected','cancelled','completed')),
      'quotations',       (select count(*) from quotations where status in ('pending_approval','approved','sent','viewed','under_review')),
      'orders',           (select count(*) from orders where status not in ('completed','cancelled','refunded')),
      'warehouse',        (select count(*) from orders where status in ('confirmed','processing','awaiting_dispatch')),
      'dispatched',       (select count(*) from orders where status = 'dispatched'),
      'installations',    (select count(*) from installations where status in ('pending','assigned','scheduled','in_progress','on_hold','inspection_required')),
      'completed',        (select count(*) from installations where status = 'completed'),
      'support',          (select count(*) from service_tickets where status not in ('resolved','closed'))
    ),
    'money', jsonb_build_object(
      'order_value',      (select coalesce(sum(total_amount), 0) from orders where status not in ('cancelled')),
      'collected',        (select coalesce(sum(advance_paid), 0) from orders where status not in ('cancelled')),
      'outstanding',      (select coalesce(sum(balance_due), 0) from orders where status not in ('cancelled','refunded'))
    ),
    'people', jsonb_build_object(
      'pending_approvals', (select count(*) from profiles where account_type = 'employee' and department_id is null and is_active),
      'active_employees',  (select count(*) from profiles where account_type = 'employee' and is_active and department_id is not null),
      'customers',         (select count(*) from customers)
    ),
    'recent_enquiries', coalesce((
      select jsonb_agg(to_jsonb(e)) from (
        select id, lead_code, customer_name, phone, email, address, source, status, assigned_to, created_at
        from leads
        where status = 'new'
        order by created_at desc
        limit 6
      ) e
    ), '[]'::jsonb),
    'recent_activity', coalesce((
      select jsonb_agg(to_jsonb(a)) from (
        select l.id, l.action, l.entity_type, l.created_at, p.full_name as actor_name
        from activity_logs l
        left join profiles p on p.id = l.actor_id
        order by l.created_at desc
        limit 8
      ) a
    ), '[]'::jsonb)
  );
$$;

create or replace function admin_report(p_from date default null, p_to date default null)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with r as (
    select coalesce(p_from, date '1970-01-01') as f,
           coalesce(p_to, date '2999-12-31') + 1 as t
  )
  select jsonb_build_object(
    'leads_by_status', (select coalesce(jsonb_object_agg(status, n), '{}') from (
        select status, count(*) n from leads, r where created_at >= r.f and created_at < r.t group by status) x),
    'leads_by_source', (select coalesce(jsonb_object_agg(source, n), '{}') from (
        select source, count(*) n from leads, r where created_at >= r.f and created_at < r.t group by source) x),
    'quotations_by_status', (select coalesce(jsonb_object_agg(status, n), '{}') from (
        select status, count(*) n from quotations, r where created_at >= r.f and created_at < r.t group by status) x),
    'orders_by_status', (select coalesce(jsonb_object_agg(status, n), '{}') from (
        select status, count(*) n from orders, r where created_at >= r.f and created_at < r.t group by status) x),
    'installations_by_status', (select coalesce(jsonb_object_agg(status, n), '{}') from (
        select status, count(*) n from installations, r where created_at >= r.f and created_at < r.t group by status) x),
    'tickets_by_status', (select coalesce(jsonb_object_agg(status, n), '{}') from (
        select status, count(*) n from service_tickets, r where created_at >= r.f and created_at < r.t group by status) x),
    'money', (select jsonb_build_object(
        'order_value', coalesce(sum(total_amount), 0),
        'collected',   coalesce(sum(advance_paid), 0),
        'outstanding', coalesce(sum(balance_due) filter (where status not in ('cancelled','refunded')), 0))
      from orders, r where status <> 'cancelled' and created_at >= r.f and created_at < r.t),
    'invoiced', (select coalesce(sum(total_amount), 0) from invoices, r
                 where status in ('issued','sent','partially_paid','paid','overdue') and issue_date >= r.f and issue_date < r.t),
    'expenses_approved', (select coalesce(sum(amount), 0) from expenses, r
                 where approval_status = 'approved' and incurred_date >= r.f and incurred_date < r.t)
  );
$$;

revoke all on function admin_overview() from public, anon, authenticated;
revoke all on function admin_report(date, date) from public, anon, authenticated;
grant execute on function admin_overview() to service_role;
grant execute on function admin_report(date, date) to service_role;

notify pgrst, 'reload schema';
