import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireAdmin } from '@/lib/supabase/roles';
import { logActivity } from '@/lib/supabase/salesAuth';
import { normalisePackagePayload } from '@/lib/catalogue/validation';

export async function OPTIONS() {
  return handleOptions();
}

async function loadPackages(adminClient, packageId = null) {
  let query = adminClient
    .from('product_packages')
    .select('*')
    .order('capacity_kw', { ascending: true })
    .order('system_type', { ascending: true });
  if (packageId) query = query.eq('id', packageId);

  const { data: packages, error } = await query;
  if (error) throw new Error(error.message);

  const list = packages || [];
  if (list.length === 0) return [];

  const { data: items, error: itemsError } = await adminClient
    .from('package_items')
    .select(`
      id, package_id, product_id, quantity, is_optional, notes,
      product:product_id ( id, sku, name, unit, base_price, tax_rate, item_type, is_active )
    `)
    .in('package_id', list.map((pkg) => pkg.id));
  if (itemsError) throw new Error(itemsError.message);

  const byPackage = (items || []).reduce((acc, item) => {
    acc[item.package_id] = acc[item.package_id] || [];
    acc[item.package_id].push(item);
    return acc;
  }, {});

  return list.map((pkg) => ({ ...pkg, items: byPackage[pkg.id] || [] }));
}

/** GET /api/v1/admin/catalogue/packages */
export async function GET(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return jsonError(auth.error, auth.status);
    const packages = await loadPackages(auth.adminClient);
    return jsonResponse({ packages });
  } catch (error) {
    return jsonError('Failed to load packages: ' + error.message, 500);
  }
}

/** POST /api/v1/admin/catalogue/packages */
export async function POST(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return jsonError(auth.error, auth.status);
    const body = await request.json();
    const payload = normalisePackagePayload(body);

    const { data, error } = await auth.adminClient.rpc('save_product_package', {
      p_package_id: null,
      p_package_code: payload.package_code,
      p_name: payload.name,
      p_system_type: payload.system_type,
      p_capacity_kw: payload.capacity_kw,
      p_description: payload.description,
      p_tax_rate: payload.tax_rate,
      p_warranty_terms: payload.warranty_terms,
      p_is_active: payload.is_active,
      p_items: payload.items,
      p_actor_id: auth.profile.id,
    });

    if (error) {
      if (error.code === '23505') return jsonError('A package with that code already exists.', 409);
      return jsonError('Failed to create package: ' + error.message, 500);
    }

    await logActivity({
      actorId: auth.profile.id,
      action: 'PRODUCT_PACKAGE_CREATED',
      entityType: 'product_package',
      entityId: data?.package?.id,
      metadata: { package_code: payload.package_code, capacity_kw: payload.capacity_kw },
    });

    return jsonResponse(data, { status: 201, message: 'Package created.' });
  } catch (error) {
    return jsonError(error.message || 'Failed to create package.', error.status || 500);
  }
}
