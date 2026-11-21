import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import PortalLayout from '@/components/PortalLayout';
import { supportApi } from '@/services/api';
import { useAuth } from '@/context/auth';
import {
  ShieldCheck,
  ShieldAlert,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  Truck,
  PlusCircle,
  Loader2,
  ArrowLeft
} from 'lucide-react';

export default function WarrantyDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [warrantyData, setWarrantyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // File Claim Modal
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimType, setClaimType] = useState('repair');
  const [claimDesc, setClaimDesc] = useState('');
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [submittingClaim, setSubmittingClaim] = useState(false);

  useEffect(() => {
    fetchWarranty();
  }, [id]);

  const fetchWarranty = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await supportApi.getWarrantyById(id);
      setWarrantyData(res.data || res);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to load warranty record.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClaim = async (e) => {
    e.preventDefault();
    if (!claimDesc.trim()) return;

    try {
      setSubmittingClaim(true);
      await supportApi.createClaim({
        warranty_id: id,
        customer_id: w.customer_id,
        claim_type: claimType,
        description: claimDesc,
        evidence_notes: evidenceNotes
      });
      setShowClaimModal(false);
      setClaimDesc('');
      setEvidenceNotes('');
      await fetchWarranty();
      navigate('/support/claims');
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to file warranty claim.');
    } finally {
      setSubmittingClaim(false);
    }
  };

  const w = warrantyData?.warranty || {};
  const claims = warrantyData?.claims || [];
  const delivery = warrantyData?.delivery;
  const serial = w.equipment_serial_numbers;
  const product = serial?.products;

  return (
    <PortalLayout
      title={`Warranty Certificate: ${w.warranty_code || ''}`}
      subtitle="Complete warranty coverage details, delivery milestone verification, and claim records"
      actions={
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link to="/support/warranties" className="btn-secondary">
            <ArrowLeft size={16} />
            <span>All Warranties</span>
          </Link>
          {w.is_active && (
            <button className="btn-primary" onClick={() => setShowClaimModal(true)}>
              <FileCheck2 size={16} />
              <span>File Warranty Claim</span>
            </button>
          )}
        </div>
      }
    >
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
          <Loader2 className="animate-spin" size={36} color="var(--accent-text)" />
        </div>
      ) : error ? (
        <div className="support-card" style={{ borderColor: 'var(--c-red-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--c-red)' }}>
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '900px', margin: '0 auto' }}>
          {/* Main Certificate Card */}
          <div className="support-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--surface-2)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Warranty Certificate
                </span>
                <h2 style={{ fontSize: '1.5rem', color: 'var(--text-strong)', margin: '0.25rem 0 0 0' }}>
                  {w.warranty_code}
                </h2>
              </div>
              <div>
                <span className={`badge badge-warranty-${w.computed_status}`} style={{ fontSize: '0.875rem', padding: '0.35rem 0.85rem' }}>
                  Status: {w.computed_status}
                </span>
              </div>
            </div>

            {/* Core Details Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ background: 'var(--app-bg)', border: '1px solid var(--surface-2)', borderRadius: '8px', padding: '1rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Equipment Serial</span>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--c-blue)', marginTop: '0.25rem' }}>
                  {serial?.serial_number || '—'}
                </div>
              </div>

              <div style={{ background: 'var(--app-bg)', border: '1px solid var(--surface-2)', borderRadius: '8px', padding: '1rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Product & Model</span>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-strong)', marginTop: '0.25rem' }}>
                  {product?.name || 'Solar PV Component'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SKU: {product?.sku}</div>
              </div>

              <div style={{ background: 'var(--app-bg)', border: '1px solid var(--surface-2)', borderRadius: '8px', padding: '1rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Customer</span>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-strong)', marginTop: '0.25rem' }}>
                  {w.customers?.contact_name || 'Customer'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{w.customers?.phone || w.customers?.email}</div>
              </div>

              <div style={{ background: 'var(--app-bg)', border: '1px solid var(--surface-2)', borderRadius: '8px', padding: '1rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Duration & Type</span>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--accent-text)', marginTop: '0.25rem' }}>
                  {w.duration_years} Years
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                  {w.warranty_type?.replace('_', ' ')}
                </div>
              </div>
            </div>

            {/* Delivery Milestone Verification Box */}
            <div style={{ background: 'rgba(56, 189, 248, 0.06)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--c-blue)', fontWeight: 600, marginBottom: '0.5rem' }}>
                <Truck size={18} />
                <span>Delivery Milestone Verification (Section H Rule)</span>
              </div>
              <p style={{ margin: '0 0 0.75rem 0', color: 'var(--text-soft)', fontSize: '0.8125rem' }}>
                Verified against logistics records: The warranty clock started on <strong>{w.start_date}</strong> (equipment delivery date).
              </p>
              <div style={{ display: 'flex', gap: '2rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                <div>Warranty Start Date: <strong style={{ color: 'var(--text-strong)' }}>{w.start_date}</strong></div>
                <div>Warranty Expiration Date: <strong style={{ color: w.computed_status === 'expired' ? 'var(--c-red)' : 'var(--text-strong)' }}>{w.expiry_date}</strong></div>
                {delivery?.delivered_at && (
                  <div>Logistics Timestamp: <strong style={{ color: 'var(--text-strong)' }}>{new Date(delivery.delivered_at).toLocaleString()}</strong></div>
                )}
              </div>
            </div>

            {/* Warranty Terms */}
            <div>
              <h4 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0 0 0.5rem 0' }}>Warranty Terms & Conditions</h4>
              <div style={{ background: 'var(--app-bg)', border: '1px solid var(--surface-2)', borderRadius: '8px', padding: '1rem', color: 'var(--text-soft)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                {w.terms || 'Standard Solvix Manufacturer Warranty terms apply.'}
              </div>
            </div>
          </div>

          {/* Claims History Card */}
          <div className="support-card">
            <div className="support-card-header">
              <h3 className="support-card-title">
                <FileCheck2 size={18} color="var(--accent-text)" />
                Claims History for this Warranty
              </h3>
            </div>

            {claims.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem 0' }}>
                No warranty claims have been filed against this warranty certificate.
              </p>
            ) : (
              <div className="support-table-container">
                <table className="support-table">
                  <thead>
                    <tr>
                      <th>Claim Code</th>
                      <th>Type</th>
                      <th>Description</th>
                      <th>Status</th>
                      <th>Submitted Date</th>
                      <th>Resolution</th>
                    </tr>
                  </thead>
                  <tbody>
                    {claims.map((c) => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 600, color: 'var(--accent-text)' }}>{c.claim_code}</td>
                        <td style={{ textTransform: 'capitalize' }}>{c.claim_type}</td>
                        <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.description}
                        </td>
                        <td>
                          <span className={`badge badge-${c.status}`}>
                            {c.status}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                          {new Date(c.submitted_at).toLocaleDateString()}
                        </td>
                        <td style={{ fontSize: '0.8125rem', color: 'var(--text-soft)' }}>
                          {c.resolution || 'Pending review'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* File Claim Modal */}
      {showClaimModal && (
        <div className="modal-overlay" onClick={() => setShowClaimModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">File Warranty Claim</h3>
              <button className="modal-close" onClick={() => setShowClaimModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateClaim} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="support-form-group">
                <label className="support-form-label">Claim Type</label>
                <select
                  className="support-form-select"
                  value={claimType}
                  onChange={(e) => setClaimType(e.target.value)}
                >
                  <option value="repair">Component Repair</option>
                  <option value="replacement">Full Equipment Replacement</option>
                </select>
              </div>

              <div className="support-form-group">
                <label className="support-form-label">Issue Details & Failure Symptoms *</label>
                <textarea
                  className="support-form-textarea"
                  rows={3}
                  placeholder="Describe the failure, error codes, and technical symptoms observed..."
                  value={claimDesc}
                  onChange={(e) => setClaimDesc(e.target.value)}
                  required
                />
              </div>

              <div className="support-form-group">
                <label className="support-form-label">Evidence & Diagnostic Notes</label>
                <textarea
                  className="support-form-textarea"
                  rows={2}
                  placeholder="Record voltage measurements, thermal hotspots, photos taken, or serial sticker verification..."
                  value={evidenceNotes}
                  onChange={(e) => setEvidenceNotes(e.target.value)}
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowClaimModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submittingClaim}>
                  {submittingClaim ? <Loader2 size={16} className="animate-spin" /> : <FileCheck2 size={16} />}
                  <span>Submit Claim</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
