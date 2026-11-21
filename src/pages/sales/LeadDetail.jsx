import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import SalesLayout from './SalesLayout';
import { salesApi } from '@/services/api';
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  UserCheck,
  FileCheck,
  MessageSquare,
  History,
  Send,
  AlertCircle,
  ExternalLink,
  Plus
} from 'lucide-react';

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [lead, setLead] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [surveys, setSurveys] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Modal / Action states
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [lostReason, setLostReason] = useState('');

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [assignNotes, setAssignNotes] = useState('');

  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [fuDate, setFuDate] = useState('');
  const [fuType, setFuType] = useState('phone_call');
  const [fuNotes, setFuNotes] = useState('');

  const [showInteractionModal, setShowInteractionModal] = useState(false);
  const [interType, setInterType] = useState('call');
  const [interSubject, setInterSubject] = useState('');
  const [interSummary, setInterSummary] = useState('');

  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [surveyDate, setSurveyDate] = useState('');
  const [surveyNotes, setSurveyNotes] = useState('');

  useEffect(() => {
    loadLead();
    loadEmployees();
  }, [id]);

  const loadLead = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await salesApi.getLeadById(id);
      setLead(res.data.lead);
      setAssignments(res.data.assignments || []);
      setFollowUps(res.data.followUps || []);
      setInteractions(res.data.interactions || []);
      setSurveys(res.data.surveys || []);
    } catch (err) {
      setError(err?.message || 'Failed to load lead details.');
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const res = await salesApi.getSalesEmployees();
      setEmployees(res.data || []);
    } catch (e) {
      // non-blocking
    }
  };

  // Handlers
  const handleStatusChange = async (e) => {
    e.preventDefault();
    try {
      await salesApi.updateLead(id, {
        status: newStatus,
        lost_reason: newStatus === 'lost' ? lostReason : undefined
      });
      setShowStatusModal(false);
      setActionSuccess('Lead status updated successfully.');
      loadLead();
    } catch (err) {
      alert(err.message || 'Error updating status');
    }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    try {
      await salesApi.assignLead(id, {
        assigned_to: selectedEmployee,
        notes: assignNotes
      });
      setShowAssignModal(false);
      setActionSuccess('Lead assigned successfully.');
      loadLead();
    } catch (err) {
      alert(err.message || 'Error assigning lead');
    }
  };

  const handleCreateFollowUp = async (e) => {
    e.preventDefault();
    try {
      await salesApi.scheduleFollowUp({
        lead_id: id,
        scheduled_at: new Date(fuDate).toISOString(),
        follow_up_type: fuType,
        notes: fuNotes
      });
      setShowFollowUpModal(false);
      setFuDate('');
      setFuNotes('');
      setActionSuccess('Follow-up scheduled.');
      loadLead();
    } catch (err) {
      alert(err.message || 'Error scheduling follow-up');
    }
  };

  const handleLogInteraction = async (e) => {
    e.preventDefault();
    try {
      await salesApi.logInteraction({
        lead_id: id,
        customer_id: lead.customer_id,
        interaction_type: interType,
        subject: interSubject,
        summary: interSummary
      });
      setShowInteractionModal(false);
      setInterSubject('');
      setInterSummary('');
      setActionSuccess('Interaction logged.');
      loadLead();
    } catch (err) {
      alert(err.message || 'Error logging interaction');
    }
  };

  const handleSurveyRequest = async (e) => {
    e.preventDefault();
    try {
      await salesApi.requestSurvey(id, {
        survey_date: surveyDate || undefined,
        site_observations: surveyNotes
      });
      setShowSurveyModal(false);
      setActionSuccess('Site survey request created! Technical team notified.');
      loadLead();
    } catch (err) {
      alert(err.message || 'Error requesting survey');
    }
  };

  const handleConvertToCustomer = async () => {
    if (!window.confirm(`Convert lead ${lead.lead_code} into a registered customer profile?`)) return;
    try {
      const res = await salesApi.createOrLinkCustomer({
        lead_id: id,
        contact_name: lead.customer_name,
        phone: lead.phone,
        email: lead.email || `${lead.phone.replace(/[^0-9]/g, '')}@solvix-lead.local`,
        street: lead.address,
        notes: `Converted from lead ${lead.lead_code}`
      });
      setActionSuccess(res.message || 'Customer created successfully.');
      loadLead();
    } catch (err) {
      alert(err.message || 'Conversion failed');
    }
  };

  // WhatsApp click-to-chat URL formatter
  const getWhatsAppLink = (phone) => {
    if (!phone) return '#';
    const cleanNumber = phone.replace(/[^0-9]/g, '');
    return `https://wa.me/${cleanNumber}?text=Hello%20${encodeURIComponent(lead?.customer_name || 'Customer')},%20this%20is%20Solvix%20Solar.%20Regarding%20your%20solar%20enquiry%20${lead?.lead_code}:`;
  };

  return (
    <SalesLayout
      title={lead ? `${lead.customer_name} (${lead.lead_code})` : 'Lead Details'}
      subtitle={lead ? `Status: ${lead.status?.replace('_', ' ')} • Source: ${lead.source}` : ''}
      actions={
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link to="/sales/leads" className="crm-btn crm-btn-secondary crm-btn-sm">
            <ArrowLeft size={16} /> Back
          </Link>

          {lead && (
            <>
              <button
                onClick={() => { setNewStatus(lead.status); setShowStatusModal(true); }}
                className="crm-btn crm-btn-secondary crm-btn-sm"
              >
                Change Status
              </button>

              <button
                onClick={() => { setSelectedEmployee(lead.assigned_to || ''); setShowAssignModal(true); }}
                className="crm-btn crm-btn-secondary crm-btn-sm"
              >
                Reassign
              </button>

              {!lead.customer_id && (
                <button
                  onClick={handleConvertToCustomer}
                  className="crm-btn crm-btn-primary crm-btn-sm"
                >
                  <UserCheck size={16} /> Convert to Customer
                </button>
              )}
            </>
          )}
        </div>
      }
    >
      {loading ? (
        <div className="crm-card" style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
          Loading lead profile and history...
        </div>
      ) : error ? (
        <div className="crm-card" style={{ color: '#f87171' }}>{error}</div>
      ) : !lead ? (
        <div className="crm-card">Lead not found.</div>
      ) : (
        <>
          {actionSuccess && (
            <div
              className="crm-card"
              style={{
                borderColor: '#d8ee8e',
                background: 'rgba(216,238,142,0.1)',
                color: '#d8ee8e',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span>{actionSuccess}</span>
              <button onClick={() => setActionSuccess(null)} style={{ color: '#fff', fontSize: '0.8rem' }}>✕</button>
            </div>
          )}

          {/* Handoff Banner if Qualified */}
          {lead.status === 'qualified' && surveys.length === 0 && (
            <div
              className="crm-card"
              style={{
                borderColor: '#34d399',
                background: 'rgba(16, 185, 129, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px'
              }}
            >
              <div>
                <h4 style={{ color: '#34d399', margin: 0, fontWeight: 600 }}>Lead is Qualified!</h4>
                <p style={{ color: '#cbd5e1', fontSize: '0.84rem', margin: '4px 0 0' }}>
                  Handoff to technical team by initiating a Site Survey & Feasibility request.
                </p>
              </div>
              <button
                onClick={() => setShowSurveyModal(true)}
                className="crm-btn crm-btn-primary crm-btn-sm"
              >
                <FileCheck size={16} /> Create Survey Request
              </button>
            </div>
          )}

          {/* Quick Info Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {/* Contact & Location */}
            <div className="crm-card">
              <div className="crm-card-header">
                <span className="crm-card-title">Customer Information</span>
                {lead.customer_id && (
                  <Link
                    to={`/sales/customers/${lead.customer_id}`}
                    style={{ fontSize: '0.8rem', color: '#d8ee8e', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    Linked Customer <ExternalLink size={12} />
                  </Link>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem' }}>
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>FULL NAME</div>
                  <div style={{ fontWeight: '600', color: '#fff' }}>{lead.customer_name}</div>
                </div>

                <div>
                  <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>PHONE & WHATSAPP</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '2px' }}>
                    <span>{lead.phone}</span>
                    <a
                      href={getWhatsAppLink(lead.phone)}
                      target="_blank"
                      rel="noreferrer"
                      className="crm-btn crm-btn-outline crm-btn-sm"
                      style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                    >
                      WhatsApp Chat
                    </a>
                  </div>
                </div>

                <div>
                  <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>EMAIL ADDRESS</div>
                  <div>{lead.email || 'Not provided'}</div>
                </div>

                <div>
                  <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>INSTALLATION SITE ADDRESS</div>
                  <div>{lead.address || 'Not specified'}</div>
                </div>
              </div>
            </div>

            {/* Solar Requirements */}
            <div className="crm-card">
              <div className="crm-card-header">
                <span className="crm-card-title">Technical Specifications</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>System Topology:</span>
                  <span style={{ fontWeight: '600', textTransform: 'capitalize' }}>{lead.system_type || 'on-grid'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>Target Capacity:</span>
                  <span style={{ fontWeight: '600' }}>{lead.expected_capacity_kw ? `${lead.expected_capacity_kw} kW` : 'TBD'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>Monthly Power Bill:</span>
                  <span style={{ fontWeight: '600' }}>{lead.monthly_electricity_bill ? `₹ ${lead.monthly_electricity_bill}` : 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>Priority:</span>
                  <span style={{ fontWeight: '600', textTransform: 'capitalize', color: lead.priority === 'urgent' ? '#f87171' : '#d8ee8e' }}>
                    {lead.priority}
                  </span>
                </div>

                {lead.lost_reason && (
                  <div style={{ marginTop: '8px', padding: '10px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px' }}>
                    <div style={{ color: '#f87171', fontSize: '0.75rem', fontWeight: 600 }}>REASON FOR LOST LEAD</div>
                    <div style={{ color: '#fca5a5', fontSize: '0.85rem', marginTop: '2px' }}>{lead.lost_reason}</div>
                  </div>
                )}

                {lead.notes && (
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>INTERNAL NOTES</div>
                    <p style={{ color: '#cbd5e1', fontSize: '0.85rem', marginTop: '2px' }}>{lead.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Assignment & Management Info */}
            <div className="crm-card">
              <div className="crm-card-header">
                <span className="crm-card-title">Ownership & Audit</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem' }}>
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>ASSIGNED SALES SPECIALIST</div>
                  <div style={{ fontWeight: '600', color: '#fff' }}>
                    {lead.assigned_profile?.full_name || lead.assigned_profile?.email || 'Unassigned'}
                  </div>
                  {lead.assigned_profile?.phone && (
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{lead.assigned_profile.phone}</div>
                  )}
                </div>

                <div>
                  <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>LEAD CREATED BY</div>
                  <div>{lead.created_profile?.full_name || lead.created_profile?.email || 'System'}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{new Date(lead.created_at).toLocaleString()}</div>
                </div>

                <div>
                  <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>CURRENT STAGE</div>
                  <span className={`crm-badge crm-badge-${lead.status}`} style={{ marginTop: '4px' }}>
                    {lead.status?.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Follow-ups & Survey Handoff Section */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
            {/* Scheduled Follow-ups */}
            <div className="crm-card">
              <div className="crm-card-header">
                <span className="crm-card-title">Follow-ups ({followUps.length})</span>
                <button
                  onClick={() => setShowFollowUpModal(true)}
                  className="crm-btn crm-btn-secondary crm-btn-sm"
                >
                  <Plus size={14} /> Schedule Follow-up
                </button>
              </div>

              {followUps.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '0.88rem' }}>No follow-ups recorded.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {followUps.map((fu) => (
                    <div
                      key={fu.id}
                      style={{
                        padding: '12px',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '8px',
                        borderLeft: `3px solid ${fu.status === 'completed' ? '#34d399' : '#facc15'}`
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, color: '#fff', textTransform: 'capitalize' }}>
                          {fu.follow_up_type?.replace('_', ' ')}
                        </span>
                        <span className={`crm-badge crm-badge-${fu.status}`}>{fu.status}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>
                        Due: {new Date(fu.scheduled_at).toLocaleString()}
                      </div>
                      {fu.notes && (
                        <div style={{ fontSize: '0.82rem', color: '#cbd5e1', marginTop: '4px' }}>
                          Note: {fu.notes}
                        </div>
                      )}
                      {fu.outcome && (
                        <div style={{ fontSize: '0.82rem', color: '#86efac', marginTop: '2px' }}>
                          Outcome: {fu.outcome}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Site Survey Requests (Handoff Progress) */}
            <div className="crm-card">
              <div className="crm-card-header">
                <span className="crm-card-title">Site Survey Requests ({surveys.length})</span>
                <button
                  onClick={() => setShowSurveyModal(true)}
                  className="crm-btn crm-btn-secondary crm-btn-sm"
                >
                  <Plus size={14} /> New Survey
                </button>
              </div>

              {surveys.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '0.88rem' }}>No site survey requests submitted yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {surveys.map((srv) => (
                    <div
                      key={srv.id}
                      style={{
                        padding: '12px',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '8px',
                        borderLeft: '3px solid #38bdf8'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <b style={{ color: '#38bdf8' }}>{srv.survey_code}</b>
                        <span className="crm-badge crm-badge-survey">{srv.feasibility_status}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>
                        Survey Date: {srv.survey_date ? new Date(srv.survey_date).toLocaleDateString() : 'Awaiting scheduling'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Interaction History & Activity Timeline */}
          <div className="crm-card">
            <div className="crm-card-header">
              <span className="crm-card-title">Interaction & Conversation History</span>
              <button
                onClick={() => setShowInteractionModal(true)}
                className="crm-btn crm-btn-secondary crm-btn-sm"
              >
                <Plus size={14} /> Log Call / Meeting / Note
              </button>
            </div>

            {interactions.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '0.88rem' }}>No interactions recorded yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {interactions.map((it) => (
                  <div
                    key={it.id}
                    style={{
                      padding: '12px 16px',
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.05)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: '#fff' }}>{it.subject}</span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {new Date(it.occurred_at).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px', textTransform: 'capitalize' }}>
                      Channel: {it.interaction_type} • By: {it.author?.full_name || it.author?.email || 'System'}
                    </div>
                    {it.summary && (
                      <p style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '6px', whiteSpace: 'pre-wrap' }}>
                        {it.summary}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* --- MODALS --- */}

      {/* 1. Status Modal */}
      {showStatusModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <form onSubmit={handleStatusChange} className="crm-card" style={{ width: '420px', maxWidth: '90%' }}>
            <h3 style={{ color: '#fff', marginBottom: '16px', fontSize: '1.1rem' }}>Update Lead Status</h3>
            <div className="crm-form-group">
              <label className="crm-label">New Status</label>
              <select
                className="crm-select"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
              >
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="follow_up_required">Follow-up Required</option>
                <option value="qualified">Qualified</option>
                <option value="survey_requested">Survey Requested</option>
                <option value="quotation_sent">Quotation Sent</option>
                <option value="converted">Converted</option>
                <option value="lost">Lost</option>
              </select>
            </div>

            {newStatus === 'lost' && (
              <div className="crm-form-group">
                <label className="crm-label">Reason for Lost Lead *</label>
                <textarea
                  required
                  className="crm-textarea"
                  placeholder="e.g. Budget constraint, selected competitor, roof structurally unviable..."
                  value={lostReason}
                  onChange={(e) => setLostReason(e.target.value)}
                />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button type="button" onClick={() => setShowStatusModal(false)} className="crm-btn crm-btn-secondary crm-btn-sm">
                Cancel
              </button>
              <button type="submit" className="crm-btn crm-btn-primary crm-btn-sm">
                Save Status
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. Reassign Modal */}
      {showAssignModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <form onSubmit={handleAssign} className="crm-card" style={{ width: '440px', maxWidth: '90%' }}>
            <h3 style={{ color: '#fff', marginBottom: '16px', fontSize: '1.1rem' }}>Assign / Reassign Lead</h3>
            <div className="crm-form-group">
              <label className="crm-label">Select Sales Specialist *</label>
              <select
                required
                className="crm-select"
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
              >
                <option value="">-- Choose Employee --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name || emp.email} ({emp.activeLeadCount} active leads)
                  </option>
                ))}
              </select>
            </div>

            <div className="crm-form-group">
              <label className="crm-label">Assignment Notes</label>
              <textarea
                className="crm-textarea"
                placeholder="Reason or instructions for the new assignee..."
                value={assignNotes}
                onChange={(e) => setAssignNotes(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button type="button" onClick={() => setShowAssignModal(false)} className="crm-btn crm-btn-secondary crm-btn-sm">
                Cancel
              </button>
              <button type="submit" className="crm-btn crm-btn-primary crm-btn-sm">
                Confirm Assignment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. Schedule Follow-up Modal */}
      {showFollowUpModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <form onSubmit={handleCreateFollowUp} className="crm-card" style={{ width: '440px', maxWidth: '90%' }}>
            <h3 style={{ color: '#fff', marginBottom: '16px', fontSize: '1.1rem' }}>Schedule Follow-up</h3>
            <div className="crm-form-group">
              <label className="crm-label">Follow-up Type</label>
              <select className="crm-select" value={fuType} onChange={(e) => setFuType(e.target.value)}>
                <option value="phone_call">Phone Call</option>
                <option value="whatsapp">WhatsApp Message</option>
                <option value="email">Email</option>
                <option value="meeting">Physical Meeting</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="crm-form-group">
              <label className="crm-label">Date & Time *</label>
              <input
                type="datetime-local"
                required
                className="crm-input"
                value={fuDate}
                onChange={(e) => setFuDate(e.target.value)}
              />
            </div>

            <div className="crm-form-group">
              <label className="crm-label">Notes / Agenda</label>
              <textarea
                className="crm-textarea"
                placeholder="Key points to discuss (quotation review, roof feasibility, etc.)"
                value={fuNotes}
                onChange={(e) => setFuNotes(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button type="button" onClick={() => setShowFollowUpModal(false)} className="crm-btn crm-btn-secondary crm-btn-sm">
                Cancel
              </button>
              <button type="submit" className="crm-btn crm-btn-primary crm-btn-sm">
                Save Schedule
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. Log Interaction Modal */}
      {showInteractionModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <form onSubmit={handleLogInteraction} className="crm-card" style={{ width: '460px', maxWidth: '90%' }}>
            <h3 style={{ color: '#fff', marginBottom: '16px', fontSize: '1.1rem' }}>Log Customer Interaction</h3>
            <div className="crm-form-group">
              <label className="crm-label">Interaction Channel</label>
              <select className="crm-select" value={interType} onChange={(e) => setInterType(e.target.value)}>
                <option value="call">Phone Call</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
                <option value="meeting">Meeting</option>
                <option value="site_visit">Site Visit</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="crm-form-group">
              <label className="crm-label">Subject / Topic *</label>
              <input
                type="text"
                required
                className="crm-input"
                placeholder="e.g. Discussed 5kW Hybrid system quotation"
                value={interSubject}
                onChange={(e) => setInterSubject(e.target.value)}
              />
            </div>

            <div className="crm-form-group">
              <label className="crm-label">Summary / Notes</label>
              <textarea
                className="crm-textarea"
                placeholder="Details of what was discussed, client objections, agreement..."
                value={interSummary}
                onChange={(e) => setInterSummary(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button type="button" onClick={() => setShowInteractionModal(false)} className="crm-btn crm-btn-secondary crm-btn-sm">
                Cancel
              </button>
              <button type="submit" className="crm-btn crm-btn-primary crm-btn-sm">
                Log Interaction
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 5. Create Survey Request Modal */}
      {showSurveyModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <form onSubmit={handleSurveyRequest} className="crm-card" style={{ width: '460px', maxWidth: '90%' }}>
            <h3 style={{ color: '#fff', marginBottom: '16px', fontSize: '1.1rem' }}>Request Site Survey</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.84rem', marginBottom: '16px' }}>
              Pass this lead to the technical survey team to assess roof feasibility, shadow profile, and wiring.
            </p>

            <div className="crm-form-group">
              <label className="crm-label">Preferred Survey Date</label>
              <input
                type="date"
                className="crm-input"
                value={surveyDate}
                onChange={(e) => setSurveyDate(e.target.value)}
              />
            </div>

            <div className="crm-form-group">
              <label className="crm-label">Special Instructions for Field Surveyor</label>
              <textarea
                className="crm-textarea"
                placeholder="e.g. Customer is available after 2 PM; roof access via external staircase..."
                value={surveyNotes}
                onChange={(e) => setSurveyNotes(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button type="button" onClick={() => setShowSurveyModal(false)} className="crm-btn crm-btn-secondary crm-btn-sm">
                Cancel
              </button>
              <button type="submit" className="crm-btn crm-btn-primary crm-btn-sm">
                Submit Request
              </button>
            </div>
          </form>
        </div>
      )}
    </SalesLayout>
  );
}
