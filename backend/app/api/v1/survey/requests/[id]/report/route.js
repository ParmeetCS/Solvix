import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireSurveyAccess, logSurveyActivity } from '@/lib/supabase/surveyAuth';
import { surveyStore } from '@/lib/survey/surveyStore';
import { loadSurveyDetail, photoView } from '@/lib/survey/surveyDb';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/survey/requests/[id]/report
 * Retrieves structured solar feasibility report for customer and technical presentation.
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const authResult = await requireSurveyAccess(request, { targetSurveyId: id });
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const detail = authResult.adminClient
      ? await loadSurveyDetail(authResult.adminClient, id)
      : await surveyStore.getSurveyById(id);
    if (!detail) {
      return jsonError('Survey request not found.', 404);
    }

    const { survey, photos, report, approvals } = detail;

    // Structured solar engineering calculations with transparent assumptions
    const measuredRoofArea = Number(survey.roof_area_sqm || 0);
    const availableArea = Number(survey.available_installation_area_sqm || survey.estimated_usable_area_sqm || measuredRoofArea * 0.75);
    const recommendedKw = Number(survey.recommended_capacity_kw || Math.floor(availableArea / 10) || 5);
    const estCost = Math.round(recommendedKw * 42000); // Standard benchmark rate

    // Standard Solar PV engineering metrics (explicitly documented assumptions)
    const dailyPeakSunHours = 4.8; // Central/North India long-term average
    const performanceRatio = 0.78; // Standard PR accounting for inverter losses, temperature coefficient & dust
    const annualGenerationKwh = Math.round(recommendedKw * dailyPeakSunHours * 365 * performanceRatio);
    const monthlyAverageGenerationKwh = Math.round(annualGenerationKwh / 12);
    const co2OffsetTonnesPerYear = ((annualGenerationKwh * 0.82) / 1000).toFixed(1); // CEA baseline emission factor 0.82 kg CO2/kWh

    const structuredReport = {
      survey_id: survey.id,
      survey_code: survey.survey_code,
      created_at: survey.created_at,
      completed_at: survey.completed_at || survey.updated_at,
      feasibility_status: survey.feasibility_status,
      status: survey.status,

      customer: {
        name: survey.customer_name,
        phone: survey.contact_phone,
        email: survey.contact_email,
        site_address: survey.site_address,
        city: survey.city,
        state: survey.state,
        pincode: survey.pincode
      },

      roof_assessment: {
        roof_type: survey.roof_type,
        roof_condition: survey.roof_condition,
        measured_total_roof_area_sqm: measuredRoofArea,
        measured_total_roof_area_sqft: Math.round(measuredRoofArea * 10.764),
        available_installation_area_sqm: availableArea,
        available_installation_area_sqft: Math.round(availableArea * 10.764),
        orientation: survey.roof_direction,
        tilt_degrees: survey.roof_tilt_degrees,
        shading_conditions: survey.shading_conditions,
        structural_concerns: survey.structural_concerns || 'None reported. Statically viable.'
      },

      electrical_assessment: {
        grid_availability: survey.grid_availability,
        connection_type: survey.electricity_connection_type,
        monthly_electricity_bill_inr: survey.monthly_electricity_bill,
        sanctioned_load_kw: survey.sanctioned_load_kw,
        consumer_number: survey.consumer_number,
        existing_meter_info: survey.existing_meter_info,
        main_panel_condition: survey.main_panel_condition,
        earthing_availability: survey.earthing_availability,
        cable_run_distance_m: survey.cable_distance_m,
        other_observations: survey.other_technical_observations
      },

      recommendations: {
        recommended_system_type: survey.recommended_system_type || 'on-grid',
        recommended_capacity_kw: recommendedKw,
        estimated_turnkey_cost_inr: estCost,
        potential_constraints: survey.potential_constraints,
        additional_requirements: survey.additional_requirements,
        surveyor_remarks: survey.surveyor_notes || survey.site_observations
      },

      engineering_estimates: {
        estimated_annual_generation_kwh: annualGenerationKwh,
        estimated_monthly_generation_kwh: monthlyAverageGenerationKwh,
        estimated_co2_offset_tonnes_per_year: co2OffsetTonnesPerYear,
        equivalent_trees_planted: Math.round(annualGenerationKwh * 0.04),
        assumptions_documentation: [
          'Area Requirement: 1 kWp crystalline silicon modules requires ~9.5 to 10 sqm shadow-free area.',
          'Solar Insolation: Based on 4.8 Peak Sun Hours (PSH) per day representative of the site geography.',
          'Performance Ratio (PR): Assumed at 78% factoring thermal derating, cable losses, and inverter conversion efficiency.',
          'Grid Emission Factor: 0.82 kg CO2/kWh as per Central Electricity Authority (CEA) standard baseline.'
        ]
      },

      photographic_evidence: photos,
      approvals_history: approvals
    };

    return jsonResponse(structuredReport);
  } catch (error) {
    return jsonError('Failed to generate feasibility report: ' + error.message, 500);
  }
}
