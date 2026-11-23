import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import PortalLayout from '@/components/PortalLayout';
import { ChartCard, StripedBars, TickDonut } from '@/components/charts';
import { apiClient } from '@/services/api';
import { formatCurrency, formatDate, titleCase } from '@/lib/quotation';

// Figures come straight from the finance API. Order value, invoiced amount and
// collected payments are separate measures and are never merged.
export default function FinanceDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/finance/dashboard');
      setData(res.data?.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const m = data?.metrics;
  const tiles = m && [
    ['Order value', m.totalOrderValue, 'Orders created'],
    ['Invoiced', m.totalInvoicedAmount, 'Issued invoices'],
    ['Collected', m.totalCollectedPayments, 'Payments received'],
    ['Outstanding invoices', m.outstandingInvoices, 'Invoiced, not yet paid'],
    ['Recorded expenses', m.totalRecordedExpenses, 'All expense entries'],
    ['Project costs', m.totalProjectCosts, 'Costs booked to orders'],
  ];

  return (
    <PortalLayout title="Finance & Invoices" subtitle="Revenue, collections, expenses and profitability" actions={<button className="crm-btn crm-btn-secondary crm-btn-sm" onClick={load}>Refresh</button>}>
      {error && <div className="q-alert error"><AlertTriangle size={15} style={{ verticalAlign: '-2px', marginRight: 6 }} />{error}</div>}
      {loading ? <div className="q-loading">Loading finance data…</div> : m && (
        <>
          <div className="crm-stats-grid">
            {tiles.map(([label, value, meta]) => (
              <div key={label} className="crm-stat-box">
                <div className="crm-stat-label">{label}</div>
                <div className="crm-stat-value">{formatCurrency(value)}</div>
                <div className="crm-stat-meta">{meta}</div>
              </div>
            ))}
          </div>

          <div className="sx-grid cols-32" style={{ marginTop: 20 }}>
            <ChartCard title="Money overview" note="All figures in INR">
              <StripedBars data={tiles.map(([label, value]) => ({ label: label.split(' ')[0], value }))} />
            </ChartCard>
            <ChartCard title="Collections">
              <TickDonut centerLabel="Invoiced" centerValue={formatCurrency(m.totalInvoicedAmount)}
                items={[{ label: 'Collected', value: m.totalCollectedPayments, display: formatCurrency(m.totalCollectedPayments) }, { label: 'Outstanding', value: m.outstandingInvoices, display: formatCurrency(m.outstandingInvoices) }]} />
            </ChartCard>
          </div>

          <div className="crm-card" style={{ marginTop: 20 }}>
            <div className="crm-card-title">Project profitability</div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              Collected payments minus booked project costs (or recorded expenses where no project costs exist). Treat it as indicative until all costs are recorded.
            </p>
            <div className="crm-stat-value" style={{ color: m.netProfit >= 0 ? 'var(--c-green-soft)' : 'var(--c-red)' }}>
              {formatCurrency(m.netProfit)} <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>({m.profitMarginPct}% margin)</span>
            </div>
          </div>

          <div className="crm-card" style={{ marginTop: 20, padding: 0 }}>
            <div className="crm-card-header" style={{ padding: '16px 20px 0' }}><div className="crm-card-title">Recent transactions</div></div>
            {(data.recentTransactions || []).length === 0 ? (
              <div className="q-empty">No financial transactions have been recorded yet.</div>
            ) : (
              <div className="crm-table-container">
                <table className="crm-table">
                  <thead><tr><th>Code</th><th>Type</th><th>Amount</th><th>Date</th></tr></thead>
                  <tbody>
                    {data.recentTransactions.map((t) => (
                      <tr key={t.id}><td>{t.transaction_code}</td><td>{titleCase(t.transaction_type.replace(/_/g, ' '))}</td><td>{formatCurrency(t.amount)}</td><td>{formatDate(t.transaction_date)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </PortalLayout>
  );
}
