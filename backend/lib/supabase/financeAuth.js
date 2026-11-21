// Authentication, RBAC, and Notification helpers for Accounts, Finance & Subsidy Modules
import { getUserFromRequest } from './auth.js';
import { requireDepartment } from './access.js';
import { createAdminClient } from './client.js';

/**
 * Validates request for Finance / Accounts / Admin access.
 * Only authorized accounts personnel and administrators can manage finance, invoices, expenses, and technician payroll.
 */
export async function requireFinanceOrAdmin(request) {
  const { actor, error, status } = await requireDepartment(request, ['finance', 'account', 'billing'], 'Accounts & Finance');
  if (error) return { error, status };
  return {
    user: actor.user,
    profile: actor.profile,
    isAdmin: actor.isAdmin,
    isFinance: true,
    adminClient: actor.adminClient,
    error: null,
  };
}

/**
 * Validates request for Customer OR Finance/Admin (e.g. view customer's own invoices or subsidy applications).
 */
export async function requireCustomerOrFinanceOrAdmin(request) {
  const { user, error: userError } = await getUserFromRequest(request);
  if (userError || !user) {
    return { error: 'Authentication required. Missing or invalid Bearer token.', status: 401 };
  }

  const adminClient = createAdminClient();

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
      department_id
    `)
    .eq('auth_user_id', user.id)
    .single();

  if (profileError || !profile) {
    return { error: 'User profile not found.', status: 404 };
  }

  if (!profile.is_active) {
    return { error: 'Account suspended or inactive.', status: 403 };
  }

  const isCustomer = profile.account_type === 'customer';
  const isAdmin = profile.account_type === 'admin' || profile.roles?.code === 'admin';
  const isEmployee = profile.account_type === 'employee';

  let customerRecord = null;
  if (isCustomer) {
    const { data: cust } = await adminClient
      .from('customers')
      .select('id, customer_code, contact_name, email, phone')
      .eq('profile_id', profile.id)
      .maybeSingle();
    customerRecord = cust;
  }

  return {
    user,
    profile,
    customerRecord,
    isCustomer,
    isEmployee,
    isAdmin,
    adminClient,
    error: null
  };
}

/**
 * Log activity in activity_logs
 */
export async function logFinanceActivity({ actorId, action, entityType, entityId, metadata = {} }) {
  try {
    const adminClient = createAdminClient();
    await adminClient.from('activity_logs').insert({
      actor_id: actorId || null,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      metadata
    });
  } catch (err) {
    console.error('Failed to log finance activity:', err.message);
  }
}

/**
 * Record immutable financial transaction in financial_transactions
 */
export async function recordFinancialTransaction({
  transactionCode,
  transactionType,
  amount,
  currency = 'INR',
  referenceType = null,
  referenceId = null,
  recordedBy = null
}) {
  try {
    const adminClient = createAdminClient();
    const code = transactionCode || `TXN-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    await adminClient.from('financial_transactions').insert({
      transaction_code: code,
      transaction_type: transactionType,
      amount: parseFloat(amount) || 0,
      currency,
      reference_type: referenceType,
      reference_id: referenceId,
      recorded_by: recordedBy
    });
  } catch (err) {
    console.error('Failed to record financial transaction:', err.message);
  }
}
