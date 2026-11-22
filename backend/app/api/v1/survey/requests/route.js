import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireSurveyAccess, logSurveyActivity } from '@/lib/supabase/surveyAuth';
import { surveyStore } from '@/lib/survey/surveyStore';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/survey/requests
 * Lists site survey requests with filtering and search.
 */
export async function GET(request) {
  try {
    const authResult = await requireSurveyAccess(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile, isAdmin, isSurveyManager, isSurveyor, adminClient } = authResult;
    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const priority = searchParams.get('priority') || '';
    const assignedTo = searchParams.get('assigned_to') || '';
    const date = searchParams.get('date') || '';

    // If live Supabase client exists, query site_surveys
    if (adminClient) {
      try {
        let query = adminClient
          .from('site_surveys')
          .select(`
            *,
            assigned_profile:assigned_to ( id, full_name, email, phone ),
            lead:lead_id ( id, lead_code, customer_name, phone, address ),
            customer:customer_id ( id, customer_code, contact_name, phone )
          `)
          .order('created_at', { ascending: false });

        // Surveyor role: view assigned surveys only (unless admin or manager)
        if (!isAdmin && !isSurveyManager && isSurveyor) {
          query = query.eq('assigned_to', profile.id);
        } else if (assignedTo && assignedTo !== 'all') {
          query = query.eq('assigned_to', assignedTo);
        }

        if (status && status !== 'all') query = query.eq('status', status);
        if (priority && priority !== 'all') query = query.eq('priority', priority);
        if (date) query = query.eq('scheduled_date', date);

        const { data: surveys, error } = await query;
        if (!error && surveys && surveys.length > 0) {
          const filled = surveys.map((s) => ({
            ...s,
            customer_name: s.customer_name || s.lead?.customer_name || s.customer?.contact_name || '',
            contact_phone: s.contact_phone || s.lead?.phone || s.customer?.phone || '',
            site_address: s.site_address || s.lead?.address || '',
          }));
          return jsonResponse({ surveys: filled });
        }
      } catch (e) {
        // Fall back to memory store
      }
    }

    let surveys = await surveyStore.getSurveys({
      search,
      status,
      priority,
      assigned_to: (!isAdmin && !isSurveyManager && isSurveyor) ? profile.id : assignedTo,
      date
    });

    return jsonResponse({ surveys });
  } catch (error) {
    return jsonError('Error fetching survey requests: ' + error.message, 500);
  }
}

/**
 * POST /api/v1/survey/requests
 * Create a new site survey request
 */
export async function POST(request) {
  try {
    const authResult = await requireSurveyAccess(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile, adminClient } = authResult;
    const body = await request.json();

    if (!body.customer_name && !body.lead_id) {
      return jsonError('Customer name or Lead ID is required.', 400);
    }

    let newSurvey;

    if (adminClient) {
      try {
        // A survey belongs to a lead. A request typed in by hand has none yet, so reuse the lead with
        // the same phone number or open a new one; that is also what makes it show up on the lead page.
        let leadId = body.lead_id || null;
        let customerId = body.customer_id || null;
        if (!leadId) {
          const phone = String(body.contact_phone || '').trim();
          let lead = null;
          if (phone) {
            const { data: found } = await adminClient.from('leads').select('id, customer_id').eq('phone', phone).order('created_at', { ascending: false }).limit(1);
            lead = found?.[0] || null;
          }
          if (!lead) {
            const { data: created, error: leadError } = await adminClient
              .from('leads')
              .insert({
                lead_code: `LEAD-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
                customer_name: body.customer_name,
                phone: phone || null,
                email: body.contact_email || null,
                address: body.site_address || null,
                source: 'walkin',
                status: 'survey_requested',
                system_type: 'on-grid',
                priority: body.priority || 'medium',
                notes: 'Created from a site survey request.',
                created_by: profile.id,
                updated_by: profile.id,
              })
              .select('id, customer_id')
              .single();
            if (leadError) return jsonError('Could not create the lead for this survey: ' + leadError.message, 400);
            lead = created;
          }
          leadId = lead.id;
          customerId = customerId || lead.customer_id || null;
        }

        const yr = new Date().getFullYear();
        const rand = Math.floor(1000 + Math.random() * 9000);
        const code = `SRV-${yr}-${rand}`;

        const { data, error } = await adminClient
          .from('site_surveys')
          .insert({
            survey_code: code,
            lead_id: leadId,
            customer_id: customerId,
            customer_name: body.customer_name,
            contact_phone: body.contact_phone,
            contact_email: body.contact_email,
            site_address: body.site_address,
            city: body.city || 'Delhi NCR',
            property_type: body.property_type || 'residential',
            electricity_connection_type: body.electricity_connection_type || 'three_phase',
            monthly_electricity_bill: body.monthly_electricity_bill || null,
            status: 'pending',
            priority: body.priority || 'medium',
            scheduled_date: body.scheduled_date || null,
            site_observations: body.site_observations || 'Direct survey request created.',
            created_by: profile.id
          })
          .select('*')
          .single();

        if (error) return jsonError('Could not create the survey request: ' + error.message, 400);
        newSurvey = data;
      } catch (e) {
        return jsonError('Could not create the survey request: ' + (e?.message || 'unknown error'), 500);
      }
    }

    if (!newSurvey) {
      newSurvey = await surveyStore.createSurvey(body, profile);
    }

    await logSurveyActivity({
      actorId: profile.id,
      action: 'SURVEY_REQUEST_CREATED',
      surveyId: newSurvey.id,
      metadata: { survey_code: newSurvey.survey_code, customer_name: newSurvey.customer_name }
    });

    return jsonResponse(newSurvey, {
      message: `Survey request ${newSurvey.survey_code} created successfully.`,
      status: 201
    });
  } catch (error) {
    return jsonError('Error creating survey request: ' + error.message, 500);
  }
}
