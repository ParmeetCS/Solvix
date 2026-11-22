-- =============================================================================
-- SOLVIX demo data (for the hackathon demo)
-- =============================================================================
-- Adds about 10 realistic records to every dashboard: customers, leads, follow-ups,
-- site surveys, quotations, orders, payments, warehouse stock, purchase orders,
-- serial numbers, dispatches, installations, warranties, support tickets, invoices,
-- expenses, finance transactions and subsidy applications.
--
-- HOW TO USE
--   1. Run database/solvix_schema.sql first (and create the admin, see database/README.md).
--   2. OPTIONAL but recommended: sign up the demo customers and employees from
--      TESTING_GUIDE.md first. This script links its records to them (by email).
--   3. Change the two customer emails and the employee emails just below if yours differ.
--   4. Paste this whole file into the Supabase SQL Editor and press Run.
--
-- It is safe to run twice (every demo row has a DEMO code and uses ON CONFLICT DO NOTHING).
-- Each section is isolated: if one section fails you get a NOTICE and the rest still run.
-- To remove everything again, run database/seed_demo_cleanup.sql.
-- =============================================================================

-- ---------- 0. settings you can edit -----------------------------------------
create temp table if not exists seed_cfg (k text primary key, val text);
truncate seed_cfg;
insert into seed_cfg (k, val) values
  ('customer1_email', 'yourname+raman@gmail.com'),   -- must match the Raman account you sign up with
  ('customer2_email', 'yourname+meera@gmail.com'),   -- must match the Meera account you sign up with
  ('sales_email',     'rohit.sales@solvix.test'),
  ('survey_email',    'neha.survey@solvix.test'),
  ('install_email',   'amit.install@solvix.test'),
  ('warehouse_email', 'pooja.store@solvix.test'),
  ('support_email',   'karan.support@solvix.test'),
  ('finance_email',   'sunita.accounts@solvix.test');

-- Looks up an employee profile by the email in seed_cfg (NULL if that person has not signed up yet).
create or replace function pg_temp.emp(cfg_key text) returns uuid language sql as $$
  select p.id from profiles p
  where lower(p.email) = lower((select val from seed_cfg where k = cfg_key)) limit 1
$$;

-- ---------- 1. customers, addresses -------------------------------------------
do $$ begin
  insert into customers (customer_code, contact_name, customer_name, company_name, email, phone, customer_type, status, notes, created_at)
  select 'CUST-DEMO-' || lpad(v.n::text, 2, '0'), v.name, v.name, v.company,
         case when v.n = 1 then (select val from seed_cfg where k = 'customer1_email')
              when v.n = 2 then (select val from seed_cfg where k = 'customer2_email')
              else 'demo.customer' || v.n || '@solvix.test' end,
         v.phone, v.ctype, 'active', v.note, now() - (v.days || ' days')::interval
  from (values
    (1,  'Raman Gupta',        null,                       '9876501001', 'residential', '2-storey house, flat RCC roof', 60),
    (2,  'Meera Kapoor',       null,                       '9876501002', 'residential', 'Frequent power cuts, wants battery', 55),
    (3,  'Sandeep Malhotra',   null,                       '9876501003', 'residential', 'Referred by a neighbour', 50),
    (4,  'Anita Desai',        null,                       '9876501004', 'residential', 'Villa with large terrace', 46),
    (5,  'Vikram Patel',       'Patel Dairy Farms',        '9876501005', 'commercial',  'Wants to cut the dairy power bill', 42),
    (6,  'Rajesh Khanna',      'Greenfield Public School', '9876501006', 'commercial',  'School building, daytime load', 38),
    (7,  'Gurpreet Sandhu',    'Sandhu Textiles Pvt Ltd',  '9876501007', 'industrial',  'Factory roof, 25 kW target', 33),
    (8,  'Kavita Nair',        null,                       '9876501008', 'residential', 'Coastal home, corrosion-proof mounting', 28),
    (9,  'Harpreet Singh',     null,                       '9876501009', 'residential', 'Interested in net metering', 20),
    (10, 'Lakshmi Iyer',       null,                       '9876501010', 'residential', 'Apartment society terrace', 12)
  ) v(n, name, company, phone, ctype, note, days)
  on conflict (customer_code) do nothing;

  insert into customer_addresses (customer_id, label, street, city, state, postal_code, is_primary)
  select c.id, 'Primary', v.street, v.city, v.state, v.pin, true
  from (values
    (1, '14, Green Park',            'New Delhi',  'Delhi',        '110016'),
    (2, '22, Sector 15',             'Noida',      'Uttar Pradesh','201301'),
    (3, '8, DLF Phase 3',            'Gurugram',   'Haryana',      '122002'),
    (4, '41, Koregaon Park',         'Pune',       'Maharashtra',  '411001'),
    (5, 'Plot 7, Sanand Road',       'Ahmedabad',  'Gujarat',      '382110'),
    (6, 'Tonk Road',                 'Jaipur',     'Rajasthan',    '302018'),
    (7, 'Focal Point Phase 5',       'Ludhiana',   'Punjab',       '141010'),
    (8, '12, Marine Drive',          'Kochi',      'Kerala',       '682031'),
    (9, 'Sector 22-C',               'Chandigarh', 'Chandigarh',   '160022'),
    (10,'7, Adyar',                  'Chennai',    'Tamil Nadu',   '600020')
  ) v(n, street, city, state, pin)
  join customers c on c.customer_code = 'CUST-DEMO-' || lpad(v.n::text, 2, '0')
  where not exists (select 1 from customer_addresses a where a.customer_id = c.id);
exception when others then raise notice 'Section 1 (customers) skipped: %', sqlerrm; end $$;

-- ---------- 2. leads, follow-ups, interactions ---------------------------------
do $$ begin
  insert into leads (lead_code, customer_id, customer_name, phone, email, address, source, status, system_type,
                     expected_capacity_kw, monthly_electricity_bill, priority, estimated_value, assigned_to, notes, created_at)
  select 'LEAD-DEMO-' || lpad(v.n::text, 2, '0'), c.id, c.contact_name, c.phone, c.email,
         (select a.street || ', ' || a.city from customer_addresses a where a.customer_id = c.id limit 1),
         v.source, v.status, v.stype, v.kw, v.bill, v.prio, v.est,
         case when v.assign then pg_temp.emp('sales_email') else null end,
         v.note, now() - (v.days || ' days')::interval
  from (values
    (1,  'website',  'converted',        'on-grid', 5,   8500,  'high',   320000, true,  'Order placed and installed',            58),
    (2,  'whatsapp', 'converted',        'hybrid',  3,   5200,  'high',   290000, true,  'Order placed, installation under way',  52),
    (3,  'phone',    'converted',        'on-grid', 4,   7000,  'medium', 260000, true,  'Order placed, awaiting dispatch',       47),
    (4,  'referral', 'converted',        'on-grid', 5,   9500,  'medium', 330000, true,  'Advance paid',                          44),
    (5,  'walkin',   'converted',        'on-grid', 10,  22000, 'high',   640000, true,  'Dairy farm, 10 kW',                     40),
    (6,  'website',  'negotiation',      'on-grid', 10,  30000, 'urgent', 700000, true,  'School wants a discount',               36),
    (7,  'phone',    'quotation_sent',   'on-grid', 25,  95000, 'urgent', 1500000,true,  'Factory roof, big ticket',              30),
    (8,  'whatsapp', 'qualified',        'off-grid',3,   4000,  'medium', 240000, true,  'Coastal home, survey done',             26),
    (9,  'website',  'new',              'on-grid', 5,   8000,  'medium', 300000, false, 'Fresh enquiry, not yet assigned',       2),
    (10, 'referral', 'lost',             'on-grid', 4,   6500,  'low',    0,      true,  'Chose another vendor',                  18)
  ) v(n, source, status, stype, kw, bill, prio, est, assign, note, days)
  join customers c on c.customer_code = 'CUST-DEMO-' || lpad(v.n::text, 2, '0')
  on conflict (lead_code) do nothing;

  insert into follow_ups (lead_id, scheduled_at, status, follow_up_type, notes)
  select l.id, now() + (v.hours || ' hours')::interval, v.status, v.ftype, v.note
  from (values
    (6,  18,  'pending',   'phone_call', 'Discuss revised price with the school trust'),
    (7,  26,  'pending',   'meeting',    'Site meeting with the factory owner'),
    (8,  5,   'pending',   'whatsapp',   'Share survey summary on WhatsApp'),
    (9,  2,   'pending',   'phone_call', 'First call to the new enquiry'),
    (3,  -30, 'completed', 'phone_call', 'Confirmed the dispatch date'),
    (4,  -52, 'completed', 'email',      'Sent the payment receipt'),
    (5,  -90, 'completed', 'meeting',    'Signed the quotation'),
    (10, -120,'missed',    'phone_call', 'Customer did not pick up'),
    (1,  -200,'completed', 'phone_call', 'Installation feedback call'),
    (2,  -10, 'completed', 'whatsapp',   'Shared the installation schedule')
  ) v(n, hours, status, ftype, note)
  join leads l on l.lead_code = 'LEAD-DEMO-' || lpad(v.n::text, 2, '0')
  where not exists (select 1 from follow_ups f where f.lead_id = l.id and f.notes = v.note);

  insert into customer_interactions (customer_id, lead_id, interaction_type, subject, summary, occurred_at)
  select l.customer_id, l.id, v.itype, v.subject, v.summary, now() - (v.days || ' days')::interval
  from (values
    (1, 'call',       'Enquiry call',            'Customer asked about a 5 kW rooftop system.', 58),
    (2, 'whatsapp',   'WhatsApp enquiry',        'Shared photos of the roof on WhatsApp.', 52),
    (3, 'site_visit', 'Site visit',              'Checked the roof and the meter room.', 45),
    (4, 'email',      'Quotation emailed',       'Sent the PDF quotation and payment link.', 42),
    (5, 'meeting',    'Meeting at the dairy',    'Walked through the shed roof with the owner.', 39),
    (6, 'call',       'Price discussion',        'Trust asked for a 5 percent discount.', 34),
    (7, 'meeting',    'Factory meeting',         'Discussed 25 kW and the payback period.', 29),
    (8, 'whatsapp',   'Survey summary',          'Shared the feasibility result.', 24),
    (9, 'call',       'New enquiry',             'Collected bill details over the phone.', 2),
    (10,'call',       'Lost to competitor',      'Customer chose a cheaper local installer.', 17)
  ) v(n, itype, subject, summary, days)
  join leads l on l.lead_code = 'LEAD-DEMO-' || lpad(v.n::text, 2, '0')
  where not exists (select 1 from customer_interactions i where i.lead_id = l.id and i.subject = v.subject);
exception when others then raise notice 'Section 2 (leads) skipped: %', sqlerrm; end $$;

-- ---------- 3. site surveys ----------------------------------------------------
do $$ begin
  insert into site_surveys (survey_code, lead_id, customer_id, customer_name, contact_phone, contact_email, site_address, city, state, pincode,
                            roof_area_sqm, roof_direction, roof_tilt_degrees, shading_info, cable_distance_m, site_observations,
                            feasibility_status, survey_date, status, priority, scheduled_date, monthly_electricity_bill, sanctioned_load_kw,
                            available_installation_area_sqm, estimated_usable_area_sqm, recommended_capacity_kw, recommended_system_type,
                            is_draft, completed_at, surveyor_notes, assigned_to, created_at)
  select 'SRV-DEMO-' || lpad(v.n::text, 2, '0'), l.id, l.customer_id, l.customer_name, l.phone, l.email, l.address,
         a.city, a.state, a.postal_code,
         v.roof, v.dir, v.tilt, v.shade, v.cable, v.obs, v.feas, current_date + v.sday, v.status, v.prio, current_date + v.sday,
         l.monthly_electricity_bill, v.load, v.usable, v.usable, v.rec_kw, v.rec_type,
         false, case when v.status in ('submitted','approved','rejected') then now() - (v.days || ' days')::interval else null end,
         v.obs, case when v.status <> 'pending' then pg_temp.emp('survey_email') else null end,
         now() - ((v.days + 3) || ' days')::interval
  from (values
    (1,  60, 'south', 15, 'None',            25, 'Clear south-facing RCC roof',          'approved',  -50, 'approved',        'high',   8,  45, 5,  'on-grid',  50),
    (2,  36, 'south', 10, 'Light morning',   18, 'Terrace usable, battery room ready',   'approved',  -45, 'approved',        'high',   5,  30, 3,  'hybrid',   44),
    (3,  48, 'south', 12, 'None',            22, 'Good roof, short cable run',           'approved',  -40, 'approved',        'medium', 6,  38, 4,  'on-grid',  40),
    (4,  70, 'south', 15, 'None',            30, 'Large terrace, no obstructions',       'approved',  -36, 'approved',        'medium', 8,  55, 5,  'on-grid',  36),
    (5, 140, 'flat',   5, 'Some from chimney',40, 'Shed roof, needs reinforcement check','approved',  -32, 'approved',        'high',   15, 110,10, 'on-grid',  32),
    (6, 150, 'south', 10, 'None',            45, 'School roof, daytime load matches',    'feasible',  -26, 'submitted',       'urgent', 15, 120,10, 'on-grid',  26),
    (7, 320, 'flat',   0, 'None',            60, 'Factory roof, very large area',        'pending',   -20, 'in_progress',     'urgent', 30, 250,25, 'on-grid',  20),
    (8,  40, 'west',  20, 'Palm trees',      15, 'Shading in the evening',               'requires_review', -3,'scheduled',   'medium', 5,  25, 3,  'off-grid', 3),
    (9,  55, 'south', 12, 'None',            20, 'Awaiting a technician',                'pending',     2, 'assigned',        'medium', 6,  35, 5,  'on-grid',  1),
    (10, 45, 'east',  15, 'Heavy shading',   30, 'Customer cancelled the survey',        'rejected',  -15, 'rejected',        'low',    5,  10, 4,  'on-grid',  15)
  ) v(n, roof, dir, tilt, shade, cable, obs, feas, sday, status, prio, load, usable, rec_kw, rec_type, days)
  join leads l on l.lead_code = 'LEAD-DEMO-' || lpad(v.n::text, 2, '0')
  left join customer_addresses a on a.customer_id = l.customer_id and a.is_primary
  on conflict (survey_code) do nothing;

  insert into survey_assignments (survey_id, assigned_to, status, scheduled_at, notes)
  select s.id, pg_temp.emp('survey_email'), 'assigned', now() + ((s.scheduled_date - current_date) || ' days')::interval, 'Demo assignment'
  from site_surveys s
  where s.survey_code like 'SRV-DEMO-%' and pg_temp.emp('survey_email') is not null
    and not exists (select 1 from survey_assignments x where x.survey_id = s.id);

  insert into survey_approvals (survey_id, status, reviewed_at, comments)
  select s.id, 'approved', now() - interval '2 days', 'Approved for quotation'
  from site_surveys s
  where s.survey_code like 'SRV-DEMO-%' and s.status = 'approved'
    and not exists (select 1 from survey_approvals x where x.survey_id = s.id);

  insert into survey_reports (survey_id, report_text, recommended_capacity_kw, estimated_cost, submitted_at)
  select s.id, 'Roof is suitable. ' || coalesce(s.site_observations, ''), s.recommended_capacity_kw,
         s.recommended_capacity_kw * 56000, s.completed_at
  from site_surveys s
  where s.survey_code like 'SRV-DEMO-%' and s.status in ('approved', 'submitted')
    and not exists (select 1 from survey_reports x where x.survey_id = s.id);
exception when others then raise notice 'Section 3 (surveys) skipped: %', sqlerrm; end $$;

-- ---------- 4. quotations (12) and their line items -----------------------------
do $$ begin
  insert into quotations (quotation_code, lead_id, customer_id, site_survey_id, system_type, system_capacity_kw,
                          validity_date, status, installation_address, customer_notes, internal_notes, approval_required,
                          survey_verified, sent_at, accepted_at, created_at)
  select 'QTN-DEMO-' || lpad(v.n::text, 2, '0'), l.id, l.customer_id, s.id, v.stype, v.kw,
         current_date + v.valid, v.status, l.address, v.note, null, v.approval,
         s.id is not null,
         case when v.status <> 'draft' then now() - ((v.days - 1) || ' days')::interval end,
         case when v.status in ('converted', 'accepted') then now() - ((v.days - 3) || ' days')::interval end,
         now() - (v.days || ' days')::interval
  from (values
    (1,  1, 'on-grid', 5,  15,  'converted', false, 'Includes net-metering paperwork', 48),
    (2,  2, 'hybrid',  3,  15,  'converted', false, 'Battery backup included',         43),
    (3,  3, 'on-grid', 4,  15,  'converted', false, null,                              38),
    (4,  4, 'on-grid', 5,  15,  'converted', false, null,                              34),
    (5,  5, 'on-grid', 10, 15,  'converted', true,  'Reinforced mounting for the shed',30),
    (6,  6, 'on-grid', 10, 20,  'converted', true,  'Revised after the first meeting', 25),
    (7,  7, 'on-grid', 25, 20,  'converted', true,  'Three-phase factory system',      19),
    (8,  8, 'off-grid',3,  15,  'converted', false, 'Corrosion-proof structure',       14),
    (9,  9, 'on-grid', 5,  15,  'converted', false, null,                              9),
    (10, 10,'on-grid', 4,  10,  'converted', false, null,                              6),
    (11, 6, 'on-grid', 10, 20,  'sent',      true,  'Second option with a 5 percent discount', 4),
    (12, 7, 'on-grid', 25, 20,  'draft',     true,  'Draft prepared by the AI agent', 1)
  ) v(n, ln, stype, kw, valid, status, approval, note, days)
  join leads l on l.lead_code = 'LEAD-DEMO-' || lpad(v.ln::text, 2, '0')
  left join site_surveys s on s.lead_id = l.id and s.status = 'approved'
  on conflict (quotation_code) do nothing;

  insert into quotation_items (quotation_id, product_id, line_item, quantity, unit_price, total_price, item_type, unit, tax_rate, sort_order)
  select q.id, p.id, p.name, l.qty, p.base_price, round(l.qty * p.base_price, 2), coalesce(p.item_type, 'product'),
         p.unit, coalesce(p.tax_rate, 0), l.ord
  from quotations q
  cross join lateral (values
    (1, 'SP-550',   ceil(q.system_capacity_kw * 1000 / 550.0)),
    (2, case when q.system_type = 'on-grid'
             then case when q.system_capacity_kw <= 3 then 'INV-ONG-3' else 'INV-ONG-5' end
             else case when q.system_capacity_kw <= 3 then 'INV-OFF-3' else 'INV-OFF-5' end end,
        ceil(q.system_capacity_kw / case when q.system_capacity_kw <= 3 then 3.0 else 5.0 end)),
    (3, 'MNT-STD',  ceil(q.system_capacity_kw)),
    (4, 'ELE-ACDB', 1),
    (5, 'CBL-DC',   ceil(q.system_capacity_kw)),
    (6, 'ERT-KIT',  1),
    (7, 'BAT-100AH', case when q.system_type = 'on-grid' then 0 else 2 end),
    (8, 'SRV-INST', 1)
  ) l(ord, sku, qty)
  join products p on p.sku = l.sku
  where q.quotation_code like 'QTN-DEMO-%' and l.qty > 0
    and not exists (select 1 from quotation_items i where i.quotation_id = q.id);

  -- Totals come from the items so the numbers always add up.
  update quotations q set
    subtotal        = t.sub,
    discount_amount = case when q.quotation_code in ('QTN-DEMO-05', 'QTN-DEMO-11') then round(t.sub * 0.05, 2) else 0 end,
    tax_amount      = round((t.sub - case when q.quotation_code in ('QTN-DEMO-05', 'QTN-DEMO-11') then t.sub * 0.05 else 0 end) * t.avg_rate / 100, 2),
    total_amount    = round((t.sub - case when q.quotation_code in ('QTN-DEMO-05', 'QTN-DEMO-11') then t.sub * 0.05 else 0 end) * (1 + t.avg_rate / 100), 2)
  from (
    select quotation_id, sum(total_price) as sub,
           case when sum(total_price) > 0 then sum(total_price * tax_rate) / sum(total_price) else 0 end as avg_rate
    from quotation_items group by quotation_id
  ) t
  where t.quotation_id = q.id and q.quotation_code like 'QTN-DEMO-%';
exception when others then raise notice 'Section 4 (quotations) skipped: %', sqlerrm; end $$;

-- ---------- 5. orders (10) and payments (10) ------------------------------------
do $$ begin
  insert into orders (order_code, quotation_id, customer_id, status, total_amount, advance_paid, balance_due, payment_status,
                      system_type, system_capacity_kw, quotation_code, scheduled_install_date, created_at)
  select 'ORD-DEMO-' || lpad(v.n::text, 2, '0'), q.id, q.customer_id, v.status, q.total_amount, 0, q.total_amount, 'pending',
         q.system_type, q.system_capacity_kw, q.quotation_code, current_date + v.inst, now() - (v.days || ' days')::interval
  from (values
    (1,  'completed',                -30, 44),
    (2,  'installation_in_progress',  -2, 39),
    (3,  'dispatched',                 3, 34),
    (4,  'awaiting_dispatch',          6, 30),
    (5,  'processing',                10, 26),
    (6,  'confirmed',                 14, 21),
    (7,  'pending_payment',           20, 15),
    (8,  'confirmed',                 12, 10),
    (9,  'pending_payment',           25, 6),
    (10, 'processing',                18, 3)
  ) v(n, status, inst, days)
  join quotations q on q.quotation_code = 'QTN-DEMO-' || lpad(v.n::text, 2, '0')
  on conflict (order_code) do nothing;

  insert into order_status_history (order_id, previous_status, new_status, notes)
  select o.id, null, o.status, 'Demo order created'
  from orders o where o.order_code like 'ORD-DEMO-%'
    and not exists (select 1 from order_status_history h where h.order_id = o.id);

  insert into payments (payment_code, order_id, customer_id, amount, payment_type, payment_method, transaction_reference,
                        paid_at, notes, gateway_verified, status)
  select 'PAY-DEMO-' || lpad(v.n::text, 2, '0'), o.id, o.customer_id, round(o.total_amount * v.pct / 100.0, 2),
         v.ptype, v.method, v.ref, now() - (v.days || ' days')::interval, v.note,
         v.method in ('card', 'upi'), case when v.method in ('card', 'upi') then 'verified' else 'recorded' end
  from (values
    (1,  1, 40,  'advance', 'bank_transfer', 'NEFT-DEMO-1001',  40, 'Advance by bank transfer'),
    (2,  1, 60,  'partial', 'upi',           'pay_DEMOUPI0002',  25, 'Balance paid by UPI'),
    (3,  2, 50,  'advance', 'card',          'pay_DEMOCARD003',  35, 'Razorpay test payment'),
    (4,  3, 30,  'advance', 'upi',           'pay_DEMOUPI0004',  30, 'Razorpay test payment'),
    (5,  4, 50,  'advance', 'bank_transfer', 'NEFT-DEMO-1005',   27, 'Advance by bank transfer'),
    (6,  4, 20,  'partial', 'cash',          null,               12, 'Cash received at the office'),
    (7,  5, 25,  'advance', 'cheque',        'CHQ-DEMO-204551',  22, 'Cheque cleared'),
    (8,  6, 100, 'full',    'card',          'pay_DEMOCARD008',  18, 'Paid in full online'),
    (9,  8, 40,  'advance', 'upi',           'pay_DEMOUPI0009',  8,  'Razorpay test payment'),
    (10, 10,30,  'advance', 'bank_transfer', 'NEFT-DEMO-1010',   2,  'Advance by bank transfer')
  ) v(n, on_, pct, ptype, method, ref, days, note)
  join orders o on o.order_code = 'ORD-DEMO-' || lpad(v.on_::text, 2, '0')
  on conflict (payment_code) do nothing;

  update orders o set
    advance_paid   = coalesce(s.paid, 0),
    balance_due    = greatest(o.total_amount - coalesce(s.paid, 0), 0),
    payment_status = case when coalesce(s.paid, 0) >= o.total_amount then 'paid'
                          when coalesce(s.paid, 0) > 0 then 'partial' else 'pending' end
  from (select order_id, sum(amount) as paid from payments where payment_code like 'PAY-DEMO-%' group by order_id) s
  where s.order_id = o.id and o.order_code like 'ORD-DEMO-%';
exception when others then raise notice 'Section 5 (orders and payments) skipped: %', sqlerrm; end $$;

-- ---------- 6. warehouse: facilities, stock, purchase orders ---------------------
do $$ begin
  insert into warehouses (name, code, address, city, state, pincode, contact_phone, is_active)
  values
    ('Delhi Central Warehouse', 'WH-DEMO-DEL', 'Okhla Industrial Area', 'New Delhi', 'Delhi', '110020', '9810000001', true),
    ('Gurugram Distribution Hub', 'WH-DEMO-GGN', 'Sector 37', 'Gurugram', 'Haryana', '122001', '9810000002', true),
    ('Pune Regional Store', 'WH-DEMO-PUN', 'Hadapsar', 'Pune', 'Maharashtra', '411028', '9810000003', true)
  on conflict (code) do nothing;

  insert into inventory (product_id, warehouse_id, quantity_on_hand, quantity_reserved, last_restocked_at)
  select p.id, w.id, v.qty, v.reserved, now() - (v.days || ' days')::interval
  from (values
    ('SP-550',     'WH-DEMO-DEL', 120, 18, 5),
    ('INV-ONG-3',  'WH-DEMO-DEL', 14,  2,  7),
    ('INV-ONG-5',  'WH-DEMO-DEL', 4,   2,  9),     -- low stock
    ('INV-OFF-3',  'WH-DEMO-GGN', 6,   1,  11),
    ('BAT-100AH',  'WH-DEMO-GGN', 0,   0,  20),    -- out of stock
    ('MNT-STD',    'WH-DEMO-DEL', 60,  8,  6),
    ('CBL-DC',     'WH-DEMO-GGN', 800, 90, 8),
    ('ELE-ACDB',   'WH-DEMO-PUN', 25,  4,  10),
    ('ERT-KIT',    'WH-DEMO-PUN', 30,  3,  12),
    ('ACC-MC4',    'WH-DEMO-DEL', 220, 20, 4)
  ) v(sku, wh, qty, reserved, days)
  join products p on p.sku = v.sku
  join warehouses w on w.code = v.wh
  on conflict (product_id, warehouse_id) do nothing;

  insert into stock_movements (product_id, warehouse_id, movement_type, quantity, reference_type, notes, created_at)
  select p.id, w.id, v.mtype, v.qty, v.ref, v.note, now() - (v.days || ' days')::interval
  from (values
    ('SP-550',    'WH-DEMO-DEL', 'stock_in',    200, 'purchase_order', 'Received from Waaree',            20),
    ('SP-550',    'WH-DEMO-DEL', 'reservation', 18,  'order',          'Reserved for open orders',        12),
    ('SP-550',    'WH-DEMO-DEL', 'stock_out',   62,  'dispatch',       'Dispatched to customers',         8),
    ('INV-ONG-3', 'WH-DEMO-DEL', 'stock_in',    20,  'purchase_order', 'Received from Growatt',           18),
    ('INV-ONG-5', 'WH-DEMO-DEL', 'stock_in',    10,  'purchase_order', 'Received from Growatt',           16),
    ('INV-ONG-5', 'WH-DEMO-DEL', 'stock_out',   6,   'dispatch',       'Dispatched to customers',         6),
    ('BAT-100AH', 'WH-DEMO-GGN', 'stock_out',   8,   'dispatch',       'Last batteries dispatched',       10),
    ('MNT-STD',   'WH-DEMO-DEL', 'stock_in',    80,  'purchase_order', 'Received mounting structures',    14),
    ('CBL-DC',    'WH-DEMO-GGN', 'adjustment',  -20, 'audit',          'Stock count correction',          5),
    ('ELE-ACDB',  'WH-DEMO-PUN', 'stock_in',    30,  'purchase_order', 'Received distribution boxes',    9)
  ) v(sku, wh, mtype, qty, ref, note, days)
  join products p on p.sku = v.sku
  join warehouses w on w.code = v.wh
  where not exists (select 1 from stock_movements m where m.product_id = p.id and m.notes = v.note and m.movement_type = v.mtype);

  insert into purchase_orders (po_code, supplier_name, supplier_phone, supplier_email, status, total_amount, expected_date, received_date, warehouse_id, notes)
  select 'PO-DEMO-' || lpad(v.n::text, 2, '0'), v.supplier, v.phone, v.email, v.status, v.total,
         current_date + v.exp, case when v.status in ('received') then current_date + v.exp end,
         (select id from warehouses where code = v.wh), v.note
  from (values
    (1,  'Waaree Energies',     '9810011111', 'sales@waaree.test',   'received',           1920000, -20, 'WH-DEMO-DEL', 'Panels for Q4 orders'),
    (2,  'Growatt India',       '9810022222', 'orders@growatt.test', 'received',           560000,  -16, 'WH-DEMO-DEL', 'On-grid inverters'),
    (3,  'Luminous Power',      '9810033333', 'b2b@luminous.test',   'partially_received', 480000,  -4,  'WH-DEMO-GGN', 'Batteries, half delivered'),
    (4,  'Polycab Cables',      '9810044444', 'sales@polycab.test',  'approved',           210000,  3,   'WH-DEMO-GGN', 'DC cable drums'),
    (5,  'Havells Electricals', '9810055555', 'b2b@havells.test',    'sent',               150000,  6,   'WH-DEMO-PUN', 'ACDB and DCDB boxes'),
    (6,  'Tata Power Solar',    '9810066666', 'sales@tata.test',     'approved',           1450000, 8,   'WH-DEMO-DEL', 'Premium panels for factory order'),
    (7,  'Sungrow India',       '9810077777', 'orders@sungrow.test', 'draft',              780000,  12,  'WH-DEMO-DEL', 'Three-phase inverters'),
    (8,  'Galvano Structures',  '9810088888', 'sales@galvano.test',  'received',           300000,  -12, 'WH-DEMO-DEL', 'GI mounting structures'),
    (9,  'EarthPro Systems',    '9810099999', 'sales@earthpro.test', 'approved',           90000,   5,   'WH-DEMO-PUN', 'Earthing kits'),
    (10, 'Amara Raja',          '9810012121', 'b2b@amara.test',      'cancelled',          260000,  -2,  'WH-DEMO-GGN', 'Cancelled, supplier delay')
  ) v(n, supplier, phone, email, status, total, exp, wh, note)
  on conflict (po_code) do nothing;

  insert into purchase_order_items (purchase_order_id, product_id, quantity_ordered, quantity_received, unit_price, total_price)
  select po.id, p.id, v.qty, case when po.status = 'received' then v.qty when po.status = 'partially_received' then v.qty / 2 else 0 end,
         p.base_price, round(v.qty * p.base_price, 2)
  from (values
    (1, 'SP-550', 160), (2, 'INV-ONG-5', 20), (3, 'BAT-100AH', 20), (4, 'CBL-DC', 500), (5, 'ELE-ACDB', 40),
    (6, 'SP-550', 120), (7, 'INV-ONG-5', 25), (8, 'MNT-STD', 80), (9, 'ERT-KIT', 60), (10, 'BAT-100AH', 25)
  ) v(n, sku, qty)
  join purchase_orders po on po.po_code = 'PO-DEMO-' || lpad(v.n::text, 2, '0')
  join products p on p.sku = v.sku
  where not exists (select 1 from purchase_order_items i where i.purchase_order_id = po.id);
exception when others then raise notice 'Section 6 (warehouse) skipped: %', sqlerrm; end $$;

-- ---------- 7. serial numbers, dispatches, deliveries ------------------------------
do $$ begin
  insert into equipment_serial_numbers (serial_number, product_id, status, warranty_start_date, warranty_expiry_date, current_location,
                                        customer_id, order_id, manufacturer, qr_code_data, warranty_status, delivery_date)
  select v.sn, p.id, v.status,
         case when v.status in ('delivered', 'installed') then current_date + v.dd end,
         case when v.status in ('delivered', 'installed') then current_date + v.dd + (v.yrs * 365) end,
         v.loc, o.customer_id, o.id, v.maker, 'SOLVIX|' || v.sn,
         case when v.status in ('delivered', 'installed') then 'active' else 'pending_delivery' end,
         case when v.status in ('delivered', 'installed') then current_date + v.dd end
  from (values
    ('SN-DEMO-PNL-001', 'SP-550',    'installed',  'ORD-DEMO-01', -28, 25, 'Customer site', 'Waaree'),
    ('SN-DEMO-PNL-002', 'SP-550',    'installed',  'ORD-DEMO-01', -28, 25, 'Customer site', 'Waaree'),
    ('SN-DEMO-INV-001', 'INV-ONG-5', 'installed',  'ORD-DEMO-01', -28, 5,  'Customer site', 'Growatt'),
    ('SN-DEMO-PNL-003', 'SP-550',    'delivered',  'ORD-DEMO-02', -4,  25, 'Customer site', 'Waaree'),
    ('SN-DEMO-PNL-004', 'SP-550',    'delivered',  'ORD-DEMO-02', -4,  25, 'Customer site', 'Waaree'),
    ('SN-DEMO-INV-002', 'INV-OFF-3', 'delivered',  'ORD-DEMO-02', -4,  5,  'Customer site', 'Growatt'),
    ('SN-DEMO-PNL-005', 'SP-550',    'dispatched', 'ORD-DEMO-03', 0,   25, 'In transit',    'Waaree'),
    ('SN-DEMO-INV-003', 'INV-ONG-5', 'dispatched', 'ORD-DEMO-03', 0,   5,  'In transit',    'Growatt'),
    ('SN-DEMO-PNL-006', 'SP-550',    'reserved',   'ORD-DEMO-04', 0,   25, 'Delhi Central Warehouse', 'Waaree'),
    ('SN-DEMO-INV-004', 'INV-ONG-5', 'in_stock',   null,          0,   5,  'Delhi Central Warehouse', 'Growatt')
  ) v(sn, sku, status, ord, dd, yrs, loc, maker)
  join products p on p.sku = v.sku
  left join orders o on o.order_code = v.ord
  on conflict (serial_number) do nothing;

  insert into dispatches (dispatch_code, order_id, warehouse_id, dispatched_at, delivery_date, status, notes, customer_id,
                          transporter_name, tracking_number, vehicle_number, driver_phone, delivered_at)
  select 'DSP-DEMO-' || lpad(v.n::text, 2, '0'), o.id, w.id,
         case when v.status <> 'prepared' then now() - (v.days || ' days')::interval end,
         current_date + v.dd, v.status, v.note, o.customer_id, v.carrier, 'TRK-DEMO-' || v.n, v.vehicle, v.phone,
         case when v.status = 'delivered' then now() - ((v.days - 1) || ' days')::interval end
  from (values
    (1, 'ORD-DEMO-01', 'delivered',  'WH-DEMO-DEL', 29, -28, 'Delivered and installed',        'Own truck',     'DL1LA4521', '9810033301'),
    (2, 'ORD-DEMO-02', 'delivered',  'WH-DEMO-DEL', 5,  -4,  'Delivered, installation started','Own truck',     'DL1LA4521', '9810033301'),
    (3, 'ORD-DEMO-03', 'in_transit', 'WH-DEMO-DEL', 1,  2,   'On the way to Gurugram',          'Blue Dart',     'HR26BX9087','9810033302'),
    (4, 'ORD-DEMO-04', 'prepared',   'WH-DEMO-DEL', 0,  4,   'Packed, waiting for the van',     'Local courier', 'DL3CAB1122','9810033303'),
    (5, 'ORD-DEMO-05', 'prepared',   'WH-DEMO-GGN', 0,  7,   'Waiting for panels from PO-DEMO-06','Local courier','HR55AC7788','9810033304'),
    (6, 'ORD-DEMO-06', 'prepared',   'WH-DEMO-DEL', 0,  10,  'Scheduled for next week',         'Own truck',     'DL1LA4521', '9810033301'),
    (7, 'ORD-DEMO-08', 'prepared',   'WH-DEMO-PUN', 0,  9,   'Awaiting payment confirmation',   'DTDC',          'MH12DE3344','9810033305'),
    (8, 'ORD-DEMO-10', 'prepared',   'WH-DEMO-DEL', 0,  14,  'Packing in progress',             'Own truck',     'DL1LA4521', '9810033301')
  ) v(n, ord, status, wh, days, dd, note, carrier, vehicle, phone)
  join orders o on o.order_code = v.ord
  join warehouses w on w.code = v.wh
  on conflict (dispatch_code) do nothing;

  insert into dispatch_items (dispatch_id, equipment_serial_id, quantity, scanned_at)
  select d.id, s.id, 1, now() - interval '1 day'
  from equipment_serial_numbers s
  join orders o on o.id = s.order_id
  join dispatches d on d.order_id = o.id and d.dispatch_code like 'DSP-DEMO-%'
  where s.serial_number like 'SN-DEMO-%' and s.status in ('installed', 'delivered', 'dispatched')
    and not exists (select 1 from dispatch_items x where x.dispatch_id = d.id and x.equipment_serial_id = s.id);

  insert into equipment_deliveries (dispatch_id, customer_id, delivered_at, notes)
  select d.id, d.customer_id, d.delivered_at, 'Received by the customer, signed on delivery'
  from dispatches d
  where d.dispatch_code like 'DSP-DEMO-%' and d.status = 'delivered'
    and not exists (select 1 from equipment_deliveries e where e.dispatch_id = d.id);
exception when others then raise notice 'Section 7 (serials and dispatches) skipped: %', sqlerrm; end $$;

-- ---------- 8. installations -------------------------------------------------------
do $$ begin
  insert into technicians (profile_id, employee_code, skills, full_name, email, is_available)
  select p.id, 'TECH-DEMO-' || row_number() over (order by p.email), array['solar_install', 'earthing'], p.full_name, p.email, true
  from profiles p
  where lower(p.email) in (lower((select val from seed_cfg where k = 'install_email')), lower((select val from seed_cfg where k = 'survey_email')))
  on conflict (employee_code) do nothing;

  insert into installations (installation_code, order_id, customer_id, status, scheduled_start, actual_start, actual_end, system_capacity_kw,
                             system_type, site_address, planned_installation_date, expected_completion_date, testing_notes, completion_report,
                             equipment_verified, notes, created_at)
  select 'INS-DEMO-' || lpad(v.n::text, 2, '0'), o.id, o.customer_id, v.status,
         now() + (v.st || ' days')::interval,
         case when v.status in ('in_progress', 'completed', 'on_hold') then now() + ((v.st) || ' days')::interval end,
         case when v.status = 'completed' then now() + ((v.st + 2) || ' days')::interval end,
         o.system_capacity_kw, o.system_type,
         (select a.street || ', ' || a.city from customer_addresses a where a.customer_id = o.customer_id limit 1),
         current_date + v.st, current_date + v.st + 3, v.testing,
         case when v.status = 'completed' then 'Installed, tested and handed over. Customer signed the completion sheet.' end,
         v.verified, v.note, now() - (v.days || ' days')::interval
  from (values
    (1, 'ORD-DEMO-01', 'completed',           -30, 'Earthing 2.1 ohm, insulation OK',      true,  'Completed on time',                  40),
    (2, 'ORD-DEMO-02', 'in_progress',         -2,  null,                                    true,  'Battery wiring in progress',         10),
    (3, 'ORD-DEMO-03', 'scheduled',           4,   null,                                    false, 'Waiting for delivery',               8),
    (4, 'ORD-DEMO-04', 'assigned',            7,   null,                                    false, 'Technician assigned',                7),
    (5, 'ORD-DEMO-05', 'pending',             12,  null,                                    false, 'Awaiting dispatch',                  6),
    (6, 'ORD-DEMO-06', 'on_hold',             -1,  null,                                    true,  'On hold: school exams until Friday', 5),
    (7, 'ORD-DEMO-08', 'inspection_required', 14,  'Roof strength to be certified',         false, 'Structural check needed',            4),
    (8, 'ORD-DEMO-10', 'pending',             16,  null,                                    false, 'Awaiting advance clearance',         2)
  ) v(n, ord, status, st, testing, verified, note, days)
  join orders o on o.order_code = v.ord
  on conflict (installation_code) do nothing;

  insert into installation_tasks (installation_id, task_name, is_required, is_completed, completed_at, notes)
  select i.id, v.task, true, v.done, case when v.done then now() - interval '1 day' end, null
  from (values
    ('INS-DEMO-01', 'Mount structure and panels', true), ('INS-DEMO-01', 'DC and AC wiring', true),
    ('INS-DEMO-01', 'Earthing and lightning arrestor', true), ('INS-DEMO-01', 'Inverter commissioning', true),
    ('INS-DEMO-01', 'Customer handover', true),
    ('INS-DEMO-02', 'Mount structure and panels', true), ('INS-DEMO-02', 'DC and AC wiring', true),
    ('INS-DEMO-02', 'Battery bank connection', false), ('INS-DEMO-02', 'Earthing', false),
    ('INS-DEMO-02', 'Inverter commissioning', false)
  ) v(code, task, done)
  join installations i on i.installation_code = v.code
  where not exists (select 1 from installation_tasks t where t.installation_id = i.id and t.task_name = v.task);

  insert into technician_assignments (technician_id, installation_id, role_on_job, is_primary)
  select t.id, i.id, 'lead_technician', true
  from technicians t, installations i
  where t.employee_code like 'TECH-DEMO-%' and i.installation_code in ('INS-DEMO-01', 'INS-DEMO-02', 'INS-DEMO-03', 'INS-DEMO-04')
    and t.profile_id = pg_temp.emp('install_email')
    and not exists (select 1 from technician_assignments x where x.technician_id = t.id and x.installation_id = i.id);
exception when others then raise notice 'Section 8 (installations) skipped: %', sqlerrm; end $$;

-- ---------- 9. warranties, claims, support tickets -----------------------------------
do $$ begin
  insert into warranties (warranty_code, equipment_serial_id, customer_id, order_id, product_id, warranty_type, duration_years,
                          start_date, expiry_date, status, terms)
  select 'WAR-DEMO-' || lpad(row_number() over (order by s.serial_number)::text, 2, '0'),
         s.id, s.customer_id, s.order_id, s.product_id, 'manufacturer',
         case when s.serial_number like 'SN-DEMO-PNL%' then 25 else 5 end,
         coalesce(s.warranty_start_date, current_date),
         coalesce(s.warranty_expiry_date, current_date + 365 * case when s.serial_number like 'SN-DEMO-PNL%' then 25 else 5 end),
         case when s.status in ('installed', 'delivered') then 'active' else 'pending_activation' end,
         'Manufacturer warranty against defects. Starts from the delivery date.'
  from equipment_serial_numbers s
  where s.serial_number like 'SN-DEMO-%' and s.customer_id is not null
  on conflict (warranty_code) do nothing;

  insert into service_tickets (ticket_code, ticket_number, customer_id, subject, description, priority, status, assigned_to,
                               contact_phone, contact_email, order_id, equipment_serial_id, issue_category, created_at, resolved_at)
  select 'TKT-DEMO-' || lpad(v.n::text, 2, '0'), 'TKT-DEMO-' || lpad(v.n::text, 2, '0'), c.id, v.subject, v.descr, v.prio, v.status,
         case when v.status <> 'open' then pg_temp.emp('support_email') end,
         c.phone, c.email, o.id, s.id, v.cat, now() - (v.days || ' days')::interval,
         case when v.status in ('resolved', 'closed') then now() - ((v.days - 1) || ' days')::interval end
  from (values
    (1,  1, 'Inverter showing error E04',        'Red light blinking since morning.',                'high',     'in_progress',       'Inverter issue', 'SN-DEMO-INV-001', 6),
    (2,  1, 'Generation lower than expected',    'Daily units are lower than the quoted estimate.',  'medium',   'resolved',          'Performance',    'SN-DEMO-PNL-001', 15),
    (3,  2, 'Battery backup not holding',        'Backup lasts only 1 hour at night.',               'critical', 'assigned',          'Battery',        null,              3),
    (4,  2, 'Request for AMC details',           'Wants to know the annual maintenance plan.',       'low',      'open',              'Service',        null,              1),
    (5,  3, 'Panel cleaning request',            'Dust after the construction next door.',           'low',      'closed',            'Maintenance',    null,              20),
    (6,  4, 'Net meter reading mismatch',        'Meter shows less export than the inverter.',       'high',     'waiting_for_parts', 'Metering',       null,              9),
    (7,  5, 'Monitoring app not connecting',     'Wi-Fi dongle keeps disconnecting.',                'medium',   'in_progress',       'Monitoring',     null,              4),
    (8,  6, 'Cable gland loose on the roof',     'Found during routine inspection.',                 'medium',   'resolved',          'Wiring',         null,              12),
    (9,  7, 'Warranty paperwork needed',         'Needs warranty certificates for the bank loan.',   'medium',   'open',              'Documents',      null,              2),
    (10, 8, 'Water seepage near the structure',  'Seepage after heavy rain around one mount.',       'high',     'assigned',          'Civil',          null,              5)
  ) v(n, cn, subject, descr, prio, status, cat, sn, days)
  join customers c on c.customer_code = 'CUST-DEMO-' || lpad(v.cn::text, 2, '0')
  left join orders o on o.customer_id = c.id
  left join equipment_serial_numbers s on s.serial_number = v.sn
  on conflict (ticket_code) do nothing;

  insert into service_ticket_updates (ticket_id, update_text, status, is_internal, created_at)
  select t.id, v.txt, v.status, false, now() - (v.days || ' days')::interval
  from (values
    ('TKT-DEMO-01', 'Technician visit booked for tomorrow.', 'in_progress', 4),
    ('TKT-DEMO-02', 'Panels cleaned and readings re-checked, now within range.', 'resolved', 14),
    ('TKT-DEMO-03', 'Battery bank test scheduled.', 'assigned', 2),
    ('TKT-DEMO-05', 'Cleaning done by the crew.', 'closed', 19),
    ('TKT-DEMO-06', 'Waiting for the new bidirectional meter from the utility.', 'waiting_for_parts', 7),
    ('TKT-DEMO-07', 'Dongle firmware being updated remotely.', 'in_progress', 3),
    ('TKT-DEMO-08', 'Gland replaced and sealed.', 'resolved', 11),
    ('TKT-DEMO-10', 'Waterproofing team assigned.', 'assigned', 4),
    ('TKT-DEMO-04', 'AMC brochure shared by email.', 'open', 1),
    ('TKT-DEMO-09', 'Certificates being prepared.', 'open', 1)
  ) v(code, txt, status, days)
  join service_tickets t on t.ticket_code = v.code
  where not exists (select 1 from service_ticket_updates u where u.ticket_id = t.id and u.update_text = v.txt);

  insert into warranty_claims (claim_code, warranty_id, customer_id, claim_type, description, status, ticket_id, submitted_at)
  select 'CLM-DEMO-' || lpad(v.n::text, 2, '0'), w.id, w.customer_id, v.ctype, v.descr, v.status,
         (select t.id from service_tickets t where t.ticket_code = v.tkt), now() - (v.days || ' days')::interval
  from (values
    (1, 'SN-DEMO-INV-001', 'repair',      'Inverter error E04 under warranty.',        'under_review', 'TKT-DEMO-01', 5),
    (2, 'SN-DEMO-PNL-001', 'replacement', 'One panel has a cracked glass edge.',       'approved',     null,          10),
    (3, 'SN-DEMO-INV-002', 'repair',      'Battery inverter overheating.',             'submitted',    'TKT-DEMO-03', 2),
    (4, 'SN-DEMO-PNL-003', 'repair',      'Junction box cover loose.',                 'completed',    null,          18)
  ) v(n, sn, ctype, descr, status, tkt, days)
  join equipment_serial_numbers s on s.serial_number = v.sn
  join warranties w on w.equipment_serial_id = s.id
  on conflict (claim_code) do nothing;
exception when others then raise notice 'Section 9 (warranty and support) skipped: %', sqlerrm; end $$;

-- ---------- 10. finance: invoices, expenses, costs, transactions -----------------------
do $$ begin
  insert into invoices (invoice_code, order_id, customer_id, status, issue_date, due_date, billing_event, subtotal, tax_amount, total_amount,
                        amount_paid, issued_at, terms)
  select 'INV-DEMO-' || lpad(v.n::text, 2, '0'), o.id, o.customer_id, v.status, current_date - v.days, current_date - v.days + 15,
         v.event, round(o.total_amount / 1.089, 2), round(o.total_amount - o.total_amount / 1.089, 2), o.total_amount,
         case when v.status = 'paid' then o.total_amount when v.status = 'partially_paid' then o.advance_paid else 0 end,
         case when v.status <> 'draft' then now() - (v.days || ' days')::interval end,
         'Payable within 15 days of the issue date.'
  from (values
    (1,  'ORD-DEMO-01', 'paid',           'full',    40),
    (2,  'ORD-DEMO-02', 'partially_paid', 'advance', 35),
    (3,  'ORD-DEMO-03', 'partially_paid', 'advance', 30),
    (4,  'ORD-DEMO-04', 'issued',         'advance', 27),
    (5,  'ORD-DEMO-05', 'overdue',        'advance', 40),
    (6,  'ORD-DEMO-06', 'paid',           'full',    18),
    (7,  'ORD-DEMO-07', 'draft',          'advance', 14),
    (8,  'ORD-DEMO-08', 'issued',         'advance', 8),
    (9,  'ORD-DEMO-09', 'draft',          'advance', 5),
    (10, 'ORD-DEMO-10', 'issued',         'advance', 2)
  ) v(n, ord, status, event, days)
  join orders o on o.order_code = v.ord
  on conflict (invoice_code) do nothing;

  insert into invoice_items (invoice_id, line_item, quantity, unit_price, tax_amount, total_price, tax_rate, taxable_value, sort_order)
  select i.id, 'Solar PV system supply and installation', 1, i.subtotal, i.tax_amount, i.total_amount, 8.9, i.subtotal, 0
  from invoices i
  where i.invoice_code like 'INV-DEMO-%' and not exists (select 1 from invoice_items x where x.invoice_id = i.id);

  insert into expenses (expense_code, category, description, amount, incurred_date, approval_status, vendor_name)
  select 'EXP-DEMO-' || lpad(v.n::text, 2, '0'), v.cat, v.descr, v.amount, current_date - v.days, v.approval, v.vendor
  from (values
    (1,  'purchase',            'Solar panels, batch 12',               1920000, 20, 'approved', 'Waaree Energies'),
    (2,  'purchase',            'On-grid inverters',                    560000,  16, 'approved', 'Growatt India'),
    (3,  'transportation',      'Truck hire, Delhi to Gurugram',        14500,   9,  'approved', 'Sharma Transport'),
    (4,  'installation_labour', 'Crew payment, Gupta residence',        32000,   28, 'approved', 'In-house crew'),
    (5,  'maintenance',         'Van service and fuel',                 9800,    12, 'approved', 'City Motors'),
    (6,  'office',              'Warehouse electricity bill',           18600,   7,  'approved', 'Delhi Discom'),
    (7,  'other',               'Safety harness and helmets',           22400,   15, 'pending',  'Safe Works'),
    (8,  'transportation',      'Courier for documents',                2400,    4,  'approved', 'Blue Dart'),
    (9,  'installation_labour', 'Crew payment, Kapoor residence',       28000,   3,  'pending',  'In-house crew'),
    (10, 'purchase',            'Mounting structures',                  300000,  12, 'approved', 'Galvano Structures')
  ) v(n, cat, descr, amount, days, approval, vendor)
  on conflict (expense_code) do nothing;

  insert into project_costs (order_id, cost_category, amount, incurred_date, description)
  select o.id, v.cat, v.amount, current_date - v.days, v.descr
  from (values
    ('ORD-DEMO-01', 'equipment', 210000, 40, 'Panels and inverter for the order'),
    ('ORD-DEMO-01', 'labour',    32000,  28, 'Installation crew'),
    ('ORD-DEMO-02', 'equipment', 150000, 30, 'Panels, hybrid inverter and batteries'),
    ('ORD-DEMO-02', 'logistics', 6500,   5,  'Delivery to Noida'),
    ('ORD-DEMO-03', 'equipment', 175000, 26, 'Panels and inverter'),
    ('ORD-DEMO-04', 'equipment', 215000, 22, 'Panels and inverter'),
    ('ORD-DEMO-05', 'equipment', 420000, 18, 'Panels and structures for the dairy'),
    ('ORD-DEMO-05', 'permits',   12000,  15, 'Net-metering application fee'),
    ('ORD-DEMO-06', 'equipment', 430000, 14, 'Panels and inverters for the school'),
    ('ORD-DEMO-08', 'logistics', 4800,   6,  'Transport to Kochi')
  ) v(ord, cat, amount, days, descr)
  join orders o on o.order_code = v.ord
  where not exists (select 1 from project_costs c where c.order_id = o.id and c.description = v.descr);

  insert into financial_transactions (transaction_code, transaction_type, amount, reference_type, reference_id, transaction_date, order_id, description)
  select 'TXN-DEMO-' || lpad(row_number() over (order by p.payment_code)::text, 2, '0'), 'payment_received', p.amount, 'payment', p.id,
         p.paid_at, p.order_id, 'Payment ' || p.payment_code || ' received'
  from payments p
  where p.payment_code like 'PAY-DEMO-%'
  on conflict (transaction_code) do nothing;
exception when others then raise notice 'Section 10 (finance) skipped: %', sqlerrm; end $$;

-- ---------- 11. subsidy applications --------------------------------------------------
do $$ begin
  insert into subsidy_applications (application_code, customer_id, order_id, subsidy_program, amount_applied, amount_approved, status,
                                    system_capacity_kw, submitted_at, approved_at, notes, last_status_change_at)
  select 'SUB-DEMO-' || lpad(v.n::text, 2, '0'), o.customer_id, o.id, 'PM Surya Ghar Muft Bijli Yojana', v.applied,
         case when v.status in ('approved', 'completed', 'disbursed') then v.applied end, v.status, o.system_capacity_kw,
         case when v.status not in ('draft', 'documents_required', 'ready_for_submission') then now() - (v.days || ' days')::interval end,
         case when v.status in ('approved', 'completed', 'disbursed') then now() - ((v.days - 5) || ' days')::interval end,
         v.note, now() - (v.days || ' days')::interval
  from (values
    (1, 'ORD-DEMO-01', 'completed',          78000, 35, 'Subsidy credited to the customer account'),
    (2, 'ORD-DEMO-02', 'approved',           54000, 28, 'Approved, awaiting disbursal'),
    (3, 'ORD-DEMO-03', 'under_review',       72000, 22, 'Portal verification under way'),
    (4, 'ORD-DEMO-04', 'submitted',          78000, 15, 'Submitted on the national portal'),
    (5, 'ORD-DEMO-05', 'documents_required', 78000, 12, 'Electricity bill copy missing'),
    (6, 'ORD-DEMO-06', 'ready_for_submission',78000,9,  'All documents verified'),
    (7, 'ORD-DEMO-07', 'draft',              78000, 6,  'Waiting for the order to be confirmed'),
    (8, 'ORD-DEMO-08', 'rejected',           54000, 18, 'Rejected: roof ownership proof unclear'),
    (9, 'ORD-DEMO-09', 'draft',              78000, 4,  'Application being prepared'),
    (10,'ORD-DEMO-10', 'submitted',          72000, 3,  'Submitted this week')
  ) v(n, ord, status, applied, days, note)
  join orders o on o.order_code = v.ord
  on conflict (application_code) do nothing;
exception when others then raise notice 'Section 11 (subsidy) skipped: %', sqlerrm; end $$;

-- ---------- 12. recent activity (shown on the Admin overview) --------------------------
do $$ begin
  insert into activity_logs (actor_id, action, entity_type, entity_id, metadata, created_at)
  select pg_temp.emp('sales_email'), v.action, v.etype,
         case v.etype when 'lead' then (select id from leads where lead_code = v.code)
                      when 'quotation' then (select id from quotations where quotation_code = v.code)
                      when 'order' then (select id from orders where order_code = v.code) end,
         jsonb_build_object('code', v.code, 'demo', true), now() - (v.hours || ' hours')::interval
  from (values
    ('LEAD_CREATED',        'lead',      'LEAD-DEMO-09', 48),
    ('LEAD_ASSIGNED',       'lead',      'LEAD-DEMO-08', 40),
    ('QUOTATION_CREATED',   'quotation', 'QTN-DEMO-11',  36),
    ('QUOTATION_AI_DRAFTED','quotation', 'QTN-DEMO-12',  30),
    ('QUOTATION_SENT',      'quotation', 'QTN-DEMO-11',  28),
    ('ORDER_PAYMENT_RECORDED','order',   'ORD-DEMO-10',  20),
    ('ORDER_PAYMENT_RECORDED','order',   'ORD-DEMO-08',  16),
    ('ORDER_HANDOFF',       'order',     'ORD-DEMO-04',  12),
    ('ORDER_CONFIRMED',     'order',     'ORD-DEMO-06',  8),
    ('ORDER_PAYMENT_RECORDED','order',   'ORD-DEMO-06',  4)
  ) v(action, etype, code, hours)
  where not exists (select 1 from activity_logs a where a.metadata->>'code' = v.code and a.action = v.action and a.metadata->>'demo' = 'true');
exception when others then raise notice 'Section 12 (activity) skipped: %', sqlerrm; end $$;

-- ---------- 13. link the demo customers to their sign-in accounts ------------------------
do $$ begin
  update customers c set profile_id = p.id
  from profiles p
  where c.customer_code like 'CUST-DEMO-%' and c.profile_id is null
    and p.account_type = 'customer' and lower(p.email) = lower(c.email);
exception when others then raise notice 'Section 13 (customer links) skipped: %', sqlerrm; end $$;

-- ---------- done: quick count so you can see what was added ------------------------------
select 'customers' as table_name, count(*) as demo_rows from customers where customer_code like 'CUST-DEMO-%'
union all select 'leads', count(*) from leads where lead_code like 'LEAD-DEMO-%'
union all select 'site_surveys', count(*) from site_surveys where survey_code like 'SRV-DEMO-%'
union all select 'quotations', count(*) from quotations where quotation_code like 'QTN-DEMO-%'
union all select 'orders', count(*) from orders where order_code like 'ORD-DEMO-%'
union all select 'payments', count(*) from payments where payment_code like 'PAY-DEMO-%'
union all select 'inventory', count(*) from inventory i join warehouses w on w.id = i.warehouse_id where w.code like 'WH-DEMO-%'
union all select 'purchase_orders', count(*) from purchase_orders where po_code like 'PO-DEMO-%'
union all select 'serial_numbers', count(*) from equipment_serial_numbers where serial_number like 'SN-DEMO-%'
union all select 'dispatches', count(*) from dispatches where dispatch_code like 'DSP-DEMO-%'
union all select 'installations', count(*) from installations where installation_code like 'INS-DEMO-%'
union all select 'warranties', count(*) from warranties where warranty_code like 'WAR-DEMO-%'
union all select 'service_tickets', count(*) from service_tickets where ticket_code like 'TKT-DEMO-%'
union all select 'invoices', count(*) from invoices where invoice_code like 'INV-DEMO-%'
union all select 'expenses', count(*) from expenses where expense_code like 'EXP-DEMO-%'
union all select 'subsidy_applications', count(*) from subsidy_applications where application_code like 'SUB-DEMO-%';
