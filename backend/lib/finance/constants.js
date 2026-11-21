// Shared vocabularies for the Accounts & Finance module. These mirror the
// CHECK constraints in database/migrations/004_finance_subsidy_module.sql.

export const INVOICE_STATUSES = ['draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled'];
export const LEGACY_INVOICE_STATUSES = ['sent', 'refunded'];
export const INVOICE_BILLING_EVENTS = ['advance', 'milestone', 'final', 'full', 'service', 'other'];
export const INVOICE_TAX_MODES = ['intra_state', 'inter_state'];

export const PAYMENT_METHODS = ['cash', 'bank_transfer', 'upi', 'card', 'cheque', 'finance', 'other'];
export const PAYMENT_TYPES = ['advance', 'partial', 'full'];
export const PAYMENT_STATUSES = ['recorded', 'verified', 'failed', 'refunded', 'reversed'];
export const RECONCILE_ACTIONS = ['verify', 'fail', 'reverse'];

export const EXPENSE_CATEGORIES = [
  'purchase',
  'transportation',
  'installation_labour',
  'technician_payment',
  'maintenance',
  'office',
  'other',
];
export const LEGACY_EXPENSE_CATEGORIES = ['equipment_purchase', 'labour', 'logistics', 'utilities', 'marketing'];
export const EXPENSE_APPROVAL_STATUSES = ['pending', 'approved', 'rejected', 'void'];

export const PROJECT_COST_CATEGORIES = ['equipment', 'labour', 'logistics', 'permits', 'other'];
export const PROJECT_COST_SOURCES = ['manual', 'expense', 'technician_payment', 'dispatch'];

export const TECHNICIAN_PAYMENT_TYPES = ['labour', 'bonus', 'advance', 'reimbursement'];
export const TECHNICIAN_PAYMENT_METHODS = ['cash', 'bank_transfer', 'upi', 'cheque', 'other'];
export const TECHNICIAN_PAYMENT_STATUSES = ['pending', 'approved', 'paid', 'cancelled', 'reversed'];
export const TECHNICIAN_PAYMENT_ACTIONS = ['approve', 'pay', 'cancel', 'reverse'];

// Invoice statuses that represent billed (recognised) revenue.
export const BILLED_INVOICE_STATUSES = ['issued', 'sent', 'partially_paid', 'paid', 'overdue'];

// Quotation statuses that represent an open offer (pipeline, not revenue).
export const OPEN_QUOTATION_STATUSES = ['approved', 'sent', 'viewed', 'accepted'];

// Maximum invoice-level discount (percent of gross) finance staff may apply
// without a manager. Managers/admins may exceed it with a recorded reason.
export function maxStaffDiscountPercent() {
  const raw = Number(process.env.FINANCE_MAX_STAFF_DISCOUNT_PERCENT);
  return Number.isFinite(raw) && raw >= 0 && raw <= 100 ? raw : 10;
}

export function expenseCostCategory(category) {
  if (['purchase', 'equipment_purchase'].includes(category)) return 'equipment';
  if (['installation_labour', 'technician_payment', 'labour'].includes(category)) return 'labour';
  if (['transportation', 'logistics'].includes(category)) return 'logistics';
  return 'other';
}
