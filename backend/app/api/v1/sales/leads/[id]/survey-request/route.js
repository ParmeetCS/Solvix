import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireSalesOrAdmin, logActivity } from '@/lib/supabase/salesAuth';

export async function OPTIONS() {
  return handleOptions();
}

function generateSurveyCode() {
  const yr = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `SRV-${yr}-${rand}`;
}

/**
 * POST /api/v1/sales/leads/[id]/survey-request
 * Hand-off for qualified leads: creates a site_surveys request and updates lead status.
 */
export async function POST(request, { params }) {
  try {
    const authResult = await requireSalesOrAdmin(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile, adminClient } = authResult;
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    // Verify lead
    const { data: lead, error: leadErr } = await adminClient
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();

    if (leadErr || !lead) {
      return jsonError('Lead not found.', 404);
    }

    const surveyCode = generateSurveyCode();
    const {
      survey_date = null,
      site_observations = '',
      roof_area_sqm = null,
      roof_direction = 'south'
    } = body;

    const { data: survey, error: surveyErr } = await adminClient
      .from('site_surveys')
      .insert({
        survey_code: surveyCode,
        lead_id: id,
        customer_id: lead.customer_id || null,
        roof_area_sqm: roof_area_sqm ? parseFloat(roof_area_sqm) : null,
        roof_direction: roof_direction || 'south',
        site_observations: site_observations || `Survey requested by ${profile.full_name || 'Sales Rep'}. Notes: ${lead.notes || ''}`,
        feasibility_status: 'pending',
        survey_date: survey_date || null,
        created_by: profile.id,
        updated_by: profile.id
      })
      .select('*')
      .single();

    if (surveyErr) {
      return jsonError('Failed to create site survey request: ' + surveyErr.message, 500);
    }

    // Update lead status to survey_requested
    await adminClient
      .from('leads')
      .update({
        status: 'survey_requested',
        updated_at: new Date().toISOString(),
        updated_by: profile.id
      })
      .eq('id', id);

    // Record interaction
    await adminClient.from('customer_interactions').insert({
      lead_id: id,
      customer_id: lead.customer_id || null,
      interaction_type: 'site_visit',
      subject: `Site Survey Requested (${surveyCode})`,
      summary: `Handoff to technical survey team. Scheduled Date: ${survey_date || 'TBD'}`,
      created_by: profile.id
    });

    await logActivity({
      actorId: profile.id,
      action: 'SURVEY_REQUESTED',
      entityType: 'site_survey',
      entityId: survey.id,
      metadata: { lead_id: id, survey_code: surveyCode, survey_date }
    });

    return jsonResponse(survey, {
      message: `Site survey request ${surveyCode} submitted successfully.`,
      status: 201
    });
  } catch (error) {
    return jsonError('Server error creating survey request: ' + error.message, 500);
  }
}
