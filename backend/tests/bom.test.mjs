import test from 'node:test';
import assert from 'node:assert/strict';

import { buildQuotationItems } from '../lib/quotation/bom.js';

const PANEL = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Solar panel 550W',
  base_price: 12000,
  tax_rate: 12,
  item_type: 'product',
  unit: 'piece',
  hsn_code: '8541',
  is_active: true,
  is_quotable: true,
  category: { id: 'cat-1', name: 'Panels', code: 'panels' },
};

const INVERTER = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Hybrid inverter 3kW',
  base_price: 25000,
  tax_rate: 18,
  item_type: 'product',
  unit: 'piece',
  hsn_code: '8504',
  is_active: true,
  is_quotable: true,
  category: { id: 'cat-2', name: 'Inverters', code: 'inverters' },
};

function chain(result) {
  const builder = {
    select() {
      return builder;
    },
    eq() {
      return builder;
    },
    in() {
      return Promise.resolve(result);
    },
    order() {
      return Promise.resolve(result);
    },
    maybeSingle() {
      return Promise.resolve(result);
    },
  };
  return builder;
}

function mockAdmin({ products = [], pkg = null, packageItems = [] } = {}) {
  return {
    from(table) {
      if (table === 'products') return chain({ data: products, error: null });
      if (table === 'product_packages') return chain({ data: pkg, error: null });
      if (table === 'package_items') return chain({ data: packageItems, error: null });
      throw new Error(`Unexpected table: ${table}`);
    },
  };
}

test('prices catalogue products from the database', async () => {
  const built = await buildQuotationItems({
    adminClient: mockAdmin({ products: [PANEL] }),
    rawItems: [{ product_id: PANEL.id, quantity: 4 }],
    canOverridePricing: false,
    globalTaxRate: 18,
  });

  assert.equal(built.items.length, 1);
  assert.equal(built.items[0].unit_price, 12000);
  assert.equal(built.items[0].tax_rate, 12);
  assert.equal(built.items[0].line_item, 'Solar panel 550W');
  assert.equal(built.items[0].price_overridden, false);
});

test('ignores client-supplied prices without override permission', async () => {
  const built = await buildQuotationItems({
    adminClient: mockAdmin({ products: [PANEL] }),
    rawItems: [{ product_id: PANEL.id, quantity: 1, unit_price: 1 }],
    canOverridePricing: false,
  });

  assert.equal(built.items[0].unit_price, 12000);
  assert.equal(built.items[0].price_overridden, false);
});

test('honours a price override for managers', async () => {
  const built = await buildQuotationItems({
    adminClient: mockAdmin({ products: [PANEL] }),
    rawItems: [{ product_id: PANEL.id, quantity: 1, unit_price: 11000 }],
    canOverridePricing: true,
  });

  assert.equal(built.items[0].unit_price, 11000);
  assert.equal(built.items[0].price_overridden, true);
});

test('accepts manual installation and other charges', async () => {
  const built = await buildQuotationItems({
    adminClient: mockAdmin(),
    rawItems: [
      { line_item: 'Installation and commissioning', quantity: 1, unit_price: 5000, item_type: 'installation' },
      { line_item: 'Net metering liaison', quantity: 1, unit_price: 1500, item_type: 'other' },
    ],
    installationCharges: 2500,
    otherCharges: 500,
    globalTaxRate: 18,
  });

  assert.equal(built.items.length, 4);
  assert.equal(built.items[0].item_type, 'installation');
  assert.equal(built.items[1].item_type, 'other');
  assert.equal(built.items[2].line_item, 'Installation & Commissioning Charges');
  assert.equal(built.items[3].line_item, 'Other Charges');
});

test('expands a configurable package when no lines are supplied', async () => {
  const pkg = {
    id: '33333333-3333-4333-8333-333333333333',
    package_code: 'PKG-3KW',
    name: '3 kW on-grid package',
    system_type: 'on-grid',
    capacity_kw: 3,
    is_active: true,
  };
  const packageItems = [
    { product_id: PANEL.id, quantity: 6, is_optional: false, notes: null, product: PANEL },
    { product_id: INVERTER.id, quantity: 1, is_optional: false, notes: null, product: INVERTER },
  ];

  const built = await buildQuotationItems({
    adminClient: mockAdmin({ products: [PANEL, INVERTER], pkg, packageItems }),
    rawItems: [],
    packageId: pkg.id,
  });

  assert.equal(built.package.id, pkg.id);
  assert.equal(built.items.length, 2);
  assert.equal(built.items[0].quantity, 6);
  assert.equal(built.items[0].package_id, pkg.id);
  assert.equal(built.items[1].unit_price, 25000);
});

test('rejects unavailable products and empty quotations', async () => {
  await assert.rejects(
    buildQuotationItems({
      adminClient: mockAdmin({ products: [{ ...PANEL, is_active: false }] }),
      rawItems: [{ product_id: PANEL.id, quantity: 1 }],
    }),
    /not available for quotation/
  );

  await assert.rejects(
    buildQuotationItems({ adminClient: mockAdmin(), rawItems: [] }),
    /at least one product, package or charge/
  );

  await assert.rejects(
    buildQuotationItems({
      adminClient: mockAdmin(),
      rawItems: [{ quantity: 1, unit_price: 100 }],
    }),
    /needs a description/
  );
});
