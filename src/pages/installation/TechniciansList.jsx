import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '@/components/PortalLayout';
import { installationApi } from '@/services/api';
import {
  Wrench,
  Phone,
  Mail,
  Award,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

export default function TechniciansList() {
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => {
    loadTechnicians();
  }, []);

  const loadTechnicians = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await installationApi.getTechnicians();
      setTechnicians(res.data?.technicians || []);
    } catch (err) {
      setError(err?.message || 'Failed to load technicians.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAvailability = async (tech) => {
    try {
      setTogglingId(tech.id);
      await installationApi.updateTechnicianAvailability(tech.id, {
        is_available: !tech.is_available
      });
      setTechnicians(prev => prev.map(t => t.id === tech.id ? { ...t, is_available: !t.is_available } : t));
    } catch (err) {
      alert('Failed to update technician availability: ' + err.message);
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <PortalLayout
      title="Field Technicians Management"
      subtitle="Certified installation personnel, workload allocation, and real-time availability"
      actions={
        <button
          onClick={loadTechnicians}
          className="inst-btn inst-btn-secondary inst-btn-sm"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      }
    >
      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 8, padding: '12px 16px', color: 'var(--c-red)', marginBottom: 20 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          Loading technicians directory...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
          {technicians.map(tech => (
            <div key={tech.id} className="inst-card" style={{ marginBottom: 0, display: 'flex', flexDirection: 'column' }}>
              <div className="inst-card-header" style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-amber)' }}>
                    <Wrench size={20} />
                  </div>
                  <div>
                    <Link
                      to={`/installation/technicians/${tech.id}`}
                      style={{ fontWeight: 700, color: 'var(--text-strong)', fontSize: '1rem', textDecoration: 'none' }}
                    >
                      {tech.full_name}
                    </Link>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      ID: <span style={{ color: 'var(--text-muted)' }}>{tech.employee_code}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleToggleAvailability(tech)}
                  disabled={togglingId === tech.id}
                  className={`inst-badge ${tech.is_available ? 'inst-badge-completed' : 'inst-badge-cancelled'}`}
                  style={{ cursor: 'pointer', border: 'none' }}
                  title="Click to toggle availability"
                >
                  {tech.is_available ? 'Available' : 'Unavailable'}
                </button>
              </div>

              <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Contact Info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Phone size={14} color="var(--c-amber)" />
                    <span>{tech.phone || 'Phone not registered'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Mail size={14} color="var(--c-blue)" />
                    <span>{tech.email || 'Email not registered'}</span>
                  </div>
                </div>

                {/* Workload Meter */}
                <div style={{ background: 'rgba(var(--surface-rgb), 0.6)', border: '1px solid rgba(var(--ink-rgb), 0.06)', borderRadius: 8, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 6 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Active Assignments:</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-strong)' }}>{tech.active_assignments} / {tech.max_daily_jobs} Max</span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(var(--ink-rgb), 0.08)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${tech.workload_pct || 0}%`, background: tech.workload_pct >= 100 ? '#ef4444' : '#10b981' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    <span>Completed Jobs: {tech.completed_installations}</span>
                    <span style={{ color: tech.workload_pct >= 100 ? 'var(--c-red)' : 'var(--c-green)' }}>{tech.workload_pct || 0}% Allocated</span>
                  </div>
                </div>

                {/* Skills Badges */}
                {tech.skills && tech.skills.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 6, fontWeight: 600, letterSpacing: 0.5 }}>
                      Technical Skills
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {tech.skills.map((skill, i) => (
                        <span key={i} style={{ background: 'rgba(56, 189, 248, 0.1)', color: 'var(--c-blue)', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '3px 8px', borderRadius: 4, fontSize: '0.72rem' }}>
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Certifications */}
                {tech.certifications && tech.certifications.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 6, fontWeight: 600, letterSpacing: 0.5 }}>
                      Certifications
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {tech.certifications.map((cert, i) => (
                        <span key={i} style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--c-green)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '3px 8px', borderRadius: 4, fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Award size={11} /> {cert}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ padding: '12px 20px', background: 'rgba(var(--surface-rgb), 0.4)', borderTop: '1px solid rgba(var(--ink-rgb), 0.06)', display: 'flex', justifyContent: 'flex-end' }}>
                <Link
                  to={`/installation/technicians/${tech.id}`}
                  className="inst-btn inst-btn-secondary inst-btn-sm"
                >
                  View Assignments History <ExternalLink size={12} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </PortalLayout>
  );
}
