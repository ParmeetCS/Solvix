import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireFinanceOrAdmin, logFinanceActivity } from '@/lib/supabase/financeAuth';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * PATCH /api/v1/finance/expenses/[id]
 * Approves or rejects an expense.
 */
export async function PATCH(request, { params }) {
  try {
    const authResult = await requireFinanceOrAdmin(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile, adminClient } = authResult;
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const { status, review_notes = '' } = body; // 'approved' | 'rejected'

    if (!status || !['approved', 'rejected'].includes(status)) {
      return jsonError('status must be "approved" or "rejected".', 400);
    }

    const { data: existing, error: fetchErr } = await adminClient
      .from('expenses')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) {
      return jsonError('Expense record not found.', 404);
    }

    // Replace [STATUS:...] in description
    let clean = (existing.description || '').replace(/\[STATUS:[^\]]+\]/g, '').trim();
    const updatedDesc = `[STATUS:${status.toUpperCase()}] ${clean} ${review_notes ? `(Review: ${review_notes})` : ''}`;

    const { data: updated, error: updateErr } = await adminClient
      .from('expenses')
      .update({
        description: updatedDesc,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single();

    if (updateErr) {
      return jsonError('Failed to update expense status: ' + updateErr.message, 500);
    }

    await logFinanceActivity({
      actorId: profile.id,
      action: status === 'approved' ? 'EXPENSE_APPROVED' : 'EXPENSE_REJECTED',
      entityType: 'expense',
      entityId: id,
      metadata: { expense_code: existing.expense_code, status }
    });

    return jsonResponse(updated, { message: `Expense ${existing.expense_code} ${status} successfully.` });
  } catch (error) {
    return jsonError('Server error: ' + error.message, 500);
  }
}
