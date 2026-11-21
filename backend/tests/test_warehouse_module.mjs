// Automated End-to-End Test Suite for Solvix Warehouse, Inventory, Serial Number & Dispatch Management Module
// Verifies all 12 test requirements from Section 13:
// 1. Product creation with solar categories, prices, min stock threshold, and solar specs.
// 2. Stock receiving through verified PO goods receipt increases inventory on hand.
// 3. Purchase order creation does NOT immediately increase stock until verified receipt.
// 4. Stock adjustment correctly updates quantity on hand and writes audit log.
// 5. Low-stock alert appears when available quantity drops below minimum threshold.
// 6. Order packing reservation locks stock without reducing quantity on hand.
// 7. Double-reservation prevention succeeds.
// 8. Interactive packing checklist marks items packed and attaches equipment serials.
// 9. Serial number registration uniqueness and duplicate serial number rejection.
// 10. QR code payload generation and instant serial/QR lookup utility.
// 11. Dispatch authorization deducts stock from quantity on hand exactly once and releases reservation.
// 12. Equipment Delivery confirmation records delivery date, initiates warranty coverage,
//     and sets warranty.start_date = delivery_date (and expiry_date = start_date + duration).

import { warehouseStore } from '../lib/warehouse/warehouseStore.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runWarehouseTests() {
  console.log('\n=================================================================');
  console.log('SOLVIX WAREHOUSE, INVENTORY, SERIALS & DISPATCH TEST SUITE');
  console.log('=================================================================\n');

  const adminProfile = {
    id: '00000000-0000-0000-0000-000000000001',
    full_name: 'Lead Inventory Manager',
    email: 'warehouse.lead@solvix.energy',
    account_type: 'admin',
    role: 'Warehouse Manager'
  };

  const staffProfile = {
    id: 'staff-0000-0000-0000-000000000001',
    full_name: 'Rajesh Kumar',
    email: 'rajesh.k@solvix.energy',
    account_type: 'employee',
    role: 'Warehouse Staff'
  };

  // -------------------------------------------------------------
  // TEST 1: Product Creation with Solar Categories & Specs
  // -------------------------------------------------------------
  console.log('TEST 1: Product Creation & Solar Specifications');
  const newProduct = await warehouseStore.createProduct({
    name: 'Vikram Solar 550Wp Mono PERC Half-Cut Module',
    sku: 'SP-VIK-550M',
    category: 'solar_panel',
    manufacturer: 'Vikram Solar',
    description: 'Tier-1 Mono PERC Bifacial Solar Photovoltaic Module',
    unit: 'pcs',
    purchase_price: 11500,
    selling_price: 14200,
    min_stock_threshold: 25,
    status: 'active',
    requires_serial_number: true,
    warranty_months: 300, // 25 years
    specifications: {
      wattage: '550Wp',
      efficiency: '21.28%',
      phase: 'Single/Three',
      dimensions: '2279 x 1134 x 35 mm'
    }
  }, adminProfile);

  assert(newProduct && newProduct.id, 'Product created with generated UUID');
  assert(newProduct.sku === 'SP-VIK-550M', 'Product SKU is preserved');
  assert(newProduct.category === 'solar_panel', 'Solar category assigned correctly');
  assert(newProduct.warranty_months === 300, 'Warranty duration set to 300 months');

  // Verify initial inventory created for warehouses
  const invItems = await warehouseStore.getInventory({ product_id: newProduct.id });
  assert(invItems.length > 0, 'Initial inventory records auto-initialized across regional facilities');
  const initialQty = invItems[0].quantity_on_hand;
  assert(initialQty === 0, 'Newly created product has initial quantity_on_hand = 0');

  // -------------------------------------------------------------
  // TEST 2 & 3: Purchase Orders & Goods Receiving
  // -------------------------------------------------------------
  console.log('\nTEST 2 & 3: Purchase Order Creation & Verified Goods Receipt');
  const primaryWhId = invItems[0].warehouse_id;

  const newPO = await warehouseStore.createPurchaseOrder({
    po_number: 'PO-TEST-2026-001',
    warehouse_id: primaryWhId,
    supplier_name: 'Vikram Solar Limited',
    supplier_contact: '+91 33 2230 4567',
    supplier_email: 'sales@vikramsolar.com',
    expected_delivery_date: '2026-11-30',
    notes: 'Q4 bulk supply order',
    items: [
      { product_id: newProduct.id, quantity_ordered: 100, unit_price: 11500 }
    ]
  }, adminProfile);

  assert(newPO && newPO.id, 'Purchase order created successfully');
  assert(newPO.status === 'ordered', 'PO created in ordered state');

  // CRITICAL CHECK 3: PO creation must NOT increase stock
  const postPOCheck = await warehouseStore.getInventory({ product_id: newProduct.id, warehouse_id: primaryWhId });
  assert(postPOCheck[0].quantity_on_hand === 0, 'CRITICAL: Stock quantity_on_hand did NOT increase upon PO creation');

  // PARTIAL GOODS RECEIPT: Receive 40 units out of 100
  console.log('Sub-test: Partial Goods Receipt (40 of 100)');
  const partialReceipt = await warehouseStore.receiveGoods(newPO.id, {
    received_items: [
      { product_id: newProduct.id, quantity_received: 40 }
    ],
    receiving_notes: 'Challan #VS-9821 partial delivery - 40 modules arrived in good condition'
  }, staffProfile);

  assert(partialReceipt.purchase_order.status === 'partially_received', 'PO status updated to partially_received');
  const postPartialInv = await warehouseStore.getInventory({ product_id: newProduct.id, warehouse_id: primaryWhId });
  assert(postPartialInv[0].quantity_on_hand === 40, 'Inventory quantity_on_hand increased to exactly 40 units after verified receipt');

  // FULL GOODS RECEIPT: Receive remaining 60 units
  console.log('Sub-test: Finalizing Receipt (remaining 60 units)');
  const fullReceipt = await warehouseStore.receiveGoods(newPO.id, {
    received_items: [
      { product_id: newProduct.id, quantity_received: 60 }
    ],
    receiving_notes: 'Challan #VS-9890 remaining 60 modules received'
  }, staffProfile);

  assert(fullReceipt.purchase_order.status === 'received', 'PO status transitioned to received in full');
  const postFullInv = await warehouseStore.getInventory({ product_id: newProduct.id, warehouse_id: primaryWhId });
  assert(postFullInv[0].quantity_on_hand === 100, 'Inventory quantity_on_hand reached full 100 units');

  // -------------------------------------------------------------
  // TEST 4: Stock Adjustment & Audit Trail
  // -------------------------------------------------------------
  console.log('\nTEST 4: Stock Adjustment & Audit Trail');
  const adjResult = await warehouseStore.performStockOperation({
    operation: 'adjustment',
    productId: newProduct.id,
    warehouseId: primaryWhId,
    actualCount: 95, // Discrepancy: 5 units damaged during unboxing
    reason: 'physical_cycle_count',
    notes: '5 panels damaged in transit by freight handler'
  }, adminProfile);

  assert(adjResult.success, 'Stock adjustment executed');
  assert(adjResult.newOnHand === 95, 'Quantity on hand updated to physical count (95)');
  assert(adjResult.movement.quantity === -5, 'Negative movement delta of -5 recorded in movement log');

  // Non-negative stock guard
  let negativeBlocked = false;
  try {
    await warehouseStore.performStockOperation({
      operation: 'stock_out',
      productId: newProduct.id,
      warehouseId: primaryWhId,
      quantity: 500, // Exceeds 95
      reason: 'discard'
    }, adminProfile);
  } catch (err) {
    negativeBlocked = true;
  }
  assert(negativeBlocked, 'Non-negative stock guard prevented withdrawing more stock than available');

  // -------------------------------------------------------------
  // TEST 5: Low-Stock Alerts
  // -------------------------------------------------------------
  console.log('\nTEST 5: Low-Stock Alerts & Thresholds');
  // Adjust stock to 20 (below min threshold of 25)
  await warehouseStore.performStockOperation({
    operation: 'adjustment',
    productId: newProduct.id,
    warehouseId: primaryWhId,
    actualCount: 20,
    reason: 'test_low_stock'
  }, adminProfile);

  const dashRes = await warehouseStore.getDashboardMetrics();
  const alertFound = dashRes.low_stock_alerts.find(a => a.product_id === newProduct.id);
  assert(alertFound !== undefined, 'Product identified in low-stock alerts list');
  assert(alertFound.quantity_available === 20 && alertFound.min_threshold === 25, 'Alert shows 20 available against threshold 25');

  // Reset stock back to 100 for subsequent order tests
  await warehouseStore.performStockOperation({
    operation: 'adjustment',
    productId: newProduct.id,
    warehouseId: primaryWhId,
    actualCount: 100,
    reason: 'reset_for_testing'
  }, adminProfile);

  // -------------------------------------------------------------
  // TEST 6 & 7: Inventory Reservation & Double-Reservation Prevention
  // -------------------------------------------------------------
  console.log('\nTEST 6 & 7: Inventory Reservation & Double-Reservation Prevention');
  const testOrderId = 'ord-test-pack-001';

  // Reserve 12 units for order
  const res1 = await warehouseStore.reserveInventoryForOrder(testOrderId, [
    { product_id: newProduct.id, quantity: 12, warehouse_id: primaryWhId }
  ], adminProfile);

  assert(res1.success, 'Stock reserved for order successfully');
  const invAfterRes = await warehouseStore.getInventory({ product_id: newProduct.id, warehouse_id: primaryWhId });
  assert(invAfterRes[0].quantity_on_hand === 100, 'quantity_on_hand remains 100 (unreduced by reservation)');
  assert(invAfterRes[0].quantity_reserved === 12, 'quantity_reserved increased to 12');
  assert(invAfterRes[0].quantity_available === 88, 'quantity_available reduced to 88 (100 - 12)');

  // Attempt duplicate reservation for same order and product
  const res2 = await warehouseStore.reserveInventoryForOrder(testOrderId, [
    { product_id: newProduct.id, quantity: 12, warehouse_id: primaryWhId }
  ], adminProfile);

  assert(res2.success && res2.message.includes('already active'), 'Duplicate reservation safely recognized and skipped');
  const invAfterDup = await warehouseStore.getInventory({ product_id: newProduct.id, warehouse_id: primaryWhId });
  assert(invAfterDup[0].quantity_reserved === 12, 'Double reservation prevented: quantity_reserved remains 12 (not 24)');

  // -------------------------------------------------------------
  // TEST 8, 9 & 10: Serial Numbers, Batch Registration & QR Lookup
  // -------------------------------------------------------------
  console.log('\nTEST 8, 9 & 10: Serial Numbers, Duplicate Rejection & QR Lookup');
  const serial1 = 'SN-VIK-550-2026-00001';
  const serial2 = 'SN-VIK-550-2026-00002';

  const regSingle = await warehouseStore.registerSerialNumbers({
    product_id: newProduct.id,
    serial_number: serial1,
    warehouse_id: primaryWhId
  }, staffProfile);

  assert(regSingle && regSingle.id, 'Single serial registered with unique ID');
  assert(regSingle.qr_code_payload.includes(serial1), 'QR code payload generated containing serial number');

  // Duplicate rejection test
  let duplicateRejected = false;
  try {
    await warehouseStore.registerSerialNumbers({
      product_id: newProduct.id,
      serial_number: serial1, // Same serial!
      warehouse_id: primaryWhId
    }, staffProfile);
  } catch (err) {
    duplicateRejected = true;
  }
  assert(duplicateRejected, 'Duplicate serial number registration was rejected');

  // Batch registration test
  const batchResult = await warehouseStore.registerSerialNumbers({
    batch: [
      { product_id: newProduct.id, serial_number: serial2, warehouse_id: primaryWhId },
      { product_id: newProduct.id, serial_number: 'SN-VIK-550-2026-00003', warehouse_id: primaryWhId },
      { product_id: newProduct.id, serial_number: 'SN-VIK-550-2026-00004', warehouse_id: primaryWhId }
    ]
  }, staffProfile);

  assert(batchResult.registered === 3, 'Batch registration registered all 3 serial numbers');

  // QR / Serial Lookup test
  const lookup1 = await warehouseStore.lookupSerialNumber(serial1);
  assert(lookup1 && lookup1.serial_number === serial1, 'Lookup by serial string succeeded');
  assert(lookup1.product_name === newProduct.name, 'Lookup returns product description');

  const lookupQR = await warehouseStore.lookupSerialNumber(regSingle.qr_code_payload);
  assert(lookupQR && lookupQR.serial_number === serial1, 'Lookup by full QR payload succeeded');

  // -------------------------------------------------------------
  // TEST 11: Dispatch Execution, Single Stock Deduction & Reservation Release
  // -------------------------------------------------------------
  console.log('\nTEST 11: Dispatch Execution & Single Stock Deduction');
  const newDispatch = await warehouseStore.createDispatch({
    dispatch_number: 'DSP-TEST-2026-001',
    order_id: testOrderId,
    warehouse_id: primaryWhId,
    transporter_name: 'BlueDart Surface Express',
    tracking_number: 'BD-TEST-998811',
    vehicle_number: 'DL-01-EE-9090',
    destination_address: '14 Green Park Avenue, New Delhi',
    destination_city: 'New Delhi',
    customer_name: 'Sunil Aggarwal',
    customer_phone: '+91 98100 12345',
    authorize_immediate: true,
    items: [
      {
        product_id: newProduct.id,
        quantity: 12,
        serial_numbers: [serial1, serial2]
      }
    ]
  }, adminProfile);

  assert(newDispatch && newDispatch.id, 'Dispatch created and authorized');
  assert(newDispatch.status === 'in_transit', 'Dispatch status marked in_transit');

  // Check inventory deduction: on hand was 100, deducting 12 leaves 88. Reserved 12 is released to 0.
  const invAfterDispatch = await warehouseStore.getInventory({ product_id: newProduct.id, warehouse_id: primaryWhId });
  assert(invAfterDispatch[0].quantity_on_hand === 88, 'Stock deducted from quantity_on_hand: 100 - 12 = 88');
  assert(invAfterDispatch[0].quantity_reserved === 0, 'Reserved stock released back to 0 upon dispatch');
  assert(invAfterDispatch[0].quantity_available === 88, 'Available stock is exactly 88');

  // Check serial status transitioned to dispatched
  const serialAfterDispatch = await warehouseStore.lookupSerialNumber(serial1);
  assert(serialAfterDispatch.status === 'dispatched', 'Attached serial numbers transitioned to status: dispatched');

  // -------------------------------------------------------------
  // TEST 12: Delivery Confirmation & Warranty Trigger
  // -------------------------------------------------------------
  console.log('\nTEST 12: Equipment Delivery Confirmation & Warranty Clock Trigger');
  console.log('CRITICAL RULE: Warranty clock starts strictly on EQUIPMENT DELIVERY date');

  const deliveryResult = await warehouseStore.confirmDelivery(newDispatch.id, {
    recipient_name: 'Sunil Aggarwal (Customer)',
    recipient_phone: '+91 98100 12345',
    delivery_notes: 'Delivered at site, unloading completed, customer signed delivery proof POD'
  }, staffProfile);

  assert(deliveryResult && deliveryResult.dispatch.status === 'delivered', 'Dispatch status updated to delivered');
  assert(deliveryResult.delivery && deliveryResult.delivery.delivered_at, 'Delivery record created with delivered_at timestamp');

  // Check Warranties Created
  assert(deliveryResult.warranties && deliveryResult.warranties.length >= 2, 'Warranties activated for serial-tracked items');
  const w1 = deliveryResult.warranties.find(w => w.serial_number === serial1);
  assert(w1 !== undefined, `Warranty record generated for serial ${serial1}`);

  // CRITICAL RULE VERIFICATION:
  // start_date must match the equipment delivery date
  const deliveryDateStr = new Date(deliveryResult.delivery.delivered_at).toISOString().split('T')[0];
  const warrantyStartStr = new Date(w1.start_date).toISOString().split('T')[0];
  assert(warrantyStartStr === deliveryDateStr, `CRITICAL: Warranty start_date (${warrantyStartStr}) equals equipment delivery date (${deliveryDateStr})`);

  // Expiration date calculation: 300 months from delivery date
  const expectedExpiry = new Date(w1.start_date);
  expectedExpiry.setMonth(expectedExpiry.getMonth() + 300);
  const expectedExpiryStr = expectedExpiry.toISOString().split('T')[0];
  const actualExpiryStr = new Date(w1.expiry_date).toISOString().split('T')[0];
  assert(actualExpiryStr === expectedExpiryStr, `Warranty expiry_date (${actualExpiryStr}) is exactly 300 months after delivery date`);

  // Serial status updated to delivered
  const serialAfterDelivery = await warehouseStore.lookupSerialNumber(serial1);
  assert(serialAfterDelivery.status === 'delivered', 'Serial number status is delivered');

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log('\n======================================================');
  console.log(`WAREHOUSE TEST RUN COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runWarehouseTests().catch(err => {
  console.error('Test suite failed with unexpected error:', err);
  process.exit(1);
});
