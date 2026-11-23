import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import PortalLayout from '@/components/PortalLayout';
import { warehouseApi } from '@/services/api/warehouse';
import {
  ArrowLeft,
  CheckCircle,
  Printer,
  ShieldCheck,
  PackageCheck,
  AlertTriangle,
  Clock,
  X,
} from 'lucide-react';

export default function DispatchDetail() {
  const { id } = useParams();
  const [dispatch, setDispatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Delivery Confirmation Modal State
  const [deliverModalOpen, setDeliverModalOpen] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [deliverLoading, setDeliverLoading] = useState(false);
  const [deliverSuccess, setDeliverSuccess] = useState(null);
  const [deliverError, setDeliverError] = useState(null);

  const loadDispatch = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await warehouseApi.getDispatchById(id);
      if (res && res.success) {
        setDispatch(res.data);
      } else {
        setError(res?.error || 'Dispatch record not found');
      }
    } catch (err) {
      setError(err.message || 'Error loading dispatch record');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDispatch();
  }, [id]);

  const handleConfirmDelivery = async (e) => {
    e.preventDefault();
    setDeliverError(null);
    setDeliverSuccess(null);

    if (!recipientName) {
      setDeliverError('Recipient name is required to confirm handover');
      return;
    }

    try {
      setDeliverLoading(true);
      const res = await warehouseApi.confirmDelivery(id, {
        recipient_name: recipientName,
        recipient_phone: recipientPhone,
        delivery_notes: deliveryNotes
      });

      if (res && res.success) {
        setDeliverSuccess('Equipment delivery confirmed! Warranties activated immediately.');
        await loadDispatch();
        setTimeout(() => {
          setDeliverModalOpen(false);
        }, 1500);
      } else {
        setDeliverError(res?.error || 'Failed to record delivery');
      }
    } catch (err) {
      setDeliverError(err.message || 'Error confirming delivery');
    } finally {
      setDeliverLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const isDelivered = dispatch?.status === 'delivered';

  return (
    <PortalLayout
      title={`Dispatch: ${dispatch?.dispatch_number || id}`}
      subtitle={`Carrier: ${dispatch?.transporter_name || '-'} | AWB: ${dispatch?.tracking_number || '-'}`}
      actions={
        <div style={{ display: 'flex', gap: '8px' }} className="no-print">
          <button onClick={handlePrint} className="btn-wh-secondary">
            <Printer size={15} />
            <span>Print Challan</span>
          </button>
          {!isDelivered && (
            <button
              onClick={() => {
                setDeliverModalOpen(true);
                setRecipientName(dispatch?.customer_name || '');
                setRecipientPhone('');
                setDeliveryNotes('');
              }}
              className="btn-wh-primary"
            >
              <PackageCheck size={15} />
              <span>Confirm Equipment Delivery</span>
            </button>
          )}
          <Link to="/warehouse/dispatches" className="btn-wh-secondary">
            <ArrowLeft size={15} />
            <span>Back</span>
          </Link>
        </div>
      }
    >
      {error && (
        <div className="wh-alert wh-alert-danger no-print">
          <AlertTriangle size={18} />
          <div>{error}</div>
        </div>
      )}

      {/* Critical Business Rule Banner */}
      {isDelivered ? (
        <div className="wh-alert wh-alert-success no-print">
          <ShieldCheck size={20} />
          <div>
            <strong>Equipment Delivered & Warranties Active</strong>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem' }}>
              Warranty clock started on actual equipment delivery date (
              {dispatch.delivered_at ? new Date(dispatch.delivered_at).toLocaleDateString() : 'Today'}
              ) in accordance with SOLVIX warranty policies.
            </p>
          </div>
        </div>
      ) : (
        <div className="wh-alert wh-alert-warning no-print">
          <Clock size={20} />
          <div>
            <strong>Shipment In-Transit</strong>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem' }}>
              Stock was deducted upon dispatch. Customer warranty clock will activate once equipment delivery is confirmed below.
            </p>
          </div>
        </div>
      )}

      {/* Printable Delivery Challan & Dispatch Overview */}
      <div className="wh-card" id="delivery-challan">
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(var(--ink-rgb), 0.08)', paddingBottom: '16px', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-strong)' }}>SOLVIX ENERGY SYSTEMS</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Equipment Delivery Challan & Dispatch Manifest</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-soft)', marginTop: '4px' }}>
              Dispatch Number: <strong style={{ color: 'var(--c-blue)' }}>{dispatch?.dispatch_number}</strong>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className={`wh-badge ${isDelivered ? 'wh-badge-green' : 'wh-badge-blue'}`} style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
              {dispatch?.status?.replace('_', ' ')}
            </span>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '6px' }}>
              Date: {dispatch?.dispatched_at ? new Date(dispatch.dispatched_at).toLocaleDateString() : new Date().toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Customer & Transporter Metadata */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '24px' }}>
          <div>
            <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Destination & Customer</div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-strong)', marginTop: '4px' }}>
              {dispatch?.customer_name || 'Retail Client'}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-soft)', marginTop: '2px' }}>
              {dispatch?.destination_address || 'Site Delivery'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Logistics & Carrier</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-strong)', marginTop: '4px' }}>
              {dispatch?.transporter_name}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-soft)', marginTop: '2px' }}>
              AWB: {dispatch?.tracking_number || '-'} | Vehicle: {dispatch?.vehicle_number || '-'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Warehouse Facility</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-strong)', marginTop: '4px' }}>
              {dispatch?.warehouse_name || 'Primary Regional Hub'}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-soft)', marginTop: '2px' }}>
              Order Ref: {dispatch?.order_number || dispatch?.order_id || '-'}
            </div>
          </div>
        </div>

        {/* Dispatch Items Table */}
        <div className="wh-table-container" style={{ marginBottom: '24px' }}>
          <table className="wh-table">
            <thead>
              <tr>
                <th>Product Description</th>
                <th>SKU</th>
                <th>Qty Dispatched</th>
                <th>Serial Numbers Attached</th>
              </tr>
            </thead>
            <tbody>
              {(!dispatch?.items || dispatch.items.length === 0) ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                    No line items attached.
                  </td>
                </tr>
              ) : (
                dispatch.items.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600, color: 'var(--text)' }}>
                      {item.product_name}
                    </td>
                    <td>
                      <code style={{ fontSize: '0.8rem', color: 'var(--c-blue)' }}>{item.product_sku}</code>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--text-strong)' }}>
                      {item.quantity} {item.unit || 'pcs'}
                    </td>
                    <td>
                      {item.serial_numbers && item.serial_numbers.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {item.serial_numbers.map((s, sIdx) => (
                            <span
                              key={sIdx}
                              style={{
                                background: 'rgba(56, 189, 248, 0.1)',
                                border: '1px solid rgba(56, 189, 248, 0.25)',
                                color: 'var(--c-blue)',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontSize: '0.75rem'
                              }}
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Batch / Bulk</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Handover & Delivery Signatures Block */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px', marginTop: '36px', paddingTop: '20px', borderTop: '1px dashed rgba(var(--ink-rgb), 0.1)' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '40px' }}>
              Warehouse Dispatcher Signature:
            </div>
            <div style={{ borderBottom: '1px solid var(--text-muted)', width: '80%' }}></div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-soft)', marginTop: '6px' }}>
              Authorized SOLVIX Dispatch Official
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '40px' }}>
              Recipient Signature & Date:
            </div>
            <div style={{ borderBottom: '1px solid var(--text-muted)', width: '80%' }}></div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-soft)', marginTop: '6px' }}>
              {isDelivered && dispatch.recipient_name ? (
                <span>Received by: <strong>{dispatch.recipient_name}</strong></span>
              ) : (
                'Customer / Site Engineer'
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Warranties Triggered Section */}
      {isDelivered && dispatch?.warranties && dispatch.warranties.length > 0 && (
        <div className="wh-card">
          <div className="wh-card-header">
            <div className="wh-card-title">
              <ShieldCheck size={18} style={{ color: 'var(--c-emerald)' }} />
              <span>Activated Warranties (Triggered by Delivery)</span>
            </div>
            <span className="wh-badge wh-badge-green">Live Warranties Active</span>
          </div>

          <div className="wh-table-container">
            <table className="wh-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Serial Number</th>
                  <th>Warranty Start Date</th>
                  <th>Warranty Expiry Date</th>
                  <th>Duration</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {dispatch.warranties.map((w, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600, color: 'var(--text)' }}>{w.product_name}</td>
                    <td>
                      <code style={{ fontSize: '0.82rem', color: 'var(--c-blue)' }}>{w.serial_number}</code>
                    </td>
                    <td style={{ color: 'var(--c-green)', fontWeight: 600 }}>
                      {new Date(w.start_date).toLocaleDateString()}
                    </td>
                    <td>{new Date(w.expiry_date).toLocaleDateString()}</td>
                    <td>{w.duration_months} Months ({Math.round(w.duration_months / 12)} Yrs)</td>
                    <td>
                      <span className="wh-badge wh-badge-green">{w.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delivery Confirmation Modal */}
      {deliverModalOpen && (
        <div className="wh-modal-overlay">
          <div className="wh-modal" style={{ maxWidth: '540px' }}>
            <div className="wh-modal-header">
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PackageCheck size={18} style={{ color: 'var(--c-emerald)' }} />
                <span>Confirm Equipment Delivery</span>
              </h3>
              <button
                onClick={() => setDeliverModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmDelivery}>
              <div className="wh-modal-body">
                {deliverError && (
                  <div className="wh-alert wh-alert-danger" style={{ marginBottom: '14px' }}>
                    <AlertTriangle size={16} />
                    <span>{deliverError}</span>
                  </div>
                )}
                {deliverSuccess && (
                  <div className="wh-alert wh-alert-success" style={{ marginBottom: '14px' }}>
                    <CheckCircle size={16} />
                    <span>{deliverSuccess}</span>
                  </div>
                )}

                <div className="wh-alert wh-alert-warning" style={{ marginBottom: '16px' }}>
                  <ShieldCheck size={16} />
                  <span>
                    Confirming delivery initiates the customer's equipment warranty coverage clock effective immediately as of today!
                  </span>
                </div>

                <div className="wh-form-grid full">
                  <div className="wh-form-group">
                    <label>Recipient / Receiver Full Name *</label>
                    <input
                      type="text"
                      className="wh-input"
                      placeholder="e.g. Ramesh Patel (Customer or Site In-charge)"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="wh-form-group">
                    <label>Recipient Phone Number</label>
                    <input
                      type="text"
                      className="wh-input"
                      placeholder="+91 98765 43210"
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                    />
                  </div>

                  <div className="wh-form-group">
                    <label>Delivery Remarks / Proof of Delivery Notes</label>
                    <textarea
                      className="wh-textarea"
                      rows="2"
                      placeholder="Unloaded at site, physical condition verified, customer signed POD"
                      value={deliveryNotes}
                      onChange={(e) => setDeliveryNotes(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="wh-modal-footer">
                <button
                  type="button"
                  className="btn-wh-secondary"
                  onClick={() => setDeliverModalOpen(false)}
                  disabled={deliverLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-wh-primary"
                  disabled={deliverLoading}
                >
                  <PackageCheck size={16} />
                  <span>{deliverLoading ? 'Activating Warranties...' : 'Confirm Delivery & Activate Warranties'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
