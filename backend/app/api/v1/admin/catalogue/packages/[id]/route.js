import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireAdmin } from '@/lib/supabase/roles';
import { logActivity } from '@/lib/supabase/salesAuth';
import { normalisePackagePayload } from '@/lib/catalogue/validation';

export async function OPTIONS() {
  return handleOptions();
}

/** PATCH /api/v1/admin/catalogue/packages/[id] */
export async function PATCH(request, { params }) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return jsonError(auth.error, auth.status);
    const { id } = await params;
    const body = await request.json();
    const payload = normalisePackagePayload(body);

    const { data, error } = await auth.adminClient.rpc('save_product_package', {
      p_package_id: id,
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
      return jsonError('Failed to update package: ' + error.message, 500);
    }

    await logActivity({
      actorId: auth.profile.id,
      action: 'PRODUCT_PACKAGE_UPDATED',
      entityType: 'product_package',
      entityId: id,
      metadata: { package_code: payload.package_code },
    });

    return jsonResponse(data, { message: 'Package updated.' });
  } catch (error) {
    return jsonError(error.message || 'Failed to update package.', error.status || 500);
  }
}

/** DELETE /api/v1/admin/catalogue/packages/[id] — archive, never delete history. */
export async function DELETE(request, { params }) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return jsonError(auth.error, auth.status);
    const { id } = await params;

    const { data, error } = await auth.adminClient
      .from('product_packages')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, package_code, name, is_active')
      .single();

    if (error) return jsonError('Failed to archive package: ' + error.message, 500);

    await logActivity({
      actorId: auth.profile.id,
      action: 'PRODUCT_PACKAGE_ARCHIVED',
      entityType: 'product_package',
      entityId: id,
      metadata: { package_code: data.package_code },
    });

    return jsonResponse(data, { message: 'Package archived.' });
  } catch (error) {
    return jsonError('Failed to archive package: ' + error.message, 500);
  }
}
