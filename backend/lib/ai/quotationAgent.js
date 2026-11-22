import { z } from 'zod';
import { LlmAgent, FunctionTool, InMemoryRunner, isFinalResponse, stringifyContent } from '@google/adk';
import { loadPackageWithItems } from '@/lib/quotation/bom';
import { getApprovedSurvey } from '@/lib/quotation/data';
import { POST as createQuotationRoute } from '@/app/api/v1/sales/quotations/route';
import {
  recommendSpec,
  pickPackage,
  checkFit,
  buildInternalNote,
  normaliseSystemType,
} from './quotationRules';

/**
 * AI quotation agent (Google ADK + Gemini).
 *
 * After a survey is approved, the agent reads the survey, picks a catalogue
 * package, checks stock and the roof limit, and saves a DRAFT quotation through
 * the normal quotation API. Prices and tax are always calculated by the existing
 * server code from the catalogue; the model only chooses what to quote and
 * explains why. A person reviews and sends the draft.
 *
 * Without a Gemini key the same tools run in a rule-based mode, so the feature
 * works (and can be demonstrated) before the key is added.
 */

export function aiConfig() {
  const key = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || '';
  const enabled = String(process.env.AI_QUOTATION_ENABLED ?? 'true').toLowerCase() !== 'false';
  return {
    enabled,
    hasKey: Boolean(key),
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    mode: enabled && key ? 'agent' : 'rules',
  };
}

// ---------- data helpers (read-only) ----------

async function loadContext(adminClient, surveyId) {
  const result = await getApprovedSurvey(adminClient, surveyId);
  if (!result) throw httpError('Site survey not found.', 404);
  const { survey, approved } = result;

  const [{ data: reports }, { data: lead }, { data: customer }] = await Promise.all([
    adminClient.from('survey_reports').select('*').eq('survey_id', surveyId).order('created_at', { ascending: false }).limit(1),
    adminClient.from('leads').select('*').eq('id', survey.lead_id).maybeSingle(),
    survey.customer_id
      ? adminClient.from('customers').select('id, contact_name, email, phone, status').eq('id', survey.customer_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return { survey, approved, report: reports?.[0] || {}, lead: lead || {}, customer: customer || null };
}

async function listPackages(adminClient) {
  const { data, error } = await adminClient
    .from('product_packages')
    .select('id, package_code, name, system_type, capacity_kw, description, is_active')
    .eq('is_active', true)
    .order('capacity_kw', { ascending: true });
  if (error) throw httpError('Could not load packages: ' + error.message, 500);
  return data || [];
}

async function packageStock(adminClient, packageId) {
  const { items } = await loadPackageWithItems(adminClient, packageId);
  const required = items.filter((i) => !i.is_optional && i.product);
  const ids = required.map((i) => i.product_id);
  if (ids.length === 0) return { items: [], stock: [] };
  const { data: inv } = await adminClient.from('inventory').select('product_id, quantity_on_hand, quantity_reserved').in('product_id', ids);
  const available = new Map();
  (inv || []).forEach((r) => {
    available.set(r.product_id, (available.get(r.product_id) || 0) + Number(r.quantity_on_hand) - Number(r.quantity_reserved));
  });
  const stock = required.map((i) => ({
    product_id: i.product_id,
    name: i.product.name,
    needed: Number(i.quantity),
    available: available.get(i.product_id) || 0,
  }));
  return { items: required, stock };
}

function httpError(message, status) {
  const e = new Error(message);
  e.status = status;
  return e;
}

// ---------- the draft creation (guarded, once per run) ----------

async function createDraft({ adminClient, authHeader, origin, ctx, spec, pkg, reasoning, mode, warnings }) {
  const body = {
    customer_id: ctx.survey.customer_id,
    lead_id: ctx.survey.lead_id,
    site_survey_id: ctx.survey.id,
    package_id: pkg.id,
    system_type: pkg.system_type,
    system_capacity_kw: Number(pkg.capacity_kw),
    submit_for_approval: false, // always a draft: a person reviews it
    internal_notes: buildInternalNote({ spec, pkg, reasoning, mode, warnings }),
    customer_notes: reasoning ? `Why this system: ${reasoning}` : null,
  };
  const request = new Request(`${origin}/api/v1/sales/quotations`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: authHeader },
    body: JSON.stringify(body),
  });
  const res = await createQuotationRoute(request);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw httpError(json?.error || json?.message || 'The quotation could not be created.', res.status);
  return json?.data || json;
}

// ---------- main entry ----------

export async function generateAiQuotationDraft({ adminClient, profile, authHeader, origin, surveyId }) {
  const cfg = aiConfig();
  const ctx = await loadContext(adminClient, surveyId);

  if (!ctx.approved) throw httpError('The survey must be approved before a quotation can be drafted.', 409);
  if (!ctx.survey.customer_id) throw httpError('Convert this lead to a customer first, then draft the quotation.', 409);

  const packages = await listPackages(adminClient);
  if (packages.length === 0) throw httpError('The catalogue has no active packages to quote from.', 409);

  const spec = recommendSpec({ survey: ctx.survey, report: ctx.report, lead: ctx.lead });
  let created = null;
  let reasoning = '';
  let mode = 'rules';
  let usedPackage = null;

  async function finalise(pkg, why, warnings = []) {
    if (created) return created; // one draft per run
    const { stock } = await packageStock(adminClient, pkg.id);
    const fit = checkFit(pkg, spec, { stock });
    const allWarnings = [...warnings, ...fit.problems];
    usedPackage = pkg;
    created = await createDraft({ adminClient, authHeader, origin, ctx, spec, pkg, reasoning: why, mode, warnings: allWarnings });
    return created;
  }

  if (cfg.mode === 'agent') {
    try {
      mode = 'agent';
      const tools = [
        new FunctionTool({
          name: 'get_site_context',
          description: 'Returns the approved site survey, the survey report, the lead request and the sizing recommendation computed from them.',
          execute: async () => ({
            survey: pick(ctx.survey, ['survey_code', 'roof_area_sqm', 'roof_direction', 'roof_tilt_degrees', 'shading_info', 'cable_distance_m', 'site_observations', 'recommended_capacity_kw', 'recommended_system_type', 'available_installation_area_sqm', 'roof_type', 'property_type', 'sanctioned_load_kw', 'monthly_electricity_bill']),
            report: pick(ctx.report, ['recommended_capacity_kw', 'recommended_system_type', 'report_text']),
            lead: pick(ctx.lead, ['source', 'notes', 'system_type', 'expected_capacity_kw', 'monthly_electricity_bill', 'estimated_value']),
            computed_recommendation: spec,
          }),
        }),
        new FunctionTool({
          name: 'list_packages',
          description: 'Lists the active catalogue packages (id, name, system_type, capacity_kw).',
          execute: async () => ({ packages }),
        }),
        new FunctionTool({
          name: 'check_package',
          description: 'Checks one package against the site: system type, roof limit and warehouse stock. Always call this before creating the draft.',
          parameters: z.object({ package_id: z.string().describe('The package id from list_packages') }),
          execute: async ({ package_id }) => {
            const pkg = packages.find((p) => p.id === package_id);
            if (!pkg) return { ok: false, problems: ['Unknown package id.'] };
            const { stock } = await packageStock(adminClient, pkg.id);
            return { ...checkFit(pkg, spec, { stock }), stock };
          },
        }),
        new FunctionTool({
          name: 'create_draft_quotation',
          description: 'Saves a DRAFT quotation using the chosen package. Prices and tax are calculated by the server. Call once.',
          parameters: z.object({
            package_id: z.string(),
            reasoning: z.string().describe('2-4 plain sentences explaining why this package suits the customer'),
          }),
          execute: async ({ package_id, reasoning: why }) => {
            const pkg = packages.find((p) => p.id === package_id);
            if (!pkg) return { error: 'Unknown package id.' };
            if (pkg.system_type !== spec.system_type) return { error: `The site needs ${spec.system_type}; pick a matching package.` };
            reasoning = String(why || '').slice(0, 800);
            const out = await finalise(pkg, reasoning);
            return { created: true, quotation_code: out?.quotation?.quotation_code, total_amount: out?.quotation?.total_amount };
          },
        }),
      ];

      const agent = new LlmAgent({
        name: 'solvix_quotation_agent',
        model: cfg.model,
        description: 'Drafts solar quotations from approved site surveys.',
        instruction: [
          'You are the SOLVIX quotation assistant for a rooftop-solar company in India.',
          'Goal: after a site survey is approved, choose the best catalogue package and save a DRAFT quotation.',
          'Steps: (1) call get_site_context, (2) call list_packages, (3) choose the package matching the system type whose capacity covers the recommendation without exceeding the roof limit, (4) call check_package, (5) if it reports problems pick another package when sensible, (6) call create_draft_quotation exactly once with short, honest reasoning.',
          'Rules: only use packages from list_packages. Never invent prices, products or discounts. If stock is low, still create the draft but mention it in the reasoning. Reply with one short sentence when done.',
        ].join('\n'),
        tools,
      });

      const runner = new InMemoryRunner({ agent, appName: 'solvix_quotations' });
      const session = await runner.sessionService.createSession({ appName: 'solvix_quotations', userId: profile.id });
      let finalText = '';
      for await (const event of runner.runAsync({
        userId: profile.id,
        sessionId: session.id,
        newMessage: { role: 'user', parts: [{ text: `Draft a quotation for approved survey ${ctx.survey.survey_code || surveyId}.` }] },
      })) {
        if (isFinalResponse(event)) finalText = stringifyContent(event);
      }
      reasoning = reasoning || finalText;
    } catch (err) {
      // If the model or key fails, fall back to rules instead of leaving the user stuck.
      console.error('AI quotation agent failed, using rules:', err?.message);
      mode = 'rules';
      reasoning = `The AI service was unavailable (${String(err?.message || 'error').slice(0, 120)}); the rule-based engine chose this package.`;
    }
  }

  if (!created) {
    mode = mode === 'agent' ? 'rules' : mode;
    const pkg = pickPackage(packages, spec);
    if (!pkg) throw httpError(`No active ${spec.system_type} package exists in the catalogue.`, 409);
    reasoning = reasoning || `Chose the ${pkg.capacity_kw} kW ${pkg.system_type} package, the closest match to the ${spec.capacity_kw} kW recommendation.`;
    await finalise(pkg, reasoning);
  }

  return { mode, spec, package: usedPackage, bundle: created, reasoning };
}

function pick(obj, keys) {
  const out = {};
  for (const k of keys) if (obj && obj[k] !== undefined && obj[k] !== null && obj[k] !== '') out[k] = obj[k];
  return out;
}

export { normaliseSystemType };
