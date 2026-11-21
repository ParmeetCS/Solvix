// Dependency-free PDF writer for professional SOLVIX quotations.
//
// The module emits a standards-compliant PDF 1.4 document using the built-in
// Helvetica fonts. Keeping this local avoids adding a native PDF dependency to
// the serverless backend. All text is sanitised to WinAnsi-safe ASCII; the
// Indian rupee sign is rendered as "INR ".
import { formatAddress } from '../quotation/data.js';

const PAGE_WIDTH = 595.28; // A4 points
const PAGE_HEIGHT = 841.89;
const MARGIN = 40;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const FOOTER_RESERVE = 58;

function sanitiseText(value) {
  return String(value ?? '')
    .replace(/\u20b9/g, 'INR ')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u2022/g, '-')
    .replace(/\r?\n/g, ' ')
    .replace(/[^\x20-\x7E]/g, '');
}

function escapePdfText(value) {
  return sanitiseText(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function estimateWidth(text, size, bold = false) {
  return sanitiseText(text).length * size * (bold ? 0.56 : 0.51);
}

function wrapText(text, maxWidth, size, bold = false) {
  const words = sanitiseText(text).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];

  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (estimateWidth(candidate, size, bold) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    if (estimateWidth(word, size, bold) > maxWidth) {
      // Hard-break a long token such as a SKU.
      let remainder = word;
      while (estimateWidth(remainder, size, bold) > maxWidth) {
        let cut = Math.max(1, Math.floor(maxWidth / (size * (bold ? 0.56 : 0.51))));
        lines.push(remainder.slice(0, cut));
        remainder = remainder.slice(cut);
      }
      current = remainder;
    } else {
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

function money(value) {
  const n = Number(value) || 0;
  return `INR ${n.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function titleCase(value) {
  return String(value || '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

class PdfBuilder {
  constructor() {
    this.pages = [];
    this.page = null;
    this.newPage();
  }

  newPage() {
    this.page = { ops: [], y: MARGIN };
    this.pages.push(this.page);
    return this.page;
  }

  get y() {
    return this.page.y;
  }

  set y(value) {
    this.page.y = value;
  }

  moveDown(value) {
    this.page.y += value;
  }

  ensureSpace(height, onNewPage) {
    if (this.page.y + height > PAGE_HEIGHT - FOOTER_RESERVE) {
      this.newPage();
      if (onNewPage) onNewPage(this);
    }
  }

  drawText(text, x, y, {
    size = 10,
    font = 'regular',
    color = [0.12, 0.15, 0.2],
    align = 'left',
    maxWidth = null,
  } = {}) {
    const clean = sanitiseText(text);
    const fontRef = font === 'bold' ? '/F2' : '/F1';
    let drawX = x;
    if (align === 'right' && maxWidth) {
      drawX = x + maxWidth - estimateWidth(clean, size, font === 'bold');
    } else if (align === 'center' && maxWidth) {
      drawX = x + (maxWidth - estimateWidth(clean, size, font === 'bold')) / 2;
    }
    const pdfY = PAGE_HEIGHT - y;
    this.page.ops.push(
      `BT ${fontRef} ${size} Tf ${color[0]} ${color[1]} ${color[2]} rg ` +
      `1 0 0 1 ${drawX.toFixed(2)} ${pdfY.toFixed(2)} Tm (${escapePdfText(clean)}) Tj ET`
    );
  }

  write(text, {
    x = MARGIN,
    size = 10,
    font = 'regular',
    color = [0.12, 0.15, 0.2],
    maxWidth = CONTENT_WIDTH,
    lineHeight = 1.4,
    align = 'left',
  } = {}) {
    const lines = wrapText(text, maxWidth, size, font === 'bold');
    for (const line of lines) {
      this.ensureSpace(size * lineHeight, null);
      this.drawText(line, x, this.page.y + size, { size, font, color, align, maxWidth });
      this.page.y += size * lineHeight;
    }
    return lines.length;
  }

  rect(x, y, width, height, {
    fill = null,
    stroke = null,
    lineWidth = 0.7,
  } = {}) {
    const pdfY = PAGE_HEIGHT - y - height;
    if (fill) {
      this.page.ops.push(
        `${fill[0]} ${fill[1]} ${fill[2]} rg ${x.toFixed(2)} ${pdfY.toFixed(2)} ` +
        `${width.toFixed(2)} ${height.toFixed(2)} re f`
      );
    }
    if (stroke) {
      this.page.ops.push(
        `${stroke[0]} ${stroke[1]} ${stroke[2]} RG ${lineWidth} w ${x.toFixed(2)} ${pdfY.toFixed(2)} ` +
        `${width.toFixed(2)} ${height.toFixed(2)} re S`
      );
    }
  }

  line(x1, y1, x2, y2, { color = [0.8, 0.84, 0.9], width = 0.7 } = {}) {
    this.page.ops.push(
      `${color[0]} ${color[1]} ${color[2]} RG ${width} w ` +
      `${x1.toFixed(2)} ${(PAGE_HEIGHT - y1).toFixed(2)} m ` +
      `${x2.toFixed(2)} ${(PAGE_HEIGHT - y2).toFixed(2)} l S`
    );
  }

  finalize({ footerLeft = 'SOLVIX Solar Installation Management', footerRight = '' } = {}) {
    this.pages.forEach((page, index) => {
      const footerY = PAGE_HEIGHT - 34;
      page.ops.push(
        `0.80 0.84 0.90 RG 0.6 w ${MARGIN} ${footerY + 14} m ${PAGE_WIDTH - MARGIN} ${footerY + 14} l S`
      );
      page.ops.push(
        `BT /F1 8 Tf 0.42 0.47 0.55 rg 1 0 0 1 ${MARGIN} ${footerY} Tm (${escapePdfText(footerLeft)}) Tj ET`
      );
      const right = `${footerRight ? footerRight + '  |  ' : ''}Page ${index + 1} of ${this.pages.length}`;
      const rightX = PAGE_WIDTH - MARGIN - estimateWidth(right, 8, false);
      page.ops.push(
        `BT /F1 8 Tf 0.42 0.47 0.55 rg 1 0 0 1 ${rightX.toFixed(2)} ${footerY} Tm (${escapePdfText(right)}) Tj ET`
      );
    });

    return buildPdf(this.pages);
  }
}

function buildPdf(pages) {
  const objects = [];
  const add = (body) => {
    objects.push(body);
    return objects.length;
  };

  // Fixed object numbers: 1 catalog, 2 pages, 3 regular font, 4 bold font.
  objects.push(null);
  objects.push(null);
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');

  const pageRefs = [];
  for (const page of pages) {
    const stream = page.ops.join('\n');
    const contentRef = add(
      `<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`
    );
    const pageRef = add(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentRef} 0 R >>`
    );
    pageRefs.push(pageRef);
  }

  objects[1] = `<< /Type /Pages /Kids [${pageRefs.map((ref) => `${ref} 0 R`).join(' ')}] /Count ${pageRefs.length} >>`;
  objects[0] = '<< /Type /Catalog /Pages 2 0 R >>';

  let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const offsets = [0];
  for (let i = 0; i < objects.length; i += 1) {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'latin1');
}

const COLUMNS = [
  { key: 'index', label: '#', width: 22, align: 'left' },
  { key: 'description', label: 'Description', width: 222, align: 'left' },
  { key: 'quantity', label: 'Qty', width: 42, align: 'right' },
  { key: 'unit', label: 'Unit', width: 42, align: 'left' },
  { key: 'unit_price', label: 'Unit Price', width: 70, align: 'right' },
  { key: 'tax_rate', label: 'Tax', width: 36, align: 'right' },
  { key: 'amount', label: 'Amount', width: 81, align: 'right' },
];

function columnX(index) {
  return MARGIN + COLUMNS.slice(0, index).reduce((sum, column) => sum + column.width, 0);
}

function drawHeader(doc, bundle, isContinuation = false) {
  const { quotation, customer } = bundle;
  const accent = [0.42, 0.66, 0.18];

  if (!isContinuation) {
    doc.rect(0, 0, PAGE_WIDTH, 8, { fill: accent });
    doc.drawText('SOLVIX', MARGIN, 46, { size: 24, font: 'bold', color: [0.05, 0.09, 0.18] });
    doc.drawText('Solar Installation Management', MARGIN, 62, {
      size: 9,
      color: [0.42, 0.47, 0.55],
    });

    doc.drawText('QUOTATION', PAGE_WIDTH - MARGIN - 150, 46, {
      size: 18,
      font: 'bold',
      color: [0.05, 0.09, 0.18],
      align: 'right',
      maxWidth: 150,
    });
    doc.drawText(quotation.quotation_code, PAGE_WIDTH - MARGIN - 180, 63, {
      size: 10,
      color: [0.42, 0.47, 0.55],
      align: 'right',
      maxWidth: 180,
    });

    doc.line(MARGIN, 78, PAGE_WIDTH - MARGIN, 78, { color: [0.85, 0.88, 0.92] });

    // Customer and document meta
    doc.drawText('PREPARED FOR', MARGIN, 98, {
      size: 7.5,
      font: 'bold',
      color: [0.42, 0.47, 0.55],
    });
    doc.drawText(customer?.contact_name || 'Customer', MARGIN, 113, { size: 11, font: 'bold' });
    let infoY = 127;
    if (customer?.company_name) {
      doc.drawText(customer.company_name, MARGIN, infoY, { size: 9 });
      infoY += 13;
    }
    if (customer?.email) {
      doc.drawText(customer.email, MARGIN, infoY, { size: 9 });
      infoY += 13;
    }
    if (customer?.phone) {
      doc.drawText(customer.phone, MARGIN, infoY, { size: 9 });
      infoY += 13;
    }

    const metaX = PAGE_WIDTH - MARGIN - 190;
    doc.drawText('Issue Date', metaX, 98, { size: 8, color: [0.42, 0.47, 0.55] });
    doc.drawText(formatDate(quotation.created_at), metaX + 90, 98, { size: 9, font: 'bold' });
    doc.drawText('Validity', metaX, 113, { size: 8, color: [0.42, 0.47, 0.55] });
    doc.drawText(formatDate(quotation.validity_date), metaX + 90, 113, { size: 9, font: 'bold' });
    doc.drawText('Status', metaX, 128, { size: 8, color: [0.42, 0.47, 0.55] });
    doc.drawText(titleCase(quotation.status), metaX + 90, 128, { size: 9, font: 'bold' });

    // System + installation address band
    const bandY = Math.max(infoY + 10, 152);
    doc.rect(MARGIN, bandY, CONTENT_WIDTH, 62, {
      fill: [0.96, 0.98, 0.93],
      stroke: [0.88, 0.92, 0.84],
    });
    doc.drawText('SYSTEM', MARGIN + 10, bandY + 15, {
      size: 7.5,
      font: 'bold',
      color: [0.42, 0.47, 0.55],
    });
    doc.drawText(
      `${titleCase(quotation.system_type)} | ${Number(quotation.system_capacity_kw)} kW`,
      MARGIN + 10,
      bandY + 30,
      { size: 11, font: 'bold' }
    );
    doc.drawText('INSTALLATION ADDRESS', MARGIN + 260, bandY + 15, {
      size: 7.5,
      font: 'bold',
      color: [0.42, 0.47, 0.55],
    });
    const addressLines = wrapText(
      quotation.installation_address || formatAddress(bundle.customerAddress) || 'To be confirmed',
      215,
      8.5
    ).slice(0, 3);
    addressLines.forEach((line, index) => {
      doc.drawText(line, MARGIN + 260, bandY + 30 + index * 11, { size: 8.5 });
    });

    doc.y = bandY + 82;
    return;
  }

  // Continuation header
  doc.drawText('SOLVIX', MARGIN, 42, { size: 14, font: 'bold', color: [0.05, 0.09, 0.18] });
  doc.drawText(`Quotation ${quotation.quotation_code} (continued)`, PAGE_WIDTH - MARGIN - 260, 42, {
    size: 9,
    color: [0.42, 0.47, 0.55],
    align: 'right',
    maxWidth: 260,
  });
  doc.line(MARGIN, 52, PAGE_WIDTH - MARGIN, 52, { color: [0.85, 0.88, 0.92] });
  doc.y = 66;
}

function drawTableHeader(doc) {
  doc.rect(MARGIN, doc.y, CONTENT_WIDTH, 22, {
    fill: [0.08, 0.14, 0.26],
  });
  COLUMNS.forEach((column, index) => {
    doc.drawText(column.label, columnX(index) + (column.align === 'right' ? 0 : 4), doc.y + 14, {
      size: 7.5,
      font: 'bold',
      color: [1, 1, 1],
      align: column.align,
      maxWidth: column.width - 8,
    });
  });
  doc.y += 22;
}

function drawTableRow(doc, item, index, onNewPage) {
  const descriptionLines = wrapText(item.line_item || 'Item', COLUMNS[1].width - 8, 8.2);
  const rowHeight = Math.max(20, descriptionLines.length * 10 + 8);
  doc.ensureSpace(rowHeight + 2, onNewPage);

  const rowY = doc.y;
  if (index % 2 === 1) {
    doc.rect(MARGIN, rowY, CONTENT_WIDTH, rowHeight, { fill: [0.975, 0.98, 0.99] });
  }
  doc.line(MARGIN, rowY + rowHeight, PAGE_WIDTH - MARGIN, rowY + rowHeight, {
    color: [0.90, 0.92, 0.95],
    width: 0.5,
  });

  const cells = [
    String(index + 1),
    null,
    `${Number(item.quantity)}`,
    item.unit || 'piece',
    money(item.unit_price),
    `${Number(item.tax_rate || 0)}%`,
    money(item.total_price),
  ];

  COLUMNS.forEach((column, colIndex) => {
    if (column.key === 'description') return;
    doc.drawText(cells[colIndex], columnX(colIndex) + (column.align === 'right' ? 0 : 4), rowY + 13, {
      size: 8,
      align: column.align,
      maxWidth: column.width - 8,
    });
  });

  descriptionLines.forEach((line, lineIndex) => {
    doc.drawText(line, columnX(1) + 4, rowY + 13 + lineIndex * 10, { size: 8.2 });
  });

  if (item.category_name && descriptionLines.length === 1) {
    doc.drawText(item.category_name, columnX(1) + 4, rowY + 23, {
      size: 6.5,
      color: [0.52, 0.57, 0.64],
    });
  }

  doc.y = rowY + rowHeight;
}

function drawTotals(doc, bundle) {
  const { quotation } = bundle;
  const labelX = PAGE_WIDTH - MARGIN - 245;
  const valueX = PAGE_WIDTH - MARGIN - 120;
  const valueWidth = 120;

  doc.ensureSpace(150, (d) => drawContinuationHeader(d, bundle));

  doc.line(labelX, doc.y, PAGE_WIDTH - MARGIN, doc.y, { color: [0.88, 0.91, 0.95] });
  doc.y += 10;

  const row = (label, value, bold = false, color = [0.12, 0.15, 0.2]) => {
    doc.drawText(label, labelX, doc.y + 9, {
      size: bold ? 10 : 9,
      font: bold ? 'bold' : 'regular',
      color,
    });
    doc.drawText(value, valueX, doc.y + 9, {
      size: bold ? 10 : 9,
      font: bold ? 'bold' : 'regular',
      color,
      align: 'right',
      maxWidth: valueWidth,
    });
    doc.y += bold ? 20 : 16;
  };

  row('Subtotal', money(quotation.subtotal));
  if (Number(quotation.discount_amount) > 0) {
    row('Discount', `- ${money(quotation.discount_amount)}`);
  }
  row('Tax', money(quotation.tax_amount));
  if (Number(quotation.installation_charges) > 0) {
    row('Installation charges (included)', money(quotation.installation_charges));
  }
  if (Number(quotation.other_charges) > 0) {
    row('Other charges (included)', money(quotation.other_charges));
  }

  doc.rect(labelX, doc.y, PAGE_WIDTH - MARGIN - labelX, 28, {
    fill: [0.08, 0.14, 0.26],
  });
  doc.drawText('GRAND TOTAL', labelX + 8, doc.y + 18, {
    size: 10,
    font: 'bold',
    color: [1, 1, 1],
  });
  doc.drawText(money(quotation.total_amount), valueX, doc.y + 18, {
    size: 11,
    font: 'bold',
    color: [1, 1, 1],
    align: 'right',
    maxWidth: valueWidth,
  });
  doc.y += 38;
}

function drawContinuationHeader(doc, bundle, { includeTableHeader = false } = {}) {
  drawHeader(doc, bundle, true);
  if (includeTableHeader) drawTableHeader(doc);
}

function drawTerms(doc, bundle) {
  const { quotation } = bundle;
  const sections = [];

  sections.push({
    title: 'PAYMENT TERMS',
    body: quotation.payment_terms || 'Payment terms to be agreed with SOLVIX before order confirmation.',
  });

  if (quotation.warranty_terms && String(quotation.warranty_terms).trim()) {
    sections.push({ title: 'WARRANTY TERMS', body: quotation.warranty_terms });
  } else {
    sections.push({
      title: 'WARRANTY TERMS',
      body:
        'No warranty terms have been configured for this quotation. Manufacturer warranties are ' +
        'subject to the manufacturer documentation supplied with the equipment and are not asserted here.',
    });
  }

  sections.push({
    title: 'TERMS & CONDITIONS',
    body:
      quotation.terms_and_conditions ||
      'This quotation is valid until the stated validity date. Prices exclude any scope not listed in ' +
      'the bill of materials. Site conditions, statutory approvals, net-metering charges and any ' +
      'government levies not listed are outside this quotation unless expressly included. ' +
      'System specifications and warranties are limited to the configured catalogue data.',
  });

  sections.push({
    title: 'IMPORTANT',
    body:
      'This is a computer-generated quotation. Product specifications and manufacturer warranties ' +
      'are only as configured and verified in the SOLVIX catalogue. Final installation is subject to ' +
      'site verification and the approved survey.',
  });

  doc.ensureSpace(70, (d) => drawContinuationHeader(d, bundle));
  doc.moveDown(6);

  for (const section of sections) {
    doc.ensureSpace(34, (d) => drawContinuationHeader(d, bundle));
    doc.drawText(section.title, MARGIN, doc.y + 9, {
      size: 7.5,
      font: 'bold',
      color: [0.42, 0.47, 0.55],
    });
    doc.y += 15;
    doc.write(section.body, { size: 8.2, lineHeight: 1.45, maxWidth: CONTENT_WIDTH });
    doc.moveDown(6);
  }
}

export function generateQuotationPdf(bundle) {
  if (!bundle?.quotation) throw new Error('Quotation data is required to generate a PDF.');

  const doc = new PdfBuilder();
  const onNewPage = (d) => drawContinuationHeader(d, bundle, { includeTableHeader: true });

  drawHeader(doc, bundle, false);
  drawTableHeader(doc);

  bundle.items.forEach((item, index) => drawTableRow(doc, item, index, onNewPage));

  doc.y += 8;
  drawTotals(doc, bundle);
  drawTerms(doc, bundle);

  return doc.finalize({
    footerLeft: `SOLVIX | Quotation ${bundle.quotation.quotation_code}`,
    footerRight: 'Computer generated',
  });
}

export function quotationPdfFilename(quotation) {
  const code = String(quotation?.quotation_code || 'quotation').replace(/[^A-Za-z0-9_-]/g, '');
  return `SOLVIX-${code}.pdf`;
}

export default generateQuotationPdf;
