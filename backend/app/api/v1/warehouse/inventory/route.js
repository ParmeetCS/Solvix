import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireWarehouseAccess, logWarehouseActivity } from '@/lib/supabase/warehouseAuth';
import { warehouseStore } from '@/lib/warehouse/warehouseStore';

export async function OPTIONS() {
  return handleOptions();
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Stock rows from the database, including catalogue products that have no stock row yet. */
async function loadInventoryFromDb(adminClient, { warehouse_id, low_stock_only, search }) {
  const [prodRes, whRes, invRes] = await Promise.all([
    adminClient.from('products').select('id, sku, name, min_stock_level, is_active, category:category_id ( name )').eq('is_active', true),
    adminClient.from('warehouses').select('id, name, code').eq('is_active', true).order('name'),
    adminClient.from('inventory').select('*'),
  ]);
  if (prodRes.error || whRes.error || invRes.error) return null;

  const products = new Map((prodRes.data || []).map((p) => [p.id, p]));
  const warehouses = new Map((whRes.data || []).map((w) => [w.id, w]));
  const rows = [];

  const shape = (inv, p, wh) => {
    const onHand = Number(inv.quantity_on_hand) || 0;
    const reserved = Number(inv.quantity_reserved) || 0;
    const available = onHand - reserved;
    const threshold = Number(p?.min_stock_level) || 5;
    return {
      ...inv,
      product_name: p?.name || 'Unknown',
      product_sku: p?.sku || 'N/A',
      sku: p?.sku || 'N/A',
      category_name: p?.category?.name || 'General',
      warehouse: wh,
      warehouse_name: wh?.name || 'Unassigned',
      available_stock: available,
      quantity_available: available,
      min_stock_threshold: threshold,
      is_low_stock: available <= threshold,
    };
  };

  const stocked = new Set();
  for (const inv of invRes.data || []) {
    const p = products.get(inv.product_id);
    if (!p) continue;
    stocked.add(inv.product_id);
    rows.push(shape(inv, p, warehouses.get(inv.warehouse_id)));
  }

  // A product that was just added has no stock row yet: show it with zero stock so it can be received.
  const firstWh = (whRes.data || [])[0];
  for (const p of products.values()) {
    if (stocked.has(p.id)) continue;
    rows.push(shape(
      { id: `new-${p.id}`, product_id: p.id, warehouse_id: firstWh?.id || null, quantity_on_hand: 0, quantity_reserved: 0 },
      p,
      firstWh
    ));
  }

  let list = rows;
  if (warehouse_id && warehouse_id !== 'all') list = list.filter((r) => r.warehouse_id === warehouse_id);
  if (low_stock_only) list = list.filter((r) => r.is_low_stock);
  if (search) {
    const q = search.toLowerCase();
    list = list.filter((r) => r.product_name.toLowerCase().includes(q) || String(r.sku).toLowerCase().includes(q));
  }
  return list.sort((a, b) => a.product_name.localeCompare(b.product_name));
}

/**
 * GET /api/v1/warehouse/inventory
 * Master inventory stock listing with warehouse, available quantities, and low stock status.
 */
export async function GET(request) {
  try {
    const authResult = await requireWarehouseAccess(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { searchParams } = new URL(request.url);
    const warehouse_id = searchParams.get('warehouse_id') || '';
    const low_stock_only = searchParams.get('low_stock_only') === 'true';
    const search = searchParams.get('search') || '';

    if (authResult.adminClient) {
      try {
        const inventory = await loadInventoryFromDb(authResult.adminClient, { warehouse_id, low_stock_only, search });
        if (inventory && inventory.length > 0) return jsonResponse({ inventory });
      } catch (e) {
        // fall back to the in-memory store
      }
    }

    const inventory = await warehouseStore.getInventory({ warehouse_id, low_stock_only, search });
    return jsonResponse({ inventory });
  } catch (error) {
    return jsonError('Failed to fetch inventory: ' + error.message, 500);
  }
}

// ---------- stock operations (database) ----------

async function readQty(db, productId, warehouseId) {
  const { data } = await db.from('inventory').select('id, quantity_on_hand, quantity_reserved').eq('product_id', productId).eq('warehouse_id', warehouseId).maybeSingle();
  return data || null;
}

async function setQty(db, productId, warehouseId, onHand) {
  const row = await readQty(db, productId, warehouseId);
  if (row) {
    const { error } = await db.from('inventory').update({ quantity_on_hand: onHand, updated_at: new Date().toISOString() }).eq('id', row.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await db.from('inventory').insert({ product_id: productId, warehouse_id: warehouseId, quantity_on_hand: onHand, quantity_reserved: 0, last_restocked_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
  }
}

async function movement(db, profile, productId, warehouseId, type, qty, notes, refType) {
  await db.from('stock_movements').insert({
    product_id: productId,
    warehouse_id: warehouseId,
    movement_type: type,
    quantity: qty,
    reference_type: refType || null,
    notes: notes || null,
    created_by: profile?.id || null,
  });
}

async function runDbOperation(db, profile, p) {
  const op = p.operation;
  const qty = Number(p.quantity);
  const needQty = () => {
    if (!Number.isFinite(qty) || qty <= 0) throw new Error('Enter a quantity greater than zero.');
  };
  if (!UUID.test(p.productId || '') || !UUID.test(p.warehouseId || '')) {
    throw new Error('Choose a product and a warehouse.');
  }
  const current = await readQty(db, p.productId, p.warehouseId);
  const onHand = Number(current?.quantity_on_hand) || 0;
  const reserved = Number(current?.quantity_reserved) || 0;

  if (op === 'stock_in') {
    needQty();
    await setQty(db, p.productId, p.warehouseId, onHand + qty);
    await movement(db, profile, p.productId, p.warehouseId, 'stock_in', qty, p.notes, p.referenceType);
    return { newOnHand: onHand + qty };
  }
  if (op === 'stock_out') {
    needQty();
    if (onHand - reserved < qty) throw new Error(`Only ${onHand - reserved} available in this warehouse.`);
    await setQty(db, p.productId, p.warehouseId, onHand - qty);
    await movement(db, profile, p.productId, p.warehouseId, 'stock_out', qty, p.notes);
    return { newOnHand: onHand - qty };
  }
  if (op === 'adjustment') {
    const actual = Number(p.actualCount);
    if (!Number.isFinite(actual) || actual < 0) throw new Error('Enter the counted quantity.');
    await setQty(db, p.productId, p.warehouseId, actual);
    await movement(db, profile, p.productId, p.warehouseId, 'adjustment', actual - onHand, p.reason || p.notes, 'audit');
    return { newOnHand: actual };
  }
  if (op === 'transfer') {
    needQty();
    if (!UUID.test(p.toWarehouseId || '') || p.toWarehouseId === p.warehouseId) throw new Error('Choose a different destination warehouse.');
    if (onHand - reserved < qty) throw new Error(`Only ${onHand - reserved} available to transfer.`);
    const dest = await readQty(db, p.productId, p.toWarehouseId);
    await setQty(db, p.productId, p.warehouseId, onHand - qty);
    await setQty(db, p.productId, p.toWarehouseId, (Number(dest?.quantity_on_hand) || 0) + qty);
    await movement(db, profile, p.productId, p.warehouseId, 'stock_out', qty, `Transfer out. ${p.notes || ''}`.trim(), 'transfer');
    await movement(db, profile, p.productId, p.toWarehouseId, 'stock_in', qty, `Transfer in. ${p.notes || ''}`.trim(), 'transfer');
    return { newOnHand: onHand - qty };
  }
  throw new Error(`Unsupported operation: ${op}`);
}

/**
 * POST /api/v1/warehouse/inventory
 * body: { operation: 'stock_in'|'stock_out'|'adjustment'|'transfer', productId, warehouseId, quantity, ... }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const authResult = await requireWarehouseAccess(request, { requireAdjustment: body.operation === 'adjustment' });
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }
    const { profile, adminClient } = authResult;

    let result;
    if (adminClient && UUID.test(body.productId || '')) {
      result = await runDbOperation(adminClient, profile, body);
    } else {
      result = await warehouseStore.performStockOperation(body, profile);
    }

    await logWarehouseActivity({
      actorId: profile.id,
      action: `STOCK_${String(body.operation || '').toUpperCase()}`,
      entityId: UUID.test(body.productId || '') ? body.productId : undefined,
      entityType: 'product',
      metadata: { warehouse_id: body.warehouseId, quantity: body.quantity ?? body.actualCount },
    });

    return jsonResponse({ ...result, success: true }, { message: 'Stock updated.' });
  } catch (error) {
    return jsonError(error.message || 'Stock operation failed.', 400);
  }
}
