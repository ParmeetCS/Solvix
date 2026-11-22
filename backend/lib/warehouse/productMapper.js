// Translates between the warehouse screens' product shape and the `products` table.
//
// The screens use flat fields (category as text, status, purchase/selling price, months of
// warranty). The table stores the sale price as base_price, the brand as brand, the stock
// floor as min_stock_level and the active flag as is_active; extra details live in the
// `specifications` JSON column.

const CODE_TO_UI = {
  solar_panels: 'solar_panel',
  solar_inverters: 'inverter',
  batteries: 'battery',
  mounting_structures: 'mounting_structure',
  cables: 'cable',
  electrical_protection: 'protection',
  earthing_equipment: 'protection',
  accessories: 'accessory',
  installation_services: 'accessory',
};

const UI_TO_CODE = {
  solar_panel: 'solar_panels',
  inverter: 'solar_inverters',
  battery: 'batteries',
  mounting_structure: 'mounting_structures',
  cable: 'cables',
  protection: 'electrical_protection',
  accessory: 'accessories',
};

const UNIT_TO_DB = { pcs: 'piece', piece: 'piece', m: 'meter', meter: 'meter', kg: 'kg', set: 'set', box: 'box', roll: 'piece', kw: 'kw', kva: 'kva' };
const UNIT_TO_UI = { piece: 'pcs', meter: 'm', kg: 'kg', set: 'set', box: 'box', kw: 'kw', kva: 'kva' };

const SERIAL_CATEGORIES = ['solar_panels', 'solar_inverters', 'batteries'];

export const PRODUCT_SELECT = '*, category:category_id ( id, name, code )';

/** A products row (with its joined category) in the shape the warehouse screens expect. */
export function toUiProduct(row) {
  const spec = row.specifications && typeof row.specifications === 'object' ? row.specifications : {};
  const code = row.category?.code || '';
  const status = spec.status || (row.is_active === false ? 'inactive' : 'active');
  return {
    ...row,
    category_id: row.category?.id ?? row.category_id ?? null,
    category_name: row.category?.name || 'General',
    category: CODE_TO_UI[code] || code,
    manufacturer: row.brand || row.manufacturer || '',
    unit: UNIT_TO_UI[row.unit] || row.unit || 'pcs',
    purchase_price: Number(spec.purchase_price ?? row.purchase_price ?? row.base_price ?? 0),
    selling_price: Number(row.selling_price ?? row.base_price ?? 0),
    status,
    min_stock_threshold: Number(row.min_stock_level ?? 0),
    requires_serial_number: spec.requires_serial_number ?? SERIAL_CATEGORIES.includes(code),
    warranty_months: Number(row.warranty_years || 0) * 12,
    specifications: spec,
  };
}

/** Looks up product_categories.id for a screen category value such as "solar_panel". */
export async function categoryIdFor(adminClient, uiCategory) {
  if (!uiCategory) return null;
  const code = UI_TO_CODE[uiCategory] || uiCategory;
  const { data } = await adminClient.from('product_categories').select('id').eq('code', code).maybeSingle();
  return data?.id || null;
}

/** Columns to write to `products` from a screen form body (only the ones that are present). */
export async function toDbProduct(adminClient, body) {
  const out = {};
  const has = (k) => body[k] !== undefined && body[k] !== null && body[k] !== '';

  if (has('sku')) out.sku = String(body.sku).trim().toUpperCase();
  if (has('name')) out.name = String(body.name).trim();
  if (body.description !== undefined) out.description = body.description || '';
  if (body.manufacturer !== undefined) out.brand = body.manufacturer || null;
  if (has('unit')) out.unit = UNIT_TO_DB[String(body.unit).toLowerCase()] || 'piece';
  if (has('selling_price')) out.base_price = Number(body.selling_price) || 0;
  if (has('min_stock_threshold') || has('min_stock_level')) out.min_stock_level = Number(body.min_stock_threshold ?? body.min_stock_level) || 0;
  if (has('warranty_months')) out.warranty_years = Math.ceil((Number(body.warranty_months) || 0) / 12);
  else if (has('warranty_years')) out.warranty_years = Number(body.warranty_years) || 0;
  if (has('status')) out.is_active = body.status === 'active';

  if (has('category')) {
    const id = await categoryIdFor(adminClient, body.category);
    if (id) out.category_id = id;
  } else if (has('category_id') && /^[0-9a-f-]{36}$/i.test(String(body.category_id))) {
    out.category_id = body.category_id;
  }

  // Details the table has no column for are kept in the specifications JSON.
  const spec = { ...(body.specifications && typeof body.specifications === 'object' ? body.specifications : {}) };
  if (has('purchase_price')) spec.purchase_price = Number(body.purchase_price) || 0;
  if (body.requires_serial_number !== undefined) spec.requires_serial_number = Boolean(body.requires_serial_number);
  if (has('status')) spec.status = body.status;
  out.specifications = spec;
  return out;
}
