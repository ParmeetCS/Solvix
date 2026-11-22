import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import PortalLayout from '@/components/PortalLayout';
import QrScannerModal from '@/components/QrScannerModal';
import { warehouseApi } from '@/services/api/warehouse';
import {
  QrCode,
  ArrowLeft,
  Save,
  FileText,
  AlertTriangle,
  CheckCircle,
  Plus,
  ScanLine
} from 'lucide-react';

export default function SerialRegistration() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [mode, setMode] = useState('single'); // 'single' | 'batch'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [scanTarget, setScanTarget] = useState(null); // null | 'single' | 'batch'

  // Single form
  const [singleForm, setSingleForm] = useState({
    product_id: '',
    serial_number: '',
    warehouse_id: '',
    manufacturing_date: '',
    notes: ''
  });

  // Batch form
  const [batchProductId, setBatchProductId] = useState('');
  const [batchWarehouseId, setBatchWarehouseId] = useState('');
  const [singleLocation, setSingleLocation] = useState('');
  const [batchLocation, setBatchLocation] = useState('');
  const [batchText, setBatchText] = useState('');

  useEffect(() => {
    async function init() {
      try {
        const [prodRes, dashRes] = await Promise.all([
          warehouseApi.getProducts({ requires_serial_number: true }),
          warehouseApi.getDashboard()
        ]);
        if (prodRes && prodRes.success && prodRes.data.length > 0) {
          setProducts(prodRes.data);
          setSingleForm(prev => ({ ...prev, product_id: prodRes.data[0].id }));
          setBatchProductId(prodRes.data[0].id);
        }
        if (dashRes && dashRes.success && dashRes.data.warehouses) {
          setWarehouses(dashRes.data.warehouses);
          if (dashRes.data.warehouses.length > 0) {
            setSingleForm(prev => ({ ...prev, warehouse_id: dashRes.data.warehouses[0].id }));
            setBatchWarehouseId(dashRes.data.warehouses[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to init serial registration:', err);
      }
    }
    init();
  }, []);

  // A warehouse can be chosen from the list or typed by hand (value "__manual__", or no list at all).
  const MANUAL = '__manual__';
  const locationFor = (warehouseId, typed) => {
    if (!warehouseId || warehouseId === MANUAL) return typed.trim();
    const w = warehouses.find((x) => x.id === warehouseId);
    return w ? w.name : typed.trim();
  };

  const handleScanned = (text) => {
    const code = String(text || '').trim();
    if (!code) return;
    if (scanTarget === 'single') {
      setSingleForm((prev) => ({ ...prev, serial_number: code }));
    } else {
      // batch: one serial per line, skipping codes already in the box
      setBatchText((prev) => {
        const lines = prev.split(String.fromCharCode(10)).map((l) => l.trim()).filter(Boolean);
        return lines.includes(code) ? prev : [...lines, code].join(String.fromCharCode(10));
      });
    }
  };

  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!singleForm.serial_number.trim()) {
      setError('Serial number is required');
      return;
    }

    try {
      setLoading(true);
      const res = await warehouseApi.registerSerialNumbers({
        ...singleForm,
        warehouse_id: singleForm.warehouse_id === MANUAL ? '' : singleForm.warehouse_id,
        current_location: locationFor(singleForm.warehouse_id, singleLocation) || undefined,
      });
      if (res && res.success) {
        setSuccess(`Serial number ${singleForm.serial_number} registered successfully!`);
        setTimeout(() => {
          navigate('/warehouse/serial-numbers');
        }, 1200);
      } else {
        setError(res?.error || 'Failed to register serial number');
      }
    } catch (err) {
      setError(err.message || 'Error registering serial number');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const lines = batchText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    if (lines.length === 0) {
      setError('Please provide at least one serial number in the batch box');
      return;
    }

    const batch = lines.map(sn => ({
      product_id: batchProductId,
      warehouse_id: batchWarehouseId === MANUAL ? '' : batchWarehouseId,
      current_location: locationFor(batchWarehouseId, batchLocation) || undefined,
      serial_number: sn
    }));

    try {
      setLoading(true);
      const res = await warehouseApi.registerSerialNumbers({ batch });
      if (res && res.success) {
        setSuccess(`Successfully imported and registered ${batch.length} serial numbers!`);
        setTimeout(() => {
          navigate('/warehouse/serial-numbers');
        }, 1500);
      } else {
        setError(res?.error || 'Batch registration failed');
      }
    } catch (err) {
      setError(err.message || 'Error registering serial batch');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PortalLayout
      title="Register Equipment Serial Numbers"
      subtitle="Generate unique tracking identities and QR payloads for solar panels, inverters, and battery modules"
      actions={
        <Link to="/warehouse/serial-numbers" className="btn-wh-secondary">
          <ArrowLeft size={16} />
          <span>Back to Serials</span>
        </Link>
      }
    >
      <QrScannerModal
        open={scanTarget !== null}
        continuous={scanTarget === 'batch'}
        title={scanTarget === 'batch' ? 'Scan components one by one' : 'Scan serial number'}
        onScan={handleScanned}
        onClose={() => setScanTarget(null)}
      />

      {error && (
        <div className="wh-alert wh-alert-danger">
          <AlertTriangle size={18} />
          <div>{error}</div>
        </div>
      )}

      {success && (
        <div className="wh-alert wh-alert-success">
          <CheckCircle size={18} />
          <div>{success}</div>
        </div>
      )}

      {/* Mode Selector Tabs */}
      <div className="wh-tabs" style={{ marginBottom: '20px' }}>
        <button
          className={`wh-tab ${mode === 'single' ? 'active' : ''}`}
          onClick={() => setMode('single')}
        >
          Single Serial Registration
        </button>
        <button
          className={`wh-tab ${mode === 'batch' ? 'active' : ''}`}
          onClick={() => setMode('batch')}
        >
          Batch CSV / Text Import
        </button>
      </div>

      {mode === 'single' ? (
        <form onSubmit={handleSingleSubmit}>
          <div className="wh-card">
            <div className="wh-card-header">
              <div className="wh-card-title">
                <QrCode size={18} style={{ color: 'var(--c-emerald)' }} />
                <span>Single Equipment Details</span>
              </div>
            </div>

            <div className="wh-form-grid">
              <div className="wh-form-group">
                <label>Select Solar Product *</label>
                <select
                  className="wh-select"
                  value={singleForm.product_id}
                  onChange={(e) => setSingleForm({ ...singleForm, product_id: e.target.value })}
                  required
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div className="wh-form-group">
                <label>Location / Warehouse *</label>
                {warehouses.length > 0 && (
                  <select
                    className="wh-select"
                    value={singleForm.warehouse_id}
                    onChange={(e) => setSingleForm({ ...singleForm, warehouse_id: e.target.value })}
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                    ))}
                    <option value={MANUAL}>Other (type it below)</option>
                  </select>
                )}
                {(warehouses.length === 0 || singleForm.warehouse_id === MANUAL) && (
                  <input
                    type="text"
                    className="wh-input"
                    style={{ marginTop: warehouses.length > 0 ? 8 : 0 }}
                    placeholder="Type the warehouse or location, e.g. Delhi Central Warehouse"
                    value={singleLocation}
                    onChange={(e) => setSingleLocation(e.target.value)}
                  />
                )}
              </div>

              <div className="wh-form-group span-2">
                <label>Serial Number (Barcode Value) *</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    className="wh-input"
                    style={{ flex: 1 }}
                    placeholder="e.g. SN-WAA-545-2026-00481"
                    value={singleForm.serial_number}
                    onChange={(e) => setSingleForm({ ...singleForm, serial_number: e.target.value })}
                    required
                  />
                  <button type="button" className="btn-wh-secondary" onClick={() => setScanTarget('single')}>
                    <ScanLine size={16} /> <span>Scan QR</span>
                  </button>
                </div>
              </div>

              <div className="wh-form-group">
                <label>Manufacturing Date</label>
                <input
                  type="date"
                  className="wh-input"
                  value={singleForm.manufacturing_date}
                  onChange={(e) => setSingleForm({ ...singleForm, manufacturing_date: e.target.value })}
                />
              </div>

              <div className="wh-form-group">
                <label>Inspector / Intake Notes</label>
                <input
                  type="text"
                  className="wh-input"
                  placeholder="e.g. Inspected at intake, box 4"
                  value={singleForm.notes}
                  onChange={(e) => setSingleForm({ ...singleForm, notes: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              className="btn-wh-secondary"
              onClick={() => navigate('/warehouse/serial-numbers')}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-wh-primary"
              disabled={loading}
            >
              <Save size={16} />
              <span>{loading ? 'Registering...' : 'Register Serial Number'}</span>
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleBatchSubmit}>
          <div className="wh-card">
            <div className="wh-card-header">
              <div className="wh-card-title">
                <FileText size={18} style={{ color: 'var(--c-blue)' }} />
                <span>Batch Paste / Barcode Gun Rapid Import</span>
              </div>
            </div>

            <div className="wh-form-grid">
              <div className="wh-form-group">
                <label>Target Product *</label>
                <select
                  className="wh-select"
                  value={batchProductId}
                  onChange={(e) => setBatchProductId(e.target.value)}
                  required
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div className="wh-form-group">
                <label>Target Facility / Warehouse *</label>
                {warehouses.length > 0 && (
                  <select
                    className="wh-select"
                    value={batchWarehouseId}
                    onChange={(e) => setBatchWarehouseId(e.target.value)}
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                    ))}
                    <option value={MANUAL}>Other (type it below)</option>
                  </select>
                )}
                {(warehouses.length === 0 || batchWarehouseId === MANUAL) && (
                  <input
                    type="text"
                    className="wh-input"
                    style={{ marginTop: warehouses.length > 0 ? 8 : 0 }}
                    placeholder="Type the warehouse or location"
                    value={batchLocation}
                    onChange={(e) => setBatchLocation(e.target.value)}
                  />
                )}
              </div>

              <div className="wh-form-group span-2">
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span>Serial Numbers List (One per line) *</span>
                  <button type="button" className="btn-wh-secondary" style={{ padding: '4px 10px', fontSize: '0.8rem' }} onClick={() => setScanTarget('batch')}>
                    <ScanLine size={14} /> <span>Scan components</span>
                  </button>
                </label>
                <textarea
                  className="wh-textarea"
                  rows="8"
                  placeholder="SN-WAA-545-001&#10;SN-WAA-545-002&#10;SN-WAA-545-003&#10;SN-WAA-545-004"
                  value={batchText}
                  onChange={(e) => setBatchText(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              className="btn-wh-secondary"
              onClick={() => navigate('/warehouse/serial-numbers')}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-wh-primary"
              disabled={loading}
            >
              <Save size={16} />
              <span>{loading ? 'Importing Batch...' : 'Register Batch Serials'}</span>
            </button>
          </div>
        </form>
      )}
    </PortalLayout>
  );
}
