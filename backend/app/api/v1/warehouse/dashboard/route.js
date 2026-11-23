import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireWarehouseAccess } from '@/lib/supabase/warehouseAuth';

export async function OPTIONS() {
  return handleOptions();
}

const DEFAULT_THRESHOLD = 5;

/**
 * GET /api/v1/warehouse/dashboard
 * Warehouse figures, low-stock alerts, recent stock movements and the warehouse list, all from the database.
 */
export async function GET(request) {
  try {
    const authResult = await requireWarehouseAccess(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }
    const db = authResult.adminClient;

    const [prodRes, invRes, poRes, dispRes, snRes, whRes, packRes, movRes] = await Promise.all([
      db.from('products').select('id, name, sku, min_stock_level').eq('is_active', true),
      db.from('inventory').select('product_id, warehouse_id, quantity_on_hand, quantity_reserved'),
      db.from('purchase_orders').select('id', { count: 'exact', head: true }).in('status', ['approved', 'partially_received']),
      db.from('dispatches').select('id', { count: 'exact', head: true }).in('status', ['prepared', 'in_transit']),
      db.from('equipment_serial_numbers').select('id', { count: 'exact', head: true }),
      db.from('warehouses').select('id, name, code, city, is_active').eq('is_active', true).order('name', { ascending: true }),
      db.from('orders').select('id', { count: 'exact', head: true }).in('status', ['confirmed', 'processing', 'awaiting_dispatch']),
      db.from('stock_movements')
        .select('id, product_id, warehouse_id, movement_type, quantity, reference_type, reference_id, notes, created_at, product:product_id ( name, sku ), warehouse:warehouse_id ( name )')
        .order('created_at', { ascending: false })
        .limit(8),
    ]);
    const failed = [prodRes, invRes, whRes, movRes].find((r) => r.error);
    if (failed) return jsonError('Failed to fetch warehouse dashboard: ' + failed.error.message, 500);

    // A new installation has no warehouse yet: create a default one so stock can be received.
    let warehouses = whRes.data || [];
    if (warehouses.length === 0) {
      const { data: created } = await db
        .from('warehouses')
        .insert({ name: 'Main Warehouse', code: 'WH-MAIN', city: 'Head office', is_active: true })
        .select('id, name, code, city, is_active')
        .single();
      if (created) warehouses = [created];
    }

    // Stock per product across all warehouses
    const products = prodRes.data || [];
    const perProduct = new Map(products.map((p) => [p.id, { onHand: 0, reserved: 0 }]));
    for (const row of invRes.data || []) {
      const t = perProduct.get(row.product_id);
      if (!t) continue;
      t.onHand += Number(row.quantity_on_hand) || 0;
      t.reserved += Number(row.quantity_reserved) || 0;
    }
    const totalStock = [...perProduct.values()].reduce((sum, t) => sum + t.onHand, 0);
    const alerts = [];
    let outOfStock = 0;
    for (const p of products) {
      const t = perProduct.get(p.id);
      const available = t.onHand - t.reserved;
      const threshold = Number(p.min_stock_level) || DEFAULT_THRESHOLD;
      if (t.onHand <= 0) outOfStock += 1;
      if (available <= threshold) {
        alerts.push({ product_id: p.id, product_name: p.name, sku: p.sku, quantity_available: available, min_threshold: threshold });
      }
    }
    alerts.sort((a, b) => a.quantity_available - b.quantity_available);

    const movements = (movRes.data || []).map((m) => ({
      ...m,
      product_name: m.product?.name || null,
      product_sku: m.product?.sku || null,
      warehouse_name: m.warehouse?.name || null,
    }));
    const pendingPacking = packRes.count || 0;
    const pendingDispatches = dispRes.count || 0;
    const serials = snRes.count || 0;

    return jsonResponse({
      kpis: {
        totalProducts: products.length,
        total_products: products.length,
        totalStockQuantity: totalStock,
        total_stock_quantity: totalStock,
        lowStockProducts: alerts.length,
        low_stock_products: alerts.length,
        outOfStockProducts: outOfStock,
        out_of_stock_products: outOfStock,
        pendingPacking,
        pending_packing: pendingPacking,
        pendingDispatches,
        pending_dispatches: pendingDispatches,
        pendingPurchaseOrders: poRes.count || 0,
        totalSerialNumbers: serials,
        registered_serials: serials,
        recentMovementsCount: movements.length,
        recent_movements_count: movements.length,
      },
      lowStockAlerts: alerts.slice(0, 10),
      low_stock_alerts: alerts.slice(0, 10),
      recentMovements: movements,
      recent_movements: movements,
      warehouses,
    });
  } catch (error) {
    return jsonError('Failed to fetch warehouse dashboard: ' + error.message, 500);
  }
}
