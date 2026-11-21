import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { loadStaffQuotation } from '@/lib/quotation/http';
import { logActivity } from '@/lib/supabase/salesAuth';

export async function OPTIONS() {
  return handleOptions();
}

/** GET /api/v1/sales/quotations/[id]/comments */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const loaded = await loadStaffQuotation(request, id);
    if (loaded.errorResponse) return loaded.errorResponse;

    const { data, error } = await loaded.auth.adminClient
      .from('quotation_comments')
      .select(`
        id, message, author_type, is_internal, created_at,
        author:author_profile_id ( id, full_name, email )
      `)
      .eq('quotation_id', id)
      .order('created_at', { ascending: true });

    if (error) return jsonError('Failed to load comments: ' + error.message, 500);
    return jsonResponse({ comments: data || [] });
  } catch (error) {
    return jsonError(error.message || 'Failed to load comments.', error.status || 500);
  }
}

/** POST /api/v1/sales/quotations/[id]/comments */
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const loaded = await loadStaffQuotation(request, id);
    if (loaded.errorResponse) return loaded.errorResponse;
    const { auth, quotation } = loaded;

    const body = await request.json().catch(() => ({}));
    const message = String(body.message || '').trim();
    if (!message) return jsonError('Comment message is required.', 400);
    if (message.length > 4000) return jsonError('Comment is too long (maximum 4000 characters).', 400);

    const { data, error } = await auth.adminClient
      .from('quotation_comments')
      .insert({
        quotation_id: id,
        author_profile_id: auth.profile.id,
        author_type: 'staff',
        message,
        is_internal: Boolean(body.is_internal),
      })
      .select(`
        id, message, author_type, is_internal, created_at,
        author:author_profile_id ( id, full_name, email )
      `)
      .single();

    if (error) return jsonError('Failed to add comment: ' + error.message, 500);

    await logActivity({
      actorId: auth.profile.id,
      action: 'QUOTATION_COMMENT_ADDED',
      entityType: 'quotation',
      entityId: id,
      metadata: { quotation_code: quotation.quotation_code, is_internal: Boolean(body.is_internal) },
    });

    return jsonResponse(data, { status: 201, message: 'Comment added.' });
  } catch (error) {
    return jsonError(error.message || 'Failed to add comment.', error.status || 500);
  }
}
