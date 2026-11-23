import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '@/components/PortalLayout';
import FeasibilityReportModal from './FeasibilityReportModal';
import { surveyApi } from '@/services/api';
import {
  CheckCircle2,
  FileText,
  Eye,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

export default function SurveyApprovals() {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Review Modal State
  const [reviewSurvey, setReviewSurvey] = useState(null);
  const [reviewAction, setReviewAction] = useState('approve'); // 'approve' | 'reject' | 'revisit'
  const [reviewComments, setReviewComments] = useState('');
  const [revisitNotes, setRevisitNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Feasibility Report Modal State
  const [reportData, setReportData] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    loadSurveys();
  }, []);

  const loadSurveys = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await surveyApi.getRequests();
      setSurveys(res.data?.surveys || []);
    } catch (err) {
      setError(err?.message || 'Failed to load surveys for review.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReport = async (surveyId) => {
    try {
      const res = await surveyApi.getFeasibilityReport(surveyId);
      setReportData(res.data);
      setShowReportModal(true);
    } catch (err) {
      alert(err?.message || 'Failed to load report.');
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewSurvey) return;

    try {
      setActionLoading(true);
      await surveyApi.submitApproval(reviewSurvey.id, {
        action: reviewAction,
        comments: reviewComments,
        revisit_notes: revisitNotes,
        rejection_reason: rejectionReason
      });

      setReviewSurvey(null);
      setReviewComments('');
      setRevisitNotes('');
      setRejectionReason('');
      alert(`Survey ${reviewSurvey.survey_code} marked as ${reviewAction.toUpperCase()} successfully.`);
      loadSurveys();
    } catch (err) {
      alert(err?.message || 'Failed to submit review.');
    } finally {
      setActionLoading(false);
    }
  };

  // Group into Pending Review vs Reviewed
  const pendingReview = surveys.filter(s => s.status === 'submitted');
  const revisitRequired = surveys.filter(s => s.status === 'revisit_required');
  const approvedSurveys = surveys.filter(s => s.status === 'approved');
  const rejectedSurveys = surveys.filter(s => s.status === 'rejected');

  return (
    <PortalLayout
      title="Site Survey Technical Approvals Queue"
      subtitle="Review completed inspection reports, authorize solar feasibility, and advance approved sites to Sales Quotations"
      actions={
        <button
          onClick={loadSurveys}
          className="survey-btn survey-btn-secondary survey-btn-sm"
        >
          <RefreshCw size={14} /> Refresh Queue
        </button>
      }
    >
      {/* Overview Stat Badges */}
      <div className="survey-stats-grid" style={{ marginBottom: '10px' }}>
        <div className="survey-stat-box" style={{ borderLeft: '3px solid var(--c-violet)' }}>
          <span className="survey-stat-label">Awaiting Technical Review</span>
          <span className="survey-stat-value" style={{ color: 'var(--c-violet)' }}>{pendingReview.length}</span>
          <span className="survey-stat-meta">Needs engineer sign-off</span>
        </div>

        <div className="survey-stat-box" style={{ borderLeft: '3px solid var(--c-amber)' }}>
          <span className="survey-stat-label">Revisits In Progress</span>
          <span className="survey-stat-value" style={{ color: 'var(--c-amber)' }}>{revisitRequired.length}</span>
          <span className="survey-stat-meta">Awaiting site resolution</span>
        </div>

        <div className="survey-stat-box" style={{ borderLeft: '3px solid var(--c-emerald)' }}>
          <span className="survey-stat-label">Approved & Ready for Quote</span>
          <span className="survey-stat-value" style={{ color: 'var(--c-green)' }}>{approvedSurveys.length}</span>
          <span className="survey-stat-meta">Handed off to Sales</span>
        </div>

        <div className="survey-stat-box" style={{ borderLeft: '3px solid var(--c-red-2)' }}>
          <span className="survey-stat-label">Rejected Feasibility</span>
          <span className="survey-stat-value" style={{ color: 'var(--c-red)' }}>{rejectedSurveys.length}</span>
          <span className="survey-stat-meta">Unsuitable / blocked</span>
        </div>
      </div>

      {/* SECTION 1: AWAITING TECHNICAL REVIEW (ACTION QUEUE) */}
      <div className="survey-card">
        <div className="survey-card-header">
          <h3>
            <ShieldCheck size={18} style={{ color: 'var(--c-violet)' }} />
            Submitted Surveys Awaiting Technical Review ({pendingReview.length})
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>High Priority Queue</span>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading review queue...
          </div>
        ) : pendingReview.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
            <CheckCircle2 size={36} style={{ margin: '0 auto 10px auto', opacity: 0.5, color: 'var(--c-green)' }} />
            <p>All submitted site surveys have been reviewed! No surveys pending technical verification.</p>
          </div>
        ) : (
          <div className="survey-table-wrapper">
            <table className="survey-table">
              <thead>
                <tr>
                  <th>Survey Code</th>
                  <th>Customer Details</th>
                  <th>Surveyor Specs</th>
                  <th>Recommended Sizing</th>
                  <th>Submitted At</th>
                  <th style={{ textAlign: 'right' }}>Review Decision</th>
                </tr>
              </thead>
              <tbody>
                {pendingReview.map((srv) => (
                  <tr key={srv.id}>
                    <td>
                      <Link
                        to={`/survey/requests/${srv.id}`}
                        style={{ color: 'var(--c-blue)', fontWeight: 600, textDecoration: 'none' }}
                      >
                        {srv.survey_code}
                      </Link>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        Priority: <b style={{ textTransform: 'capitalize' }}>{srv.priority}</b>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, color: 'var(--text-strong)' }}>{srv.customer_name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{srv.site_address || srv.city}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.84rem', color: 'var(--text-soft)', textTransform: 'capitalize' }}>
                        {srv.roof_type?.replace('_', ' ')} Roof &bull; {srv.available_installation_area_sqm || 0} m² area
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                        Surveyor: {srv.assigned_to_name}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--c-green)', fontSize: '0.95rem' }}>
                        {srv.recommended_capacity_kw || 10} kWp
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-soft)', textTransform: 'uppercase' }}>
                        {srv.recommended_system_type || 'On-Grid'}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-soft)' }}>
                        {srv.completed_at ? new Date(srv.completed_at).toLocaleDateString() : 'Recent'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          onClick={() => handleOpenReport(srv.id)}
                          className="survey-btn survey-btn-secondary survey-btn-sm"
                          title="Preview Feasibility Report"
                        >
                          <FileText size={13} /> Report
                        </button>
                        <button
                          onClick={() => {
                            setReviewSurvey(srv);
                            setReviewAction('approve');
                            setReviewComments(`Technical feasibility verified for ${srv.recommended_capacity_kw || 10} kWp ${srv.recommended_system_type || 'on-grid'} system.`);
                          }}
                          className="survey-btn survey-btn-primary survey-btn-sm"
                        >
                          <ShieldCheck size={14} /> Review & Decision
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 2: APPROVED & AVAILABLE FOR QUOTATIONS */}
      <div className="survey-card" style={{ marginTop: '20px' }}>
        <div className="survey-card-header">
          <h3>
            <CheckCircle2 size={18} style={{ color: 'var(--c-green)' }} />
            Approved Site Feasibility Records ({approvedSurveys.length})
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--c-green)' }}>Available to Quotation Workflow</span>
        </div>

        <div className="survey-table-wrapper">
          <table className="survey-table">
            <thead>
              <tr>
                <th>Survey Code</th>
                <th>Client</th>
                <th>System Capacity</th>
                <th>Estimated Cost</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {approvedSurveys.map((srv) => (
                <tr key={srv.id}>
                  <td>
                    <Link
                      to={`/survey/requests/${srv.id}`}
                      style={{ color: 'var(--c-blue)', fontWeight: 600, textDecoration: 'none' }}
                    >
                      {srv.survey_code}
                    </Link>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, color: 'var(--text-strong)' }}>{srv.customer_name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{srv.site_address || srv.city}</div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: 'var(--c-green)' }}>
                      {srv.recommended_capacity_kw || 10} kWp ({srv.recommended_system_type?.toUpperCase()})
                    </span>
                  </td>
                  <td>
                    <span style={{ color: 'var(--text-strong)' }}>
                      ₹{Math.round((srv.recommended_capacity_kw || 10) * 42000).toLocaleString('en-IN')}
                    </span>
                  </td>
                  <td>
                    <span className="survey-badge survey-badge-approved">
                      Approved
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button
                        onClick={() => handleOpenReport(srv.id)}
                        className="survey-btn survey-btn-secondary survey-btn-sm"
                      >
                        <FileText size={13} /> View Report
                      </button>
                      <Link
                        to={`/survey/requests/${srv.id}`}
                        className="survey-btn survey-btn-secondary survey-btn-sm"
                      >
                        <Eye size={13} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* REVIEW & DECISION MODAL */}
      {reviewSurvey && (
        <div className="survey-modal-overlay">
          <div className="survey-modal-content" style={{ maxWidth: '640px' }}>
            <h3 style={{ color: 'var(--text-strong)', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={20} style={{ color: 'var(--c-blue)' }} />
              Technical Review: {reviewSurvey.survey_code}
            </h3>

            <div style={{ background: 'rgba(var(--ink-rgb), 0.03)', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.86rem' }}>
              <div><b>Customer:</b> {reviewSurvey.customer_name}</div>
              <div><b>Site:</b> {reviewSurvey.site_address || reviewSurvey.city}</div>
              <div><b>Surveyor Proposed:</b> {reviewSurvey.recommended_capacity_kw || 10} kWp ({reviewSurvey.recommended_system_type || 'on-grid'})</div>
            </div>

            <form onSubmit={handleReviewSubmit}>
              <div className="survey-form-group">
                <label className="survey-label">Review Decision</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setReviewAction('approve');
                      setReviewComments(`Technical feasibility approved for ${reviewSurvey.recommended_capacity_kw || 10} kWp system.`);
                    }}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      border: `2px solid ${reviewAction === 'approve' ? 'var(--c-emerald)' : 'rgba(var(--ink-rgb), 0.1)'}`,
                      background: reviewAction === 'approve' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(var(--ink-rgb), 0.02)',
                      color: reviewAction === 'approve' ? 'var(--c-green)' : 'var(--text-soft)',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.86rem'
                    }}
                  >
                    ✓ Approve Survey
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setReviewAction('revisit');
                      setReviewComments('Site revisit required to address technical constraints.');
                    }}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      border: `2px solid ${reviewAction === 'revisit' ? 'var(--c-amber)' : 'rgba(var(--ink-rgb), 0.1)'}`,
                      background: reviewAction === 'revisit' ? 'rgba(249, 115, 22, 0.15)' : 'rgba(var(--ink-rgb), 0.02)',
                      color: reviewAction === 'revisit' ? 'var(--c-amber)' : 'var(--text-soft)',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.86rem'
                    }}
                  >
                    ⟳ Request Revisit
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setReviewAction('reject');
                      setReviewComments('Survey rejected due to severe site constraints.');
                    }}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      border: `2px solid ${reviewAction === 'reject' ? 'var(--c-red-2)' : 'rgba(var(--ink-rgb), 0.1)'}`,
                      background: reviewAction === 'reject' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(var(--ink-rgb), 0.02)',
                      color: reviewAction === 'reject' ? 'var(--c-red)' : 'var(--text-soft)',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.86rem'
                    }}
                  >
                    ✕ Reject Feasibility
                  </button>
                </div>
              </div>

              {reviewAction === 'approve' && (
                <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '10px 14px', borderRadius: '6px', marginBottom: '16px', fontSize: '0.82rem', color: 'var(--c-green)' }}>
                  ✓ Approving this survey verifies structural & electrical viability. This survey and its technical data will immediately become available to the Sales Quotation workflow.
                </div>
              )}

              {reviewAction === 'revisit' && (
                <div className="survey-form-group">
                  <label className="survey-label">Revisit Reason & Field Instructions</label>
                  <textarea
                    className="survey-textarea"
                    placeholder="e.g. Parapet height was missing; arrange terrace key from society for second inspection..."
                    value={revisitNotes}
                    onChange={(e) => setRevisitNotes(e.target.value)}
                    required
                  />
                </div>
              )}

              {reviewAction === 'reject' && (
                <div className="survey-form-group">
                  <label className="survey-label">Rejection Reason</label>
                  <textarea
                    className="survey-textarea"
                    placeholder="e.g. Heavy perennial tree shade across 80% roof; brittle clay tiles cannot support module dead weight..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="survey-form-group">
                <label className="survey-label">Reviewer Remarks / Official Comments</label>
                <textarea
                  className="survey-textarea"
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setReviewSurvey(null)}
                  className="survey-btn survey-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="survey-btn survey-btn-primary"
                >
                  {actionLoading ? 'Recording Decision...' : 'Confirm Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Feasibility Report Modal */}
      {showReportModal && (
        <FeasibilityReportModal
          reportData={reportData}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </PortalLayout>
  );
}
