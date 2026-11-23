// Equipment serial numbers and QR codes, stored in equipment_serial_numbers.
// The same rows are used when packing (serials are attached to the order), at dispatch,
// at delivery (warranty starts) and by support, so one serial number has one history.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const fail = (message, status = 400) => Object.assign(new Error(message), { status });

const SELECT = '*, product:product_id ( id, sku, name, brand ), order:order_id ( order_code ), customer:customer_id ( contact_name, company_name )';

async function dispatchesById(db, rows) {
  const ids = [...new Set(rows.map((r) => r.dispatch_id).filter(Boolean))];
  if (!ids.length) return new Map();
  const { data } = await db.from('dispatches').select('id, dispatch_code, dispatched_at, delivered_at').in('id', ids);
  return new Map((data || []).map((d) => [d.id, d]));
}

function view(row, dispatches) {
  const d = row.dispatch_id ? dispatches.get(row.dispatch_id) : null;
  return {
    ...row,
    product_name: row.product?.name || '',
    product_sku: row.product?.sku || '',
    manufacturer: row.manufacturer || row.product?.brand || '',
    qr_code_payload: row.qr_code_data || '',
    warehouse: row.current_location ? { name: row.current_location } : null,
    warehouse_name: row.current_location || '',
    order_number: row.order?.order_code || '',
    customer_name: row.customer?.company_name || row.customer?.contact_name || '',
    dispatch_number: d?.dispatch_code || '',
    dispatched_at: d?.dispatched_at || null,
    delivered_at: d?.delivered_at || (row.delivery_date ? `${row.delivery_date}T00:00:00Z` : null),
  };
}

export async function listSerials(db, { product_id = '', status = '', search = '' } = {}) {
  let q = db.from('equipment_serial_numbers').select(SELECT).order('created_at', { ascending: false }).limit(500);
  if (UUID.test(product_id)) q = q.eq('product_id', product_id);
  if (status && status !== 'all') q = q.eq('status', status);
  if (search) q = q.ilike('serial_number', `%${search.replace(/[%,()]/g, '')}%`);
  const { data, error } = await q;
  if (error) throw fail(error.message, 500);
  const rows = data || [];
  const dispatches = await dispatchesById(db, rows);
  return rows.map((r) => view(r, dispatches));
}

export async function registerSerial(db, item, profile) {
  const serial = String(item?.serial_number || '').trim().toUpperCase();
  if (!serial) throw fail('Serial number is required.');
  if (!UUID.test(item?.product_id || '')) throw fail('Choose the product this serial number belongs to.');

  const { data: product } = await db.from('products').select('id, sku, name, brand, warranty_years').eq('id', item.product_id).maybeSingle();
  if (!product) throw fail('Product not found for serial number registration.', 404);

  const { data: existing } = await db.from('equipment_serial_numbers').select('id').eq('serial_number', serial).maybeSingle();
  if (existing) throw fail(`Serial number "${serial}" is already registered in the system.`, 409);

  let location = item.current_location || '';
  if (!location && UUID.test(item.warehouse_id || '')) {
    const { data: wh } = await db.from('warehouses').select('name').eq('id', item.warehouse_id).maybeSingle();
    location = wh?.name || '';
  }

  const { data, error } = await db
    .from('equipment_serial_numbers')
    .insert({
      serial_number: serial,
      product_id: product.id,
      status: 'in_stock',
      current_location: location || 'Warehouse',
      manufacturer: item.manufacturer || product.brand || null,
      qr_code_data: `SOLVIX:SN:${serial}:PROD:${product.sku}`,
      warranty_status: 'pending_delivery',
      registered_by: profile?.id || null,
    })
    .select(SELECT)
    .single();
  if (error) throw fail(/duplicate|unique/i.test(error.message) ? `Serial number "${serial}" is already registered in the system.` : error.message, 400);
  return view(data, new Map());
}

export async function registerBatch(db, items, profile) {
  const results = [];
  const errors = [];
  for (const item of items) {
    try {
      results.push(await registerSerial(db, item, profile));
    } catch (err) {
      errors.push({ serial_number: item?.serial_number, error: err.message });
    }
  }
  return { registeredCount: results.length, failedCount: errors.length, results, errors };
}

/** Finds a serial number from what was typed or what a QR code contains (SOLVIX:SN:<serial>:PROD:<sku>). */
export async function lookupSerial(db, query) {
  const q = String(query || '').trim().toUpperCase();
  const clean = q.replace(/^SOLVIX:SN:/, '').split(':PROD:')[0];
  const { data, error } = await db.from('equipment_serial_numbers').select(SELECT).in('serial_number', [...new Set([q, clean])]).limit(1);
  if (error) throw fail(error.message, 500);
  const row = data?.[0];
  if (!row) return null;
  const dispatches = await dispatchesById(db, [row]);
  const result = view(row, dispatches);
  const { data: warranty } = await db
    .from('warranties')
    .select('warranty_code, status, start_date, expiry_date')
    .eq('equipment_serial_id', row.id)
    .maybeSingle();
  return { ...result, warranty: warranty || null };
}
