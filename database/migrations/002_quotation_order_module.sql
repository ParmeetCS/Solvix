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
insert into product_categories (name, code, description) values
  ('Solar Panels', 'solar_panels', 'Photovoltaic modules'),
  ('Solar Inverters', 'solar_inverters', 'On-grid and off-grid inverters'),
  ('Batteries', 'batteries', 'Battery storage'),
  ('Mounting Structures', 'mounting_structures', 'Module mounting structures'),
  ('Cables', 'cables', 'DC and AC cabling'),
  ('Electrical Protection', 'electrical_protection', 'Distribution boards, MCBs and isolators'),
  ('Earthing Equipment', 'earthing_equipment', 'Earthing kits and conductors'),
  ('Accessories', 'accessories', 'Connectors, glands and consumables'),
  ('Installation & Services', 'installation_services', 'Installation, commissioning and service charges')
on conflict (code) do nothing;

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
join product_categories c on c.code = v.category_code
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
