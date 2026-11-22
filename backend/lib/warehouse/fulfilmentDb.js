// Warehouse fulfilment on the real database: which orders are waiting to be packed,
// reserving stock, the packing checklist and serial numbers, dispatches and delivery
// (which starts the warranty). Shapes match what the warehouse screens read.
//
// Where state lives (no extra tables needed):
//   reserved  -> inventory_reservations row with status "active"
//   packed    -> that reservation becomes "fulfilled"
//   serials   -> equipment_serial_numbers (order_id, status reserved/dispatched/delivered)
//   shipped   -> dispatches row; stock is deducted once, when the dispatch is created

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PACKABLE = ['confirmed', 'processing', 'awaiting_dispatch', 'ready_for_install', 'in_production'];
const SERIAL_CATEGORIES = ['solar_panels', 'solar_inverters', 'batteries'];

const fail = (message, status = 400) => Object.assign(new Error(message), { status });

async function orderRow(db, idOrCode) {
  const col = UUID.test(idOrCode || '') ? 'id' : 'order_code';
  const { data, error } = await db
    .from('orders')
    .select('*, customer:customer_id ( id, contact_name, company_name, phone, email ), quotation:quotation_id ( id, installation_address, system_type, system_capacity_kw )')
    .eq(col, idOrCode)
    .maybeSingle();
  if (error) throw fail(error.message, 500);
  return data;
}

async function bomFor(db, order) {
  const { data: items, error } = await db
    .from('quotation_items')
    .select('id, product_id, line_item, quantity, unit, item_type, product:product_id ( id, sku, name, unit, specifications, category:category_id ( code ) )')
    .eq('quotation_id', order.quotation_id)
    .order('sort_order', { ascending: true });
  if (error) throw fail(error.message, 500);

  const rows = (items || []).filter((i) => i.product_id && (i.item_type || 'product') === 'product');
  const [{ data: reservations }, { data: serials }] = await Promise.all([
    db.from('inventory_reservations').select('id, product_id, warehouse_id, quantity, status').eq('order_id', order.id),
    db.from('equipment_serial_numbers').select('serial_number, product_id, status, dispatch_id').eq('order_id', order.id),
  ]);

  return rows.map((i) => {
    const res = (reservations || []).filter((r) => r.product_id === i.product_id && ['active', 'fulfilled'].includes(r.status));
    const code = i.product?.category?.code || '';
    return {
      id: i.id,
      product_id: i.product_id,
      product_name: i.product?.name || i.line_item,
      product_sku: i.product?.sku || '',
      sku: i.product?.sku || '',
      quantity: Number(i.quantity) || 0,
      unit: i.unit || i.product?.unit || 'piece',
      requires_serial_number: i.product?.specifications?.requires_serial_number ?? SERIAL_CATEGORIES.includes(code),
      is_reserved: res.length > 0,
      is_packed: res.length > 0 && res.every((r) => r.status === 'fulfilled'),
      warehouse_id: res[0]?.warehouse_id || null,
      assigned_serials: (serials || []).filter((s) => s.product_id === i.product_id).map((s) => s.serial_number),
    };
  });
}

function packingStatus(bom) {
  if (bom.length === 0 || !bom.some((b) => b.is_reserved)) return 'pending';
  return bom.every((b) => b.is_packed) ? 'packed' : 'packing';
}

function addressOf(order) {
  return order.quotation?.installation_address || '';
}

export async function packingQueue(db) {
  const { data: orders, error } = await db
    .from('orders')
    .select('*, customer:customer_id ( id, contact_name, company_name ), quotation:quotation_id ( installation_address )')
    .in('status', PACKABLE)
    .order('created_at', { ascending: false });
  if (error) throw fail(error.message, 500);

  const out = [];
  for (const o of orders || []) {
    const bom = await bomFor(db, o);
    out.push({
      order_id: o.id,
      id: o.id,
      order_number: o.order_code,
      order_code: o.order_code,
      customer_name: o.customer?.company_name || o.customer?.contact_name || 'Customer',
      system_type: o.system_type,
      system_capacity_kw: o.system_capacity_kw,
      order_date: o.created_at,
      payment_status: o.payment_status,
      bom_items: bom,
      packing_status: packingStatus(bom),
    });
  }
  return out;
}

export async function packingDetail(db, idOrCode) {
  const o = await orderRow(db, idOrCode);
  if (!o) return null;
  const bom = await bomFor(db, o);
  return {
    order_id: o.id,
    id: o.id,
    order_number: o.order_code,
    customer_name: o.customer?.company_name || o.customer?.contact_name || 'Customer',
    customer_phone: o.customer?.phone || '',
    delivery_address: addressOf(o),
    city: '',
    status: o.status,
    is_reserved: bom.length > 0 && bom.every((b) => b.is_reserved),
    packing_status: packingStatus(bom),
    bom_items: bom,
  };
}

async function stockIn(db, productId) {
  const { data } = await db.from('inventory').select('id, warehouse_id, quantity_on_hand, quantity_reserved').eq('product_id', productId);
  return data || [];
}

export async function reserveStock(db, idOrCode, warehouseId, profile) {
  const o = await orderRow(db, idOrCode);
  if (!o) throw fail('Order not found.', 404);
  const bom = await bomFor(db, o);
  if (bom.length === 0) throw fail('This order has no physical items to pack.');

  const plan = [];
  const problems = [];
  for (const item of bom) {
    if (item.is_reserved) continue;
    const rows = await stockIn(db, item.product_id);
    const preferred = UUID.test(warehouseId || '') ? rows.find((r) => r.warehouse_id === warehouseId) : null;
    const pick = preferred || rows.slice().sort((a, b) => (b.quantity_on_hand - b.quantity_reserved) - (a.quantity_on_hand - a.quantity_reserved))[0];
    const available = pick ? Number(pick.quantity_on_hand) - Number(pick.quantity_reserved) : 0;
    if (!pick || available < item.quantity) {
      problems.push(`${item.product_name} (need ${item.quantity}, available ${Math.max(available, 0)})`);
    } else {
      plan.push({ item, pick });
    }
  }
  if (problems.length) {
    throw fail(`Not enough stock for: ${problems.join('; ')}. Receive stock for these products first (Purchase Orders or Stock In).`, 409);
  }

  const now = new Date().toISOString();
  for (const { item, pick } of plan) {
    await db.from('inventory').update({ quantity_reserved: Number(pick.quantity_reserved) + item.quantity, updated_at: now }).eq('id', pick.id);
    await db.from('inventory_reservations').insert({
      product_id: item.product_id, warehouse_id: pick.warehouse_id, order_id: o.id,
      quantity: item.quantity, status: 'active', created_by: profile?.id || null,
    });
    await db.from('stock_movements').insert({
      product_id: item.product_id, warehouse_id: pick.warehouse_id, movement_type: 'reservation', quantity: item.quantity,
      reference_type: 'order', reference_id: o.id, notes: `Reserved for order ${o.order_code}`, created_by: profile?.id || null,
    });
  }
  if (o.status === 'confirmed') {
    await db.from('orders').update({ status: 'processing', updated_at: now }).eq('id', o.id);
    await db.from('order_status_history').insert({ order_id: o.id, previous_status: 'confirmed', new_status: 'processing', changed_by: profile?.id || null, notes: 'Stock reserved by the warehouse' });
  }
  return packingDetail(db, o.id);
}

export async function completePacking(db, idOrCode, packedMap = {}, serialMap = {}, profile) {
  const o = await orderRow(db, idOrCode);
  if (!o) throw fail('Order not found.', 404);
  let bom = await bomFor(db, o);
  if (!bom.every((b) => b.is_reserved)) throw fail('Reserve the stock first, then complete packing.', 409);

  const toPack = bom.filter((b) => packedMap[b.product_id]);
  const now = new Date().toISOString();

  for (const item of toPack) {
    // serial numbers typed or scanned in the checklist are recorded against this order
    const typed = [...new Set((serialMap[item.product_id] || []).map((s) => String(s).trim().toUpperCase()).filter(Boolean))];
    for (const sn of typed) {
      const { data: existing } = await db.from('equipment_serial_numbers').select('id, order_id, product_id').eq('serial_number', sn).maybeSingle();
      if (existing && existing.order_id && existing.order_id !== o.id) throw fail(`Serial ${sn} is already assigned to another order.`, 409);
      if (existing && existing.product_id !== item.product_id) throw fail(`Serial ${sn} belongs to a different product.`, 409);
      if (existing) {
        await db.from('equipment_serial_numbers').update({ order_id: o.id, customer_id: o.customer_id, status: 'reserved', current_location: 'Packed for dispatch', updated_at: now }).eq('id', existing.id);
      } else {
        await db.from('equipment_serial_numbers').insert({
          serial_number: sn, product_id: item.product_id, status: 'reserved', order_id: o.id, customer_id: o.customer_id,
          current_location: 'Packed for dispatch', qr_code_data: `SOLVIX:SN:${sn}:PROD:${item.product_sku}`, warranty_status: 'pending_delivery',
        });
      }
    }
    await db.from('inventory_reservations').update({ status: 'fulfilled' }).eq('order_id', o.id).eq('product_id', item.product_id).eq('status', 'active');
  }

  bom = await bomFor(db, o);
  const allPacked = bom.length > 0 && bom.every((b) => b.is_packed);
  if (allPacked && o.status !== 'awaiting_dispatch') {
    await db.from('orders').update({ status: 'awaiting_dispatch', updated_at: now }).eq('id', o.id);
    await db.from('order_status_history').insert({ order_id: o.id, previous_status: o.status, new_status: 'awaiting_dispatch', changed_by: profile?.id || null, notes: 'Packing completed' });
  }
  return { ...(await packingDetail(db, o.id)), all_packed: allPacked };
}

// ---------------- dispatches ----------------

const DISPATCH_SELECT = '*, order:order_id ( id, order_code, status, customer_id, quotation:quotation_id ( installation_address ) ), warehouse:warehouse_id ( id, name ), customer:customer_id ( contact_name, company_name, phone )';

function dispatchView(d) {
  return {
    ...d,
    dispatch_number: d.dispatch_code,
    order_number: d.order?.order_code || '',
    customer_name: d.customer?.company_name || d.customer?.contact_name || '',
    customer_phone: d.customer?.phone || '',
    warehouse_name: d.warehouse?.name || 'Warehouse',
    destination_address: d.order?.quotation?.installation_address || '',
  };
}

export async function listDispatches(db, { status } = {}) {
  let q = db.from('dispatches').select(DISPATCH_SELECT).order('created_at', { ascending: false });
  if (status && status !== 'all') q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw fail(error.message, 500);
  return (data || []).map(dispatchView);
}

async function itemsFor(db, orderId, dispatchId) {
  const { data: order } = await db.from('orders').select('id, quotation_id').eq('id', orderId).maybeSingle();
  if (!order) return [];
  const bom = await bomFor(db, order);
  const { data: serials } = await db.from('equipment_serial_numbers').select('serial_number, product_id').eq('order_id', orderId);
  return bom.map((b) => ({
    product_id: b.product_id, product_name: b.product_name, product_sku: b.product_sku, sku: b.product_sku,
    quantity: b.quantity, unit: b.unit,
    serial_numbers: (serials || []).filter((s) => s.product_id === b.product_id).map((s) => s.serial_number),
  }));
}

export async function getDispatch(db, id) {
  const col = UUID.test(id || '') ? 'id' : 'dispatch_code';
  const { data: d, error } = await db.from('dispatches').select(DISPATCH_SELECT).eq(col, id).maybeSingle();
  if (error) throw fail(error.message, 500);
  if (!d) return null;
  const view = dispatchView(d);
  view.items = await itemsFor(db, d.order_id, d.id);

  const { data: delivery } = await db.from('equipment_deliveries').select('*').eq('dispatch_id', d.id).limit(1);
  view.recipient_name = delivery?.[0]?.notes?.split('|')[0]?.replace('Received by ', '') || undefined;

  const { data: warranties } = await db
    .from('warranties')
    .select('warranty_code, status, start_date, expiry_date, duration_years, equipment:equipment_serial_id ( serial_number ), product:product_id ( name )')
    .eq('order_id', d.order_id);
  view.warranties = (warranties || []).map((w) => ({
    ...w,
    serial_number: w.equipment?.serial_number,
    product_name: w.product?.name,
    duration_months: Math.round(Number(w.duration_years) * 12),
  }));
  return view;
}

export async function createDispatch(db, body, profile) {
  const o = await orderRow(db, body.order_id);
  if (!o) throw fail('Order not found.', 404);
  const bom = await bomFor(db, o);
  if (!bom.every((b) => b.is_packed)) throw fail('Finish packing this order before dispatching it.', 409);

  const { data: existing } = await db.from('dispatches').select('id').eq('order_id', o.id).neq('status', 'cancelled').limit(1);
  if (existing && existing.length) throw fail('This order already has a dispatch.', 409);

  const now = new Date().toISOString();
  const code = (body.dispatch_number && String(body.dispatch_number).trim()) || `DSP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  // the warehouse the stock was reserved from
  const { data: resv } = await db.from('inventory_reservations').select('warehouse_id').eq('order_id', o.id).limit(1);
  const warehouseId = resv?.[0]?.warehouse_id || (UUID.test(body.warehouse_id || '') ? body.warehouse_id : null);
  if (!warehouseId) throw fail('No warehouse is linked to this order. Reserve stock first.', 409);

  const { data: dispatch, error } = await db
    .from('dispatches')
    .insert({
      dispatch_code: code, order_id: o.id, warehouse_id: warehouseId, customer_id: o.customer_id,
      status: 'in_transit', dispatched_by: profile?.id || null, dispatched_at: now, created_by: profile?.id || null,
      transporter_name: body.transporter_name || null, tracking_number: body.tracking_number || null,
      vehicle_number: body.vehicle_number || null, driver_phone: body.driver_phone || null,
      notes: [body.driver_name && `Driver: ${body.driver_name}`, body.notes].filter(Boolean).join('. ') || null,
    })
    .select('id')
    .single();
  if (error) throw fail(/duplicate|unique/i.test(error.message) ? `Dispatch number "${code}" is already used.` : error.message, 400);

  // stock leaves the warehouse exactly once, now
  for (const item of bom) {
    const { data: inv } = await db.from('inventory').select('id, quantity_on_hand, quantity_reserved').eq('product_id', item.product_id).eq('warehouse_id', warehouseId).maybeSingle();
    if (inv) {
      await db.from('inventory').update({
        quantity_on_hand: Math.max(Number(inv.quantity_on_hand) - item.quantity, 0),
        quantity_reserved: Math.max(Number(inv.quantity_reserved) - item.quantity, 0),
        updated_at: now,
      }).eq('id', inv.id);
    }
    await db.from('stock_movements').insert({
      product_id: item.product_id, warehouse_id: warehouseId, movement_type: 'stock_out', quantity: item.quantity,
      reference_type: 'dispatch', reference_id: dispatch.id, notes: `Dispatched on ${code} for order ${o.order_code}`, created_by: profile?.id || null,
    });
  }

  const { data: serials } = await db.from('equipment_serial_numbers').select('id').eq('order_id', o.id);
  for (const s of serials || []) {
    await db.from('equipment_serial_numbers').update({ status: 'dispatched', dispatch_id: dispatch.id, current_location: 'In transit', updated_at: now }).eq('id', s.id);
    await db.from('dispatch_items').insert({ dispatch_id: dispatch.id, equipment_serial_id: s.id, quantity: 1, scanned_at: now, scanned_by: profile?.id || null });
  }

  await db.from('orders').update({ status: 'dispatched', updated_at: now }).eq('id', o.id);
  await db.from('order_status_history').insert({ order_id: o.id, previous_status: o.status, new_status: 'dispatched', changed_by: profile?.id || null, notes: `Dispatched (${code})` });

  return getDispatch(db, dispatch.id);
}

/** Delivery confirmed at the customer's site: the warranty clock starts today. */
export async function confirmDelivery(db, id, body, profile) {
  const d = await getDispatch(db, id);
  if (!d) throw fail('Dispatch not found.', 404);
  if (d.status === 'delivered') throw fail('This dispatch is already marked delivered.', 409);

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  await db.from('dispatches').update({ status: 'delivered', delivered_at: now.toISOString(), delivery_date: today, updated_at: now.toISOString() }).eq('id', d.id);
  await db.from('equipment_deliveries').insert({
    dispatch_id: d.id, customer_id: d.customer_id, delivered_at: now.toISOString(), delivery_person_id: profile?.id || null,
    notes: `Received by ${body.recipient_name || 'customer'}${body.recipient_phone ? ` (${body.recipient_phone})` : ''}|${body.delivery_notes || ''}`,
  });

  const { data: serials } = await db
    .from('equipment_serial_numbers')
    .select('id, serial_number, product_id, product:product_id ( warranty_years )')
    .eq('order_id', d.order_id);

  const activated = [];
  for (const s of serials || []) {
    const years = Number(s.product?.warranty_years) || 1;
    const end = new Date(now);
    end.setFullYear(end.getFullYear() + years);
    await db.from('equipment_serial_numbers').update({
      status: 'delivered', delivery_date: today, warranty_start_date: today, warranty_expiry_date: end.toISOString().slice(0, 10),
      warranty_status: 'active', current_location: 'Customer site', updated_at: now.toISOString(),
    }).eq('id', s.id);

    const { data: w, error } = await db.from('warranties').insert({
      warranty_code: `WAR-${now.getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
      equipment_serial_id: s.id, customer_id: d.customer_id, order_id: d.order_id, product_id: s.product_id,
      warranty_type: 'manufacturer', duration_years: years, start_date: today, expiry_date: end.toISOString().slice(0, 10),
      status: 'active', activated_at: now.toISOString(), terms: 'Manufacturer warranty. Starts from the delivery date.',
    }).select('warranty_code').single();
    if (!error && w) activated.push(w.warranty_code);
  }

  await db.from('orders').update({ status: 'ready_for_install', updated_at: now.toISOString() }).eq('id', d.order_id);
  await db.from('order_status_history').insert({ order_id: d.order_id, previous_status: 'dispatched', new_status: 'ready_for_install', changed_by: profile?.id || null, notes: 'Delivered to the customer' });

  return { dispatch: await getDispatch(db, d.id), actual_delivery_date: today, warranties_activated: activated };
}
