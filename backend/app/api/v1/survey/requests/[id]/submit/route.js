import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireSurveyAccess, logSurveyActivity, createNotification } from '@/lib/supabase/surveyAuth';
import { surveyStore } from '@/lib/survey/surveyStore';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * POST /api/v1/survey/requests/[id]/submit
 * Submits the completed digital survey form, marks status as 'submitted',
 * and generates the structured feasibility report.
 */
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const authResult = await requireSurveyAccess(request, { targetSurveyId: id });
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile, adminClient } = authResult;
    const formData = await request.json();

    // Required field validations
    if (!formData.roof_type || !formData.recommended_system_type) {
      return jsonError('Roof type and recommended system type are required for final submission.', 400);
    }

    let result;

    if (adminClient) {
      try {
        const capacity = parseFloat(formData.recommended_capacity_kw || 10);
        const estCost = Math.round(capacity * 42000);

        // Update site_surveys
        const { data: srv, error: srvErr } = await adminClient
          .from('site_surveys')
          .update({
            property_type: formData.property_type,
            electricity_connection_type: formData.electricity_connection_type,
            monthly_electricity_bill: formData.monthly_electricity_bill ? parseFloat(formData.monthly_electricity_bill) : null,
            sanctioned_load_kw: formData.sanctioned_load_kw ? parseFloat(formData.sanctioned_load_kw) : null,
            consumer_number: formData.consumer_number,
            meter_number: formData.meter_number,
            site_address: formData.site_address,
            roof_type: formData.roof_type,
            roof_area_sqm: formData.roof_area_sqm ? parseFloat(formData.roof_area_sqm) : null,
            available_installation_area_sqm: formData.available_installation_area_sqm ? parseFloat(formData.available_installation_area_sqm) : null,
            roof_direction: formData.roof_direction || 'south',
            roof_tilt_degrees: formData.roof_tilt_degrees ? parseFloat(formData.roof_tilt_degrees) : null,
            shading_conditions: formData.shading_conditions,
            roof_condition: formData.roof_condition,
            structural_concerns: formData.structural_concerns,
            grid_availability: formData.grid_availability,
            existing_meter_info: formData.existing_meter_info,
            main_panel_condition: formData.main_panel_condition,
            earthing_availability: formData.earthing_availability,
            cable_distance_m: formData.cable_distance_m ? parseFloat(formData.cable_distance_m) : null,
            other_technical_observations: formData.other_technical_observations,
            estimated_usable_area_sqm: formData.estimated_usable_area_sqm ? parseFloat(formData.estimated_usable_area_sqm) : null,
            recommended_capacity_kw: capacity,
            recommended_system_type: formData.recommended_system_type,
            potential_constraints: formData.potential_constraints,
            additional_requirements: formData.additional_requirements,
            surveyor_notes: formData.surveyor_notes,
            status: 'submitted',
            feasibility_status: 'requires_review',
            is_draft: false,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            updated_by: profile.id
          })
          .eq('id', id)
          .select('*')
          .single();

        // Create or update survey_reports record
        const { data: rep, error: repErr } = await adminClient
          .from('survey_reports')
          .upsert({
            survey_id: id,
            report_text: formData.executive_summary || `Technical solar feasibility inspection submitted by ${profile.full_name}.`,
            recommended_capacity_kw: capacity,
            estimated_cost: estCost,
            executive_summary: formData.executive_summary || '',
            feasibility_rating: formData.feasibility_rating || 'feasible',
            shading_assessment: formData.shading_assessment || '',
            electrical_assessment: formData.electrical_assessment || '',
            installation_constraints: formData.potential_constraints || '',
            calculation_assumptions: 'Calculations based on 1 kWp requiring ~10 sqm unshaded roof area. Specific yield ~1,450 kWh/kWp/yr. PR: 78%.',
            submitted_at: new Date().toISOString(),
            submitted_by: profile.id
          })
          .select('*')
          .single();

        if (!srvErr && srv) {
          result = { survey: srv, report: rep };
        }
      } catch (e) {
        // Fall back
      }
    }

    if (!result) {
      result = await surveyStore.submitInspection(id, formData, profile);
    }

    if (!result) {
      return jsonError('Survey not found.', 404);
    }

    // Audit log
    await logSurveyActivity({
      actorId: profile.id,
      action: 'SURVEY_INSPECTION_SUBMITTED',
      surveyId: id,
      metadata: {
        recommended_capacity_kw: formData.recommended_capacity_kw,
        recommended_system_type: formData.recommended_system_type
      }
    });

    return jsonResponse(result, {
      message: 'Site survey inspection and solar feasibility report submitted successfully.'
    });
  } catch (error) {
    return jsonError('Failed to submit survey: ' + error.message, 500);
  }
}
