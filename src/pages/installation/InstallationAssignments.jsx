import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import InstallationLayout from './InstallationLayout';
import { installationApi } from '@/services/api';
import {
  Users,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  RefreshCw,
  FolderGit2
} from 'lucide-react';

export default function InstallationAssignments() {
  const [jobs, setJobs] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  // Assignment Cockpit Form State
  const [selectedJobId, setSelectedJobId] = useState('');
  const [assignments, setAssignments] = useState([
    { technician_id: '', role_on_job: 'lead_technician', is_primary: true }
  ]);
  const [scheduledStart, setScheduledStart] = useState('');
  const [expectedCompletion, setExpectedCompletion] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [jobsRes, techsRes] = await Promise.all([
        installationApi.getJobs({ limit: 100 }),
        installationApi.getTechnicians()
      ]);

      const allJobs = jobsRes.data?.jobs || [];
      setJobs(allJobs);
      setTechnicians(techsRes.data?.technicians || []);

      // Pre-select first pending or unassigned job
      const unassigned = allJobs.find(j => (j.assigned_technicians || []).length === 0 || j.status === 'pending');
      if (unassigned) {
        setSelectedJobId(unassigned.id);
      } else if (allJobs.length > 0) {
        setSelectedJobId(allJobs[0].id);
      }
    } catch (err) {
      setError(err?.message || 'Failed to load assignment data.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTechnicianRow = () => {
    setAssignments(prev => [
      ...prev,
      { technician_id: '', role_on_job: 'helper', is_primary: false }
    ]);
  };

  const handleRemoveTechnicianRow = (index) => {
    setAssignments(prev => prev.filter((_, i) => i !== index));
  };

  const handleAssignmentChange = (index, field, value) => {
    setAssignments(prev => prev.map((item, i) => {
      if (i !== index) {
        // If setting is_primary true on this item, set it false on others
        if (field === 'is_primary' && value === true) {
          return { ...item, is_primary: false, role_on_job: item.role_on_job === 'lead_technician' ? 'technician' : item.role_on_job };
        }
        return item;
      }
      const updated = { ...item, [field]: value };
      if (field === 'is_primary' && value === true) {
        updated.role_on_job = 'lead_technician';
      }
      return updated;
    }));
  };

  const handleSaveAssignment = async (e) => {
    e.preventDefault();
    if (!selectedJobId) {
      setError('Please select an installation project.');
      return;
    }

    const validAssignments = assignments.filter(a => a.technician_id);
    if (validAssignments.length === 0) {
      setError('Please select at least one technician for the team.');
      return;
    }

    // Check duplicate technician selections
    const techIds = validAssignments.map(a => a.technician_id);
    if (new Set(techIds).size !== techIds.length) {
      setError('Cannot assign the same technician multiple times to one project.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setNotice(null);

      const res = await installationApi.assignTechnicians(selectedJobId, {
        assignments: validAssignments,
        scheduled_start: scheduledStart || undefined,
        expected_completion: expectedCompletion || undefined,
        notes: notes || undefined
      });

      setNotice({ type: 'success', message: res.message || 'Technician team assigned successfully.' });
      loadData();
    } catch (err) {
      setError(err?.message || 'Failed to assign technicians.');
    } finally {
      setSaving(false);
    }
  };

  const selectedJob = jobs.find(j => j.id === selectedJobId);

  return (
    <InstallationLayout
      title="Team Assignments Cockpit"
      subtitle="Allocate lead technicians, assembly helpers, and prevent technician double-booking"
      actions={
        <button onClick={loadData} className="inst-btn inst-btn-secondary inst-btn-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      }
    >
      {notice && (
        <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '12px 16px', borderRadius: 8, color: '#34d399', marginBottom: 20 }}>
          {notice.message}
        </div>
      )}

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '12px 16px', borderRadius: 8, color: '#f87171', marginBottom: 20 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px' }}>
        {/* Assignment Form */}
        <div className="inst-card">
          <div className="inst-card-header">
            <span className="inst-card-title">
              <Users size={18} color="#f59e0b" /> Assign Technicians to Project
            </span>
          </div>
          <form onSubmit={handleSaveAssignment} style={{ padding: '24px' }}>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: '0.82rem', color: '#cbd5e1', marginBottom: 6, fontWeight: 500 }}>
                Target Installation Project
              </label>
              <select
                className="inst-select"
                style={{ width: '100%' }}
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
              >
                {jobs.map(j => (
                  <option key={j.id} value={j.id}>
                    {j.installation_code} — {j.customer_name} ({j.system_capacity_kw}kW, {j.status.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            {selectedJob && (
              <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 14, marginBottom: 20, fontSize: '0.82rem' }}>
                <div style={{ color: '#fff', fontWeight: 600, marginBottom: 4 }}>{selectedJob.customer_name}</div>
                <div style={{ color: '#94a3b8', marginBottom: 4 }}>📍 {selectedJob.site_address}</div>
                <div style={{ color: '#38bdf8' }}>⚡ System: {selectedJob.system_capacity_kw} kW {selectedJob.system_type}</div>
              </div>
            )}

            {/* Technicians Selection List */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: '0.82rem', color: '#cbd5e1', fontWeight: 600 }}>
                  Assigned Personnel Team
                </label>
                <button
                  type="button"
                  onClick={handleAddTechnicianRow}
                  className="inst-btn inst-btn-secondary inst-btn-sm"
                  style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                >
                  <Plus size={12} /> Add Helper / Tech
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {assignments.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'rgba(15, 23, 42, 0.5)', padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
                    <select
                      className="inst-select"
                      style={{ flex: 2 }}
                      value={item.technician_id}
                      onChange={(e) => handleAssignmentChange(idx, 'technician_id', e.target.value)}
                    >
                      <option value="">Select Technician...</option>
                      {technicians.map(t => (
                        <option key={t.id} value={t.id} disabled={!t.is_available}>
                          {t.full_name} ({t.employee_code}) {!t.is_available ? '(Unavailable)' : `[${t.active_assignments}/${t.max_daily_jobs}]`}
                        </option>
                      ))}
                    </select>

                    <select
                      className="inst-select"
                      style={{ flex: 1.5 }}
                      value={item.role_on_job}
                      onChange={(e) => handleAssignmentChange(idx, 'role_on_job', e.target.value)}
                    >
                      <option value="lead_technician">Lead Technician</option>
                      <option value="technician">Technician</option>
                      <option value="helper">Helper</option>
                      <option value="supervisor">Supervisor</option>
                    </select>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: '#94a3b8', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="primary_lead"
                        checked={Boolean(item.is_primary)}
                        onChange={() => handleAssignmentChange(idx, 'is_primary', true)}
                      />
                      Lead
                    </label>

                    {assignments.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTechnicianRow(idx)}
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Schedule Dates */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: 4 }}>
                  Planned Installation Date
                </label>
                <input
                  type="date"
                  className="inst-input"
                  style={{ width: '100%' }}
                  value={scheduledStart}
                  onChange={(e) => setScheduledStart(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: 4 }}>
                  Expected Completion Date
                </label>
                <input
                  type="date"
                  className="inst-input"
                  style={{ width: '100%' }}
                  value={expectedCompletion}
                  onChange={(e) => setExpectedCompletion(e.target.value)}
                />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: 4 }}>
                Special Instructions / Assignment Notes
              </label>
              <textarea
                className="inst-input"
                rows="2"
                style={{ width: '100%' }}
                placeholder="Bring safety harnesses, scaffoldings, or special cable sizes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="inst-btn inst-btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {saving ? 'Validating & Assigning Team...' : 'Confirm Team Assignment & Schedule'}
            </button>
          </form>
        </div>

        {/* Existing Assignments Overview */}
        <div className="inst-card">
          <div className="inst-card-header">
            <span className="inst-card-title">
              <Calendar size={18} color="#38bdf8" /> Current Project Assignments
            </span>
          </div>
          <div style={{ padding: '20px', maxHeight: '600px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {jobs.map(j => (
              <div
                key={j.id}
                onClick={() => setSelectedJobId(j.id)}
                style={{
                  background: selectedJobId === j.id ? 'rgba(245, 158, 11, 0.1)' : 'rgba(15, 23, 42, 0.6)',
                  border: `1px solid ${selectedJobId === j.id ? '#f59e0b' : 'rgba(255, 255, 255, 0.08)'}`,
                  borderRadius: 10,
                  padding: 14,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, color: '#f59e0b' }}>{j.installation_code}</span>
                  <span className={`inst-badge inst-badge-${j.status}`}>{j.status.replace('_', ' ')}</span>
                </div>
                <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>{j.customer_name}</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '4px 0' }}>
                  📅 {j.planned_installation_date || 'No date set'} • {j.system_capacity_kw} kW {j.system_type}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 6 }}>
                  <strong>Team:</strong>{' '}
                  {(j.assigned_technicians || []).length > 0 ? (
                    j.assigned_technicians.map(a => `${a.full_name} (${a.role_on_job.replace('_', ' ')})`).join(', ')
                  ) : (
                    <span style={{ color: '#f59e0b' }}>Unassigned</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </InstallationLayout>
  );
}
