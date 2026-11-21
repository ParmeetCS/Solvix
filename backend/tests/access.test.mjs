import test from 'node:test';
import assert from 'node:assert/strict';

import { portalForProfile, departmentMatches, PORTALS } from '../lib/supabase/access.js';
import { modulesFor, homeForPortal } from '../lib/supabase/session.js';

const admin = { account_type: 'admin', roles: { code: 'admin' } };
const customer = { account_type: 'customer', roles: null };
const employee = { account_type: 'employee', roles: null };

test('admin and customer portals come from account type', () => {
  assert.equal(portalForProfile(admin, ''), 'admin');
  assert.equal(portalForProfile(customer, ''), 'customer');
  // role code alone is enough for admin
  assert.equal(portalForProfile({ account_type: 'employee', roles: { code: 'admin' } }, ''), 'admin');
});

test('employees map to a portal by approved department', () => {
  assert.equal(portalForProfile(employee, 'sales & crm | sales'), 'sales');
  assert.equal(portalForProfile(employee, 'installation & technical operations'), 'technician');
  assert.equal(portalForProfile(employee, 'site survey & engineering'), 'technician');
  assert.equal(portalForProfile(employee, 'warehouse & logistics'), 'staff');
  assert.equal(portalForProfile(employee, 'accounts & finance'), 'staff');
  assert.equal(portalForProfile(employee, 'subsidy & documentation'), 'staff');
});

test('an employee with no approved department has no portal (pending approval)', () => {
  assert.equal(portalForProfile(employee, ''), null);
  assert.equal(portalForProfile(employee, 'unknown department'), null);
});

test('unknown account types never get a portal', () => {
  assert.equal(portalForProfile({ account_type: 'guest' }, 'sales'), null);
  assert.equal(portalForProfile({}, 'sales'), null);
});

test('customers can only hold the customer module', () => {
  assert.deepEqual(modulesFor(customer, ''), ['customer']);
});

test('admins hold every module', () => {
  const mods = modulesFor(admin, '');
  for (const m of ['admin', 'sales', 'survey', 'installation', 'warehouse', 'support', 'finance', 'subsidy', 'technician']) {
    assert.ok(mods.includes(m), `admin should have ${m}`);
  }
});

test('department staff only receive their own modules', () => {
  const sales = modulesFor(employee, 'sales & crm');
  assert.ok(sales.includes('sales') && sales.includes('survey'));
  assert.ok(!sales.includes('finance') && !sales.includes('warehouse') && !sales.includes('support'));

  const wh = modulesFor(employee, 'warehouse & logistics');
  assert.deepEqual(wh, ['warehouse']);

  const fin = modulesFor(employee, 'accounts & finance');
  assert.deepEqual(fin, ['finance']);
});

test('technicians never receive finance, support or sales', () => {
  const t = modulesFor(employee, 'installation & technical operations');
  assert.ok(t.includes('technician') && t.includes('installation'));
  for (const m of ['finance', 'support', 'sales', 'admin']) assert.ok(!t.includes(m));
});

test('home page per portal', () => {
  assert.equal(homeForPortal('admin', []), '/admin/dashboard');
  assert.equal(homeForPortal('customer', []), '/customer/dashboard');
  assert.equal(homeForPortal('sales', []), '/sales/dashboard');
  assert.equal(homeForPortal('technician', []), '/technician/dashboard');
  assert.equal(homeForPortal('staff', ['warehouse']), '/warehouse/dashboard');
  assert.equal(homeForPortal('staff', ['finance']), '/finance/dashboard');
  assert.equal(homeForPortal('staff', []), '/pending-approval');
  assert.equal(homeForPortal(null, []), '/pending-approval');
});

test('portal definitions never overlap account types dangerously', () => {
  assert.deepEqual(PORTALS.admin.accountTypes, ['admin']);
  assert.deepEqual(PORTALS.customer.accountTypes, ['customer']);
  for (const p of ['sales', 'technician', 'staff']) assert.deepEqual(PORTALS[p].accountTypes, ['employee']);
});

test('departmentMatches is a substring match on lower-cased text', () => {
  assert.equal(departmentMatches('sales & crm', ['sales']), true);
  assert.equal(departmentMatches('warehouse', ['sales', 'crm']), false);
});
