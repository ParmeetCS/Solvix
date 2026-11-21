// Shared route helpers for quotation workflow endpoints.
import { jsonError } from '@/lib/utils';
import { requireSalesOrAdmin } from '@/lib/supabase/salesAuth';
import { requireCustomer } from '@/lib/supabase/roles';
import {
  assertUuid,
  assertSalesAccess,
  assertCustomerAccess,
  isCustomerVisibleQuotation,
} from './data.js';

export async function loadStaffQuotation(request, quotationId) {
  const auth = await requireSalesOrAdmin(request);
  if (auth.error) return { errorResponse: jsonError(auth.error, auth.status) };

  try {
    assertUuid(quotationId, 'quotation id');
  } catch (error) {
    return { errorResponse: jsonError(error.message, 400) };
  }

  const { data: quotation, error } = await auth.adminClient
    .from('quotations')
    .select('*')
    .eq('id', quotationId)
    .maybeSingle();

  if (error) return { errorResponse: jsonError('Failed to load quotation: ' + error.message, 500) };
  if (!quotation) return { errorResponse: jsonError('Quotation not found.', 404) };

  try {
    assertSalesAccess(quotation, auth.profile, auth.isAdmin);
  } catch (accessError) {
    return { errorResponse: jsonError(accessError.message, accessError.status || 403) };
  }

  return { auth, quotation };
}

export async function loadCustomerQuotation(request, quotationId) {
  const auth = await requireCustomer(request);
  if (auth.error) return { errorResponse: jsonError(auth.error, auth.status) };

  try {
    assertUuid(quotationId, 'quotation id');
  } catch (error) {
    return { errorResponse: jsonError(error.message, 400) };
  }

  const { data: quotation, error } = await auth.adminClient
    .from('quotations')
    .select('*')
    .eq('id', quotationId)
    .maybeSingle();

  if (error) return { errorResponse: jsonError('Failed to load quotation: ' + error.message, 500) };
  if (!quotation) return { errorResponse: jsonError('Quotation not found.', 404) };

  try {
    assertCustomerAccess(quotation, auth.customer);
  } catch (accessError) {
    return { errorResponse: jsonError(accessError.message, accessError.status || 403) };
  }

  // Hide internal drafts/review quotations behind the same 404 as a missing
  // record so a customer cannot infer that a quotation exists.
  if (!isCustomerVisibleQuotation(quotation)) {
    return { errorResponse: jsonError('Quotation not found.', 404) };
  }

  return { auth, quotation };
}

export default { loadStaffQuotation, loadCustomerQuotation };
