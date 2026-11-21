import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import PortalLayout from '@/components/PortalLayout';
import { apiClient } from '@/services/api';
import { formatCurrency } from '@/lib/quotation';

const LABELS = [
  ['total', 'Total applications'],
  ['draft', 'Draft'],
  ['submitted', 'Submitted'],
  ['under_review', 'Under review'],
  ['approved', 'Approved'],
  ['rejected', 'Rejected'],
];

// Counts come from the subsidy API. No eligibility or approval is assumed.
export default function SubsidyDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/subsidy/dashboard');
      setData(res.data?.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <PortalLayout title="Subsidy & Documents" subtitle="Subsidy applications and document verification" actions={<button className="crm-btn crm-btn-secondary crm-btn-sm" onClick={load}>Refresh</button>}>
      {error && <div className="q-alert error"><AlertTriangle size={15} style={{ verticalAlign: '-2px', marginRight: 6 }} />{error}</div>}
      {loading ? <div className="q-loading">Loading…</div> : data && (
        <>
          <div className="crm-stats-grid">
            {LABELS.map(([key, label]) => (
              <div key={key} className="crm-stat-box">
                <div className="crm-stat-label">{label}</div>
                <div className="crm-stat-value">{data.statusCounts?.[key] ?? 0}</div>
              </div>
            ))}
            <div className="crm-stat-box">
              <div className="crm-stat-label">Documents pending</div>
              <div className="crm-stat-value">{data.pendingDocumentsCount ?? 0}</div>
            </div>
          </div>
          <div className="crm-card" style={{ marginTop: 20 }}>
            <div className="crm-card-title">Amounts</div>
            <p style={{ color: '#94a3b8', fontSize: 13 }}>
              Applied: {formatCurrency(data.financials?.totalApplied)} · Approved by authority: {formatCurrency(data.financials?.totalApproved)}.
              Scheme rules and eligibility must be verified against current official requirements by authorised staff.
            </p>
          </div>
        </>
      )}
    </PortalLayout>
  );
}
