import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireWarehouseAccess, logWarehouseActivity } from '@/lib/supabase/warehouseAuth';
import { warehouseStore } from '@/lib/warehouse/warehouseStore';
import { PRODUCT_SELECT, toUiProduct, toDbProduct } from '@/lib/warehouse/productMapper';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/warehouse/products
 * Lists the product catalogue (database first, in-memory fallback for local development).
 */
export async function GET(request) {
  try {
    const authResult = await requireWarehouseAccess(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { adminClient } = authResult;
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || '';
    const status = searchParams.get('status') || '';
    const search = (searchParams.get('search') || '').toLowerCase();

    if (adminClient) {
      try {
        const { data: prods, error } = await adminClient
          .from('products')
          .select(PRODUCT_SELECT)
          .order('name', { ascending: true });

        if (!error && prods && prods.length > 0) {
          const products = prods
            .map(toUiProduct)
            .filter((r) => !category || category === 'all' || r.category === category || r.category_id === category)
            .filter((r) => !status || status === 'all' || r.status === status)
            .filter((r) => !search || `${r.name} ${r.sku} ${r.manufacturer}`.toLowerCase().includes(search));
          return jsonResponse({ products });
        }
      } catch (e) {
        // Fall back to the in-memory store
      }
    }

    const products = await warehouseStore.getProducts({ category, status, search });
    return jsonResponse({ products });
  } catch (error) {
    return jsonError('Failed to fetch products: ' + error.message, 500);
  }
}

/**
 * POST /api/v1/warehouse/products
 * Creates a product in the catalogue (the same table the quotation catalogue uses).
 */
export async function POST(request) {
  try {
    const authResult = await requireWarehouseAccess(request, { requireManage: true });
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile, adminClient } = authResult;
    const body = await request.json();

    if (!body.name || !body.sku) {
      return jsonError('Product name and SKU are required.', 400);
    }

    let product;

    if (adminClient) {
      const row = await toDbProduct(adminClient, body);
      const { data, error } = await adminClient
        .from('products')
        .insert(row)
        .select(PRODUCT_SELECT)
        .single();

      if (error) {
        const duplicate = /duplicate|unique/i.test(error.message || '');
        return jsonError(duplicate ? `A product with SKU "${row.sku}" already exists.` : 'Failed to create product: ' + error.message, duplicate ? 409 : 400);
      }
      product = toUiProduct(data);
    } else {
      product = await warehouseStore.createProduct(body, profile);
    }

    await logWarehouseActivity({
      actorId: profile.id,
      action: 'PRODUCT_CREATED',
      entityId: product.id,
      entityType: 'product',
      metadata: { sku: product.sku, name: product.name },
    });

    return jsonResponse(product, { message: 'Product created successfully.', status: 201 });
  } catch (error) {
    return jsonError('Failed to create product: ' + error.message, 500);
  }
}
