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
