import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SurveyLayout from './SurveyLayout';
import { surveyApi } from '@/services/api';
import {
  ClipboardList,
  Clock,
  UserCheck,
  Calendar,
  PlayCircle,
  FileCheck2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Plus,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  MapPin,
  ExternalLink
} from 'lucide-react';

export default function SurveyDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await surveyApi.getDashboard();
      setData(res.data);
    } catch (err) {
      setError(err?.message || 'Failed to load survey dashboard analytics.');
    } finally {
      setLoading(false);
    }
  };

  const kpis = data?.kpis || {
    totalRequests: 0,
    pending: 0,
    assigned: 0,
    scheduledToday: 0,
    inProgress: 0,
    submitted: 0,
    approved: 0,
    rejected: 0,
    revisitRequired: 0
  };

  const statusDistribution = data?.statusDistribution || [];
  const recentAssignments = data?.recentAssignments || [];
  const upcomingSurveys = data?.upcomingSurveys || [];
  const surveyorsWorkload = data?.surveyorsWorkload || [];

  return (
    <SurveyLayout
      title="Site Survey & Feasibility Dashboard"
      subtitle="Real-time site inspection pipeline, engineer workloads, and solar feasibility reviews"
      actions={
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={loadDashboard}
            className="survey-btn survey-btn-secondary survey-btn-sm"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <Link
            to="/survey/requests"
            className="survey-btn survey-btn-primary survey-btn-sm"
          >
            <ClipboardList size={14} /> All Requests
          </Link>
        </div>
      }
    >
      {loading ? (
        <div className="survey-card" style={{ textAlign: 'center', padding: '60px' }}>
          <p style={{ color: '#94a3b8' }}>Loading survey operations metrics...</p>
        </div>
      ) : error ? (
        <div className="survey-card" style={{ borderColor: '#ef4444', background: 'rgba(239,68,68,0.06)' }}>
          <p style={{ color: '#f87171' }}>{error}</p>
          <button onClick={loadDashboard} className="survey-btn survey-btn-secondary survey-btn-sm" style={{ marginTop: '12px' }}>
            Try Again
          </button>
        </div>
      ) : (
        <>
          {/* Key Metric Stat Cards */}
          <div className="survey-stats-grid">
            <div className="survey-stat-box">
              <span className="survey-stat-label">Total Survey Requests</span>
              <span className="survey-stat-value">{kpis.totalRequests}</span>
              <span className="survey-stat-meta">Active portfolio</span>
            </div>

            <div className="survey-stat-box" style={{ borderLeft: '3px solid #f59e0b' }}>
              <span className="survey-stat-label">Pending Assignment</span>
              <span className="survey-stat-value" style={{ color: '#fbbf24' }}>{kpis.pending}</span>
              <span className="survey-stat-meta">Awaiting engineer</span>
            </div>

            <div className="survey-stat-box" style={{ borderLeft: '3px solid #3b82f6' }}>
              <span className="survey-stat-label">Assigned</span>
              <span className="survey-stat-value" style={{ color: '#60a5fa' }}>{kpis.assigned}</span>
              <span className="survey-stat-meta">Ready for scheduling</span>
            </div>

            <div className="survey-stat-box" style={{ borderLeft: '3px solid #06b6d4' }}>
              <span className="survey-stat-label">Scheduled Today</span>
              <span className="survey-stat-value" style={{ color: '#22d3ee' }}>{kpis.scheduledToday}</span>
              <span className="survey-stat-meta">Site visits active today</span>
            </div>

            <div className="survey-stat-box" style={{ borderLeft: '3px solid #8b5cf6' }}>
              <span className="survey-stat-label">In Progress</span>
              <span className="survey-stat-value" style={{ color: '#a78bfa' }}>{kpis.inProgress}</span>
              <span className="survey-stat-meta">Draft inspection active</span>
            </div>

            <div className="survey-stat-box" style={{ borderLeft: '3px solid #ec4899' }}>
              <span className="survey-stat-label">Submitted for Review</span>
              <span className="survey-stat-value" style={{ color: '#f472b6' }}>{kpis.submitted}</span>
              <span className="survey-stat-meta">Pending technical approval</span>
            </div>

            <div className="survey-stat-box" style={{ borderLeft: '3px solid #10b981' }}>
              <span className="survey-stat-label">Approved Feasibility</span>
              <span className="survey-stat-value" style={{ color: '#34d399' }}>{kpis.approved}</span>
              <span className="survey-stat-meta">Ready for Quotation</span>
            </div>

            <div className="survey-stat-box" style={{ borderLeft: '3px solid #ef4444' }}>
              <span className="survey-stat-label">Rejected</span>
              <span className="survey-stat-value" style={{ color: '#f87171' }}>{kpis.rejected}</span>
              <span className="survey-stat-meta">Not feasible / shadowed</span>
            </div>

            <div className="survey-stat-box" style={{ borderLeft: '3px solid #f97316' }}>
              <span className="survey-stat-label">Revisit Required</span>
              <span className="survey-stat-value" style={{ color: '#fb923c' }}>{kpis.revisitRequired}</span>
              <span className="survey-stat-meta">Access or meter re-check</span>
            </div>
          </div>

          {/* Charts & Breakdown Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
            {/* Visual Status Breakdown */}
            <div className="survey-card">
              <div className="survey-card-header">
                <h3>
                  <TrendingUp size={18} style={{ color: '#38bdf8' }} />
                  Survey Status Distribution
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Live Pipeline</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {statusDistribution.map(item => {
                  const pct = kpis.totalRequests > 0 ? Math.round((item.count / kpis.totalRequests) * 100) : 0;
                  return (
                    <div key={item.name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                        <span style={{ color: '#cbd5e1' }}>{item.name}</span>
                        <span style={{ fontWeight: 600, color: '#fff' }}>{item.count} ({pct}%)</span>
                      </div>
                      <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${pct}%`,
                            background: item.color,
                            borderRadius: '4px',
                            transition: 'width 0.5s ease'
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Upcoming Scheduled Site Visits */}
            <div className="survey-card">
              <div className="survey-card-header">
                <h3>
                  <Calendar size={18} style={{ color: '#22d3ee' }} />
                  Upcoming Site Visits
                </h3>
                <Link to="/survey/schedule" style={{ fontSize: '0.82rem', color: '#38bdf8', textDecoration: 'none' }}>
                  Full Schedule &rarr;
                </Link>
              </div>

              {upcomingSurveys.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '0.88rem' }}>No upcoming visits scheduled.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {upcomingSurveys.map(srv => (
                    <div
                      key={srv.id}
                      style={{
                        padding: '12px',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>
                          {srv.customer_name}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
                          <MapPin size={12} /> {srv.site_address || srv.city}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#38bdf8', marginTop: '3px' }}>
                          {srv.scheduled_date} &bull; {srv.scheduled_time || 'General Shift'}
                        </div>
                      </div>
                      <Link
                        to={`/survey/requests/${srv.id}`}
                        className="survey-btn survey-btn-secondary survey-btn-sm"
                      >
                        Inspect
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Grid: Recent Assignments & Workload */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
            {/* Recent Assignments */}
            <div className="survey-card">
              <div className="survey-card-header">
                <h3>
                  <UserCheck size={18} style={{ color: '#60a5fa' }} />
                  Recent Surveyor Assignments
                </h3>
                <Link to="/survey/assignments" style={{ fontSize: '0.82rem', color: '#38bdf8', textDecoration: 'none' }}>
                  View All &rarr;
                </Link>
              </div>

              {recentAssignments.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '0.88rem' }}>No recent assignments.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {recentAssignments.map(asg => (
                    <div
                      key={asg.id}
                      style={{
                        padding: '12px',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.88rem' }}>
                            {asg.survey_code}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                            &bull; {asg.customer_name}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#60a5fa', marginTop: '4px' }}>
                          Assigned to: <b>{asg.assigned_to_name}</b>
                        </div>
                      </div>
                      <span className="survey-badge survey-badge-assigned">
                        {asg.status || 'Assigned'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Surveyor Workload */}
            <div className="survey-card">
              <div className="survey-card-header">
                <h3>
                  <ClipboardList size={18} style={{ color: '#d8ee8e' }} />
                  Surveyor Workload & Capacity
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {surveyorsWorkload.map(sr => (
                  <div
                    key={sr.id}
                    style={{
                      padding: '12px',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 600, color: '#fff' }}>{sr.full_name}</span>
                      <span className="survey-badge survey-badge-scheduled">
                        {sr.active_surveys || 0} active visits
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#94a3b8' }}>
                      <span>{sr.role || 'Survey Engineer'}</span>
                      <span>{sr.completed_surveys || 0} surveys completed</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </SurveyLayout>
  );
}
