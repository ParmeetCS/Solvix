import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateQuotationTotals,
  roundMoney,
  toMoney,
  toQuantity,
} from '../lib/quotation/calculations.js';

test('calculates a simple taxed quotation', () => {
  const totals = calculateQuotationTotals({
    items: [{ quantity: 2, unit_price: 1000, tax_rate: 18 }],
  });

  assert.equal(totals.subtotal, 2000);
  assert.equal(totals.discount_amount, 0);
  assert.equal(totals.tax_amount, 360);
  assert.equal(totals.total_amount, 2360);
  assert.equal(totals.items[0].line_total, 2000);
});

test('applies a fixed discount before tax', () => {
  const totals = calculateQuotationTotals({
    items: [{ quantity: 1, unit_price: 2000, tax_rate: 18 }],
    discountType: 'fixed',
    discountValue: 200,
  });

  assert.equal(totals.discount_amount, 200);
  assert.equal(totals.taxable_amount, 1800);
  assert.equal(totals.tax_amount, 324);
  assert.equal(totals.total_amount, 2124);
});

test('applies a percentage discount across multiple lines', () => {
  const totals = calculateQuotationTotals({
    items: [
      { quantity: 1, unit_price: 1000, tax_rate: 18 },
      { quantity: 1, unit_price: 2000, tax_rate: 18 },
    ],
    discountType: 'percentage',
    discountValue: 10,
  });

  assert.equal(totals.subtotal, 3000);
  assert.equal(totals.discount_amount, 300);
  assert.equal(totals.tax_amount, 486);
  assert.equal(totals.total_amount, 3186);
});

test('allocates discount proportionally across mixed tax rates', () => {
  const totals = calculateQuotationTotals({
    items: [
      { quantity: 1, unit_price: 100, tax_rate: 18 },
      { quantity: 1, unit_price: 100, tax_rate: 12 },
    ],
    discountType: 'fixed',
    discountValue: 33,
  });

  assert.equal(totals.subtotal, 200);
  assert.equal(totals.discount_amount, 33);
  assert.deepEqual(
    totals.items.map((item) => item.discount_amount),
    [16.5, 16.5]
  );
  assert.equal(totals.tax_amount, 25.05);
  assert.equal(totals.total_amount, 192.05);
});

test('reports installation and other charges separately while taxing them', () => {
  const totals = calculateQuotationTotals({
    items: [
      { quantity: 1, unit_price: 1000, tax_rate: 18, item_type: 'product' },
      { quantity: 1, unit_price: 250, tax_rate: 18, item_type: 'installation' },
      { quantity: 1, unit_price: 50, tax_rate: 18, item_type: 'other' },
    ],
  });

  assert.equal(totals.installation_charges, 250);
  assert.equal(totals.other_charges, 50);
  assert.equal(totals.total_amount, 1534);
});

test('falls back to the global tax rate when a line has none', () => {
  const totals = calculateQuotationTotals({
    items: [{ quantity: 1, unit_price: 1000 }],
    taxRate: 5,
  });

  assert.equal(totals.items[0].tax_rate, 5);
  assert.equal(totals.tax_amount, 50);
});

test('rejects invalid quotation inputs', () => {
  assert.throws(() => calculateQuotationTotals({ items: [] }), /at least one line item/);
  assert.throws(
    () => calculateQuotationTotals({ items: [{ quantity: 0, unit_price: 100 }] }),
    /greater than zero/
  );
  assert.throws(
    () => calculateQuotationTotals({ items: [{ quantity: 1, unit_price: -1 }] }),
    /cannot be negative/
  );
  assert.throws(
    () => calculateQuotationTotals({ items: [{ quantity: 1, unit_price: 100 }], taxRate: 101 }),
    /between 0 and 100/
  );
  assert.throws(
    () =>
      calculateQuotationTotals({
        items: [{ quantity: 1, unit_price: 100 }],
        discountType: 'fixed',
        discountValue: 200,
      }),
    /cannot exceed/
  );
});

test('rounds money and quantities consistently', () => {
  assert.equal(roundMoney(10.005), 10.01);
  assert.equal(toMoney('12.345'), 12.35);
  assert.equal(toQuantity('1.239'), 1.24);
  assert.throws(() => toMoney('abc'), /valid number/);
  assert.throws(() => toQuantity(-2), /greater than zero/);
});
