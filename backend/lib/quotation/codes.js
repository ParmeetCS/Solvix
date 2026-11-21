// Human-readable document codes. Uniqueness is also enforced by database
// constraints; routes retry once on a duplicate-key error where appropriate.
import { randomBytes } from 'crypto';

function token() {
  return randomBytes(4).toString('hex').toUpperCase();
}

export function generateQuotationCode() {
  const year = new Date().getFullYear();
  return `QTN-${year}-${token()}`;
}

export function generateOrderCode() {
  const year = new Date().getFullYear();
  return `ORD-${year}-${token()}`;
}

export function generatePaymentCode() {
  const year = new Date().getFullYear();
  return `PAY-${year}-${token()}`;
}

export function generateCustomerCode() {
  const year = new Date().getFullYear();
  return `CUST-${year}-${token()}`;
}

export default { generateQuotationCode, generateOrderCode, generatePaymentCode, generateCustomerCode };
