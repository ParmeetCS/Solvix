import test from 'node:test';
import assert from 'node:assert/strict';

import {
  generateQuotationCode,
  generateOrderCode,
  generatePaymentCode,
  generateCustomerCode,
} from '../lib/quotation/codes.js';

test('generates prefixed document codes', () => {
  assert.match(generateQuotationCode(), /^QTN-\d{4}-[A-F0-9]{8}$/);
  assert.match(generateOrderCode(), /^ORD-\d{4}-[A-F0-9]{8}$/);
  assert.match(generatePaymentCode(), /^PAY-\d{4}-[A-F0-9]{8}$/);
  assert.match(generateCustomerCode(), /^CUST-\d{4}-[A-F0-9]{8}$/);
});

test('generates unique codes across calls', () => {
  const codes = new Set();
  for (let index = 0; index < 200; index += 1) {
    codes.add(generateQuotationCode());
  }
  assert.equal(codes.size, 200);
});
