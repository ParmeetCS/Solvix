// Backend Data Store & Transactional Engine for SOLVIX Warehouse & Inventory Module
// Supports both live Supabase operations and resilient memory persistence for local dev.

let memoryCategories = [];

let memoryWarehouses = [];

let memoryProducts = [];

let memoryInventory = [];

let memoryMovements = [];

let memoryReservations = [];

let memoryPurchaseOrders = [];

let memorySerialNumbers = [];

let memoryOrders = [];

let memoryDispatches = [];

let memoryWarranties = [];

export const warehouseStore = {
  // 1. Dashboard Metrics
  getDashboardMetrics: async () => {
    const totalProducts = memoryProducts.filter(p => p.is_active).length;
    const totalStockQuantity = memoryInventory.reduce((acc, i) => acc + Number(i.quantity_on_hand), 0);
    
    // Low stock check: compare quantity_on_hand against product min_stock_level
    const lowStockItems = [];
    const outOfStockItems = [];

    memoryProducts.forEach(prod => {
      const invs = memoryInventory.filter(i => i.product_id === prod.id);
      const totalOnHand = invs.reduce((acc, i) => acc + Number(i.quantity_on_hand), 0);
      const totalReserved = invs.reduce((acc, i) => acc + Number(i.quantity_reserved), 0);
      const available = totalOnHand - totalReserved;
      const threshold = prod.min_stock_threshold || prod.min_stock_level || 5;

      const alertPayload = {
        ...prod,
        product_id: prod.id,
        product_name: prod.name,
        totalOnHand,
        totalReserved,
        available,
        quantity_available: available,
        min_threshold: threshold,
        min_stock_threshold: threshold
      };

      if (totalOnHand === 0) {
        outOfStockItems.push(alertPayload);
      } else if (available <= threshold) {
        lowStockItems.push(alertPayload);
      }
    });

    const pendingPacking = memoryOrders.filter(o => o.packing_status === 'pending' || o.packing_status === 'packing').length;
    const pendingDispatches = memoryDispatches.filter(d => d.status === 'prepared' || d.status === 'in_transit').length;
    const totalSerialNumbers = memorySerialNumbers.length;
    const recentMovements = memoryMovements.slice(0, 8);

    return {
      kpis: {
        totalProducts,
        total_products: totalProducts,
        totalStockQuantity,
        total_stock_quantity: totalStockQuantity,
        lowStockProducts: lowStockItems.length,
        low_stock_products: lowStockItems.length,
        outOfStockProducts: outOfStockItems.length,
        out_of_stock_products: outOfStockItems.length,
        pendingPacking,
        pending_packing: pendingPacking,
        pendingDispatches,
        pending_dispatches: pendingDispatches,
        totalSerialNumbers,
        registered_serials: totalSerialNumbers,
        recentMovementsCount: memoryMovements.length,
        recent_movements_count: memoryMovements.length
      },
      lowStockAlerts: lowStockItems,
      low_stock_alerts: lowStockItems,
      outOfStockAlerts: outOfStockItems,
      out_of_stock_alerts: outOfStockItems,
      recentMovements,
      recent_movements: recentMovements,
      warehouses: memoryWarehouses.map(wh => {
        const whStock = memoryInventory
          .filter(i => i.warehouse_id === wh.id)
          .reduce((acc, i) => acc + Number(i.quantity_on_hand), 0);
        return {
          ...wh,
          total_stock_units: whStock
        };
      })
    };
  },

  // 2. Products
  getProducts: async ({ category = '', status = '', search = '' } = {}) => {
    let list = [...memoryProducts];
    if (category && category !== 'all') {
      list = list.filter(p => p.category_id === category || p.category_name.toLowerCase().includes(category.toLowerCase()));
    }
    if (status && status !== 'all') {
      list = list.filter(p => p.status === status);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.manufacturer?.toLowerCase().includes(q)
      );
    }

    // Attach aggregated stock per product
    return list.map(prod => {
      const invs = memoryInventory.filter(i => i.product_id === prod.id);
      const totalOnHand = invs.reduce((acc, i) => acc + Number(i.quantity_on_hand), 0);
      const totalReserved = invs.reduce((acc, i) => acc + Number(i.quantity_reserved), 0);
      return {
        ...prod,
        stock_on_hand: totalOnHand,
        stock_reserved: totalReserved,
        available_stock: totalOnHand - totalReserved
      };
    });
  },

  getProductById: async (id) => {
    const prod = memoryProducts.find(p => p.id === id || p.sku === id);
    if (!prod) return null;

    const inventoryRecords = memoryInventory
      .filter(i => i.product_id === prod.id)
      .map(i => {
        const wh = memoryWarehouses.find(w => w.id === i.warehouse_id);
        return {
          ...i,
          warehouse_name: wh?.name || 'Central Hub',
          warehouse_code: wh?.code || 'WH-01',
          available: Number(i.quantity_on_hand) - Number(i.quantity_reserved)
        };
      });

    const movements = memoryMovements.filter(m => m.product_id === prod.id);
    const serials = memorySerialNumbers.filter(s => s.product_id === prod.id);

    return {
      product: prod,
      inventory: inventoryRecords,
      movements,
      serials
    };
  },

  createProduct: async (productData, userProfile) => {
    const warrantyMonths = productData.warranty_months ? Number(productData.warranty_months) : (productData.warranty_years ? Number(productData.warranty_years) * 12 : 60);
    const newProduct = {
      id: `prod-${Date.now()}`,
      sku: productData.sku.toUpperCase(),
      name: productData.name,
      category: productData.category || 'solar_panel',
      category_id: productData.category_id || productData.category || 'cat-1',
      category_name: productData.category_name || (productData.category ? productData.category.replace('_', ' ') : 'Solar Products'),
      manufacturer: productData.manufacturer || 'Solar Manufacturer',
      description: productData.description || '',
      unit: productData.unit || 'pcs',
      purchase_price: Number(productData.purchase_price || 0),
      selling_price: Number(productData.selling_price || 0),
      base_price: Number(productData.selling_price || 0),
      min_stock_level: Number(productData.min_stock_threshold || productData.min_stock_level || 5),
      min_stock_threshold: Number(productData.min_stock_threshold || productData.min_stock_level || 5),
      warranty_years: Math.round(warrantyMonths / 12),
      warranty_months: warrantyMonths,
      requires_serial_number: productData.requires_serial_number ?? true,
      status: productData.status || 'active',
      wattage_wp: productData.wattage_wp ? Number(productData.wattage_wp) : (productData.specifications?.wattage ? parseFloat(productData.specifications.wattage) : null),
      efficiency_pct: productData.efficiency_pct ? Number(productData.efficiency_pct) : null,
      specifications: productData.specifications || {},
      is_active: true,
      created_at: new Date().toISOString()
    };

    memoryProducts.unshift(newProduct);

    // Initialize zero inventory row across warehouses
    memoryWarehouses.forEach(wh => {
      memoryInventory.push({
        id: `inv-${Date.now()}-${wh.id}`,
        product_id: newProduct.id,
        warehouse_id: wh.id,
        quantity_on_hand: 0,
        quantity_reserved: 0,
        bin_location: 'Unassigned',
        last_restocked_at: null
      });
    });

    return newProduct;
  },

  updateProduct: async (id, updates, userProfile) => {
    const idx = memoryProducts.findIndex(p => p.id === id);
    if (idx === -1) return null;

    memoryProducts[idx] = {
      ...memoryProducts[idx],
      ...updates,
      updated_at: new Date().toISOString()
    };
    return memoryProducts[idx];
  },

  // 3. Inventory Stock Operations
  getInventory: async ({ warehouse_id = '', product_id = '', low_stock_only = false, search = '' } = {}) => {
    let list = memoryInventory.map(inv => {
      const prod = memoryProducts.find(p => p.id === inv.product_id);
      const wh = memoryWarehouses.find(w => w.id === inv.warehouse_id);
      const available = Number(inv.quantity_on_hand) - Number(inv.quantity_reserved);
      const threshold = prod?.min_stock_threshold || prod?.min_stock_level || 5;
      const isLow = available <= threshold;
      return {
        ...inv,
        product: prod,
        product_name: prod?.name || 'Unknown',
        product_sku: prod?.sku || 'N/A',
        sku: prod?.sku || 'N/A',
        category_name: prod?.category_name || 'General',
        warehouse: wh,
        warehouse_name: wh?.name || 'Warehouse',
        available_stock: available,
        quantity_available: available,
        min_stock_threshold: threshold,
        is_low_stock: isLow
      };
    });

    if (product_id) {
      list = list.filter(i => i.product_id === product_id);
    }
    if (warehouse_id && warehouse_id !== 'all') {
      list = list.filter(i => i.warehouse_id === warehouse_id);
    }
    if (low_stock_only) {
      list = list.filter(i => i.is_low_stock);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(i =>
        i.product_name.toLowerCase().includes(q) ||
        i.sku.toLowerCase().includes(q) ||
        i.bin_location?.toLowerCase().includes(q)
      );
    }
    return list;
  },

  // Stock-In (Goods Receiving / Restock)
  recordStockIn: async ({ product_id, warehouse_id, quantity, reference_type = 'purchase_order', notes = '' }, userProfile) => {
    const qty = Number(quantity);
    if (qty <= 0) throw new Error('Stock-in quantity must be greater than zero.');

    let inv = memoryInventory.find(i => i.product_id === product_id && i.warehouse_id === warehouse_id);
    if (!inv) {
      inv = {
        id: `inv-${Date.now()}`,
        product_id,
        warehouse_id,
        quantity_on_hand: 0,
        quantity_reserved: 0,
        bin_location: 'Bay-01',
        last_restocked_at: new Date().toISOString()
      };
      memoryInventory.push(inv);
    }

    inv.quantity_on_hand += qty;
    inv.last_restocked_at = new Date().toISOString();

    const movement = {
      id: `mov-${Date.now()}`,
      product_id,
      warehouse_id,
      movement_type: 'stock_in',
      quantity: qty,
      reference_type,
      notes: notes || `Stock-in of ${qty} units recorded.`,
      created_at: new Date().toISOString(),
      created_by_name: userProfile?.full_name || 'Warehouse Staff'
    };
    memoryMovements.unshift(movement);

    return { inventory: inv, movement };
  },

  // Stock-Out (Internal Issue / Disposal)
  recordStockOut: async ({ product_id, warehouse_id, quantity, notes = '' }, userProfile) => {
    const qty = Number(quantity);
    if (qty <= 0) throw new Error('Stock-out quantity must be greater than zero.');

    const inv = memoryInventory.find(i => i.product_id === product_id && i.warehouse_id === warehouse_id);
    if (!inv) throw new Error('Product not found in this warehouse.');

    const available = inv.quantity_on_hand - inv.quantity_reserved;
    if (available - qty < 0) {
      throw new Error(`Insufficient available stock. On hand: ${inv.quantity_on_hand}, Reserved: ${inv.quantity_reserved}, Available: ${available}. Never allowing negative stock.`);
    }

    inv.quantity_on_hand -= qty;

    const movement = {
      id: `mov-${Date.now()}`,
      product_id,
      warehouse_id,
      movement_type: 'stock_out',
      quantity: qty,
      reference_type: 'manual_issue',
      notes: notes || `Manual stock-out of ${qty} units.`,
      created_at: new Date().toISOString(),
      created_by_name: userProfile?.full_name || 'Warehouse Staff'
    };
    memoryMovements.unshift(movement);

    return { inventory: inv, movement };
  },

  // Stock Adjustment (Restricted to Warehouse Manager / Admin)
  recordStockAdjustment: async ({ product_id, warehouse_id, new_quantity, reason = '' }, userProfile) => {
    const targetQty = Number(new_quantity);
    if (targetQty < 0) throw new Error('Stock level cannot be negative.');

    let inv = memoryInventory.find(i => i.product_id === product_id && i.warehouse_id === warehouse_id);
    if (!inv) {
      inv = {
        id: `inv-${Date.now()}`,
        product_id,
        warehouse_id,
        quantity_on_hand: targetQty,
        quantity_reserved: 0,
        bin_location: 'Default',
        last_restocked_at: new Date().toISOString()
      };
      memoryInventory.push(inv);
    }

    if (targetQty < inv.quantity_reserved) {
      throw new Error(`Cannot adjust stock below current active reservations (${inv.quantity_reserved} units reserved). Release reservations first.`);
    }

    const difference = targetQty - inv.quantity_on_hand;
    inv.quantity_on_hand = targetQty;

    const movement = {
      id: `mov-${Date.now()}`,
      product_id,
      warehouse_id,
      movement_type: 'adjustment',
      quantity: difference,
      reference_type: 'physical_audit',
      notes: reason || `Inventory adjusted from ${inv.quantity_on_hand - difference} to ${targetQty} units (${difference >= 0 ? '+' : ''}${difference}).`,
      created_at: new Date().toISOString(),
      created_by_name: userProfile?.full_name || 'Warehouse Manager'
    };
    memoryMovements.unshift(movement);

    return { inventory: inv, movement };
  },

  // Stock Transfer between Warehouses
  recordStockTransfer: async ({ product_id, source_warehouse_id, destination_warehouse_id, quantity, notes = '' }, userProfile) => {
    const qty = Number(quantity);
    if (qty <= 0) throw new Error('Transfer quantity must be positive.');
    if (source_warehouse_id === destination_warehouse_id) throw new Error('Source and destination warehouses must be different.');

    const sourceInv = memoryInventory.find(i => i.product_id === product_id && i.warehouse_id === source_warehouse_id);
    if (!sourceInv) throw new Error('Source inventory record not found.');

    const available = sourceInv.quantity_on_hand - sourceInv.quantity_reserved;
    if (available - qty < 0) {
      throw new Error(`Insufficient stock in source warehouse. Available: ${available}, requested transfer: ${qty}.`);
    }

    let destInv = memoryInventory.find(i => i.product_id === product_id && i.warehouse_id === destination_warehouse_id);
    if (!destInv) {
      destInv = {
        id: `inv-${Date.now()}`,
        product_id,
        warehouse_id: destination_warehouse_id,
        quantity_on_hand: 0,
        quantity_reserved: 0,
        bin_location: 'Transfer-In',
        last_restocked_at: new Date().toISOString()
      };
      memoryInventory.push(destInv);
    }

    // Atomic execution
    sourceInv.quantity_on_hand -= qty;
    destInv.quantity_on_hand += qty;

    const movementOut = {
      id: `mov-tf-out-${Date.now()}`,
      product_id,
      warehouse_id: source_warehouse_id,
      movement_type: 'transfer',
      quantity: qty,
      notes: `Transfer OUT to ${destination_warehouse_id}. Notes: ${notes}`,
      created_at: new Date().toISOString(),
      created_by_name: userProfile?.full_name || 'Warehouse Logistics'
    };
    const movementIn = {
      id: `mov-tf-in-${Date.now()}`,
      product_id,
      warehouse_id: destination_warehouse_id,
      movement_type: 'transfer',
      quantity: qty,
      notes: `Transfer IN from ${source_warehouse_id}. Notes: ${notes}`,
      created_at: new Date().toISOString(),
      created_by_name: userProfile?.full_name || 'Warehouse Logistics'
    };
    memoryMovements.unshift(movementOut, movementIn);

    return { source: sourceInv, destination: destInv };
  },

  // 4. Purchase Orders & Goods Receiving
  getPurchaseOrders: async ({ status = '' } = {}) => {
    let list = [...memoryPurchaseOrders];
    if (status && status !== 'all') {
      list = list.filter(po => po.status === status);
    }
    return list;
  },

  createPurchaseOrder: async (poData, userProfile) => {
    const yr = new Date().getFullYear();
    const rand = Math.floor(100 + Math.random() * 900);
    const code = `PO-${yr}-${rand}`;

    const items = (poData.items || []).map((item, idx) => {
      const prod = memoryProducts.find(p => p.id === item.product_id);
      const unitPrice = Number(item.unit_price || prod?.purchase_price || 0);
      const qty = Number(item.quantity_ordered || item.quantity || 1);
      return {
        id: `poi-${Date.now()}-${idx}`,
        product_id: item.product_id,
        product_name: prod?.name || 'Solar Item',
        sku: prod?.sku || 'SKU',
        quantity_ordered: qty,
        quantity_received: 0,
        unit_price: unitPrice,
        total_price: qty * unitPrice
      };
    });

    const totalAmount = items.reduce((acc, it) => acc + it.total_price, 0);
    const wh = memoryWarehouses.find(w => w.id === poData.warehouse_id) || memoryWarehouses[0];

    const newPO = {
      id: `po-${Date.now()}`,
      po_code: code,
      po_number: poData.po_number || code,
      supplier_name: poData.supplier_name,
      supplier_phone: poData.supplier_phone || poData.supplier_contact || '',
      supplier_email: poData.supplier_email || '',
      warehouse_id: wh.id,
      warehouse_name: wh.name,
      status: poData.status || 'ordered',
      total_amount: totalAmount,
      expected_date: poData.expected_date || poData.expected_delivery_date || null,
      received_date: null,
      notes: poData.notes || 'Solar equipment procurement order.',
      created_at: new Date().toISOString(),
      items
    };

    // Note: Creating PO does NOT increase stock! Stock increases ONLY when goods are received.
    memoryPurchaseOrders.unshift(newPO);
    return newPO;
  },

  // Verified Goods Receipt (Partial delivery supported)
  receiveGoods: async (poId, receivedData, userProfile) => {
    const po = memoryPurchaseOrders.find(p => p.id === poId || p.po_code === poId || p.po_number === poId);
    if (!po) throw new Error('Purchase order not found.');

    const receivedItems = Array.isArray(receivedData) ? receivedData : (receivedData?.received_items || []);
    let anyReceived = false;
    let allReceived = true;

    // Process each received item
    receivedItems.forEach(receipt => {
      const item = po.items.find(i => i.id === receipt.item_id || i.product_id === receipt.product_id);
      if (!item) return;

      const qtyReceiving = Number(receipt.quantity_received || 0);
      if (qtyReceiving <= 0) return;

      const remainingAllowed = item.quantity_ordered - item.quantity_received;
      if (qtyReceiving > remainingAllowed) {
        throw new Error(`Cannot receive ${qtyReceiving} for ${item.product_name}. Only ${remainingAllowed} pending.`);
      }

      item.quantity_received += qtyReceiving;
      anyReceived = true;

      // Update warehouse inventory with verified stock
      let inv = memoryInventory.find(i => i.product_id === item.product_id && i.warehouse_id === po.warehouse_id);
      if (!inv) {
        inv = {
          id: `inv-${Date.now()}-${item.product_id}`,
          product_id: item.product_id,
          warehouse_id: po.warehouse_id,
          quantity_on_hand: 0,
          quantity_reserved: 0,
          bin_location: 'Receiving Dock',
          last_restocked_at: new Date().toISOString()
        };
        memoryInventory.push(inv);
      }

      inv.quantity_on_hand += qtyReceiving;
      inv.last_restocked_at = new Date().toISOString();

      // Log verified stock movement
      memoryMovements.unshift({
        id: `mov-${Date.now()}-${item.product_id}`,
        product_id: item.product_id,
        warehouse_id: po.warehouse_id,
        movement_type: 'stock_in',
        quantity: qtyReceiving,
        reference_type: 'purchase_order',
        notes: `Verified receipt on ${po.po_code || po.po_number} (${item.quantity_received}/${item.quantity_ordered} received)`,
        created_at: new Date().toISOString(),
        created_by_name: userProfile?.full_name || 'Receiving Officer'
      });
    });

    // Check overall status
    po.items.forEach(it => {
      if (it.quantity_received < it.quantity_ordered) {
        allReceived = false;
      }
    });

    if (allReceived) {
      po.status = 'received';
      po.received_date = new Date().toISOString().split('T')[0];
    } else if (anyReceived) {
      po.status = 'partially_received';
    }

    return { purchase_order: po, success: true };
  },

  // 5. Order Packing & Inventory Reservation
  getPackingQueue: async () => {
    return memoryOrders.map(order => {
      const isReadyToPack = order.bom.every(b => {
        const invs = memoryInventory.filter(i => i.product_id === b.product_id);
        const avail = invs.reduce((acc, i) => acc + (Number(i.quantity_on_hand) - Number(i.quantity_reserved)), 0);
        return avail >= b.quantity_required;
      });
      return {
        ...order,
        has_sufficient_stock: isReadyToPack
      };
    });
  },

  getOrderPackingDetail: async (orderId) => {
    const order = memoryOrders.find(o => o.id === orderId || o.order_code === orderId);
    if (!order) return null;

    // Check live stock per BOM item
    const enrichedBOM = order.bom.map(b => {
      const invs = memoryInventory.filter(i => i.product_id === b.product_id);
      const totalOnHand = invs.reduce((acc, i) => acc + Number(i.quantity_on_hand), 0);
      const totalReserved = invs.reduce((acc, i) => acc + Number(i.quantity_reserved), 0);
      const available = totalOnHand - totalReserved;
      const isReservedForThisOrder = memoryReservations.some(
        r => r.order_id === order.id && r.product_id === b.product_id && r.status === 'active'
      );

      return {
        ...b,
        stock_on_hand: totalOnHand,
        stock_reserved: totalReserved,
        available_stock: available,
        is_reserved: isReservedForThisOrder,
        is_sufficient: available >= (b.quantity_required - (isReservedForThisOrder ? b.quantity_required : 0))
      };
    });

    return {
      order,
      bom: enrichedBOM
    };
  },

  // Reserve stock for an order (Transactionally safe: prevents double reservation)
  reserveOrderStock: async (orderId, warehouseId = 'wh-1', userProfile) => {
    const order = memoryOrders.find(o => o.id === orderId || o.order_code === orderId);
    if (!order) throw new Error('Order not found.');

    const reservationsCreated = [];

    for (const item of order.bom) {
      // Check if ALREADY reserved for this order to prevent double reservation
      const existingRes = memoryReservations.find(
        r => r.order_id === order.id && r.product_id === item.product_id && r.status === 'active'
      );
      if (existingRes) {
        // Already reserved, skip to avoid double counting
        continue;
      }

      const inv = memoryInventory.find(i => i.product_id === item.product_id && i.warehouse_id === warehouseId);
      if (!inv) throw new Error(`Product ${item.name} not stocked in this warehouse.`);

      const available = inv.quantity_on_hand - inv.quantity_reserved;
      if (available < item.quantity_required) {
        throw new Error(`Insufficient stock to reserve ${item.name}. Available: ${available}, Required: ${item.quantity_required}.`);
      }

      // Execute reservation
      inv.quantity_reserved += item.quantity_required;

      const newRes = {
        id: `res-${Date.now()}-${item.product_id}`,
        product_id: item.product_id,
        warehouse_id: warehouseId,
        order_id: order.id,
        quantity: item.quantity_required,
        status: 'active',
        reserved_at: new Date().toISOString()
      };
      memoryReservations.push(newRes);
      reservationsCreated.push(newRes);

      memoryMovements.unshift({
        id: `mov-res-${Date.now()}-${item.product_id}`,
        product_id: item.product_id,
        warehouse_id: warehouseId,
        movement_type: 'reservation',
        quantity: item.quantity_required,
        reference_type: 'order',
        notes: `Stock reserved for Order ${order.order_code}.`,
        created_at: new Date().toISOString(),
        created_by_name: userProfile?.full_name || 'Warehouse Staff'
      });
    }

    return { success: true, reservations: reservationsCreated };
  },

  // Update packing item status / checklist
  updatePackingChecklist: async (orderId, packedItems, userProfile) => {
    const order = memoryOrders.find(o => o.id === orderId || o.order_code === orderId);
    if (!order) throw new Error('Order not found.');

    packedItems.forEach(pi => {
      const bomItem = order.bom.find(b => b.product_id === pi.product_id);
      if (bomItem) {
        bomItem.quantity_packed = Number(pi.quantity_packed || 0);
        bomItem.is_packed = bomItem.quantity_packed >= bomItem.quantity_required;
        if (pi.serial_number) {
          bomItem.serial_number = pi.serial_number;
        }
      }
    });

    const allPacked = order.bom.every(b => b.is_packed);
    order.packing_status = allPacked ? 'packed' : 'packing';

    return { order, allPacked };
  },

  // 6. Serial Number Management & QR Generation
  getSerialNumbers: async ({ product_id = '', status = '', search = '' } = {}) => {
    let list = [...memorySerialNumbers];
    if (product_id && product_id !== 'all') {
      list = list.filter(s => s.product_id === product_id);
    }
    if (status && status !== 'all') {
      list = list.filter(s => s.status === status);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.serial_number.toLowerCase().includes(q) ||
        s.product_name?.toLowerCase().includes(q) ||
        s.manufacturer?.toLowerCase().includes(q)
      );
    }
    return list;
  },

  registerSerialNumber: async (serialData, userProfile) => {
    const snClean = serialData.serial_number.trim().toUpperCase();

    // Enforce uniqueness
    const existing = memorySerialNumbers.find(s => s.serial_number === snClean);
    if (existing) {
      throw new Error(`Serial number "${snClean}" is already registered in the system.`);
    }

    // Products can live in the database while this store is in memory: accept a snapshot of the product.
    const prod = memoryProducts.find(p => p.id === serialData.product_id) || serialData.product_snapshot;
    if (!prod) throw new Error('Product not found for serial number registration.');

    const qrData = `SOLVIX:SN:${snClean}:PROD:${prod.sku}`;

    const newRecord = {
      id: `sn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      serial_number: snClean,
      product_id: prod.id,
      product_name: prod.name,
      manufacturer: serialData.manufacturer || prod.manufacturer,
      status: 'in_stock',
      current_location: serialData.current_location || 'Central Warehouse',
      qr_code_data: qrData,
      order_id: null,
      customer_id: null,
      dispatch_id: null,
      delivery_date: null,
      warranty_status: 'pending_delivery',
      warranty_years: prod.warranty_years || 5,
      registered_by: userProfile?.id || null,
      created_at: new Date().toISOString()
    };

    memorySerialNumbers.unshift(newRecord);
    return newRecord;
  },

  // Batch CSV Registration
  registerBatchSerials: async (batchList, userProfile) => {
    const results = [];
    const errors = [];

    for (const item of batchList) {
      try {
        const registered = await warehouseStore.registerSerialNumber(item, userProfile);
        results.push(registered);
      } catch (err) {
        errors.push({ serial_number: item.serial_number, error: err.message });
      }
    }

    return { registeredCount: results.length, failedCount: errors.length, results, errors };
  },

  // QR / Serial Lookup
  lookupSerial: async (query) => {
    const q = query.trim().toUpperCase();
    const cleanSN = q.replace(/^SOLVIX:SN:/, '').split(':')[0];

    const record = memorySerialNumbers.find(
      s => s.serial_number === q || s.serial_number === cleanSN || s.qr_code_data === q
    );
    if (!record) return null;

    const prod = memoryProducts.find(p => p.id === record.product_id);
    const order = record.order_id ? memoryOrders.find(o => o.id === record.order_id) : null;
    const warranty = memoryWarranties.find(w => w.equipment_serial_id === record.id);

    return {
      serial: record,
      product: prod,
      order,
      warranty
    };
  },

  // 7. Dispatch Management & Transactional Inventory Deduction
  getDispatches: async ({ status = '' } = {}) => {
    let list = [...memoryDispatches];
    if (status && status !== 'all') {
      list = list.filter(d => d.status === status);
    }
    return list;
  },

  getDispatchById: async (id) => {
    return memoryDispatches.find(d => d.id === id || d.dispatch_code === id);
  },

  // Create & Authorize Dispatch (Inventory deducted exactly once upon in_transit)
  createDispatch: async (dispatchData, userProfile) => {
    let order = memoryOrders.find(o => o.id === dispatchData.order_id || o.order_code === dispatchData.order_id);
    if (!order) {
      order = {
        id: dispatchData.order_id || `ord-${Date.now()}`,
        order_code: `ORD-${Date.now()}`,
        customer_id: 'cust-direct',
        customer_name: dispatchData.customer_name || 'Retail Client',
        contact_phone: dispatchData.customer_phone || '+91 98000 00000',
        site_address: dispatchData.destination_address || 'Site Delivery',
        bom: dispatchData.items || []
      };
      memoryOrders.push(order);
    }

    const yr = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    const code = dispatchData.dispatch_number || `DSP-${yr}-${rand}`;

    const items = dispatchData.items || order.bom;

    const newDispatch = {
      id: `disp-${Date.now()}`,
      dispatch_code: code,
      dispatch_number: code,
      order_id: order.id,
      order_code: order.order_code,
      customer_id: order.customer_id,
      customer_name: dispatchData.customer_name || order.customer_name,
      customer_phone: dispatchData.customer_phone || order.contact_phone,
      destination_address: dispatchData.destination_address || order.site_address,
      warehouse_id: dispatchData.warehouse_id || 'wh-1',
      warehouse_name: 'Solvix Central Distribution Center',
      transporter_name: dispatchData.transporter_name || 'Solvix Direct Logistics',
      tracking_number: dispatchData.tracking_number || `TRK-${Date.now()}`,
      vehicle_number: dispatchData.vehicle_number || 'DL-1L-8822',
      driver_phone: dispatchData.driver_phone || '+91 98101 22334',
      status: dispatchData.status || (dispatchData.authorize_immediate ? 'in_transit' : 'draft'),
      dispatched_at: new Date().toISOString(),
      delivered_at: null,
      notes: dispatchData.notes || 'Dispatched for site delivery.',
      items: items.map(it => {
        const serialsList = Array.isArray(it.serial_numbers)
          ? it.serial_numbers
          : (it.serial_number ? [it.serial_number] : []);
        return {
          product_id: it.product_id,
          product_name: it.product_name || it.name,
          sku: it.sku,
          quantity: Number(it.quantity || it.quantity_packed || it.quantity_required || 1),
          serial_number: serialsList[0] || null,
          serial_numbers: serialsList
        };
      })
    };

    // TRANSACTIONAL EXECUTION: Deduct stock exactly once
    if (newDispatch.status === 'in_transit') {
      newDispatch.items.forEach(item => {
        const inv = memoryInventory.find(i => i.product_id === item.product_id && i.warehouse_id === newDispatch.warehouse_id);
        if (inv) {
          // Deduct from on-hand and release reservation
          inv.quantity_on_hand -= item.quantity;
          inv.quantity_reserved = Math.max(0, inv.quantity_reserved - item.quantity);
        }

        // Log movement
        memoryMovements.unshift({
          id: `mov-disp-${Date.now()}-${item.product_id}`,
          product_id: item.product_id,
          warehouse_id: newDispatch.warehouse_id,
          movement_type: 'stock_out',
          quantity: item.quantity,
          reference_type: 'dispatch',
          notes: `Stock deducted for Dispatch ${code} (Order ${order.order_code})`,
          created_at: new Date().toISOString(),
          created_by_name: userProfile?.full_name || 'Dispatch Supervisor'
        });

        // Update serial status if serial numbers assigned
        const snList = item.serial_numbers || (item.serial_number ? [item.serial_number] : []);
        snList.forEach(snStr => {
          const snRec = memorySerialNumbers.find(s => s.serial_number === snStr);
          if (snRec) {
            snRec.status = 'dispatched';
            snRec.dispatch_id = newDispatch.id;
            snRec.order_id = order.id;
            snRec.customer_id = order.customer_id;
          }
        });
      });
    }

    order.packing_status = 'dispatched';
    memoryDispatches.unshift(newDispatch);
    return newDispatch;
  },

  // 8. Equipment Delivery Confirmation & Warranty Trigger
  // CRITICAL RULE: Warranty clock starts on actual equipment delivery, not installation!
  confirmEquipmentDelivery: async (dispatchId, deliveryData, userProfile) => {
    const dispatch = memoryDispatches.find(d => d.id === dispatchId || d.dispatch_code === dispatchId || d.dispatch_number === dispatchId);
    if (!dispatch) throw new Error('Dispatch record not found.');

    if (dispatch.status === 'delivered') {
      throw new Error('This dispatch has already been delivered. Avoid duplicate warranty or stock triggers.');
    }

    const actualDeliveryDate = deliveryData.delivered_at
      ? deliveryData.delivered_at.split('T')[0]
      : new Date().toISOString().split('T')[0];

    dispatch.status = 'delivered';
    dispatch.delivered_at = new Date().toISOString();
    dispatch.delivery_notes = deliveryData.notes || deliveryData.delivery_notes || 'Equipment received in good condition by customer.';
    dispatch.recipient_name = deliveryData.recipient_name || '';

    const activatedWarranties = [];

    // Trigger warranties for each serialized piece of equipment
    dispatch.items.forEach(item => {
      const snList = item.serial_numbers?.length ? item.serial_numbers : (item.serial_number ? [item.serial_number] : []);
      snList.forEach(snStr => {
        const snRec = memorySerialNumbers.find(s => s.serial_number === snStr);
        if (snRec) {
          snRec.status = 'delivered';
          snRec.delivery_date = actualDeliveryDate;
          snRec.warranty_status = 'active';
          snRec.warranty_start_date = actualDeliveryDate;

          const prod = memoryProducts.find(p => p.id === snRec.product_id);
          const months = prod?.warranty_months || (snRec.warranty_years ? snRec.warranty_years * 12 : 60);
          const years = Math.round(months / 12);

          const startD = new Date(actualDeliveryDate);
          const expiryD = new Date(startD);
          expiryD.setMonth(expiryD.getMonth() + months);
          const expiryStr = expiryD.toISOString().split('T')[0];
          snRec.warranty_expiry_date = expiryStr;

          const warrantyCode = `WAR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
          const newWarranty = {
            id: `war-${Date.now()}-${snRec.id}`,
            warranty_code: warrantyCode,
            equipment_serial_id: snRec.id,
            serial_number: snRec.serial_number,
            product_name: snRec.product_name || prod?.name,
            customer_id: dispatch.customer_id,
            customer_name: dispatch.customer_name,
            order_id: dispatch.order_id,
            warranty_type: 'manufacturer',
            duration_months: months,
            duration_years: years,
            start_date: actualDeliveryDate, // Strictly verified equipment delivery date
            expiry_date: expiryStr,
            status: 'active',
            terms: `${years}-year standard warranty activated on verified equipment delivery (${actualDeliveryDate}). Solvix Certified.`,
            created_at: new Date().toISOString()
          };

          memoryWarranties.unshift(newWarranty);
          activatedWarranties.push(newWarranty);
        }
      });
    });

    return {
      dispatch,
      actual_delivery_date: actualDeliveryDate,
      warranties_activated: activatedWarranties
    };
  },

  getWarranties: async () => {
    return memoryWarranties;
  },

  getCategories: async () => {
    return memoryCategories;
  },

  getWarehouses: async () => {
    return memoryWarehouses;
  },

  performStockOperation: async (params, userProfile) => {
    const op = params.operation;
    if (op === 'stock_in') {
      const res = await warehouseStore.recordStockIn({
        product_id: params.productId,
        warehouse_id: params.warehouseId,
        quantity: params.quantity,
        notes: params.notes,
        reference_type: params.referenceType
      }, userProfile);
      return { success: true, ...res };
    } else if (op === 'stock_out') {
      const res = await warehouseStore.recordStockOut({
        product_id: params.productId,
        warehouse_id: params.warehouseId,
        quantity: params.quantity,
        notes: params.notes
      }, userProfile);
      return { success: true, ...res };
    } else if (op === 'adjustment') {
      const res = await warehouseStore.recordStockAdjustment({
        product_id: params.productId,
        warehouse_id: params.warehouseId,
        new_quantity: params.actualCount,
        reason: params.reason || params.notes
      }, userProfile);
      return {
        success: true,
        newOnHand: res.inventory.quantity_on_hand,
        movement: {
          ...res.movement,
          quantity: res.inventory.quantity_on_hand - (params.previousCount ?? (res.inventory.quantity_on_hand + (res.movement.quantity || 0))) || res.movement.quantity
        },
        ...res
      };
    } else if (op === 'transfer') {
      const res = await warehouseStore.recordStockTransfer({
        product_id: params.productId,
        source_warehouse_id: params.warehouseId,
        destination_warehouse_id: params.toWarehouseId,
        quantity: params.quantity,
        notes: params.notes
      }, userProfile);
      return { success: true, ...res };
    }
    throw new Error(`Unsupported operation: ${op}`);
  },

  reserveInventoryForOrder: async (orderId, items, userProfile) => {
    const results = [];
    for (const item of items) {
      const existingRes = memoryReservations.find(
        r => r.order_id === orderId && r.product_id === item.product_id && r.status === 'active'
      );
      if (existingRes) {
        return { success: true, message: 'Reservation already active for this order', reservations: [existingRes] };
      }

      const inv = memoryInventory.find(i => i.product_id === item.product_id && i.warehouse_id === (item.warehouse_id || 'wh-1'));
      if (!inv) throw new Error('Product not stocked in this warehouse.');

      const available = inv.quantity_on_hand - inv.quantity_reserved;
      if (available < item.quantity) {
        throw new Error(`Insufficient stock to reserve. Available: ${available}, Required: ${item.quantity}.`);
      }

      inv.quantity_reserved += item.quantity;
      const newRes = {
        id: `res-${Date.now()}-${item.product_id}`,
        product_id: item.product_id,
        warehouse_id: inv.warehouse_id,
        order_id: orderId,
        quantity: item.quantity,
        status: 'active',
        reserved_at: new Date().toISOString()
      };
      memoryReservations.push(newRes);
      results.push(newRes);
    }
    return { success: true, reservations: results };
  },

  registerSerialNumbers: async (payload, userProfile) => {
    if (payload.batch && Array.isArray(payload.batch)) {
      const res = await warehouseStore.registerBatchSerials(payload.batch, userProfile);
      return { success: true, registered: res.registeredCount, ...res };
    }
    const single = await warehouseStore.registerSerialNumber(payload, userProfile);
    return {
      ...single,
      qr_code_payload: single.qr_code_data
    };
  },

  lookupSerialNumber: async (query) => {
    const res = await warehouseStore.lookupSerial(query);
    if (!res) return null;
    return {
      id: res.serial.id,
      serial_number: res.serial.serial_number,
      product_name: res.product?.name || res.serial.product_name,
      status: res.serial.status,
      warehouse_name: res.serial.current_location,
      qr_code_payload: res.serial.qr_code_data,
      ...res.serial
    };
  },

  confirmDelivery: async (dispatchId, deliveryData, userProfile) => {
    const res = await warehouseStore.confirmEquipmentDelivery(dispatchId, deliveryData, userProfile);
    return {
      success: true,
      dispatch: res.dispatch,
      delivery: {
        delivered_at: res.actual_delivery_date,
        recipient_name: deliveryData.recipient_name
      },
      warranties: res.warranties_activated
    };
  }
};
