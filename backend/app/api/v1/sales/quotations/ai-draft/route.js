import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireSalesOrAdmin, logActivity } from '@/lib/supabase/salesAuth';
import { assertUuid } from '@/lib/quotation/data';
import { aiConfig, generateAiQuotationDraft } from '@/lib/ai/quotationAgent';

export async function OPTIONS() {
  return handleOptions();
}

// The agent can take several model calls; give it room.
export const maxDuration = 60;

/** GET /api/v1/sales/quotations/ai-draft - tells the UI which mode the agent is in. */
export async function GET(request) {
  const auth = await requireSalesOrAdmin(request);
  if (auth.error) return jsonError(auth.error, auth.status);
  const { enabled, hasKey, model, mode } = aiConfig();
  return jsonResponse({ enabled, has_key: hasKey, model, mode });
}

/**
 * POST /api/v1/sales/quotations/ai-draft
 * body: { survey_id }
 * Drafts a quotation for an approved survey. Always saves a DRAFT for a person to review.
 */
export async function POST(request) {
  try {
    const auth = await requireSalesOrAdmin(request);
    if (auth.error) return jsonError(auth.error, auth.status);

    const body = await request.json().catch(() => ({}));
    const surveyId = assertUuid(body.survey_id, 'survey_id');

    const result = await generateAiQuotationDraft({
      adminClient: auth.adminClient,
      profile: auth.profile,
      authHeader: request.headers.get('authorization') || '',
      origin: new URL(request.url).origin,
      surveyId,
    });

    await logActivity({
      actorId: auth.profile.id,
      action: 'QUOTATION_AI_DRAFTED',
      entityType: 'quotation',
      entityId: result.bundle?.quotation?.id,
      metadata: {
        survey_id: surveyId,
        mode: result.mode,
        package: result.package?.package_code,
        capacity_kw: result.spec?.capacity_kw,
        system_type: result.spec?.system_type,
        quotation_code: result.bundle?.quotation?.quotation_code,
      },
    });

    return jsonResponse(
      { ...result.bundle, ai: { mode: result.mode, reasoning: result.reasoning, spec: result.spec } },
      {
        status: 201,
        message:
          result.mode === 'agent'
            ? 'AI drafted the quotation. Please review it before sending.'
            : 'Quotation drafted by the rule-based engine (add a Gemini key to enable the AI agent). Please review it.',
      }
    );
  } catch (error) {
    return jsonError(error.message || 'Could not draft the quotation.', error.status || 500);
  }
}
