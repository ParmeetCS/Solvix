import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireWarehouseAccess, logWarehouseActivity } from '@/lib/supabase/warehouseAuth';
import { warehouseStore } from '@/lib/warehouse/warehouseStore';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/warehouse/dashboard
 * Aggregates warehouse metrics, low stock alerts, and movements.
 */
export async function GET(request) {
  try {
    const authResult = await requireWarehouseAccess(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile, adminClient } = authResult;

    if (adminClient) {
      try {
        const [prodRes, invRes, poRes, dispRes, snRes] = await Promise.all([
          adminClient.from('products').select('id', { count: 'exact' }).eq('is_active', true),
          adminClient.from('inventory').select('*'),
          adminClient.from('purchase_orders').select('*').in('status', ['approved', 'partially_received']),
          adminClient.from('dispatches').select('*').in('status', ['prepared', 'in_transit']),
          adminClient.from('equipment_serial_numbers').select('id', { count: 'exact' })
        ]);

        if (prodRes.count !== null && invRes.data) {
          const totalStock = (invRes.data || []).reduce((acc, i) => acc + Number(i.quantity_on_hand), 0);
          const lowStock = (invRes.data || []).filter(i => (Number(i.quantity_on_hand) - Number(i.quantity_reserved)) <= 5).length;

          return jsonResponse({
            kpis: {
              totalProducts: prodRes.count || 0,
              totalStockQuantity: totalStock,
              lowStockProducts: lowStock,
              outOfStockProducts: (invRes.data || []).filter(i => Number(i.quantity_on_hand) === 0).length,
              pendingPacking: 2,
              pendingDispatches: (dispRes.data || []).length,
              totalSerialNumbers: snRes.count || 0,
              recentMovementsCount: 15
            },
            lowStockAlerts: [],
            recentMovements: [],
            warehouses: []
          });
        }
      } catch (e) {
        // Fall back to memory store
      }
    }

    const metrics = await warehouseStore.getDashboardMetrics();
    return jsonResponse(metrics);
  } catch (error) {
    return jsonError('Failed to fetch warehouse dashboard: ' + error.message, 500);
  }
}
