// Backend-authoritative quotation maths.
//
// All monetary values are rounded to two decimal places on the server. The
// frontend may display an estimate, but it never supplies the final total:
// totals are always recalculated here from persisted product prices and the
// quantities submitted by the user.
import { ApiError } from './errors.js';

export function roundMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function toMoney(value, fieldName = 'amount') {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    throw new ApiError(`${fieldName} must be a valid number.`, 400);
  }
  if (n < 0) {
    throw new ApiError(`${fieldName} cannot be negative.`, 400);
  }
  return roundMoney(n);
}

export function toQuantity(value, fieldName = 'quantity') {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw new ApiError(`${fieldName} must be greater than zero.`, 400);
  }
  return Math.round(n * 100) / 100;
}

function normaliseTaxRate(value, fallback = 0) {
  if (value === undefined || value === null || value === '') return Number(fallback) || 0;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 100) {
    throw new ApiError('Tax rate must be between 0 and 100.', 400);
  }
  return n;
}

/**
 * Calculate a quotation from normalised line items.
 *
 * Each line item accepts:
 *   { quantity, unit_price, tax_rate?, item_type? }
 *
 * Discount is applied proportionally across all lines before tax, so mixed
 * tax-rate BOMs remain internally consistent. Installation and other charges
 * are reported separately but remain part of the taxable subtotal.
 */
export function calculateQuotationTotals({
  items = [],
  discountType = 'fixed',
  discountValue = 0,
  taxRate = 0,
  installationCharges,
  otherCharges,
} = {}) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError('A quotation must contain at least one line item.', 400);
  }

  const globalTaxRate = normaliseTaxRate(taxRate, 0);

  const normalised = items.map((item, index) => {
    const quantity = toQuantity(item.quantity, `Line ${index + 1} quantity`);
    const unitPrice = toMoney(item.unit_price ?? item.unitPrice ?? 0, `Line ${index + 1} unit price`);
    const lineTotal = roundMoney(quantity * unitPrice);
    const itemType = item.item_type || item.itemType || 'product';
    if (!['product', 'installation', 'service', 'other'].includes(itemType)) {
      throw new ApiError(`Line ${index + 1} has an invalid item type.`, 400);
    }
    const lineTaxRate = normaliseTaxRate(
      item.tax_rate !== undefined ? item.tax_rate : item.taxRate,
      globalTaxRate
    );
    return {
      ...item,
      quantity,
      unit_price: unitPrice,
      line_total: lineTotal,
      tax_rate: lineTaxRate,
      item_type: itemType,
    };
  });

  const subtotal = roundMoney(normalised.reduce((sum, item) => sum + item.line_total, 0));
  if (subtotal <= 0) {
    throw new ApiError('Quotation subtotal must be greater than zero.', 400);
  }

  const installationTotal = roundMoney(
    normalised
      .filter((item) => item.item_type === 'installation')
      .reduce((sum, item) => sum + item.line_total, 0)
  );
  const otherTotal = roundMoney(
    normalised
      .filter((item) => item.item_type === 'other')
      .reduce((sum, item) => sum + item.line_total, 0)
  );

  let discountAmount = 0;
  const rawDiscount = Number(discountValue) || 0;
  if (discountType === 'percentage') {
    if (rawDiscount < 0 || rawDiscount > 100) {
      throw new ApiError('Discount percentage must be between 0 and 100.', 400);
    }
    discountAmount = roundMoney(subtotal * (rawDiscount / 100));
  } else if (discountType === 'fixed') {
    if (rawDiscount < 0) {
      throw new ApiError('Discount cannot be negative.', 400);
    }
    discountAmount = roundMoney(rawDiscount);
  } else {
    throw new ApiError('Discount type must be fixed or percentage.', 400);
  }

  if (discountAmount > subtotal) {
    throw new ApiError('Discount cannot exceed the quotation subtotal.', 400);
  }

  // Allocate discount proportionally and fix the rounding remainder on the
  // final line so the allocation always sums exactly to discountAmount.
  let allocated = 0;
  const lineDiscounts = normalised.map((item, index) => {
    if (discountAmount === 0) return 0;
    if (index === normalised.length - 1) {
      return roundMoney(discountAmount - allocated);
    }
    const share = roundMoney((discountAmount * item.line_total) / subtotal);
    allocated = roundMoney(allocated + share);
    return share;
  });

  let taxAmount = 0;
  const taxedItems = normalised.map((item, index) => {
    const lineDiscount = lineDiscounts[index];
    const taxable = roundMoney(Math.max(0, item.line_total - lineDiscount));
    const lineTax = roundMoney(taxable * (item.tax_rate / 100));
    taxAmount = roundMoney(taxAmount + lineTax);
    return {
      ...item,
      discount_amount: lineDiscount,
      taxable_amount: taxable,
      tax_amount: lineTax,
    };
  });

  const totalAmount = roundMoney(subtotal - discountAmount + taxAmount);

  return {
    items: taxedItems,
    subtotal,
    discount_amount: discountAmount,
    taxable_amount: roundMoney(subtotal - discountAmount),
    tax_amount: taxAmount,
    installation_charges:
      installationCharges === undefined ? installationTotal : toMoney(installationCharges, 'Installation charges'),
    other_charges: otherCharges === undefined ? otherTotal : toMoney(otherCharges, 'Other charges'),
    total_amount: totalAmount,
    discount_type: discountType,
    discount_value: roundMoney(rawDiscount),
    tax_rate: globalTaxRate,
  };
}

export default calculateQuotationTotals;
