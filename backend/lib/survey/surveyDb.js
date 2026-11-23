// Survey details read from the database, shaped for the survey screens,
// so every survey screen (detail, report, photos) works on the real records.

/** Photos are stored as a data URL or link in storage_path; the screens read signed_url. */
export function photoView(row) {
  const path = row.storage_path || '';
  const direct = /^(data:|https?:)/i.test(path) ? path : '';
  return { ...row, signed_url: row.signed_url || direct, file_name: row.file_name || row.caption };
}

/** Survey row with the customer details filled in from its lead when the survey itself has none. */
function fillFromLead(survey, lead) {
  if (!lead) return survey;
  return {
    ...survey,
    customer_name: survey.customer_name || lead.customer_name || '',
    contact_phone: survey.contact_phone || lead.phone || '',
    contact_email: survey.contact_email || lead.email || '',
    site_address: survey.site_address || lead.address || '',
    monthly_electricity_bill: survey.monthly_electricity_bill ?? lead.monthly_electricity_bill ?? null,
  };
}

export async function loadSurveyDetail(db, id) {
  const { data: survey, error } = await db
    .from('site_surveys')
    .select(`
      *,
      assigned_profile:assigned_to ( id, full_name, email, phone ),
      lead:lead_id ( id, lead_code, customer_name, phone, email, address, expected_capacity_kw, monthly_electricity_bill ),
      customer:customer_id ( id, customer_code, contact_name, phone, email )
    `)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!survey) return null;

  const [assignmentsRes, photosRes, reportsRes, approvalsRes] = await Promise.all([
    db.from('survey_assignments').select('*').eq('survey_id', id).order('assigned_at', { ascending: false }),
    db.from('survey_photos').select('*').eq('survey_id', id).order('uploaded_at', { ascending: false }),
    db.from('survey_reports').select('*').eq('survey_id', id).order('created_at', { ascending: false }),
    db.from('survey_approvals').select('*').eq('survey_id', id).order('created_at', { ascending: false }),
  ]);

  return {
    survey: fillFromLead(survey, survey.lead),
    assignments: assignmentsRes.data || [],
    photos: (photosRes.data || []).map(photoView),
    report: (reportsRes.data && reportsRes.data[0]) || null,
    approvals: approvalsRes.data || [],
  };
}
