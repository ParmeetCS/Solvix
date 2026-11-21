// Authentication, RBAC, and Notification helpers for Accounts, Finance & Subsidy Modules
import { getUserFromRequest } from './auth.js';
import { requireDepartment, resolveActor } from './access.js';
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
  const { actor, error, status } = await resolveActor(request);
  if (error) return { error, status };

  const staffAllowed = actor.isAdmin ||
    (actor.isEmployee && actor.inDepartment(['finance', 'account', 'billing', 'subsidy', 'documentation']));
  if (!actor.isCustomer && !staffAllowed) {
    return { error: 'Access denied. Customer, Accounts, Subsidy or Administrator access required.', status: 403 };
  }

  let customerRecord = null;
  if (actor.isCustomer) {
    const { data: cust } = await actor.adminClient
      .from('customers')
      .select('id, customer_code, contact_name, email, phone')
      .eq('profile_id', actor.profile.id)
      .maybeSingle();
    customerRecord = cust;
  }

  return {
    user: actor.user,
    profile: actor.profile,
    customerRecord,
    isCustomer: actor.isCustomer,
    isEmployee: actor.isEmployee,
    isAdmin: actor.isAdmin,
    adminClient: actor.adminClient,
    error: null,
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
