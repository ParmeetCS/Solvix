import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireCustomer } from '@/lib/supabase/roles';

export async function OPTIONS() {
  return handleOptions();
}

/** GET /api/v1/customer/installations - installations for the signed-in customer only. */
export async function GET(request) {
  try {
    const auth = await requireCustomer(request);
    if (auth.error) return jsonError(auth.error, auth.status);

    const { data, error } = await auth.adminClient
      .from('installations')
      .select(`
        id, installation_code, status, scheduled_start, actual_start, actual_end,
        system_capacity_kw, created_at,
        orders:order_id ( id, order_code )
      `)
      .eq('customer_id', auth.customer.id)
      .order('created_at', { ascending: false });

    if (error) return jsonError('Failed to load your installations: ' + error.message, 500);

    return jsonResponse({ installations: data || [] });
  } catch (error) {
    return jsonError(error.message || 'Failed to load installations.', error.status || 500);
  }
}
