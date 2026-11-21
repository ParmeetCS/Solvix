import { formatCurrency, formatDate, formatNumber } from '@/lib/quotation';

function addressLines(address) {
  if (!address) return [];
  return [
    address.street,
    [address.city, address.state].filter(Boolean).join(', '),
    [address.postal_code, address.country].filter(Boolean).join(' '),
  ].filter(Boolean);
}

/**
 * Printable, customer-facing quotation preview.
 * All monetary values come from the persisted quotation record. The preview
 * never recomputes the authoritative total.
 */
export default function QuotationPreview({ bundle, className = '' }) {
  if (!bundle?.quotation) return null;

  const { quotation, items = [], customer, customerAddress, package: pkg } = bundle;
  const customerName = customer?.company_name || customer?.contact_name || 'Customer';
  const customerAddressLines = addressLines(customerAddress);
  const installationAddress = quotation.installation_address;

  return (
    <article className={`q-preview ${className}`.trim()}>
      <header className="q-preview-header">
        <div>
          <div className="q-preview-brand">
            SOLVIX
            <small>Solar Installation Management</small>
          </div>
        </div>
        <div className="q-preview-title">
          <h2>QUOTATION</h2>
          <p>{quotation.quotation_code}</p>
          <p>Issued {formatDate(quotation.created_at)}</p>
        </div>
      </header>

      <section className="q-preview-meta">
        <div>
          <h4>Prepared for</h4>
          <p>
            <strong>{customerName}</strong>
            {customer?.customer_code && <><br />{customer.customer_code}</>}
            {customer?.email && <><br />{customer.email}</>}
            {customer?.phone && <><br />{customer.phone}</>}
          </p>
        </div>
        <div>
          <h4>Installation address</h4>
          <p>
            {installationAddress
              ? installationAddress
              : customerAddressLines.length > 0
                ? customerAddressLines.map((line) => <span key={line}>{line}<br /></span>)
                : 'To be confirmed'}
          </p>
          <p style={{ marginTop: 8 }}>
            <strong>Valid until:</strong> {formatDate(quotation.validity_date)}
          </p>
        </div>
      </section>

      <section className="q-preview-system">
        <div>
          <small>System type</small>
          <b style={{ textTransform: 'capitalize' }}>{String(quotation.system_type || '').replace('-', ' ')}</b>
        </div>
        <div>
          <small>Capacity</small>
          <b>{formatNumber(quotation.system_capacity_kw)} kW</b>
        </div>
        {pkg?.name && (
          <div>
            <small>Package</small>
            <b>{pkg.name}</b>
          </div>
        )}
        <div>
          <small>Survey verified</small>
          <b>{quotation.survey_verified ? 'Yes' : 'Not linked'}</b>
        </div>
        <div>
          <small>Status</small>
          <b style={{ textTransform: 'capitalize' }}>{String(quotation.status || '').replace(/_/g, ' ')}</b>
        </div>
      </section>

      <table className="q-preview-table">
        <thead>
          <tr>
            <th style={{ width: 34 }}>#</th>
            <th>Description</th>
            <th>HSN</th>
            <th className="num">Qty</th>
            <th>Unit</th>
            <th className="num">Rate</th>
            <th className="num">Tax</th>
            <th className="num">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 18 }}>
                No bill-of-materials lines.
              </td>
            </tr>
          ) : (
            items.map((item, index) => (
              <tr key={item.id || `${item.line_item}-${index}`}>
                <td>{index + 1}</td>
                <td>
                  {item.line_item}
                  {item.category_name && (
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: 2 }}>
                      {item.category_name}
                    </div>
                  )}
                  {item.notes && (
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: 2 }}>{item.notes}</div>
                  )}
                </td>
                <td>{item.hsn_code || '—'}</td>
                <td className="num">{formatNumber(item.quantity, 3)}</td>
                <td>{item.unit || '—'}</td>
                <td className="num">{formatCurrency(item.unit_price)}</td>
                <td className="num">{formatNumber(item.tax_rate, 2)}%</td>
                <td className="num">{formatCurrency(item.total_price)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="q-preview-totals">
        <div className="row">
          <span>Subtotal</span>
          <span>{formatCurrency(quotation.subtotal)}</span>
        </div>
        {Number(quotation.discount_amount) > 0 && (
          <div className="row">
            <span>
              Discount
              {quotation.discount_type === 'percentage' ? ` (${formatNumber(quotation.discount_value, 2)}%)` : ''}
            </span>
            <span>- {formatCurrency(quotation.discount_amount)}</span>
          </div>
        )}
        <div className="row">
          <span>Tax</span>
          <span>{formatCurrency(quotation.tax_amount)}</span>
        </div>
        <div className="row grand">
          <span>Total payable</span>
          <span>{formatCurrency(quotation.total_amount)}</span>
        </div>
      </div>

      {quotation.payment_terms && (
        <section className="q-preview-section">
          <h4>Payment terms</h4>
          <p>{quotation.payment_terms}</p>
        </section>
      )}

      {quotation.warranty_terms && (
        <section className="q-preview-section">
          <h4>Warranty terms</h4>
          <p>{quotation.warranty_terms}</p>
        </section>
      )}

      {quotation.customer_notes && (
        <section className="q-preview-section">
          <h4>Notes</h4>
          <p>{quotation.customer_notes}</p>
        </section>
      )}

      <section className="q-preview-section">
        <h4>Terms &amp; conditions</h4>
        <p>{quotation.terms_and_conditions || '—'}</p>
      </section>

      <div className="q-preview-disclaimer">
        This quotation covers only the scope listed above. Statutory approvals, net-metering charges and any
        government levies not expressly listed are excluded. Product specifications and warranties are limited to
        the configured catalogue data; no additional manufacturer warranty or specification is implied. Figures
        shown are valid until the stated validity date.
      </div>

      <footer className="q-preview-footer">
        <span>{quotation.quotation_code}</span>
        <span>Generated by SOLVIX</span>
      </footer>
    </article>
  );
}
