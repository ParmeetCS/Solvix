import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import InstallationLayout from './InstallationLayout';
import { installationApi } from '@/services/api';
import {
  Wrench,
  Search,
  Filter,
  Calendar,
  Eye,
  Plus,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';

export default function InstallationJobsList() {
  const [jobs, setJobs] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [technicianId, setTechnicianId] = useState('all');
  const [date, setDate] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [jobsRes, techsRes] = await Promise.all([
        installationApi.getJobs({
          search: search || undefined,
          status: status !== 'all' ? status : undefined,
          technician_id: technicianId !== 'all' ? technicianId : undefined,
          date: date || undefined
        }),
        installationApi.getTechnicians()
      ]);
      setJobs(jobsRes.data?.jobs || []);
      setTechnicians(techsRes.data?.technicians || []);
    } catch (err) {
      setError(err?.message || 'Failed to load installation projects.');
    } finally {
      setLoading(false);
    }
  }, [search, status, technicianId, date]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <InstallationLayout
      title="Installation Projects"
      subtitle="Track end-to-end solar execution from site arrival to digital signoff"
      actions={
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link
            to="/installation/assignments"
            className="inst-btn inst-btn-secondary inst-btn-sm"
          >
            Team Assignments
          </Link>
          <Link
            to="/installation/dashboard"
            className="inst-btn inst-btn-primary inst-btn-sm"
          >
            <Plus size={14} /> New Job
          </Link>
        </div>
      }
    >
      {/* Filter Bar */}
      <div className="inst-filter-bar">
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: 11, color: '#64748b' }} />
          <input
            type="text"
            className="inst-input"
            style={{ width: '100%', paddingLeft: 34 }}
            placeholder="Search by job code, order, customer, site address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="inst-select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="assigned">Assigned</option>
          <option value="scheduled">Scheduled</option>
          <option value="in_progress">In Progress</option>
          <option value="on_hold">On Hold</option>
          <option value="inspection_required">Inspection Required</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select
          className="inst-select"
          value={technicianId}
          onChange={(e) => setTechnicianId(e.target.value)}
        >
          <option value="all">All Technicians</option>
          {technicians.map(t => (
            <option key={t.id} value={t.id}>{t.full_name} ({t.employee_code})</option>
          ))}
        </select>

        <input
          type="date"
          className="inst-input"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          title="Filter by planned installation date"
        />

        {(search || status !== 'all' || technicianId !== 'all' || date) && (
          <button
            onClick={() => { setSearch(''); setStatus('all'); setTechnicianId('all'); setDate(''); }}
            className="inst-btn inst-btn-secondary inst-btn-sm"
          >
            Clear Filters
          </button>
        )}
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 8, padding: '12px 16px', color: '#f87171', marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* Projects Table Card */}
      <div className="inst-card">
        <div className="inst-table-container">
          <table className="inst-table">
            <thead>
              <tr>
                <th>Job Code</th>
                <th>Order Ref</th>
                <th>Customer & City</th>
                <th>System Specs</th>
                <th>Planned Schedule</th>
                <th>Lead Technician</th>
                <th>Verification</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                    Loading installation projects...
                  </td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                    No installation projects found matching the criteria.
                  </td>
                </tr>
              ) : (
                jobs.map(j => (
                  <tr key={j.id}>
                    <td>
                      <span style={{ fontWeight: 600, color: '#f59e0b' }}>{j.installation_code}</span>
                    </td>
                    <td>
                      <span style={{ color: '#cbd5e1' }}>{j.order_code}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#fff' }}>{j.customer_name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{j.city}</div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: '#38bdf8' }}>{j.system_capacity_kw} kW</span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: 6, textTransform: 'capitalize' }}>
                        ({j.system_type})
                      </span>
                    </td>
                    <td>
                      <div style={{ color: '#f1f5f9' }}>{j.planned_installation_date || 'Unscheduled'}</div>
                      {j.expected_completion_date && (
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Due: {j.expected_completion_date}</div>
                      )}
                    </td>
                    <td>
                      {(j.assigned_technicians || []).length > 0 ? (
                        <div>
                          <div style={{ color: '#fff', fontWeight: 500 }}>
                            {(j.assigned_technicians || []).find(a => a.is_primary)?.full_name || j.assigned_technicians[0].full_name}
                          </div>
                          {(j.assigned_technicians || []).length > 1 && (
                            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                              +{(j.assigned_technicians || []).length - 1} assistant(s)
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: '#f59e0b', fontSize: '0.78rem' }}>Unassigned</span>
                      )}
                    </td>
                    <td>
                      {j.equipment_verified ? (
                        <span style={{ color: '#10b981', fontSize: '0.78rem', fontWeight: 600 }}>✓ Serials OK</span>
                      ) : j.exception_recorded ? (
                        <span style={{ color: '#f97316', fontSize: '0.78rem', fontWeight: 600 }}>⚠ Exception</span>
                      ) : (
                        <span style={{ color: '#64748b', fontSize: '0.78rem' }}>Pending</span>
                      )}
                    </td>
                    <td>
                      <span className={`inst-badge inst-badge-${j.status}`}>
                        {j.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <Link
                        to={`/installation/jobs/${j.id}`}
                        className="inst-btn inst-btn-secondary inst-btn-sm"
                      >
                        <Eye size={13} /> View Job
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </InstallationLayout>
  );
}
