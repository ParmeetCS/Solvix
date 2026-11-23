import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '@/components/PortalLayout';
import { surveyApi } from '@/services/api';
import {
  CalendarCheck2,
  UserCheck,
  Phone,
  Mail,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export default function SurveyAssignments() {
  const [surveyors, setSurveyors] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Quick Assign Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedSurveyId, setSelectedSurveyId] = useState('');
  const [selectedSurveyorId, setSelectedSurveyorId] = useState('');
  const [assignDate, setAssignDate] = useState('');
  const [assignTime, setAssignTime] = useState('10:00 AM - 12:00 PM');
  const [assignNotes, setAssignNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [survRes, reqRes, dashRes] = await Promise.all([
        surveyApi.getSurveyors(),
        surveyApi.getRequests(),
        surveyApi.getDashboard()
      ]);
      setSurveyors(survRes.data?.surveyors || []);
      setSurveys(reqRes.data?.surveys || []);
      setAssignments(dashRes.data?.recentAssignments || []);
    } catch (err) {
      setError(err?.message || 'Failed to load assignments.');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSurveyId || !selectedSurveyorId) return;

    try {
      setActionLoading(true);
      await surveyApi.assignSurvey(selectedSurveyId, {
        assigned_to: selectedSurveyorId,
        scheduled_date: assignDate || undefined,
        scheduled_time: assignTime || undefined,
        notes: assignNotes
      });
      setShowAssignModal(false);
      setSelectedSurveyId('');
      setSelectedSurveyorId('');
      setAssignNotes('');
      loadData();
    } catch (err) {
      alert(err?.message || 'Failed to assign survey.');
    } finally {
      setActionLoading(false);
    }
  };

  const unassignedSurveys = surveys.filter(s => s.status === 'pending');

  return (
    <PortalLayout
      title="Surveyor Assignments & Workload Capacity"
      subtitle="Monitor field engineer availability, balance survey workload, and dispatch site inspections"
      actions={
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={loadData}
            className="survey-btn survey-btn-secondary survey-btn-sm"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            onClick={() => setShowAssignModal(true)}
            className="survey-btn survey-btn-primary survey-btn-sm"
          >
            <UserCheck size={14} /> New Assignment
          </button>
        </div>
      }
    >
      {/* Unassigned Surveys Alert banner if any */}
      {unassignedSurveys.length > 0 && (
        <div
          className="survey-card"
          style={{
            borderColor: 'var(--c-amber)',
            background: 'rgba(245, 158, 11, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertCircle size={22} style={{ color: 'var(--c-amber-soft)' }} />
            <div>
              <div style={{ fontWeight: 600, color: 'var(--c-amber-soft)' }}>
                {unassignedSurveys.length} Survey Request(s) Pending Assignment
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-soft)', marginTop: '2px' }}>
                Field engineers need to be assigned to these incoming requests from Sales.
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              setSelectedSurveyId(unassignedSurveys[0]?.id);
              setSelectedSurveyorId(surveyors[0]?.id || '');
              setShowAssignModal(true);
            }}
            className="survey-btn survey-btn-primary survey-btn-sm"
          >
            Assign First Pending
          </button>
        </div>
      )}

      {/* Surveyor Cards Grid */}
      <div>
        <h3 style={{ color: 'var(--text-strong)', fontSize: '1.1rem', marginBottom: '14px' }}>
          Field Surveyors & Workload Status
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {surveyors.map((sr) => {
            const activeVisits = sr.active_surveys || 0;
            const isHighLoad = activeVisits >= 4;

            return (
              <div key={sr.id} className="survey-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <h4 style={{ margin: 0, color: 'var(--text-strong)', fontSize: '1.05rem', fontWeight: 600 }}>
                        {sr.full_name}
                      </h4>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {sr.role || 'Survey Engineer'}
                      </span>
                    </div>

                    <span
                      className="survey-badge"
                      style={{
                        background: isHighLoad ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                        color: isHighLoad ? 'var(--c-red)' : 'var(--c-green)',
                        border: `1px solid ${isHighLoad ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
                      }}
                    >
                      {isHighLoad ? 'High Load' : 'Available'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem', color: 'var(--text-soft)', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Phone size={13} style={{ color: 'var(--text-muted)' }} /> {sr.phone || '+91 98101 00000'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Mail size={13} style={{ color: 'var(--text-muted)' }} /> {sr.email}
                    </div>
                  </div>

                  {/* Workload Meter */}
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Active Visits Allocated:</span>
                      <span style={{ fontWeight: 700, color: 'var(--c-blue)' }}>{activeVisits} / 5 max</span>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(var(--ink-rgb), 0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min((activeVisits / 5) * 100, 100)}%`,
                          background: isHighLoad ? '#ef4444' : '#38bdf8',
                          borderRadius: '3px'
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '6px' }}>
                      <span>Completed: {sr.completed_surveys || 0}</span>
                      <span>Quality Rating: {sr.rating || '4.9'} / 5.0</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedSurveyorId(sr.id);
                    if (unassignedSurveys.length > 0) {
                      setSelectedSurveyId(unassignedSurveys[0].id);
                    }
                    setShowAssignModal(true);
                  }}
                  className="survey-btn survey-btn-secondary survey-btn-sm"
                  style={{ width: '100%' }}
                >
                  <UserCheck size={14} /> Assign Survey to {sr.full_name.split(' ')[0]}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Assignment Activity */}
      <div className="survey-card" style={{ marginTop: '20px' }}>
        <div className="survey-card-header">
          <h3>
            <CalendarCheck2 size={18} style={{ color: 'var(--c-blue)' }} />
            Assignment History & Dispatches
          </h3>
        </div>

        <div className="survey-table-wrapper">
          <table className="survey-table">
            <thead>
              <tr>
                <th>Survey Code</th>
                <th>Customer & Location</th>
                <th>Assigned Engineer</th>
                <th>Scheduled Date</th>
                <th>Assigned By</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((asg) => (
                <tr key={asg.id}>
                  <td>
                    <Link
                      to={`/survey/requests/${asg.survey_id}`}
                      style={{ color: 'var(--c-blue)', fontWeight: 600, textDecoration: 'none' }}
                    >
                      {asg.survey_code}
                    </Link>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, color: 'var(--text-strong)' }}>{asg.customer_name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{asg.site_address}</div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 500, color: 'var(--c-blue)' }}>{asg.assigned_to_name}</span>
                  </td>
                  <td>
                    <span style={{ color: 'var(--c-blue)' }}>
                      {asg.scheduled_at ? new Date(asg.scheduled_at).toLocaleDateString() : 'Awaiting date'}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {asg.assigned_by_name || 'Admin'}
                    </span>
                  </td>
                  <td>
                    <span className="survey-badge survey-badge-assigned">
                      {asg.status || 'Assigned'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <Link
                      to={`/survey/requests/${asg.survey_id}`}
                      className="survey-btn survey-btn-secondary survey-btn-sm"
                    >
                      Inspect
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Assign Modal */}
      {showAssignModal && (
        <div className="survey-modal-overlay">
          <div className="survey-modal-content">
            <h3 style={{ color: 'var(--text-strong)', margin: '0 0 16px 0' }}>Assign Survey to Field Engineer</h3>
            <form onSubmit={handleAssignSubmit}>
              <div className="survey-form-group">
                <label className="survey-label">Select Survey Request</label>
                <select
                  className="survey-select"
                  value={selectedSurveyId}
                  onChange={(e) => setSelectedSurveyId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Survey --</option>
                  {surveys.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.survey_code} — {s.customer_name} ({s.site_address || s.city}) [{s.status}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="survey-form-group">
                <label className="survey-label">Field Engineer</label>
                <select
                  className="survey-select"
                  value={selectedSurveyorId}
                  onChange={(e) => setSelectedSurveyorId(e.target.value)}
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
                  <label className="survey-label">Time Slot</label>
                  <select
                    className="survey-select"
                    value={assignTime}
                    onChange={(e) => setAssignTime(e.target.value)}
                  >
                    <option value="10:00 AM - 12:00 PM">10:00 AM - 12:00 PM</option>
                    <option value="01:00 PM - 03:00 PM">01:00 PM - 03:00 PM</option>
                    <option value="03:00 PM - 05:00 PM">03:00 PM - 05:00 PM</option>
                  </select>
                </div>
              </div>

              <div className="survey-form-group">
                <label className="survey-label">Notes for Surveyor</label>
                <textarea
                  className="survey-textarea"
                  placeholder="e.g. Verify inverter cable route through elevator shaft..."
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="survey-btn survey-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="survey-btn survey-btn-primary"
                >
                  {actionLoading ? 'Assigning...' : 'Dispatch Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
