-- Run this once if you created the database BEFORE the Admin overview was added.
-- (A fresh run of solvix_schema.sql already includes it.) Safe to run more than once.

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
