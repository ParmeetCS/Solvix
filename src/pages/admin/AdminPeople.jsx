import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import PortalLayout from '@/components/PortalLayout';
import { adminApi } from '@/services/api';
import { formatDate } from '@/lib/quotation';

const TABS = [
  ['pending', 'Waiting for approval'],
  ['approved', 'Employees'],
  ['departments', 'Departments & roles'],
];

export default function AdminPeople() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [choice, setChoice] = useState({}); // profile id -> { department_id, role_code }
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminApi.getPeople();
      setData(res.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const pending = useMemo(() => (data?.employees || []).filter((e) => e.status === 'pending'), [data]);
  const staff = useMemo(() => (data?.employees || []).filter((e) => e.status !== 'pending'), [data]);

  const act = async (id, payload, success) => {
    setBusy(id);
    setNotice(null);
    try {
      await adminApi.updatePerson(id, payload);
      setNotice({ kind: 'success', text: success });
      await load();
    } catch (err) {
      setNotice({ kind: 'error', text: err.message });
    } finally {
      setBusy(null);
    }
  };

  const departmentOptions = (data?.departments || []).filter((d) => d.is_active);
  const roleOptions = (data?.roles || []).filter((r) => r.code !== 'admin' && r.code !== 'customer');

  return (
    <PortalLayout title="People & Access" subtitle="Approve employees and assign them to a department" actions={<button className="crm-btn crm-btn-secondary crm-btn-sm" onClick={load}>Refresh</button>}>
      {error && <div className="q-alert error"><AlertTriangle size={15} style={{ verticalAlign: '-2px', marginRight: 6 }} />{error}</div>}
      {notice && <div className={`q-alert ${notice.kind}`}>{notice.text}</div>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {TABS.map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`crm-btn crm-btn-sm ${tab === key ? 'crm-btn-primary' : 'crm-btn-secondary'}`}>
            {label}{key === 'pending' && pending.length > 0 ? ` (${pending.length})` : ''}
          </button>
        ))}
      </div>

      {loading && !data ? <div className="q-loading">Loading people…</div> : (
        <>
          {tab === 'pending' && (
            <div className="crm-card" style={{ padding: 0 }}>
              {pending.length === 0 ? (
                <div className="q-empty">No one is waiting. New employee registrations appear here.</div>
              ) : (
                <div className="crm-table-container">
                  <table className="crm-table">
                    <thead><tr><th>Employee</th><th>Requested</th><th>Department</th><th>Role</th><th></th></tr></thead>
                    <tbody>
                      {pending.map((e) => {
                        const c = choice[e.id] || {};
                        return (
                          <tr key={e.id}>
                            <td><b>{e.full_name || '—'}</b><div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{e.email}</div></td>
                            <td>{e.department_requested || '—'}<div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{formatDate(e.created_at)}</div></td>
                            <td>
                              <select className="crm-input" value={c.department_id || ''} onChange={(ev) => setChoice({ ...choice, [e.id]: { ...c, department_id: ev.target.value } })}>
                                <option value="">Choose…</option>
                                {departmentOptions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                              </select>
                            </td>
                            <td>
                              <select className="crm-input" value={c.role_code || ''} onChange={(ev) => setChoice({ ...choice, [e.id]: { ...c, role_code: ev.target.value } })}>
                                <option value="">Employee</option>
                                {roleOptions.map((r) => <option key={r.id} value={r.code}>{r.name}</option>)}
                              </select>
                            </td>
                            <td style={{ whiteSpace: 'nowrap' }}>
                              <button className="crm-btn crm-btn-primary crm-btn-sm" disabled={!c.department_id || busy === e.id}
                                onClick={() => act(e.id, { action: 'approve', department_id: c.department_id, role_code: c.role_code || undefined }, `${e.full_name || e.email} approved.`)}>
                                Approve
                              </button>{' '}
                              <button className="crm-btn crm-btn-danger crm-btn-sm" disabled={busy === e.id}
                                onClick={() => window.confirm(`Reject ${e.full_name || e.email}? Their account will be deactivated.`) && act(e.id, { action: 'reject' }, 'Request rejected.')}>
                                Reject
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === 'approved' && (
            <div className="crm-card" style={{ padding: 0 }}>
              {staff.length === 0 ? (
                <div className="q-empty">No approved employees yet.</div>
              ) : (
                <div className="crm-table-container">
                  <table className="crm-table">
                    <thead><tr><th>Employee</th><th>Department</th><th>Role</th><th>Status</th><th></th></tr></thead>
                    <tbody>
                      {staff.map((e) => (
                        <tr key={e.id}>
                          <td><b>{e.full_name || '—'}</b><div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{e.email}</div></td>
                          <td>
                            <select className="crm-input" value={e.department_id || ''} disabled={busy === e.id}
                              onChange={(ev) => ev.target.value && act(e.id, { action: 'approve', department_id: ev.target.value }, 'Department updated.')}>
                              {departmentOptions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                          </td>
                          <td>
                            <select className="crm-input" value={e.role?.code || 'employee'} disabled={busy === e.id || !e.department_id || !e.is_active}
                              onChange={(ev) => act(e.id, { action: 'approve', department_id: e.department_id, role_code: ev.target.value }, `Role changed to ${ev.target.options[ev.target.selectedIndex].text}.`)}>
                              {roleOptions.map((r) => <option key={r.id} value={r.code}>{r.name}</option>)}
                            </select>
                          </td>
                          <td><span className="q-badge">{e.is_active ? 'Active' : 'Inactive'}</span></td>
                          <td>
                            <button className="crm-btn crm-btn-outline crm-btn-sm" disabled={busy === e.id}
                              onClick={() => act(e.id, { action: e.is_active ? 'deactivate' : 'activate' }, e.is_active ? 'Employee deactivated.' : 'Employee reactivated.')}>
                              {e.is_active ? 'Deactivate' : 'Reactivate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === 'departments' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
              <div className="crm-card" style={{ padding: 0 }}>
                <div className="crm-card-header" style={{ padding: '16px 20px 0' }}><div className="crm-card-title">Departments</div></div>
                <div className="crm-table-container">
                  <table className="crm-table">
                    <thead><tr><th>Department</th><th>Code</th><th>Employees</th></tr></thead>
                    <tbody>
                      {(data?.departments || []).map((d) => (
                        <tr key={d.id}><td><b>{d.name}</b><div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{d.description}</div></td><td>{d.code}</td><td>{d.employee_count}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="crm-card" style={{ padding: 0 }}>
                <div className="crm-card-header" style={{ padding: '16px 20px 0' }}><div className="crm-card-title">Roles</div></div>
                <div className="crm-table-container">
                  <table className="crm-table">
                    <thead><tr><th>Role</th><th>Code</th></tr></thead>
                    <tbody>{(data?.roles || []).map((r) => <tr key={r.id}><td>{r.name}</td><td>{r.code}</td></tr>)}</tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </PortalLayout>
  );
}
