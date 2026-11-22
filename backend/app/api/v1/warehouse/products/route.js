import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireWarehouseAccess, logWarehouseActivity } from '@/lib/supabase/warehouseAuth';
import { warehouseStore } from '@/lib/warehouse/warehouseStore';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/warehouse/products
 * List products with category, stock levels, and search.
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
    const search = searchParams.get('search') || '';

    if (adminClient) {
      try {
        let query = adminClient
          .from('products')
          .select(`
            *,
            category:category_id ( id, name, code )
          `)
          .order('name', { ascending: true });

        if (search) query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,manufacturer.ilike.%${search}%`);

        const { data: prods, error } = await query;
        if (!error && prods && prods.length > 0) {
          // The pages expect flat, memory-store style fields (category as text, status, prices).
          const SERIAL_CATEGORIES = ['solar_panels', 'solar_inverters', 'batteries'];
          const products = prods
            .map((r) => ({
              ...r,
              category_id: r.category?.id ?? r.category_id ?? null,
              category_name: r.category?.name || 'General',
              category: r.category?.code || (typeof r.category === 'string' ? r.category : ''),
              manufacturer: r.manufacturer || r.brand || '',
              purchase_price: Number(r.purchase_price ?? r.base_price ?? 0),
              selling_price: Number(r.selling_price ?? r.base_price ?? 0),
              status: r.status || (r.is_active === false ? 'inactive' : 'active'),
              min_stock_threshold: Number(r.min_stock_threshold ?? r.min_stock_level ?? 0),
              requires_serial_number: r.requires_serial_number ?? SERIAL_CATEGORIES.includes(r.category?.code),
              warranty_months: r.warranty_months ?? Number(r.warranty_years || 0) * 12,
            }))
            .filter((r) => (!category || category === 'all' || r.category === category || r.category_id === category)
              && (status === '' || status === 'all' || r.status === status));
          return jsonResponse({ products });
        }
      } catch (e) {
        // Fall back
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
 * Create a new product in the catalogue.
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
      try {
        const { data, error } = await adminClient
          .from('products')
          .insert({
            sku: body.sku.toUpperCase(),
            name: body.name,
            category_id: body.category_id || null,
            manufacturer: body.manufacturer || '',
            description: body.description || '',
            unit: body.unit || 'piece',
            purchase_price: body.purchase_price ? parseFloat(body.purchase_price) : 0,
            selling_price: body.selling_price ? parseFloat(body.selling_price) : 0,
            base_price: body.selling_price ? parseFloat(body.selling_price) : 0,
            min_stock_level: body.min_stock_level ? parseFloat(body.min_stock_level) : 5,
            warranty_years: body.warranty_years ? parseInt(body.warranty_years) : 5,
            status: body.status || 'active'
          })
          .select('*')
          .single();

        if (!error && data) {
          product = data;
        }
      } catch (e) {
        // Fall back
      }
    }

    if (!product) {
      product = await warehouseStore.createProduct(body, profile);
    }

    await logWarehouseActivity({
      actorId: profile.id,
      action: 'PRODUCT_CREATED',
      entityId: product.id,
      entityType: 'product',
      metadata: { sku: product.sku, name: product.name }
    });

    return jsonResponse(product, { message: 'Product created successfully.', status: 201 });
  } catch (error) {
    return jsonError('Failed to create product: ' + error.message, 500);
  }
}
