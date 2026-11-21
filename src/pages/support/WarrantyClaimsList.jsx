import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SupportLayout from './SupportLayout';
import { supportApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import {
  FileCheck2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Search,
  Filter,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

export default function WarrantyClaimsList() {
  const { user } = useAuth();
  const isCustomer = user?.account_type === 'customer';

  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [status, setStatus] = useState('');
  const [claimType, setClaimType] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Review Modal State
  const [reviewingClaim, setReviewingClaim] = useState(null);
  const [reviewDecision, setReviewDecision] = useState('approved'); // 'approved' | 'rejected'
  const [reviewReason, setReviewReason] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    fetchClaims();
  }, [page, status, claimType]);

  const fetchClaims = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await supportApi.getClaims({ page, limit: 15, status, claim_type: claimType });
      const data = res.data || res;
      setClaims(data.claims || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.total || 0);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to load warranty claims.');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewReason.trim()) {
      alert('A technical resolution reason is strictly required to approve or reject a claim.');
      return;
    }

    try {
      setSubmittingReview(true);
      await supportApi.updateClaim(reviewingClaim.id, {
        status: reviewDecision,
        resolution: reviewReason,
        notes: reviewNotes
      });
      setReviewingClaim(null);
      setReviewReason('');
      setReviewNotes('');
      await fetchClaims();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to submit claim review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <SupportLayout
      title="Warranty Claims & Eligibility Review"
      subtitle="Thorough evaluation of hardware claims against verified delivery dates and manufacturer terms"
    >
      {/* Filters Bar */}
      <div className="support-filters-bar">
        <select
          className="support-select"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
        >
          <option value="">All Statuses</option>
          <option value="submitted">Submitted (Awaiting Review)</option>
          <option value="under_review">Under Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="completed">Completed</option>
        </select>

        <select
          className="support-select"
          value={claimType}
          onChange={(e) => { setClaimType(e.target.value); setPage(1); }}
        >
          <option value="">All Claim Types</option>
          <option value="repair">Component Repair</option>
          <option value="replacement">Equipment Replacement</option>
        </select>

        <button className="btn-secondary" onClick={fetchClaims} style={{ marginLeft: 'auto' }}>
          Refresh
        </button>
      </div>

      {/* Claims Table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
          <Loader2 className="animate-spin" size={36} color="#d8ee8e" />
        </div>
      ) : error ? (
        <div className="support-card" style={{ borderColor: '#ef4444' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#f87171' }}>
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        </div>
      ) : claims.length === 0 ? (
        <div className="support-card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <FileCheck2 size={40} color="#64748b" style={{ margin: '0 auto 1rem auto' }} />
          <h3 style={{ color: '#ffffff', margin: '0 0 0.5rem 0' }}>No warranty claims found</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
            There are currently no claims matching the selected filters.
          </p>
        </div>
      ) : (
        <div className="support-card" style={{ padding: 0 }}>
          <div className="support-table-container">
            <table className="support-table">
              <thead>
                <tr>
                  <th>Claim Code</th>
                  <th>Warranty Code</th>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Issue Description</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>Reviewed By</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {claims.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600, color: '#d8ee8e' }}>{c.claim_code}</td>
                    <td>
                      <Link to={`/support/warranties/${c.warranty_id}`} style={{ color: '#38bdf8', textDecoration: 'none' }}>
                        {c.warranties?.warranty_code || 'Warranty'}
                      </Link>
                    </td>
                    <td>{c.customers?.contact_name || 'Customer'}</td>
                    <td style={{ textTransform: 'capitalize' }}>{c.claim_type}</td>
                    <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.description}
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
                      {new Date(c.submitted_at).toLocaleDateString()}
                    </td>
                    <td>
                      <span className={`badge badge-${c.status}`}>
                        {c.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: '#cbd5e1' }}>
                      {c.profiles?.full_name || '—'}
                    </td>
                    <td>
                      {!isCustomer && c.status === 'submitted' || c.status === 'under_review' ? (
                        <button
                          className="btn-primary"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                          onClick={() => {
                            setReviewingClaim(c);
                            setReviewDecision('approved');
                            setReviewReason('');
                          }}
                        >
                          Review Claim
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          {c.resolution ? 'Decided' : 'Pending'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderTop: '1px solid #1e293b' }}>
              <span style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
                Page {page} of {totalPages} ({totalCount} total)
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn-secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  style={{ opacity: page <= 1 ? 0.5 : 1, padding: '0.4rem 0.75rem' }}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  className="btn-secondary"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  style={{ opacity: page >= totalPages ? 0.5 : 1, padding: '0.4rem 0.75rem' }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Review & Decision Modal */}
      {reviewingClaim && (
        <div className="modal-overlay" onClick={() => setReviewingClaim(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Review Warranty Claim: {reviewingClaim.claim_code}</h3>
              <button className="modal-close" onClick={() => setReviewingClaim(null)}>✕</button>
            </div>
            <form onSubmit={handleReviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Claim Summary */}
              <div style={{ background: '#0b1020', border: '1px solid #1e293b', borderRadius: '8px', padding: '1rem', fontSize: '0.8125rem' }}>
                <div style={{ color: '#94a3b8', marginBottom: '0.35rem' }}>Claimed Issue & Diagnosis:</div>
                <div style={{ color: '#ffffff', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                  {reviewingClaim.description}
                </div>
              </div>

              {/* Decision Selector */}
              <div className="support-form-group">
                <label className="support-form-label">Review Decision *</label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      borderRadius: '8px',
                      background: reviewDecision === 'approved' ? 'rgba(52, 211, 153, 0.15)' : '#0b1020',
                      border: `1px solid ${reviewDecision === 'approved' ? '#34d399' : '#1e293b'}`,
                      color: reviewDecision === 'approved' ? '#34d399' : '#94a3b8',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                    onClick={() => setReviewDecision('approved')}
                  >
                    <CheckCircle2 size={16} />
                    <span>Approve Claim</span>
                  </button>

                  <button
                    type="button"
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      borderRadius: '8px',
                      background: reviewDecision === 'rejected' ? 'rgba(239, 68, 68, 0.15)' : '#0b1020',
                      border: `1px solid ${reviewDecision === 'rejected' ? '#f87171' : '#1e293b'}`,
                      color: reviewDecision === 'rejected' ? '#f87171' : '#94a3b8',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                    onClick={() => setReviewDecision('rejected')}
                  >
                    <XCircle size={16} />
                    <span>Reject Claim</span>
                  </button>
                </div>
              </div>

              {/* Resolution Reason */}
              <div className="support-form-group">
                <label className="support-form-label">Resolution Rationale / Technical Justification *</label>
                <textarea
                  className="support-form-textarea"
                  rows={3}
                  placeholder={
                    reviewDecision === 'approved'
                      ? 'e.g. Verified defective power inverter circuit within 10-year term from delivery date. Approved for repair under warranty terms.'
                      : 'e.g. Failure caused by unauthorized tampering / external electrical surge exceeding grid standards. Outside manufacturer coverage.'
                  }
                  value={reviewReason}
                  onChange={(e) => setReviewReason(e.target.value)}
                  required
                />
              </div>

              <div style={{ background: '#0b1020', padding: '0.65rem', borderRadius: '6px', fontSize: '0.75rem', color: '#94a3b8' }}>
                <strong>Prompt 10 Compliance:</strong> Claims are never automatically approved merely because a serial exists. Review must evaluate terms, delivery date, and physical evidence.
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setReviewingClaim(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submittingReview}>
                  {submittingReview ? <Loader2 size={16} className="animate-spin" /> : <FileCheck2 size={16} />}
                  <span>Save Decision</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SupportLayout>
  );
}
