import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PortalLayout from '@/components/PortalLayout';
import PaymentCard from '@/components/PaymentCard';
import { quotationsApi } from '@/services/api';
import { ArrowLeft, FileText, AlertTriangle, Package } from 'lucide-react';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  statusClass,
  statusLabel,
} from '@/lib/quotation';

export default function CustomerOrderDetail() {
  const { id } = useParams();
  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await quotationsApi.getMyOrder(id);
      setBundle(res.data);
    } catch (err) {
      setError(err?.message || 'Failed to load your order.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const order = bundle?.order;
  const quotation = bundle?.quotation;
  const payments = bundle?.payments || [];
  const items = bundle?.items || [];

  return (
    <PortalLayout
      title={order ? order.order_code : 'Order'}
      subtitle={order ? `${order.system_capacity_kw} kW ${order.system_type} solar system` : 'Loading order…'}
      actions={
        <div className="q-page-actions">
          <Link to="/customer/orders" className="crm-btn crm-btn-secondary crm-btn-sm">
            <ArrowLeft size={15} /> Back
          </Link>
          {quotation && (
            <Link to={`/customer/quotations/${quotation.id}`} className="crm-btn crm-btn-secondary crm-btn-sm">
              <FileText size={15} /> Quotation
            </Link>
          )}
        </div>
      }
    >
      {error && (
        <div className="q-alert error">
          <AlertTriangle size={15} style={{ verticalAlign: '-2px', marginRight: 6 }} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="q-loading">Loading order…</div>
      ) : !order ? (
        <div className="q-empty">Order not found.</div>
      ) : (
        <>
          <div className="q-order-summary">
            <div className="q-summary-cell">
              <small>Status</small>
              <span className={`q-badge ${statusClass(order.status, 'order')}`}>
                {statusLabel(order.status, 'order')}
              </span>
            </div>
            <div className="q-summary-cell">
              <small>Payment</small>
              <span className={`q-badge ${statusClass(order.payment_status, 'payment')}`}>
                {statusLabel(order.payment_status, 'payment')}
              </span>
            </div>
            <div className="q-summary-cell">
              <small>Total</small>
              <b>{formatCurrency(order.total_amount)}</b>
            </div>
            <div className="q-summary-cell">
              <small>Paid</small>
              <b>{formatCurrency(order.advance_paid)}</b>
            </div>
            <div className="q-summary-cell">
              <small>Balance due</small>
              <b style={{ color: Number(order.balance_due) > 0 ? 'var(--c-amber-soft)' : 'var(--c-green-soft)' }}>
                {formatCurrency(order.balance_due)}
              </b>
            </div>
            <div className="q-summary-cell">
              <small>Installation</small>
              <b>{formatDate(order.scheduled_install_date)}</b>
            </div>
          </div>

          <div className="q-builder-grid">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {Number(order.balance_due) > 0 && !['cancelled', 'refunded'].includes(order.status) && (
                <PaymentCard orderId={order.id} total={order.total_amount} balance={order.balance_due} onPaid={load} onError={setError} />
              )}
              <section className="q-panel">
                <div className="q-panel-header">
                  <span className="q-panel-title">
                    <Package size={15} style={{ verticalAlign: '-2px', marginRight: 6 }} />
                    System scope
                  </span>
                </div>
                <div className="q-panel-body">
                  <div className="q-order-summary">
                    <div className="q-summary-cell">
                      <small>System type</small>
                      <b style={{ textTransform: 'capitalize' }}>{order.system_type?.replace('-', ' ')}</b>
                    </div>
                    <div className="q-summary-cell">
                      <small>Capacity</small>
                      <b>{formatNumber(order.system_capacity_kw)} kW</b>
                    </div>
                    <div className="q-summary-cell">
                      <small>Quotation</small>
                      <b>{quotation?.quotation_code || '—'}</b>
                    </div>
                    <div className="q-summary-cell">
                      <small>Ordered on</small>
                      <b>{formatDate(order.created_at)}</b>
                    </div>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table className="q-line-table">
                      <thead>
                        <tr>
                          <th>Description</th>
                          <th>Qty</th>
                          <th>Unit</th>
                          <th className="q-num">Rate</th>
                          <th className="q-num">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="q-hint">No line items recorded.</td>
                          </tr>
                        ) : (
                          items.map((item) => (
                            <tr key={item.id}>
                              <td>{item.line_item}</td>
                              <td>{formatNumber(item.quantity, 3)}</td>
                              <td>{item.unit || '—'}</td>
                              <td className="q-num">{formatCurrency(item.unit_price)}</td>
                              <td className="q-num">{formatCurrency(item.total_price)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>

              <section className="q-panel">
                <div className="q-panel-header">
                  <span className="q-panel-title">Payment history</span>
                </div>
                <div className="q-panel-body">
                  {payments.length === 0 ? (
                    <div className="q-hint">No payments recorded yet.</div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="q-line-table">
                        <thead>
                          <tr>
                            <th>Payment</th>
                            <th>Type</th>
                            <th>Method</th>
                            <th>Reference</th>
                            <th>Paid on</th>
                            <th className="q-num">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payments.map((row) => (
                            <tr key={row.id}>
                              <td>{row.payment_code}</td>
                              <td style={{ textTransform: 'capitalize' }}>{row.payment_type}</td>
                              <td style={{ textTransform: 'capitalize' }}>{String(row.payment_method || '').replace(/_/g, ' ')}</td>
                              <td>{row.transaction_reference || '—'}</td>
                              <td>{formatDate(row.paid_at)}</td>
                              <td className="q-num">{formatCurrency(row.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </section>
            </div>

            <aside className="q-sticky">
              <div className="q-panel">
                <div className="q-panel-header">
                  <span className="q-panel-title">Progress</span>
                </div>
                <div className="q-panel-body">
                  <div className="q-timeline">
                    {(bundle.statusHistory || []).length === 0 ? (
                      <div className="q-hint">No progress updates yet.</div>
                    ) : (
                      bundle.statusHistory.map((entry) => (
                        <div className="q-timeline-item" key={entry.id}>
                          <div className="q-timeline-title">{statusLabel(entry.new_status, 'order')}</div>
                          <div className="q-timeline-meta">{formatDateTime(entry.changed_at)}</div>
                          {entry.notes && <div className="q-timeline-note">{entry.notes}</div>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </>
      )}
    </PortalLayout>
  );
}
