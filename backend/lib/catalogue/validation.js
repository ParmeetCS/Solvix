// Validation helpers for Admin catalogue management.
import { ApiError } from '../quotation/errors.js';

export const PRODUCT_UNITS = ['piece', 'kw', 'kva', 'meter', 'set', 'kg', 'box'];
export const ITEM_TYPES = ['product', 'installation', 'service', 'other'];
export const SYSTEM_TYPES = ['on-grid', 'off-grid', 'hybrid'];

export function normaliseProductPayload(body, { partial = false } = {}) {
  const out = {};

  const assign = (key, value) => {
    if (value !== undefined) out[key] = value;
  };

  if (body.sku !== undefined || !partial) {
    const sku = String(body.sku || '').trim().toUpperCase();
    if (!sku) throw new ApiError('SKU is required.', 400);
    out.sku = sku;
  }

  if (body.name !== undefined || !partial) {
    const name = String(body.name || '').trim();
    if (!name) throw new ApiError('Product name is required.', 400);
    out.name = name;
  }

  if (body.category_id !== undefined) out.category_id = body.category_id || null;
  if (body.description !== undefined) out.description = body.description || null;
  if (body.brand !== undefined) out.brand = body.brand || null;
  if (body.model_number !== undefined) out.model_number = body.model_number || null;
  if (body.hsn_code !== undefined) out.hsn_code = body.hsn_code || null;

  if (body.unit !== undefined || !partial) {
    const unit = body.unit || 'piece';
    if (!PRODUCT_UNITS.includes(unit)) throw new ApiError('Invalid product unit.', 400);
    out.unit = unit;
  }

  if (body.base_price !== undefined || !partial) {
    const price = Number(body.base_price ?? 0);
    if (!Number.isFinite(price) || price < 0) throw new ApiError('Base price must be zero or greater.', 400);
    out.base_price = Math.round(price * 100) / 100;
  }

  if (body.warranty_years !== undefined) {
    const years = Number(body.warranty_years ?? 0);
    if (!Number.isInteger(years) || years < 0) throw new ApiError('Warranty years must be a non-negative integer.', 400);
    out.warranty_years = years;
  }

  if (body.min_stock_level !== undefined) {
    const stock = Number(body.min_stock_level ?? 0);
    if (!Number.isFinite(stock) || stock < 0) throw new ApiError('Minimum stock level must be zero or greater.', 400);
    out.min_stock_level = stock;
  }

  if (body.tax_rate !== undefined || !partial) {
    const tax = Number(body.tax_rate ?? 0);
    if (!Number.isFinite(tax) || tax < 0 || tax > 100) throw new ApiError('Tax rate must be between 0 and 100.', 400);
    out.tax_rate = tax;
  }

  if (body.system_types !== undefined) {
    if (!Array.isArray(body.system_types)) throw new ApiError('System types must be an array.', 400);
    const invalid = body.system_types.filter((value) => !SYSTEM_TYPES.includes(value));
    if (invalid.length) throw new ApiError('Invalid system type: ' + invalid.join(', '), 400);
    out.system_types = [...new Set(body.system_types)];
  }

  if (body.item_type !== undefined || !partial) {
    const itemType = body.item_type || 'product';
    if (!ITEM_TYPES.includes(itemType)) throw new ApiError('Invalid item type.', 400);
    out.item_type = itemType;
  }

  if (body.is_active !== undefined) out.is_active = Boolean(body.is_active);
  if (body.is_quotable !== undefined) out.is_quotable = Boolean(body.is_quotable);

  if (body.specifications !== undefined) {
    if (body.specifications === null) out.specifications = {};
    else if (typeof body.specifications !== 'object' || Array.isArray(body.specifications)) {
      throw new ApiError('Specifications must be a JSON object.', 400);
    } else out.specifications = body.specifications;
  }

  out.updated_at = new Date().toISOString();
  return out;
}

export function normalisePackagePayload(body) {
  const packageCode = String(body.package_code || body.code || '').trim().toUpperCase();
  const name = String(body.name || '').trim();
  const systemType = body.system_type;
  const capacity = Number(body.capacity_kw);
  const items = body.items;

  if (!packageCode) throw new ApiError('Package code is required.', 400);
  if (!name) throw new ApiError('Package name is required.', 400);
  if (!SYSTEM_TYPES.includes(systemType)) throw new ApiError('Invalid package system type.', 400);
  if (!Number.isFinite(capacity) || capacity < 1 || capacity > 5) {
    throw new ApiError('Package capacity must be between 1 and 5 kW.', 400);
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError('A package must contain at least one component.', 400);
  }

  const normalisedItems = items.map((item, index) => {
    if (!item?.product_id) throw new ApiError(`Component ${index + 1} needs a product.`, 400);
    const quantity = Number(item.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new ApiError(`Component ${index + 1} quantity must be greater than zero.`, 400);
    }
    return {
      product_id: item.product_id,
      quantity,
      is_optional: Boolean(item.is_optional),
      notes: item.notes || null,
    };
  });

  const tax = Number(body.tax_rate ?? 0);
  if (!Number.isFinite(tax) || tax < 0 || tax > 100) throw new ApiError('Package tax rate must be between 0 and 100.', 400);

  return {
    package_code: packageCode,
    name,
    system_type: systemType,
    capacity_kw: capacity,
    description: body.description || null,
    tax_rate: tax,
    warranty_terms: body.warranty_terms || null,
    is_active: body.is_active === undefined ? true : Boolean(body.is_active),
    items: normalisedItems,
  };
}

export default { normaliseProductPayload, normalisePackagePayload, PRODUCT_UNITS, ITEM_TYPES, SYSTEM_TYPES };
