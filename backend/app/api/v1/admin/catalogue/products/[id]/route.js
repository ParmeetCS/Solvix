import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireAdmin } from '@/lib/supabase/roles';
import { logActivity } from '@/lib/supabase/salesAuth';
import { normaliseProductPayload } from '@/lib/catalogue/validation';

export async function OPTIONS() {
  return handleOptions();
}

/** PATCH /api/v1/admin/catalogue/products/[id] */
export async function PATCH(request, { params }) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return jsonError(auth.error, auth.status);
    const { id } = await params;
    const body = await request.json();
    const payload = normaliseProductPayload(body, { partial: true });

    const { data, error } = await auth.adminClient
      .from('products')
      .update(payload)
      .eq('id', id)
      .select(`
        *,
        category:category_id ( id, name, code )
      `)
      .single();

    if (error) {
      if (error.code === '23505') return jsonError('A product with that SKU already exists.', 409);
      return jsonError('Failed to update product: ' + error.message, 500);
    }

    await logActivity({
      actorId: auth.profile.id,
      action: 'PRODUCT_UPDATED',
      entityType: 'product',
      entityId: id,
      metadata: { updated_fields: Object.keys(body), sku: data.sku },
    });

    return jsonResponse(data, { message: 'Product updated.' });
  } catch (error) {
    return jsonError(error.message || 'Failed to update product.', error.status || 500);
  }
}

/** DELETE /api/v1/admin/catalogue/products/[id] — soft delete to preserve history. */
export async function DELETE(request, { params }) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return jsonError(auth.error, auth.status);
    const { id } = await params;

    const { data, error } = await auth.adminClient
      .from('products')
      .update({ is_active: false, is_quotable: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, sku, name, is_active, is_quotable')
      .single();

    if (error) return jsonError('Failed to archive product: ' + error.message, 500);

    await logActivity({
      actorId: auth.profile.id,
      action: 'PRODUCT_ARCHIVED',
      entityType: 'product',
      entityId: id,
      metadata: { sku: data.sku },
    });

    return jsonResponse(data, { message: 'Product archived. Existing quotations keep their historical lines.' });
  } catch (error) {
    return jsonError('Failed to archive product: ' + error.message, 500);
  }
}
