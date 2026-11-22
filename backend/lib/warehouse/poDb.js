// Purchase orders stored in the database (purchase_orders / purchase_order_items),
// returned in the shape the warehouse screens expect. Receiving goods adds stock to
// the inventory table and records a stock movement.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PO_SELECT = `
  *,
  warehouse:warehouse_id ( id, name, code ),
  items:purchase_order_items ( id, product_id, quantity_ordered, quantity_received, unit_price, total_price,
                               product:product_id ( id, sku, name ) )
`;

function toUiPo(row) {
  return {
    ...row,
    po_number: row.po_code,
    order_date: row.created_at,
    warehouse_name: row.warehouse?.name || 'Warehouse',
    items: (row.items || []).map((i) => ({
      ...i,
      product_name: i.product?.name || 'Item',
      sku: i.product?.sku || '',
      quantity_ordered: Number(i.quantity_ordered) || 0,
      quantity_received: Number(i.quantity_received) || 0,
      unit_price: Number(i.unit_price) || 0,
      total_price: Number(i.total_price) || 0,
    })),
  };
}

export async function listPurchaseOrders(db, { status } = {}) {
  let q = db.from('purchase_orders').select(PO_SELECT).order('created_at', { ascending: false });
  if (status && status !== 'all') q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data || []).map(toUiPo);
}

async function defaultWarehouseId(db) {
  const { data } = await db.from('warehouses').select('id').eq('is_active', true).order('created_at', { ascending: true }).limit(1);
  if (data?.[0]) return data[0].id;
  const { data: created } = await db.from('warehouses').insert({ name: 'Main Warehouse', code: 'WH-MAIN', city: 'Head office', is_active: true }).select('id').single();
  return created?.id || null;
}

export async function createPurchaseOrder(db, body, profile) {
  const items = Array.isArray(body.items) ? body.items : [];
  const ids = items.map((i) => i.product_id).filter((id) => UUID.test(id || ''));
  if (items.length === 0 || ids.length !== items.length) throw new Error('Choose a product for every line.');

  const { data: products } = await db.from('products').select('id, base_price').in('id', ids);
  const priceOf = new Map((products || []).map((p) => [p.id, Number(p.base_price) || 0]));
  if (priceOf.size !== new Set(ids).size) throw new Error('One of the selected products no longer exists.');

  const lines = items.map((i) => {
    const qty = Number(i.quantity_ordered ?? i.quantity);
    if (!Number.isFinite(qty) || qty <= 0) throw new Error('Quantities must be greater than zero.');
    const unit = Number.isFinite(Number(i.unit_price)) && Number(i.unit_price) >= 0 ? Number(i.unit_price) : priceOf.get(i.product_id) || 0;
    return { product_id: i.product_id, quantity_ordered: qty, quantity_received: 0, unit_price: unit, total_price: Math.round(qty * unit * 100) / 100 };
  });
  const total = lines.reduce((s, l) => s + l.total_price, 0);

  const warehouseId = UUID.test(body.warehouse_id || '') ? body.warehouse_id : await defaultWarehouseId(db);
  const code = (body.po_number && String(body.po_number).trim()) || `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const { data: po, error } = await db
    .from('purchase_orders')
    .insert({
      po_code: code,
      supplier_name: body.supplier_name,
      supplier_phone: body.supplier_phone || body.supplier_contact || null,
      supplier_email: body.supplier_email || null,
      status: 'approved', // ordered with the supplier, waiting for delivery
      total_amount: total,
      expected_date: body.expected_date || body.expected_delivery_date || null,
      warehouse_id: warehouseId,
      notes: body.notes || null,
      created_by: profile?.id || null,
    })
    .select('id')
    .single();
  if (error) {
    throw new Error(/duplicate|unique/i.test(error.message) ? `PO number "${code}" is already used.` : error.message);
  }

  const { error: itemsError } = await db.from('purchase_order_items').insert(lines.map((l) => ({ ...l, purchase_order_id: po.id })));
  if (itemsError) {
    await db.from('purchase_orders').delete().eq('id', po.id);
    throw new Error(itemsError.message);
  }

  const { data: full } = await db.from('purchase_orders').select(PO_SELECT).eq('id', po.id).single();
  return toUiPo(full);
}

/** Records received quantities, adds them to stock and updates the PO status. */
export async function receivePurchaseOrder(db, id, receipts, profile) {
  if (!UUID.test(id || '')) return null;
  const { data: row } = await db.from('purchase_orders').select(PO_SELECT).eq('id', id).maybeSingle();
  if (!row) return null;
  const po = toUiPo(row);
  if (po.status === 'cancelled') throw new Error('This purchase order is cancelled.');

  let any = false;
  for (const r of receipts) {
    const item = po.items.find((i) => i.id === r.item_id || i.product_id === r.product_id);
    const qty = Number(r.quantity_received) || 0;
    if (!item || qty <= 0) continue;
    const remaining = item.quantity_ordered - item.quantity_received;
    if (qty > remaining) throw new Error(`Cannot receive ${qty} of ${item.product_name}. Only ${remaining} pending.`);

    await db.from('purchase_order_items').update({ quantity_received: item.quantity_received + qty }).eq('id', item.id);
    item.quantity_received += qty;
    any = true;

    const { data: inv } = await db.from('inventory').select('id, quantity_on_hand').eq('product_id', item.product_id).eq('warehouse_id', po.warehouse_id).maybeSingle();
    const now = new Date().toISOString();
    if (inv) {
      await db.from('inventory').update({ quantity_on_hand: Number(inv.quantity_on_hand) + qty, last_restocked_at: now, updated_at: now }).eq('id', inv.id);
    } else {
      await db.from('inventory').insert({ product_id: item.product_id, warehouse_id: po.warehouse_id, quantity_on_hand: qty, quantity_reserved: 0, last_restocked_at: now });
    }
    await db.from('stock_movements').insert({
      product_id: item.product_id,
      warehouse_id: po.warehouse_id,
      movement_type: 'stock_in',
      quantity: qty,
      reference_type: 'purchase_order',
      reference_id: po.id,
      notes: `Received on ${po.po_code} (${item.quantity_received}/${item.quantity_ordered})`,
      created_by: profile?.id || null,
    });
  }
  if (!any) throw new Error('Enter at least one quantity to receive.');

  const all = po.items.every((i) => i.quantity_received >= i.quantity_ordered);
  const update = all
    ? { status: 'received', received_date: new Date().toISOString().slice(0, 10) }
    : { status: 'partially_received' };
  await db.from('purchase_orders').update(update).eq('id', po.id);

  const { data: fresh } = await db.from('purchase_orders').select(PO_SELECT).eq('id', po.id).single();
  return toUiPo(fresh);
}
