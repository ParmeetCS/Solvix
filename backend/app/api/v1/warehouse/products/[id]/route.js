import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireWarehouseAccess, logWarehouseActivity } from '@/lib/supabase/warehouseAuth';
import { warehouseStore } from '@/lib/warehouse/warehouseStore';
import { PRODUCT_SELECT, toUiProduct, toDbProduct } from '@/lib/warehouse/productMapper';

export async function OPTIONS() {
  return handleOptions();
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/v1/warehouse/products/[id]
 * Product details (database first) with stock across warehouses.
 */
export async function GET(request, { params }) {
  try {
    const { id } = (await params) || {};
    const authResult = await requireWarehouseAccess(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { adminClient } = authResult;
    if (adminClient && UUID.test(id || '')) {
      const { data: row } = await adminClient.from('products').select(PRODUCT_SELECT).eq('id', id).maybeSingle();
      if (row) {
        const product = toUiProduct(row);
        const { data: inv } = await adminClient
          .from('inventory')
          .select('id, warehouse_id, quantity_on_hand, quantity_reserved, warehouse:warehouse_id ( id, name, code )')
          .eq('product_id', id);
        const { data: serials } = await adminClient
          .from('equipment_serial_numbers')
          .select('id, serial_number, status, current_location')
          .eq('product_id', id)
          .limit(50);
        return jsonResponse({
          ...product,
          product,
          inventory: (inv || []).map((i) => ({
            ...i,
            warehouse_name: i.warehouse?.name || 'Warehouse',
            available_stock: Number(i.quantity_on_hand) - Number(i.quantity_reserved),
          })),
          serials: serials || [],
          movements: [],
        });
      }
    }

    const data = await warehouseStore.getProductById(id);
    if (!data) {
      return jsonError('Product not found.', 404);
    }

    return jsonResponse(data);
  } catch (error) {
    return jsonError('Failed to fetch product details: ' + error.message, 500);
  }
}

/**
 * PATCH /api/v1/warehouse/products/[id]
 * Update product specifications, prices, or status.
 */
export async function PATCH(request, { params }) {
  try {
    const { id } = (await params) || {};
    const authResult = await requireWarehouseAccess(request, { requireManage: true });
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile, adminClient } = authResult;
    const body = await request.json();

    let updated = null;

    if (adminClient && UUID.test(id || '')) {
      const { data: existing } = await adminClient.from('products').select('id, specifications').eq('id', id).maybeSingle();
      if (existing) {
        const row = await toDbProduct(adminClient, body);
        // keep the details already stored in specifications
        row.specifications = { ...(existing.specifications || {}), ...(row.specifications || {}) };
        const { data, error } = await adminClient
          .from('products')
          .update(row)
          .eq('id', id)
          .select(PRODUCT_SELECT)
          .single();
        if (error) {
          const duplicate = /duplicate|unique/i.test(error.message || '');
          return jsonError(duplicate ? 'Another product already uses that SKU.' : 'Failed to update product: ' + error.message, duplicate ? 409 : 400);
        }
        updated = toUiProduct(data);
      }
    }

    if (!updated) {
      updated = await warehouseStore.updateProduct(id, body, profile);
    }
    if (!updated) {
      return jsonError('Product not found.', 404);
    }

    await logWarehouseActivity({
      actorId: profile.id,
      action: 'PRODUCT_UPDATED',
      entityId: id,
      entityType: 'product',
      metadata: { updates: Object.keys(body) },
    });

    return jsonResponse(updated, { message: 'Product updated successfully.' });
  } catch (error) {
    return jsonError('Failed to update product: ' + error.message, 500);
  }
}
