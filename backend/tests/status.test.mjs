import test from 'node:test';
import assert from 'node:assert/strict';

import {
  canTransitionQuotation,
  assertQuotationTransition,
  canTransitionOrder,
  assertOrderTransition,
  isTerminalQuotationStatus,
  QUOTATION_STATUSES,
  ORDER_STATUSES,
} from '../lib/quotation/status.js';

test('allows the documented quotation workflow', () => {
  assert.equal(canTransitionQuotation('draft', 'pending_approval'), true);
  assert.equal(canTransitionQuotation('pending_approval', 'approved'), true);
  assert.equal(canTransitionQuotation('approved', 'sent'), true);
  assert.equal(canTransitionQuotation('sent', 'viewed'), true);
  assert.equal(canTransitionQuotation('viewed', 'accepted'), true);
  assert.equal(canTransitionQuotation('accepted', 'converted_to_order'), true);
});

test('blocks invalid quotation transitions', () => {
  assert.equal(canTransitionQuotation('draft', 'sent'), false);
  assert.equal(canTransitionQuotation('rejected', 'approved'), false);
  assert.equal(canTransitionQuotation('converted_to_order', 'sent'), false);
  assert.equal(canTransitionQuotation('sent', 'sent'), false);
  assert.throws(() => assertQuotationTransition('draft', 'converted_to_order'), /cannot move/);
});

test('allows the documented order workflow', () => {
  assert.equal(canTransitionOrder('pending_payment', 'confirmed'), true);
  assert.equal(canTransitionOrder('confirmed', 'processing'), true);
  assert.equal(canTransitionOrder('processing', 'awaiting_dispatch'), true);
  assert.equal(canTransitionOrder('awaiting_dispatch', 'dispatched'), true);
  assert.equal(canTransitionOrder('dispatched', 'installation_in_progress'), true);
  assert.equal(canTransitionOrder('installation_in_progress', 'completed'), true);
  assert.equal(canTransitionOrder('confirmed', 'cancelled'), true);
});

test('blocks invalid order transitions', () => {
  assert.equal(canTransitionOrder('pending_payment', 'completed'), false);
  assert.equal(canTransitionOrder('completed', 'cancelled'), false);
  assert.equal(canTransitionOrder('cancelled', 'confirmed'), false);
  assert.throws(() => assertOrderTransition('completed', 'processing'), /cannot move/);
});

test('marks terminal quotation statuses', () => {
  assert.equal(isTerminalQuotationStatus('accepted'), true);
  assert.equal(isTerminalQuotationStatus('converted_to_order'), true);
  assert.equal(isTerminalQuotationStatus('expired'), true);
  assert.equal(isTerminalQuotationStatus('draft'), false);
  assert.equal(isTerminalQuotationStatus('sent'), false);
});

test('exports the canonical status lists', () => {
  assert.ok(QUOTATION_STATUSES.includes('pending_approval'));
  assert.ok(QUOTATION_STATUSES.includes('converted_to_order'));
  assert.ok(ORDER_STATUSES.includes('awaiting_dispatch'));
  assert.ok(ORDER_STATUSES.includes('installation_in_progress'));
});
