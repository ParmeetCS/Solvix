import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import CustomerPortalLayout from './CustomerPortalLayout';
import QuotationPreview from '@/components/quotation/QuotationPreview';
import { quotationsApi } from '@/services/api';
import {
  ArrowLeft,
  Download,
  CheckCircle2,
  XCircle,
  ShoppingCart,
  MessageSquare,
  AlertTriangle,
  Printer,
} from 'lucide-react';
import {
  downloadBlob,
  formatCurrency,
  formatDateTime,
  statusClass,
  statusLabel,
} from '@/lib/quotation';

export default function CustomerQuotationDetail() {
  const { id } = useParams();
  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [acceptComment, setAcceptComment] = useState('');
  const [question, setQuestion] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await quotationsApi.getMyQuotation(id);
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

  const quotation = bundle?.quotation;
  const order = bundle?.order;
  const canRespond = ['sent', 'viewed'].includes(quotation?.status);

  const handleAccept = async () => {
    if (!window.confirm('Accept this quotation and create your order?')) return;
    try {
      setBusy(true);
      setError(null);
      setNotice(null);
      const res = await quotationsApi.acceptMyQuotation(id, { comment: acceptComment || undefined });
      if (res.data?.quotation) setBundle(res.data);
      setAcceptComment('');
      setNotice(res.message || 'Quotation accepted.');
      await load();
    } catch (err) {
      setError(err?.message || 'Failed to accept quotation.');
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    const reason = window.prompt('Please tell us why you are rejecting this quotation:');
    if (!reason || !reason.trim()) return;
    try {
      setBusy(true);
      setError(null);
      setNotice(null);
      const res = await quotationsApi.rejectMyQuotation(id, { reason: reason.trim() });
      if (res.data?.quotation) setBundle(res.data);
      setNotice(res.message || 'Quotation rejected.');
      await load();
    } catch (err) {
      setError(err?.message || 'Failed to reject quotation.');
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = async () => {
    try {
      const blob = await quotationsApi.downloadMyQuotationPdf(id);
      downloadBlob(blob, `${quotation?.quotation_code || 'quotation'}.pdf`);
    } catch (err) {
      setError(err?.message || 'Failed to download PDF.');
    }
  };

  const handleQuestion = async (event) => {
    event.preventDefault();
    if (!question.trim()) return;
    try {
      setBusy(true);
      await quotationsApi.addMyComment(id, { message: question.trim() });
      setQuestion('');
      await load();
      setNotice('Your question has been sent to SOLVIX.');
    } catch (err) {
      setError(err?.message || 'Failed to send your question.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <CustomerPortalLayout
      title={quotation ? quotation.quotation_code : 'Quotation'}
      subtitle={quotation ? `${quotation.system_capacity_kw} kW ${quotation.system_type} solar system` : 'Loading…'}
      actions={
        <div className="q-page-actions">
          <Link to="/customer/quotations" className="crm-btn crm-btn-secondary crm-btn-sm">
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
          {order && (
            <Link to={`/customer/orders/${order.id}`} className="crm-btn crm-btn-primary crm-btn-sm">
              <ShoppingCart size={15} /> My order
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
            <div className="q-order-summary q-no-print">
              <div className="q-summary-cell">
                <small>Status</small>
                <span className={`q-badge ${statusClass(quotation.status)}`}>
                  {statusLabel(quotation.status)}
                </span>
              </div>
              <div className="q-summary-cell">
                <small>Total</small>
                <b>{formatCurrency(quotation.total_amount)}</b>
              </div>
              <div className="q-summary-cell">
                <small>Valid until</small>
                <b>{quotation.validity_date || '—'}</b>
              </div>
              <div className="q-summary-cell">
                <small>Order</small>
                <b>{order?.order_code || 'Not created yet'}</b>
              </div>
            </div>

            {canRespond && (
              <section className="q-panel q-no-print">
                <div className="q-panel-header">
                  <span className="q-panel-title">Respond to this quotation</span>
                </div>
                <div className="q-panel-body">
                  <div className="q-field">
                    <label htmlFor="accept-comment">Message (optional)</label>
                    <textarea
                      id="accept-comment"
                      className="q-textarea"
                      placeholder="Add any notes for the SOLVIX team…"
                      value={acceptComment}
                      onChange={(event) => setAcceptComment(event.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="crm-btn crm-btn-primary"
                      onClick={handleAccept}
                      disabled={busy}
                    >
                      <CheckCircle2 size={15} /> Accept quotation
                    </button>
                    <button
                      type="button"
                      className="crm-btn crm-btn-secondary"
                      onClick={handleReject}
                      disabled={busy}
                    >
                      <XCircle size={15} /> Reject
                    </button>
                  </div>
                  <p className="q-hint">
                    Accepting this quotation creates your order. SOLVIX will then confirm the delivery and
                    installation schedule with you.
                  </p>
                </div>
              </section>
            )}

            {quotation.status === 'rejected' && quotation.rejection_reason && (
              <div className="q-alert error q-no-print">Rejection reason: {quotation.rejection_reason}</div>
            )}
            {quotation.status === 'expired' && (
              <div className="q-alert warning q-no-print">
                This quotation has passed its validity date. Please contact SOLVIX for an updated quotation.
              </div>
            )}

            <QuotationPreview bundle={bundle} />
          </div>

          <aside className="q-sticky q-no-print">
            <div className="q-panel">
              <div className="q-panel-header">
                <span className="q-panel-title">
                  <MessageSquare size={15} style={{ verticalAlign: '-2px', marginRight: 6 }} />
                  Questions &amp; replies
                </span>
              </div>
              <div className="q-panel-body">
                {(bundle.comments || []).length === 0 ? (
                  <div className="q-hint">No messages yet. Ask a question below.</div>
                ) : (
                  bundle.comments.map((row) => (
                    <div
                      key={row.id}
                      className={`q-comment ${row.author_type === 'customer' ? 'customer' : ''}`}
                    >
                      <div className="q-comment-meta">
                        <span>{row.author?.full_name || (row.author_type === 'customer' ? 'You' : 'SOLVIX')}</span>
                        <span>{formatDateTime(row.created_at)}</span>
                      </div>
                      <div className="q-comment-body">{row.message}</div>
                    </div>
                  ))
                )}
                <form onSubmit={handleQuestion} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <textarea
                    className="q-textarea"
                    placeholder="Ask SOLVIX a question about this quotation…"
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                  />
                  <button type="submit" className="crm-btn crm-btn-secondary crm-btn-sm" disabled={busy || !question.trim()}>
                    Send question
                  </button>
                </form>
              </div>
            </div>

            {order && (
              <div className="q-panel">
                <div className="q-panel-header">
                  <span className="q-panel-title">Your order</span>
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
                  </div>
                  <Link to={`/customer/orders/${order.id}`} className="crm-btn crm-btn-primary crm-btn-sm">
                    View order
                  </Link>
                </div>
              </div>
            )}
          </aside>
        </div>
      )}
    </CustomerPortalLayout>
  );
}
