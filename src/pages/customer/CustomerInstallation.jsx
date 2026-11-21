import { useEffect, useState } from 'react';
import { AlertTriangle, MapPin } from 'lucide-react';
import PortalLayout from '@/components/PortalLayout';
import { customerApi } from '@/services/api';
import { formatDate, formatDateTime, titleCase } from '@/lib/quotation';

const STEPS = ['scheduled', 'in_progress', 'completed'];

export default function CustomerInstallation() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    customerApi
      .getInstallations()
      .then((res) => setItems(res.data?.installations || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PortalLayout title="Installation Tracking" subtitle="Follow the installation of your solar system">
      {error && <div className="q-alert error"><AlertTriangle size={15} style={{ verticalAlign: '-2px', marginRight: 6 }} />{error}</div>}
      {loading ? (
        <div className="q-loading">Loading installations…</div>
      ) : items.length === 0 ? (
        <div className="crm-card q-empty">
          <MapPin size={28} style={{ opacity: 0.4, marginBottom: 8 }} />
          <div>No installation has been scheduled yet. Once your order is dispatched, the installation team will schedule a date and it will appear here.</div>
        </div>
      ) : (
        items.map((i) => {
          const idx = STEPS.indexOf(i.status === 'on_hold' ? 'in_progress' : i.status);
          const stopped = ['failed', 'cancelled'].includes(i.status);
          return (
            <div key={i.id} className="crm-card" style={{ marginBottom: 16 }}>
              <div className="crm-card-header">
                <div className="crm-card-title">{i.installation_code} <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>· Order {i.orders?.order_code || '—'}</span></div>
                <span className="q-badge">{titleCase(i.status.replace(/_/g, ' '))}</span>
              </div>
              {!stopped && (
                <div style={{ display: 'flex', gap: 8, margin: '12px 0 18px' }}>
                  {STEPS.map((s, n) => (
                    <div key={s} style={{ flex: 1 }}>
                      <div style={{ height: 6, borderRadius: 3, background: n <= idx ? '#d8ee8e' : 'rgba(var(--ink-rgb), 0.1)' }} />
                      <div style={{ fontSize: 12, marginTop: 6, color: n <= idx ? 'var(--accent-text)' : 'var(--text-dim)' }}>{titleCase(s.replace('_', ' '))}</div>
                    </div>
                  ))}
                </div>
              )}
              <div className="crm-stats-grid">
                <div className="crm-stat-box"><div className="crm-stat-label">Scheduled start</div><div className="crm-stat-meta">{i.scheduled_start ? formatDateTime(i.scheduled_start) : 'Not scheduled yet'}</div></div>
                <div className="crm-stat-box"><div className="crm-stat-label">Work started</div><div className="crm-stat-meta">{i.actual_start ? formatDateTime(i.actual_start) : '—'}</div></div>
                <div className="crm-stat-box"><div className="crm-stat-label">Completed</div><div className="crm-stat-meta">{i.actual_end ? formatDate(i.actual_end) : '—'}</div></div>
                <div className="crm-stat-box"><div className="crm-stat-label">System size</div><div className="crm-stat-meta">{i.system_capacity_kw ? `${Number(i.system_capacity_kw)} kW` : '—'}</div></div>
              </div>
            </div>
          );
        })
      )}
    </PortalLayout>
  );
}
