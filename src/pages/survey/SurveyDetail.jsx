import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import PortalLayout from '@/components/PortalLayout';
import FeasibilityReportModal from './FeasibilityReportModal';
import { surveyApi } from '@/services/api';
import {
  FileText,
  UserCheck,
  Calendar,
  Camera,
  Layers,
  Zap,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Upload,
  ArrowLeft,
  Clock,
  Printer,
  FileEdit,
  ShieldCheck,
  MapPin,
  Phone,
  Mail,
  Home
} from 'lucide-react';

export default function SurveyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'technical' | 'photos' | 'approvals' | 'history'

  // Feasibility Report Modal
  const [reportData, setReportData] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);

  // Modals
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [surveyors, setSurveyors] = useState([]);

  // Assignment state
  const [selectedSurveyor, setSelectedSurveyor] = useState('');
  const [assignDate, setAssignDate] = useState('');
  const [assignTime, setAssignTime] = useState('10:00 AM - 12:00 PM');
  const [assignNotes, setAssignNotes] = useState('');

  // Schedule state
  const [newScheduleDate, setNewScheduleDate] = useState('');
  const [newScheduleTime, setNewScheduleTime] = useState('10:00 AM - 12:00 PM');
  const [newSiteAddress, setNewSiteAddress] = useState('');

  // Photo upload state
  const [photoType, setPhotoType] = useState('roof');
  const [photoCaption, setPhotoCaption] = useState('');
  const [photoDesc, setPhotoDesc] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  // History state
  const [history, setHistory] = useState([]);

  // Action loading state
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadSurveyDetails();
    loadSurveyors();
  }, [id]);

  const loadSurveyDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await surveyApi.getRequestById(id);
      setData(res.data);
      if (res.data?.survey) {
        setNewSiteAddress(res.data.survey.site_address || '');
      }
    } catch (err) {
      setError(err?.message || 'Failed to load survey details.');
    } finally {
      setLoading(false);
    }
  };

  const loadSurveyors = async () => {
    try {
      const res = await surveyApi.getSurveyors();
      setSurveyors(res.data?.surveyors || []);
    } catch (e) {
      // Non-blocking
    }
  };

  const loadReport = async () => {
    try {
      const res = await surveyApi.getFeasibilityReport(id);
      setReportData(res.data);
      setShowReportModal(true);
    } catch (err) {
      alert(err?.message || 'Failed to generate feasibility report.');
    }
  };

  const loadHistory = async () => {
    try {
      const res = await surveyApi.getHistory(id);
      setHistory(res.data?.history || []);
    } catch (e) {
      // Non-blocking
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'history' && history.length === 0) {
      loadHistory();
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSurveyor) return;

    try {
      setActionLoading(true);
      await surveyApi.assignSurvey(id, {
        assigned_to: selectedSurveyor,
        scheduled_date: assignDate || undefined,
        scheduled_time: assignTime || undefined,
        notes: assignNotes
      });
      setShowAssignModal(false);
      loadSurveyDetails();
    } catch (err) {
      alert(err?.message || 'Failed to assign surveyor.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!newScheduleDate) return;

    try {
      setActionLoading(true);
      await surveyApi.scheduleSurvey(id, {
        scheduled_date: newScheduleDate,
        scheduled_time: newScheduleTime,
        site_address: newSiteAddress
      });
      setShowScheduleModal(false);
      loadSurveyDetails();
    } catch (err) {
      alert(err?.message || 'Failed to schedule survey.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    e.preventDefault();
    setUploadError(null);

    // Validate dummy upload or file
    const sampleUrls = {
      roof: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80',
      electrical: 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=800&auto=format&fit=crop&q=80',
      site: 'https://images.unsplash.com/photo-1508873696983-2df5293cb32b?w=800&auto=format&fit=crop&q=80',
      shading: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=800&auto=format&fit=crop&q=80',
      other: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80'
    };

    try {
      setActionLoading(true);
      await surveyApi.uploadPhoto(id, {
        photo_type: photoType,
        caption: photoCaption || `${photoType.toUpperCase()} Photograph`,
        description: photoDesc,
        file_name: selectedFile ? selectedFile.name : `${photoType}_survey_img.jpg`,
        file_size_bytes: selectedFile ? selectedFile.size : 2048500,
        file_type: selectedFile ? selectedFile.type : 'image/jpeg',
        signed_url: sampleUrls[photoType] || sampleUrls.site
      });

      setShowUploadModal(false);
      setPhotoCaption('');
      setPhotoDesc('');
      setSelectedFile(null);
      loadSurveyDetails();
    } catch (err) {
      setUploadError(err?.message || 'Failed to upload photo.');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      pending: { label: 'Pending', cls: 'survey-badge-pending' },
      assigned: { label: 'Assigned', cls: 'survey-badge-assigned' },
      scheduled: { label: 'Scheduled', cls: 'survey-badge-scheduled' },
      in_progress: { label: 'In Progress', cls: 'survey-badge-in_progress' },
      submitted: { label: 'Submitted', cls: 'survey-badge-submitted' },
      approved: { label: 'Approved', cls: 'survey-badge-approved' },
      rejected: { label: 'Rejected', cls: 'survey-badge-rejected' },
      revisit_required: { label: 'Revisit Required', cls: 'survey-badge-revisit_required' }
    };
    const item = map[status] || { label: status, cls: 'survey-badge-pending' };
    return <span className={`survey-badge ${item.cls}`}>{item.label}</span>;
  };

  const survey = data?.survey;
  const assignments = data?.assignments || [];
  const photos = data?.photos || [];
  const report = data?.report;
  const approvals = data?.approvals || [];

  return (
    <PortalLayout
      title={survey ? `${survey.survey_code} — ${survey.customer_name}` : 'Survey Request Details'}
      subtitle={survey ? `Site: ${survey.site_address || survey.city} · Registered ${new Date(survey.created_at).toLocaleDateString()}` : 'Loading...'}
      actions={
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Link
            to="/survey/requests"
            className="survey-btn survey-btn-secondary survey-btn-sm"
          >
            <ArrowLeft size={14} /> Back to Requests
          </Link>
          <button
            onClick={loadReport}
            className="survey-btn survey-btn-secondary survey-btn-sm"
          >
            <FileText size={14} /> Feasibility Report
          </button>
          <Link
            to={`/survey/requests/${id}/inspection`}
            className="survey-btn survey-btn-primary survey-btn-sm"
          >
            <FileEdit size={14} /> Digital Inspection Form
          </Link>
        </div>
      }
    >
      {loading ? (
        <div className="survey-card" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading survey record and technical attachments...
        </div>
      ) : error ? (
        <div className="survey-card" style={{ borderColor: 'var(--c-red-2)', color: 'var(--c-red)' }}>
          {error}
        </div>
      ) : !survey ? (
        <div className="survey-card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          Survey request not found.
        </div>
      ) : (
        <>
          {/* Header Action Banner */}
          <div
            className="survey-card"
            style={{
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
              background: 'rgba(var(--surface-rgb), 0.95)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Lifecycle Status:</span>
                <div style={{ marginTop: '2px' }}>{getStatusBadge(survey.status)}</div>
              </div>
              <div style={{ borderLeft: '1px solid rgba(var(--ink-rgb), 0.1)', paddingLeft: '14px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Priority:</span>
                <div style={{ marginTop: '2px', textTransform: 'capitalize', fontWeight: 600 }} className={`survey-priority-${survey.priority || 'medium'}`}>
                  {survey.priority || 'medium'}
                </div>
              </div>
              <div style={{ borderLeft: '1px solid rgba(var(--ink-rgb), 0.1)', paddingLeft: '14px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Assigned Surveyor:</span>
                <div style={{ marginTop: '2px', fontWeight: 600, color: 'var(--c-blue)' }}>
                  {survey.assigned_to_name || 'Unassigned'}
                </div>
              </div>
              <div style={{ borderLeft: '1px solid rgba(var(--ink-rgb), 0.1)', paddingLeft: '14px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Visit Date:</span>
                <div style={{ marginTop: '2px', color: 'var(--c-blue)' }}>
                  {survey.scheduled_date || 'Awaiting date'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => {
                  setSelectedSurveyor(survey.assigned_to || surveyors[0]?.id || '');
                  setShowAssignModal(true);
                }}
                className="survey-btn survey-btn-secondary survey-btn-sm"
              >
                <UserCheck size={14} /> Assign
              </button>
              <button
                onClick={() => {
                  setNewScheduleDate(survey.scheduled_date || '');
                  setNewScheduleTime(survey.scheduled_time || '10:00 AM - 12:00 PM');
                  setShowScheduleModal(true);
                }}
                className="survey-btn survey-btn-secondary survey-btn-sm"
              >
                <Calendar size={14} /> Schedule
              </button>
              <button
                onClick={() => setShowUploadModal(true)}
                className="survey-btn survey-btn-secondary survey-btn-sm"
              >
                <Camera size={14} /> Add Photo
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="survey-tabs">
            <button
              onClick={() => handleTabChange('overview')}
              className={`survey-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            >
              <Home size={15} /> Overview & Customer
            </button>
            <button
              onClick={() => handleTabChange('technical')}
              className={`survey-tab-btn ${activeTab === 'technical' ? 'active' : ''}`}
            >
              <Layers size={15} /> Technical & Roof Specs
            </button>
            <button
              onClick={() => handleTabChange('photos')}
              className={`survey-tab-btn ${activeTab === 'photos' ? 'active' : ''}`}
            >
              <Camera size={15} /> Photographs ({photos.length})
            </button>
            <button
              onClick={() => handleTabChange('approvals')}
              className={`survey-tab-btn ${activeTab === 'approvals' ? 'active' : ''}`}
            >
              <ShieldCheck size={15} /> Review & Approvals
            </button>
            <button
              onClick={() => handleTabChange('history')}
              className={`survey-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            >
              <Clock size={15} /> Assignment Timeline
            </button>
          </div>

          {/* TAB 1: OVERVIEW & CUSTOMER */}
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
              {/* Customer Card */}
              <div className="survey-card">
                <div className="survey-card-header">
                  <h3>Customer & Property Information</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.88rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid rgba(var(--ink-rgb), 0.06)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Client Name:</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-strong)' }}>{survey.customer_name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid rgba(var(--ink-rgb), 0.06)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Contact Phone:</span>
                    <span style={{ color: 'var(--c-blue)' }}>{survey.contact_phone || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid rgba(var(--ink-rgb), 0.06)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Email Address:</span>
                    <span style={{ color: 'var(--text-soft)' }}>{survey.contact_email || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid rgba(var(--ink-rgb), 0.06)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Site Address:</span>
                    <span style={{ color: 'var(--text-strong)', textAlign: 'right' }}>{survey.site_address || 'TBD'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid rgba(var(--ink-rgb), 0.06)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>City & State:</span>
                    <span style={{ color: 'var(--text-strong)' }}>{survey.city}, {survey.state || 'India'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Property Type:</span>
                    <span style={{ color: 'var(--text-strong)', textTransform: 'capitalize' }}>{survey.property_type || 'Residential'}</span>
                  </div>
                </div>
              </div>

              {/* Electrical Profile Card */}
              <div className="survey-card">
                <div className="survey-card-header">
                  <h3>Electricity & Tariff Profile</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.88rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid rgba(var(--ink-rgb), 0.06)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Connection Type:</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-strong)', textTransform: 'capitalize' }}>
                      {survey.electricity_connection_type?.replace('_', ' ') || 'Three Phase'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid rgba(var(--ink-rgb), 0.06)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Monthly Electricity Bill:</span>
                    <span style={{ fontWeight: 600, color: 'var(--c-green)' }}>
                      ₹{Number(survey.monthly_electricity_bill || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid rgba(var(--ink-rgb), 0.06)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Sanctioned Load:</span>
                    <span style={{ color: 'var(--text-strong)' }}>{survey.sanctioned_load_kw || 10} kW</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid rgba(var(--ink-rgb), 0.06)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Consumer No:</span>
                    <span style={{ color: 'var(--text-strong)' }}>{survey.consumer_number || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Grid Stability:</span>
                    <span style={{ color: 'var(--text-strong)', textTransform: 'capitalize' }}>{survey.grid_availability || 'Stable'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TECHNICAL & ROOF SPECS */}
          {activeTab === 'technical' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
              <div className="survey-card">
                <div className="survey-card-header">
                  <h3>Roof Structure & Shading</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.88rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Roof Type:</span>
                    <span style={{ color: 'var(--text-strong)', fontWeight: 600, textTransform: 'capitalize' }}>
                      {survey.roof_type?.replace('_', ' ') || 'RCC Flat'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Total Measured Area:</span>
                    <span style={{ color: 'var(--text-strong)' }}>{survey.roof_area_sqm || 0} m²</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Available Installation Area:</span>
                    <span style={{ color: 'var(--c-blue)', fontWeight: 600 }}>{survey.available_installation_area_sqm || 0} m²</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Orientation & Tilt:</span>
                    <span style={{ color: 'var(--text-strong)', textTransform: 'capitalize' }}>
                      {survey.roof_direction || 'South'} ({survey.roof_tilt_degrees || 0}°)
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Shading Assessment:</span>
                    <span style={{ color: 'var(--text-strong)', textTransform: 'capitalize' }}>{survey.shading_conditions || 'None'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Roof Condition:</span>
                    <span style={{ color: 'var(--text-strong)', textTransform: 'capitalize' }}>{survey.roof_condition || 'Good'}</span>
                  </div>
                  <div style={{ marginTop: '8px', padding: '10px', background: 'rgba(var(--ink-rgb), 0.03)', borderRadius: '6px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Structural Concerns:</span>
                    <span style={{ fontSize: '0.84rem', color: 'var(--text-soft)' }}>{survey.structural_concerns || 'None reported.'}</span>
                  </div>
                </div>
              </div>

              <div className="survey-card">
                <div className="survey-card-header">
                  <h3>Solar System Recommendations</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.88rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Recommended Capacity:</span>
                    <span style={{ color: 'var(--c-green)', fontWeight: 700, fontSize: '1.05rem' }}>
                      {survey.recommended_capacity_kw || 10} kWp
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Recommended System Type:</span>
                    <span style={{ color: 'var(--text-strong)', fontWeight: 600, textTransform: 'uppercase' }}>
                      {survey.recommended_system_type || 'On-Grid'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Estimated Usable Roof:</span>
                    <span style={{ color: 'var(--text-strong)' }}>{survey.estimated_usable_area_sqm || 100} m²</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Cable Run Distance:</span>
                    <span style={{ color: 'var(--text-strong)' }}>{survey.cable_distance_m || 20} meters</span>
                  </div>
                  <div style={{ marginTop: '8px', padding: '10px', background: 'rgba(var(--ink-rgb), 0.03)', borderRadius: '6px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Constraints & Special Notes:</span>
                    <span style={{ fontSize: '0.84rem', color: 'var(--text-soft)' }}>
                      {survey.potential_constraints || survey.additional_requirements || 'Standard rooftop mounting with ballasted clamps.'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PHOTOGRAPHS & DOCUMENTS */}
          {activeTab === 'photos' && (
            <div className="survey-card">
              <div className="survey-card-header">
                <h3>
                  <Camera size={18} style={{ color: 'var(--c-blue)' }} />
                  Photographic Evidence & Site Documentation ({photos.length})
                </h3>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="survey-btn survey-btn-primary survey-btn-sm"
                >
                  <Upload size={14} /> Upload Photograph
                </button>
              </div>

              {photos.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
                  <Camera size={36} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
                  <p>No photographs uploaded yet. Field surveyors can attach roof, electrical panel, and site images.</p>
                </div>
              ) : (
                <div className="survey-photo-grid">
                  {photos.map((p) => (
                    <div key={p.id} className="survey-photo-card">
                      <img
                        src={p.signed_url}
                        alt={p.caption}
                        className="survey-photo-img"
                      />
                      <div className="survey-photo-meta">
                        <div className="survey-photo-caption">{p.caption}</div>
                        <div className="survey-photo-desc">{p.description || 'Verified site photograph'}</div>
                        <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                          <span style={{ textTransform: 'capitalize' }}>Category: {p.photo_type}</span>
                          <span>{new Date(p.uploaded_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: REVIEW & APPROVALS */}
          {activeTab === 'approvals' && (
            <div className="survey-card">
              <div className="survey-card-header">
                <h3>
                  <ShieldCheck size={18} style={{ color: 'var(--c-emerald)' }} />
                  Technical Review & Approval History
                </h3>
                <Link
                  to="/survey/approvals"
                  className="survey-btn survey-btn-secondary survey-btn-sm"
                >
                  Open Approvals Queue &rarr;
                </Link>
              </div>

              {approvals.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  No approval actions recorded yet. If the survey is submitted, technical reviewers can approve or request revisions.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {approvals.map((app) => (
                    <div
                      key={app.id}
                      style={{
                        padding: '16px',
                        background: 'rgba(var(--ink-rgb), 0.02)',
                        border: '1px solid rgba(var(--ink-rgb), 0.08)',
                        borderRadius: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontWeight: 600, color: 'var(--text-strong)' }}>Reviewer: {app.reviewer_name}</span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '10px' }}>
                            {new Date(app.reviewed_at).toLocaleString()}
                          </span>
                        </div>
                        <span className={`survey-badge survey-badge-${app.status}`}>
                          {app.status}
                        </span>
                      </div>
                      <p style={{ margin: '8px 0 0 0', fontSize: '0.86rem', color: 'var(--text-soft)' }}>
                        {app.comments}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: AUDIT HISTORY TIMELINE */}
          {activeTab === 'history' && (
            <div className="survey-card">
              <div className="survey-card-header">
                <h3>
                  <Clock size={18} style={{ color: 'var(--c-blue)' }} />
                  Assignment & Activity Audit Log
                </h3>
              </div>

              {history.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  Loading timeline logs...
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderLeft: '2px solid rgba(56, 189, 248, 0.3)', paddingLeft: '16px', marginLeft: '8px' }}>
                  {history.map((ev) => (
                    <div key={ev.id} style={{ position: 'relative' }}>
                      <div style={{ position: 'absolute', left: '-22px', top: '4px', width: '10px', height: '10px', borderRadius: '50%', background: '#38bdf8' }} />
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-strong)' }}>
                        {ev.action?.replace(/_/g, ' ')}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-soft)', marginTop: '2px' }}>
                        {ev.details}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                        By {ev.actor_name} &bull; {new Date(ev.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* MODALS */}
          {/* 1. Assign Modal */}
          {showAssignModal && (
            <div className="survey-modal-overlay">
              <div className="survey-modal-content">
                <h3 style={{ color: 'var(--text-strong)', margin: '0 0 16px 0' }}>Assign Surveyor</h3>
                <form onSubmit={handleAssignSubmit}>
                  <div className="survey-form-group">
                    <label className="survey-label">Field Engineer</label>
                    <select
                      className="survey-select"
                      value={selectedSurveyor}
                      onChange={(e) => setSelectedSurveyor(e.target.value)}
                      required
                    >
                      <option value="">-- Select Surveyor --</option>
                      {surveyors.map((sr) => (
                        <option key={sr.id} value={sr.id}>
                          {sr.full_name} ({sr.active_surveys || 0} active visits)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="survey-form-group">
                      <label className="survey-label">Visit Date</label>
                      <input
                        type="date"
                        className="survey-input"
                        value={assignDate}
                        onChange={(e) => setAssignDate(e.target.value)}
                      />
                    </div>
                    <div className="survey-form-group">
                      <label className="survey-label">Time Slot</label>
                      <select
                        className="survey-select"
                        value={assignTime}
                        onChange={(e) => setAssignTime(e.target.value)}
                      >
                        <option value="10:00 AM - 12:00 PM">10:00 AM - 12:00 PM</option>
                        <option value="01:00 PM - 03:00 PM">01:00 PM - 03:00 PM</option>
                        <option value="03:00 PM - 05:00 PM">03:00 PM - 05:00 PM</option>
                      </select>
                    </div>
                  </div>

                  <div className="survey-form-group">
                    <label className="survey-label">Assignment Notes</label>
                    <textarea
                      className="survey-textarea"
                      placeholder="Special instructions..."
                      value={assignNotes}
                      onChange={(e) => setAssignNotes(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                    <button
                      type="button"
                      onClick={() => setShowAssignModal(false)}
                      className="survey-btn survey-btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="survey-btn survey-btn-primary"
                    >
                      {actionLoading ? 'Assigning...' : 'Assign Surveyor'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 2. Schedule Modal */}
          {showScheduleModal && (
            <div className="survey-modal-overlay">
              <div className="survey-modal-content">
                <h3 style={{ color: 'var(--text-strong)', margin: '0 0 16px 0' }}>Schedule Site Visit</h3>
                <form onSubmit={handleScheduleSubmit}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="survey-form-group">
                      <label className="survey-label">Visit Date</label>
                      <input
                        type="date"
                        className="survey-input"
                        value={newScheduleDate}
                        onChange={(e) => setNewScheduleDate(e.target.value)}
                        required
                      />
                    </div>
                    <div className="survey-form-group">
                      <label className="survey-label">Time Slot</label>
                      <select
                        className="survey-select"
                        value={newScheduleTime}
                        onChange={(e) => setNewScheduleTime(e.target.value)}
                      >
                        <option value="10:00 AM - 12:00 PM">10:00 AM - 12:00 PM</option>
                        <option value="01:00 PM - 03:00 PM">01:00 PM - 03:00 PM</option>
                        <option value="03:00 PM - 05:00 PM">03:00 PM - 05:00 PM</option>
                      </select>
                    </div>
                  </div>

                  <div className="survey-form-group">
                    <label className="survey-label">Site Address Confirmation</label>
                    <input
                      type="text"
                      className="survey-input"
                      value={newSiteAddress}
                      onChange={(e) => setNewSiteAddress(e.target.value)}
                      required
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                    <button
                      type="button"
                      onClick={() => setShowScheduleModal(false)}
                      className="survey-btn survey-btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="survey-btn survey-btn-primary"
                    >
                      {actionLoading ? 'Saving...' : 'Confirm Schedule'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 3. Upload Photo Modal */}
          {showUploadModal && (
            <div className="survey-modal-overlay">
              <div className="survey-modal-content">
                <h3 style={{ color: 'var(--text-strong)', margin: '0 0 16px 0' }}>Upload Site Photograph</h3>
                <form onSubmit={handlePhotoUpload}>
                  {uploadError && (
                    <div style={{ color: 'var(--c-red)', marginBottom: '12px', fontSize: '0.85rem' }}>
                      {uploadError}
                    </div>
                  )}

                  <div className="survey-form-group">
                    <label className="survey-label">Photograph Category</label>
                    <select
                      className="survey-select"
                      value={photoType}
                      onChange={(e) => setPhotoType(e.target.value)}
                    >
                      <option value="roof">Roof Photograph (Tilt, surface, layout)</option>
                      <option value="electrical">Electrical Panel / Meter</option>
                      <option value="site">Site Elevation / Aerial View</option>
                      <option value="shading">Shading Obstruction / Trees</option>
                      <option value="other">Document / Single Line Diagram</option>
                    </select>
                  </div>

                  <div className="survey-form-group">
                    <label className="survey-label">Caption / Title</label>
                    <input
                      type="text"
                      className="survey-input"
                      placeholder="e.g. South Terrace View with zero shading"
                      value={photoCaption}
                      onChange={(e) => setPhotoCaption(e.target.value)}
                      required
                    />
                  </div>

                  <div className="survey-form-group">
                    <label className="survey-label">Technical Observation / Description</label>
                    <textarea
                      className="survey-textarea"
                      placeholder="Details on purlins, cable conduit route, or shadows..."
                      value={photoDesc}
                      onChange={(e) => setPhotoDesc(e.target.value)}
                    />
                  </div>

                  <div className="survey-form-group">
                    <label className="survey-label">Choose Image File (JPG, PNG, WEBP, PDF up to 10MB)</label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      className="survey-input"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && file.size > 10 * 1024 * 1024) {
                          alert('File exceeds 10MB limit!');
                          return;
                        }
                        setSelectedFile(file || null);
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                    <button
                      type="button"
                      onClick={() => setShowUploadModal(false)}
                      className="survey-btn survey-btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="survey-btn survey-btn-primary"
                    >
                      {actionLoading ? 'Uploading...' : 'Save & Attach Photo'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Feasibility Report Modal */}
          {showReportModal && (
            <FeasibilityReportModal
              reportData={reportData}
              onClose={() => setShowReportModal(false)}
            />
          )}
        </>
      )}
    </PortalLayout>
  );
}
