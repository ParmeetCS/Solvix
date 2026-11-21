import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PortalLayout from '@/components/PortalLayout';
import { ChartCard, StripedBars, TickDonut, AreaLine } from '@/components/charts';
import { salesApi } from '@/services/api';
import {
  Users,
  UserPlus,
  PhoneCall,
  Calendar,
  CheckCircle2,
  FileText,
  TrendingUp,
  XCircle,
  ArrowRight,
  Clock,
  MessageSquare
} from 'lucide-react';

export default function SalesDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await salesApi.getDashboard();
      setData(res.data);
    } catch (err) {
      setError(err?.message || 'Failed to load sales dashboard figures.');
    } finally {
      setLoading(false);
    }
  };

  const summary = data?.summary || {
    totalLeads: 0,
    newLeads: 0,
    contactedLeads: 0,
    followUpsDueToday: 0,
    overdueFollowUps: 0,
    qualifiedLeads: 0,
    quotationPending: 0,
    convertedLeads: 0,
    lostLeads: 0,
  };

  const pipeline = data?.pipeline || {};
  const recentLeads = data?.recentLeads || [];
  const upcomingFollowUps = data?.upcomingFollowUps || [];
  const sources = data?.leadSourceDistribution || {};
  const performance = data?.employeePerformance || [];

  return (
    <PortalLayout
      title="Sales & CRM Dashboard"
      subtitle="Real-time solar lead generation, pipeline progress & follow-up tracking"
      actions={
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={loadDashboard}
            className="crm-btn crm-btn-secondary crm-btn-sm"
          >
            Refresh
          </button>
          <Link to="/sales/leads/new" className="crm-btn crm-btn-primary crm-btn-sm">
            <UserPlus size={16} />
            <span>New Lead</span>
          </Link>
        </div>
      }
    >
      {loading ? (
        <div className="crm-card" style={{ textAlign: 'center', padding: '60px' }}>
          <p style={{ color: 'var(--text-muted)' }}>Loading sales analytics from database...</p>
        </div>
      ) : error ? (
        <div className="crm-card" style={{ border: '1px solid var(--c-red)', background: 'rgba(248,113,113,0.08)' }}>
          <p style={{ color: 'var(--c-red)' }}>{error}</p>
          <button onClick={loadDashboard} className="crm-btn crm-btn-secondary crm-btn-sm" style={{ marginTop: '12px' }}>
            Try Again
          </button>
        </div>
      ) : (
        <>
          {/* Key Metric Stat Cards */}
          <div className="crm-stats-grid">
            <div className="crm-stat-box">
              <span className="crm-stat-label">Total Leads</span>
              <span className="crm-stat-value">{summary.totalLeads}</span>
              <span className="crm-stat-meta">Active portfolio</span>
            </div>

            <div className="crm-stat-box">
              <span className="crm-stat-label">New Enquiries</span>
              <span className="crm-stat-value" style={{ color: 'var(--c-blue)' }}>{summary.newLeads}</span>
              <span className="crm-stat-meta">Awaiting first contact</span>
            </div>

            <div className="crm-stat-box">
              <span className="crm-stat-label">Contacted</span>
              <span className="crm-stat-value" style={{ color: 'var(--c-violet)' }}>{summary.contactedLeads}</span>
              <span className="crm-stat-meta">In conversation</span>
            </div>

            <div className={`crm-stat-box ${summary.followUpsDueToday > 0 ? 'urgent' : ''}`}>
              <span className="crm-stat-label">Follow-ups Today</span>
              <span className="crm-stat-value" style={{ color: summary.followUpsDueToday > 0 ? 'var(--c-amber-soft)' : 'var(--text-strong)' }}>
                {summary.followUpsDueToday}
              </span>
              <span className="crm-stat-meta">
                {summary.overdueFollowUps > 0 ? `${summary.overdueFollowUps} overdue` : 'Scheduled for today'}
              </span>
            </div>

            <div className="crm-stat-box success">
              <span className="crm-stat-label">Qualified Leads</span>
              <span className="crm-stat-value" style={{ color: 'var(--c-green)' }}>{summary.qualifiedLeads}</span>
              <span className="crm-stat-meta">Ready for site survey</span>
            </div>

            <div className="crm-stat-box">
              <span className="crm-stat-label">Quotation / Survey</span>
              <span className="crm-stat-value" style={{ color: 'var(--c-blue)' }}>{summary.quotationPending}</span>
              <span className="crm-stat-meta">Proposals pending</span>
            </div>

            <div className="crm-stat-box success">
              <span className="crm-stat-label">Converted</span>
              <span className="crm-stat-value" style={{ color: 'var(--accent-text)' }}>{summary.convertedLeads}</span>
              <span className="crm-stat-meta">Customer accounts created</span>
            </div>

            <div className="crm-stat-box">
              <span className="crm-stat-label">Lost</span>
              <span className="crm-stat-value" style={{ color: 'var(--c-red)' }}>{summary.lostLeads}</span>
              <span className="crm-stat-meta">Closed unfulfilled</span>
            </div>
          </div>

          <div className="sx-grid cols-32">
            <ChartCard title="Lead pipeline" note="Leads per stage">
              <StripedBars data={[
                { label: 'New', value: pipeline.new || 0 }, { label: 'Contacted', value: pipeline.contacted || 0 },
                { label: 'Follow-up', value: pipeline.follow_up_required || 0 }, { label: 'Qualified', value: pipeline.qualified || 0 },
                { label: 'Survey', value: pipeline.survey_requested || 0 }, { label: 'Quoted', value: pipeline.quotation_sent || 0 },
              ]} />
            </ChartCard>
            <ChartCard title="Lead sources" note={`${summary.totalLeads} leads`}>
              <TickDonut centerLabel="Leads" centerValue={summary.totalLeads}
                items={Object.entries(sources).map(([k, v]) => ({ label: k.replace(/_/g, ' '), value: v }))} />
            </ChartCard>
          </div>

          {/* Pipeline Visual Funnel */}
          <div className="crm-card">
            <div className="crm-card-header">
              <span className="crm-card-title">Lead Pipeline Stage Breakdown</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Live conversion flow</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
              {[
                { label: 'New', count: pipeline.new || 0, color: 'var(--c-blue)' },
                { label: 'Contacted', count: pipeline.contacted || 0, color: 'var(--c-violet)' },
                { label: 'Follow-up Req.', count: pipeline.follow_up_required || 0, color: 'var(--c-amber-soft)' },
                { label: 'Qualified', count: pipeline.qualified || 0, color: 'var(--c-green)' },
                { label: 'Survey Req.', count: pipeline.survey_requested || 0, color: 'var(--c-amber-soft)' },
                { label: 'Quotation Sent', count: pipeline.quotation_sent || 0, color: 'var(--c-blue)' },
                { label: 'Converted', count: pipeline.converted || 0, color: 'var(--accent-text)' },
                { label: 'Lost', count: pipeline.lost || 0, color: 'var(--c-red)' },
              ].map((stage, i) => (
                <div
                  key={i}
                  style={{
                    background: 'rgba(var(--ink-rgb), 0.03)',
                    border: '1px solid rgba(var(--ink-rgb), 0.06)',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    borderTop: `3px solid ${stage.color}`
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{stage.label}</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--text-strong)', marginTop: '4px' }}>{stage.count}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
            {/* Recent Leads */}
            <div className="crm-card">
              <div className="crm-card-header">
                <span className="crm-card-title">Recent Leads</span>
                <Link to="/sales/leads" style={{ fontSize: '0.82rem', color: 'var(--accent-text)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  View All <ArrowRight size={14} />
                </Link>
              </div>
              {recentLeads.length === 0 ? (
                <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>No recent leads recorded yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {recentLeads.map(l => (
                    <div
                      key={l.id}
                      onClick={() => navigate(`/sales/leads/${l.id}`)}
                      style={{
                        padding: '12px',
                        background: 'rgba(var(--ink-rgb), 0.03)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        border: '1px solid transparent',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(var(--accent-rgb), 0.3)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
                    >
                      <div>
                        <div style={{ fontWeight: '600', color: 'var(--text-strong)' }}>{l.customer_name || 'Unnamed Enquiry'}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {l.lead_code} • {l.phone} • {l.source}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span className={`crm-badge crm-badge-${l.status}`}>{l.status?.replace('_', ' ')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming Follow-ups */}
            <div className="crm-card">
              <div className="crm-card-header">
                <span className="crm-card-title">Upcoming Follow-ups</span>
                <Link to="/sales/follow-ups" style={{ fontSize: '0.82rem', color: 'var(--accent-text)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  View Schedule <ArrowRight size={14} />
                </Link>
              </div>
              {upcomingFollowUps.length === 0 ? (
                <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>No upcoming follow-ups scheduled.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {upcomingFollowUps.map(fu => (
                    <div
                      key={fu.id}
                      style={{
                        padding: '12px',
                        background: 'rgba(var(--ink-rgb), 0.03)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '600', color: 'var(--text-strong)' }}>
                          {fu.leads?.customer_name || 'Customer'}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {fu.follow_up_type?.replace('_', ' ')} • {new Date(fu.scheduled_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {fu.notes && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-soft)', marginTop: '4px' }}>
                            &ldquo;{fu.notes}&rdquo;
                          </div>
                        )}
                      </div>
                      <Link
                        to={`/sales/leads/${fu.lead_id}`}
                        className="crm-btn crm-btn-secondary crm-btn-sm"
                      >
                        Action
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Lead Source Distribution & Team Performance */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
            {/* Lead Sources */}
            <div className="crm-card">
              <div className="crm-card-header">
                <span className="crm-card-title">Lead Acquisition Channels</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {Object.keys(sources).length === 0 ? (
                  <p style={{ color: 'var(--text-dim)' }}>No sources recorded yet.</p>
                ) : (
                  Object.entries(sources).map(([src, count]) => {
                    const pct = summary.totalLeads > 0 ? ((count / summary.totalLeads) * 100).toFixed(0) : 0;
                    return (
                      <div key={src}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                          <span style={{ textTransform: 'capitalize', color: 'var(--text-soft)' }}>{src.replace('_', ' ')}</span>
                          <span style={{ color: 'var(--text-muted)' }}>{count} ({pct}%)</span>
                        </div>
                        <div style={{ height: '6px', background: 'rgba(var(--ink-rgb), 0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: 'var(--chart-1)' }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Sales Performance (for Admins / Sales Managers) */}
            {performance.length > 0 && (
              <div className="crm-card">
                <div className="crm-card-header">
                  <span className="crm-card-title">Sales Representative Conversions</span>
                </div>
                <div className="crm-table-container">
                  <table className="crm-table">
                    <thead>
                      <tr>
                        <th>Sales Specialist</th>
                        <th>Assigned</th>
                        <th>Converted</th>
                        <th>Win Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {performance.map((p, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: '600' }}>{p.name}</td>
                          <td>{p.totalAssigned}</td>
                          <td style={{ color: 'var(--c-green)' }}>{p.convertedCount}</td>
                          <td><b style={{ color: 'var(--accent-text)' }}>{p.conversionRate}%</b></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </PortalLayout>
  );
}
