// Resolve BOM line items against the persisted catalogue.
//
// Product prices always come from the database unless the actor has explicit
// pricing-override permission. Client-submitted product prices are ignored for
// ordinary Sales users. Manual installation/service/other lines are allowed but
// are still validated and recalculated on the server.
import { ApiError } from './errors.js';
import { toMoney, toQuantity } from './calculations.js';

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

export async function loadProductsByIds(adminClient, productIds = []) {
  const ids = unique(productIds);
  if (ids.length === 0) return new Map();

  const { data: products, error } = await adminClient
    .from('products')
    .select(`
      *,
      category:category_id ( id, name, code )
    `)
    .in('id', ids);

  if (error) throw new ApiError('Failed to load catalogue products: ' + error.message, 500);

  return new Map((products || []).map((product) => [product.id, product]));
}

export async function loadPackageWithItems(adminClient, packageId) {
  if (!packageId) return null;

  const { data: pkg, error } = await adminClient
    .from('product_packages')
    .select('*')
    .eq('id', packageId)
    .maybeSingle();

  if (error) throw new ApiError('Failed to load package: ' + error.message, 500);
  if (!pkg) throw new ApiError('Package not found.', 404);

  const { data: packageItems, error: itemsError } = await adminClient
    .from('package_items')
    .select(`
      id, package_id, product_id, quantity, is_optional, notes,
      product:product_id (
        id, sku, name, description, unit, base_price, tax_rate,
        item_type, is_active, is_quotable, hsn_code,
        category:category_id ( id, name, code )
      )
    `)
    .eq('package_id', packageId)
    .order('created_at', { ascending: true });

  if (itemsError) throw new ApiError('Failed to load package components: ' + itemsError.message, 500);

  return { package: pkg, items: packageItems || [] };
}

function normaliseManualType(itemType) {
  if (['installation', 'service', 'other'].includes(itemType)) return itemType;
  return 'other';
}

/**
 * Build the canonical line items for a quotation.
 *
 * @param {object} options
 * @param {object} options.adminClient Supabase admin client
 * @param {Array} options.rawItems Items submitted by the client
 * @param {string|null} options.packageId Optional package template
 * @param {number} options.installationCharges Optional manual installation charge
 * @param {number} options.otherCharges Optional manual other charge
 * @param {boolean} options.canOverridePricing Admin/manager permission
 * @param {number} options.globalTaxRate Fallback tax rate
 */
export async function buildQuotationItems({
  adminClient,
  rawItems = [],
  packageId = null,
  installationCharges = 0,
  otherCharges = 0,
  canOverridePricing = false,
  globalTaxRate = 0,
}) {
  let sourceItems = Array.isArray(rawItems) ? [...rawItems] : [];
  let pkg = null;

  if (packageId) {
    pkg = await loadPackageWithItems(adminClient, packageId);
    if (!pkg.package.is_active) {
      throw new ApiError('The selected package is not active.', 400);
    }
    if (sourceItems.length === 0) {
      sourceItems = pkg.items.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        is_optional: item.is_optional,
      }));
    }
  }

  if (sourceItems.length === 0 && !(Number(installationCharges) > 0) && !(Number(otherCharges) > 0)) {
    throw new ApiError('Select at least one product, package or charge.', 400);
  }

  const productIds = sourceItems.map((item) => item.product_id).filter(Boolean);
  const productMap = await loadProductsByIds(adminClient, productIds);

  const lines = [];

  for (let index = 0; index < sourceItems.length; index += 1) {
    const raw = sourceItems[index] || {};
    const quantity = toQuantity(raw.quantity ?? 1, `Line ${index + 1} quantity`);

    if (raw.product_id) {
      const product = productMap.get(raw.product_id);
      if (!product) throw new ApiError(`Product not found on line ${index + 1}.`, 400);
      if (!product.is_active || !product.is_quotable) {
        throw new ApiError(`Product "${product.name}" is not available for quotation.`, 400);
      }

      const cataloguePrice = toMoney(product.base_price, `Catalogue price for ${product.name}`);
      let unitPrice = cataloguePrice;
      if (canOverridePricing && raw.unit_price !== undefined && raw.unit_price !== null && raw.unit_price !== '') {
        unitPrice = toMoney(raw.unit_price, `Unit price for ${product.name}`);
      }

      lines.push({
        product_id: product.id,
        line_item: product.name,
        quantity,
        unit_price: unitPrice,
        tax_rate: product.tax_rate ?? globalTaxRate ?? 0,
        item_type: product.item_type || 'product',
        category_name: product.category?.name || null,
        unit: product.unit || 'piece',
        hsn_code: product.hsn_code || null,
        package_id: packageId || null,
        notes: raw.notes || null,
        sort_order: index,
        catalogue_price: cataloguePrice,
        price_overridden: unitPrice !== cataloguePrice,
      });
      continue;
    }

    // Manual line: only non-product charges may be entered without a product.
    const label = String(raw.line_item || raw.description || '').trim();
    if (!label) {
      throw new ApiError(`Line ${index + 1} needs a description.`, 400);
    }
    const itemType = normaliseManualType(raw.item_type || raw.itemType);
    const unitPrice = toMoney(raw.unit_price ?? raw.unitPrice ?? 0, `Line ${index + 1} unit price`);

    lines.push({
      product_id: null,
      line_item: label,
      quantity,
      unit_price: unitPrice,
      tax_rate: raw.tax_rate ?? globalTaxRate ?? 0,
      item_type: itemType,
      category_name: raw.category_name || (itemType === 'installation' ? 'Installation' : 'Other charges'),
      unit: raw.unit || 'piece',
      hsn_code: raw.hsn_code || null,
      package_id: packageId || null,
      notes: raw.notes || null,
      sort_order: index,
      catalogue_price: unitPrice,
      price_overridden: false,
    });
  }

  const installation = Number(installationCharges) || 0;
  if (installation > 0) {
    lines.push({
      product_id: null,
      line_item: 'Installation & Commissioning Charges',
      quantity: 1,
      unit_price: toMoney(installation, 'Installation charges'),
      tax_rate: globalTaxRate ?? 0,
      item_type: 'installation',
      category_name: 'Installation',
      unit: 'set',
      hsn_code: null,
      package_id: packageId || null,
      notes: 'Manual installation charge',
      sort_order: lines.length,
      catalogue_price: toMoney(installation, 'Installation charges'),
      price_overridden: false,
    });
  }

  const other = Number(otherCharges) || 0;
  if (other > 0) {
    lines.push({
      product_id: null,
      line_item: 'Other Charges',
      quantity: 1,
      unit_price: toMoney(other, 'Other charges'),
      tax_rate: globalTaxRate ?? 0,
      item_type: 'other',
      category_name: 'Other charges',
      unit: 'set',
      hsn_code: null,
      package_id: packageId || null,
      notes: 'Manual other charge',
      sort_order: lines.length,
      catalogue_price: toMoney(other, 'Other charges'),
      price_overridden: false,
    });
  }

  return { items: lines, package: pkg?.package || null };
}

export default buildQuotationItems;
