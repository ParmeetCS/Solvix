import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { loadCustomerQuotation } from '@/lib/quotation/http';
import { logActivity } from '@/lib/supabase/salesAuth';

export async function OPTIONS() {
  return handleOptions();
}

/** GET /api/v1/customer/quotations/[id]/comments — public thread only. */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const loaded = await loadCustomerQuotation(request, id);
    if (loaded.errorResponse) return loaded.errorResponse;

    const { data, error } = await loaded.auth.adminClient
      .from('quotation_comments')
      .select(`
        id, message, author_type, created_at,
        author:author_profile_id ( id, full_name )
      `)
      .eq('quotation_id', id)
      .eq('is_internal', false)
      .order('created_at', { ascending: true });

    if (error) return jsonError('Failed to load comments: ' + error.message, 500);
    return jsonResponse({ comments: data || [] });
  } catch (error) {
    return jsonError(error.message || 'Failed to load comments.', error.status || 500);
  }
}

/** POST /api/v1/customer/quotations/[id]/comments */
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const loaded = await loadCustomerQuotation(request, id);
    if (loaded.errorResponse) return loaded.errorResponse;
    const { auth, quotation } = loaded;

    const body = await request.json().catch(() => ({}));
    const message = String(body.message || '').trim();
    if (!message) return jsonError('Please enter a question or comment.', 400);
    if (message.length > 4000) return jsonError('Comment is too long (maximum 4000 characters).', 400);

    const { data, error } = await auth.adminClient
      .from('quotation_comments')
      .insert({
        quotation_id: id,
        author_profile_id: auth.profile.id,
        author_type: 'customer',
        message,
        is_internal: false,
      })
      .select(`
        id, message, author_type, created_at,
        author:author_profile_id ( id, full_name )
      `)
      .single();

    if (error) return jsonError('Failed to add comment: ' + error.message, 500);

    await logActivity({
      actorId: auth.profile.id,
      action: 'CUSTOMER_QUOTATION_COMMENT_ADDED',
      entityType: 'quotation',
      entityId: id,
      metadata: { quotation_code: quotation.quotation_code, customer_id: auth.customer.id },
    });

    return jsonResponse(data, { status: 201, message: 'Question submitted.' });
  } catch (error) {
    return jsonError(error.message || 'Failed to add comment.', error.status || 500);
  }
}
