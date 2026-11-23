// Installation, technician assignment and project execution, on the real database.
//
// Everything is stored in Supabase so that the installation team, the customer's
// "Installation tracking" page, support, finance and the admin reports all read
// the same record:
//   installations / technician_assignments / installation_tasks / installation_photos /
//   customer_signatures / installation_reports   (+ the order, the dispatch and the serial numbers)
//
// A job is created from an order whose equipment has been delivered ("Ready for install").
// Order status follows the job: Ready for install -> Installation in progress -> Completed.
// Warranty is NOT touched here: it starts at delivery, not at installation.
import { createAdminClient } from '../supabase/client.js';
import { canTransitionOrder } from '../quotation/status.js';
import { bomFor } from '../warehouse/fulfilmentDb.js';

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
  { name: 'Customer demonstration completed', is_required: true, order_index: 11, notes: 'Demonstrate app monitoring, emergency shutdown procedure, and panel cleaning guidelines.' },
];

export const INSTALLATION_STATUSES = [
  'pending',
  'assigned',
  'scheduled',
  'in_progress',
  'on_hold',
  'inspection_required',
  'completed',
  'cancelled',
];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CLOSED = ['completed', 'cancelled'];
const ELIGIBLE_ORDER_STATUSES = ['ready_for_install'];

const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const nowIso = () => new Date().toISOString();
const dateOnly = (v) => (v ? String(v).split('T')[0] : null);
const hasData = (o) => Boolean(o) && typeof o === 'object' && Object.keys(o).length > 0;

function db() {
  try {
    return createAdminClient();
  } catch {
    throw fail('Database is not configured.', 500);
  }
}

async function must(promise, what) {
  const { data, error } = await promise;
  if (error) throw fail(`${what}: ${error.message}`, 500);
  return data;
}

// ---------------------------------------------------------------- history

/** Status changes are kept in the activity log so they survive restarts and show in the admin Activity Log. */
async function writeHistory(client, jobId, actorId, status, notes) {
  await client.from('activity_logs').insert({
    actor_id: actorId || null,
    action: 'INSTALLATION_HISTORY',
    entity_type: 'installation',
    entity_id: jobId,
    metadata: { status, notes: notes || null },
  });
}

// ---------------------------------------------------------------- order sync

/** Moves the order along with the installation job (never backwards, never out of a closed order). */
async function syncOrderStatus(client, orderId, target, actorId, notes) {
  const { data: order } = await client.from('orders').select('id, status').eq('id', orderId).maybeSingle();
  if (!order || order.status === target) return;
  if (!canTransitionOrder(order.status, target)) return;
  const ts = nowIso();
  await client.from('orders').update({ status: target, updated_at: ts, updated_by: actorId || null }).eq('id', orderId);
  await client.from('order_status_history').insert({
    order_id: orderId, previous_status: order.status, new_status: target, changed_by: actorId || null, notes,
  });
}

// ---------------------------------------------------------------- composing a job

async function composeJobs(client, rows) {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const orderIds = [...new Set(rows.map((r) => r.order_id))];

  const [orders, assigns, tasks, photos, sigs, history, dispatches, serials] = await Promise.all([
    must(
      client.from('orders')
        .select('id, order_code, status, customer_id, quotation_id, system_type, system_capacity_kw, customer:customer_id ( id, contact_name, company_name, phone, email ), quotation:quotation_id ( id, installation_address, site_survey_id )')
        .in('id', orderIds),
      'Could not load orders',
    ),
    must(
      client.from('technician_assignments')
        .select('id, installation_id, role_on_job, is_primary, assigned_at, technician:technician_id ( id, employee_code, full_name, phone, profile_id, profile:profile_id ( full_name, phone ) )')
        .in('installation_id', ids).is('unassigned_at', null).order('assigned_at', { ascending: true }),
      'Could not load assignments',
    ),
    must(client.from('installation_tasks').select('*').in('installation_id', ids).order('order_index', { ascending: true }), 'Could not load checklist'),
    must(client.from('installation_photos').select('*').in('installation_id', ids).order('uploaded_at', { ascending: true }), 'Could not load photos'),
    must(client.from('customer_signatures').select('*').in('installation_id', ids).order('signed_at', { ascending: false }), 'Could not load signatures'),
    must(
      client.from('activity_logs').select('entity_id, metadata, created_at').eq('entity_type', 'installation').eq('action', 'INSTALLATION_HISTORY')
        .in('entity_id', ids).order('created_at', { ascending: true }),
      'Could not load history',
    ),
    must(
      client.from('dispatches').select('order_id, dispatch_code, status, delivered_at, delivery_date, notes, warehouse:warehouse_id ( name )').in('order_id', orderIds).neq('status', 'cancelled'),
      'Could not load deliveries',
    ),
    must(client.from('equipment_serial_numbers').select('serial_number, product_id, order_id, warranty_start_date, status').in('order_id', orderIds), 'Could not load serial numbers'),
  ]);

  // people who completed tasks / uploaded photos
  const people = new Set();
  tasks.forEach((t) => t.completed_by && people.add(t.completed_by));
  photos.forEach((p) => p.uploaded_by && people.add(p.uploaded_by));
  const names = new Map();
  if (people.size) {
    const profs = await must(client.from('profiles').select('id, full_name').in('id', [...people]), 'Could not load people');
    profs.forEach((p) => names.set(p.id, p.full_name));
  }

  const customerIds = [...new Set(orders.map((o) => o.customer_id))];
  const surveyIds = [...new Set([...rows.map((r) => r.site_survey_id), ...orders.map((o) => o.quotation?.site_survey_id)].filter(Boolean))];
  const [addresses, surveys] = await Promise.all([
    customerIds.length
      ? must(client.from('customer_addresses').select('customer_id, street, city, is_primary').in('customer_id', customerIds), 'Could not load addresses')
      : [],
    surveyIds.length ? must(client.from('site_surveys').select('*').in('id', surveyIds), 'Could not load surveys') : [],
  ]);

  const orderById = new Map(orders.map((o) => [o.id, o]));
  const surveyById = new Map(surveys.map((s) => [s.id, s]));

  const out = [];
  for (const r of rows) {
    const o = orderById.get(r.order_id) || {};
    const c = o.customer || {};
    const addr = addresses.filter((a) => a.customer_id === o.customer_id).sort((a, b) => Number(b.is_primary) - Number(a.is_primary))[0];
    const survey = surveyById.get(r.site_survey_id) || surveyById.get(o.quotation?.site_survey_id) || null;
    const dispatch = dispatches.find((d) => d.order_id === r.order_id);
    const sig = sigs.find((s) => s.installation_id === r.id);
    const verified = new Set(r.verified_serials || []);

    // equipment = what was ordered, with the serial numbers that were packed and delivered
    const orderSerials = serials.filter((s) => s.order_id === r.order_id);
    const bom = o.quotation_id ? await bomFor(client, { id: r.order_id, quotation_id: o.quotation_id }) : [];
    const equipment_items = bom.map((b) => {
      const mine = orderSerials.filter((s) => s.product_id === b.product_id);
      const expected = mine.map((s) => s.serial_number);
      const allVerified = expected.length > 0 && expected.every((s) => verified.has(s));
      return {
        id: b.id,
        product_id: b.product_id,
        product_name: b.product_name,
        sku: b.product_sku,
        quantity: b.quantity,
        expected_serials: expected,
        verified_serials: expected.filter((s) => verified.has(s)),
        status: allVerified ? 'verified' : 'delivered',
        warranty_start_date: mine.map((s) => s.warranty_start_date).filter(Boolean).sort()[0] || null,
        warranty_duration_years: b.warranty_years ?? null,
      };
    });

    const myTasks = tasks.filter((t) => t.installation_id === r.id).map((t) => ({
      ...t,
      completed_by: t.completed_by ? names.get(t.completed_by) || 'Technician' : null,
    }));
    const myPhotos = photos.filter((p) => p.installation_id === r.id).map((p) => ({
      ...p, uploaded_by_name: p.uploaded_by ? names.get(p.uploaded_by) || 'Technician' : null,
    }));

    out.push({
      ...r,
      order_code: o.order_code || '',
      order_status: o.status || null,
      customer_name: c.company_name || c.contact_name || 'Customer',
      contact_phone: c.phone || '',
      contact_email: c.email || '',
      site_address: r.site_address || o.quotation?.installation_address || addr?.street || '',
      city: addr?.city || '',
      system_type: r.system_type || o.system_type || 'on-grid',
      system_capacity_kw: Number(r.system_capacity_kw ?? o.system_capacity_kw) || 0,
      survey_code: survey?.survey_code || null,
      survey_info: survey
        ? { survey_code: survey.survey_code, roof_type: survey.roof_type || null, roof_area_sqm: survey.roof_area_sqm, sanctioned_load_kw: survey.sanctioned_load_kw ?? null, roof_direction: survey.roof_direction, shading_info: survey.shading_info }
        : null,
      delivery_info: dispatch
        ? {
            dispatch_code: dispatch.dispatch_code,
            status: dispatch.status,
            delivery_date: dispatch.delivery_date || dateOnly(dispatch.delivered_at),
            delivered_at: dispatch.delivered_at,
            warehouse_name: dispatch.warehouse?.name || null,
            delivery_notes: (dispatch.notes || '').split('|')[1] || dispatch.notes || '',
          }
        : null,
      assigned_technicians: assigns.filter((a) => a.installation_id === r.id).map((a) => ({
        technician_id: a.technician?.id,
        profile_id: a.technician?.profile_id || null,
        employee_code: a.technician?.employee_code,
        full_name: a.technician?.profile?.full_name || a.technician?.full_name || 'Technician',
        phone: a.technician?.profile?.phone || a.technician?.phone || '',
        role_on_job: a.role_on_job,
        is_primary: a.is_primary,
        assigned_at: a.assigned_at,
      })),
      commissioning_data: hasData(r.commissioning_data) ? r.commissioning_data : null,
      equipment_verified: Boolean(r.equipment_verified),
      exception_recorded: Boolean(r.exception_recorded),
      tasks: myTasks,
      photos: myPhotos,
      customer_signature: sig
        ? { id: sig.id, customer_name: sig.customer_name, signature_storage_path: sig.signature_storage_path, signed_at: sig.signed_at, consent_text: sig.consent_text }
        : null,
      equipment_items,
      status_history: history.filter((h) => h.entity_id === r.id).map((h) => ({ status: h.metadata?.status, notes: h.metadata?.notes, changed_at: h.created_at })),
    });
  }
  return out;
}

async function loadJob(client, idOrCode) {
  const col = UUID.test(idOrCode || '') ? 'id' : 'installation_code';
  const row = await must(client.from('installations').select('*').eq(col, idOrCode).maybeSingle(), 'Could not load installation');
  if (!row) return null;
  return (await composeJobs(client, [row]))[0];
}

async function requireRow(client, jobId) {
  const col = UUID.test(jobId || '') ? 'id' : 'installation_code';
  const row = await must(client.from('installations').select('*').eq(col, jobId).maybeSingle(), 'Could not load installation');
  if (!row) throw fail('Installation job not found.', 404);
  return row;
}

async function technicianFor(client, profile) {
  if (!profile?.id) return null;
  const { data } = await client.from('technicians').select('id').eq('profile_id', profile.id).maybeSingle();
  return data || null;
}

async function assignedJobIds(client, technicianId) {
  if (!technicianId) return [];
  const rows = await must(client.from('technician_assignments').select('installation_id').eq('technician_id', technicianId).is('unassigned_at', null), 'Could not load assignments');
  return rows.map((r) => r.installation_id).filter(Boolean);
}

// ---------------------------------------------------------------- technicians

/** Installation-team staff get a technician record the first time they are needed. */
async function ensureTechnicianRows(client) {
  const depts = await must(client.from('departments').select('id, code, name'), 'Could not load departments');
  const deptIds = depts.filter((d) => /install|technic/i.test(`${d.code} ${d.name}`)).map((d) => d.id);
  if (!deptIds.length) return;

  const [direct, linked, existing] = await Promise.all([
    must(client.from('profiles').select('id, full_name, email, phone').eq('account_type', 'employee').eq('is_active', true).in('department_id', deptIds), 'Could not load staff'),
    client.from('employee_departments').select('employee_id').in('department_id', deptIds).eq('is_approved', true),
    must(client.from('technicians').select('profile_id'), 'Could not load technicians'),
  ]);
  const have = new Set(existing.map((t) => t.profile_id));
  const people = new Map(direct.map((p) => [p.id, p]));
  const extraIds = (linked.data || []).map((r) => r.employee_id).filter((id) => !people.has(id));
  if (extraIds.length) {
    const more = await must(client.from('profiles').select('id, full_name, email, phone').eq('is_active', true).in('id', extraIds), 'Could not load staff');
    more.forEach((p) => people.set(p.id, p));
  }
  const fresh = [...people.values()].filter((p) => !have.has(p.id));
  if (!fresh.length) return;
  await client.from('technicians').insert(fresh.map((p) => ({
    profile_id: p.id,
    employee_code: `TECH-${p.id.slice(0, 6).toUpperCase()}`,
    full_name: p.full_name,
    email: p.email,
    phone: p.phone,
    skills: [],
    certifications: [],
    is_available: true,
  })));
}

async function technicianList(client) {
  await ensureTechnicianRows(client);
  const techs = await must(client.from('technicians').select('*, profile:profile_id ( full_name, email, phone, is_active )').order('created_at', { ascending: true }), 'Could not load technicians');
  const assigns = await must(
    client.from('technician_assignments').select('technician_id, installation:installation_id ( id, installation_code, status, planned_installation_date, order_id )').is('unassigned_at', null),
    'Could not load assignments',
  );
  return techs.filter((t) => t.profile?.is_active !== false).map((t) => {
    const mine = assigns.filter((a) => a.technician_id === t.id && a.installation);
    const active = mine.filter((a) => !CLOSED.includes(a.installation.status));
    const done = mine.filter((a) => a.installation.status === 'completed');
    const pct = Math.min(100, Math.round((active.length / (t.max_daily_jobs || 1)) * 100));
    return {
      ...t,
      full_name: t.profile?.full_name || t.full_name || 'Technician',
      email: t.profile?.email || t.email || '',
      phone: t.profile?.phone || t.phone || '',
      skills: t.skills || [],
      certifications: t.certifications || [],
      active_assignments: active.length,
      completed_installations: done.length,
      workload_pct: pct,
      current_workload_pct: pct,
      assigned_jobs: active.map((a) => ({
        id: a.installation.id,
        installation_code: a.installation.installation_code,
        status: a.installation.status,
        planned_installation_date: a.installation.planned_installation_date,
      })),
    };
  });
}

/** How many other active jobs does this technician already have on that date? */
async function jobsOnDate(client, technicianId, date, exceptJobId) {
  const ids = (await assignedJobIds(client, technicianId)).filter((id) => id !== exceptJobId);
  if (!ids.length) return 0;
  const rows = await must(client.from('installations').select('id, status').in('id', ids).eq('planned_installation_date', date), 'Could not check the schedule');
  return rows.filter((r) => !CLOSED.includes(r.status)).length;
}

// ---------------------------------------------------------------- status engine

async function applyStatus(client, row, newStatus, notes, actor, extra = {}) {
  const ts = nowIso();
  const patch = { status: newStatus, updated_at: ts, updated_by: actor?.id || null, ...extra };
  if (newStatus === 'in_progress' && !row.actual_start) patch.actual_start = ts;
  if (newStatus === 'completed' && !row.actual_end) patch.actual_end = ts;
  await must(client.from('installations').update(patch).eq('id', row.id), 'Could not update installation');
  await writeHistory(client, row.id, actor?.id, newStatus, notes);

  if (newStatus === 'in_progress') {
    await syncOrderStatus(client, row.order_id, 'installation_in_progress', actor?.id, `Installation ${row.installation_code} started`);
  }
  if (newStatus === 'completed') {
    await syncOrderStatus(client, row.order_id, 'completed', actor?.id, `Installation ${row.installation_code} completed`);
    await client.from('equipment_serial_numbers')
      .update({ status: 'installed', current_location: 'Installed at customer site', updated_at: ts })
      .eq('order_id', row.order_id).in('status', ['delivered', 'dispatched']);
  }
}

function completionBlockers(job) {
  const blockers = [];
  if (!job.equipment_verified && !job.exception_recorded) {
    blockers.push('Equipment serial verification is incomplete and no authorised exception is recorded.');
  }
  const open = (job.tasks || []).filter((t) => t.is_required && !t.is_completed);
  if (open.length) blockers.push(`${open.length} required checklist task(s) are not done (${open.map((t) => t.task_name).join(', ')}).`);
  if (!job.commissioning_data) blockers.push('The testing and commissioning form has not been submitted.');
  if (!job.customer_signature) blockers.push("The customer's acknowledgement signature is missing.");
  return blockers;
}

// ================================================================= the store

export const installationStore = {
  // 1. Dashboard
  async getDashboardMetrics() {
    const client = db();
    const rows = await must(client.from('installations').select('*').order('created_at', { ascending: false }), 'Could not load installations');
    const jobs = await composeJobs(client, rows);
    const todayStr = new Date().toISOString().split('T')[0];
    const count = (s) => jobs.filter((j) => j.status === s).length;

    const delayed = jobs.filter((j) => {
      if (CLOSED.includes(j.status)) return false;
      if (j.status === 'on_hold') return true;
      return Boolean(j.expected_completion_date) && j.expected_completion_date < todayStr;
    }).length;
    const upcoming = jobs.filter((j) => ['scheduled', 'assigned'].includes(j.status) && j.planned_installation_date && j.planned_installation_date >= todayStr).length;

    const technicianWorkload = await technicianList(client);
    const recent = await must(
      client.from('activity_logs').select('entity_id, metadata, created_at').eq('entity_type', 'installation').eq('action', 'INSTALLATION_HISTORY').order('created_at', { ascending: false }).limit(10),
      'Could not load activity',
    );
    const byId = new Map(jobs.map((j) => [j.id, j]));
    const recentActivity = recent.filter((h) => byId.has(h.entity_id)).map((h) => ({
      job_id: h.entity_id,
      installation_code: byId.get(h.entity_id).installation_code,
      customer_name: byId.get(h.entity_id).customer_name,
      status: h.metadata?.status,
      notes: h.metadata?.notes,
      timestamp: h.created_at,
    }));

    return {
      kpis: {
        totalProjects: jobs.length,
        pending: count('pending'),
        assigned: count('assigned'),
        scheduled: count('scheduled'),
        inProgress: count('in_progress'),
        completed: count('completed'),
        delayed,
        upcoming,
        onHold: count('on_hold'),
        inspectionRequired: count('inspection_required'),
      },
      statusDistribution: [
        { name: 'Pending', count: count('pending'), color: '#f59e0b' },
        { name: 'Assigned', count: count('assigned'), color: '#3b82f6' },
        { name: 'Scheduled', count: count('scheduled'), color: '#06b6d4' },
        { name: 'In Progress', count: count('in_progress'), color: '#8b5cf6' },
        { name: 'On Hold', count: count('on_hold'), color: '#f97316' },
        { name: 'Inspection Required', count: count('inspection_required'), color: '#eab308' },
        { name: 'Completed', count: count('completed'), color: '#10b981' },
        { name: 'Cancelled', count: count('cancelled'), color: '#ef4444' },
      ],
      technicianWorkload,
      recentActivity,
      upcomingInstallations: jobs
        .filter((j) => ['scheduled', 'assigned'].includes(j.status))
        .sort((a, b) => (a.planned_installation_date || '').localeCompare(b.planned_installation_date || ''))
        .slice(0, 5),
    };
  },

  // 2. Jobs list. `canManage` false -> only the technician's own jobs.
  async getJobs({ search = '', status = '', technician_id = '', date = '', page = 1, limit = 50 } = {}, profile = null, canManage = true, isTechnician = false) {
    const client = db();
    let q = client.from('installations').select('*').order('created_at', { ascending: false });

    if (!canManage && isTechnician && profile) {
      const mine = await assignedJobIds(client, (await technicianFor(client, profile))?.id);
      const filter = [`created_by.eq.${profile.id}`];
      if (mine.length) filter.push(`id.in.(${mine.join(',')})`);
      q = q.or(filter.join(','));
    }
    if (status && status !== 'all') q = q.eq('status', status);
    if (technician_id && technician_id !== 'all') {
      const ids = await assignedJobIds(client, technician_id);
      if (!ids.length) return { jobs: [], pagination: { total: 0, page, limit, totalPages: 0 } };
      q = q.in('id', ids);
    }
    if (date) q = q.eq('planned_installation_date', date);

    let jobs = await composeJobs(client, await must(q, 'Could not load installations'));
    if (search) {
      const s = search.toLowerCase();
      jobs = jobs.filter((j) => [j.installation_code, j.order_code, j.customer_name, j.site_address, j.city].some((v) => String(v || '').toLowerCase().includes(s)));
    }
    const total = jobs.length;
    const start = (page - 1) * limit;
    return { jobs: jobs.slice(start, start + limit), pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  },

  // 3. One job
  async getJobById(id, profile = null, canManage = true) {
    const client = db();
    const job = await loadJob(client, id);
    if (!job) return null;
    if (!canManage && profile) {
      const mine = (job.assigned_technicians || []).some((a) => a.profile_id === profile.id);
      if (!mine && job.created_by !== profile.id) {
        throw fail('Access denied. You are not assigned to this installation job.', 403);
      }
    }
    return job;
  },

  async updateJobMeta(jobId, { notes, site_address }, actor = null) {
    const client = db();
    const row = await requireRow(client, jobId);
    const patch = { updated_at: nowIso(), updated_by: actor?.id || null };
    if (notes !== undefined) patch.notes = notes;
    if (site_address !== undefined) patch.site_address = site_address;
    await must(client.from('installations').update(patch).eq('id', row.id), 'Could not update installation');
    return loadJob(client, row.id);
  },

  // 4. Create from a delivered order. Only the order id is trusted; everything else is read from the database.
  async createJobFromOrder(orderData, actor = null) {
    const client = db();
    const key = orderData.order_id || orderData.id;
    const col = UUID.test(key || '') ? 'id' : 'order_code';
    const order = await must(
      client.from('orders').select('id, order_code, status, customer_id, quotation_id, system_type, system_capacity_kw, quotation:quotation_id ( installation_address, site_survey_id )').eq(col, key).maybeSingle(),
      'Could not load the order',
    );
    if (!order) throw fail('Order not found.', 404);

    const existing = await must(client.from('installations').select('id').eq('order_id', order.id).neq('status', 'cancelled').limit(1), 'Could not check existing jobs');
    if (existing.length) {
      const job = await loadJob(client, existing[0].id);
      return { job, already_exists: true, message: `An installation project already exists for order ${order.order_code}: ${job.installation_code}` };
    }
    if (!ELIGIBLE_ORDER_STATUSES.includes(order.status)) {
      throw fail('Installation can be planned only after the equipment has been delivered (order status "Ready for install").', 409);
    }

    const year = new Date().getFullYear();
    let inserted = null;
    for (let attempt = 0; attempt < 5 && !inserted; attempt += 1) {
      const code = `INST-${year}-${String(Math.floor(Math.random() * 90000) + 10000)}`;
      const { data, error } = await client.from('installations').insert({
        installation_code: code,
        order_id: order.id,
        customer_id: order.customer_id,
        site_survey_id: order.quotation?.site_survey_id || null,
        status: 'pending',
        system_type: order.system_type || 'on-grid',
        system_capacity_kw: order.system_capacity_kw,
        site_address: order.quotation?.installation_address || null,
        planned_installation_date: dateOnly(orderData.planned_installation_date),
        expected_completion_date: dateOnly(orderData.expected_completion_date),
        notes: orderData.notes || 'Created from a delivered order.',
        created_by: actor?.id || null,
        updated_by: actor?.id || null,
      }).select('id').single();
      if (!error) inserted = data;
      else if (!/duplicate|unique/i.test(error.message)) throw fail(error.message, 500);
    }
    if (!inserted) throw fail('Could not generate a unique installation code. Please try again.', 500);

    await must(client.from('installation_tasks').insert(STANDARD_INSTALLATION_TASKS.map((t) => ({
      installation_id: inserted.id, task_name: t.name, is_required: t.is_required, is_completed: false, notes: t.notes, order_index: t.order_index,
    }))), 'Could not create the checklist');
    await writeHistory(client, inserted.id, actor?.id, 'pending', `Installation job created from order ${order.order_code}`);

    return { job: await loadJob(client, inserted.id), already_exists: false, message: 'Installation job created successfully.' };
  },

  // 5. Assign technicians (several, one lead, no double booking)
  async assignTechnicians(jobId, { assignments = [], scheduled_start, expected_completion, notes }, actor = null) {
    const client = db();
    const row = await requireRow(client, jobId);
    if (CLOSED.includes(row.status)) throw fail('This installation is already closed.', 409);
    if (!Array.isArray(assignments) || assignments.length === 0) throw fail('At least one technician assignment is required.');

    const scheduledDate = dateOnly(scheduled_start || row.scheduled_start || row.planned_installation_date) || dateOnly(nowIso());
    const techs = await must(client.from('technicians').select('*, profile:profile_id ( full_name, phone )').in('id', assignments.map((a) => a.technician_id).filter((id) => UUID.test(id || ''))), 'Could not load technicians');

    const conflicts = [];
    const picked = [];
    for (const a of assignments) {
      const tech = techs.find((t) => t.id === a.technician_id);
      if (!tech) throw fail(`Technician ${a.technician_id} does not exist.`);
      const name = tech.profile?.full_name || tech.full_name || tech.employee_code;
      if (!tech.is_available) throw fail(`Technician ${name} is currently marked as unavailable.`);
      const busy = await jobsOnDate(client, tech.id, scheduledDate, row.id);
      if (busy >= (tech.max_daily_jobs || 1)) {
        conflicts.push(`Technician ${name} has already reached maximum capacity (${tech.max_daily_jobs || 1} job(s)) on ${scheduledDate}.`);
      }
      picked.push({ tech, name, role: a.role_on_job || (a.is_primary ? 'lead_technician' : 'technician'), primary: Boolean(a.is_primary) });
    }
    if (conflicts.length) throw fail(conflicts.join(' '), 409);

    if (!picked.some((p) => p.primary || p.role === 'lead_technician')) {
      picked[0].primary = true;
      picked[0].role = 'lead_technician';
    }

    const ts = nowIso();
    await must(client.from('technician_assignments').update({ unassigned_at: ts }).eq('installation_id', row.id).is('unassigned_at', null), 'Could not replace assignments');
    await must(client.from('technician_assignments').insert(picked.map((p) => ({
      technician_id: p.tech.id, installation_id: row.id, role_on_job: p.role, is_primary: p.primary, assigned_at: ts,
    }))), 'Could not save assignments');

    const patch = {};
    if (scheduled_start) {
      patch.scheduled_start = scheduled_start;
      patch.planned_installation_date = scheduledDate;
    }
    if (expected_completion) patch.expected_completion_date = dateOnly(expected_completion);
    const willBeScheduled = Boolean(scheduled_start || row.scheduled_start);
    const lead = picked.find((p) => p.primary);
    await applyStatus(client, row, willBeScheduled ? 'scheduled' : 'assigned',
      notes || `Assigned ${picked.length} technician(s) (Lead: ${lead?.name || 'N/A'})`, actor, patch);

    const job = await loadJob(client, row.id);
    return { job, assignments: job.assigned_technicians };
  },

  // 6. Schedule / reschedule
  async scheduleJob(jobId, { scheduled_start, expected_completion, notes }, actor = null) {
    const client = db();
    const row = await requireRow(client, jobId);
    if (CLOSED.includes(row.status)) throw fail('This installation is already closed.', 409);
    if (!scheduled_start) throw fail('Scheduled start timestamp is required.');
    const newDate = dateOnly(scheduled_start);

    const current = await must(
      client.from('technician_assignments').select('technician:technician_id ( id, max_daily_jobs, full_name, profile:profile_id ( full_name ) )').eq('installation_id', row.id).is('unassigned_at', null),
      'Could not load assignments',
    );
    for (const a of current) {
      const t = a.technician;
      if (!t) continue;
      if ((await jobsOnDate(client, t.id, newDate, row.id)) >= (t.max_daily_jobs || 1)) {
        throw fail(`Cannot schedule: Technician ${t.profile?.full_name || t.full_name} is already booked to capacity on ${newDate}.`, 409);
      }
    }

    const reschedule = Boolean(row.scheduled_start);
    const patch = { scheduled_start, planned_installation_date: newDate };
    if (expected_completion) patch.expected_completion_date = dateOnly(expected_completion);
    await applyStatus(client, row, 'scheduled', notes || (reschedule ? `Rescheduled to ${newDate}` : `Scheduled for ${newDate}`), actor, patch);
    return loadJob(client, row.id);
  },

  // 7. Verify the delivered serial numbers on site
  async verifyEquipment(jobId, { verified_serials = [], missing_items = [], damaged_items = [], exception_recorded = false, exception_notes = null }, actor = null) {
    const client = db();
    const row = await requireRow(client, jobId);
    if (CLOSED.includes(row.status)) throw fail('This installation is already closed.', 409);
    const job = await loadJob(client, row.id);

    const expected = job.equipment_items.flatMap((e) => e.expected_serials);
    const already = new Set(row.verified_serials || []);
    for (const s of verified_serials) if (expected.includes(s)) already.add(s);
    const allVerified = expected.every((s) => already.has(s));

    const hasExceptions = Boolean(exception_recorded) || missing_items.length > 0 || damaged_items.length > 0;
    await must(client.from('installations').update({
      verified_serials: [...already],
      equipment_verified: allVerified || Boolean(exception_recorded),
      exception_recorded: hasExceptions,
      exception_notes: exception_notes || (hasExceptions ? `Missing: ${missing_items.join(', ') || 'None'}; Damaged: ${damaged_items.join(', ') || 'None'}` : null),
      equipment_verification_notes: `Verified ${already.size} of ${expected.length} serial numbers on site by ${actor?.full_name || 'Technician'}.`,
      updated_at: nowIso(),
      updated_by: actor?.id || null,
    }).eq('id', row.id), 'Could not save the verification');

    if (row.status === 'scheduled') {
      await applyStatus(client, row, 'in_progress', 'Equipment verified on site; installation commenced.', actor);
    }

    const fresh = await loadJob(client, row.id);
    return {
      job: fresh,
      equipment_verified: fresh.equipment_verified,
      equipment_items: fresh.equipment_items,
      exception_recorded: fresh.exception_recorded,
      exception_notes: fresh.exception_notes,
    };
  },

  // 8. Checklist
  async updateTask(jobId, taskId, { is_completed, remarks, photo_storage_path }, actor = null) {
    const client = db();
    const row = await requireRow(client, jobId);
    if (CLOSED.includes(row.status)) throw fail('This installation is already closed.', 409);
    const tasks = await must(client.from('installation_tasks').select('*').eq('installation_id', row.id).order('order_index', { ascending: true }), 'Could not load checklist');
    const task = tasks.find((t) => t.id === taskId || t.task_name === taskId);
    if (!task) throw fail(`Checklist task ${taskId} not found.`, 404);

    const patch = {};
    if (is_completed !== undefined) {
      patch.is_completed = Boolean(is_completed);
      patch.completed_at = is_completed ? nowIso() : null;
      patch.completed_by = is_completed ? actor?.id || null : null;
    }
    if (remarks !== undefined) patch.remarks = remarks;
    if (photo_storage_path) patch.photo_storage_path = photo_storage_path;
    await must(client.from('installation_tasks').update(patch).eq('id', task.id), 'Could not update the task');

    const job = await loadJob(client, row.id);
    const required = job.tasks.filter((t) => t.is_required);
    const doneRequired = required.filter((t) => t.is_completed).length;
    return {
      task: job.tasks.find((t) => t.id === task.id),
      tasks: job.tasks,
      progressPct: required.length ? Math.round((doneRequired / required.length) * 100) : 100,
      allRequiredCompleted: doneRequired === required.length,
    };
  },

  // 9. Photos
  async uploadPhoto(jobId, { photo_type = 'progress', storage_path, caption, base64 }, actor = null) {
    const client = db();
    const row = await requireRow(client, jobId);
    if (!storage_path && !base64) throw fail('Photograph data or storage path is required.');
    const { data, error } = await client.from('installation_photos').insert({
      installation_id: row.id,
      storage_path: storage_path || base64,
      photo_type,
      caption: caption || `${String(photo_type).replace('_', ' ')} photograph`,
      uploaded_by: actor?.id || null,
    }).select('*').single();
    if (error) throw fail(error.message, 400);
    const { count } = await client.from('installation_photos').select('id', { count: 'exact', head: true }).eq('installation_id', row.id);
    return { photo: { ...data, uploaded_by_name: actor?.full_name || 'Technician' }, totalPhotos: count || 1 };
  },

  // 10. Testing and commissioning
  async submitCommissioning(jobId, commissioningData, actor = null) {
    const client = db();
    const row = await requireRow(client, jobId);
    if (CLOSED.includes(row.status)) throw fail('This installation is already closed.', 409);
    if (!commissioningData) throw fail('Commissioning data is required.');

    const { inverter_model, inverter_serial, earthing_resistance_ohm, insulation_test_result, test_observations } = commissioningData;
    if (!inverter_model || !inverter_serial) throw fail('Inverter model and verified inverter serial number are required for commissioning.');
    if (earthing_resistance_ohm === undefined || earthing_resistance_ohm === null || earthing_resistance_ohm === '') {
      throw fail('Earthing resistance reading (Ohms) is required before system energization.');
    }
    const earthing = Number(earthing_resistance_ohm);
    if (Number.isNaN(earthing) || earthing < 0) throw fail('Earthing resistance must be a positive number.');

    const data = {
      ...commissioningData,
      commissioned_at: nowIso(),
      commissioned_by: actor?.full_name || 'Certified Technician',
      safety_disclaimer_accepted: true,
      disclaimer: 'Test values entered reflect verified multimeter & earth-tester measurements conducted in accordance with IS 3043 / IEC 60364-7-712. Not an automatic waiver of utility grid statutory approvals.',
    };
    await must(client.from('installations').update({
      commissioning_data: data,
      earthing_resistance_ohm: earthing,
      insulation_test_result: insulation_test_result || 'Verified',
      testing_notes: test_observations || 'Testing and grid sync verified successfully.',
      updated_at: nowIso(),
      updated_by: actor?.id || null,
    }).eq('id', row.id), 'Could not save the commissioning data');

    return { job: await loadJob(client, row.id), commissioning_data: data };
  },

  // 11. Customer acknowledgement
  async submitCustomerSignature(jobId, { customer_name, signature_data, consent_text }, actor = null) {
    const client = db();
    const row = await requireRow(client, jobId);
    if (CLOSED.includes(row.status)) throw fail('This installation is already closed.', 409);
    if (!signature_data) throw fail('Customer digital signature data is required.');

    const job = await loadJob(client, row.id);
    const { error } = await client.from('customer_signatures').insert({
      installation_id: row.id,
      customer_name: customer_name || job.customer_name,
      signature_storage_path: signature_data,
      consent_text: consent_text || 'I confirm that the solar PV system has been installed, commissioned, demonstrated, and handed over in satisfactory working condition.',
    });
    if (error) throw fail(error.message, 400);
    await client.from('installations').update({ updated_at: nowIso(), updated_by: actor?.id || null }).eq('id', row.id);

    const fresh = await loadJob(client, row.id);
    return { job: fresh, customer_signature: fresh.customer_signature };
  },

  // 12. Completion report: every prerequisite must be met
  async generateCompletionReport(jobId, actor = null) {
    const client = db();
    const row = await requireRow(client, jobId);
    if (row.status === 'completed') throw fail('This installation is already completed.', 409);
    if (row.status === 'cancelled') throw fail('A cancelled installation cannot be completed.', 409);
    const job = await loadJob(client, row.id);

    const blockers = completionBlockers(job);
    if (blockers.length) throw fail(`Cannot generate completion report: ${blockers.join(' ')}`, 400);

    const lead = (job.assigned_technicians || []).find((a) => a.is_primary);
    const report =
      'SOLVIX SOLAR INSTALLATION COMPLETION REPORT\n' +
      `Job: ${job.installation_code} | Order: ${job.order_code}\n` +
      `Customer: ${job.customer_name} | Capacity: ${job.system_capacity_kw} kW ${job.system_type}\n` +
      `Site: ${job.site_address}\n` +
      `Completed Date: ${dateOnly(nowIso())}\n` +
      `Lead Technician: ${lead?.full_name || 'Technician Team'}\n` +
      `Earthing Resistance: ${job.earthing_resistance_ohm} Ohm | Insulation: ${job.insulation_test_result}\n` +
      'All technical safety and installation milestones were verified and signed by the customer.';

    await client.from('installation_reports').insert({ installation_id: row.id, report_text: report, submitted_at: nowIso(), submitted_by: actor?.id || null });
    await applyStatus(client, row, 'completed', 'Final completion report generated and customer signature verified.', actor, { completion_report: report });
    return { job: await loadJob(client, row.id), completion_report: report };
  },

  // 13. Status changes
  async updateJobStatus(jobId, newStatus, notes, actor = null) {
    const client = db();
    const row = await requireRow(client, jobId);
    if (!INSTALLATION_STATUSES.includes(newStatus)) {
      throw fail(`Invalid status: ${newStatus}. Permitted statuses: ${INSTALLATION_STATUSES.join(', ')}`);
    }
    if (CLOSED.includes(row.status) && row.status !== newStatus) throw fail(`This installation is already ${row.status}.`, 409);

    if (newStatus === 'completed') {
      const blockers = completionBlockers(await loadJob(client, row.id));
      if (blockers.length) throw fail(blockers.join(' '), 400);
    }
    await applyStatus(client, row, newStatus, notes || `Status changed to ${newStatus}`, actor);
    return loadJob(client, row.id);
  },

  // 14. Technicians
  async getTechnicians() {
    return technicianList(db());
  },

  async getTechnicianById(id) {
    const client = db();
    const list = await technicianList(client);
    const tech = list.find((t) => t.id === id || t.employee_code === id);
    if (!tech) return null;
    const ids = await assignedJobIds(client, tech.id);
    const rows = ids.length ? await must(client.from('installations').select('*').in('id', ids).order('created_at', { ascending: false }), 'Could not load jobs') : [];
    return { ...tech, assignedJobs: await composeJobs(client, rows) };
  },

  async updateTechnicianAvailability(id, { is_available, max_daily_jobs }) {
    const client = db();
    const patch = { updated_at: nowIso() };
    if (is_available !== undefined) patch.is_available = Boolean(is_available);
    if (max_daily_jobs !== undefined) patch.max_daily_jobs = Math.max(1, parseInt(max_daily_jobs, 10) || 1);
    const { data, error } = await client.from('technicians').update(patch).eq('id', id).select('*').maybeSingle();
    if (error) throw fail(error.message, 400);
    if (!data) throw fail('Technician not found.', 404);
    return data;
  },

  // 15. Orders whose equipment has been delivered and that have no installation job yet
  async getEligibleOrders() {
    const client = db();
    const orders = await must(
      client.from('orders')
        .select('id, order_code, status, customer_id, system_type, system_capacity_kw, total_amount, advance_paid, balance_due, customer:customer_id ( contact_name, company_name, phone, email ), quotation:quotation_id ( installation_address )')
        .in('status', ELIGIBLE_ORDER_STATUSES).order('created_at', { ascending: false }),
      'Could not load orders',
    );
    if (!orders.length) return [];
    const [taken, addrs, dispatches] = await Promise.all([
      must(client.from('installations').select('order_id').in('order_id', orders.map((o) => o.id)).neq('status', 'cancelled'), 'Could not check jobs'),
      must(client.from('customer_addresses').select('customer_id, street, city, is_primary').in('customer_id', [...new Set(orders.map((o) => o.customer_id))]), 'Could not load addresses'),
      must(client.from('dispatches').select('order_id, status').in('order_id', orders.map((o) => o.id)).neq('status', 'cancelled'), 'Could not load dispatches'),
    ]);
    const used = new Set(taken.map((t) => t.order_id));
    return orders.filter((o) => !used.has(o.id)).map((o) => {
      const a = addrs.filter((x) => x.customer_id === o.customer_id).sort((x, y) => Number(y.is_primary) - Number(x.is_primary))[0];
      return {
        order_id: o.id,
        order_code: o.order_code,
        customer_id: o.customer_id,
        customer_name: o.customer?.company_name || o.customer?.contact_name || 'Customer',
        contact_phone: o.customer?.phone || '',
        contact_email: o.customer?.email || '',
        site_address: o.quotation?.installation_address || a?.street || '',
        city: a?.city || '',
        system_type: o.system_type,
        system_capacity_kw: Number(o.system_capacity_kw) || 0,
        status: o.status,
        dispatch_status: dispatches.find((d) => d.order_id === o.id)?.status || null,
        total_amount: Number(o.total_amount) || 0,
        advance_paid: Number(o.advance_paid) || 0,
        balance_due: Number(o.balance_due) || 0,
      };
    });
  },
};

export default installationStore;
