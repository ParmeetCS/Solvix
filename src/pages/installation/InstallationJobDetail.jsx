import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import PortalLayout from '@/components/PortalLayout';
import { installationApi } from '@/services/api';
import {
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Camera,
  FileText,
  PenTool,
  Upload,
  Calendar,
  Users,
  MapPin,
  Phone,
  Mail,
  Zap,
  ArrowLeft,
  RefreshCw,
  Barcode,
  Check,
  X
} from 'lucide-react';

export default function InstallationJobDetail() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'equipment' | 'checklist' | 'photos' | 'commissioning' | 'report'

  // Equipment verification state
  const [serialInputs, setSerialInputs] = useState({});
  const [missingNotes, setMissingNotes] = useState('');
  const [damagedNotes, setDamagedNotes] = useState('');
  const [allowException, setAllowException] = useState(false);
  const [exceptionNotes, setExceptionNotes] = useState('');
  const [verifying, setVerifying] = useState(false);

  // Photo upload state
  const [photoType, setPhotoType] = useState('progress');
  const [photoCaption, setPhotoCaption] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Commissioning state
  const [commData, setCommData] = useState({
    inverter_model: '',
    inverter_serial: '',
    inverter_firmware: 'v1.0.4',
    voc_string_1_v: '',
    voc_string_2_v: '',
    isc_string_1_a: '',
    isc_string_2_a: '',
    grid_voltage_v: '230.0',
    grid_frequency_hz: '50.0',
    earthing_resistance_ohm: '',
    insulation_test_result: 'PASS',
    test_observations: '',
    technician_remarks: ''
  });
  const [savingComm, setSavingComm] = useState(false);

  // Customer signature canvas state
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureCustomerName, setSignatureCustomerName] = useState('');
  const [signatureConsent, setSignatureConsent] = useState(true);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [savingSig, setSavingSig] = useState(false);

  // Completion report generation
  const [generatingReport, setGeneratingReport] = useState(false);

  const loadJob = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await installationApi.getJobById(id);
      const jobData = res.data?.job;
      setJob(jobData);

      // Pre-fill commissioning state if existing
      if (jobData?.commissioning_data) {
        setCommData(prev => ({
          ...prev,
          ...jobData.commissioning_data
        }));
      } else {
        // Pre-fill inverter model from equipment items if available
        const invItem = (jobData?.equipment_items || []).find(e => e.sku?.includes('INV'));
        if (invItem) {
          setCommData(prev => ({
            ...prev,
            inverter_model: invItem.product_name,
            inverter_serial: invItem.verified_serials?.[0] || invItem.expected_serials?.[0] || ''
          }));
        }
      }

      setSignatureCustomerName(jobData?.customer_name || '');
    } catch (err) {
      setError(err?.message || 'Failed to load installation job.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadJob();
  }, [loadJob]);

  // Handle Canvas Drawing for Customer Signature
  useEffect(() => {
    if (activeTab === 'report' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = 'var(--c-emerald)';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
    }
  }, [activeTab]);

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  // 1. Equipment Verification Action
  const handleVerifyAllSerials = async () => {
    try {
      setVerifying(true);
      setError(null);
      setNotice(null);

      // Collect all expected serials
      const allExpected = [];
      (job?.equipment_items || []).forEach(eq => {
        (eq.expected_serials || []).forEach(s => allExpected.push(s));
      });

      const res = await installationApi.verifyEquipment(job.id, {
        verified_serials: allExpected,
        missing_items: missingNotes ? [missingNotes] : [],
        damaged_items: damagedNotes ? [damagedNotes] : [],
        exception_recorded: allowException,
        exception_notes: exceptionNotes || null
      });

      setNotice({ type: 'success', message: res.message || 'Equipment serial numbers verified successfully.' });
      loadJob();
    } catch (err) {
      setError(err?.message || 'Failed to verify equipment.');
    } finally {
      setVerifying(false);
    }
  };

  // 2. Checklist Task Toggle
  const handleTaskToggle = async (task, isCompleted) => {
    try {
      const remarks = isCompleted ? (prompt('Enter task completion remarks (optional):') || 'Verified according to installation standards') : null;
      await installationApi.updateTask(job.id, {
        task_id: task.id,
        is_completed: isCompleted,
        remarks: remarks || undefined
      });
      loadJob();
    } catch (err) {
      alert('Failed to update task: ' + err.message);
    }
  };

  // 3. Photo Upload Action
  const handlePhotoUpload = async (e) => {
    e.preventDefault();
    if (!photoUrl) {
      alert('Please enter an image URL or choose a file.');
      return;
    }

    try {
      setUploadingPhoto(true);
      setError(null);
      await installationApi.uploadPhoto(job.id, {
        photo_type: photoType,
        storage_path: photoUrl,
        caption: photoCaption
      });
      setPhotoUrl('');
      setPhotoCaption('');
      setNotice({ type: 'success', message: 'Photograph added to project gallery.' });
      loadJob();
    } catch (err) {
      setError(err?.message || 'Failed to upload photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // 4. Commissioning Form Submit
  const handleCommissioningSubmit = async (e) => {
    e.preventDefault();
    try {
      setSavingComm(true);
      setError(null);
      setNotice(null);
      const res = await installationApi.submitCommissioning(job.id, commData);
      setNotice({ type: 'success', message: res.message || 'Testing & commissioning measurements saved.' });
      loadJob();
    } catch (err) {
      setError(err?.message || 'Failed to save commissioning data.');
    } finally {
      setSavingComm(false);
    }
  };

  // 5. Customer Signature Submit
  const handleSaveSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) {
      alert('Please have the customer sign on the canvas before saving.');
      return;
    }

    try {
      setSavingSig(true);
      setError(null);
      const signatureDataUrl = canvas.toDataURL('image/png');
      const res = await installationApi.submitSignature(job.id, {
        customer_name: signatureCustomerName || job.customer_name,
        signature_data: signatureDataUrl,
        consent_text: 'I acknowledge that the solar installation has been completed, tested, and demonstrated satisfactorily.'
      });
      setNotice({ type: 'success', message: 'Customer acknowledgement signature recorded.' });
      loadJob();
    } catch (err) {
      setError(err?.message || 'Failed to record signature.');
    } finally {
      setSavingSig(false);
    }
  };

  // 6. Complete and Generate Report
  const handleGenerateCompletionReport = async () => {
    if (!window.confirm('Are you sure you want to finalize this project and generate the official Completion Report?')) {
      return;
    }

    try {
      setGeneratingReport(true);
      setError(null);
      setNotice(null);
      const res = await installationApi.generateReport(job.id);
      setNotice({ type: 'success', message: res.message || 'Installation completion report generated!' });
      loadJob();
    } catch (err) {
      setError(err?.message || 'Failed to generate completion report.');
    } finally {
      setGeneratingReport(false);
    }
  };

  if (loading) {
    return (
      <PortalLayout title="Installation Details">
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          Loading project details...
        </div>
      </PortalLayout>
    );
  }

  if (error && !job) {
    return (
      <PortalLayout title="Installation Details">
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: 16, borderRadius: 8, color: 'var(--c-red)' }}>
          {error}
        </div>
        <div style={{ marginTop: 16 }}>
          <Link to="/installation/jobs" className="inst-btn inst-btn-secondary">
            <ArrowLeft size={14} /> Back to Projects
          </Link>
        </div>
      </PortalLayout>
    );
  }

  const tasks = job?.tasks || [];
  const completedTasksCount = tasks.filter(t => t.is_completed).length;
  const totalTasksCount = tasks.length;
  const progressPercent = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  return (
    <PortalLayout
      title={`${job.installation_code} — ${job.customer_name}`}
      subtitle={`Order: ${job.order_code} • ${job.system_capacity_kw} kW ${job.system_type.toUpperCase()} • Status: ${job.status.toUpperCase()}`}
      actions={
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link to="/installation/jobs" className="inst-btn inst-btn-secondary inst-btn-sm">
            <ArrowLeft size={14} /> All Projects
          </Link>
          <button onClick={loadJob} className="inst-btn inst-btn-secondary inst-btn-sm">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      }
    >
      {/* Top Banner Notice */}
      {notice && (
        <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '12px 16px', borderRadius: 8, color: 'var(--c-green)', marginBottom: 20 }}>
          {notice.message}
        </div>
      )}

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '12px 16px', borderRadius: 8, color: 'var(--c-red)', marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* Quick Summary Pill Bar */}
      <div style={{ background: 'var(--surface-solid)', border: '1px solid rgba(var(--ink-rgb), 0.08)', borderRadius: 12, padding: '16px 20px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Current Stage</div>
            <span className={`inst-badge inst-badge-${job.status}`}>{String(job.status || '').replace('_', ' ')}</span>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Checklist Progress</div>
            <strong style={{ color: progressPercent === 100 ? 'var(--c-emerald)' : 'var(--c-amber)', fontSize: '1rem' }}>
              {completedTasksCount} / {totalTasksCount} ({progressPercent}%)
            </strong>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Equipment Verification</div>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: job.equipment_verified ? 'var(--c-emerald)' : job.exception_recorded ? 'var(--c-amber)' : 'var(--c-amber)' }}>
              {job.equipment_verified ? '✓ Verified' : job.exception_recorded ? '⚠ Exception Approved' : 'Pending Verification'}
            </span>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Customer Signoff</div>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: job.customer_signature ? 'var(--c-emerald)' : 'var(--text-dim)' }}>
              {job.customer_signature ? '✓ Signed & Verified' : 'Awaiting Completion'}
            </span>
          </div>
        </div>

        {job.status === 'completed' && (
          <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 8, padding: '6px 14px', color: 'var(--c-green)', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={16} /> Commissioned & Closed
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="inst-tabs-nav">
        <button
          onClick={() => setActiveTab('overview')}
          className={`inst-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
        >
          <FileText size={16} /> 1. Overview & BOM
        </button>
        <button
          onClick={() => setActiveTab('equipment')}
          className={`inst-tab-btn ${activeTab === 'equipment' ? 'active' : ''}`}
        >
          <Barcode size={16} /> 2. Equipment & Serials ({job.equipment_verified ? '✓' : '!'})
        </button>
        <button
          onClick={() => setActiveTab('checklist')}
          className={`inst-tab-btn ${activeTab === 'checklist' ? 'active' : ''}`}
        >
          <CheckCircle2 size={16} /> 3. Digital Checklist ({completedTasksCount}/{totalTasksCount})
        </button>
        <button
          onClick={() => setActiveTab('photos')}
          className={`inst-tab-btn ${activeTab === 'photos' ? 'active' : ''}`}
        >
          <Camera size={16} /> 4. Photo Evidence ({(job.photos || []).length})
        </button>
        <button
          onClick={() => setActiveTab('commissioning')}
          className={`inst-tab-btn ${activeTab === 'commissioning' ? 'active' : ''}`}
        >
          <Zap size={16} /> 5. Testing & Commissioning
        </button>
        <button
          onClick={() => setActiveTab('report')}
          className={`inst-tab-btn ${activeTab === 'report' ? 'active' : ''}`}
        >
          <PenTool size={16} /> 6. Customer Signature & Report
        </button>
      </div>

      {/* TAB 1: OVERVIEW & BOM */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
          {/* Customer & Site Details */}
          <div className="inst-card">
            <div className="inst-card-header">
              <span className="inst-card-title"><Users size={16} color="var(--c-amber)" /> Customer & Site Information</span>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.85rem' }}>
              <div><strong>Client Name:</strong> <span style={{ color: 'var(--text-strong)' }}>{job.customer_name}</span></div>
              <div><strong>Site Address:</strong> <span style={{ color: 'var(--text-muted)' }}>{job.site_address}</span></div>
              <div><strong>Contact Phone:</strong> <span style={{ color: 'var(--c-blue)' }}>{job.contact_phone}</span></div>
              <div><strong>Contact Email:</strong> <span style={{ color: 'var(--c-blue)' }}>{job.contact_email}</span></div>
              <div><strong>Order Reference:</strong> <span style={{ color: 'var(--c-amber)' }}>{job.order_code}</span></div>
              <div><strong>System Capacity:</strong> <strong style={{ color: 'var(--c-green)' }}>{job.system_capacity_kw} kW {job.system_type}</strong></div>
            </div>
          </div>

          {/* Survey & Delivery Notes */}
          <div className="inst-card">
            <div className="inst-card-header">
              <span className="inst-card-title"><ShieldCheck size={16} color="var(--c-blue)" /> Survey & Delivery Milestones</span>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.85rem' }}>
              {job.survey_info ? (
                <>
                  <div><strong>Roof Type:</strong> {job.survey_info.roof_type?.replace('_', ' ')}</div>
                  <div><strong>Total Roof Area:</strong> {job.survey_info.roof_area_sqm} sq.m</div>
                  <div><strong>Sanctioned Load:</strong> {job.survey_info.sanctioned_load_kw} kW</div>
                </>
              ) : (
                <div style={{ color: 'var(--text-dim)' }}>Site survey details integrated from Order {job.order_code}</div>
              )}

              {job.delivery_info && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(var(--ink-rgb), 0.06)' }}>
                  <div><strong>Dispatch Code:</strong> <span style={{ color: 'var(--c-green)' }}>{job.delivery_info.dispatch_code}</span></div>
                  <div><strong>Delivery Date:</strong> {job.delivery_info.delivery_date}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 4 }}>
                    <em>"{job.delivery_info.delivery_notes}"</em>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Assigned Technicians Team */}
          <div className="inst-card" style={{ gridColumn: '1 / -1' }}>
            <div className="inst-card-header">
              <span className="inst-card-title"><Wrench size={16} color="var(--c-amber)" /> Assigned Technical Team</span>
              <Link to="/installation/assignments" className="inst-btn inst-btn-secondary inst-btn-sm">
                Change Assignment
              </Link>
            </div>
            <div style={{ padding: '20px' }}>
              {(job.assigned_technicians || []).length === 0 ? (
                <div style={{ color: 'var(--c-amber)', fontSize: '0.85rem' }}>
                  No technicians currently assigned. Please visit Team Assignments to assign lead installer.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                  {job.assigned_technicians.map((t, idx) => (
                    <div key={idx} style={{ background: 'rgba(var(--surface-rgb), 0.6)', border: '1px solid rgba(var(--ink-rgb), 0.08)', borderRadius: 8, padding: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-strong)' }}>{t.full_name}</div>
                        {t.is_primary && (
                          <span className="inst-badge inst-badge-completed">Lead Technician</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
                        Role: {String(t.role_on_job || '').replace('_', ' ')} • Code: {t.employee_code}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--c-blue)', marginTop: 2 }}>
                        📞 {t.phone}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EQUIPMENT & SERIAL VERIFICATION */}
      {activeTab === 'equipment' && (
        <div className="inst-card">
          <div className="inst-card-header">
            <span className="inst-card-title">
              <Barcode size={18} color="var(--c-amber)" /> Equipment Serial Number Verification on Site
            </span>
            <button
              onClick={handleVerifyAllSerials}
              disabled={verifying}
              className="inst-btn inst-btn-primary inst-btn-sm"
            >
              <Check size={14} /> {verifying ? 'Verifying...' : 'Mark All Delivered Serials Verified'}
            </button>
          </div>

          <div style={{ padding: '20px' }}>
            <div style={{ background: 'rgba(var(--surface-rgb), 0.6)', border: '1px solid rgba(var(--ink-rgb), 0.08)', borderRadius: 8, padding: '14px 18px', marginBottom: 20, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              <strong>Warehouse Delivery Milestone:</strong>
              {' '}Physical serial numbers delivered from Warehouse must be scanned or verified before commencement of mounting work. In accordance with system policy, manufacturer warranty starts from actual equipment delivery date, NOT completion date.
            </div>

            {/* Equipment Items List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {(job.equipment_items || []).map((eq, i) => (
                <div key={eq.id || i} style={{ background: 'rgba(var(--surface-rgb), 0.8)', border: '1px solid rgba(var(--ink-rgb), 0.08)', borderRadius: 10, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-strong)', fontSize: '0.95rem' }}>{eq.product_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>SKU: {eq.sku} • Qty: {eq.quantity} units</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--c-green)', marginTop: 2 }}>
                        🛡️ Warranty Start Date: <strong>{eq.warranty_start_date || 'From Delivery'}</strong> ({eq.warranty_duration_years} Years)
                      </div>
                    </div>
                    <div>
                      {eq.status === 'verified' || (eq.verified_serials && eq.verified_serials.length > 0) ? (
                        <span className="inst-badge inst-badge-completed">✓ Serial Verified</span>
                      ) : (
                        <span className="inst-badge inst-badge-pending">Pending Verification</span>
                      )}
                    </div>
                  </div>

                  <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(var(--ink-rgb), 0.06)', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Expected Serial Numbers:</span>
                    {(eq.expected_serials || []).map((sn, sIdx) => {
                      const isVer = (eq.verified_serials || []).includes(sn);
                      return (
                        <span key={sIdx} style={{
                          background: isVer ? 'rgba(16, 185, 129, 0.15)' : 'rgba(var(--ink-rgb), 0.05)',
                          color: isVer ? 'var(--c-green)' : 'var(--text-soft)',
                          border: `1px solid ${isVer ? 'rgba(16, 185, 129, 0.3)' : 'rgba(var(--ink-rgb), 0.1)'}`,
                          padding: '3px 8px',
                          borderRadius: 4,
                          fontSize: '0.75rem',
                          fontFamily: 'monospace'
                        }}>
                          {sn} {isVer && '✓'}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Exceptions & Damage Recording */}
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(var(--ink-rgb), 0.08)' }}>
              <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-strong)', fontSize: '0.92rem' }}>Defect or Exception Management</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>Missing Items (if any)</label>
                  <input
                    type="text"
                    className="inst-input"
                    style={{ width: '100%' }}
                    placeholder="e.g. 2 end clamps missing"
                    value={missingNotes}
                    onChange={(e) => setMissingNotes(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>Damaged Packaging / Parts</label>
                  <input
                    type="text"
                    className="inst-input"
                    style={{ width: '100%' }}
                    placeholder="e.g. Inverter carton dented, unit intact"
                    value={damagedNotes}
                    onChange={(e) => setDamagedNotes(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ marginTop: 14 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: 'var(--c-amber)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={allowException}
                    onChange={(e) => setAllowException(e.target.checked)}
                  />
                  <span>Record Authorized Exception (Permits completion if non-critical serial verification is pending)</span>
                </label>
                {allowException && (
                  <input
                    type="text"
                    className="inst-input"
                    style={{ width: '100%', marginTop: 8 }}
                    placeholder="Enter manager authorization reason for exception..."
                    value={exceptionNotes}
                    onChange={(e) => setExceptionNotes(e.target.value)}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DIGITAL CHECKLIST */}
      {activeTab === 'checklist' && (
        <div className="inst-card">
          <div className="inst-card-header">
            <span className="inst-card-title">
              <CheckCircle2 size={18} color="var(--c-emerald)" /> 11 Technical Installation Milestones
            </span>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Progress: <strong style={{ color: 'var(--c-green)' }}>{completedTasksCount}/{totalTasksCount} Completed</strong>
            </span>
          </div>

          <div style={{ padding: '20px' }}>
            {/* Safety banner */}
            <div className="inst-safety-banner">
              <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong>Mandatory Installation Safety Standard:</strong>
                {' '}Checklist completion requires on-site inspection by qualified electrical personnel. Verify torque settings, ground continuity, and polarity before energizing inverter DC inputs.
              </div>
            </div>

            <div className="inst-checklist">
              {tasks.map((task, idx) => (
                <div
                  key={task.id || idx}
                  className={`inst-check-item ${task.is_completed ? 'completed' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={task.is_completed}
                    onChange={(e) => handleTaskToggle(task, e.target.checked)}
                    className="inst-check-checkbox"
                  />

                  <div className="inst-check-details">
                    <div className="inst-check-title">
                      {idx + 1}. {task.task_name}
                      {task.is_required && (
                        <span style={{ color: 'var(--c-red-2)', marginLeft: 4 }}>*</span>
                      )}
                    </div>
                    <div className="inst-check-desc">{task.notes}</div>

                    {task.remarks && (
                      <div className="inst-check-remarks">
                        Remarks: {task.remarks}
                      </div>
                    )}

                    {task.completed_at && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 4 }}>
                        Completed by: {task.completed_by || 'Technician'} at {new Date(task.completed_at).toLocaleString()}
                      </div>
                    )}
                  </div>

                  <div>
                    <button
                      onClick={() => handleTaskToggle(task, !task.is_completed)}
                      className={`inst-btn inst-btn-sm ${task.is_completed ? 'inst-btn-secondary' : 'inst-btn-primary'}`}
                    >
                      {task.is_completed ? 'Mark Incomplete' : 'Complete Task'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PHOTO EVIDENCE GALLERY */}
      {activeTab === 'photos' && (
        <div className="inst-card">
          <div className="inst-card-header">
            <span className="inst-card-title">
              <Camera size={18} color="var(--c-amber)" /> Photographic Evidence & Quality Records
            </span>
          </div>

          <div style={{ padding: '20px' }}>
            {/* Upload Form */}
            <form onSubmit={handlePhotoUpload} style={{ background: 'rgba(var(--surface-rgb), 0.6)', border: '1px solid rgba(var(--ink-rgb), 0.08)', borderRadius: 10, padding: 18, marginBottom: 24 }}>
              <div style={{ fontWeight: 600, color: 'var(--text-strong)', fontSize: '0.9rem', marginBottom: 12 }}>
                Upload Photographic Evidence
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>Photo Category</label>
                  <select
                    className="inst-select"
                    style={{ width: '100%' }}
                    value={photoType}
                    onChange={(e) => setPhotoType(e.target.value)}
                  >
                    <option value="pre_install">Before-Installation (Pre-Install)</option>
                    <option value="progress">Installation-Progress</option>
                    <option value="panel">Solar Panels Array</option>
                    <option value="inverter">Inverter & Battery Setup</option>
                    <option value="earthing">Earthing & Lightning Arrestor</option>
                    <option value="wiring">AC/DC Wiring & Protection DB</option>
                    <option value="completion">Final Completed Installation</option>
                  </select>
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>Image URL or Storage Path</label>
                  <input
                    type="text"
                    className="inst-input"
                    style={{ width: '100%' }}
                    placeholder="https://... or /uploads/installations/photo.jpg"
                    required
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>Caption & Observations</label>
                  <input
                    type="text"
                    className="inst-input"
                    style={{ width: '100%' }}
                    placeholder="e.g. South facing 18 panel array mounted with 1.5m elevated HDGI structure"
                    value={photoCaption}
                    onChange={(e) => setPhotoCaption(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={uploadingPhoto}
                className="inst-btn inst-btn-primary inst-btn-sm"
              >
                <Upload size={14} /> {uploadingPhoto ? 'Uploading...' : 'Upload & Associate with Project'}
              </button>
            </form>

            {/* Gallery Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
              {(job.photos || []).length === 0 ? (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '30px', color: 'var(--text-dim)' }}>
                  No photos uploaded for this project yet.
                </div>
              ) : (
                job.photos.map(p => (
                  <div key={p.id} style={{ background: 'var(--app-bg)', border: '1px solid rgba(var(--ink-rgb), 0.08)', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ height: 160, background: 'var(--surface-solid)', overflow: 'hidden' }}>
                      <img
                        src={p.storage_path}
                        alt={p.caption || 'Installation photo'}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600'; }}
                      />
                    </div>
                    <div style={{ padding: '12px' }}>
                      <span className="inst-badge inst-badge-scheduled" style={{ marginBottom: 6 }}>
                        {p.photo_type.replace('_', ' ')}
                      </span>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-strong)', fontWeight: 500, margin: '4px 0' }}>
                        {p.caption || 'Evidence Photo'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                        Uploaded: {new Date(p.uploaded_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: TESTING & COMMISSIONING */}
      {activeTab === 'commissioning' && (
        <div className="inst-card">
          <div className="inst-card-header">
            <span className="inst-card-title">
              <Zap size={18} color="var(--c-amber)" /> Structured Testing & Commissioning Protocol
            </span>
          </div>

          <form onSubmit={handleCommissioningSubmit} style={{ padding: '24px' }}>
            <div className="inst-safety-banner">
              <ShieldAlert size={20} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong>Electrical Safety Disclaimer:</strong>
                {' '}Do not invent or estimate test values. All electrical values must be measured on site using calibrated multi-meters, clamp meters, and 4-terminal earth testers. System commissioning must strictly observe IS 3043 earthing regulations.
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-soft)', marginBottom: 4, fontWeight: 500 }}>
                  Inverter Model *
                </label>
                <input
                  type="text"
                  className="inst-input"
                  style={{ width: '100%' }}
                  required
                  value={commData.inverter_model}
                  onChange={(e) => setCommData({ ...commData, inverter_model: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-soft)', marginBottom: 4, fontWeight: 500 }}>
                  Inverter Serial Number *
                </label>
                <input
                  type="text"
                  className="inst-input"
                  style={{ width: '100%' }}
                  required
                  value={commData.inverter_serial}
                  onChange={(e) => setCommData({ ...commData, inverter_serial: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-soft)', marginBottom: 4, fontWeight: 500 }}>
                  Inverter Firmware Version
                </label>
                <input
                  type="text"
                  className="inst-input"
                  style={{ width: '100%' }}
                  value={commData.inverter_firmware}
                  onChange={(e) => setCommData({ ...commData, inverter_firmware: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--c-amber)', marginBottom: 4, fontWeight: 600 }}>
                  Earthing Resistance (Ohms) * [&lt; 2.0 Ohm]
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="inst-input"
                  style={{ width: '100%', borderColor: 'var(--c-amber)' }}
                  required
                  placeholder="e.g. 1.65"
                  value={commData.earthing_resistance_ohm}
                  onChange={(e) => setCommData({ ...commData, earthing_resistance_ohm: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-soft)', marginBottom: 4, fontWeight: 500 }}>
                  DC String 1 Voc (Volts)
                </label>
                <input
                  type="number"
                  step="0.1"
                  className="inst-input"
                  style={{ width: '100%' }}
                  placeholder="e.g. 382.4"
                  value={commData.voc_string_1_v}
                  onChange={(e) => setCommData({ ...commData, voc_string_1_v: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-soft)', marginBottom: 4, fontWeight: 500 }}>
                  DC String 1 Isc (Amps)
                </label>
                <input
                  type="number"
                  step="0.1"
                  className="inst-input"
                  style={{ width: '100%' }}
                  placeholder="e.g. 11.2"
                  value={commData.isc_string_1_a}
                  onChange={(e) => setCommData({ ...commData, isc_string_1_a: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-soft)', marginBottom: 4, fontWeight: 500 }}>
                  AC Grid Voltage (Volts)
                </label>
                <input
                  type="text"
                  className="inst-input"
                  style={{ width: '100%' }}
                  value={commData.grid_voltage_v}
                  onChange={(e) => setCommData({ ...commData, grid_voltage_v: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-soft)', marginBottom: 4, fontWeight: 500 }}>
                  Insulation Resistance Test Result *
                </label>
                <input
                  type="text"
                  className="inst-input"
                  style={{ width: '100%' }}
                  required
                  placeholder="e.g. PASS - 180 MOhm at 1000V DC"
                  value={commData.insulation_test_result}
                  onChange={(e) => setCommData({ ...commData, insulation_test_result: e.target.value })}
                />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-soft)', marginBottom: 4, fontWeight: 500 }}>
                Test Observations & Anti-Islanding Verification
              </label>
              <textarea
                className="inst-input"
                rows="2"
                style={{ width: '100%' }}
                placeholder="Anti-islanding tripped in 15ms. Inverter synchronized with discom grid without harmonic distortion."
                value={commData.test_observations}
                onChange={(e) => setCommData({ ...commData, test_observations: e.target.value })}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-soft)', marginBottom: 4, fontWeight: 500 }}>
                Certifying Technician Remarks
              </label>
              <textarea
                className="inst-input"
                rows="2"
                style={{ width: '100%' }}
                placeholder="System inspected and cleared for customer demonstration."
                value={commData.technician_remarks}
                onChange={(e) => setCommData({ ...commData, technician_remarks: e.target.value })}
              />
            </div>

            <button
              type="submit"
              disabled={savingComm}
              className="inst-btn inst-btn-primary"
            >
              {savingComm ? 'Validating Measurements...' : 'Save & Verify Commissioning Protocol'}
            </button>
          </form>
        </div>
      )}

      {/* TAB 6: CUSTOMER SIGNATURE & COMPLETION REPORT */}
      {activeTab === 'report' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
          {/* Customer Signature Pad */}
          <div className="inst-card">
            <div className="inst-card-header">
              <span className="inst-card-title">
                <PenTool size={18} color="var(--c-emerald)" /> Customer Digital Handover Signoff
              </span>
            </div>

            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-soft)', marginBottom: 4 }}>
                  Signing Customer Name
                </label>
                <input
                  type="text"
                  className="inst-input"
                  style={{ width: '100%' }}
                  value={signatureCustomerName}
                  onChange={(e) => setSignatureCustomerName(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                  Draw Signature (Touch / Mouse):
                </label>
                <div className="inst-sig-container">
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={160}
                    className="inst-sig-canvas"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="inst-btn inst-btn-secondary inst-btn-sm"
                  >
                    Clear Signature
                  </button>
                </div>
              </div>

              <div style={{ background: 'rgba(var(--surface-rgb), 0.6)', border: '1px solid rgba(var(--ink-rgb), 0.06)', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: '0.78rem', color: 'var(--text-soft)' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={signatureConsent}
                    onChange={(e) => setSignatureConsent(e.target.checked)}
                    style={{ marginTop: 2 }}
                  />
                  <span>
                    "I confirm that the solar PV system has been installed, commissioned, demonstrated, and handed over in satisfactory working condition."
                  </span>
                </label>
              </div>

              <button
                type="button"
                onClick={handleSaveSignature}
                disabled={savingSig || !signatureConsent}
                className="inst-btn inst-btn-success"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {savingSig ? 'Recording Signature...' : 'Save Customer Signature Evidence'}
              </button>
            </div>
          </div>

          {/* Completion Verification & Final Report Generation */}
          <div className="inst-card">
            <div className="inst-card-header">
              <span className="inst-card-title">
                <ShieldCheck size={18} color="var(--c-amber)" /> Completion Prerequisites & Final Seal
              </span>
            </div>

            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 10, borderRadius: 8, background: 'rgba(var(--surface-rgb), 0.6)' }}>
                  <span>1. Equipment Serials Verified</span>
                  <span style={{ color: (job.equipment_verified || job.exception_recorded) ? 'var(--c-emerald)' : 'var(--c-amber)', fontWeight: 600 }}>
                    {(job.equipment_verified || job.exception_recorded) ? '✓ Ready' : 'Pending'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 10, borderRadius: 8, background: 'rgba(var(--surface-rgb), 0.6)' }}>
                  <span>2. All Required Checklist Tasks</span>
                  <span style={{ color: progressPercent === 100 ? 'var(--c-emerald)' : 'var(--c-amber)', fontWeight: 600 }}>
                    {progressPercent === 100 ? '✓ All Done' : `${completedTasksCount}/${totalTasksCount}`}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 10, borderRadius: 8, background: 'rgba(var(--surface-rgb), 0.6)' }}>
                  <span>3. Commissioning Readings</span>
                  <span style={{ color: job.commissioning_data ? 'var(--c-emerald)' : 'var(--c-amber)', fontWeight: 600 }}>
                    {job.commissioning_data ? '✓ Recorded' : 'Pending'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 10, borderRadius: 8, background: 'rgba(var(--surface-rgb), 0.6)' }}>
                  <span>4. Customer Handover Signature</span>
                  <span style={{ color: job.customer_signature ? 'var(--c-emerald)' : 'var(--c-amber)', fontWeight: 600 }}>
                    {job.customer_signature ? '✓ Verified' : 'Pending Signature'}
                  </span>
                </div>
              </div>

              {job.completion_report ? (
                <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                  <div style={{ fontWeight: 600, color: 'var(--c-green)', marginBottom: 8 }}>Official Completion Report Compiled</div>
                  <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-soft)', margin: 0 }}>
                    {job.completion_report}
                  </pre>
                </div>
              ) : (
                <div style={{ marginBottom: 16, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Once all 4 verification milestones are satisfied, clicking below compiles the formal engineering completion report, seals the project, transitions status to <strong>COMPLETED</strong>, and enables post-installation warranty and service workflows.
                </div>
              )}

              <button
                type="button"
                onClick={handleGenerateCompletionReport}
                disabled={generatingReport}
                className="inst-btn inst-btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {generatingReport ? 'Compiling Official Report...' : job.status === 'completed' ? 'Re-generate Completion Report' : 'Seal & Mark Project Completed'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
