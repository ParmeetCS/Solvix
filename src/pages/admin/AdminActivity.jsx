import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import PortalLayout from '@/components/PortalLayout';
import { adminApi } from '@/services/api';
import { formatDateTime, titleCase } from '@/lib/quotation';

export default function AdminActivity() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async (page = 1, term = search) => {
    try {
      setLoading(true);
      const res = await adminApi.getActivity({ page, limit: 25, search: term });
      setLogs(res.data.logs);
      setPagination(res.data.pagination);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { load(1, ''); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <PortalLayout title="Activity Log" subtitle="Who did what, across every module">
      {error && <div className="q-alert error"><AlertTriangle size={15} style={{ verticalAlign: '-2px', marginRight: 6 }} />{error}</div>}
      <form className="crm-filter-bar" onSubmit={(e) => { e.preventDefault(); load(1, search); }}>
        <input className="crm-input" placeholder="Search action or record type…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className="crm-btn crm-btn-primary crm-btn-sm">Search</button>
      </form>
      <div className="crm-card" style={{ padding: 0, marginTop: 12 }}>
        {loading ? <div className="q-loading">Loading…</div> : logs.length === 0 ? <div className="q-empty">No activity found.</div> : (
          <div className="crm-table-container">
            <table className="crm-table">
              <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Record</th></tr></thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td>{formatDateTime(l.created_at)}</td>
                    <td>{l.actor?.full_name || l.actor?.email || 'System'}</td>
                    <td>{titleCase(String(l.action).replace(/_/g, ' ').toLowerCase())}</td>
                    <td>{titleCase(String(l.entity_type || '').replace(/_/g, ' '))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pagination.totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, padding: 12, alignItems: 'center' }}>
            <button className="crm-btn crm-btn-secondary crm-btn-sm" disabled={pagination.page <= 1} onClick={() => load(pagination.page - 1)}><ChevronLeft size={14} /></button>
            <span style={{ fontSize: 13 }}>Page {pagination.page} of {pagination.totalPages}</span>
            <button className="crm-btn crm-btn-secondary crm-btn-sm" disabled={pagination.page >= pagination.totalPages} onClick={() => load(pagination.page + 1)}><ChevronRight size={14} /></button>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
