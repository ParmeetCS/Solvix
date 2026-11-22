import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import PortalLayout from '@/components/PortalLayout';
import { installationApi } from '@/services/api';
import {
  Wrench,
  Phone,
  Mail,
  Award,
  Calendar,
  CheckCircle2,
  ArrowLeft,
  RefreshCw,
  FolderGit2
} from 'lucide-react';

export default function TechnicianDetail() {
  const { id } = useParams();
  const [tech, setTech] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadTechnician();
  }, [id]);

  const loadTechnician = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await installationApi.getTechnicianById(id);
      setTech(res.data?.technician);
    } catch (err) {
      setError(err?.message || 'Failed to load technician details.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <PortalLayout title="Technician Profile">
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading profile...</div>
      </PortalLayout>
    );
  }

  if (error || !tech) {
    return (
      <PortalLayout title="Technician Profile">
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: 16, borderRadius: 8, color: 'var(--c-red)' }}>
          {error || 'Technician not found.'}
        </div>
        <div style={{ marginTop: 16 }}>
          <Link to="/installation/technicians" className="inst-btn inst-btn-secondary">
            <ArrowLeft size={14} /> Back to Technicians
          </Link>
        </div>
      </PortalLayout>
    );
  }

  const assignedJobs = tech.assignedJobs || [];

  return (
    <PortalLayout
      title={tech.full_name}
      subtitle={`Employee Code: ${tech.employee_code} • Operations Workload & Project History`}
      actions={
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link to="/installation/technicians" className="inst-btn inst-btn-secondary inst-btn-sm">
            <ArrowLeft size={14} /> Technicians Directory
          </Link>
        </div>
      }
    >
      {/* Profile Overview Card */}
      <div className="inst-card" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: 14, background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-amber)' }}>
              <Wrench size={32} />
            </div>
            <div>
              <h2 style={{ margin: 0, color: 'var(--text-strong)', fontSize: '1.4rem' }}>{tech.full_name}</h2>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
                Employee ID: <strong style={{ color: 'var(--c-amber)' }}>{tech.employee_code}</strong>
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: '0.82rem', color: 'var(--text-soft)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Phone size={13} color="var(--c-amber)" /> {tech.phone}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Mail size={13} color="var(--c-blue)" /> {tech.email}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ background: 'rgba(var(--surface-rgb), 0.8)', border: '1px solid rgba(var(--ink-rgb), 0.08)', borderRadius: 10, padding: '12px 18px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Daily Capacity</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-strong)' }}>{tech.max_daily_jobs}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Jobs per day</div>
            </div>
            <div style={{ background: 'rgba(var(--surface-rgb), 0.8)', border: '1px solid rgba(var(--ink-rgb), 0.08)', borderRadius: 10, padding: '12px 18px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Completed</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--c-emerald)' }}>{tech.completed_installations}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Installations</div>
            </div>
          </div>
        </div>

        {/* Skills and certifications */}
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(var(--ink-rgb), 0.08)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>
              Technical Competencies
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(tech.skills || []).map((s, i) => (
                <span key={i} style={{ background: 'rgba(56, 189, 248, 0.12)', color: 'var(--c-blue)', border: '1px solid rgba(56, 189, 248, 0.25)', padding: '4px 10px', borderRadius: 6, fontSize: '0.75rem' }}>
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>
              Electrical Certifications & Standards
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(tech.certifications || []).map((c, i) => (
                <span key={i} style={{ background: 'rgba(16, 185, 129, 0.12)', color: 'var(--c-green)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '4px 10px', borderRadius: 6, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Award size={12} /> {c}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Assigned Installations History */}
      <div className="inst-card">
        <div className="inst-card-header">
          <span className="inst-card-title">
            <FolderGit2 size={18} color="var(--c-amber)" /> Assigned Installation Projects ({assignedJobs.length})
          </span>
        </div>
        <div className="inst-table-container">
          <table className="inst-table">
            <thead>
              <tr>
                <th>Job Code</th>
                <th>Order</th>
                <th>Customer & City</th>
                <th>Capacity</th>
                <th>Planned Date</th>
                <th>Role on Job</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {assignedJobs.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-dim)' }}>
                    No assigned installations found for this technician.
                  </td>
                </tr>
              ) : (
                assignedJobs.map(j => {
                  const assignment = (j.assigned_technicians || []).find(at => at.technician_id === tech.id);
                  return (
                    <tr key={j.id}>
                      <td><span style={{ fontWeight: 600, color: 'var(--c-amber)' }}>{j.installation_code}</span></td>
                      <td>{j.order_code}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-strong)' }}>{j.customer_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{j.city}</div>
                      </td>
                      <td><span style={{ color: 'var(--c-blue)', fontWeight: 600 }}>{j.system_capacity_kw} kW</span></td>
                      <td>{j.planned_installation_date || 'Unscheduled'}</td>
                      <td>
                        <span style={{ textTransform: 'capitalize', color: assignment?.is_primary ? 'var(--c-green)' : 'var(--text-soft)', fontWeight: assignment?.is_primary ? 600 : 400 }}>
                          {(assignment?.role_on_job || 'technician').replace('_', ' ')}
                          {assignment?.is_primary && ' (Lead)'}
                        </span>
                      </td>
                      <td>
                        <span className={`inst-badge inst-badge-${j.status}`}>
                          {String(j.status || '').replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <Link to={`/installation/jobs/${j.id}`} className="inst-btn inst-btn-secondary inst-btn-sm">
                          Open Job
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PortalLayout>
  );
}
