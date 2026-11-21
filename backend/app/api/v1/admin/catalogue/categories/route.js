import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireAdmin } from '@/lib/supabase/roles';
import { logActivity } from '@/lib/supabase/salesAuth';

export async function OPTIONS() {
  return handleOptions();
}

function normaliseCode(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/** GET /api/v1/admin/catalogue/categories */
export async function GET(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return jsonError(auth.error, auth.status);

    const { data, error } = await auth.adminClient
      .from('product_categories')
      .select('*, products:products(count)')
      .order('name', { ascending: true });

    if (error) return jsonError('Failed to load categories: ' + error.message, 500);
    return jsonResponse({ categories: data || [] });
  } catch (error) {
    return jsonError('Failed to load categories: ' + error.message, 500);
  }
}

/** POST /api/v1/admin/catalogue/categories */
export async function POST(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return jsonError(auth.error, auth.status);

    const body = await request.json();
    const name = String(body.name || '').trim();
    const code = normaliseCode(body.code || name);
    if (!name || !code) return jsonError('Category name is required.', 400);

    const { data, error } = await auth.adminClient
      .from('product_categories')
      .insert({
        name,
        code,
        description: body.description || null,
      })
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') return jsonError('A category with that name or code already exists.', 409);
      return jsonError('Failed to create category: ' + error.message, 500);
    }

    await logActivity({
      actorId: auth.profile.id,
      action: 'PRODUCT_CATEGORY_CREATED',
      entityType: 'product_category',
      entityId: data.id,
      metadata: { name, code },
    });

    return jsonResponse(data, { status: 201, message: 'Category created.' });
  } catch (error) {
    return jsonError('Failed to create category: ' + error.message, 500);
  }
}
