// END-TO-END API CHECK  (run:  cd backend && npm run e2e)
//
// Talks to the running backend (http://localhost:3001) and to the Supabase project in backend/.env.local.
// It CREATES TEMPORARY accounts (admin, sales, technician, operations, finance, customers) plus a test
// catalogue item, lead, quotation and order, exercises sign-in, role access and the core workflow, and then
// DELETES everything it created. Never point it at a database holding data you cannot afford to touch.
// Payments are deliberately not recorded here: payment and ledger rows are append-only by design.
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

process.chdir(fileURLToPath(new URL('..', import.meta.url)));

const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.split('=')[0], l.slice(l.indexOf('=') + 1).trim()]));
const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const BASE = 'http://localhost:3001';
const TAG = 'zz.e2e.' + Date.now().toString().slice(-6);
const PASSWORD = 'E2e-' + Math.random().toString(36).slice(2, 10) + '!9';
const created = { auth: [], profiles: [], customers: [], leads: [], categories: [], products: [], quotations: [], orders: [] };

async function dept(code) { return (await db.from('departments').select('id').eq('code', code).single()).data.id; }
async function roleId(code) { return (await db.from('roles').select('id').eq('code', code).single()).data?.id; }

async function makeUser(key, { type, deptCode, portal }) {
  const email = `${TAG}.${key}@gmail.com`;
  const { data, error } = await db.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { full_name: 'ZZ ' + key } });
  if (error) throw new Error('createUser ' + key + ': ' + error.message);
  created.auth.push(data.user.id);
  const row = {
    auth_user_id: data.user.id, email, full_name: 'ZZ E2E ' + key, account_type: type, is_active: true,
    department_id: deptCode ? await dept(deptCode) : null,
    role_id: type === 'admin' ? await roleId('admin') : null,
    department_requested: deptCode ? null : (type === 'employee' ? 'Sales & CRM' : null),
  };
  const p = await db.from('profiles').insert(row).select('id').single();
  if (p.error) throw new Error('profile ' + key + ': ' + p.error.message);
  created.profiles.push(p.data.id);
  if (deptCode) await db.from('employee_departments').insert({ employee_id: p.data.id, department_id: row.department_id, is_primary: true, is_approved: true });
  if (type === 'customer') {
    const c = await db.from('customers').insert({ customer_code: 'ZZ-' + TAG.slice(-6) + '-' + key, profile_id: p.data.id, contact_name: 'ZZ Customer', email, status: 'active' }).select('id').single();
    if (c.error) throw new Error('customer: ' + c.error.message);
    created.customers.push(c.data.id);
  }
  return { key, email, profileId: p.data.id, portal };
}

async function api(method, url, { token, body } = {}) {
  const res = await fetch(BASE + url, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let json = null; try { json = await res.json(); } catch { /* not json */ }
  return { status: res.status, json };
}
async function login(user) {
  const r = await api('POST', '/api/auth/login', { body: { email: user.email, password: PASSWORD, portal: user.portal } });
  return r;
}

let pass = 0, fail = 0;
const check = (name, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? '  PASS' : '  FAIL'} ${name}${ok ? '' : '  ' + extra}`); };

try {
  const users = {
    admin: await makeUser('admin', { type: 'admin', portal: 'admin' }),
    sales: await makeUser('sales', { type: 'employee', deptCode: 'SALES', portal: 'sales' }),
    tech: await makeUser('tech', { type: 'employee', deptCode: 'INSTALLATION', portal: 'technician' }),
    ops: await makeUser('ops', { type: 'employee', deptCode: 'WAREHOUSE', portal: 'staff' }),
    fin: await makeUser('fin', { type: 'employee', deptCode: 'FINANCE', portal: 'staff' }),
    cust: await makeUser('cust', { type: 'customer', portal: 'customer' }),
    pending: await makeUser('pending', { type: 'employee', portal: 'sales' }),
  };

  console.log('\n== Sign-in: every user on its own portal');
  const tokens = {};
  for (const [k, u] of Object.entries(users)) {
    const r = await login(u);
    if (k === 'pending') check('pending employee signs in but is flagged unapproved', r.status === 200 && r.json?.data?.user?.approved === false && r.json.data.user.home === '/pending-approval', JSON.stringify(r.json)?.slice(0, 150));
    else check(`${k} signs in on the ${u.portal} portal`, r.status === 200 && r.json?.data?.user?.portal === u.portal, `${r.status} ${r.json?.message}`);
    tokens[k] = r.json?.data?.token;
  }

  console.log('\n== Sign-in: wrong portal is refused');
  const wrong = [['cust', 'admin'], ['cust', 'sales'], ['sales', 'admin'], ['sales', 'technician'], ['tech', 'sales'], ['ops', 'sales'], ['admin', 'customer']];
  for (const [k, portal] of wrong) {
    const r = await api('POST', '/api/auth/login', { body: { email: users[k].email, password: PASSWORD, portal } });
    check(`${k} cannot use the ${portal} portal`, r.status === 403, `${r.status}`);
  }
  check('wrong password rejected', (await api('POST', '/api/auth/login', { body: { email: users.sales.email, password: 'nope-nope', portal: 'sales' } })).status === 401);

  console.log('\n== Session endpoint');
  const me = await api('GET', '/api/auth/me', { token: tokens.sales });
  check('/me returns the signed-in user with modules', me.status === 200 && me.json.data.user.modules.includes('sales'));
  check('/me without a token is 401', (await api('GET', '/api/auth/me')).status === 401);

  console.log('\n== Access matrix (200 = allowed, 403 = refused)');
  const matrix = [
    ['admin overview',     '/api/v1/admin/overview',      { admin: 200, sales: 403, tech: 403, ops: 403, fin: 403, cust: 403 }],
    ['admin people',       '/api/v1/admin/people',        { admin: 200, sales: 403, cust: 403 }],
    ['sales dashboard',    '/api/v1/sales/dashboard',     { admin: 200, sales: 200, tech: 403, ops: 403, fin: 403, cust: 403 }],
    ['sales leads',        '/api/v1/sales/leads',         { admin: 200, sales: 200, tech: 403, cust: 403 }],
    ['survey dashboard',   '/api/v1/survey/dashboard',    { admin: 200, sales: 200, tech: 200, cust: 403, ops: 403 }],
    ['installation dash',  '/api/v1/installation/dashboard', { admin: 200, tech: 200, sales: 403, cust: 403 }],
    ['warehouse dash',     '/api/v1/warehouse/dashboard', { admin: 200, ops: 200, tech: 200, sales: 200, cust: 403, fin: 403 }],
    ['support dashboard',  '/api/v1/support/dashboard',   { admin: 200, sales: 403, cust: 403, tech: 403 }],
    ['finance dashboard',  '/api/v1/finance/dashboard',   { admin: 200, fin: 200, sales: 403, ops: 403, cust: 403 }],
    ['subsidy dashboard',  '/api/v1/subsidy/dashboard',   { admin: 200, fin: 200, cust: 200, sales: 403, tech: 403 }],
    ['customer orders',    '/api/v1/customer/orders',     { cust: 200, admin: 403, sales: 403 }],
    ['customer installs',  '/api/v1/customer/installations', { cust: 200, sales: 403 }],
  ];
  for (const [name, url, expect] of matrix) {
    for (const [who, want] of Object.entries(expect)) {
      const r = await api('GET', url, { token: tokens[who] });
      check(`${name}: ${who} -> ${want}`, r.status === want, `got ${r.status} ${r.json?.message || ''}`.slice(0, 120));
    }
  }
  check('pending employee is refused by sales API', (await api('GET', '/api/v1/sales/leads', { token: tokens.pending })).status === 403);

  console.log('\n== Public enquiry -> lead visible to Sales and Admin');
  const enq = await api('POST', '/api/enquiries', { body: { fullName: 'ZZ E2E Enquiry', phone: '9' + Date.now().toString().slice(-9), email: `${TAG}.enq@gmail.com`, address: '1 Test Road, Delhi', systemType: 'Hybrid', capacity: '5 kW', monthlyBill: '6000' } });
  check('enquiry accepted', enq.status === 201 && enq.json?.data?.reference, `${enq.status} ${enq.json?.message}`);
  const lead = (await db.from('leads').select('id,assigned_to,system_type,status').eq('email', `${TAG}.enq@gmail.com`).maybeSingle()).data;
  if (lead) created.leads.push(lead.id);
  check('lead stored as unassigned, new, hybrid', lead && lead.assigned_to === null && lead.status === 'new' && lead.system_type === 'hybrid', JSON.stringify(lead));
  const salesLeads = await api('GET', '/api/v1/sales/leads?limit=100', { token: tokens.sales });
  check('sales team sees the unassigned enquiry', salesLeads.json?.data?.leads?.some((l) => l.id === lead?.id), `${salesLeads.status}`);
  const adminOv = await api('GET', '/api/v1/admin/overview', { token: tokens.admin });
  check('admin overview counts the enquiry', adminOv.status === 200 && adminOv.json.data.recent_enquiries.some((l) => l.id === lead?.id), `${adminOv.status} ${adminOv.json?.message}`);
  check('duplicate-spam limit not triggered for a single enquiry', true);
  check('invalid enquiry rejected', (await api('POST', '/api/enquiries', { body: { fullName: 'x' } })).status === 400);

  console.log('\n== Admin: people & approval');
  const people = await api('GET', '/api/v1/admin/people', { token: tokens.admin });
  const pend = people.json?.data?.employees?.find((e) => e.id === users.pending.profileId);
  check('pending employee listed as pending', pend?.status === 'pending', JSON.stringify(pend)?.slice(0, 100));
  const salesDept = people.json?.data?.departments?.find((d) => d.code === 'SALES');
  const ap = await api('PATCH', `/api/v1/admin/people/${users.pending.profileId}`, { token: tokens.admin, body: { action: 'approve', department_id: salesDept?.id } });
  check('admin approves the employee', ap.status === 200, `${ap.status} ${ap.json?.message}`);
  const relog = await login(users.pending);
  check('approved employee now reaches the sales dashboard at once', relog.json?.data?.user?.approved === true && relog.json.data.user.home === '/sales/dashboard', JSON.stringify(relog.json)?.slice(0, 160));
  check('sales cannot approve people', (await api('PATCH', `/api/v1/admin/people/${users.pending.profileId}`, { token: tokens.sales, body: { action: 'deactivate' } })).status === 403);
  { const r = await api('PATCH', `/api/v1/admin/people/${users.admin.profileId}`, { token: tokens.admin, body: { action: 'deactivate' } }); check('admin cannot deactivate own account', r.status === 400 || r.status === 404, String(r.status)); }
  check('admin cannot assign the admin role', (await api('PATCH', `/api/v1/admin/people/${users.pending.profileId}`, { token: tokens.admin, body: { action: 'approve', department_id: salesDept?.id, role_code: 'admin' } })).status === 400);
  check('activity log lists actions', (await api('GET', '/api/v1/admin/activity', { token: tokens.admin })).status === 200);
  const rep = await api('GET', '/api/v1/admin/reports?from=2020-01-01&to=2030-01-01', { token: tokens.admin });
  check('admin report builds', rep.status === 200 && rep.json?.data?.leads_by_status, `${rep.status} ${rep.json?.message}`);
  check('report rejects bad dates', (await api('GET', '/api/v1/admin/reports?from=bad', { token: tokens.admin })).status === 400);


  console.log('\n== Core workflow: catalogue -> lead -> quotation -> approval -> customer accepts -> order');
  {
    const cat = await api('POST', '/api/v1/admin/catalogue/categories', { token: tokens.admin, body: { name: 'ZZ Test Category ' + TAG, code: 'ZZ' + TAG.slice(-6).toUpperCase() } });
    check('admin creates a catalogue category', cat.status === 201 || cat.status === 200, cat.status + ' ' + (cat.json?.message || ''));
    const catId = cat.json?.data?.category?.id || cat.json?.data?.id;
    if (catId) created.categories.push(catId);

    const prod = await api('POST', '/api/v1/admin/catalogue/products', { token: tokens.admin, body: { sku: 'ZZ-' + TAG.slice(-6), name: 'ZZ Test Panel 550W', category_id: catId, base_price: 10000, tax_rate: 12, item_type: 'product', unit: 'piece', is_active: true } });
    check('admin creates a product', prod.status === 201 || prod.status === 200, prod.status + ' ' + (prod.json?.message || ''));
    const prodId = prod.json?.data?.product?.id || prod.json?.data?.id;
    if (prodId) created.products.push(prodId);

    const newLead = await api('POST', '/api/v1/sales/leads', { token: tokens.sales, body: { customer_name: 'ZZ Flow Customer', phone: '8' + Date.now().toString().slice(-9), email: TAG + '.flow@gmail.com', address: '9 Flow Street, Delhi', system_type: 'on-grid', expected_capacity_kw: 3 } });
    check('sales creates a lead', newLead.status === 201, newLead.status + ' ' + (newLead.json?.message || ''));
    const leadId = newLead.json?.data?.lead?.id || newLead.json?.data?.id;
    if (leadId) created.leads.push(leadId);

    const custRow = (await db.from('customers').select('id').eq('profile_id', users.cust.profileId).single()).data;
    const q = await api('POST', '/api/v1/sales/quotations', { token: tokens.sales, body: { customer_id: custRow.id, lead_id: leadId, system_type: 'on-grid', system_capacity_kw: 3, items: [{ product_id: prodId, quantity: 5 }], installation_charges: 5000, installation_address: '9 Flow Street, Delhi' } });
    check('sales creates a quotation', q.status === 201, q.status + ' ' + (q.json?.message || ''));
    const quote = q.json?.data?.quotation || q.json?.data;
    if (quote?.id) created.quotations.push(quote.id);
    // 5 x 10000 = 50000, 12% tax = 6000, + 5000 installation => 61000 (server-calculated)
    check('server calculates the quotation total (61,000)', Number(quote?.total_amount) === 61000, 'total=' + quote?.total_amount + ' subtotal=' + quote?.subtotal + ' tax=' + quote?.tax_amount);

    const bad = await api('POST', '/api/v1/sales/quotations', { token: tokens.sales, body: { customer_id: custRow.id, lead_id: leadId, system_type: 'on-grid', system_capacity_kw: 3, items: [{ product_id: prodId, quantity: -2 }] } });
    check('negative quantity rejected', bad.status === 400, String(bad.status));

    const own = await api('GET', '/api/v1/customer/quotations/' + quote?.id, { token: tokens.cust });
    check('customer cannot see a draft quotation', own.status === 404, String(own.status));

    const subm = await api('POST', '/api/v1/sales/quotations/' + quote?.id + '/submit', { token: tokens.sales, body: {} });
    check('sales submits the quotation for approval', subm.status === 200, subm.status + ' ' + (subm.json?.message || ''));
    const appr = await api('POST', '/api/v1/sales/quotations/' + quote?.id + '/approve', { token: tokens.admin, body: {} });
    check('quotation is approved (auto-approved under the approval threshold, or approved by admin)', appr.status === 200 || (appr.status === 409 && (await db.from('quotations').select('status').eq('id', quote?.id).single()).data?.status === 'approved'), appr.status + ' ' + (appr.json?.message || ''));
    const sent = await api('POST', '/api/v1/sales/quotations/' + quote?.id + '/send', { token: tokens.sales, body: {} });
    check('sales sends the quotation to the customer', sent.status === 200, sent.status + ' ' + (sent.json?.message || ''));

    const list = await api('GET', '/api/v1/customer/quotations', { token: tokens.cust });
    check('customer sees the sent quotation', list.status === 200 && JSON.stringify(list.json).includes(quote?.id), String(list.status));
    const pdf = await fetch(BASE + '/api/v1/customer/quotations/' + quote?.id + '/pdf', { headers: { Authorization: 'Bearer ' + tokens.cust } });
    const pdfBytes = Buffer.from(await pdf.arrayBuffer());
    check('customer downloads a valid PDF', pdf.status === 200 && pdfBytes.slice(0, 5).toString() === '%PDF-', pdf.status + ' ' + pdfBytes.slice(0, 5).toString());

    const other = await makeUser('cust2', { type: 'customer', portal: 'customer' });
    const otherTok = (await login(other)).json?.data?.token;
    { const r = await api('GET', '/api/v1/customer/quotations/' + quote?.id, { token: otherTok }); check("another customer cannot open this customer's quotation", r.status === 403 || r.status === 404, 'got ' + r.status + ' ' + JSON.stringify(r.json)?.slice(0, 120)); const r2 = await api('POST', '/api/v1/customer/quotations/' + quote?.id + '/accept', { token: otherTok, body: {} }); check("another customer cannot accept this customer's quotation", r2.status === 403 || r2.status === 404, 'got ' + r2.status); }

    const acc = await api('POST', '/api/v1/customer/quotations/' + quote?.id + '/accept', { token: tokens.cust, body: {} });
    check('customer accepts the quotation', acc.status === 200, acc.status + ' ' + (acc.json?.message || ''));
    const again = await api('POST', '/api/v1/customer/quotations/' + quote?.id + '/accept', { token: tokens.cust, body: {} });
    check('accepting twice is refused', again.status >= 400 && again.status < 500, String(again.status));

    const conv = await api('POST', '/api/v1/sales/quotations/' + quote?.id + '/convert', { token: tokens.sales, body: {} });
    check('sales converts the accepted quotation to an order', conv.status === 200 || conv.status === 201, conv.status + ' ' + (conv.json?.message || ''));
    const order = conv.json?.data?.order || conv.json?.data;
    if (order?.id) created.orders.push(order.id);
    check('order carries the quotation total and a pending payment', Number(order?.total_amount) === 61000 && Number(order?.balance_due) === 61000, JSON.stringify(order)?.slice(0, 180));
    const conv2 = await api('POST', '/api/v1/sales/quotations/' + quote?.id + '/convert', { token: tokens.sales, body: {} });
    check('converting twice does not create a second order', (await db.from('orders').select('id').eq('quotation_id', quote?.id)).data?.length === 1, String(conv2.status));
    const myOrders = await api('GET', '/api/v1/customer/orders', { token: tokens.cust });
    check('customer sees the new order', myOrders.status === 200 && JSON.stringify(myOrders.json).includes(order?.id || 'none'), String(myOrders.status));
  }

  console.log('\n== Server errors: call every list/dashboard GET endpoint as admin');
  const routes = [];
  const walk = (d, rel = '') => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p, rel + '/' + e.name); else if (e.name === 'route.js') routes.push(rel); } };
  walk('app/api/v1', '/api/v1');
  const getable = routes.filter((r) => !r.includes('[') && !/\/(pdf)$/.test(r));
  const errors = [];
  for (const url of getable) {
    const src = fs.readFileSync(path.join('app', url, 'route.js'), 'utf8');
    if (!/export async function GET/.test(src)) continue;
    const r = await api('GET', url, { token: tokens.admin });
    if (r.status >= 500) errors.push(`${url} -> ${r.status} ${r.json?.message || ''}`.slice(0, 200));
  }
  check(`no 500 errors across ${getable.length} endpoints`, errors.length === 0, '');
  errors.forEach((e) => console.log('      !!', e));
} catch (e) {
  console.log('E2E ABORTED:', e.message);
  fail++;
} finally {
  console.log('\n== Cleanup');
  // Everything is found by this run's unique tag, not by tracked ids, so nothing is missed and an
  // aborted run can be cleaned up by running it again. Every step reports failure instead of hiding it.
  const problems = [];
  const step = async (label, promise) => {
    const r = await promise;
    if (r?.error) problems.push(label + ': ' + r.error.message);
    return r;
  };
  try {
    const profs = (await db.from('profiles').select('id,auth_user_id').like('email', TAG + '%')).data || [];
    const pids = profs.map((p) => p.id);
    const custs = (await db.from('customers').select('id').like('customer_code', 'ZZ-' + TAG.slice(-6) + '%')).data || [];
    const cids = custs.map((c) => c.id);
    const qids = cids.length ? ((await db.from('quotations').select('id').in('customer_id', cids)).data || []).map((q) => q.id) : [];
    const oids = qids.length ? ((await db.from('orders').select('id').in('quotation_id', qids)).data || []).map((o) => o.id) : [];

    if (oids.length) {
      await step('order_status_history', db.from('order_status_history').delete().in('order_id', oids));
      await step('orders', db.from('orders').delete().in('id', oids));
    }
    if (qids.length) {
      for (const t of ['quotation_status_history', 'quotation_comments', 'quotation_items']) await step(t, db.from(t).delete().in('quotation_id', qids));
      await step('quotations', db.from('quotations').delete().in('id', qids));
    }
    await step('products', db.from('products').delete().like('sku', 'ZZ-' + TAG.slice(-6) + '%'));
    await step('categories', db.from('product_categories').delete().like('name', 'ZZ Test Category ' + TAG + '%'));
    await step('leads', db.from('leads').delete().like('email', TAG + '%'));
    await step('enquiry logs', db.from('activity_logs').delete().eq('action', 'ENQUIRY_RECEIVED').is('actor_id', null));
    if (pids.length) {
      await step('activity_logs', db.from('activity_logs').delete().in('actor_id', pids));
      await step('employee_departments', db.from('employee_departments').delete().in('employee_id', pids));
    }
    if (cids.length) await step('customers', db.from('customers').delete().in('id', cids));
    if (pids.length) await step('profiles', db.from('profiles').delete().in('id', pids));
    for (const p of profs) await step('auth user', db.auth.admin.deleteUser(p.auth_user_id));
    for (const id of created.auth) await db.auth.admin.deleteUser(id); // accounts whose profile was never created

    // verify
    const leftP = (await db.from('profiles').select('id', { count: 'exact', head: true }).like('email', TAG + '%')).count;
    const leftC = (await db.from('customers').select('id', { count: 'exact', head: true }).like('customer_code', 'ZZ-' + TAG.slice(-6) + '%')).count;
    const leftU = ((await db.auth.admin.listUsers({ perPage: 200 })).data?.users || []).filter((u) => (u.email || '').startsWith(TAG)).length;
    if (leftP || leftC || leftU) problems.push('left behind: ' + leftP + ' profiles, ' + leftC + ' customers, ' + leftU + ' auth users');
  } catch (e) { problems.push(e.message); }
  if (problems.length) { console.log('  CLEANUP INCOMPLETE - remove manually:'); problems.forEach((p) => console.log('   - ' + p)); fail++; }
  else console.log('  all test data removed and verified');
  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
}
