import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '@/components/PortalLayout';
import { installationApi } from '@/services/api';
import {
  Calendar,
  Clock,
  Wrench,
  MapPin,
  RefreshCw,
  ArrowRight,
  Eye,
  AlertTriangle
} from 'lucide-react';

export default function InstallationSchedule() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');

  // Reschedule modal
  const [rescheduleJob, setRescheduleJob] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [rescheduleNotes, setRescheduleNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await installationApi.getJobs({ limit: 100 });
      setJobs(res.data?.jobs || []);
    } catch (err) {
      setError(err?.message || 'Failed to load schedule.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReschedule = (job) => {
    setRescheduleJob(job);
    setNewDate(job.planned_installation_date || '');
    setRescheduleNotes('');
    setNotice(null);
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!newDate) return;

    try {
      setSaving(true);
      setError(null);
      const res = await installationApi.scheduleJob(rescheduleJob.id, {
        scheduled_start: newDate,
        notes: rescheduleNotes
      });
      setNotice({ type: 'success', message: `Job ${rescheduleJob.installation_code} successfully rescheduled to ${newDate}.` });
      setTimeout(() => {
        setRescheduleJob(null);
        loadSchedule();
      }, 1000);
    } catch (err) {
      setError(err?.message || 'Failed to reschedule job.');
    } finally {
      setSaving(false);
    }
  };

  const filteredJobs = jobs.filter(j => {
    if (selectedDate) {
      return j.planned_installation_date === selectedDate || (j.scheduled_start && j.scheduled_start.startsWith(selectedDate));
    }
    return true;
  });

  return (
    <PortalLayout
      title="Installation Schedule & Timeline"
      subtitle="Comprehensive calendar of upcoming visits, dates, and technician deployment"
      actions={
        <button onClick={loadSchedule} className="inst-btn inst-btn-secondary inst-btn-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      }
    >
      {/* Date Filter Bar */}
      <div className="inst-filter-bar">
        <label style={{ fontSize: '0.85rem', color: 'var(--text-soft)', fontWeight: 500 }}>
          Filter by Date:
        </label>
        <input
          type="date"
          className="inst-input"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
        {selectedDate && (
          <button
            onClick={() => setSelectedDate('')}
            className="inst-btn inst-btn-secondary inst-btn-sm"
          >
            Show All Dates
          </button>
        )}
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '12px 16px', borderRadius: 8, color: 'var(--c-red)', marginBottom: 20 }}>
          {error}
        </div>
      )}

      {notice && (
        <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '12px 16px', borderRadius: 8, color: 'var(--c-green)', marginBottom: 20 }}>
          {notice.message}
        </div>
      )}

      {/* Schedule Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
        {filteredJobs.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
            No installations scheduled for this selection.
          </div>
        ) : (
          filteredJobs.map(job => (
            <div key={job.id} className="inst-card" style={{ marginBottom: 0, display: 'flex', flexDirection: 'column' }}>
              <div className="inst-card-header" style={{ padding: '14px 18px' }}>
                <span style={{ fontWeight: 700, color: 'var(--c-amber)' }}>{job.installation_code}</span>
                <span className={`inst-badge inst-badge-${job.status}`}>{String(job.status || '').replace('_', ' ')}</span>
              </div>

              <div style={{ padding: '18px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-strong)' }}>{job.customer_name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                  <MapPin size={14} style={{ flexShrink: 0, marginTop: 2, color: 'var(--c-amber)' }} />
                  <span>{job.site_address}</span>
                </div>

                <div style={{ background: 'rgba(var(--surface-rgb), 0.6)', border: '1px solid rgba(var(--ink-rgb), 0.06)', borderRadius: 8, padding: 10, marginTop: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Planned Visit Date:</span>
                    <strong style={{ color: 'var(--c-blue)' }}>{job.planned_installation_date || 'Unscheduled'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Capacity & Type:</span>
                    <span style={{ color: 'var(--text-strong)' }}>{job.system_capacity_kw} kW ({job.system_type})</span>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 4, fontWeight: 600 }}>
                    Assigned Technicians
                  </div>
                  {(job.assigned_technicians || []).length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {job.assigned_technicians.map((t, i) => (
                        <span key={i} style={{ background: 'rgba(var(--ink-rgb), 0.06)', color: 'var(--text-soft)', padding: '3px 8px', borderRadius: 4, fontSize: '0.75rem' }}>
                          {t.full_name} ({String(t.role_on_job || '').replace('_', ' ')})
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ color: 'var(--c-amber)', fontSize: '0.78rem' }}>No team assigned</span>
                  )}
                </div>
              </div>

              <div style={{ padding: '12px 18px', background: 'rgba(var(--surface-rgb), 0.4)', borderTop: '1px solid rgba(var(--ink-rgb), 0.06)', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <button
                  onClick={() => handleOpenReschedule(job)}
                  className="inst-btn inst-btn-secondary inst-btn-sm"
                >
                  Reschedule
                </button>
                <Link
                  to={`/installation/jobs/${job.id}`}
                  className="inst-btn inst-btn-primary inst-btn-sm"
                >
                  <Eye size={13} /> Open Job
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Reschedule Modal */}
      {rescheduleJob && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
          <div style={{ background: 'var(--surface-solid)', border: '1px solid rgba(var(--ink-rgb), 0.15)', borderRadius: 14, width: '100%', maxWidth: 460, padding: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
            <h3 style={{ margin: '0 0 16px 0', color: 'var(--text-strong)', fontSize: '1.15rem' }}>
              Reschedule Installation: {rescheduleJob.installation_code}
            </h3>

            <form onSubmit={handleRescheduleSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-soft)', marginBottom: 6 }}>
                  New Installation Planned Date
                </label>
                <input
                  type="date"
                  className="inst-input"
                  style={{ width: '100%' }}
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-soft)', marginBottom: 6 }}>
                  Reason for Rescheduling
                </label>
                <textarea
                  className="inst-input"
                  rows="3"
                  style={{ width: '100%' }}
                  placeholder="e.g. Rain/monsoon delay, customer requested weekend, etc."
                  value={rescheduleNotes}
                  onChange={(e) => setRescheduleNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setRescheduleJob(null)}
                  className="inst-btn inst-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inst-btn inst-btn-primary"
                >
                  {saving ? 'Checking Double-booking...' : 'Confirm Reschedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
