import test from 'node:test';
import assert from 'node:assert/strict';

import {
  generateQuotationPdf,
  quotationPdfFilename,
} from '../lib/pdf/quotationPdf.js';

function sampleBundle() {
  return {
    quotation: {
      quotation_code: 'QTN-2026-ABCDEF12',
      created_at: '2026-11-21T09:00:00.000Z',
      validity_date: '2026-12-21',
      status: 'draft',
      system_type: 'on-grid',
      system_capacity_kw: 3,
      installation_address: '12 Solar Street, Pune, Maharashtra 411001',
      subtotal: 72000,
      discount_amount: 2000,
      tax_amount: 12600,
      total_amount: 82600,
      installation_charges: 0,
      other_charges: 0,
      payment_terms: '40% advance, 60% before dispatch',
      warranty_terms: '',
      terms_and_conditions: 'Standard SOLVIX quotation terms apply.',
    },
    customer: {
      contact_name: 'Asha Rao',
      company_name: 'Rao Homes',
      email: 'asha@example.com',
      phone: '+91 90000 00000',
    },
    customerAddress: null,
    items: [
      {
        line_item: 'Solar panel 550W',
        category_name: 'Panels',
        quantity: 6,
        unit: 'piece',
        unit_price: 12000,
        tax_rate: 12,
        total_price: 72000,
      },
    ],
  };
}

test('generates a valid PDF document', () => {
  const pdf = generateQuotationPdf(sampleBundle());

  assert.ok(Buffer.isBuffer(pdf));
  assert.ok(pdf.length > 1000);
  assert.equal(pdf.subarray(0, 8).toString('latin1'), '%PDF-1.4');
  assert.ok(pdf.toString('latin1').trimEnd().endsWith('%%EOF'));
});

test('includes the quotation code and INR totals without a rupee glyph', () => {
  const pdf = generateQuotationPdf(sampleBundle());
  const text = pdf.toString('latin1');

  assert.ok(text.includes('QTN-2026-ABCDEF12'));
  assert.ok(text.includes('INR'));
  assert.ok(!text.includes('\u20b9'));
  assert.ok(text.includes('GRAND TOTAL'));
});

test('does not assert unconfigured warranty claims', () => {
  const pdf = generateQuotationPdf(sampleBundle());
  const text = pdf.toString('latin1');

  assert.ok(text.includes('No warranty terms have been configured'));
});

test('requires quotation data', () => {
  assert.throws(() => generateQuotationPdf({}), /Quotation data is required/);
});

test('builds a safe download filename', () => {
  assert.equal(
    quotationPdfFilename({ quotation_code: 'QTN/2026 ABC' }),
    'SOLVIX-QTN2026ABC.pdf'
  );
  assert.equal(quotationPdfFilename(null), 'SOLVIX-quotation.pdf');
});
