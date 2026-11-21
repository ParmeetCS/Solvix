import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { installationApi } from '@/services/api';
import InstallationLayout from '../installation/InstallationLayout';
import {
  Wrench,
  Calendar,
  Clock,
  CheckCircle2,
  MapPin,
  Phone,
  Eye,
  Camera,
  Barcode,
  ArrowRight,
  ShieldAlert,
  Home,
  LogOut,
  RefreshCw,
  Smartphone
} from 'lucide-react';
import '../installation/installation.css';

export default function TechnicianDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadMyJobs();
  }, []);

  const loadMyJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await installationApi.getMyJobs();
      setData(res.data);
    } catch (err) {
      setError(err?.message || 'Failed to load technician jobs.');
    } finally {
      setLoading(false);
    }
  };

  const counts = data?.counts || {
    totalAssigned: 0,
    todayCount: 0,
    inProgressCount: 0,
    upcomingCount: 0,
    pendingTasksCount: 0,
    completedCount: 0
  };

  const todayInstallations = data?.todayInstallations || [];
  const inProgressJobs = data?.inProgressJobs || [];
  const upcomingInstallations = data?.upcomingInstallations || [];
  const pendingTasks = data?.pendingTasks || [];
  const completedJobs = data?.completedJobs || [];
  const tech = data?.technician || {};

  return (
    <InstallationLayout
      title="My Day"
      subtitle={`${tech.full_name || 'Field technician'}${tech.employee_code ? ' (' + tech.employee_code + ')' : ''}`}
      actions={
        <button className="inst-btn inst-btn-secondary inst-btn-sm" onClick={loadMyJobs}>
          <RefreshCw size={13} /> Sync
        </button>
      }
    >

      <div className="tech-mobile-container">
        {/* Safety Standard Notice Banner */}
        <div className="inst-safety-banner" style={{ marginBottom: 16 }}>
          <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>Field Electrical Safety:</strong>
            {' '}Always wear certified Class 0 rubber insulated gloves and safety helmets. Disconnect DC string before touching inverter terminal lugs.
          </div>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 8, padding: 12, color: '#f87171', marginBottom: 16, fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        {/* Quick KPI Stat Chips */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
          <div style={{ background: '#0d172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Today's Visits</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f59e0b', marginTop: 2 }}>{counts.todayCount}</div>
          </div>
          <div style={{ background: '#0d172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>In Progress</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#a78bfa', marginTop: 2 }}>{counts.inProgressCount}</div>
          </div>
          <div style={{ background: '#0d172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Completed</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#10b981', marginTop: 2 }}>{counts.completedCount}</div>
          </div>
        </div>

        {/* SECTION 1: TODAY'S INSTALLATIONS */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={16} color="#f59e0b" /> Today's Site Visits ({todayInstallations.length})
            </h3>
          </div>

          {todayInstallations.length === 0 ? (
            <div style={{ background: '#0d172a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 20, textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
              No installations scheduled specifically for today. Check upcoming visits below.
            </div>
          ) : (
            todayInstallations.map(job => (
              <div key={job.id} className="tech-mobile-job-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <span style={{ fontWeight: 700, color: '#f59e0b', fontSize: '0.95rem' }}>{job.installation_code}</span>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginTop: 2 }}>{job.customer_name}</div>
                  </div>
                  <span className={`inst-badge inst-badge-${job.status}`}>{job.status.replace('_', ' ')}</span>
                </div>

                <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: 12, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                  <MapPin size={14} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>{job.site_address}</span>
                </div>

                <div style={{ background: 'rgba(15, 23, 42, 0.7)', borderRadius: 8, padding: 10, marginBottom: 14, display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span>Capacity: <strong style={{ color: '#38bdf8' }}>{job.system_capacity_kw} kW</strong></span>
                  <span>Type: <strong style={{ color: '#cbd5e1', textTransform: 'capitalize' }}>{job.system_type}</strong></span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <a
                    href={`tel:${job.contact_phone}`}
                    className="inst-btn inst-btn-secondary inst-btn-sm"
                    style={{ justifyContent: 'center' }}
                  >
                    <Phone size={13} /> Call Client
                  </a>
                  <Link
                    to={`/installation/jobs/${job.id}`}
                    className="inst-btn inst-btn-primary inst-btn-sm"
                    style={{ justifyContent: 'center' }}
                  >
                    <Eye size={13} /> Open Job Cockpit
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>

        {/* SECTION 2: ACTIVE IN PROGRESS INSTALLATIONS */}
        {inProgressJobs.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Wrench size={16} color="#8b5cf6" /> Currently In Progress ({inProgressJobs.length})
            </h3>
            {inProgressJobs.map(job => (
              <div key={job.id} className="tech-mobile-job-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, color: '#f59e0b' }}>{job.installation_code}</span>
                  <span className={`inst-badge inst-badge-${job.status}`}>{job.status.replace('_', ' ')}</span>
                </div>
                <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.95rem' }}>{job.customer_name}</div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '4px 0 10px 0' }}>📍 {job.city} • {job.system_capacity_kw} kW</div>

                <Link
                  to={`/installation/jobs/${job.id}`}
                  className="inst-btn inst-btn-primary inst-btn-sm"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  Continue Installation & Checklist <ArrowRight size={13} />
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* SECTION 3: PENDING CHECKLIST TASKS */}
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={16} color="#38bdf8" /> Pending Installation Tasks ({pendingTasks.length})
          </h3>

          {pendingTasks.length === 0 ? (
            <div style={{ background: '#0d172a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 18, textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
              All technical tasks up to date!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pendingTasks.slice(0, 6).map((task, i) => (
                <div key={i} style={{ background: '#0d172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>{task.task_name}</div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                      {task.installation_code} • {task.customer_name}
                    </div>
                  </div>
                  <Link
                    to={`/installation/jobs/${task.job_id}`}
                    className="inst-btn inst-btn-secondary inst-btn-sm"
                  >
                    Open
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 4: ALL ASSIGNED JOBS */}
        <div>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Calendar size={16} color="#a78bfa" /> All Assigned Installations ({(data?.allJobs || []).length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(data?.allJobs || []).map(job => (
              <div key={job.id} style={{ background: '#0d172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, color: '#f59e0b' }}>{job.installation_code}</span>
                  <span className={`inst-badge inst-badge-${job.status}`}>{job.status.replace('_', ' ')}</span>
                </div>
                <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>{job.customer_name}</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '4px 0' }}>
                  Planned: {job.planned_installation_date || 'Unscheduled'} • {job.system_capacity_kw} kW
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <Link to={`/installation/jobs/${job.id}`} className="inst-btn inst-btn-secondary inst-btn-sm">
                    View Project <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </InstallationLayout>
  );
}
