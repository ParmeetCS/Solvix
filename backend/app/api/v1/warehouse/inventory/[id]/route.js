import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireWarehouseAccess } from '@/lib/supabase/warehouseAuth';

export async function OPTIONS() {
  return handleOptions();
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/v1/warehouse/inventory/[id]
 * One stock record (an inventory row id, or `new-<productId>` for a product with no stock yet)
 * plus its recent stock movements. Stock changes are made with POST /warehouse/inventory.
 */
export async function GET(request, { params }) {
  try {
    const authResult = await requireWarehouseAccess(request);
    if (authResult.error) return jsonError(authResult.error, authResult.status);
    const { id } = (await params) || {};
    const db = authResult.adminClient;

    {
      let invRow = null;
      let productId = null;
      let warehouseId = null;

      if (id.startsWith('new-')) {
        productId = id.slice(4);
      } else if (UUID.test(id)) {
        const { data } = await db.from('inventory').select('*').eq('id', id).maybeSingle();
        invRow = data;
        productId = data?.product_id;
        warehouseId = data?.warehouse_id;
      }

      if (UUID.test(productId || '')) {
        const [{ data: product }, whRes] = await Promise.all([
          db.from('products').select('id, sku, name, min_stock_level, category:category_id ( name )').eq('id', productId).maybeSingle(),
          warehouseId
            ? db.from('warehouses').select('id, name, code').eq('id', warehouseId).maybeSingle()
            : db.from('warehouses').select('id, name, code').eq('is_active', true).order('name').limit(1).maybeSingle(),
        ]);
        if (product) {
          const warehouse = whRes?.data || null;
          const onHand = Number(invRow?.quantity_on_hand) || 0;
          const reserved = Number(invRow?.quantity_reserved) || 0;
          const threshold = Number(product.min_stock_level) || 5;
          let mq = db.from('stock_movements').select('*').eq('product_id', productId).order('created_at', { ascending: false }).limit(50);
          if (warehouse?.id) mq = mq.eq('warehouse_id', warehouse.id);
          const { data: movements } = await mq;
          return jsonResponse({
            inventory: {
              ...(invRow || { id, product_id: productId, warehouse_id: warehouse?.id || null }),
              quantity_on_hand: onHand,
              quantity_reserved: reserved,
              quantity_available: onHand - reserved,
              min_stock_threshold: threshold,
              is_low_stock: onHand - reserved <= threshold,
              product: { id: product.id, name: product.name, sku: product.sku, category_name: product.category?.name || 'General' },
              warehouse,
            },
            movements: movements || [],
          });
        }
      }
    }

    return jsonError('Inventory record not found.', 404);
  } catch (error) {
    return jsonError('Failed to load inventory record: ' + error.message, 500);
  }
}
