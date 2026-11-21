import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '@/components/PortalLayout';
import { supportApi } from '@/services/api';
import {
  LifeBuoy,
  Ticket,
  AlertCircle,
  Clock,
  CheckCircle2,
  ShieldAlert,
  Users,
  PlusCircle,
  ExternalLink,
  Loader2
} from 'lucide-react';

export default function SupportDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await supportApi.getDashboard();
      setData(res.data || res);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to load support dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const summary = data?.summary || {};
  const priorities = data?.priorityDistribution || {};
  const statuses = data?.statusDistribution || {};
  const recentTickets = data?.recentTickets || [];
  const workload = data?.agentWorkload || [];

  return (
    <PortalLayout
      title="Customer Support & Warranty Dashboard"
      subtitle="Real-time service tickets, warranty verification, and technician resolution metrics"
      actions={
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link to="/support/tickets/new" className="btn-primary">
            <PlusCircle size={16} />
            <span>New Service Ticket</span>
          </Link>
          <button className="btn-secondary" onClick={fetchDashboard}>
            Refresh
          </button>
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
        <>
          {/* Metrics Grid */}
          <div className="support-metrics-grid">
            <div className="support-metric-card">
              <div className="support-metric-icon" style={{ background: 'rgba(56, 189, 248, 0.12)', color: 'var(--c-blue)' }}>
                <Ticket size={24} />
              </div>
              <div className="support-metric-data">
                <span className="support-metric-value">{summary.totalTickets || 0}</span>
                <span className="support-metric-label">Total Tickets</span>
              </div>
            </div>

            <div className="support-metric-card">
              <div className="support-metric-icon" style={{ background: 'rgba(var(--accent-rgb), 0.12)', color: 'var(--accent-text)' }}>
                <LifeBuoy size={24} />
              </div>
              <div className="support-metric-data">
                <span className="support-metric-value">{summary.openTickets || 0}</span>
                <span className="support-metric-label">Open Tickets</span>
              </div>
            </div>

            <div className="support-metric-card">
              <div className="support-metric-icon" style={{ background: 'rgba(168, 85, 247, 0.12)', color: 'var(--c-violet)' }}>
                <Users size={24} />
              </div>
              <div className="support-metric-data">
                <span className="support-metric-value">{summary.assignedTickets || 0}</span>
                <span className="support-metric-label">Assigned Tickets</span>
              </div>
            </div>

            <div className="support-metric-card">
              <div className="support-metric-icon" style={{ background: 'rgba(251, 191, 36, 0.12)', color: 'var(--c-amber-soft)' }}>
                <Clock size={24} />
              </div>
              <div className="support-metric-data">
                <span className="support-metric-value">{summary.inProgressTickets || 0}</span>
                <span className="support-metric-label">In-Progress</span>
              </div>
            </div>

            <div className="support-metric-card">
              <div className="support-metric-icon" style={{ background: 'rgba(52, 211, 153, 0.12)', color: 'var(--c-green)' }}>
                <CheckCircle2 size={24} />
              </div>
              <div className="support-metric-data">
                <span className="support-metric-value">{summary.resolvedTickets || 0}</span>
                <span className="support-metric-label">Resolved Tickets</span>
              </div>
            </div>

            <div className="support-metric-card">
              <div className="support-metric-icon" style={{ background: 'rgba(239, 68, 68, 0.12)', color: 'var(--c-red)' }}>
                <AlertCircle size={24} />
              </div>
              <div className="support-metric-data">
                <span className="support-metric-value">{summary.overdueTickets || 0}</span>
                <span className="support-metric-label">Overdue (&gt;48h)</span>
              </div>
            </div>

            <div className="support-metric-card">
              <div className="support-metric-icon" style={{ background: 'rgba(244, 63, 94, 0.12)', color: 'var(--c-red)' }}>
                <ShieldAlert size={24} />
              </div>
              <div className="support-metric-data">
                <span className="support-metric-value">{summary.warrantyClaims || 0}</span>
                <span className="support-metric-label">Warranty Claims</span>
              </div>
            </div>
          </div>

          {/* Breakdown Section: Priority & Statuses */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {/* Priority Distribution */}
            <div className="support-card">
              <div className="support-card-header">
                <h3 className="support-card-title">
                  <AlertCircle size={18} color="var(--c-amber-soft)" />
                  Ticket Priority Distribution
                </h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {['critical', 'high', 'medium', 'low'].map((p) => {
                  const count = priorities[p] || 0;
                  const total = summary.totalTickets || 1;
                  const pct = Math.round((count / total) * 100);
                  const colors = {
                    critical: 'var(--c-red)',
                    high: 'var(--c-amber-soft)',
                    medium: 'var(--c-blue)',
                    low: 'var(--text-muted)'
                  };
                  return (
                    <div key={p}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.35rem' }}>
                        <span style={{ textTransform: 'capitalize', fontWeight: 500, color: 'var(--text-soft)' }}>{p}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{count} ({pct}%)</span>
                      </div>
                      <div style={{ height: '8px', background: 'var(--app-bg)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${pct}%`,
                            background: colors[p],
                            borderRadius: '4px',
                            transition: 'width 0.3s'
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Status Breakdown */}
            <div className="support-card">
              <div className="support-card-header">
                <h3 className="support-card-title">
                  <Clock size={18} color="var(--c-blue)" />
                  Status Breakdown
                </h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                {[
                  { key: 'open', label: 'Open', color: 'var(--c-blue)' },
                  { key: 'assigned', label: 'Assigned', color: 'var(--c-violet)' },
                  { key: 'in_progress', label: 'In Progress', color: 'var(--c-amber-soft)' },
                  { key: 'waiting_for_parts', label: 'Waiting for Parts', color: 'var(--c-amber)' },
                  { key: 'resolved', label: 'Resolved', color: 'var(--c-green)' },
                  { key: 'closed', label: 'Closed', color: 'var(--text-muted)' }
                ].map((s) => (
                  <div
                    key={s.key}
                    style={{
                      background: 'var(--app-bg)',
                      border: '1px solid var(--surface-2)',
                      borderRadius: '8px',
                      padding: '0.75rem 1rem',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.label}</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 700, color: s.color, marginTop: '0.25rem' }}>
                      {statuses[s.key] || 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Tickets Table */}
          <div className="support-card">
            <div className="support-card-header">
              <h3 className="support-card-title">
                <Ticket size={18} color="var(--accent-text)" />
                Recent Service Tickets
              </h3>
              <Link to="/support/tickets" className="btn-secondary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8125rem' }}>
                <span>View All Tickets</span>
                <ExternalLink size={14} />
              </Link>
            </div>

            {recentTickets.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>
                No support tickets found in the database.
              </p>
            ) : (
              <div className="support-table-container">
                <table className="support-table">
                  <thead>
                    <tr>
                      <th>Ticket #</th>
                      <th>Customer</th>
                      <th>Category</th>
                      <th>Subject</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTickets.map((t) => (
                      <tr key={t.id}>
                        <td style={{ fontWeight: 600, color: 'var(--accent-text)' }}>{t.ticket_number || t.ticket_code}</td>
                        <td>{t.customers?.contact_name || 'Customer'}</td>
                        <td>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--app-bg)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                            {t.issue_category}
                          </span>
                        </td>
                        <td style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.subject}
                        </td>
                        <td>
                          <span className={`badge badge-priority-${t.priority}`}>
                            {t.priority}
                          </span>
                        </td>
                        <td>
                          <span className={`badge badge-${t.status}`}>
                            {t.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                          {new Date(t.created_at).toLocaleDateString()}
                        </td>
                        <td>
                          <Link
                            to={`/support/tickets/${t.id}`}
                            className="btn-secondary"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                          >
                            Details
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Support Agent Workload */}
          <div className="support-card">
            <div className="support-card-header">
              <h3 className="support-card-title">
                <Users size={18} color="var(--c-violet)" />
                Support Agent & Technician Workload
              </h3>
            </div>
            {workload.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem 0' }}>
                No active ticket assignments recorded.
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                {workload.map((agent) => (
                  <div
                    key={agent.id}
                    style={{
                      background: 'var(--app-bg)',
                      border: '1px solid var(--surface-2)',
                      borderRadius: '10px',
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-strong)' }}>{agent.name}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{agent.email}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Assigned:</span>{' '}
                        <span style={{ fontWeight: 700, color: 'var(--c-amber-soft)' }}>{agent.assignedCount}</span>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Resolved:</span>{' '}
                        <span style={{ fontWeight: 700, color: 'var(--c-green)' }}>{agent.resolvedCount}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </PortalLayout>
  );
}
