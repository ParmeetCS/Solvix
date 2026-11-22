import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import PortalLayout from '@/components/PortalLayout';
import { surveyApi } from '@/services/api';
import { imageToDataUrl } from '@/lib/imageUpload';
import {
  FileText,
  Save,
  Send,
  Camera,
  Layers,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Upload,
  Info,
  Clock,
  Home,
  CheckCheck
} from 'lucide-react';

export default function SurveyInspectionForm() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Form Section Navigation for Field Mobile Usability
  const [currentStep, setCurrentStep] = useState(1);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Customer & Property Info
    customer_name: '',
    contact_phone: '',
    contact_email: '',
    site_address: '',
    city: 'Delhi NCR',
    state: 'Delhi',
    pincode: '',
    property_type: 'residential',
    electricity_connection_type: 'three_phase',
    monthly_electricity_bill: '',
    sanctioned_load_kw: '',
    consumer_number: '',
    meter_number: '',

    // Step 2: Roof Assessment
    roof_type: 'rcc_flat',
    roof_area_sqm: '',
    available_installation_area_sqm: '',
    roof_direction: 'south',
    roof_tilt_degrees: '0',
    shading_conditions: 'none',
    roof_condition: 'good',
    structural_concerns: '',

    // Step 3: Electrical Assessment
    grid_availability: 'stable',
    existing_meter_info: '',
    main_panel_condition: 'good',
    earthing_availability: 'adequate',
    cable_distance_m: '25',
    other_technical_observations: '',

    // Step 4: Installation Feasibility & Recommendations
    estimated_usable_area_sqm: '',
    recommended_capacity_kw: '10',
    recommended_system_type: 'on-grid',
    potential_constraints: '',
    additional_requirements: '',
    surveyor_notes: '',

    // Step 5: Photos (attached list)
    photos: []
  });

  // Photo upload modal state
  const [photoType, setPhotoType] = useState('roof');
  const [photoCaption, setPhotoCaption] = useState('');
  const [photoDesc, setPhotoDesc] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    loadSurveyData();
  }, [id]);

  const loadSurveyData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await surveyApi.getRequestById(id);
      const survey = res.data?.survey;
      const photos = res.data?.photos || [];

      if (survey) {
        // Preload draft if exists or survey values
        const draft = survey.draft_data || {};
        setFormData(prev => ({
          ...prev,
          customer_name: draft.customer_name || survey.customer_name || '',
          contact_phone: draft.contact_phone || survey.contact_phone || '',
          contact_email: draft.contact_email || survey.contact_email || '',
          site_address: draft.site_address || survey.site_address || '',
          city: draft.city || survey.city || 'Delhi NCR',
          state: draft.state || survey.state || 'Delhi',
          pincode: draft.pincode || survey.pincode || '',
          property_type: draft.property_type || survey.property_type || 'residential',
          electricity_connection_type: draft.electricity_connection_type || survey.electricity_connection_type || 'three_phase',
          monthly_electricity_bill: draft.monthly_electricity_bill || survey.monthly_electricity_bill || '',
          sanctioned_load_kw: draft.sanctioned_load_kw || survey.sanctioned_load_kw || '',
          consumer_number: draft.consumer_number || survey.consumer_number || '',
          meter_number: draft.meter_number || survey.meter_number || '',

          roof_type: draft.roof_type || survey.roof_type || 'rcc_flat',
          roof_area_sqm: draft.roof_area_sqm || survey.roof_area_sqm || '',
          available_installation_area_sqm: draft.available_installation_area_sqm || survey.available_installation_area_sqm || '',
          roof_direction: draft.roof_direction || survey.roof_direction || 'south',
          roof_tilt_degrees: draft.roof_tilt_degrees !== undefined ? String(draft.roof_tilt_degrees) : (survey.roof_tilt_degrees !== null ? String(survey.roof_tilt_degrees) : '0'),
          shading_conditions: draft.shading_conditions || survey.shading_conditions || 'none',
          roof_condition: draft.roof_condition || survey.roof_condition || 'good',
          structural_concerns: draft.structural_concerns || survey.structural_concerns || '',

          grid_availability: draft.grid_availability || survey.grid_availability || 'stable',
          existing_meter_info: draft.existing_meter_info || survey.existing_meter_info || '',
          main_panel_condition: draft.main_panel_condition || survey.main_panel_condition || 'good',
          earthing_availability: draft.earthing_availability || survey.earthing_availability || 'adequate',
          cable_distance_m: draft.cable_distance_m || survey.cable_distance_m || '25',
          other_technical_observations: draft.other_technical_observations || survey.other_technical_observations || '',

          estimated_usable_area_sqm: draft.estimated_usable_area_sqm || survey.estimated_usable_area_sqm || '',
          recommended_capacity_kw: draft.recommended_capacity_kw || survey.recommended_capacity_kw || '10',
          recommended_system_type: draft.recommended_system_type || survey.recommended_system_type || 'on-grid',
          potential_constraints: draft.potential_constraints || survey.potential_constraints || '',
          additional_requirements: draft.additional_requirements || survey.additional_requirements || '',
          surveyor_notes: draft.surveyor_notes || survey.surveyor_notes || '',

          photos
        }));
      }
    } catch (err) {
      setError(err?.message || 'Failed to load inspection data.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };

      // Auto-compute recommended capacity if available area changed
      if (field === 'available_installation_area_sqm' && value) {
        const area = parseFloat(value);
        if (!isNaN(area) && area > 0) {
          // Standard solar rule: ~10 sqm per 1 kWp module
          const suggestedCapacity = Math.floor(area / 10);
          updated.recommended_capacity_kw = String(suggestedCapacity > 0 ? suggestedCapacity : 1);
          updated.estimated_usable_area_sqm = String(Math.round(area * 0.9));
        }
      }

      return updated;
    });
  };

  const handleSaveDraft = async () => {
    try {
      setSavingDraft(true);
      setError(null);
      await surveyApi.saveDraft(id, formData);
      setSuccessMsg('Inspection draft successfully saved! You can resume anytime.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setError(err?.message || 'Failed to save draft.');
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmitFinal = async (e) => {
    e.preventDefault();
    if (!formData.roof_type || !formData.recommended_system_type) {
      alert('Please complete the mandatory roof and feasibility sections before submitting.');
      return;
    }

    if (!window.confirm('Are you sure you want to finalize and submit this site survey inspection for technical review?')) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await surveyApi.submitInspection(id, formData);
      alert('Site Survey Inspection submitted successfully! Awaiting Manager approval.');
      navigate(`/survey/requests/${id}`);
    } catch (err) {
      setError(err?.message || 'Failed to submit inspection.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAttachPhoto = async (e) => {
    e.preventDefault();
    if (!photoCaption) return;

    const sampleUrls = {
      roof: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80',
      electrical: 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=800&auto=format&fit=crop&q=80',
      site: 'https://images.unsplash.com/photo-1508873696983-2df5293cb32b?w=800&auto=format&fit=crop&q=80',
      shading: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=800&auto=format&fit=crop&q=80',
      other: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80'
    };

    try {
      setUploadingPhoto(true);
      const pictureUrl = selectedFile ? await imageToDataUrl(selectedFile) : null;
      const res = await surveyApi.uploadPhoto(id, {
        photo_type: photoType,
        caption: photoCaption,
        description: photoDesc,
        file_name: selectedFile ? selectedFile.name : `${photoType}_field_photo.jpg`,
        file_size_bytes: selectedFile ? selectedFile.size : 2048500,
        file_type: selectedFile ? selectedFile.type : 'image/jpeg',
        signed_url: pictureUrl || sampleUrls[photoType] || sampleUrls.site
      });

      const newPhoto = res.data;
      setFormData(prev => ({
        ...prev,
        photos: [newPhoto, ...prev.photos]
      }));

      setPhotoCaption('');
      setPhotoDesc('');
      setSelectedFile(null);
    } catch (err) {
      alert(err?.message || 'Failed to upload photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Live engineering calculation summary
  const availableArea = parseFloat(formData.available_installation_area_sqm) || 0;
  const suggestedKw = parseFloat(formData.recommended_capacity_kw) || 10;
  const estCost = Math.round(suggestedKw * 42000);
  const estAnnualGeneration = Math.round(suggestedKw * 4.8 * 365 * 0.78);

  const steps = [
    { number: 1, label: 'Customer & Property' },
    { number: 2, label: 'Roof Assessment' },
    { number: 3, label: 'Electrical System' },
    { number: 4, label: 'Feasibility & Sizing' },
    { number: 5, label: 'Photographs & Docs' },
  ];

  return (
    <PortalLayout
      title="Digital Site Survey & Field Inspection Form"
      subtitle="Complete technical measurements, structural observations, and solar capacity recommendations"
      actions={
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Link
            to={`/survey/requests/${id}`}
            className="survey-btn survey-btn-secondary survey-btn-sm"
          >
            <ArrowLeft size={14} /> Back to Details
          </Link>
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={savingDraft}
            className="survey-btn survey-btn-secondary survey-btn-sm"
          >
            <Save size={14} /> {savingDraft ? 'Saving Draft...' : 'Save Draft'}
          </button>
        </div>
      }
    >
      {/* Alert Messages */}
      {successMsg && (
        <div className="survey-card" style={{ borderColor: 'var(--c-emerald)', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--c-green)', padding: '12px 16px' }}>
          {successMsg}
        </div>
      )}
      {error && (
        <div className="survey-card" style={{ borderColor: 'var(--c-red-2)', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--c-red)', padding: '12px 16px' }}>
          {error}
        </div>
      )}

      {/* Mobile-Friendly Stepper Navigation */}
      <div
        className="survey-card"
        style={{
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px',
          overflowX: 'auto'
        }}
      >
        {steps.map(step => (
          <button
            key={step.number}
            onClick={() => setCurrentStep(step.number)}
            style={{
              background: currentStep === step.number ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
              border: `1px solid ${currentStep === step.number ? 'var(--c-blue)' : 'rgba(var(--ink-rgb), 0.08)'}`,
              borderRadius: '8px',
              padding: '8px 14px',
              color: currentStep === step.number ? 'var(--c-blue)' : 'var(--text-muted)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontSize: '0.84rem',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: currentStep === step.number ? 'var(--c-blue)' : 'rgba(var(--ink-rgb), 0.1)',
                color: currentStep === step.number ? 'var(--app-bg)' : 'var(--text-soft)',
                fontSize: '0.72rem',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700
              }}
            >
              {step.number}
            </span>
            {step.label}
          </button>
        ))}
      </div>

      {/* Main Inspection Form Card */}
      <form onSubmit={handleSubmitFinal}>
        {/* STEP 1: CUSTOMER & PROPERTY INFORMATION */}
        {currentStep === 1 && (
          <div className="survey-card">
            <div className="survey-card-header">
              <h3>
                <Home size={18} style={{ color: 'var(--c-blue)' }} />
                1. Customer & Property Information
              </h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Verified on-site by surveyor</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              <div className="survey-form-group">
                <label className="survey-label">Customer / Company Name</label>
                <input
                  type="text"
                  className="survey-input"
                  value={formData.customer_name}
                  onChange={(e) => handleInputChange('customer_name', e.target.value)}
                  required
                />
              </div>

              <div className="survey-form-group">
                <label className="survey-label">Contact Phone</label>
                <input
                  type="text"
                  className="survey-input"
                  value={formData.contact_phone}
                  onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                  required
                />
              </div>

              <div className="survey-form-group">
                <label className="survey-label">Contact Email</label>
                <input
                  type="email"
                  className="survey-input"
                  value={formData.contact_email}
                  onChange={(e) => handleInputChange('contact_email', e.target.value)}
                />
              </div>

              <div className="survey-form-group">
                <label className="survey-label">Property Category</label>
                <select
                  className="survey-select"
                  value={formData.property_type}
                  onChange={(e) => handleInputChange('property_type', e.target.value)}
                >
                  <option value="residential">Residential (Villa / Independent / Apartment)</option>
                  <option value="commercial">Commercial (Office / Mall / Retail / Hospital)</option>
                  <option value="industrial">Industrial (Factory / Warehouse / Shed)</option>
                  <option value="institutional">Institutional (School / University / Trust)</option>
                  <option value="agricultural">Agricultural (Farmhouse / Cold Storage)</option>
                </select>
              </div>

              <div className="survey-form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="survey-label">Site Address</label>
                <input
                  type="text"
                  className="survey-input"
                  placeholder="Plot/Building, Street, Landmark"
                  value={formData.site_address}
                  onChange={(e) => handleInputChange('site_address', e.target.value)}
                  required
                />
              </div>

              <div className="survey-form-group">
                <label className="survey-label">City / Region</label>
                <input
                  type="text"
                  className="survey-input"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                />
              </div>

              <div className="survey-form-group">
                <label className="survey-label">Monthly Electricity Bill (INR)</label>
                <input
                  type="number"
                  className="survey-input"
                  placeholder="e.g. 15000"
                  value={formData.monthly_electricity_bill}
                  onChange={(e) => handleInputChange('monthly_electricity_bill', e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="survey-btn survey-btn-primary"
              >
                Next: Roof Assessment <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: ROOF ASSESSMENT */}
        {currentStep === 2 && (
          <div className="survey-card">
            <div className="survey-card-header">
              <h3>
                <Layers size={18} style={{ color: 'var(--accent-text)' }} />
                2. Roof Assessment & Usable Space
              </h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Measurements & Horizon Shading</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              <div className="survey-form-group">
                <label className="survey-label">Roof Surface Type</label>
                <select
                  className="survey-select"
                  value={formData.roof_type}
                  onChange={(e) => handleInputChange('roof_type', e.target.value)}
                  required
                >
                  <option value="rcc_flat">RCC Flat Concrete Roof</option>
                  <option value="metal_sheet">Metal Sheet / Trapezoidal PEB</option>
                  <option value="tiled">Mangalore / Clay Tiled Roof</option>
                  <option value="asbestos">Asbestos / Fiber Cement Sheet</option>
                  <option value="curved">Curved Shed</option>
                  <option value="ground">Ground Mount Plot</option>
                </select>
              </div>

              <div className="survey-form-group">
                <label className="survey-label">Approximate Total Roof Area (sq. meters)</label>
                <input
                  type="number"
                  className="survey-input"
                  placeholder="e.g. 200"
                  value={formData.roof_area_sqm}
                  onChange={(e) => handleInputChange('roof_area_sqm', e.target.value)}
                  required
                />
              </div>

              <div className="survey-form-group">
                <label className="survey-label">Available Shadow-Free Installation Area (sq. meters)</label>
                <input
                  type="number"
                  className="survey-input"
                  placeholder="e.g. 150"
                  value={formData.available_installation_area_sqm}
                  onChange={(e) => handleInputChange('available_installation_area_sqm', e.target.value)}
                  required
                />
              </div>

              <div className="survey-form-group">
                <label className="survey-label">Roof Orientation (Compass Bearing)</label>
                <select
                  className="survey-select"
                  value={formData.roof_direction}
                  onChange={(e) => handleInputChange('roof_direction', e.target.value)}
                >
                  <option value="south">True South (Optimal)</option>
                  <option value="south_west">South-West</option>
                  <option value="south_east">South-East</option>
                  <option value="east">East</option>
                  <option value="west">West</option>
                  <option value="flat">Flat (0° horizontal tilt)</option>
                  <option value="mixed">Mixed Gable / Multiple Pitches</option>
                </select>
              </div>

              <div className="survey-form-group">
                <label className="survey-label">Roof Tilt or Slope (Degrees)</label>
                <input
                  type="number"
                  className="survey-input"
                  placeholder="0 for flat, or 5-25 for sloped"
                  value={formData.roof_tilt_degrees}
                  onChange={(e) => handleInputChange('roof_tilt_degrees', e.target.value)}
                />
              </div>

              <div className="survey-form-group">
                <label className="survey-label">Shading Conditions</label>
                <select
                  className="survey-select"
                  value={formData.shading_conditions}
                  onChange={(e) => handleInputChange('shading_conditions', e.target.value)}
                >
                  <option value="none">Zero Shade (Clear 360° solar access)</option>
                  <option value="partial_morning">Partial Shade in Morning only</option>
                  <option value="partial_evening">Partial Shade in Evening only</option>
                  <option value="nearby_trees">Nearby Trees (Seasonal leaf drop)</option>
                  <option value="nearby_buildings">Adjacent High-Rise Building</option>
                  <option value="heavy">Heavy Perennial Shade (High risk)</option>
                </select>
              </div>

              <div className="survey-form-group">
                <label className="survey-label">Roof Condition</label>
                <select
                  className="survey-select"
                  value={formData.roof_condition}
                  onChange={(e) => handleInputChange('roof_condition', e.target.value)}
                >
                  <option value="excellent">Excellent (Newly built/waterproofed)</option>
                  <option value="good">Good (Normal minor wear)</option>
                  <option value="fair">Fair (May need minor repairs)</option>
                  <option value="needs_repair">Needs Repair (Cracks/leakage)</option>
                  <option value="unsuitable">Unsuitable for Solar Mounting</option>
                </select>
              </div>

              <div className="survey-form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="survey-label">Structural Concerns / Parapet / Water Tank Notes</label>
                <textarea
                  className="survey-textarea"
                  placeholder="Describe parapet wall height, lift machine room location, water tank shading or waterproofing membrane integrity..."
                  value={formData.structural_concerns}
                  onChange={(e) => handleInputChange('structural_concerns', e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="survey-btn survey-btn-secondary"
              >
                <ArrowLeft size={15} /> Back
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="survey-btn survey-btn-primary"
              >
                Next: Electrical Assessment <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: ELECTRICAL ASSESSMENT */}
        {currentStep === 3 && (
          <div className="survey-card">
            <div className="survey-card-header">
              <h3>
                <Zap size={18} style={{ color: 'var(--c-amber)' }} />
                3. Electrical Assessment & Grid Connection
              </h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Panel compatibility & earthing check</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              <div className="survey-form-group">
                <label className="survey-label">Grid Availability & Quality</label>
                <select
                  className="survey-select"
                  value={formData.grid_availability}
                  onChange={(e) => handleInputChange('grid_availability', e.target.value)}
                >
                  <option value="stable">Stable Grid (24x7 Reliable voltage)</option>
                  <option value="frequent_outages">Frequent Outages (1-3 hrs/day)</option>
                  <option value="highly_intermittent">Highly Intermittent / Low Voltage</option>
                  <option value="off_grid">Zero Grid Connection (Requires 100% Off-Grid)</option>
                </select>
              </div>

              <div className="survey-form-group">
                <label className="survey-label">Connection Type</label>
                <select
                  className="survey-select"
                  value={formData.electricity_connection_type}
                  onChange={(e) => handleInputChange('electricity_connection_type', e.target.value)}
                >
                  <option value="three_phase">Three Phase LT</option>
                  <option value="single_phase">Single Phase LT</option>
                  <option value="ht">HT Connection (11kV / 33kV)</option>
                </select>
              </div>

              <div className="survey-form-group">
                <label className="survey-label">Sanctioned Electrical Load (kW)</label>
                <input
                  type="number"
                  className="survey-input"
                  placeholder="e.g. 15"
                  value={formData.sanctioned_load_kw}
                  onChange={(e) => handleInputChange('sanctioned_load_kw', e.target.value)}
                />
              </div>

              <div className="survey-form-group">
                <label className="survey-label">Existing Meter & Net-Metering Info</label>
                <input
                  type="text"
                  className="survey-input"
                  placeholder="e.g. Standard digital meter; bi-directional replacement required"
                  value={formData.existing_meter_info}
                  onChange={(e) => handleInputChange('existing_meter_info', e.target.value)}
                />
              </div>

              <div className="survey-form-group">
                <label className="survey-label">Main Electrical Panel Condition</label>
                <select
                  className="survey-select"
                  value={formData.main_panel_condition}
                  onChange={(e) => handleInputChange('main_panel_condition', e.target.value)}
                >
                  <option value="good">Good (Clean, spare breaker slot available)</option>
                  <option value="acceptable">Acceptable (Can accommodate solar breaker)</option>
                  <option value="aged_needs_upgrade">Aged / Congested (Requires sub-panel)</option>
                  <option value="dangerous">Hazardous (Immediate upgrade required)</option>
                </select>
              </div>

              <div className="survey-form-group">
                <label className="survey-label">Earthing Availability</label>
                <select
                  className="survey-select"
                  value={formData.earthing_availability}
                  onChange={(e) => handleInputChange('earthing_availability', e.target.value)}
                >
                  <option value="adequate">Adequate (Existing chemical earth pits viable)</option>
                  <option value="inadequate">Inadequate (Needs reconditioning)</option>
                  <option value="dedicated_needed">Dedicated Solar Pits Required (Standard recommendation)</option>
                  <option value="not_available">Not Available (New earthing pits mandatory)</option>
                </select>
              </div>

              <div className="survey-form-group">
                <label className="survey-label">Approximate Cable Run Distance (Meters)</label>
                <input
                  type="number"
                  className="survey-input"
                  placeholder="Distance from solar inverter to main LT panel"
                  value={formData.cable_distance_m}
                  onChange={(e) => handleInputChange('cable_distance_m', e.target.value)}
                />
              </div>

              <div className="survey-form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="survey-label">Other Technical & Wiring Observations</label>
                <textarea
                  className="survey-textarea"
                  placeholder="Cable routing shaft details, DG sync requirements, lightning arrester mast location..."
                  value={formData.other_technical_observations}
                  onChange={(e) => handleInputChange('other_technical_observations', e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="survey-btn survey-btn-secondary"
              >
                <ArrowLeft size={15} /> Back
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="survey-btn survey-btn-primary"
              >
                Next: Feasibility Sizing <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: FEASIBILITY & SOLAR SIZING */}
        {currentStep === 4 && (
          <div className="survey-card">
            <div className="survey-card-header">
              <h3>
                <CheckCircle2 size={18} style={{ color: 'var(--c-green)' }} />
                4. Installation Feasibility & Sizing Recommendations
              </h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Transparent engineering modeling</span>
            </div>

            {/* Calculated Estimates Insight Box */}
            <div
              style={{
                background: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '20px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--c-blue)', fontWeight: 600, marginBottom: '8px' }}>
                <Info size={16} /> Engineering Estimation Preview (Assumptions Documented)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '0.85rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Recommended Capacity:</span>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--c-green)' }}>{suggestedKw} kWp</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Estimated Generation:</span>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-strong)' }}>~{estAnnualGeneration.toLocaleString()} kWh/yr</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Turnkey Benchmark Cost:</span>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-strong)' }}>₹{estCost.toLocaleString('en-IN')}</div>
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '10px' }}>
                * Standard rule: 1 kWp crystalline silicon modules requires ~10 sqm unshaded roof. Daily solar insolation: 4.8 PSH/day. Performance ratio: 78%.
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              <div className="survey-form-group">
                <label className="survey-label">Recommended System Capacity (kWp)</label>
                <input
                  type="number"
                  step="0.5"
                  className="survey-input"
                  value={formData.recommended_capacity_kw}
                  onChange={(e) => handleInputChange('recommended_capacity_kw', e.target.value)}
                  required
                />
              </div>

              <div className="survey-form-group">
                <label className="survey-label">Recommended Architecture</label>
                <select
                  className="survey-select"
                  value={formData.recommended_system_type}
                  onChange={(e) => handleInputChange('recommended_system_type', e.target.value)}
                  required
                >
                  <option value="on-grid">On-Grid (Grid-tied net metering - Highest ROI)</option>
                  <option value="hybrid">Hybrid (Grid-tied with battery energy storage)</option>
                  <option value="off-grid">Off-Grid (Standalone solar + battery bank)</option>
                </select>
              </div>

              <div className="survey-form-group">
                <label className="survey-label">Estimated Usable Roof Area (sq. meters)</label>
                <input
                  type="number"
                  className="survey-input"
                  placeholder="e.g. 120"
                  value={formData.estimated_usable_area_sqm}
                  onChange={(e) => handleInputChange('estimated_usable_area_sqm', e.target.value)}
                />
              </div>

              <div className="survey-form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="survey-label">Potential Installation Constraints</label>
                <textarea
                  className="survey-textarea"
                  placeholder="e.g. High wind zone requires heavy ballasts; crane access needed for module lifting..."
                  value={formData.potential_constraints}
                  onChange={(e) => handleInputChange('potential_constraints', e.target.value)}
                />
              </div>

              <div className="survey-form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="survey-label">Additional Mounting / Civil Requirements</label>
                <textarea
                  className="survey-textarea"
                  placeholder="e.g. Elevated HDGI structure (1.5m clearance requested); walkway along ridge; lightning arrester mast..."
                  value={formData.additional_requirements}
                  onChange={(e) => handleInputChange('additional_requirements', e.target.value)}
                />
              </div>

              <div className="survey-form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="survey-label">Final Field Surveyor Remarks</label>
                <textarea
                  className="survey-textarea"
                  placeholder="Summarize site viability for technical reviewer and sales proposal generator..."
                  value={formData.surveyor_notes}
                  onChange={(e) => handleInputChange('surveyor_notes', e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="survey-btn survey-btn-secondary"
              >
                <ArrowLeft size={15} /> Back
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(5)}
                className="survey-btn survey-btn-primary"
              >
                Next: Photographs & Docs <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: PHOTOGRAPHS & FINAL SUBMISSION */}
        {currentStep === 5 && (
          <div className="survey-card">
            <div className="survey-card-header">
              <h3>
                <Camera size={18} style={{ color: 'var(--c-blue)' }} />
                5. Photographic Evidence & Final Submission
              </h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Attach evidence before submitting</span>
            </div>

            {/* Quick Photo Uploader Inline */}
            <div
              style={{
                padding: '16px',
                background: 'rgba(var(--ink-rgb), 0.03)',
                border: '1px dashed rgba(56, 189, 248, 0.3)',
                borderRadius: '8px',
                marginBottom: '20px'
              }}
            >
              <h4 style={{ margin: '0 0 12px 0', color: 'var(--c-blue)', fontSize: '0.92rem' }}>
                Upload Photograph or Supporting Document
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div>
                  <label className="survey-label">Photo Category</label>
                  <select
                    className="survey-select"
                    value={photoType}
                    onChange={(e) => setPhotoType(e.target.value)}
                  >
                    <option value="roof">Roof Photograph</option>
                    <option value="electrical">Electrical Panel / Meter</option>
                    <option value="site">Site Elevation</option>
                    <option value="shading">Shading Obstruction</option>
                    <option value="other">Electricity Bill / SLD Document</option>
                  </select>
                </div>

                <div>
                  <label className="survey-label">Caption / Description</label>
                  <input
                    type="text"
                    className="survey-input"
                    placeholder="e.g. South Terrace View"
                    value={photoCaption}
                    onChange={(e) => setPhotoCaption(e.target.value)}
                  />
                </div>

                <div>
                  <label className="survey-label">Select File</label>
                  <input
                    type="file"
                    className="survey-input"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={handleAttachPhoto}
                  disabled={uploadingPhoto || !photoCaption}
                  className="survey-btn survey-btn-secondary survey-btn-sm"
                >
                  <Upload size={14} /> {uploadingPhoto ? 'Uploading...' : 'Attach Photo'}
                </button>
              </div>
            </div>

            {/* Attached Photos Gallery */}
            <h4 style={{ color: 'var(--text-strong)', fontSize: '0.95rem', marginBottom: '12px' }}>
              Attached Photos ({formData.photos.length})
            </h4>

            {formData.photos.length === 0 ? (
              <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginBottom: '24px' }}>
                No photographs attached yet. Photographs help technical reviewers verify roof condition and cable runs.
              </p>
            ) : (
              <div className="survey-photo-grid" style={{ marginBottom: '24px' }}>
                {formData.photos.map((p) => (
                  <div key={p.id} className="survey-photo-card">
                    <img src={p.signed_url} alt={p.caption} className="survey-photo-img" />
                    <div className="survey-photo-meta">
                      <div className="survey-photo-caption">{p.caption}</div>
                      <div className="survey-photo-desc" style={{ textTransform: 'capitalize' }}>
                        Type: {p.photo_type}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Bottom Actions: Save Draft vs Submit */}
            <div
              style={{
                borderTop: '1px solid rgba(var(--ink-rgb), 0.08)',
                paddingTop: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
              }}
            >
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="survey-btn survey-btn-secondary"
              >
                <ArrowLeft size={15} /> Back
              </button>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={savingDraft}
                  className="survey-btn survey-btn-secondary"
                >
                  <Save size={15} /> {savingDraft ? 'Saving Draft...' : 'Save Draft'}
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="survey-btn survey-btn-success"
                  style={{ padding: '10px 24px', fontSize: '0.95rem' }}
                >
                  <Send size={15} /> {submitting ? 'Submitting...' : 'Finalize & Submit Survey'}
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </PortalLayout>
  );
}
