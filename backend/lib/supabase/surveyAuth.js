// Authentication and RBAC verification helpers for Site Survey & Feasibility endpoints
import { getUserFromRequest } from './auth';
import { createAdminClient } from './client';

/**
 * Validates whether the requesting user is authenticated and has permission to
 * access Site Survey resources.
 * 
 * Roles supported:
 * - Admin: Full access (view, assign, schedule, fill, approve, reject)
 * - Survey Manager: Full survey management (assign, schedule, approve, reject)
 * - Survey Engineer / Surveyor: View assigned surveys, complete survey form, save drafts, upload photos
 * - Sales / CRM: Read-only access to survey status and reports for quotation creation
 * 
 * Returns { user, profile, isAdmin, isSurveyManager, isSurveyor, isSales, canManage, adminClient, error, status }
 */
export async function requireSurveyAccess(request, { requireManage = false, targetSurveyId = null } = {}) {
  let authResult;
  try {
    authResult = await getUserFromRequest(request);
  } catch (err) {
    authResult = { user: null, error: err };
  }

  const { user, error: userError } = authResult;

  // Check if we have an admin client configured
  let adminClient = null;
  try {
    adminClient = createAdminClient();
  } catch (e) {
    // If Supabase keys aren't set in dev, adminClient will be null
  }

  // If no user token in request, check if we're in dev mode
  if (userError || !user) {
    // In strict production, return 401
    if (process.env.NODE_ENV === 'production') {
      return { error: 'Authentication required. Missing or invalid Bearer token.', status: 401 };
    }

    // Dev fallback: allow dev testing with mock admin profile if no DB connection
    const mockProfile = {
      id: '00000000-0000-0000-0000-000000000001',
      auth_user_id: '00000000-0000-0000-0000-000000000001',
      full_name: 'Lead Survey Engineer (Dev)',
      email: 'survey.lead@solvix.energy',
      phone: '+91 98765 43210',
      account_type: 'admin',
      is_active: true,
      roles: { code: 'admin', name: 'Administrator' },
      departments: { code: 'SURVEY', name: 'Site Survey & Engineering' }
    };

    return {
      user: { id: mockProfile.auth_user_id, email: mockProfile.email },
      profile: mockProfile,
      isAdmin: true,
      isSurveyManager: true,
      isSurveyor: true,
      isSales: true,
      canManage: true,
      adminClient,
      error: null
    };
  }

  if (!adminClient) {
    return { error: 'Database client initialization failed.', status: 500 };
  }

  // Fetch user profile with role and department
  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select(`
      id,
      auth_user_id,
      full_name,
      email,
      phone,
      account_type,
      is_active,
      role_id,
      roles:role_id ( id, name, code ),
      department_id,
      departments:department_id ( id, name, code )
    `)
    .eq('auth_user_id', user.id)
    .single();

  if (profileError || !profile) {
    return { error: 'User profile not found.', status: 404 };
  }

  if (!profile.is_active) {
    return { error: 'Account suspended or inactive.', status: 403 };
  }

  const roleCode = (profile.roles?.code || '').toLowerCase();
  const deptCode = (profile.departments?.code || '').toLowerCase();
  const deptName = (profile.departments?.name || '').toLowerCase();

  const isAdmin = roleCode === 'admin' || profile.account_type === 'admin';
  const isSurveyManager = isAdmin || 
    (deptCode.includes('survey') && (roleCode.includes('manager') || roleCode.includes('head') || roleCode.includes('lead')));
  const isSurveyor = isAdmin || isSurveyManager || 
    deptCode.includes('survey') || deptName.includes('survey') || 
    roleCode.includes('survey') || roleCode.includes('engineer');
  const isSales = isAdmin || deptCode.includes('sales') || deptName.includes('sales') || deptName.includes('crm');

  // Authorization check
  const canManage = isAdmin || isSurveyManager;

  if (requireManage && !canManage) {
    return { error: 'Access denied. Survey Manager or Administrator privileges required.', status: 403 };
  }

  // If user is a surveyor trying to modify a specific survey, ensure it is assigned to them
  if (targetSurveyId && !canManage) {
    const { data: survey } = await adminClient
      .from('site_surveys')
      .select('id, assigned_to, created_by')
      .eq('id', targetSurveyId)
      .single();

    if (survey && survey.assigned_to !== profile.id && survey.created_by !== profile.id) {
      // Check survey_assignments table
      const { data: assignment } = await adminClient
        .from('survey_assignments')
        .select('id')
        .eq('survey_id', targetSurveyId)
        .eq('assigned_to', profile.id)
        .eq('is_active', true)
        .limit(1);

      if (!assignment || assignment.length === 0) {
        return { error: 'Access denied. You can only update surveys assigned to you.', status: 403 };
      }
    }
  }

  return {
    user,
    profile,
    isAdmin,
    isSurveyManager,
    isSurveyor,
    isSales,
    canManage,
    adminClient,
    error: null
  };
}

/**
 * Log an action into the activity_logs table for audit trail
 */
export async function logSurveyActivity({ actorId, action, surveyId, metadata = {}, departmentId = null }) {
  try {
    const admin = createAdminClient();
    await admin.from('activity_logs').insert({
      actor_id: actorId || null,
      action,
      entity_type: 'site_survey',
      entity_id: surveyId || null,
      metadata,
      department_id: departmentId || null,
    });
  } catch (err) {
    console.error('Failed to write survey activity log:', err.message);
  }
}

/**
 * Send notification to an employee
 */
export async function createNotification({ recipientId, title, message, surveyId = null, type = 'survey' }) {
  try {
    const admin = createAdminClient();
    await admin.from('notifications').insert({
      user_id: recipientId,
      title,
      message,
      notification_type: type,
      reference_id: surveyId,
      is_read: false
    });
  } catch (err) {
    // Non-blocking notification logging
  }
}
