import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireAdmin } from '@/lib/supabase/roles';
import { logActivity } from '@/lib/supabase/salesAuth';
import { normaliseProductPayload } from '@/lib/catalogue/validation';

export async function OPTIONS() {
  return handleOptions();
}

/** GET /api/v1/admin/catalogue/products */
export async function GET(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return jsonError(auth.error, auth.status);

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').trim();
    const category = searchParams.get('category') || '';

    let query = auth.adminClient
      .from('products')
      .select(`
        *,
        category:category_id ( id, name, code )
      `)
      .order('name', { ascending: true });

    if (category) query = query.eq('category_id', category);
    if (search) query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,brand.ilike.%${search}%`);

    const { data, error } = await query;
    if (error) return jsonError('Failed to load products: ' + error.message, 500);
    return jsonResponse({ products: data || [] });
  } catch (error) {
    return jsonError('Failed to load products: ' + error.message, 500);
  }
}

/** POST /api/v1/admin/catalogue/products */
export async function POST(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return jsonError(auth.error, auth.status);

    const body = await request.json();
    const payload = normaliseProductPayload(body, { partial: false });

    const { data, error } = await auth.adminClient
      .from('products')
      .insert(payload)
      .select(`
        *,
        category:category_id ( id, name, code )
      `)
      .single();

    if (error) {
      if (error.code === '23505') return jsonError('A product with that SKU already exists.', 409);
      return jsonError('Failed to create product: ' + error.message, 500);
    }

    await logActivity({
      actorId: auth.profile.id,
      action: 'PRODUCT_CREATED',
      entityType: 'product',
      entityId: data.id,
      metadata: { sku: data.sku, name: data.name, base_price: data.base_price },
    });

    return jsonResponse(data, { status: 201, message: 'Product created.' });
  } catch (error) {
    return jsonError(error.message || 'Failed to create product.', error.status || 500);
  }
}
