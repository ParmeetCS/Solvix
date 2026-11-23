import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '@/components/PortalLayout';
import QrScannerModal from '@/components/QrScannerModal';
import { warehouseApi } from '@/services/api/warehouse';
import {
  QrCode,
  Plus,
  Search,
  Scan,
  AlertTriangle,
  X,
} from 'lucide-react';

export default function SerialNumbersList() {
  const [serials, setSerials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Scanner / Lookup Modal State
  const [lookupOpen, setLookupOpen] = useState(false);
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState(null);
  const [scanning, setScanning] = useState(false);

  const loadSerials = async () => {
    try {
      setLoading(true);
      const res = await warehouseApi.getSerialNumbers({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search
      });
      if (res && res.success) {
        setSerials(res.data);
      }
    } catch (err) {
      console.error('Failed to load serial numbers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSerials();
  }, [statusFilter]);

  const handleLookupSubmit = (e) => {
    e.preventDefault();
    runLookup(lookupQuery);
  };

  const runLookup = async (query) => {
    if (!query || !query.trim()) return;

    try {
      setLookupLoading(true);
      setLookupError(null);
      setLookupResult(null);

      const res = await warehouseApi.lookupSerialNumber(query.trim());
      if (res && res.success) {
        setLookupResult(res.data);
      } else {
        setLookupError(res?.error || 'Serial number or QR payload not found');
      }
    } catch (err) {
      setLookupError(err.message || 'Lookup failed');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleScanned = (text) => {
    const code = String(text || '').trim();
    setLookupQuery(code);
    runLookup(code);
  };

  return (
    <PortalLayout
      title="Serial Numbers & QR Code Registry"
      subtitle="Unique equipment tracking for solar panels, inverters, and battery systems"
      actions={
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => { setLookupOpen(true); setLookupResult(null); setLookupError(null); }} className="btn-wh-secondary">
            <Scan size={15} />
            <span>QR / Serial Lookup</span>
          </button>
          <Link to="/warehouse/serial-numbers/register" className="btn-wh-primary">
            <Plus size={15} />
            <span>Register Serials</span>
          </Link>
        </div>
      }
    >
      <QrScannerModal open={scanning} title="Scan serial / QR code" onScan={handleScanned} onClose={() => setScanning(false)} />

      <div className="wh-filter-bar">
        <form onSubmit={(e) => { e.preventDefault(); loadSerials(); }} className="wh-search-box">
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search serial number, QR code, or product..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>

        <div style={{ display: 'flex', gap: '12px' }}>
          <select
            className="wh-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Serial Statuses</option>
            <option value="in_stock">In Stock</option>
            <option value="reserved">Reserved</option>
            <option value="dispatched">Dispatched</option>
            <option value="delivered">Delivered / Active</option>
            <option value="defective">Defective</option>
          </select>
        </div>
      </div>

      <div className="wh-card">
        <div className="wh-table-container">
          <table className="wh-table">
            <thead>
              <tr>
                <th>Serial Number</th>
                <th>QR Payload Preview</th>
                <th>Product Name & SKU</th>
                <th>Warehouse / Location</th>
                <th>Status</th>
                <th>Registration Date</th>
                <th>Dispatched / Delivered</th>
              </tr>
            </thead>
            <tbody>
              {serials.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '36px' }}>
                    {loading ? 'Loading serial numbers...' : 'No serial records match the criteria.'}
                  </td>
                </tr>
              ) : (
                serials.map((s) => {
                  return (
                    <tr key={s.id}>
                      <td>
                        <strong style={{ color: 'var(--c-blue)', letterSpacing: '0.04em' }}>
                          {s.serial_number}
                        </strong>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <QrCode size={16} style={{ color: 'var(--text-muted)' }} />
                          <code style={{ fontSize: '0.75rem', color: 'var(--text-soft)' }}>
                            {s.qr_code_payload ? s.qr_code_payload.substring(0, 24) + '...' : '-'}
                          </code>
                        </div>
                      </td>
                      <td style={{ fontWeight: 500, color: 'var(--text)' }}>
                        {s.product?.name || s.product_name || s.product_id}
                      </td>
                      <td>{s.warehouse?.name || 'Main Regional Hub'}</td>
                      <td>
                        <span className={`wh-badge ${
                          s.status === 'in_stock' ? 'wh-badge-green' :
                          s.status === 'reserved' ? 'wh-badge-yellow' :
                          s.status === 'dispatched' ? 'wh-badge-blue' :
                          s.status === 'delivered' ? 'wh-badge-purple' : 'wh-badge-red'
                        }`}>
                          {String(s.status || '').replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {new Date(s.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ fontSize: '0.82rem', color: s.dispatched_at ? 'var(--c-green)' : 'var(--text-muted)' }}>
                        {s.delivered_at ? `Delivered: ${new Date(s.delivered_at).toLocaleDateString()}` :
                         s.dispatched_at ? `Dispatched: ${new Date(s.dispatched_at).toLocaleDateString()}` : 'In Facility'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QR / Serial Lookup Scanner Modal */}
      {lookupOpen && (
        <div className="wh-modal-overlay">
          <div className="wh-modal" style={{ maxWidth: '580px' }}>
            <div className="wh-modal-header">
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Scan size={18} style={{ color: 'var(--c-blue)' }} />
                <span>QR / Serial Number Verification Scanner</span>
              </h3>
              <button
                onClick={() => setLookupOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="wh-modal-body">
              <form onSubmit={handleLookupSubmit} style={{ marginBottom: '16px' }}>
                <div className="wh-form-group">
                  <label>Scan Barcode / Enter Serial Number or QR Data</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      className="wh-input"
                      placeholder="e.g. SN-WAA-545-00192 or QR code text"
                      value={lookupQuery}
                      onChange={(e) => setLookupQuery(e.target.value)}
                      autoFocus
                    />
                    <button type="button" className="btn-wh-secondary" onClick={() => setScanning(true)}>
                      <Scan size={15} /> <span>Scan</span>
                    </button>
                    <button type="submit" className="btn-wh-primary" disabled={lookupLoading}>
                      {lookupLoading ? 'Verifying...' : 'Search'}
                    </button>
                  </div>
                </div>
              </form>

              {lookupError && (
                <div className="wh-alert wh-alert-danger">
                  <AlertTriangle size={16} />
                  <span>{lookupError}</span>
                </div>
              )}

              {lookupResult && (
                <div style={{ background: 'rgba(var(--ink-rgb), 0.03)', border: '1px solid rgba(var(--ink-rgb), 0.08)', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--c-blue)' }}>
                      {lookupResult.serial_number}
                    </span>
                    <span className={`wh-badge ${
                      lookupResult.status === 'in_stock' ? 'wh-badge-green' :
                      lookupResult.status === 'dispatched' ? 'wh-badge-blue' :
                      lookupResult.status === 'delivered' ? 'wh-badge-purple' : 'wh-badge-yellow'
                    }`}>
                      {lookupResult.status}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '0.85rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Product: </span>
                      <strong style={{ color: 'var(--text-strong)' }}>{lookupResult.product_name}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Warehouse: </span>
                      <span style={{ color: 'var(--text-strong)' }}>{lookupResult.warehouse_name || 'Primary'}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Order Attached: </span>
                      <span style={{ color: 'var(--text-strong)' }}>{lookupResult.order_number || 'None'}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Dispatch Ref: </span>
                      <span style={{ color: 'var(--text-strong)' }}>{lookupResult.dispatch_number || 'None'}</span>
                    </div>
                  </div>

                  {/* QR Code Graphic Box */}
                  <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
                    <div className="qr-badge-box">
                      <QrCode size={64} style={{ color: 'var(--on-fill)' }} />
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--on-fill)' }}>
                        {lookupResult.serial_number}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="wh-modal-footer">
              <button
                type="button"
                className="btn-wh-secondary"
                onClick={() => setLookupOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
