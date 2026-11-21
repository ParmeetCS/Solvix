import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PortalLayout from '@/components/PortalLayout';
import { surveyApi } from '@/services/api';
import {
  ClipboardList,
  Search,
  Filter,
  UserCheck,
  Calendar,
  FileEdit,
  FileCheck,
  ArrowRight,
  Eye,
  AlertCircle,
  PlusCircle,
  RefreshCw
} from 'lucide-react';

export default function SurveyRequestsList() {
  const [surveys, setSurveys] = useState([]);
  const [surveyors, setSurveyors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Modals
  const [assignModalSurvey, setAssignModalSurvey] = useState(null);
  const [selectedSurveyor, setSelectedSurveyor] = useState('');
  const [assignDate, setAssignDate] = useState('');
  const [assignTime, setAssignTime] = useState('10:00 AM - 12:00 PM');
  const [assignNotes, setAssignNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // New Request Modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newCity, setNewCity] = useState('Delhi NCR');
  const [newPriority, setNewPriority] = useState('medium');
  const [newNotes, setNewNotes] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, [statusFilter, priorityFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [srvRes, surRes] = await Promise.all([
        surveyApi.getRequests({
          search,
          status: statusFilter,
          priority: priorityFilter
        }),
        surveyApi.getSurveyors()
      ]);
      setSurveys(srvRes.data?.surveys || []);
      setSurveyors(surRes.data?.surveyors || []);
    } catch (err) {
      setError(err?.message || 'Failed to load survey requests.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSurveyor || !assignModalSurvey) return;

    try {
      setActionLoading(true);
      await surveyApi.assignSurvey(assignModalSurvey.id, {
        assigned_to: selectedSurveyor,
        scheduled_date: assignDate || undefined,
        scheduled_time: assignTime || undefined,
        notes: assignNotes
      });
      setAssignModalSurvey(null);
      setSelectedSurveyor('');
      setAssignNotes('');
      loadData();
    } catch (err) {
      alert(err?.message || 'Failed to assign survey.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!newCustomerName || !newPhone) return;

    try {
      setActionLoading(true);
      await surveyApi.createRequest({
        customer_name: newCustomerName,
        contact_phone: newPhone,
        site_address: newAddress,
        city: newCity,
        priority: newPriority,
        site_observations: newNotes
      });
      setShowNewModal(false);
      setNewCustomerName('');
      setNewPhone('');
      setNewAddress('');
      setNewNotes('');
      loadData();
    } catch (err) {
      alert(err?.message || 'Failed to create survey request.');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      pending: { label: 'Pending', cls: 'survey-badge-pending' },
      assigned: { label: 'Assigned', cls: 'survey-badge-assigned' },
      scheduled: { label: 'Scheduled', cls: 'survey-badge-scheduled' },
      in_progress: { label: 'In Progress', cls: 'survey-badge-in_progress' },
      submitted: { label: 'Submitted', cls: 'survey-badge-submitted' },
      approved: { label: 'Approved', cls: 'survey-badge-approved' },
      rejected: { label: 'Rejected', cls: 'survey-badge-rejected' },
      revisit_required: { label: 'Revisit Required', cls: 'survey-badge-revisit_required' }
    };
    const item = map[status] || { label: status, cls: 'survey-badge-pending' };
    return <span className={`survey-badge ${item.cls}`}>{item.label}</span>;
  };

  return (
    <PortalLayout
      title="Survey Requests Pipeline"
      subtitle="Manage technical site inspections, assign field engineers, and track survey lifecycle"
      actions={
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={loadData}
            className="survey-btn survey-btn-secondary survey-btn-sm"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            onClick={() => setShowNewModal(true)}
            className="survey-btn survey-btn-primary survey-btn-sm"
          >
            <PlusCircle size={15} /> New Survey Request
          </button>
        </div>
      }
    >
      {/* Search & Filter Bar */}
      <div className="survey-card" style={{ padding: '16px 20px' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by code, customer, phone, or location..."
              className="survey-input"
              style={{ paddingLeft: '36px' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <select
              className="survey-select"
              style={{ width: '180px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="assigned">Assigned</option>
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="revisit_required">Revisit Required</option>
            </select>

            <select
              className="survey-select"
              style={{ width: '150px' }}
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <button type="submit" className="survey-btn survey-btn-primary survey-btn-sm">
              Filter
            </button>
          </div>
        </form>
      </div>

      {/* Main Table */}
      <div className="survey-card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading site survey requests...
          </div>
        ) : error ? (
          <div style={{ padding: '30px', color: 'var(--c-red)' }}>{error}</div>
        ) : surveys.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-dim)' }}>
            No survey requests match your current filters.
          </div>
        ) : (
          <div className="survey-table-wrapper">
            <table className="survey-table">
              <thead>
                <tr>
                  <th>Survey Code</th>
                  <th>Customer Details</th>
                  <th>Site Location</th>
                  <th>Priority</th>
                  <th>Assigned Surveyor</th>
                  <th>Visit Schedule</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {surveys.map((srv) => (
                  <tr key={srv.id}>
                    <td>
                      <Link
                        to={`/survey/requests/${srv.id}`}
                        style={{ fontWeight: 600, color: 'var(--c-blue)', textDecoration: 'none' }}
                      >
                        {srv.survey_code}
                      </Link>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        {new Date(srv.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, color: 'var(--text-strong)' }}>{srv.customer_name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {srv.contact_phone || 'No phone'}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.84rem', color: 'var(--text-soft)' }}>
                        {srv.site_address || srv.city}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'capitalize' }}>
                        {srv.property_type || 'Residential'}
                      </div>
                    </td>
                    <td>
                      <span className={`survey-priority-${srv.priority || 'medium'}`} style={{ textTransform: 'capitalize', fontSize: '0.82rem' }}>
                        {srv.priority || 'medium'}
                      </span>
                    </td>
                    <td>
                      {srv.assigned_to_name ? (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-soft)' }}>
                          {srv.assigned_to_name}
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setAssignModalSurvey(srv);
                            setSelectedSurveyor(surveyors[0]?.id || '');
                          }}
                          className="survey-btn survey-btn-secondary survey-btn-sm"
                          style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                        >
                          <UserCheck size={12} /> Assign Now
                        </button>
                      )}
                    </td>
                    <td>
                      {srv.scheduled_date ? (
                        <div style={{ fontSize: '0.82rem', color: 'var(--c-blue)' }}>
                          {srv.scheduled_date}
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            {srv.scheduled_time || 'General'}
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Unscheduled</span>
                      )}
                    </td>
                    <td>{getStatusBadge(srv.status)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <Link
                          to={`/survey/requests/${srv.id}`}
                          className="survey-btn survey-btn-secondary survey-btn-sm"
                          title="View Details"
                        >
                          <Eye size={13} /> View
                        </Link>
                        <Link
                          to={`/survey/requests/${srv.id}/inspection`}
                          className="survey-btn survey-btn-primary survey-btn-sm"
                          title="Field Inspection Form"
                        >
                          <FileEdit size={13} /> Form
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assignment Modal */}
      {assignModalSurvey && (
        <div className="survey-modal-overlay">
          <div className="survey-modal-content">
            <h3 style={{ color: 'var(--text-strong)', margin: '0 0 16px 0' }}>
              Assign Survey: {assignModalSurvey.survey_code}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
              Assign field engineer for site survey at <b>{assignModalSurvey.customer_name}</b> ({assignModalSurvey.site_address || assignModalSurvey.city}).
            </p>

            <form onSubmit={handleAssignSubmit}>
              <div className="survey-form-group">
                <label className="survey-label">Select Survey Engineer</label>
                <select
                  className="survey-select"
                  value={selectedSurveyor}
                  onChange={(e) => setSelectedSurveyor(e.target.value)}
                  required
                >
                  <option value="">-- Choose Surveyor --</option>
                  {surveyors.map((sr) => (
                    <option key={sr.id} value={sr.id}>
                      {sr.full_name} ({sr.active_surveys || 0} active visits)
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="survey-form-group">
                  <label className="survey-label">Visit Date</label>
                  <input
                    type="date"
                    className="survey-input"
                    value={assignDate}
                    onChange={(e) => setAssignDate(e.target.value)}
                  />
                </div>
                <div className="survey-form-group">
                  <label className="survey-label">Preferred Time Slot</label>
                  <select
                    className="survey-select"
                    value={assignTime}
                    onChange={(e) => setAssignTime(e.target.value)}
                  >
                    <option value="10:00 AM - 12:00 PM">10:00 AM - 12:00 PM (Morning)</option>
                    <option value="01:00 PM - 03:00 PM">01:00 PM - 03:00 PM (Afternoon)</option>
                    <option value="03:00 PM - 05:00 PM">03:00 PM - 05:00 PM (Evening)</option>
                  </select>
                </div>
              </div>

              <div className="survey-form-group">
                <label className="survey-label">Special Instructions for Surveyor</label>
                <textarea
                  className="survey-textarea"
                  placeholder="e.g. Roof access through internal staircase; meet estate manager Mr. Gupta."
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setAssignModalSurvey(null)}
                  className="survey-btn survey-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="survey-btn survey-btn-primary"
                >
                  {actionLoading ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Survey Request Modal */}
      {showNewModal && (
        <div className="survey-modal-overlay">
          <div className="survey-modal-content">
            <h3 style={{ color: 'var(--text-strong)', margin: '0 0 16px 0' }}>Create Site Survey Request</h3>
            <form onSubmit={handleCreateRequest}>
              <div className="survey-form-group">
                <label className="survey-label">Customer / Company Name</label>
                <input
                  type="text"
                  className="survey-input"
                  placeholder="e.g. Ramesh Chandra"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="survey-form-group">
                  <label className="survey-label">Contact Phone</label>
                  <input
                    type="text"
                    className="survey-input"
                    placeholder="+91 98..."
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    required
                  />
                </div>
                <div className="survey-form-group">
                  <label className="survey-label">Priority</label>
                  <select
                    className="survey-select"
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                  >
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div className="survey-form-group">
                <label className="survey-label">Site Address</label>
                <input
                  type="text"
                  className="survey-input"
                  placeholder="Building/Plot No., Street, Sector"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                />
              </div>

              <div className="survey-form-group">
                <label className="survey-label">City / Region</label>
                <input
                  type="text"
                  className="survey-input"
                  placeholder="e.g. New Delhi / Gurugram"
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                />
              </div>

              <div className="survey-form-group">
                <label className="survey-label">Survey Request Notes</label>
                <textarea
                  className="survey-textarea"
                  placeholder="Customer requirements, expected plant capacity, roof type info..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="survey-btn survey-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="survey-btn survey-btn-primary"
                >
                  {actionLoading ? 'Creating...' : 'Create Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
