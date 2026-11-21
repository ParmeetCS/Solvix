import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, UserCheck, Inbox, BarChart3, Wallet } from 'lucide-react';
import { ChartCard, StripedBars, TickDonut } from '@/components/charts';
import PortalLayout from '@/components/PortalLayout';
import { adminApi } from '@/services/api';
import { formatCurrency, formatDateTime, titleCase } from '@/lib/quotation';

// The SOLVIX workflow, in order. Each stage links to the module that owns it.
const PIPELINE = [
  { key: 'enquiries', label: 'Enquiries', hint: 'New, unassigned', to: '/sales/leads' },
  { key: 'leads', label: 'Leads', hint: 'Being followed up', to: '/sales/leads' },
  { key: 'surveys', label: 'Site surveys', hint: 'Open', to: '/survey/dashboard' },
  { key: 'quotations', label: 'Quotations', hint: 'Awaiting customer', to: '/sales/quotations' },
  { key: 'orders', label: 'Orders', hint: 'Active', to: '/sales/orders' },
  { key: 'warehouse', label: 'Warehouse', hint: 'To prepare', to: '/warehouse/packing' },
  { key: 'dispatched', label: 'Dispatched', hint: 'In delivery', to: '/warehouse/dispatches' },
  { key: 'installations', label: 'Installation', hint: 'In progress', to: '/installation/jobs' },
  { key: 'completed', label: 'Completed', hint: 'Installed', to: '/installation/jobs' },
  { key: 'support', label: 'Support', hint: 'Open tickets', to: '/support/tickets' },
];

export default function AdminOverview() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminApi.getOverview();
      setData(res.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const people = data?.people || {};

  return (
    <PortalLayout
      title="Overview"
      subtitle="Company-wide view of the enquiry-to-installation workflow"
      actions={<button className="crm-btn crm-btn-secondary crm-btn-sm" onClick={load}>Refresh</button>}
    >
      {error && <div className="q-alert error"><AlertTriangle size={15} style={{ verticalAlign: '-2px', marginRight: 6 }} />{error}</div>}
      {loading && !data ? <div className="q-loading">Loading overview…</div> : data && (
        <>
          {people.pending_approvals > 0 && (
            <Link to="/admin/people" className="crm-card" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, textDecoration: 'none', borderColor: 'var(--accent-text)' }}>
              <UserCheck size={20} color="var(--accent-text)" />
              <div style={{ flex: 1 }}>
                <b>{people.pending_approvals} employee{people.pending_approvals > 1 ? 's' : ''} waiting for approval</b>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>They cannot open a dashboard until you assign a department.</div>
              </div>
              <ArrowRight size={16} />
            </Link>
          )}

          <div className="crm-card" style={{ marginBottom: 20 }}>
            <div className="crm-card-header"><div className="crm-card-title">Workflow pipeline</div></div>
            <div className="crm-stats-grid">
              {PIPELINE.map((s, i) => (
                <Link key={s.key} to={s.to} className="crm-stat-box" style={{ textDecoration: 'none' }}>
                  <div className="crm-stat-label">{i + 1}. {s.label}</div>
                  <div className="crm-stat-value">{data.pipeline?.[s.key] ?? 0}</div>
                  <div className="crm-stat-meta">{s.hint}</div>
                </Link>
              ))}
            </div>
          </div>

          <div className="crm-stats-grid" style={{ marginBottom: 20 }}>
            <div className="crm-stat-box"><div className="crm-stat-label">Order value</div><div className="crm-stat-value">{formatCurrency(data.money?.order_value)}</div><div className="crm-stat-meta">Active and completed orders</div></div>
            <div className="crm-stat-box"><div className="crm-stat-label">Collected</div><div className="crm-stat-value" style={{ color: 'var(--c-green-soft)' }}>{formatCurrency(data.money?.collected)}</div><div className="crm-stat-meta">Payments recorded on orders</div></div>
            <div className="crm-stat-box"><div className="crm-stat-label">Outstanding</div><div className="crm-stat-value" style={{ color: 'var(--c-amber-soft)' }}>{formatCurrency(data.money?.outstanding)}</div><div className="crm-stat-meta">Balance still due</div></div>
            <div className="crm-stat-box"><div className="crm-stat-label">Customers</div><div className="crm-stat-value">{people.customers}</div><div className="crm-stat-meta">{people.active_employees} active employees</div></div>
          </div>

          <div className="sx-grid cols-32" style={{ marginBottom: 20 }}>
            <ChartCard title="Workflow pipeline" icon={BarChart3} note="Items per stage">
              <StripedBars data={PIPELINE.map((s) => ({ label: s.label, value: data.pipeline?.[s.key] ?? 0 }))} />
            </ChartCard>
            <ChartCard title="Revenue position" icon={Wallet} note="Collected vs due">
              <TickDonut
                centerLabel="Order value"
                centerValue={formatCurrency(data.money?.order_value)}
                items={[
                  { label: 'Collected', value: data.money?.collected, display: formatCurrency(data.money?.collected) },
                  { label: 'Outstanding', value: data.money?.outstanding, display: formatCurrency(data.money?.outstanding) },
                ]}
              />
            </ChartCard>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
            <div className="crm-card" style={{ padding: 0 }}>
              <div className="crm-card-header" style={{ padding: '16px 20px 0' }}>
                <div className="crm-card-title"><Inbox size={15} style={{ verticalAlign: '-2px', marginRight: 6 }} />New enquiries</div>
                <Link to="/sales/leads" className="crm-btn crm-btn-outline crm-btn-sm">All leads</Link>
              </div>
              {data.recent_enquiries.length === 0 ? (
                <div className="q-empty">No new enquiries. Website “Get a quote” requests appear here.</div>
              ) : (
                <div className="crm-table-container">
                  <table className="crm-table">
                    <tbody>
                      {data.recent_enquiries.map((l) => (
                        <tr key={l.id}>
                          <td>
                            <Link to={`/sales/leads/${l.id}`} style={{ color: 'var(--accent-text)', fontWeight: 600 }}>{l.customer_name}</Link>
                            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{l.phone} · {formatDateTime(l.created_at)}</div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <span className="q-badge">{l.assigned_to ? 'Assigned' : 'Unassigned'}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="crm-card" style={{ padding: 0 }}>
              <div className="crm-card-header" style={{ padding: '16px 20px 0' }}>
                <div className="crm-card-title">Recent activity</div>
                <Link to="/admin/activity" className="crm-btn crm-btn-outline crm-btn-sm">Activity log</Link>
              </div>
              {data.recent_activity.length === 0 ? (
                <div className="q-empty">No activity recorded yet.</div>
              ) : (
                <div className="crm-table-container">
                  <table className="crm-table">
                    <tbody>
                      {data.recent_activity.map((a) => (
                        <tr key={a.id}>
                          <td>
                            {titleCase(String(a.action).replace(/_/g, ' ').toLowerCase())}
                            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{a.actor_name || 'System'} · {formatDateTime(a.created_at)}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </PortalLayout>
  );
}
