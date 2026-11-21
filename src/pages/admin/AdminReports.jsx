import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import PortalLayout from '@/components/PortalLayout';
import { adminApi } from '@/services/api';
import { formatCurrency, titleCase } from '@/lib/quotation';

function Breakdown({ title, counts }) {
  const rows = Object.entries(counts || {}).sort((a, b) => b[1] - a[1]);
  const total = rows.reduce((s, [, n]) => s + n, 0);
  return (
    <div className="crm-card">
      <div className="crm-card-header"><div className="crm-card-title">{title}</div><span style={{ color: 'var(--text-dim)', fontSize: 13 }}>{total} total</span></div>
      {rows.length === 0 ? <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>No records in this period.</div> : rows.map(([label, n]) => (
        <div key={label} style={{ margin: '8px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span>{titleCase(label.replace(/_/g, ' '))}</span><b>{n}</b></div>
          <div style={{ height: 6, borderRadius: 3, background: 'rgba(var(--ink-rgb), 0.08)' }}>
            <div style={{ height: 6, borderRadius: 3, width: `${(n / total) * 100}%`, background: 'var(--chart-1)' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminReports() {
  const [range, setRange] = useState({ from: '', to: '' });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async (r) => {
    try {
      setLoading(true);
      const params = {};
      if (r.from) params.from = r.from;
      if (r.to) params.to = r.to;
      const res = await adminApi.getReport(params);
      setData(res.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load({ from: '', to: '' }); }, [load]);

  const leads = data?.leads_by_status || {};
  const leadTotal = Object.values(leads).reduce((s, n) => s + n, 0);
  const conversion = leadTotal ? ((leads.converted || 0) / leadTotal) * 100 : 0;

  return (
    <PortalLayout title="Reports & Analytics" subtitle="Counts and totals taken directly from the database">
      {error && <div className="q-alert error"><AlertTriangle size={15} style={{ verticalAlign: '-2px', marginRight: 6 }} />{error}</div>}
      <form className="crm-filter-bar" onSubmit={(e) => { e.preventDefault(); load(range); }}>
        <label style={{ fontSize: 13 }}>From <input className="crm-input" type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} /></label>
        <label style={{ fontSize: 13 }}>To <input className="crm-input" type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} /></label>
        <button className="crm-btn crm-btn-primary crm-btn-sm">Apply</button>
        <button type="button" className="crm-btn crm-btn-secondary crm-btn-sm" onClick={() => { const r = { from: '', to: '' }; setRange(r); load(r); }}>All time</button>
      </form>

      {loading && !data ? <div className="q-loading">Building report…</div> : data && (
        <>
          <div className="crm-stats-grid" style={{ margin: '16px 0' }}>
            <div className="crm-stat-box"><div className="crm-stat-label">Order value</div><div className="crm-stat-value">{formatCurrency(data.money?.order_value)}</div></div>
            <div className="crm-stat-box"><div className="crm-stat-label">Collected on orders</div><div className="crm-stat-value" style={{ color: 'var(--c-green-soft)' }}>{formatCurrency(data.money?.collected)}</div></div>
            <div className="crm-stat-box"><div className="crm-stat-label">Outstanding</div><div className="crm-stat-value" style={{ color: 'var(--c-amber-soft)' }}>{formatCurrency(data.money?.outstanding)}</div></div>
            <div className="crm-stat-box"><div className="crm-stat-label">Invoiced</div><div className="crm-stat-value">{formatCurrency(data.invoiced)}</div><div className="crm-stat-meta">Issued invoices</div></div>
            <div className="crm-stat-box"><div className="crm-stat-label">Approved expenses</div><div className="crm-stat-value">{formatCurrency(data.expenses_approved)}</div></div>
            <div className="crm-stat-box"><div className="crm-stat-label">Lead conversion</div><div className="crm-stat-value">{conversion.toFixed(1)}%</div><div className="crm-stat-meta">{leads.converted || 0} of {leadTotal} leads</div></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <Breakdown title="Leads by status" counts={data.leads_by_status} />
            <Breakdown title="Leads by source" counts={data.leads_by_source} />
            <Breakdown title="Quotations" counts={data.quotations_by_status} />
            <Breakdown title="Orders" counts={data.orders_by_status} />
            <Breakdown title="Installations" counts={data.installations_by_status} />
            <Breakdown title="Support tickets" counts={data.tickets_by_status} />
          </div>
        </>
      )}
    </PortalLayout>
  );
}
