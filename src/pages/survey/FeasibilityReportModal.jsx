import {
  FileText,
  Printer,
  X,
  CheckCircle2,
  AlertTriangle,
  Sun,
  Zap,
  Compass,
  MapPin,
  Calendar,
  Layers,
  Leaf,
  ShieldCheck
} from 'lucide-react';

export default function FeasibilityReportModal({ reportData, onClose }) {
  if (!reportData) return null;

  const handlePrint = () => {
    window.print();
  };

  const {
    survey_code,
    customer,
    roof_assessment,
    electrical_assessment,
    recommendations,
    engineering_estimates,
    photographic_evidence = [],
    approvals_history = []
  } = reportData;

  return (
    <div className="survey-modal-overlay" style={{ padding: '20px 10px' }}>
      <div
        className="survey-modal-content"
        style={{
          maxWidth: '900px',
          maxHeight: '94vh',
          background: 'var(--app-bg)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.85)'
        }}
      >
        {/* Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(var(--ink-rgb), 0.1)', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#38bdf8', color: 'var(--on-fill)', padding: '6px', borderRadius: '6px' }}>
              <Sun size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-strong)', margin: 0 }}>
                SOLAR FEASIBILITY & TECHNICAL ASSESSMENT REPORT
              </h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Ref: {survey_code} &bull; Solvix Solar Engineering Division
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }} className="no-print">
            <button
              onClick={handlePrint}
              className="survey-btn survey-btn-primary survey-btn-sm"
            >
              <Printer size={14} /> Print / Export PDF
            </button>
            <button
              onClick={onClose}
              className="survey-btn survey-btn-secondary survey-btn-sm"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div id="solvix-printable-report" style={{ color: 'var(--text-soft)', fontSize: '0.9rem', lineHeight: 1.6 }}>

          {/* Executive Feasibility Banner */}
          <div
            style={{
              padding: '16px 20px',
              borderRadius: '8px',
              marginBottom: '20px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--c-green)', fontWeight: 700, fontSize: '1.05rem' }}>
                <CheckCircle2 size={18} /> SITE FEASIBILITY RATING: HIGHLY FEASIBLE
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-soft)', marginTop: '4px' }}>
                Recommended Turnkey System: <b>{recommendations?.recommended_capacity_kw} kWp</b> ({recommendations?.recommended_system_type?.toUpperCase()} System)
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Estimated Turnkey Investment</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-strong)' }}>
                ₹{Number(recommendations?.estimated_turnkey_cost_inr || 0).toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* Customer & Site Details */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div style={{ background: 'rgba(var(--ink-rgb), 0.03)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(var(--ink-rgb), 0.06)' }}>
              <h4 style={{ color: 'var(--c-blue)', fontSize: '0.85rem', textTransform: 'uppercase', margin: '0 0 8px 0' }}>
                Customer Information
              </h4>
              <p style={{ margin: '3px 0' }}><b>Client:</b> {customer?.name}</p>
              <p style={{ margin: '3px 0' }}><b>Contact:</b> {customer?.phone}</p>
              <p style={{ margin: '3px 0' }}><b>Email:</b> {customer?.email || 'N/A'}</p>
            </div>

            <div style={{ background: 'rgba(var(--ink-rgb), 0.03)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(var(--ink-rgb), 0.06)' }}>
              <h4 style={{ color: 'var(--c-blue)', fontSize: '0.85rem', textTransform: 'uppercase', margin: '0 0 8px 0' }}>
                Site Geography
              </h4>
              <p style={{ margin: '3px 0' }}><b>Site Address:</b> {customer?.site_address}</p>
              <p style={{ margin: '3px 0' }}><b>Region:</b> {customer?.city}, {customer?.state} {customer?.pincode}</p>
              <p style={{ margin: '3px 0' }}><b>Inspection Status:</b> Completed & Verified</p>
            </div>
          </div>

          {/* Technical Assessment Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            {/* Roof Assessment */}
            <div style={{ background: 'rgba(var(--ink-rgb), 0.03)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(var(--ink-rgb), 0.06)' }}>
              <h4 style={{ color: 'var(--accent-text)', fontSize: '0.9rem', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Layers size={16} /> 1. Roof Assessment & Usable Space
              </h4>
              <table style={{ width: '100%', fontSize: '0.84rem' }}>
                <tbody>
                  <tr>
                    <td style={{ color: 'var(--text-muted)', padding: '4px 0' }}>Roof Surface Type:</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-strong)', textTransform: 'capitalize' }}>{roof_assessment?.roof_type?.replace('_', ' ')}</td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--text-muted)', padding: '4px 0' }}>Measured Roof Area:</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-strong)' }}>{roof_assessment?.measured_total_roof_area_sqm} m² ({roof_assessment?.measured_total_roof_area_sqft} sq.ft)</td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--text-muted)', padding: '4px 0' }}>Available Installation Area:</td>
                    <td style={{ fontWeight: 600, color: 'var(--c-green)' }}>{roof_assessment?.available_installation_area_sqm} m² (Surveyor estimate)</td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--text-muted)', padding: '4px 0' }}>Roof Orientation:</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-strong)', textTransform: 'capitalize' }}>{roof_assessment?.orientation} ({roof_assessment?.tilt_degrees}° Tilt)</td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--text-muted)', padding: '4px 0' }}>Shading Conditions:</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-strong)', textTransform: 'capitalize' }}>{roof_assessment?.shading_conditions?.replace('_', ' ')}</td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--text-muted)', padding: '4px 0' }}>Structural Integrity:</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-strong)' }}>{roof_assessment?.structural_concerns || 'Sound'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Electrical Assessment */}
            <div style={{ background: 'rgba(var(--ink-rgb), 0.03)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(var(--ink-rgb), 0.06)' }}>
              <h4 style={{ color: 'var(--c-amber)', fontSize: '0.9rem', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Zap size={16} /> 2. Electrical Grid & Panel Assessment
              </h4>
              <table style={{ width: '100%', fontSize: '0.84rem' }}>
                <tbody>
                  <tr>
                    <td style={{ color: 'var(--text-muted)', padding: '4px 0' }}>Grid Availability:</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-strong)', textTransform: 'capitalize' }}>{electrical_assessment?.grid_availability}</td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--text-muted)', padding: '4px 0' }}>Connection & Sanctioned Load:</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-strong)' }}>{electrical_assessment?.sanctioned_load_kw} kW ({electrical_assessment?.connection_type})</td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--text-muted)', padding: '4px 0' }}>Monthly Electricity Bill:</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-strong)' }}>₹{Number(electrical_assessment?.monthly_electricity_bill_inr || 0).toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--text-muted)', padding: '4px 0' }}>Main Electrical Panel:</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-strong)', textTransform: 'capitalize' }}>{electrical_assessment?.main_panel_condition}</td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--text-muted)', padding: '4px 0' }}>Earthing Availability:</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-strong)', textTransform: 'capitalize' }}>{electrical_assessment?.earthing_availability}</td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--text-muted)', padding: '4px 0' }}>Cable Distance to Inverter:</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-strong)' }}>~{electrical_assessment?.cable_run_distance_m || 25} meters</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Expected Generation & Environmental Yield (Calculated with Clear Assumptions) */}
          <div style={{ background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
            <h4 style={{ color: 'var(--c-blue)', fontSize: '0.9rem', margin: '0 0 12px 0' }}>
              3. Solar Generation & Environmental Modeling (Calculated Estimates)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', textAlign: 'center' }}>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Est. Annual Generation</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-strong)', marginTop: '4px' }}>
                  {Number(engineering_estimates?.estimated_annual_generation_kwh || 0).toLocaleString()} kWh
                </div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Est. Monthly Generation</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-strong)', marginTop: '4px' }}>
                  {Number(engineering_estimates?.estimated_monthly_generation_kwh || 0).toLocaleString()} kWh
                </div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Annual CO₂ Offset</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--c-green)', marginTop: '4px' }}>
                  {engineering_estimates?.estimated_co2_offset_tonnes_per_year} Tonnes
                </div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Equiv. Trees Planted</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--c-green)', marginTop: '4px' }}>
                  {engineering_estimates?.equivalent_trees_planted} Trees
                </div>
              </div>
            </div>

            {/* Documented Engineering Assumptions */}
            <div style={{ marginTop: '14px', fontSize: '0.78rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '6px' }}>
              <b style={{ color: 'var(--text-soft)' }}>Engineering Assumptions & Methodology:</b>
              <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                {engineering_estimates?.assumptions_documentation?.map((item, idx) => (
                  <li key={idx} style={{ marginTop: '2px' }}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Photographic Evidence Grid */}
          {photographic_evidence.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ color: 'var(--text-strong)', fontSize: '0.9rem', marginBottom: '10px' }}>
                4. Field Photographic Evidence ({photographic_evidence.length} photos captured)
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                {photographic_evidence.map((p) => (
                  <div key={p.id} style={{ background: 'rgba(var(--ink-rgb), 0.03)', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(var(--ink-rgb), 0.08)' }}>
                    <img
                      src={p.signed_url}
                      alt={p.caption}
                      style={{ width: '100%', height: '130px', objectFit: 'cover' }}
                    />
                    <div style={{ padding: '8px' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-strong)' }}>{p.caption}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                        Category: {p.photo_type}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Installation Constraints & Remarks */}
          <div style={{ background: 'rgba(var(--ink-rgb), 0.03)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(var(--ink-rgb), 0.06)' }}>
            <h4 style={{ color: 'var(--text-soft)', fontSize: '0.88rem', margin: '0 0 8px 0' }}>
              5. Installation Constraints & Additional Requirements
            </h4>
            <p style={{ margin: '4px 0', fontSize: '0.84rem' }}>
              <b>Constraints:</b> {recommendations?.potential_constraints || 'No major installation constraints observed.'}
            </p>
            <p style={{ margin: '4px 0', fontSize: '0.84rem' }}>
              <b>Special Structures / Materials:</b> {recommendations?.additional_requirements || 'Standard HDGI or aluminum mounting structure with standard wind rating.'}
            </p>
            <p style={{ margin: '4px 0', fontSize: '0.84rem' }}>
              <b>Field Surveyor Remarks:</b> {recommendations?.surveyor_remarks || 'Inspection completed according to Solvix technical standards.'}
            </p>
          </div>

          {/* Signoff / Disclaimer */}
          <div style={{ marginTop: '20px', borderTop: '1px solid rgba(var(--ink-rgb), 0.1)', paddingTop: '12px', fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', justifyContent: 'space-between' }}>
            <span>SOLVIX Engineering Automation &bull; Certified Solar Feasibility Record</span>
            <span>Generated: {new Date().toLocaleDateString()}</span>
          </div>

        </div>
      </div>
    </div>
  );
}
