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

/** PATCH /api/v1/admin/catalogue/categories/[id] */
export async function PATCH(request, { params }) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return jsonError(auth.error, auth.status);
    const { id } = await params;
    const body = await request.json();

    const update = {};
    if (body.name !== undefined) update.name = String(body.name).trim();
    if (body.code !== undefined) update.code = normaliseCode(body.code);
    if (body.description !== undefined) update.description = body.description || null;
    update.updated_at = new Date().toISOString();

    if (update.name === '') return jsonError('Category name cannot be empty.', 400);

    const { data, error } = await auth.adminClient
      .from('product_categories')
      .update(update)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') return jsonError('A category with that name or code already exists.', 409);
      return jsonError('Failed to update category: ' + error.message, 500);
    }

    await logActivity({
      actorId: auth.profile.id,
      action: 'PRODUCT_CATEGORY_UPDATED',
      entityType: 'product_category',
      entityId: id,
      metadata: { updated_fields: Object.keys(body) },
    });

    return jsonResponse(data, { message: 'Category updated.' });
  } catch (error) {
    return jsonError('Failed to update category: ' + error.message, 500);
  }
}

/** DELETE /api/v1/admin/catalogue/categories/[id] */
export async function DELETE(request, { params }) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return jsonError(auth.error, auth.status);
    const { id } = await params;

    const { count, error: countError } = await auth.adminClient
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', id);

    if (countError) return jsonError('Failed to check category usage: ' + countError.message, 500);
    if ((count || 0) > 0) {
      return jsonError('This category is in use. Reassign its products before deleting it.', 409);
    }

    const { error } = await auth.adminClient.from('product_categories').delete().eq('id', id);
    if (error) return jsonError('Failed to delete category: ' + error.message, 500);

    await logActivity({
      actorId: auth.profile.id,
      action: 'PRODUCT_CATEGORY_DELETED',
      entityType: 'product_category',
      entityId: id,
    });

    return jsonResponse({ id }, { message: 'Category deleted.' });
  } catch (error) {
    return jsonError('Failed to delete category: ' + error.message, 500);
  }
}
