import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '@/components/PortalLayout';
import { salesApi } from '@/services/api';
import {
  CalendarClock,
  PhoneCall,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  RotateCw,
  Plus,
  Filter
} from 'lucide-react';

export default function FollowUpsList() {
  const [followUps, setFollowUps] = useState([]);
  const [filter, setFilter] = useState('pending'); // 'pending', 'overdue', 'upcoming', 'completed', 'all'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Complete / Reschedule Modal states
  const [activeItem, setActiveItem] = useState(null);
  const [modalMode, setModalMode] = useState('complete'); // 'complete' or 'reschedule'
  const [outcome, setOutcome] = useState('');
  const [modalNotes, setModalNotes] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState('');

  useEffect(() => {
    loadFollowUps();
  }, [filter]);

  const loadFollowUps = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await salesApi.getFollowUps({ filter });
      setFollowUps(res.data || []);
    } catch (err) {
      setError(err?.message || 'Failed to load follow-ups.');
    } finally {
      setLoading(false);
    }
  };

  const handleActionSubmit = async (e) => {
    e.preventDefault();
    if (!activeItem) return;

    try {
      if (modalMode === 'complete') {
        await salesApi.updateFollowUp(activeItem.id, {
          status: 'completed',
          outcome,
          notes: modalNotes
        });
      } else {
        await salesApi.updateFollowUp(activeItem.id, {
          status: 'rescheduled',
          rescheduled_at: new Date(rescheduleDate).toISOString(),
          notes: modalNotes
        });
      }

      setActiveItem(null);
      setOutcome('');
      setModalNotes('');
      setRescheduleDate('');
      loadFollowUps();
    } catch (err) {
      alert(err.message || 'Error updating follow-up');
    }
  };

  const now = new Date();

  return (
    <PortalLayout
      title="Follow-up & Task Reminders"
      subtitle="Ensure timely customer outreach and call outcome logging"
      actions={
        <Link to="/sales/leads" className="crm-btn crm-btn-primary crm-btn-sm">
          <Plus size={16} /> Schedule from Lead
        </Link>
      }
    >
      {/* Filter Tabs */}
      <div className="crm-filter-bar">
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { id: 'pending', label: 'All Pending' },
            { id: 'overdue', label: '⚠️ Overdue' },
            { id: 'upcoming', label: 'Upcoming' },
            { id: 'completed', label: 'Completed' },
            { id: 'all', label: 'All Records' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`crm-btn ${filter === tab.id ? 'crm-btn-primary' : 'crm-btn-secondary'} crm-btn-sm`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Follow-up Cards Table */}
      <div className="crm-card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading follow-up tasks...
          </div>
        ) : error ? (
          <div style={{ padding: '24px', color: 'var(--c-red)' }}>{error}</div>
        ) : followUps.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No follow-ups found for filter &ldquo;{filter}&rdquo;.
          </div>
        ) : (
          <div className="crm-table-container">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Scheduled Date & Time</th>
                  <th>Customer / Lead</th>
                  <th>Contact Info</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Notes / Outcome</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {followUps.map((fu) => {
                  const sched = new Date(fu.scheduled_at);
                  const isOverdue = fu.status === 'pending' && sched < now;

                  return (
                    <tr key={fu.id} style={{ background: isOverdue ? 'rgba(248, 113, 113, 0.04)' : undefined }}>
                      <td>
                        <div style={{ fontWeight: '600', color: isOverdue ? 'var(--c-red)' : 'var(--text-strong)' }}>
                          {sched.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: isOverdue ? 'var(--c-red)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} />
                          {sched.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {isOverdue && ' (Overdue)'}
                        </div>
                      </td>
                      <td>
                        <Link
                          to={`/sales/leads/${fu.lead?.id}`}
                          style={{ fontWeight: '600', color: 'var(--accent-text)' }}
                        >
                          {fu.lead?.customer_name || 'Customer'}
                        </Link>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {fu.lead?.lead_code}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem' }}>{fu.lead?.phone || 'No phone'}</div>
                      </td>
                      <td style={{ textTransform: 'capitalize' }}>
                        {fu.follow_up_type?.replace('_', ' ')}
                      </td>
                      <td>
                        <span className={`crm-badge crm-badge-${fu.status}`}>
                          {fu.status}
                        </span>
                      </td>
                      <td>
                        {fu.notes && (
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-soft)' }}>
                            {fu.notes}
                          </div>
                        )}
                        {fu.outcome && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--c-green-soft)', marginTop: '2px' }}>
                            Outcome: {fu.outcome}
                          </div>
                        )}
                      </td>
                      <td>
                        {fu.status === 'pending' ? (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => {
                                setActiveItem(fu);
                                setModalMode('complete');
                                setOutcome('');
                                setModalNotes(fu.notes || '');
                              }}
                              className="crm-btn crm-btn-primary crm-btn-sm"
                              style={{ padding: '4px 8px', fontSize: '0.76rem' }}
                            >
                              <CheckCircle size={12} /> Complete
                            </button>
                            <button
                              onClick={() => {
                                setActiveItem(fu);
                                setModalMode('reschedule');
                                setRescheduleDate('');
                                setModalNotes(fu.notes || '');
                              }}
                              className="crm-btn crm-btn-secondary crm-btn-sm"
                              style={{ padding: '4px 8px', fontSize: '0.76rem' }}
                            >
                              <RotateCw size={12} /> Reschedule
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Finished</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Complete / Reschedule Modal */}
      {activeItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <form onSubmit={handleActionSubmit} className="crm-card" style={{ width: '440px', maxWidth: '90%' }}>
            <h3 style={{ color: 'var(--text-strong)', marginBottom: '12px', fontSize: '1.1rem' }}>
              {modalMode === 'complete' ? 'Complete Follow-up Task' : 'Reschedule Follow-up'}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginBottom: '16px' }}>
              Lead: <b>{activeItem.lead?.customer_name}</b> ({activeItem.lead?.phone})
            </p>

            {modalMode === 'complete' ? (
              <div className="crm-form-group">
                <label className="crm-label">Call / Interaction Outcome *</label>
                <input
                  type="text"
                  required
                  className="crm-input"
                  placeholder="e.g. Interested in 5kW, agreed to receive quotation..."
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                />
              </div>
            ) : (
              <div className="crm-form-group">
                <label className="crm-label">New Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  className="crm-input"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                />
              </div>
            )}

            <div className="crm-form-group">
              <label className="crm-label">Additional Notes</label>
              <textarea
                className="crm-textarea"
                placeholder="Log customer remarks..."
                value={modalNotes}
                onChange={(e) => setModalNotes(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setActiveItem(null)}
                className="crm-btn crm-btn-secondary crm-btn-sm"
              >
                Cancel
              </button>
              <button type="submit" className="crm-btn crm-btn-primary crm-btn-sm">
                Save & Update
              </button>
            </div>
          </form>
        </div>
      )}
    </PortalLayout>
  );
}
