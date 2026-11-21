import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import SalesLayout from './SalesLayout';
import { quotationsApi } from '@/services/api';
import {
  ArrowLeft,
  FileText,
  CreditCard,
  Warehouse,
  CheckCircle2,
  AlertTriangle,
  Truck,
  Package,
} from 'lucide-react';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  statusClass,
  statusLabel,
} from '@/lib/quotation';

const ORDER_TRANSITIONS = {
  pending_payment: ['confirmed', 'cancelled'],
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'awaiting_dispatch', 'cancelled'],
  processing: ['awaiting_dispatch', 'dispatched', 'cancelled'],
  in_production: ['awaiting_dispatch', 'cancelled'],
  awaiting_dispatch: ['dispatched', 'cancelled'],
  ready_for_install: ['dispatched', 'cancelled'],
  dispatched: ['installation_in_progress', 'completed', 'cancelled'],
  installing: ['installation_in_progress', 'completed', 'cancelled'],
  installation_in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  refunded: [],
};

const PAYMENT_METHODS = ['cash', 'cheque', 'bank_transfer', 'upi', 'card', 'finance', 'other'];
const PAYMENT_TYPES = ['advance', 'partial', 'full', 'refund'];
const REFERENCE_REQUIRED = ['cheque', 'bank_transfer', 'upi', 'card', 'finance'];

const EMPTY_PAYMENT = {
  amount: '',
  payment_type: 'advance',
  payment_method: 'bank_transfer',
  transaction_reference: '',
  paid_at: new Date().toISOString().slice(0, 10),
  notes: '',
};

export default function OrderDetail() {
  const { id } = useParams();
  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [payment, setPayment] = useState(EMPTY_PAYMENT);
  const [showPayment, setShowPayment] = useState(false);
  const [nextStatus, setNextStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await quotationsApi.getOrder(id);
      setBundle(res.data);
      setPayment((prev) => ({
        ...prev,
        amount:
          prev.amount ||
          (Number(res.data?.order?.balance_due) > 0 ? String(res.data.order.balance_due) : ''),
      }));
    } catch (err) {
      setError(err?.message || 'Failed to load order.');
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

  const availableTransitions = useMemo(
    () => (order ? ORDER_TRANSITIONS[order.status] || [] : []),
    [order]
  );

  const canHandoff =
    order &&
    !order.warehouse_handoff_at &&
    ['confirmed', 'processing', 'awaiting_dispatch'].includes(order.status) &&
    ['partial', 'paid'].includes(order.payment_status);

  const handleStatusUpdate = async () => {
    if (!nextStatus) return;
    const payload = { status: nextStatus, notes: statusNotes || null };
    if (nextStatus === 'cancelled') {
      const reason = window.prompt('Enter the cancellation reason:');
      if (!reason || !reason.trim()) return;
      payload.cancelled_reason = reason.trim();
      payload.notes = reason.trim();
    }
    try {
      setBusy(true);
      setError(null);
      setNotice(null);
      const res = await quotationsApi.updateOrder(id, payload);
      setBundle(res.data);
      setNextStatus('');
      setStatusNotes('');
      setNotice(res.message || 'Order updated.');
    } catch (err) {
      setError(err?.message || 'Failed to update order.');
    } finally {
      setBusy(false);
    }
  };

  const handleHandoff = async () => {
    if (!window.confirm('Hand this order off to the Warehouse team for preparation and dispatch?')) return;
    try {
      setBusy(true);
      setError(null);
      setNotice(null);
      const res = await quotationsApi.handoffOrder(id, { notes: statusNotes || null });
      setBundle(res.data);
      setNotice(res.message || 'Order handed off to Warehouse.');
    } catch (err) {
      setError(err?.message || 'Failed to hand off order.');
    } finally {
      setBusy(false);
    }
  };

  const handlePayment = async (event) => {
    event.preventDefault();
    try {
      setBusy(true);
      setError(null);
      setNotice(null);
      await quotationsApi.recordPayment(id, {
        amount: Number(payment.amount),
        payment_type: payment.payment_type,
        payment_method: payment.payment_method,
        transaction_reference: payment.transaction_reference || null,
        paid_at: payment.paid_at,
        notes: payment.notes || null,
      });
      setShowPayment(false);
      setPayment({ ...EMPTY_PAYMENT, paid_at: new Date().toISOString().slice(0, 10) });
      await load();
      setNotice('Payment recorded. The balance due has been recalculated.');
    } catch (err) {
      setError(err?.message || 'Failed to record payment.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SalesLayout
      title={order ? order.order_code : 'Order'}
      subtitle={order ? `${order.system_capacity_kw} kW ${order.system_type} order` : 'Loading order…'}
      actions={
        <div className="q-page-actions">
          <Link to="/sales/orders" className="crm-btn crm-btn-secondary crm-btn-sm">
            <ArrowLeft size={15} /> Back
          </Link>
          {quotation && (
            <Link to={`/sales/quotations/${quotation.id}`} className="crm-btn crm-btn-secondary crm-btn-sm">
              <FileText size={15} /> Quotation
            </Link>
          )}
          {order && (
            <button
              type="button"
              className="crm-btn crm-btn-primary crm-btn-sm"
              onClick={() => setShowPayment((value) => !value)}
            >
              <CreditCard size={15} /> Record payment
            </button>
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
      {notice && <div className="q-alert success">{notice}</div>}

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
              <small>Advance paid</small>
              <b>{formatCurrency(order.advance_paid)}</b>
            </div>
            <div className="q-summary-cell">
              <small>Balance due</small>
              <b style={{ color: Number(order.balance_due) > 0 ? '#fbbf24' : '#86efac' }}>
                {formatCurrency(order.balance_due)}
              </b>
            </div>
            <div className="q-summary-cell">
              <small>Warehouse</small>
              <b>{order.warehouse_handoff_at ? `Handed off ${formatDate(order.warehouse_handoff_at)}` : 'Not handed off'}</b>
            </div>
          </div>

          {showPayment && (
            <section className="q-panel">
              <div className="q-panel-header">
                <span className="q-panel-title">Record a verified payment</span>
              </div>
              <form className="q-panel-body" onSubmit={handlePayment}>
                <div className="q-alert info">
                  Payments entered here are recorded as manually verified. SOLVIX never marks a payment as an
                  online gateway success without provider verification.
                </div>
                <div className="q-grid-3">
                  <div className="q-field">
                    <label htmlFor="pay-amount">Amount</label>
                    <input
                      id="pay-amount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      className="q-input"
                      value={payment.amount}
                      onChange={(event) => setPayment({ ...payment, amount: event.target.value })}
                    />
                  </div>
                  <div className="q-field">
                    <label htmlFor="pay-type">Payment type</label>
                    <select
                      id="pay-type"
                      className="q-select"
                      value={payment.payment_type}
                      onChange={(event) => setPayment({ ...payment, payment_type: event.target.value })}
                    >
                      {PAYMENT_TYPES.map((value) => (
                        <option key={value} value={value}>
                          {statusLabel(value)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="q-field">
                    <label htmlFor="pay-method">Method</label>
                    <select
                      id="pay-method"
                      className="q-select"
                      value={payment.payment_method}
                      onChange={(event) => setPayment({ ...payment, payment_method: event.target.value })}
                    >
                      {PAYMENT_METHODS.map((value) => (
                        <option key={value} value={value}>
                          {statusLabel(value)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="q-grid-2">
                  <div className="q-field">
                    <label htmlFor="pay-reference">
                      Transaction reference {REFERENCE_REQUIRED.includes(payment.payment_method) ? '(required)' : ''}
                    </label>
                    <input
                      id="pay-reference"
                      type="text"
                      className="q-input"
                      value={payment.transaction_reference}
                      onChange={(event) => setPayment({ ...payment, transaction_reference: event.target.value })}
                    />
                  </div>
                  <div className="q-field">
                    <label htmlFor="pay-date">Paid on</label>
                    <input
                      id="pay-date"
                      type="date"
                      className="q-input"
                      value={payment.paid_at}
                      onChange={(event) => setPayment({ ...payment, paid_at: event.target.value })}
                    />
                  </div>
                </div>
                <div className="q-field">
                  <label htmlFor="pay-notes">Notes</label>
                  <input
                    id="pay-notes"
                    type="text"
                    className="q-input"
                    value={payment.notes}
                    onChange={(event) => setPayment({ ...payment, notes: event.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" className="crm-btn crm-btn-primary crm-btn-sm" disabled={busy}>
                    <CheckCircle2 size={14} /> {busy ? 'Saving…' : 'Save payment'}
                  </button>
                  <button
                    type="button"
                    className="crm-btn crm-btn-secondary crm-btn-sm"
                    onClick={() => setShowPayment(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </section>
          )}

          <div className="q-builder-grid">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <section className="q-panel">
                <div className="q-panel-header">
                  <span className="q-panel-title">
                    <Package size={15} style={{ verticalAlign: '-2px', marginRight: 6 }} />
                    Order scope
                  </span>
                </div>
                <div className="q-panel-body">
                  <div className="q-order-summary">
                    <div className="q-summary-cell">
                      <small>Customer</small>
                      <b>{bundle.customer?.company_name || bundle.customer?.contact_name || '—'}</b>
                    </div>
                    <div className="q-summary-cell">
                      <small>Quotation</small>
                      <b>{quotation?.quotation_code || '—'}</b>
                    </div>
                    <div className="q-summary-cell">
                      <small>System</small>
                      <b style={{ textTransform: 'capitalize' }}>
                        {order.system_type?.replace('-', ' ')} · {formatNumber(order.system_capacity_kw)} kW
                      </b>
                    </div>
                    <div className="q-summary-cell">
                      <small>Installation date</small>
                      <b>{formatDate(order.scheduled_install_date)}</b>
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

                  {order.notes && <div className="q-alert info">{order.notes}</div>}
                  {order.cancelled_reason && <div className="q-alert error">Cancelled: {order.cancelled_reason}</div>}
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
                            <th>Verified</th>
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
                              <td>
                                <span className={`q-badge ${row.gateway_verified ? 'success' : 'muted'}`}>
                                  {row.gateway_verified ? 'Gateway verified' : 'Manual'}
                                </span>
                              </td>
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
                  <span className="q-panel-title">Order controls</span>
                </div>
                <div className="q-panel-body">
                  {availableTransitions.length === 0 ? (
                    <div className="q-hint">No further status changes are available for this order.</div>
                  ) : (
                    <>
                      <div className="q-field">
                        <label htmlFor="next-status">Next status</label>
                        <select
                          id="next-status"
                          className="q-select"
                          value={nextStatus}
                          onChange={(event) => setNextStatus(event.target.value)}
                        >
                          <option value="">Select a status…</option>
                          {availableTransitions.map((value) => (
                            <option key={value} value={value}>
                              {statusLabel(value, 'order')}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="q-field">
                        <label htmlFor="status-notes">Notes</label>
                        <input
                          id="status-notes"
                          type="text"
                          className="q-input"
                          value={statusNotes}
                          onChange={(event) => setStatusNotes(event.target.value)}
                        />
                      </div>
                      <button
                        type="button"
                        className="crm-btn crm-btn-primary crm-btn-sm"
                        onClick={handleStatusUpdate}
                        disabled={busy || !nextStatus}
                      >
                        <Truck size={14} /> Update status
                      </button>
                    </>
                  )}

                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 12, marginTop: 4 }}>
                    {order.warehouse_handoff_at ? (
                      <div className="q-alert success">
                        <Warehouse size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />
                        Handed off to Warehouse on {formatDateTime(order.warehouse_handoff_at)}.
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="crm-btn crm-btn-primary crm-btn-sm"
                          onClick={handleHandoff}
                          disabled={busy || !canHandoff}
                          style={{ width: '100%' }}
                        >
                          <Warehouse size={14} /> Hand off to Warehouse
                        </button>
                        <p className="q-hint" style={{ marginTop: 8 }}>
                          The order must be confirmed and have an advance or full payment recorded before handoff.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="q-panel">
                <div className="q-panel-header">
                  <span className="q-panel-title">Status history</span>
                </div>
                <div className="q-panel-body">
                  <div className="q-timeline">
                    {(bundle.statusHistory || []).length === 0 ? (
                      <div className="q-hint">No status history recorded.</div>
                    ) : (
                      bundle.statusHistory.map((entry) => (
                        <div className="q-timeline-item" key={entry.id}>
                          <div className="q-timeline-title">
                            {entry.previous_status
                              ? `${statusLabel(entry.previous_status, 'order')} → ${statusLabel(entry.new_status, 'order')}`
                              : statusLabel(entry.new_status, 'order')}
                          </div>
                          <div className="q-timeline-meta">
                            {formatDateTime(entry.changed_at)}
                            {entry.changed_by_profile?.full_name ? ` · ${entry.changed_by_profile.full_name}` : ''}
                          </div>
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
    </SalesLayout>
  );
}
