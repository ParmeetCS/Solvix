import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireAdminActor, invalidateActor } from '@/lib/supabase/access';

export async function OPTIONS() {
  return handleOptions();
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTIONS = ['approve', 'reject', 'deactivate', 'activate'];

/**
 * PATCH /api/v1/admin/people/:id   (id = profile id of an employee)
 * body: { action: 'approve'|'reject'|'deactivate'|'activate', department_id?, role_code?, notes? }
 *
 * "approve" also covers changing a department: it assigns the department and
 * records the approval, which is what lets the employee reach a dashboard.
 */
export async function PATCH(request, { params }) {
  try {
    const { actor, error, status } = await requireAdminActor(request);
    if (error) return jsonError(error, status);
    const db = actor.adminClient;

    const { id } = await params;
    if (!UUID.test(id)) return jsonError('Invalid employee id.', 400);

    const body = await request.json().catch(() => ({}));
    const action = body.action;
    if (!ACTIONS.includes(action)) return jsonError('Unknown action.', 400);

    const { data: target } = await db.from('profiles').select('id, auth_user_id, account_type, is_active, department_id').eq('id', id).maybeSingle();
    if (!target || target.account_type !== 'employee') return jsonError('Employee not found.', 404);
    if (target.id === actor.profile.id) return jsonError('You cannot change your own account here.', 400);

    const update = {};
    let departmentId = target.department_id;

    if (action === 'approve') {
      departmentId = body.department_id;
      if (!UUID.test(departmentId || '')) return jsonError('Choose a department.', 400);
      const { data: dept } = await db.from('departments').select('id, is_active').eq('id', departmentId).maybeSingle();
      if (!dept || !dept.is_active) return jsonError('That department does not exist or is inactive.', 400);

      update.department_id = departmentId;
      update.department_requested = null;
      update.is_active = true;

      if (body.role_code) {
        const { data: role } = await db.from('roles').select('id, code').eq('code', String(body.role_code)).maybeSingle();
        if (!role) return jsonError('Unknown role.', 400);
        if (role.code === 'admin') return jsonError('Administrator accounts are created in the database, not here.', 400);
        update.role_id = role.id;
      }
    } else if (action === 'reject' || action === 'deactivate') {
      update.is_active = false;
    } else if (action === 'activate') {
      update.is_active = true;
    }

    const { error: updateError } = await db.from('profiles').update(update).eq('id', id);
    if (updateError) return jsonError('Update failed: ' + updateError.message, 500);

    if (action === 'approve') {
      const { error: edError } = await db.from('employee_departments').upsert(
        { employee_id: id, department_id: departmentId, is_primary: true, is_approved: true, approved_by: actor.profile.id, approved_at: new Date().toISOString() },
        { onConflict: 'employee_id,department_id' },
      );
      if (edError) return jsonError('Department saved, but the approval record failed: ' + edError.message, 500);
    }

    // The change must apply immediately, not after the 30 second access cache expires.
    invalidateActor(target.auth_user_id);

    await db.from('activity_logs').insert({
      actor_id: actor.profile.id,
      action: `employee_${action}`,
      entity_type: 'profile',
      entity_id: id,
      metadata: { department_id: departmentId || null, role_code: body.role_code || null, notes: body.notes || null },
      department_id: action === 'approve' ? departmentId : null,
    });

    return jsonResponse({ id, ...update }, { message: 'Employee updated.' });
  } catch (err) {
    return jsonError('Server error: ' + err.message, 500);
  }
}
