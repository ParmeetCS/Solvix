// Quotation and order workflow rules shared by API routes and tests.
import { ApiError } from './errors.js';

export const QUOTATION_STATUSES = [
  'draft',
  'pending_approval',
  'approved',
  'sent',
  'viewed',
  'accepted',
  'rejected',
  'expired',
  'converted_to_order',
];

export const ORDER_STATUSES = [
  'pending_payment',
  'confirmed',
  'processing',
  'awaiting_dispatch',
  'dispatched',
  'installation_in_progress',
  'completed',
  'cancelled',
];

export const PAYMENT_STATUSES = ['pending', 'partial', 'paid', 'overdue', 'refunded'];

export const PAYMENT_METHODS = [
  'cash',
  'cheque',
  'bank_transfer',
  'upi',
  'card',
  'finance',
  'other',
];

export const PAYMENT_TYPES = ['advance', 'partial', 'full', 'refund'];

// Legacy statuses are accepted for existing rows but are not offered by new UI.
export const LEGACY_ORDER_STATUSES = [
  'pending',
  'in_production',
  'ready_for_install',
  'installing',
  'refunded',
];

const QUOTATION_TRANSITIONS = {
  draft: ['pending_approval', 'approved', 'expired'],
  pending_approval: ['draft', 'approved', 'rejected', 'expired'],
  under_review: ['draft', 'approved', 'rejected', 'expired'],
  approved: ['sent', 'draft', 'expired'],
  sent: ['viewed', 'accepted', 'rejected', 'expired'],
  viewed: ['accepted', 'rejected', 'expired'],
  accepted: ['converted_to_order'],
  rejected: [],
  expired: ['draft'],
  converted: [],
  converted_to_order: [],
};

const ORDER_TRANSITIONS = {
  pending_payment: ['confirmed', 'cancelled'],
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'awaiting_dispatch', 'cancelled'],
  processing: ['awaiting_dispatch', 'dispatched', 'cancelled'],
  in_production: ['awaiting_dispatch', 'cancelled'],
  awaiting_dispatch: ['dispatched', 'cancelled'],
  ready_for_install: ['installation_in_progress', 'installing', 'completed', 'cancelled'],
  dispatched: ['ready_for_install', 'installation_in_progress', 'completed', 'cancelled'],
  installing: ['installation_in_progress', 'completed', 'cancelled'],
  installation_in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  refunded: [],
};

export function canTransitionQuotation(from, to) {
  if (from === to) return false;
  return (QUOTATION_TRANSITIONS[from] || []).includes(to);
}

export function assertQuotationTransition(from, to) {
  if (!canTransitionQuotation(from, to)) {
    throw new ApiError(`Quotation cannot move from ${from} to ${to}.`, 409);
  }
}

export function canTransitionOrder(from, to) {
  if (from === to) return false;
  return (ORDER_TRANSITIONS[from] || []).includes(to);
}

export function assertOrderTransition(from, to) {
  if (!canTransitionOrder(from, to)) {
    throw new ApiError(`Order cannot move from ${from} to ${to}.`, 409);
  }
}

export function isTerminalQuotationStatus(status) {
  return ['accepted', 'rejected', 'expired', 'converted', 'converted_to_order'].includes(status);
}

export default {
  QUOTATION_STATUSES,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_TYPES,
  canTransitionQuotation,
  assertQuotationTransition,
  canTransitionOrder,
  assertOrderTransition,
  isTerminalQuotationStatus,
};
