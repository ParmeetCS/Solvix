import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '@/components/PortalLayout';
import { ChartCard, StripedBars, TickDonut, AreaLine } from '@/components/charts';
import { installationApi } from '@/services/api';
import {
  Wrench,
  Clock,
  UserCheck,
  Calendar,
  PlayCircle,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Plus,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  MapPin,
  ExternalLink,
  ShieldAlert,
  Users
} from 'lucide-react';

export default function InstallationDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Job creation modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [eligibleOrders, setEligibleOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [createNotes, setCreateNotes] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createNotice, setCreateNotice] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await installationApi.getDashboard();
      setData(res.data);
    } catch (err) {
      setError(err?.message || 'Failed to load installation dashboard.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = async () => {
    setShowCreateModal(true);
    setCreateNotice(null);
    try {
      const res = await installationApi.getEligibleOrders();
      setEligibleOrders(res.data?.orders || []);
      if (res.data?.orders?.length > 0) {
        setSelectedOrderId(res.data.orders[0].order_id);
      }
    } catch (e) {
      // Non-blocking
    }
  };

  const handleCreateJob = async (e) => {
    e.preventDefault();
    if (!selectedOrderId) return;
    const selected = eligibleOrders.find(o => o.order_id === selectedOrderId);
    if (!selected) return;

    try {
      setCreateLoading(true);
      setCreateNotice(null);
      const res = await installationApi.createJob({
        ...selected,
        notes: createNotes
      });
      setCreateNotice({ type: 'success', message: res.message || 'Job created successfully.' });
      setTimeout(() => {
        setShowCreateModal(false);
        loadDashboard();
      }, 1200);
    } catch (err) {
      setCreateNotice({ type: 'error', message: err?.message || 'Failed to create job.' });
    } finally {
      setCreateLoading(false);
    }
  };

  const kpis = data?.kpis || {
    totalProjects: 0,
    pending: 0,
    assigned: 0,
    scheduled: 0,
    inProgress: 0,
    completed: 0,
    delayed: 0,
    upcoming: 0,
    onHold: 0,
    inspectionRequired: 0
  };

  const statusDistribution = data?.statusDistribution || [];
  const technicianWorkload = data?.technicianWorkload || [];
  const recentActivity = data?.recentActivity || [];
  const upcomingInstallations = data?.upcomingInstallations || [];

  return (
    <PortalLayout
      title="Installation & Technical Operations Dashboard"
      subtitle="Real-time field execution pipeline, technician scheduling, and electrical commissioning"
      actions={
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={loadDashboard}
            className="inst-btn inst-btn-secondary inst-btn-sm"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="inst-btn inst-btn-primary inst-btn-sm"
          >
            <Plus size={14} /> New Job from Order
          </button>
        </div>
      }
    >
      {/* Safety Notice Banner */}
      <div className="inst-safety-banner">
        <ShieldAlert size={20} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <strong>Technical Safety Standard (IS 3043 / IEC 60364-7-712):</strong>
          {' '}All solar rooftop installations must adhere to verified multi-meter earthing resistance measurements (&lt; 2.0 Ohm) and double-clamped structural torque standards. Digital checklists are supervisory verification tools and do not substitute for certified electrical engineering protocols.
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 8, padding: '12px 16px', color: 'var(--c-red)', marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="inst-kpi-grid">
        <div className="inst-kpi-card">
          <div className="inst-kpi-header">
            <span className="inst-kpi-title">Total Projects</span>
            <div className="inst-kpi-icon"><Wrench size={18} /></div>
          </div>
          <div className="inst-kpi-value">{kpis.totalProjects}</div>
          <div className="inst-kpi-meta">All installation jobs</div>
        </div>

        <div className="inst-kpi-card">
          <div className="inst-kpi-header">
            <span className="inst-kpi-title">Pending Assignment</span>
            <div className="inst-kpi-icon" style={{ color: 'var(--c-amber)' }}><Clock size={18} /></div>
          </div>
          <div className="inst-kpi-value" style={{ color: 'var(--c-amber)' }}>{kpis.pending}</div>
          <div className="inst-kpi-meta">Awaiting team & date</div>
        </div>

        <div className="inst-kpi-card">
          <div className="inst-kpi-header">
            <span className="inst-kpi-title">Scheduled</span>
            <div className="inst-kpi-icon" style={{ color: 'var(--c-blue)' }}><Calendar size={18} /></div>
          </div>
          <div className="inst-kpi-value" style={{ color: 'var(--c-blue)' }}>{kpis.scheduled}</div>
          <div className="inst-kpi-meta">Ready for site arrival</div>
        </div>

        <div className="inst-kpi-card">
          <div className="inst-kpi-header">
            <span className="inst-kpi-title">In Progress</span>
            <div className="inst-kpi-icon" style={{ color: 'var(--c-violet)' }}><PlayCircle size={18} /></div>
          </div>
          <div className="inst-kpi-value" style={{ color: 'var(--c-violet)' }}>{kpis.inProgress}</div>
          <div className="inst-kpi-meta">Active on rooftop</div>
        </div>

        <div className="inst-kpi-card">
          <div className="inst-kpi-header">
            <span className="inst-kpi-title">Completed</span>
            <div className="inst-kpi-icon" style={{ color: 'var(--c-emerald)' }}><CheckCircle2 size={18} /></div>
          </div>
          <div className="inst-kpi-value" style={{ color: 'var(--c-emerald)' }}>{kpis.completed}</div>
          <div className="inst-kpi-meta">Commissioned & signed</div>
        </div>

        <div className="inst-kpi-card">
          <div className="inst-kpi-header">
            <span className="inst-kpi-title">Delayed / On Hold</span>
            <div className="inst-kpi-icon" style={{ color: 'var(--c-amber)' }}><AlertTriangle size={18} /></div>
          </div>
          <div className="inst-kpi-value" style={{ color: 'var(--c-amber)' }}>{kpis.delayed}</div>
          <div className="inst-kpi-meta">Hold or past expected date</div>
        </div>
      </div>

      <div className="sx-grid cols-32" style={{ marginBottom: 24 }}>
        <ChartCard title="Installation jobs" note={`${kpis.totalProjects} total`}>
          <StripedBars data={[
            { label: 'Pending', value: kpis.pending }, { label: 'Scheduled', value: kpis.scheduled },
            { label: 'In progress', value: kpis.inProgress }, { label: 'Completed', value: kpis.completed }, { label: 'Delayed', value: kpis.delayed },
          ]} />
        </ChartCard>
        <ChartCard title="Completion">
          <TickDonut centerLabel="Jobs" centerValue={kpis.totalProjects}
            items={[{ label: 'Completed', value: kpis.completed }, { label: 'Active', value: (kpis.inProgress || 0) + (kpis.scheduled || 0) }, { label: 'Pending', value: kpis.pending }, { label: 'Delayed', value: kpis.delayed }]} />
        </ChartCard>
      </div>

      {/* Two Column Layout: Pipeline & Technician Workload */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        {/* Status Distribution Breakdown */}
        <div className="inst-card">
          <div className="inst-card-header">
            <span className="inst-card-title">
              <TrendingUp size={18} color="var(--c-amber)" /> Project Execution Pipeline
            </span>
            <Link to="/installation/jobs" className="inst-btn inst-btn-secondary inst-btn-sm">
              View All Jobs <ArrowRight size={14} />
            </Link>
          </div>
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {statusDistribution.map(s => {
                const pct = kpis.totalProjects > 0 ? Math.round((s.count / kpis.totalProjects) * 100) : 0;
                return (
                  <div key={s.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 6 }}>
                      <span style={{ color: 'var(--text-soft)', fontWeight: 500 }}>{s.name}</span>
                      <span style={{ color: s.color, fontWeight: 700 }}>{s.count} ({pct}%)</span>
                    </div>
                    <div style={{ height: '7px', background: 'rgba(var(--ink-rgb), 0.08)', borderRadius: '9999px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: s.color, borderRadius: '9999px', transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Technician Workload & Availability */}
        <div className="inst-card">
          <div className="inst-card-header">
            <span className="inst-card-title">
              <Users size={18} color="var(--c-blue)" /> Field Technician Workload
            </span>
            <Link to="/installation/technicians" className="inst-btn inst-btn-secondary inst-btn-sm">
              Manage Team <ArrowRight size={14} />
            </Link>
          </div>
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {technicianWorkload.map(tech => (
                <div key={tech.id} style={{ background: 'rgba(var(--surface-rgb), 0.6)', border: '1px solid rgba(var(--ink-rgb), 0.08)', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-strong)', fontSize: '0.9rem' }}>{tech.full_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{tech.employee_code} • {tech.phone}</div>
                    </div>
                    <div>
                      {tech.is_available ? (
                        <span className="inst-badge inst-badge-completed">Available</span>
                      ) : (
                        <span className="inst-badge inst-badge-cancelled">Unavailable</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                    <span>Active Jobs: {tech.active_assignments} / Max Daily: {tech.max_daily_jobs}</span>
                    <span style={{ color: tech.current_workload_pct >= 100 ? 'var(--c-red)' : 'var(--c-green)', fontWeight: 600 }}>{tech.current_workload_pct}%</span>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(var(--ink-rgb), 0.08)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${tech.current_workload_pct}%`, background: tech.current_workload_pct >= 100 ? '#ef4444' : '#10b981' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Installations Table */}
      <div className="inst-card">
        <div className="inst-card-header">
          <span className="inst-card-title">
            <Calendar size={18} color="var(--c-blue)" /> Upcoming Installation Visits
          </span>
          <Link to="/installation/schedule" className="inst-btn inst-btn-secondary inst-btn-sm">
            View Schedule Calendar <ArrowRight size={14} />
          </Link>
        </div>
        <div className="inst-table-container">
          <table className="inst-table">
            <thead>
              <tr>
                <th>Job Code</th>
                <th>Customer & Address</th>
                <th>Capacity / Type</th>
                <th>Planned Date</th>
                <th>Assigned Technicians</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {upcomingInstallations.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)' }}>
                    No upcoming installation visits scheduled.
                  </td>
                </tr>
              ) : (
                upcomingInstallations.map(j => (
                  <tr key={j.id}>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--c-amber)' }}>{j.installation_code}</span>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{j.order_code}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-strong)' }}>{j.customer_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{j.city}</div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--c-blue)' }}>{j.system_capacity_kw} kW</span>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'capitalize' }}>{j.system_type}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, color: 'var(--text)' }}>{j.planned_installation_date || 'Unscheduled'}</div>
                    </td>
                    <td>
                      {(j.assigned_technicians || []).length > 0 ? (
                        <div style={{ fontSize: '0.82rem' }}>
                          <span style={{ color: 'var(--text-strong)', fontWeight: 500 }}>
                            {(j.assigned_technicians || []).find(a => a.is_primary)?.full_name || j.assigned_technicians[0].full_name}
                          </span>
                          {(j.assigned_technicians || []).length > 1 && (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}> (+{(j.assigned_technicians || []).length - 1} more)</span>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--c-amber)', fontSize: '0.78rem' }}>Unassigned</span>
                      )}
                    </td>
                    <td>
                      <span className={`inst-badge inst-badge-${j.status}`}>
                        {String(j.status || '').replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <Link
                        to={`/installation/jobs/${j.id}`}
                        className="inst-btn inst-btn-secondary inst-btn-sm"
                      >
                        Open Job
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Job from Eligible Confirmed Order */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
          <div style={{ background: 'var(--surface-solid)', border: '1px solid rgba(var(--ink-rgb), 0.15)', borderRadius: 14, width: '100%', maxWidth: 560, padding: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, color: 'var(--text-strong)', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Plus size={18} color="var(--c-amber)" /> Create Installation Project from Order
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>

            {createNotice && (
              <div style={{
                background: createNotice.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                border: `1px solid ${createNotice.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                padding: '10px 14px',
                borderRadius: 8,
                marginBottom: 16,
                color: createNotice.type === 'success' ? 'var(--c-green)' : 'var(--c-red)',
                fontSize: '0.85rem'
              }}>
                {createNotice.message}
              </div>
            )}

            {eligibleOrders.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                All eligible confirmed orders already have installation projects created!
              </div>
            ) : (
              <form onSubmit={handleCreateJob}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-soft)', marginBottom: 6, fontWeight: 500 }}>
                    Select Confirmed / Delivered Order
                  </label>
                  <select
                    className="inst-select"
                    style={{ width: '100%' }}
                    value={selectedOrderId}
                    onChange={(e) => setSelectedOrderId(e.target.value)}
                  >
                    {eligibleOrders.map(o => (
                      <option key={o.order_id} value={o.order_id}>
                        {o.order_code} — {o.customer_name} ({o.system_capacity_kw}kW {o.system_type})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedOrderId && (
                  <div style={{ background: 'rgba(var(--surface-rgb), 0.7)', border: '1px solid rgba(var(--ink-rgb), 0.08)', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {(() => {
                      const sel = eligibleOrders.find(o => o.order_id === selectedOrderId);
                      return sel ? (
                        <>
                          <div><strong>Site Address:</strong> {sel.site_address}</div>
                          <div><strong>Dispatch Status:</strong> <span style={{ color: 'var(--c-green)' }}>{sel.dispatch_status}</span></div>
                          <div><strong>Advance Paid:</strong> ₹{Number(sel.advance_paid).toLocaleString('en-IN')} (Balance: ₹{Number(sel.balance_due).toLocaleString('en-IN')})</div>
                        </>
                      ) : null;
                    })()}
                  </div>
                )}

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-soft)', marginBottom: 6, fontWeight: 500 }}>
                    Initial Project Notes (Optional)
                  </label>
                  <textarea
                    className="inst-input"
                    rows="3"
                    style={{ width: '100%', resize: 'vertical' }}
                    placeholder="Enter any special terrace access or equipment handling instructions..."
                    value={createNotes}
                    onChange={(e) => setCreateNotes(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="inst-btn inst-btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createLoading}
                    className="inst-btn inst-btn-primary"
                  >
                    {createLoading ? 'Creating Project...' : 'Initialize Installation Project'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
