import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import PortalLayout from '@/components/PortalLayout';
import { supportApi } from '@/services/api';
import { useAuth } from '@/context/auth';
import {
  Ticket,
  User,
  Phone,
  Mail,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Wrench,
  RotateCcw,
  Star,
  Send,
  Lock,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Calendar
} from 'lucide-react';

export default function TicketDetail() {
  const { id } = useParams();
  const { user } = useAuth();

  const isCustomer = user?.account_type === 'customer';

  const [ticketData, setTicketData] = useState(null);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Note form state
  const [updateText, setUpdateText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [submittingNote, setSubmittingNote] = useState(false);

  // Status & Assignment modals
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [assignNote, setAssignNote] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Repair Modal
  const [showRepairModal, setShowRepairModal] = useState(false);
  const [repairTechId, setRepairTechId] = useState('');
  const [repairNotes, setRepairNotes] = useState('');
  const [isWarrantyCovered, setIsWarrantyCovered] = useState(true);
  const [assigningRepair, setAssigningRepair] = useState(false);

  // Complete Repair Modal
  const [completingRepairId, setCompletingRepairId] = useState(null);
  const [repairFindings, setRepairFindings] = useState('');
  const [repairActions, setRepairActions] = useState('');
  const [repairOutcome, setRepairOutcome] = useState('completed');
  const [repairCost, setRepairCost] = useState('0');
  const [savingOutcome, setSavingOutcome] = useState(false);

  // Replacement Modal
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [oldSerialInput, setOldSerialInput] = useState('');
  const [newSerialInput, setNewSerialInput] = useState('');
  const [replacementReason, setReplacementReason] = useState('');
  const [warrantyPolicy, setWarrantyPolicy] = useState('carry_over_remaining');
  const [savingReplacement, setSavingReplacement] = useState(false);

  // Feedback State
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  useEffect(() => {
    fetchDetail();
    if (!isCustomer) {
      loadAgents();
    }
  }, [id]);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await supportApi.getTicketById(id);
      const data = res.data || res;
      setTicketData(data);
      if (data.feedback) {
        setFeedbackSubmitted(true);
      }
      if (data.ticket?.extracted_serial) {
        setOldSerialInput(data.ticket.extracted_serial);
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to load ticket details.');
    } finally {
      setLoading(false);
    }
  };

  const loadAgents = async () => {
    try {
      const res = await supportApi.getAgents();
      setAgents(res.data?.agents || res.agents || []);
    } catch (e) {
      console.error(e);
    }
  };

  // Add Update Note
  const handleAddUpdate = async (e) => {
    e.preventDefault();
    if (!updateText.trim()) return;

    try {
      setSubmittingNote(true);
      await supportApi.addTicketUpdate(id, {
        update_text: updateText,
        is_internal: isInternal
      });
      setUpdateText('');
      setIsInternal(false);
      await fetchDetail();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to post note.');
    } finally {
      setSubmittingNote(false);
    }
  };

  // Update Status
  const handleStatusChange = async (newStatus) => {
    try {
      await supportApi.updateTicket(id, { status: newStatus });
      await fetchDetail();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to update ticket status.');
    }
  };

  // Assign Ticket
  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAgent) return;

    try {
      setAssigning(true);
      await supportApi.assignTicket(id, {
        assigned_to: selectedAgent,
        notes: assignNote
      });
      setShowAssignModal(false);
      setAssignNote('');
      await fetchDetail();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to assign ticket.');
    } finally {
      setAssigning(false);
    }
  };

  // Assign Repair
  const handleAssignRepair = async (e) => {
    e.preventDefault();
    try {
      setAssigningRepair(true);
      await supportApi.createRepair({
        ticket_id: id,
        profile_id: repairTechId || undefined,
        notes: repairNotes,
        is_warranty_covered: isWarrantyCovered
      });
      setShowRepairModal(false);
      setRepairNotes('');
      await fetchDetail();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to assign repair.');
    } finally {
      setAssigningRepair(false);
    }
  };

  // Complete Repair Outcome
  const handleSaveOutcome = async (e) => {
    e.preventDefault();
    try {
      setSavingOutcome(true);
      await supportApi.updateRepair({
        id: completingRepairId,
        findings: repairFindings,
        repair_actions: repairActions,
        outcome: repairOutcome,
        repair_cost: parseFloat(repairCost) || 0,
        resolve_ticket: repairOutcome === 'completed'
      });
      setCompletingRepairId(null);
      setRepairFindings('');
      setRepairActions('');
      await fetchDetail();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to save repair outcome.');
    } finally {
      setSavingOutcome(false);
    }
  };

  // Record Equipment Replacement
  const handleSaveReplacement = async (e) => {
    e.preventDefault();
    if (!newSerialInput.trim() || !replacementReason.trim()) {
      alert('Replacement serial and reason are required.');
      return;
    }

    try {
      setSavingReplacement(true);
      await supportApi.createReplacement({
        ticket_id: id,
        old_serial_number: oldSerialInput.trim(),
        new_serial_number: newSerialInput.trim(),
        replacement_reason: replacementReason.trim(),
        warranty_policy: warrantyPolicy
      });
      setShowReplaceModal(false);
      setNewSerialInput('');
      setReplacementReason('');
      await fetchDetail();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to record equipment replacement.');
    } finally {
      setSavingReplacement(false);
    }
  };

  // Submit Customer Feedback
  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    try {
      setSubmittingFeedback(true);
      await supportApi.submitFeedback({
        ticket_id: id,
        rating: feedbackRating,
        comment: feedbackComment
      });
      setFeedbackSubmitted(true);
      await fetchDetail();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to submit feedback.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const t = ticketData?.ticket || {};
  const updates = ticketData?.updates || [];
  const repairs = ticketData?.repairs || [];
  const replacements = ticketData?.replacements || [];
  const warrantyInfo = ticketData?.warrantyInfo;
  const feedback = ticketData?.feedback;

  return (
    <PortalLayout
      title={`Ticket ${t.ticket_number || t.ticket_code || ''}`}
      subtitle={`Created on ${t.created_at ? new Date(t.created_at).toLocaleDateString() : ''} · Category: ${t.issue_category || 'Other'}`}
      actions={
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Link to="/support/tickets" className="btn-secondary">
            <ArrowLeft size={16} />
            <span>All Tickets</span>
          </Link>

          {!isCustomer && (
            <>
              <button className="btn-secondary" onClick={() => setShowAssignModal(true)}>
                <User size={16} />
                <span>{t.assigned_to ? 'Reassign' : 'Assign'}</span>
              </button>

              <button className="btn-secondary" onClick={() => setShowRepairModal(true)}>
                <Wrench size={16} />
                <span>Assign Repair</span>
              </button>

              <button className="btn-secondary" onClick={() => setShowReplaceModal(true)}>
                <RotateCcw size={16} />
                <span>Record Replacement</span>
              </button>
            </>
          )}
        </div>
      }
    >
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
          <Loader2 className="animate-spin" size={36} color="var(--accent-text)" />
        </div>
      ) : error ? (
        <div className="support-card" style={{ borderColor: 'var(--c-red-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--c-red)' }}>
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* Left Column: Ticket Details, Timeline, Repairs, Replacements */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Header Card */}
            <div className="support-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--surface-2)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                    {t.issue_category}
                  </span>
                  <h2 style={{ fontSize: '1.25rem', color: 'var(--text-strong)', margin: '0.25rem 0 0 0' }}>
                    {t.display_subject || t.subject}
                  </h2>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span className={`badge badge-priority-${t.priority}`}>
                    Priority: {t.priority}
                  </span>
                  <span className={`badge badge-${t.status}`}>
                    Status: {t.status?.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Status Selector for quick update */}
              {!isCustomer && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--app-bg)', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.25rem', border: '1px solid var(--surface-2)' }}>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Change Status:</span>
                  <select
                    className="support-select"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.8125rem' }}
                    value={t.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                  >
                    <option value="open">Open</option>
                    <option value="assigned">Assigned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="waiting_for_parts">Waiting for Parts</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              )}

              {/* Description */}
              <div>
                <h4 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0 0 0.5rem 0' }}>Issue Description</h4>
                <div style={{ background: 'var(--app-bg)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--surface-2)', color: 'var(--text-soft)', fontSize: '0.875rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {t.description}
                </div>
              </div>
            </div>

            {/* Repair Assignments Card */}
            {repairs.length > 0 && (
              <div className="support-card">
                <div className="support-card-header">
                  <h3 className="support-card-title">
                    <Wrench size={18} color="var(--c-amber-soft)" />
                    Technician Investigation & Repair
                  </h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {repairs.map((r) => (
                    <div
                      key={r.id}
                      style={{
                        background: 'var(--app-bg)',
                        border: '1px solid var(--surface-2)',
                        borderRadius: '8px',
                        padding: '1rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <div>
                          <strong style={{ color: 'var(--text-strong)' }}>
                            {r.technicians?.profiles?.full_name || r.technicians?.employee_code || 'Technician'}
                          </strong>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                            Assigned {new Date(r.assigned_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <span className={`badge ${r.is_warranty_covered ? 'badge-resolved' : 'badge-priority-medium'}`}>
                            {r.is_warranty_covered ? 'Warranty Covered' : 'Billable Service'}
                          </span>
                          {r.completed_at ? (
                            <span className="badge badge-resolved">Completed</span>
                          ) : (
                            !isCustomer && (
                              <button
                                className="btn-secondary"
                                style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem' }}
                                onClick={() => setCompletingRepairId(r.id)}
                              >
                                Record Outcome
                              </button>
                            )
                          )}
                        </div>
                      </div>

                      {r.notes && (
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-soft)', whiteSpace: 'pre-wrap', background: 'var(--surface-solid)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                          {r.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Replacement Records Card */}
            {replacements.length > 0 && (
              <div className="support-card">
                <div className="support-card-header">
                  <h3 className="support-card-title">
                    <RotateCcw size={18} color="var(--c-blue)" />
                    Equipment Replacement History
                  </h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {replacements.map((rp) => (
                    <div
                      key={rp.id}
                      style={{
                        background: 'var(--app-bg)',
                        border: '1px solid var(--surface-2)',
                        borderRadius: '8px',
                        padding: '1rem',
                        fontSize: '0.875rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-strong)', fontWeight: 600, marginBottom: '0.5rem' }}>
                        <span>Replaced {rp.old_serial?.serial_number || 'Original Unit'} ➔ {rp.new_serial?.serial_number || 'New Unit'}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(rp.replaced_at).toLocaleDateString()}</span>
                      </div>
                      <div style={{ color: 'var(--text-soft)', fontSize: '0.8125rem' }}>
                        {rp.replacement_reason}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Conversation & Updates Timeline */}
            <div className="support-card">
              <div className="support-card-header">
                <h3 className="support-card-title">
                  <MessageSquare size={18} color="var(--c-blue)" />
                  Activity & Communication Timeline
                </h3>
              </div>

              {/* Updates List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                {updates.map((u) => (
                  <div key={u.id} className="timeline-item">
                    <div className={`timeline-dot ${u.is_internal ? 'internal' : ''}`} />
                    <div className="timeline-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="timeline-author">{u.profiles?.full_name || 'System / Specialist'}</span>
                        {u.is_internal && (
                          <span style={{ fontSize: '0.7rem', background: 'rgba(251, 191, 36, 0.15)', color: 'var(--c-amber-soft)', padding: '0.15rem 0.4rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Lock size={10} /> Internal Note
                          </span>
                        )}
                      </div>
                      <span className="timeline-time">{new Date(u.created_at).toLocaleString()}</span>
                    </div>
                    <div className="timeline-body">{u.update_text}</div>
                  </div>
                ))}
              </div>

              {/* Add Note Form */}
              <form onSubmit={handleAddUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid var(--surface-2)', paddingTop: '1.25rem' }}>
                <textarea
                  className="support-form-textarea"
                  rows={3}
                  placeholder={isCustomer ? "Add a message or response to the support team..." : "Add a response to the customer or internal note..."}
                  value={updateText}
                  onChange={(e) => setUpdateText(e.target.value)}
                  required
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {!isCustomer ? (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-soft)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={isInternal}
                        onChange={(e) => setIsInternal(e.target.checked)}
                      />
                      <span>Mark as Internal Support Note (Visible to staff only)</span>
                    </label>
                  ) : <div />}

                  <button type="submit" className="btn-primary" disabled={submittingNote}>
                    {submittingNote ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    <span>Post Update</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Customer Satisfaction Feedback */}
            <div className="support-card">
              <div className="support-card-header">
                <h3 className="support-card-title">
                  <Star size={18} color="var(--c-amber-soft)" />
                  Customer Feedback & Resolution Rating
                </h3>
              </div>

              {feedbackSubmitted || feedback ? (
                <div style={{ background: 'var(--app-bg)', border: '1px solid var(--surface-2)', borderRadius: '8px', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={20}
                        color={(feedback?.rating || feedbackRating) >= star ? 'var(--c-amber-soft)' : 'var(--text-dim)'}
                        fill={(feedback?.rating || feedbackRating) >= star ? 'var(--c-amber-soft)' : 'none'}
                      />
                    ))}
                    <span style={{ fontWeight: 700, color: 'var(--text-strong)', marginLeft: '0.5rem' }}>
                      {feedback?.rating || feedbackRating} / 5 Stars
                    </span>
                  </div>
                  <p style={{ color: 'var(--text-soft)', fontSize: '0.875rem', margin: 0 }}>
                    "{feedback?.comment || feedbackComment || 'No additional comment provided.'}"
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmitFeedback} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.875rem', color: 'var(--text-soft)', display: 'block', marginBottom: '0.5rem' }}>
                      How would you rate the resolution and service quality?
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          style={{
                            background: feedbackRating >= s ? 'rgba(251, 191, 36, 0.15)' : 'var(--app-bg)',
                            border: `1px solid ${feedbackRating >= s ? 'var(--c-amber-soft)' : 'var(--surface-2)'}`,
                            borderRadius: '8px',
                            padding: '0.5rem 0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            color: feedbackRating >= s ? 'var(--c-amber-soft)' : 'var(--text-muted)',
                            cursor: 'pointer'
                          }}
                          onClick={() => setFeedbackRating(s)}
                        >
                          <Star size={16} fill={feedbackRating >= s ? 'var(--c-amber-soft)' : 'none'} />
                          <span>{s}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <textarea
                      className="support-form-textarea"
                      rows={2}
                      placeholder="Optional feedback comment on response time, technician professionalism, or resolution..."
                      value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                    />
                  </div>

                  <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-start' }} disabled={submittingFeedback}>
                    {submittingFeedback ? <Loader2 size={16} className="animate-spin" /> : <Star size={16} />}
                    <span>Submit Rating</span>
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Right Column: Customer Details, Live Warranty Status, Assigned Specialist */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Live Warranty Verification Card */}
            <div className="support-card" style={{ borderColor: warrantyInfo?.is_valid ? 'rgba(52, 211, 153, 0.3)' : 'rgba(239, 68, 68, 0.3)' }}>
              <div className="support-card-header">
                <h3 className="support-card-title">
                  {warrantyInfo?.is_valid ? (
                    <ShieldCheck size={18} color="var(--c-green)" />
                  ) : (
                    <ShieldAlert size={18} color="var(--c-red)" />
                  )}
                  Warranty Verification
                </h3>
              </div>

              {warrantyInfo ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8125rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Serial Number:</span>
                    <div style={{ color: 'var(--text-strong)', fontWeight: 600, fontSize: '0.875rem' }}>
                      {warrantyInfo.serial_number}
                    </div>
                  </div>

                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Equipment:</span>
                    <div style={{ color: 'var(--text-soft)' }}>{warrantyInfo.product?.name || 'Solar PV Hardware'}</div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Warranty Start:</span>
                    <strong style={{ color: 'var(--text-strong)' }}>{warrantyInfo.start_date || 'Delivery date'}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Warranty Expiry:</span>
                    <strong style={{ color: 'var(--text-strong)' }}>{warrantyInfo.expiry_date}</strong>
                  </div>

                  <div style={{ borderTop: '1px solid var(--surface-2)', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Coverage Status:</span>
                    <span className={`badge badge-warranty-${warrantyInfo.computed_status}`}>
                      {warrantyInfo.computed_status}
                    </span>
                  </div>

                  <div style={{ background: 'var(--app-bg)', padding: '0.65rem', borderRadius: '6px', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    <strong>Verification Rule:</strong> Warranty starts from equipment delivery date, verified directly against warehouse dispatch records.
                  </div>

                  {warrantyInfo.warranty?.id && (
                    <Link
                      to={`/support/warranties/${warrantyInfo.warranty.id}`}
                      className="btn-secondary"
                      style={{ textAlign: 'center', justifyContent: 'center', fontSize: '0.8125rem', marginTop: '0.25rem' }}
                    >
                      View Warranty Record & Claims
                    </Link>
                  )}
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', textAlign: 'center', padding: '1rem 0' }}>
                  No serial number identified in this ticket.
                </div>
              )}
            </div>

            {/* Customer Information Card */}
            <div className="support-card">
              <div className="support-card-header">
                <h3 className="support-card-title">
                  <User size={18} color="var(--accent-text)" />
                  Customer Information
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8125rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Name:</span>
                  <div style={{ color: 'var(--text-strong)', fontWeight: 600, fontSize: '0.9375rem' }}>
                    {t.customers?.contact_name || 'Customer'}
                  </div>
                </div>

                {t.customers?.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Phone size={14} color="var(--c-blue)" />
                    <span style={{ color: 'var(--text-soft)' }}>{t.customers.phone}</span>
                  </div>
                )}

                {t.customers?.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Mail size={14} color="var(--c-blue)" />
                    <span style={{ color: 'var(--text-soft)' }}>{t.customers.email}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Assigned Specialist Card */}
            <div className="support-card">
              <div className="support-card-header">
                <h3 className="support-card-title">
                  <User size={18} color="var(--c-violet)" />
                  Assigned Support Staff
                </h3>
              </div>

              {t.assigned_profile ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-strong)' }}>{t.assigned_profile.full_name}</span>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{t.assigned_profile.email}</span>
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                  Unassigned. Currently in the open triage pool.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Assign Support Specialist</h3>
              <button className="modal-close" onClick={() => setShowAssignModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAssignSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="support-form-group">
                <label className="support-form-label">Select Specialist or Technician *</label>
                <select
                  className="support-form-select"
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                  required
                >
                  <option value="">-- Choose Agent --</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} — {a.department} ({a.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="support-form-group">
                <label className="support-form-label">Assignment Note / Instructions</label>
                <textarea
                  className="support-form-textarea"
                  rows={3}
                  placeholder="Instructions for the assigned team member..."
                  value={assignNote}
                  onChange={(e) => setAssignNote(e.target.value)}
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowAssignModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={assigning}>
                  {assigning ? <Loader2 size={16} className="animate-spin" /> : <User size={16} />}
                  <span>Assign Ticket</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Repair Modal */}
      {showRepairModal && (
        <div className="modal-overlay" onClick={() => setShowRepairModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Assign On-Site Technician Repair</h3>
              <button className="modal-close" onClick={() => setShowRepairModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAssignRepair} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="support-form-group">
                <label className="support-form-label">Select Field Technician</label>
                <select
                  className="support-form-select"
                  value={repairTechId}
                  onChange={(e) => setRepairTechId(e.target.value)}
                >
                  <option value="">-- Automatic Available Technician --</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} {a.technician ? `(${a.technician.employee_code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="support-form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-soft)', fontSize: '0.875rem' }}>
                  <input
                    type="checkbox"
                    checked={isWarrantyCovered}
                    onChange={(e) => setIsWarrantyCovered(e.target.checked)}
                  />
                  <span>Covered Under Warranty (No customer charges)</span>
                </label>
              </div>

              <div className="support-form-group">
                <label className="support-form-label">Job Notes & Safety Directives</label>
                <textarea
                  className="support-form-textarea"
                  rows={3}
                  placeholder="e.g. Inspect DC isolator, check error 04 error log, perform inverter firmware reboot..."
                  value={repairNotes}
                  onChange={(e) => setRepairNotes(e.target.value)}
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowRepairModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={assigningRepair}>
                  {assigningRepair ? <Loader2 size={16} className="animate-spin" /> : <Wrench size={16} />}
                  <span>Dispatch Technician</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Repair Outcome Modal */}
      {completingRepairId && (
        <div className="modal-overlay" onClick={() => setCompletingRepairId(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Record Repair Outcome</h3>
              <button className="modal-close" onClick={() => setCompletingRepairId(null)}>✕</button>
            </div>
            <form onSubmit={handleSaveOutcome} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="support-form-group">
                <label className="support-form-label">Investigation Findings *</label>
                <textarea
                  className="support-form-textarea"
                  rows={2}
                  placeholder="e.g. Found loose terminal connection on string MPPT 2; internal IGBT tested normal."
                  value={repairFindings}
                  onChange={(e) => setRepairFindings(e.target.value)}
                  required
                />
              </div>

              <div className="support-form-group">
                <label className="support-form-label">Repair Actions Performed</label>
                <textarea
                  className="support-form-textarea"
                  rows={2}
                  placeholder="e.g. Re-crimped MC4 connector, tightened terminals to 2.5 Nm, cleared fault log."
                  value={repairActions}
                  onChange={(e) => setRepairActions(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="support-form-group">
                  <label className="support-form-label">Outcome *</label>
                  <select
                    className="support-form-select"
                    value={repairOutcome}
                    onChange={(e) => setRepairOutcome(e.target.value)}
                  >
                    <option value="completed">Completed (Resolved)</option>
                    <option value="parts_required">Parts Required</option>
                    <option value="unrepairable">Unrepairable (Requires Replacement)</option>
                  </select>
                </div>

                <div className="support-form-group">
                  <label className="support-form-label">Repair Cost (₹)</label>
                  <input
                    type="number"
                    className="support-form-input"
                    value={repairCost}
                    onChange={(e) => setRepairCost(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setCompletingRepairId(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={savingOutcome}>
                  {savingOutcome ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  <span>Save Outcome</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Replacement Modal */}
      {showReplaceModal && (
        <div className="modal-overlay" onClick={() => setShowReplaceModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Record Equipment Replacement</h3>
              <button className="modal-close" onClick={() => setShowReplaceModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveReplacement} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="support-form-group">
                <label className="support-form-label">Original Serial Number (To be Decommissioned) *</label>
                <input
                  type="text"
                  className="support-form-input"
                  value={oldSerialInput}
                  onChange={(e) => setOldSerialInput(e.target.value)}
                  placeholder="e.g. SLX-INV-2024-8841"
                  required
                />
              </div>

              <div className="support-form-group">
                <label className="support-form-label">New Replacement Serial Number (From Warehouse Inventory) *</label>
                <input
                  type="text"
                  className="support-form-input"
                  value={newSerialInput}
                  onChange={(e) => setNewSerialInput(e.target.value)}
                  placeholder="e.g. SLX-INV-2026-9011-SP"
                  required
                />
              </div>

              <div className="support-form-group">
                <label className="support-form-label">Warranty Policy Applied</label>
                <select
                  className="support-form-select"
                  value={warrantyPolicy}
                  onChange={(e) => setWarrantyPolicy(e.target.value)}
                >
                  <option value="carry_over_remaining">Carry Over Remaining Original Warranty Period</option>
                  <option value="reset_full_term">Reset Full Manufacturer Warranty Term</option>
                </select>
              </div>

              <div className="support-form-group">
                <label className="support-form-label">Replacement Reason & Technical Justification *</label>
                <textarea
                  className="support-form-textarea"
                  rows={3}
                  placeholder="e.g. Inverter internal power circuit burnt due to manufacturing defect; unrepairable on-site. Approved under Section 7 Warranty Policy."
                  value={replacementReason}
                  onChange={(e) => setReplacementReason(e.target.value)}
                  required
                />
              </div>

              <div style={{ background: 'var(--app-bg)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <strong>Integrity Rule:</strong> Original serial numbers are never deleted or overwritten; the decommissioned unit status is permanently marked as warranty replacement.
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowReplaceModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={savingReplacement}>
                  {savingReplacement ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
                  <span>Authorize Replacement</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
