import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PortalLayout from '@/components/PortalLayout';
import QuotationPreview from '@/components/quotation/QuotationPreview';
import { useAuth } from '@/context/auth';
import { quotationsApi } from '@/services/api';
import {
  ArrowLeft,
  Edit3,
  Trash2,
  Send,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Download,
  Printer,
  ShoppingCart,
  Eye,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react';
import {
  downloadBlob,
  formatCurrency,
  formatDate,
  formatDateTime,
  statusClass,
  statusLabel,
} from '@/lib/quotation';

const MANAGER_ROLES = ['admin', 'manager', 'sales_manager', 'sales_head', 'operations_manager'];

export default function QuotationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [comment, setComment] = useState('');
  const [internalComment, setInternalComment] = useState(false);

  const isManager =
    user?.account_type === 'admin' ||
    MANAGER_ROLES.includes(String(user?.role || '').toLowerCase());

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await quotationsApi.getQuotation(id);
      setBundle(res.data);
    } catch (err) {
      setError(err?.message || 'Failed to load quotation.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const runAction = async (action, fallbackMessage) => {
    try {
      setBusy(true);
      setError(null);
      setNotice(null);
      const res = await action();
      if (res?.data?.quotation) setBundle(res.data);
      setNotice(res?.message || fallbackMessage);
    } catch (err) {
      setError(err?.message || 'Action failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = () => runAction(() => quotationsApi.submitQuotation(id), 'Quotation submitted.');
  const handleApprove = () => runAction(() => quotationsApi.approveQuotation(id), 'Quotation approved.');
  const handleSend = () => runAction(() => quotationsApi.sendQuotation(id), 'Quotation marked as sent.');
  const handleViewed = () => runAction(() => quotationsApi.markQuotationViewed(id), 'Marked as viewed.');
  const handleAccept = () =>
    runAction(
      () => quotationsApi.acceptQuotation(id, { notes: 'Customer acceptance recorded by Sales' }),
      'Quotation accepted.'
    );
  const handleConvert = () => runAction(() => quotationsApi.convertQuotation(id), 'Quotation converted.');
  const handleDelete = async () => {
    if (!window.confirm('Delete this draft quotation? This cannot be undone.')) return;
    try {
      setBusy(true);
      await quotationsApi.deleteQuotation(id);
      navigate('/sales/quotations');
    } catch (err) {
      setError(err?.message || 'Failed to delete quotation.');
      setBusy(false);
    }
  };
  const handleReject = () => {
    const reason = window.prompt('Enter the customer rejection reason:');
    if (!reason || !reason.trim()) return;
    runAction(() => quotationsApi.rejectQuotation(id, { reason: reason.trim() }), 'Quotation rejected.');
  };
  const handleDownload = async () => {
    try {
      const blob = await quotationsApi.downloadQuotationPdf(id);
      downloadBlob(blob, `${bundle?.quotation?.quotation_code || 'quotation'}.pdf`);
    } catch (err) {
      setError(err?.message || 'Failed to download PDF.');
    }
  };
  const handleComment = async (event) => {
    event.preventDefault();
    if (!comment.trim()) return;
    try {
      setBusy(true);
      await quotationsApi.addComment(id, { message: comment.trim(), is_internal: internalComment });
      setComment('');
      setInternalComment(false);
      await load();
      setNotice('Comment added.');
    } catch (err) {
      setError(err?.message || 'Failed to add comment.');
    } finally {
      setBusy(false);
    }
  };

  const quotation = bundle?.quotation;
  const order = bundle?.order;
  const status = quotation?.status;
  const canEdit = status === 'draft' || (status === 'pending_approval' && isManager);

  return (
    <PortalLayout
      title={quotation ? quotation.quotation_code : 'Quotation'}
      subtitle={quotation ? `${quotation.system_capacity_kw} kW ${quotation.system_type} system` : 'Loading quotation…'}
      actions={
        <div className="q-page-actions">
          <Link to="/sales/quotations" className="crm-btn crm-btn-secondary crm-btn-sm">
            <ArrowLeft size={15} /> Back
          </Link>
          {quotation && (
            <>
              <button type="button" className="crm-btn crm-btn-secondary crm-btn-sm" onClick={handleDownload}>
                <Download size={15} /> PDF
              </button>
              <button
                type="button"
                className="crm-btn crm-btn-secondary crm-btn-sm q-no-print"
                onClick={() => window.print()}
              >
                <Printer size={15} /> Print
              </button>
            </>
          )}
          {canEdit && (
            <Link to={`/sales/quotations/${id}/edit`} className="crm-btn crm-btn-secondary crm-btn-sm">
              <Edit3 size={15} /> Edit
            </Link>
          )}
          {status === 'draft' && (
            <>
              <button type="button" className="crm-btn crm-btn-primary crm-btn-sm" onClick={handleSubmit} disabled={busy}>
                <Send size={15} /> Submit
              </button>
              <button type="button" className="crm-btn crm-btn-secondary crm-btn-sm" onClick={handleDelete} disabled={busy}>
                <Trash2 size={15} /> Delete
              </button>
            </>
          )}
          {['pending_approval', 'under_review'].includes(status) && isManager && (
            <button type="button" className="crm-btn crm-btn-primary crm-btn-sm" onClick={handleApprove} disabled={busy}>
              <CheckCircle2 size={15} /> Approve
            </button>
          )}
          {status === 'approved' && (
            <button type="button" className="crm-btn crm-btn-primary crm-btn-sm" onClick={handleSend} disabled={busy}>
              <Send size={15} /> Send to customer
            </button>
          )}
          {status === 'sent' && (
            <button type="button" className="crm-btn crm-btn-secondary crm-btn-sm" onClick={handleViewed} disabled={busy}>
              <Eye size={15} /> Mark viewed
            </button>
          )}
          {['sent', 'viewed'].includes(status) && (
            <>
              <button type="button" className="crm-btn crm-btn-primary crm-btn-sm" onClick={handleAccept} disabled={busy}>
                <CheckCircle2 size={15} /> Record acceptance
              </button>
              <button type="button" className="crm-btn crm-btn-secondary crm-btn-sm" onClick={handleReject} disabled={busy}>
                <XCircle size={15} /> Reject
              </button>
            </>
          )}
          {status === 'accepted' && !order && (
            <button type="button" className="crm-btn crm-btn-primary crm-btn-sm" onClick={handleConvert} disabled={busy}>
              <ShoppingCart size={15} /> Convert to order
            </button>
          )}
          {order && (
            <Link to={`/sales/orders/${order.id}`} className="crm-btn crm-btn-primary crm-btn-sm">
              <ShoppingCart size={15} /> Open order
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
      {notice && <div className="q-alert success">{notice}</div>}

      {loading ? (
        <div className="q-loading">Loading quotation…</div>
      ) : !quotation ? (
        <div className="q-empty">Quotation not found.</div>
      ) : (
        <div className="q-builder-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="q-order-summary">
              <div className="q-summary-cell">
                <small>Status</small>
                <span className={`q-badge ${statusClass(status)}`}>{statusLabel(status)}</span>
              </div>
              <div className="q-summary-cell">
                <small>Total</small>
                <b>{formatCurrency(quotation.total_amount)}</b>
              </div>
              <div className="q-summary-cell">
                <small>Customer</small>
                <b>{bundle.customer?.company_name || bundle.customer?.contact_name || '—'}</b>
              </div>
              <div className="q-summary-cell">
                <small>Valid until</small>
                <b>{formatDate(quotation.validity_date)}</b>
              </div>
            </div>

            {quotation.approval_required && ['draft', 'pending_approval'].includes(status) && (
              <div className="q-alert warning">
                This quotation requires manager approval before it can be sent to the customer.
              </div>
            )}
            {status === 'rejected' && quotation.rejection_reason && (
              <div className="q-alert error">Rejection reason: {quotation.rejection_reason}</div>
            )}

            <QuotationPreview bundle={bundle} />

            {quotation.internal_notes && (
              <div className="q-panel q-no-print">
                <div className="q-panel-header">
                  <span className="q-panel-title">Internal notes</span>
                  {String(quotation.internal_notes).startsWith('[AI draft]') && <span className="q-badge" style={{ marginLeft: 8 }}>AI draft · review before sending</span>}
                </div>
                <div className="q-panel-body">
                  <p style={{ color: 'var(--text-soft)', whiteSpace: 'pre-wrap', margin: 0 }}>{quotation.internal_notes}</p>
                </div>
              </div>
            )}
          </div>

          <aside className="q-sticky q-no-print">
            <div className="q-panel">
              <div className="q-panel-header">
                <span className="q-panel-title">Workflow history</span>
              </div>
              <div className="q-panel-body">
                <div className="q-timeline">
                  {(bundle.statusHistory || []).length === 0 ? (
                    <div className="q-hint">No history recorded yet.</div>
                  ) : (
                    bundle.statusHistory.map((entry) => (
                      <div className="q-timeline-item" key={entry.id}>
                        <div className="q-timeline-title">
                          {entry.previous_status
                            ? `${statusLabel(entry.previous_status)} → ${statusLabel(entry.new_status)}`
                            : statusLabel(entry.new_status)}
                        </div>
                        <div className="q-timeline-meta">
                          {formatDateTime(entry.changed_at)}
                          {entry.changed_by_profile?.full_name
                            ? ` · ${entry.changed_by_profile.full_name}`
                            : ''}
                        </div>
                        {entry.notes && <div className="q-timeline-note">{entry.notes}</div>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="q-panel">
              <div className="q-panel-header">
                <span className="q-panel-title">
                  <MessageSquare size={15} style={{ verticalAlign: '-2px', marginRight: 6 }} />
                  Comments
                </span>
              </div>
              <div className="q-panel-body">
                {(bundle.comments || []).length === 0 ? (
                  <div className="q-hint">No comments yet.</div>
                ) : (
                  bundle.comments.map((row) => (
                    <div
                      key={row.id}
                      className={`q-comment ${row.is_internal ? 'internal' : row.author_type === 'customer' ? 'customer' : ''}`}
                    >
                      <div className="q-comment-meta">
                        <span>
                          {row.author?.full_name || row.author?.email || row.author_type || 'User'}
                          {row.is_internal ? ' · internal' : ''}
                        </span>
                        <span>{formatDateTime(row.created_at)}</span>
                      </div>
                      <div className="q-comment-body">{row.message}</div>
                    </div>
                  ))
                )}

                <form onSubmit={handleComment} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <textarea
                    className="q-textarea"
                    placeholder="Add a comment…"
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    <input
                      type="checkbox"
                      checked={internalComment}
                      onChange={(event) => setInternalComment(event.target.checked)}
                    />
                    Internal only (hidden from customer)
                  </label>
                  <button type="submit" className="crm-btn crm-btn-secondary crm-btn-sm" disabled={busy || !comment.trim()}>
                    Post comment
                  </button>
                </form>
              </div>
            </div>

            {order && (
              <div className="q-panel">
                <div className="q-panel-header">
                  <span className="q-panel-title">Linked order</span>
                </div>
                <div className="q-panel-body">
                  <div className="q-order-summary">
                    <div className="q-summary-cell">
                      <small>Order</small>
                      <b>{order.order_code}</b>
                    </div>
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
                  </div>
                  <Link to={`/sales/orders/${order.id}`} className="crm-btn crm-btn-primary crm-btn-sm">
                    View order
                  </Link>
                </div>
              </div>
            )}
          </aside>
        </div>
      )}
    </PortalLayout>
  );
}
