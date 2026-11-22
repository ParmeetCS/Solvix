// Deterministic helpers for the AI quotation agent. Nothing here calls a model.
// They are used (a) as the agent's tools, (b) to double-check what the agent
// proposes, and (c) as the fallback when no Gemini key is configured.

const SYSTEM_TYPES = ['on-grid', 'off-grid', 'hybrid'];
const PANEL_WATT = 550; // catalogue panel (SP-550)
const AREA_PER_KW_SQM = 10; // roof area a rooftop kW needs

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export function normaliseSystemType(value) {
  const v = String(value || '').toLowerCase().replace(/_/g, '-').trim();
  return SYSTEM_TYPES.includes(v) ? v : null;
}

/**
 * Work out what to quote from everything we know. Priority: the approved survey's
 * recommendation, then the survey's own measurements, then the lead's request.
 */
export function recommendSpec({ survey = {}, report = {}, lead = {} } = {}) {
  const reasons = [];

  let systemType =
    normaliseSystemType(survey.recommended_system_type) ||
    normaliseSystemType(report.recommended_system_type) ||
    normaliseSystemType(lead.system_type) ||
    null;
  if (systemType) reasons.push(`System type ${systemType} comes from the survey/lead.`);
  else {
    systemType = 'on-grid';
    reasons.push('No system type was recorded, so the common on-grid type is assumed.');
  }

  let capacity =
    num(survey.recommended_capacity_kw) ??
    num(report.recommended_capacity_kw) ??
    num(lead.expected_capacity_kw);
  if (capacity) reasons.push(`Capacity ${capacity} kW comes from the survey/lead recommendation.`);

  // Never recommend more than the roof can hold.
  const usableArea = num(survey.available_installation_area_sqm) ?? num(survey.estimated_usable_area_sqm) ?? num(survey.roof_area_sqm);
  const roofLimit = usableArea ? Math.floor(usableArea / AREA_PER_KW_SQM) : null;
  if (!capacity && roofLimit) {
    capacity = Math.max(1, roofLimit);
    reasons.push(`No recommendation recorded; ${usableArea} sq m of usable roof supports about ${roofLimit} kW.`);
  }
  if (capacity && roofLimit && capacity > roofLimit) {
    reasons.push(`Reduced from ${capacity} kW to ${roofLimit} kW because only ${usableArea} sq m of roof is usable.`);
    capacity = Math.max(1, roofLimit);
  }
  // Use the monthly bill as a sanity estimate (about Rs 8 per unit, 120 units per kW per month).
  const bill = num(lead.monthly_electricity_bill) ?? num(survey.monthly_electricity_bill);
  if (!capacity && bill) {
    capacity = Math.max(1, Math.round(bill / 8 / 120));
    reasons.push(`Sized from a monthly bill of about Rs ${bill}.`);
  }
  if (!capacity) {
    capacity = 3;
    reasons.push('No sizing data was available, so a 3 kW starter system is proposed.');
  }

  return { system_type: systemType, capacity_kw: capacity, roof_limit_kw: roofLimit, reasons };
}

/**
 * Choose the best catalogue package: same system type, the smallest package that
 * covers the target, otherwise the largest one available. Returns null if none.
 */
export function pickPackage(packages = [], spec) {
  const pool = packages.filter((p) => p.is_active !== false && p.system_type === spec.system_type);
  if (pool.length === 0) return null;
  const sorted = [...pool].sort((a, b) => Number(a.capacity_kw) - Number(b.capacity_kw));
  const covering = sorted.find((p) => Number(p.capacity_kw) >= Number(spec.capacity_kw));
  return covering || sorted[sorted.length - 1];
}

/** Checks a proposed package against the spec. Returns { ok, problems[] }. */
export function checkFit(pkg, spec, { stock = [] } = {}) {
  const problems = [];
  if (!pkg) return { ok: false, problems: ['No package selected.'] };
  if (pkg.system_type !== spec.system_type) problems.push(`Package is ${pkg.system_type} but the site needs ${spec.system_type}.`);
  if (spec.roof_limit_kw && Number(pkg.capacity_kw) > spec.roof_limit_kw) {
    problems.push(`${pkg.capacity_kw} kW is more than the roof can hold (${spec.roof_limit_kw} kW).`);
  }
  const short = stock.filter((s) => s.available < s.needed);
  if (short.length) {
    problems.push(`Low stock for: ${short.map((s) => `${s.name} (need ${s.needed}, have ${s.available})`).join(', ')}.`);
  }
  return { ok: problems.length === 0, problems };
}

export const AI_NOTE_PREFIX = '[AI draft]';

export function buildInternalNote({ spec, pkg, reasoning, mode, warnings = [] }) {
  const lines = [
    `${AI_NOTE_PREFIX} Created by the SOLVIX quotation agent (${mode === 'agent' ? 'Gemini via Google ADK' : 'rule-based mode'}). Review before sending.`,
    `Proposed: ${pkg.name} (${pkg.capacity_kw} kW, ${pkg.system_type}).`,
    ...spec.reasons,
  ];
  if (reasoning) lines.push(`Agent reasoning: ${reasoning}`);
  if (warnings.length) lines.push(`Check: ${warnings.join(' ')}`);
  return lines.join('\n');
}
