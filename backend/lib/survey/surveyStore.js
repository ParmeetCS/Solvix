// Backend Data Store & Helper for Solvix Site Survey & Solar Feasibility Module
// Provides seamless operation against Supabase database with realistic memory fallback for local dev.

let memorySurveys = [];

let memoryAssignments = [];

let memoryPhotos = [];

let memoryReports = [];

let memoryApprovals = [];

let memorySurveyors = [];

export const surveyStore = {
  getSurveys: async ({ search = '', status = '', priority = '', assigned_to = '', date = '' } = {}) => {
    let list = [...memorySurveys];

    if (status && status !== 'all') {
      list = list.filter(s => s.status === status);
    }
    if (priority && priority !== 'all') {
      list = list.filter(s => s.priority === priority);
    }
    if (assigned_to && assigned_to !== 'all') {
      list = list.filter(s => s.assigned_to === assigned_to);
    }
    if (date) {
      list = list.filter(s => s.scheduled_date === date || s.survey_date === date);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.survey_code?.toLowerCase().includes(q) ||
        s.customer_name?.toLowerCase().includes(q) ||
        s.site_address?.toLowerCase().includes(q) ||
        s.city?.toLowerCase().includes(q) ||
        s.contact_phone?.toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  getSurveyById: async (id) => {
    const survey = memorySurveys.find(s => s.id === id || s.survey_code === id);
    if (!survey) return null;

    const assignments = memoryAssignments.filter(a => a.survey_id === survey.id);
    const photos = memoryPhotos.filter(p => p.survey_id === survey.id);
    const report = memoryReports.find(r => r.survey_id === survey.id) || null;
    const approvals = memoryApprovals.filter(ap => ap.survey_id === survey.id);

    return {
      survey,
      assignments,
      photos,
      report,
      approvals
    };
  },

  createSurvey: async (data, userProfile) => {
    const yr = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    const code = `SRV-${yr}-${rand}`;

    const newSurvey = {
      id: `s-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      survey_code: code,
      lead_id: data.lead_id || null,
      customer_id: data.customer_id || null,
      customer_name: data.customer_name || 'Valued Customer',
      contact_phone: data.contact_phone || '',
      contact_email: data.contact_email || '',
      site_address: data.site_address || '',
      city: data.city || 'Delhi NCR',
      state: data.state || 'Delhi',
      pincode: data.pincode || '',
      property_type: data.property_type || 'residential',
      electricity_connection_type: data.electricity_connection_type || 'three_phase',
      monthly_electricity_bill: data.monthly_electricity_bill ? Number(data.monthly_electricity_bill) : 0,
      sanctioned_load_kw: data.sanctioned_load_kw ? Number(data.sanctioned_load_kw) : 0,
      consumer_number: data.consumer_number || '',
      meter_number: data.meter_number || '',
      roof_type: data.roof_type || 'rcc_flat',
      roof_area_sqm: data.roof_area_sqm ? Number(data.roof_area_sqm) : 0,
      available_installation_area_sqm: data.available_installation_area_sqm ? Number(data.available_installation_area_sqm) : 0,
      roof_direction: data.roof_direction || 'south',
      roof_tilt_degrees: data.roof_tilt_degrees ? Number(data.roof_tilt_degrees) : 0,
      shading_conditions: data.shading_conditions || 'none',
      roof_condition: data.roof_condition || 'good',
      structural_concerns: data.structural_concerns || '',
      grid_availability: data.grid_availability || 'stable',
      existing_meter_info: data.existing_meter_info || '',
      main_panel_condition: data.main_panel_condition || 'good',
      earthing_availability: data.earthing_availability || 'adequate',
      cable_distance_m: data.cable_distance_m ? Number(data.cable_distance_m) : 20,
      other_technical_observations: data.other_technical_observations || '',
      estimated_usable_area_sqm: data.estimated_usable_area_sqm ? Number(data.estimated_usable_area_sqm) : 0,
      recommended_capacity_kw: data.recommended_capacity_kw ? Number(data.recommended_capacity_kw) : 0,
      recommended_system_type: data.recommended_system_type || 'on-grid',
      potential_constraints: data.potential_constraints || '',
      additional_requirements: data.additional_requirements || '',
      feasibility_status: 'pending',
      status: 'pending',
      priority: data.priority || 'medium',
      survey_date: data.survey_date || null,
      scheduled_date: data.scheduled_date || data.survey_date || null,
      scheduled_time: data.scheduled_time || null,
      assigned_to: data.assigned_to || null,
      assigned_to_name: data.assigned_to_name || null,
      is_draft: false,
      draft_data: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      site_observations: data.site_observations || 'Survey initiated by Sales team.',
      created_by: userProfile?.id || null
    };

    memorySurveys.unshift(newSurvey);
    return newSurvey;
  },

  updateSurvey: async (id, updates, userProfile) => {
    const idx = memorySurveys.findIndex(s => s.id === id);
    if (idx === -1) return null;

    memorySurveys[idx] = {
      ...memorySurveys[idx],
      ...updates,
      updated_at: new Date().toISOString(),
      updated_by: userProfile?.id || memorySurveys[idx].updated_by
    };

    return memorySurveys[idx];
  },

  assignSurvey: async (id, { assigned_to, scheduled_date, scheduled_time, notes }, userProfile) => {
    const survey = memorySurveys.find(s => s.id === id);
    if (!survey) return null;

    const surveyor = memorySurveyors.find(sr => sr.id === assigned_to);
    const surveyorName = surveyor ? surveyor.full_name : 'Assigned Engineer';

    survey.assigned_to = assigned_to;
    survey.assigned_to_name = surveyorName;
    if (scheduled_date) {
      survey.scheduled_date = scheduled_date;
      survey.survey_date = scheduled_date;
    }
    if (scheduled_time) {
      survey.scheduled_time = scheduled_time;
    }
    survey.status = scheduled_date ? 'scheduled' : 'assigned';
    survey.updated_at = new Date().toISOString();

    const assignmentRecord = {
      id: `asg-${Date.now()}`,
      survey_id: id,
      assigned_to,
      assigned_to_name: surveyorName,
      assigned_by: userProfile?.id || null,
      assigned_by_name: userProfile?.full_name || 'Survey Manager',
      assigned_at: new Date().toISOString(),
      scheduled_at: scheduled_date ? `${scheduled_date}T${scheduled_time ? scheduled_time.split(' ')[0] : '10:00'}:00Z` : null,
      status: 'assigned',
      is_active: true,
      notes: notes || 'Site survey assigned.'
    };

    memoryAssignments.unshift(assignmentRecord);
    return { survey, assignment: assignmentRecord };
  },

  scheduleSurvey: async (id, { scheduled_date, scheduled_time, site_address }, userProfile) => {
    const survey = memorySurveys.find(s => s.id === id);
    if (!survey) return null;

    survey.scheduled_date = scheduled_date;
    survey.survey_date = scheduled_date;
    if (scheduled_time) survey.scheduled_time = scheduled_time;
    if (site_address) survey.site_address = site_address;
    survey.status = 'scheduled';
    survey.updated_at = new Date().toISOString();

    return survey;
  },

  saveDraft: async (id, formData, userProfile) => {
    const survey = memorySurveys.find(s => s.id === id);
    if (!survey) return null;

    survey.draft_data = formData;
    survey.is_draft = true;
    survey.status = 'in_progress';
    survey.updated_at = new Date().toISOString();

    // Also update core fields if present in formData
    Object.keys(formData).forEach(key => {
      if (key in survey && formData[key] !== undefined) {
        survey[key] = formData[key];
      }
    });

    return survey;
  },

  submitInspection: async (id, formData, userProfile) => {
    const survey = memorySurveys.find(s => s.id === id);
    if (!survey) return null;

    Object.assign(survey, formData);
    survey.is_draft = false;
    survey.status = 'submitted';
    survey.completed_at = new Date().toISOString();
    survey.updated_at = new Date().toISOString();

    // Auto-create/update Feasibility Report record
    const existingReportIdx = memoryReports.findIndex(r => r.survey_id === id);
    const capacity = Number(formData.recommended_capacity_kw || survey.recommended_capacity_kw || 10);
    const estCost = Math.round(capacity * 42000); // Rule of thumb: ~₹42,000/kWp for commercial/residential turnkey
    const usableArea = Number(formData.available_installation_area_sqm || formData.estimated_usable_area_sqm || capacity * 10);

    const reportData = {
      id: existingReportIdx >= 0 ? memoryReports[existingReportIdx].id : `rep-${Date.now()}`,
      survey_id: id,
      survey_code: survey.survey_code,
      report_title: `Solar Feasibility Assessment — ${survey.customer_name}`,
      feasibility_rating: formData.feasibility_rating || 'feasible',
      recommended_capacity_kw: capacity,
      recommended_system_type: formData.recommended_system_type || survey.recommended_system_type || 'on-grid',
      estimated_cost: estCost,
      estimated_usable_area_sqm: usableArea,
      measured_roof_area_sqm: Number(formData.roof_area_sqm || survey.roof_area_sqm || 100),
      executive_summary: formData.executive_summary || `Comprehensive site inspection conducted on ${new Date().toLocaleDateString()}. The rooftop exhibits high solar generation potential with a recommended capacity of ${capacity} kWp ${formData.recommended_system_type || 'on-grid'} system.`,
      shading_assessment: formData.shading_assessment || `Shading condition recorded as: ${formData.shading_conditions || survey.shading_conditions || 'None'}. Orientation: ${formData.roof_direction || survey.roof_direction || 'South'}.`,
      electrical_assessment: formData.electrical_assessment || `Grid availability: ${formData.grid_availability || survey.grid_availability || 'Stable'}. Connection: ${formData.electricity_connection_type || survey.electricity_connection_type || 'Three Phase'}. Main panel condition: ${formData.main_panel_condition || survey.main_panel_condition || 'Good'}.`,
      installation_constraints: formData.potential_constraints || 'Standard installation procedures apply.',
      calculation_assumptions: 'Calculations based on 1 kWp requiring ~10 sqm unshaded roof area. Estimated annual specific yield: 1,450 kWh/kWp based on standard 4.8 PSH/day. Performance ratio: 78%.',
      submitted_at: new Date().toISOString(),
      submitted_by: userProfile?.id || null,
      submitted_by_name: userProfile?.full_name || 'Survey Specialist'
    };

    if (existingReportIdx >= 0) {
      memoryReports[existingReportIdx] = reportData;
    } else {
      memoryReports.unshift(reportData);
    }

    return { survey, report: reportData };
  },

  addPhoto: async (id, photoData, userProfile) => {
    const newPhoto = {
      id: `p-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      survey_id: id,
      storage_path: photoData.storage_path || `surveys/${id}/${photoData.file_name}`,
      photo_type: photoData.photo_type || 'site',
      caption: photoData.caption || 'Site Photograph',
      description: photoData.description || '',
      file_name: photoData.file_name || 'photo.jpg',
      file_size_bytes: photoData.file_size_bytes || 1024000,
      file_type: photoData.file_type || 'image/jpeg',
      uploaded_at: new Date().toISOString(),
      uploaded_by: userProfile?.id || null,
      signed_url: photoData.signed_url || 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80'
    };

    memoryPhotos.unshift(newPhoto);
    return newPhoto;
  },

  deletePhoto: async (photoId) => {
    const idx = memoryPhotos.findIndex(p => p.id === photoId);
    if (idx !== -1) {
      memoryPhotos.splice(idx, 1);
      return true;
    }
    return false;
  },

  reviewSurvey: async (id, { action, comments, revisit_notes, rejection_reason }, userProfile) => {
    const survey = memorySurveys.find(s => s.id === id);
    if (!survey) return null;

    let newStatus = 'approved';
    let approvalStatus = 'approved';

    if (action === 'approve') {
      newStatus = 'approved';
      approvalStatus = 'approved';
      survey.feasibility_status = 'approved';
    } else if (action === 'reject') {
      newStatus = 'rejected';
      approvalStatus = 'rejected';
      survey.feasibility_status = 'rejected';
      survey.rejection_reason = rejection_reason || comments;
    } else if (action === 'revisit' || action === 'revision_requested') {
      newStatus = 'revisit_required';
      approvalStatus = 'revisit_required';
      survey.feasibility_status = 'requires_review';
      survey.revisit_notes = revisit_notes || comments;
    }

    survey.status = newStatus;
    survey.updated_at = new Date().toISOString();

    const approvalRecord = {
      id: `app-${Date.now()}`,
      survey_id: id,
      status: approvalStatus,
      reviewed_by: userProfile?.id || null,
      reviewer_name: userProfile?.full_name || 'Technical Reviewer',
      reviewed_at: new Date().toISOString(),
      comments: comments || `${action.toUpperCase()} by ${userProfile?.full_name || 'Reviewer'}`
    };

    memoryApprovals.unshift(approvalRecord);
    return { survey, approval: approvalRecord };
  },

  getDashboardMetrics: async () => {
    const totalRequests = memorySurveys.length;
    const pending = memorySurveys.filter(s => s.status === 'pending').length;
    const assigned = memorySurveys.filter(s => s.status === 'assigned').length;
    const inProgress = memorySurveys.filter(s => s.status === 'in_progress').length;
    const submitted = memorySurveys.filter(s => s.status === 'submitted').length;
    const approved = memorySurveys.filter(s => s.status === 'approved').length;
    const rejected = memorySurveys.filter(s => s.status === 'rejected').length;
    const revisitRequired = memorySurveys.filter(s => s.status === 'revisit_required').length;

    const todayStr = new Date().toISOString().split('T')[0];
    const scheduledToday = memorySurveys.filter(s => s.scheduled_date === todayStr || s.survey_date === todayStr).length;

    // Status breakdown chart data
    const statusDistribution = [
      { name: 'Pending', count: pending, color: '#f59e0b' },
      { name: 'Assigned', count: assigned, color: '#3b82f6' },
      { name: 'Scheduled Today', count: scheduledToday, color: '#06b6d4' },
      { name: 'In Progress', count: inProgress, color: '#8b5cf6' },
      { name: 'Submitted', count: submitted, color: '#ec4899' },
      { name: 'Approved', count: approved, color: '#10b981' },
      { name: 'Rejected', count: rejected, color: '#ef4444' },
      { name: 'Revisit Required', count: revisitRequired, color: '#f97316' },
    ];

    // Recent assignments
    const recentAssignments = memoryAssignments.slice(0, 5).map(asg => {
      const srv = memorySurveys.find(s => s.id === asg.survey_id);
      return {
        ...asg,
        survey_code: srv?.survey_code || 'SRV-REQ',
        customer_name: srv?.customer_name || 'Customer',
        site_address: srv?.site_address || '',
        priority: srv?.priority || 'medium'
      };
    });

    // Upcoming scheduled surveys
    const upcomingSurveys = memorySurveys
      .filter(s => s.scheduled_date && (s.status === 'scheduled' || s.status === 'assigned'))
      .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date))
      .slice(0, 5);

    return {
      kpis: {
        totalRequests,
        pending,
        assigned,
        scheduledToday,
        inProgress,
        submitted,
        approved,
        rejected,
        revisitRequired
      },
      statusDistribution,
      recentAssignments,
      upcomingSurveys,
      surveyorsWorkload: memorySurveyors
    };
  },

  getSurveyors: async () => {
    // Recalculate dynamic workload counts
    return memorySurveyors.map(sr => {
      const activeCount = memorySurveys.filter(
        s => s.assigned_to === sr.id && ['assigned', 'scheduled', 'in_progress'].includes(s.status)
      ).length;
      return {
        ...sr,
        active_surveys: activeCount
      };
    });
  }
};
