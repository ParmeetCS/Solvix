// Data access helpers for quotations, orders and their related records.
import { ApiError } from './errors.js';

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value);
}

export function assertUuid(value, fieldName = 'id') {
  if (!isUuid(value)) throw new ApiError(`${fieldName} must be a valid UUID.`, 400);
  return value;
}

export function normaliseDate(value, fieldName = 'date') {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(`${fieldName} must be a valid date.`, 400);
  }
  return date.toISOString().slice(0, 10);
}

// Statuses a customer is allowed to see. Drafts and quotations still in
// internal review must never be exposed through the customer portal.
export const CUSTOMER_VISIBLE_QUOTATION_STATUSES = Object.freeze([
  'sent',
  'viewed',
  'accepted',
  'rejected',
  'expired',
  'converted_to_order',
]);

export function isCustomerVisibleQuotation(quotation) {
  return Boolean(
    quotation && CUSTOMER_VISIBLE_QUOTATION_STATUSES.includes(quotation.status)
  );
}

export function assertSalesAccess(quotation, profile, isAdmin) {
  if (!quotation) throw new ApiError('Quotation not found.', 404);
  if (isAdmin) return true;
  if (quotation.created_by && quotation.created_by === profile.id) return true;
  throw new ApiError('Access denied to this quotation.', 403);
}

export function assertCustomerAccess(quotation, customer) {
  if (!quotation) throw new ApiError('Quotation not found.', 404);
  if (!customer || quotation.customer_id !== customer.id) {
    throw new ApiError('Access denied to this quotation.', 403);
  }
  return true;
}

export function assertOrderAccess(order, profile, isAdmin) {
  if (!order) throw new ApiError('Order not found.', 404);
  if (isAdmin) return true;
  if (order.created_by && order.created_by === profile.id) return true;
  throw new ApiError('Access denied to this order.', 403);
}

export function assertCustomerOrderAccess(order, customer) {
  if (!order) throw new ApiError('Order not found.', 404);
  if (!customer || order.customer_id !== customer.id) {
    throw new ApiError('Access denied to this order.', 403);
  }
  return true;
}

export async function getCustomerAddress(adminClient, customerId) {
  const { data } = await adminClient
    .from('customer_addresses')
    .select('*')
    .eq('customer_id', customerId)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  return data || null;
}

export function formatAddress(address) {
  if (!address) return '';
  return [
    address.street,
    address.city,
    address.state,
    address.postal_code,
    address.country,
  ]
    .filter(Boolean)
    .join(', ');
}

export async function getApprovedSurvey(adminClient, surveyId) {
  if (!surveyId) return null;
  assertUuid(surveyId, 'site_survey_id');

  const { data: survey, error } = await adminClient
    .from('site_surveys')
    .select('*')
    .eq('id', surveyId)
    .maybeSingle();

  if (error) throw new ApiError('Failed to load site survey: ' + error.message, 500);
  if (!survey) throw new ApiError('Site survey not found.', 404);

  const { data: approvals } = await adminClient
    .from('survey_approvals')
    .select('id, status, reviewed_at, comments')
    .eq('survey_id', surveyId)
    .order('created_at', { ascending: false });

  const hasApproval = (approvals || []).some((row) => row.status === 'approved');
  const approved = survey.feasibility_status === 'approved' || hasApproval;

  return { survey, approvals: approvals || [], approved };
}

export async function assertApprovedSurveyForQuotation({
  adminClient,
  surveyId,
  leadId,
  customerId,
}) {
  const result = await getApprovedSurvey(adminClient, surveyId);
  if (!result) return null;

  const { survey, approved } = result;
  if (!approved) {
    throw new ApiError(
      'The selected site survey is not approved. A quotation can only reference an approved survey.',
      400
    );
  }
  if (survey.lead_id && survey.lead_id !== leadId) {
    throw new ApiError('The selected site survey does not belong to the selected lead.', 400);
  }
  if (survey.customer_id && survey.customer_id !== customerId) {
    throw new ApiError('The selected site survey does not belong to the selected customer.', 400);
  }

  return survey;
}

export async function getQuotationBundle(adminClient, quotationId, { includeInternal = true } = {}) {
  const { data: quotation, error } = await adminClient
    .from('quotations')
    .select('*')
    .eq('id', quotationId)
    .maybeSingle();

  if (error) throw new ApiError('Failed to load quotation: ' + error.message, 500);
  if (!quotation) throw new ApiError('Quotation not found.', 404);

  const [itemsRes, historyRes, commentsRes, customerRes, leadRes, surveyRes, orderRes, packageRes] =
    await Promise.all([
      adminClient
        .from('quotation_items')
        .select('*')
        .eq('quotation_id', quotationId)
        .order('sort_order', { ascending: true }),
      adminClient
        .from('quotation_status_history')
        .select(`
          id, previous_status, new_status, changed_at, notes, metadata,
          changed_by_profile:changed_by ( id, full_name, email )
        `)
        .eq('quotation_id', quotationId)
        .order('changed_at', { ascending: true }),
      (() => {
        let q = adminClient
          .from('quotation_comments')
          .select(`
            id, message, author_type, is_internal, created_at,
            author:author_profile_id ( id, full_name, email )
          `)
          .eq('quotation_id', quotationId)
          .order('created_at', { ascending: true });
        if (!includeInternal) q = q.eq('is_internal', false);
        return q;
      })(),
      adminClient.from('customers').select('*').eq('id', quotation.customer_id).maybeSingle(),
      quotation.lead_id
        ? adminClient.from('leads').select('*').eq('id', quotation.lead_id).maybeSingle()
        : Promise.resolve({ data: null }),
      quotation.site_survey_id
        ? adminClient.from('site_surveys').select('*').eq('id', quotation.site_survey_id).maybeSingle()
        : Promise.resolve({ data: null }),
      adminClient.from('orders').select('*').eq('quotation_id', quotationId).maybeSingle(),
      quotation.package_id
        ? adminClient.from('product_packages').select('*').eq('id', quotation.package_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const customer = customerRes.data || null;
  const address = customer ? await getCustomerAddress(adminClient, customer.id) : null;

  return {
    quotation,
    items: itemsRes.data || [],
    statusHistory: historyRes.data || [],
    comments: commentsRes.data || [],
    customer,
    customerAddress: address,
    lead: leadRes.data || null,
    survey: surveyRes.data || null,
    order: orderRes.data || null,
    package: packageRes.data || null,
  };
}

export async function getOrderBundle(adminClient, orderId) {
  const { data: order, error } = await adminClient
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .maybeSingle();

  if (error) throw new ApiError('Failed to load order: ' + error.message, 500);
  if (!order) throw new ApiError('Order not found.', 404);

  const [customerRes, quotationRes, itemsRes, paymentsRes, historyRes] = await Promise.all([
    adminClient.from('customers').select('*').eq('id', order.customer_id).maybeSingle(),
    adminClient.from('quotations').select('*').eq('id', order.quotation_id).maybeSingle(),
    adminClient
      .from('quotation_items')
      .select('*')
      .eq('quotation_id', order.quotation_id)
      .order('sort_order', { ascending: true }),
    adminClient
      .from('payments')
      .select(`
        *, recorded_by_profile:recorded_by ( id, full_name, email )
      `)
      .eq('order_id', orderId)
      .order('paid_at', { ascending: false }),
    adminClient
      .from('order_status_history')
      .select(`
        id, previous_status, new_status, changed_at, notes,
        changed_by_profile:changed_by ( id, full_name, email )
      `)
      .eq('order_id', orderId)
      .order('changed_at', { ascending: true }),
  ]);

  return {
    order,
    customer: customerRes.data || null,
    quotation: quotationRes.data || null,
    items: itemsRes.data || [],
    payments: paymentsRes.data || [],
    statusHistory: historyRes.data || [],
  };
}

export function sanitizeQuotationForCustomer(bundle) {
  const { internal_notes, ...quotation } = bundle.quotation || {};
  return {
    quotation,
    items: bundle.items || [],
    statusHistory: (bundle.statusHistory || []).map((row) => ({
      id: row.id,
      previous_status: row.previous_status,
      new_status: row.new_status,
      changed_at: row.changed_at,
    })),
    comments: (bundle.comments || []).filter((comment) => !comment.is_internal),
    customer: bundle.customer || null,
    customerAddress: bundle.customerAddress || null,
    order: bundle.order || null,
    package: bundle.package || null,
  };
}

export async function recordQuotationStatus({
  adminClient,
  quotationId,
  previousStatus,
  newStatus,
  actorId = null,
  notes = null,
  metadata = null,
}) {
  const { error } = await adminClient.from('quotation_status_history').insert({
    quotation_id: quotationId,
    previous_status: previousStatus || null,
    new_status: newStatus,
    changed_by: actorId,
    notes,
    metadata: metadata || null,
  });
  if (error) {
    // Status history is required for auditability; surface the failure.
    throw new ApiError('Failed to record quotation status history: ' + error.message, 500);
  }
}

export async function recordOrderStatus({
  adminClient,
  orderId,
  previousStatus,
  newStatus,
  actorId = null,
  notes = null,
}) {
  const { error } = await adminClient.from('order_status_history').insert({
    order_id: orderId,
    previous_status: previousStatus || null,
    new_status: newStatus,
    changed_by: actorId,
    notes,
  });
  if (error) {
    throw new ApiError('Failed to record order status history: ' + error.message, 500);
  }
}

export default {
  isUuid,
  assertUuid,
  normaliseDate,
  CUSTOMER_VISIBLE_QUOTATION_STATUSES,
  isCustomerVisibleQuotation,
  assertSalesAccess,
  assertCustomerAccess,
  assertOrderAccess,
  assertCustomerOrderAccess,
  getCustomerAddress,
  formatAddress,
  getApprovedSurvey,
  assertApprovedSurveyForQuotation,
  getQuotationBundle,
  getOrderBundle,
  recordQuotationStatus,
  recordOrderStatus,
};
