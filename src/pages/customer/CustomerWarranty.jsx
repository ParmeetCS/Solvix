import { useEffect, useState } from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import CustomerPortalLayout from './CustomerPortalLayout';
import { customerApi } from '@/services/api';
import { formatDate, titleCase } from '@/lib/quotation';

export default function CustomerWarranty() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    customerApi
      .getWarranties({ limit: 100 })
      .then((res) => setItems(res.data?.warranties || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <CustomerPortalLayout title="Warranty" subtitle="Warranty coverage for the equipment installed at your site">
      {error && <div className="q-alert error"><AlertTriangle size={15} style={{ verticalAlign: '-2px', marginRight: 6 }} />{error}</div>}
      <div className="crm-card" style={{ padding: 0 }}>
        {loading ? (
          <div className="q-loading">Loading warranties…</div>
        ) : items.length === 0 ? (
          <div className="q-empty">
            <ShieldCheck size={28} style={{ opacity: 0.4, marginBottom: 8 }} />
            <div>No warranties are registered yet. Warranty starts when your equipment delivery is confirmed.</div>
          </div>
        ) : (
          <div className="crm-table-container">
            <table className="crm-table">
              <thead><tr><th>Warranty</th><th>Equipment</th><th>Serial</th><th>Valid</th><th>Status</th></tr></thead>
              <tbody>
                {items.map((w) => {
                  const product = w.equipment_serial_numbers?.products;
                  return (
                    <tr key={w.id}>
                      <td><b style={{ color: '#d8ee8e' }}>{w.warranty_code}</b><div style={{ fontSize: '0.72rem', color: '#64748b' }}>{titleCase(w.warranty_type || '')}</div></td>
                      <td>{product?.name || '—'}</td>
                      <td>{w.equipment_serial_numbers?.serial_number || '—'}</td>
                      <td>{formatDate(w.start_date)} – {formatDate(w.expiry_date)}</td>
                      <td><span className="q-badge">{titleCase(String(w.status).replace(/_/g, ' '))}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p style={{ fontSize: 12, color: '#64748b', marginTop: 12 }}>
        Coverage terms are those recorded on each warranty and the manufacturer's documentation. To report a fault, raise a service request.
      </p>
    </CustomerPortalLayout>
  );
}
