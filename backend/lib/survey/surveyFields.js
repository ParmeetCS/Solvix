// The inspection form offers a few choices the database columns do not accept
// (for example roof direction "South-West"). Map them to the closest allowed value
// and keep the original wording in the observations, so a submit never fails on a
// dropdown choice.

const DIRECTION_MAP = {
  north: 'north', south: 'south', east: 'east', west: 'west', flat: 'flat', mixed: 'mixed',
  south_west: 'west', south_east: 'east', north_west: 'west', north_east: 'east',
};
const DIRECTION_LABEL = { south_west: 'South-West', south_east: 'South-East', north_west: 'North-West', north_east: 'North-East' };

const num = (value, max) => {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) && Math.abs(n) < max ? n : undefined;
};

export function sanitizeSurveyForm(raw = {}) {
  const f = { ...raw };

  const dir = String(f.roof_direction || '').toLowerCase();
  if (dir) {
    f.roof_direction = DIRECTION_MAP[dir] || undefined;
    if (DIRECTION_LABEL[dir]) {
      const note = `Roof direction: ${DIRECTION_LABEL[dir]}.`;
      f.other_technical_observations = [f.other_technical_observations, note].filter(Boolean).join(' ');
    }
  }

  // keep numbers inside what the numeric columns can hold
  for (const [key, max] of [
    ['monthly_electricity_bill', 1e10], ['sanctioned_load_kw', 1e4], ['roof_area_sqm', 1e8], ['available_installation_area_sqm', 1e8],
    ['roof_tilt_degrees', 1e3], ['cable_distance_m', 1e8], ['estimated_usable_area_sqm', 1e8], ['recommended_capacity_kw', 1e4],
  ]) {
    if (f[key] !== undefined) f[key] = num(f[key], max) ?? '';
  }
  return f;
}
