import test from 'node:test';
import assert from 'node:assert/strict';
import { recommendSpec, pickPackage, checkFit, buildInternalNote } from '../lib/ai/quotationRules.js';

const packages = [
  { id: 'a', name: 'On-Grid 3 kW', system_type: 'on-grid', capacity_kw: 3 },
  { id: 'b', name: 'On-Grid 5 kW', system_type: 'on-grid', capacity_kw: 5 },
  { id: 'c', name: 'Hybrid 3 kW', system_type: 'hybrid', capacity_kw: 3 },
];

test('uses the survey recommendation', () => {
  const s = recommendSpec({ survey: { recommended_capacity_kw: 5, recommended_system_type: 'on-grid', roof_area_sqm: 60 } });
  assert.equal(s.capacity_kw, 5);
  assert.equal(s.system_type, 'on-grid');
});

test('caps the capacity to the usable roof', () => {
  const s = recommendSpec({ survey: { recommended_capacity_kw: 10, available_installation_area_sqm: 30 } });
  assert.equal(s.capacity_kw, 3);
  assert.ok(s.reasons.some((r) => r.includes('Reduced')));
});

test('falls back to the monthly bill, then to a starter size', () => {
  assert.equal(recommendSpec({ lead: { monthly_electricity_bill: 8000 } }).capacity_kw, 8);
  assert.equal(recommendSpec({}).capacity_kw, 3);
});

test('picks the smallest package that covers, else the largest', () => {
  assert.equal(pickPackage(packages, { system_type: 'on-grid', capacity_kw: 4 }).id, 'b');
  assert.equal(pickPackage(packages, { system_type: 'on-grid', capacity_kw: 9 }).id, 'b');
  assert.equal(pickPackage(packages, { system_type: 'off-grid', capacity_kw: 3 }), null);
});

test('flags type mismatch, roof limit and low stock', () => {
  const spec = { system_type: 'on-grid', capacity_kw: 5, roof_limit_kw: 3 };
  const r = checkFit(packages[1], spec, { stock: [{ name: 'Panel', needed: 10, available: 2 }] });
  assert.equal(r.ok, false);
  assert.equal(r.problems.length, 2);
  assert.equal(checkFit(packages[2], spec).ok, false);
});

test('internal note marks the draft as AI generated', () => {
  const note = buildInternalNote({ spec: { reasons: ['x'] }, pkg: { name: 'P', capacity_kw: 5, system_type: 'on-grid' }, reasoning: 'because', mode: 'rules' });
  assert.ok(note.startsWith('[AI draft]'));
});
