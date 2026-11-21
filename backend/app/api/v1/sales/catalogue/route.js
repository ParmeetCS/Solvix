import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireSalesOrAdmin } from '@/lib/supabase/salesAuth';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/sales/catalogue
 * Quotation-ready catalogue for Sales and Admins.
 *
 * Query params:
 *   search, system_type, capacity_kw, category, include_inactive
 */
export async function GET(request) {
  try {
    const authResult = await requireSalesOrAdmin(request);
    if (authResult.error) return jsonError(authResult.error, authResult.status);

    const { isAdmin, adminClient } = authResult;
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').trim();
    const systemType = searchParams.get('system_type') || '';
    const capacity = searchParams.get('capacity_kw') || '';
    const category = searchParams.get('category') || '';
    const includeInactive = isAdmin && searchParams.get('include_inactive') === 'true';

    let productQuery = adminClient
      .from('products')
      .select(`
        id, sku, name, description, unit, base_price, warranty_years,
        min_stock_level, is_active, tax_rate, system_types, item_type,
        is_quotable, hsn_code, brand, model_number, specifications,
        category_id,
        category:category_id ( id, name, code )
      `)
      .order('name', { ascending: true });

    if (!includeInactive) {
      productQuery = productQuery.eq('is_active', true).eq('is_quotable', true);
    }
    if (systemType && systemType !== 'all') {
      productQuery = productQuery.contains('system_types', [systemType]);
    }
    if (category) productQuery = productQuery.eq('category_id', category);
    if (search) {
      productQuery = productQuery.or(`name.ilike.%${search}%,sku.ilike.%${search}%,brand.ilike.%${search}%`);
    }

    let packageQuery = adminClient
      .from('product_packages')
      .select('*')
      .order('capacity_kw', { ascending: true })
      .order('system_type', { ascending: true });

    if (!includeInactive) packageQuery = packageQuery.eq('is_active', true);
    if (systemType && systemType !== 'all') packageQuery = packageQuery.eq('system_type', systemType);
    if (capacity) packageQuery = packageQuery.eq('capacity_kw', Number(capacity));

    const [categoriesRes, productsRes, packagesRes] = await Promise.all([
      adminClient.from('product_categories').select('*').order('name', { ascending: true }),
      productQuery,
      packageQuery,
    ]);

    if (categoriesRes.error) return jsonError('Failed to load categories: ' + categoriesRes.error.message, 500);
    if (productsRes.error) return jsonError('Failed to load products: ' + productsRes.error.message, 500);
    if (packagesRes.error) return jsonError('Failed to load packages: ' + packagesRes.error.message, 500);

    const packages = packagesRes.data || [];
    let packageItems = [];
    if (packages.length > 0) {
      const { data, error } = await adminClient
        .from('package_items')
        .select(`
          id, package_id, product_id, quantity, is_optional, notes,
          product:product_id ( id, sku, name, unit, base_price, tax_rate, item_type )
        `)
        .in('package_id', packages.map((pkg) => pkg.id));
      if (error) return jsonError('Failed to load package components: ' + error.message, 500);
      packageItems = data || [];
    }

    const itemsByPackage = packageItems.reduce((acc, item) => {
      acc[item.package_id] = acc[item.package_id] || [];
      acc[item.package_id].push(item);
      return acc;
    }, {});

    return jsonResponse({
      categories: categoriesRes.data || [],
      products: productsRes.data || [],
      packages: packages.map((pkg) => ({
        ...pkg,
        items: itemsByPackage[pkg.id] || [],
      })),
    });
  } catch (error) {
    return jsonError('Failed to load catalogue: ' + error.message, 500);
  }
}
