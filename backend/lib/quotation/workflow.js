// Quotation workflow operations. Each transition writes an audit row and
// updates the corresponding timestamp. Conversion itself is delegated to the
// database RPC so the order, history and quotation status change atomically.
import { ApiError } from './errors.js';
import { assertQuotationTransition } from './status.js';
import { recordQuotationStatus } from './data.js';

export async function transitionQuotation({
  adminClient,
  quotation,
  newStatus,
  actorId,
  notes = null,
  metadata = null,
  updates = {},
}) {
  assertQuotationTransition(quotation.status, newStatus);

  const payload = {
    status: newStatus,
    updated_at: new Date().toISOString(),
    updated_by: actorId || null,
    ...updates,
  };

  const { data, error } = await adminClient
    .from('quotations')
    .update(payload)
    .eq('id', quotation.id)
    .select('*')
    .single();

  if (error) throw new ApiError('Failed to update quotation: ' + error.message, 500);

  await recordQuotationStatus({
    adminClient,
    quotationId: quotation.id,
    previousStatus: quotation.status,
    newStatus,
    actorId,
    notes,
    metadata,
  });

  return data;
}

export async function approveQuotation({ adminClient, quotation, actorId, notes }) {
  const now = new Date().toISOString();
  return transitionQuotation({
    adminClient,
    quotation,
    newStatus: 'approved',
    actorId,
    notes: notes || 'Quotation approved',
    updates: { approved_at: now, approved_by: actorId },
  });
}

export async function sendQuotation({ adminClient, quotation, actorId, notes }) {
  const now = new Date().toISOString();
  return transitionQuotation({
    adminClient,
    quotation,
    newStatus: 'sent',
    actorId,
    notes: notes || 'Quotation sent to customer',
    updates: { sent_at: now },
  });
}

export async function markQuotationViewed({ adminClient, quotation, actorId = null }) {
  if (quotation.status === 'viewed') return quotation;
  const now = new Date().toISOString();
  return transitionQuotation({
    adminClient,
    quotation,
    newStatus: 'viewed',
    actorId,
    notes: 'Quotation viewed by customer',
    updates: { viewed_at: now },
  });
}

export async function acceptQuotation({ adminClient, quotation, actorId, notes, customerUserId = null }) {
  const now = new Date().toISOString();
  return transitionQuotation({
    adminClient,
    quotation,
    newStatus: 'accepted',
    actorId,
    notes: notes || 'Quotation accepted by customer',
    updates: {
      accepted_at: now,
      customer_approved_at: now,
      customer_approved_by: customerUserId || actorId,
    },
  });
}

export async function rejectQuotation({ adminClient, quotation, actorId, reason }) {
  if (!reason || !String(reason).trim()) {
    throw new ApiError('A rejection reason is required.', 400);
  }
  const now = new Date().toISOString();
  return transitionQuotation({
    adminClient,
    quotation,
    newStatus: 'rejected',
    actorId,
    notes: reason,
    updates: {
      rejected_at: now,
      rejection_reason: String(reason).trim(),
    },
  });
}

export async function convertQuotationToOrder({ adminClient, quotationId, actorId }) {
  const { data, error } = await adminClient.rpc('convert_quotation_to_order', {
    p_quotation_id: quotationId,
    p_actor_id: actorId,
  });

  if (error) {
    throw new ApiError('Failed to convert quotation to order: ' + error.message, 409);
  }
  if (!data || !data.order) {
    throw new ApiError('Conversion completed without an order record.', 500);
  }
  return data;
}

export async function expireQuotations({ adminClient, actorId }) {
  const { data, error } = await adminClient.rpc('expire_quotations', {
    p_actor_id: actorId,
  });
  if (error) throw new ApiError('Failed to expire quotations: ' + error.message, 500);
  return Number(data) || 0;
}

export default {
  transitionQuotation,
  approveQuotation,
  sendQuotation,
  markQuotationViewed,
  acceptQuotation,
  rejectQuotation,
  convertQuotationToOrder,
  expireQuotations,
};
