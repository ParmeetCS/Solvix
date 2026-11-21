import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireAdminActor } from '@/lib/supabase/access';

export async function OPTIONS() {
  return handleOptions();
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** GET /api/v1/admin/reports?from=YYYY-MM-DD&to=YYYY-MM-DD */
export async function GET(request) {
  try {
    const { actor, error, status } = await requireAdminActor(request);
    if (error) return jsonError(error, status);

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from') || null;
    const to = searchParams.get('to') || null;
    if ((from && !DATE.test(from)) || (to && !DATE.test(to))) return jsonError('Dates must be YYYY-MM-DD.', 400);
    if (from && to && from > to) return jsonError('"From" date must not be after "To" date.', 400);

    const { data, error: dbError } = await actor.adminClient.rpc('admin_report', { p_from: from, p_to: to });
    if (dbError) return jsonError('Could not build the report: ' + dbError.message, 500);

    return jsonResponse({ ...data, range: { from, to } });
  } catch (err) {
    return jsonError('Server error: ' + err.message, 500);
  }
}
