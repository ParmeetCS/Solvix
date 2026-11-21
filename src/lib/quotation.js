// Frontend presentation helpers for quotations and orders.
// Monetary totals shown here are estimates for the user experience only. The
// backend recalculates and persists every amount.

export function formatCurrency(value) {
  const n = Number(value) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatNumber(value, digits = 2) {
  const n = Number(value) || 0;
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(n);
}

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function titleCase(value) {
  return String(value || '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export const QUOTATION_STATUS_LABELS = {
  draft: 'Draft',
  pending_approval: 'Pending Approval',
  under_review: 'Under Review',
  approved: 'Approved',
  sent: 'Sent',
  viewed: 'Viewed',
  accepted: 'Accepted',
  rejected: 'Rejected',
  expired: 'Expired',
  converted: 'Converted to Order',
  converted_to_order: 'Converted to Order',
};

export const ORDER_STATUS_LABELS = {
  pending: 'Pending Payment',
  pending_payment: 'Pending Payment',
  confirmed: 'Confirmed',
  processing: 'Processing',
  in_production: 'Processing',
  awaiting_dispatch: 'Awaiting Dispatch',
  ready_for_install: 'Awaiting Dispatch',
  dispatched: 'Dispatched',
  installing: 'Installation In Progress',
  installation_in_progress: 'Installation In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

export const PAYMENT_STATUS_LABELS = {
  pending: 'Pending',
  partial: 'Partially Paid',
  paid: 'Paid',
  overdue: 'Overdue',
  refunded: 'Refunded',
};

export function statusLabel(status, kind = 'quotation') {
  const map = kind === 'order'
    ? ORDER_STATUS_LABELS
    : kind === 'payment'
      ? PAYMENT_STATUS_LABELS
      : QUOTATION_STATUS_LABELS;
  return map[status] || titleCase(status);
}

export function statusClass(status, kind = 'quotation') {
  const map = {
    draft: 'neutral',
    pending_approval: 'warning',
    under_review: 'warning',
    approved: 'info',
    sent: 'info',
    viewed: 'info',
    accepted: 'success',
    rejected: 'danger',
    expired: 'muted',
    converted: 'success',
    converted_to_order: 'success',
    pending: 'warning',
    pending_payment: 'warning',
    confirmed: 'info',
    processing: 'info',
    awaiting_dispatch: 'info',
    dispatched: 'info',
    installation_in_progress: 'info',
    installing: 'info',
    completed: 'success',
    cancelled: 'danger',
    refunded: 'danger',
    partial: 'warning',
    paid: 'success',
    overdue: 'danger',
  };
  return map[status] || (kind === 'payment' ? 'neutral' : 'neutral');
}

// Display-only estimate. The backend is authoritative.
export function calculatePreviewTotals({
  items = [],
  discountType = 'fixed',
  discountValue = 0,
  taxRate = 0,
}) {
  const round = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  const lines = items.map((item) => {
    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(item.unit_price) || 0;
    const lineTotal = round(quantity * unitPrice);
    const lineTax = Number(item.tax_rate ?? taxRate) || 0;
    return { ...item, quantity, unit_price: unitPrice, line_total: lineTotal, tax_rate: lineTax };
  });
  const subtotal = round(lines.reduce((sum, line) => sum + line.line_total, 0));
  let discount = 0;
  if (discountType === 'percentage') {
    discount = round(subtotal * ((Number(discountValue) || 0) / 100));
  } else {
    discount = round(Number(discountValue) || 0);
  }
  discount = Math.min(discount, subtotal);
  const taxable = round(subtotal - discount);
  const tax = round(
    lines.reduce((sum, line) => {
      const share = subtotal > 0 ? line.line_total / subtotal : 0;
      return sum + round((line.line_total - discount * share) * (line.tax_rate / 100));
    }, 0)
  );
  return {
    lines,
    subtotal,
    discount,
    taxable,
    tax,
    total: round(subtotal - discount + tax),
    installation: round(lines.filter((line) => line.item_type === 'installation').reduce((s, l) => s + l.line_total, 0)),
    other: round(lines.filter((line) => line.item_type === 'other').reduce((s, l) => s + l.line_total, 0)),
  };
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default {
  formatCurrency,
  formatNumber,
  formatDate,
  formatDateTime,
  titleCase,
  statusLabel,
  statusClass,
  calculatePreviewTotals,
  downloadBlob,
};
