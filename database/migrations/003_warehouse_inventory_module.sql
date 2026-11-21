-- ==============================================================================
-- Migration: 003_warehouse_inventory_module.sql
-- Description: Enhances products, warehouses, inventory, stock movements,
--              purchase orders, serial numbers, dispatches, and warranties
--              for the SOLVIX Warehouse & Inventory Management Module.
-- ==============================================================================

-- 1. Ensure Solar Product Categories exist
INSERT INTO product_categories (name, code, description) VALUES
  ('Solar Panels', 'SOLAR_PANEL', 'Photovoltaic solar modules (Mono PERC, Bifacial, Poly)'),
  ('Inverters', 'INVERTER', 'Solar inverters (On-grid, Hybrid, Microinverters)'),
  ('Batteries', 'BATTERY', 'Solar energy storage systems (Lithium-ion, LiFePO4, Lead-acid)'),
  ('Mounting Structures', 'STRUCTURE', 'Rooftop and ground mounting structures, HDGI/Aluminum rails and clamps'),
  ('Cables & Wires', 'CABLE', 'Solar DC cables (4 sq mm, 6 sq mm) and AC armored cables'),
  ('Protection Equipment', 'PROTECTION', 'ACDB, DCDB, lightning arresters, surge protection devices, earthing rods'),
  ('Accessories', 'ACCESSORY', 'MC4 connectors, conduits, cable trays, monitoring dongles')
ON CONFLICT (code) DO NOTHING;

-- 2. Extend products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS manufacturer text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS purchase_price numeric(12,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS selling_price numeric(12,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
  CHECK (status IN ('active','discontinued','out_of_stock','pre_order'));
ALTER TABLE products ADD COLUMN IF NOT EXISTS wattage_wp numeric(8,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS efficiency_pct numeric(5,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS dimensions text;

-- 3. Extend warehouses table
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS contact_phone text;
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS contact_email text;
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS capacity_sqm numeric(10,2);
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS pincode text;

-- Seed default regional warehouses if not exist
INSERT INTO warehouses (name, code, address, city, state, pincode, is_active) VALUES
  ('Solvix Central Distribution Center', 'WH-DEL-01', 'Okhla Industrial Area Phase III', 'New Delhi', 'Delhi', '110020', true),
  ('NCR Western Logistics Park', 'WH-GUR-01', 'Pace City II, Sector 37', 'Gurugram', 'Haryana', '122001', true),
  ('NCR Eastern Depot', 'WH-NOI-01', 'Sector 63 Industrial Zone', 'Noida', 'Uttar Pradesh', '201301', true)
ON CONFLICT (code) DO NOTHING;

-- 4. Extend inventory table
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS bin_location text;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS min_threshold numeric(10,2) DEFAULT 5;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS max_capacity numeric(10,2) DEFAULT 1000;

-- 5. Extend stock_movements table
ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS stock_movements_movement_type_check;
ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_movement_type_check
  CHECK (movement_type IN ('stock_in','stock_out','reservation','release','adjustment','transfer','damage','return'));

ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS batch_number text;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS destination_warehouse_id uuid REFERENCES warehouses(id);

-- 6. Extend inventory_reservations
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_status ON inventory_reservations(status);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_product ON inventory_reservations(product_id);

-- 7. Extend purchase_orders & purchase_order_items
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS warehouse_id uuid REFERENCES warehouses(id) ON DELETE SET NULL;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS supplier_phone text;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS supplier_email text;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS tracking_ref text;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS notes text;

-- 8. Extend equipment_serial_numbers
ALTER TABLE equipment_serial_numbers ADD COLUMN IF NOT EXISTS manufacturer text;
ALTER TABLE equipment_serial_numbers ADD COLUMN IF NOT EXISTS qr_code_data text;
ALTER TABLE equipment_serial_numbers ADD COLUMN IF NOT EXISTS registered_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE equipment_serial_numbers ADD COLUMN IF NOT EXISTS dispatch_id uuid;
ALTER TABLE equipment_serial_numbers ADD COLUMN IF NOT EXISTS delivery_date date;
ALTER TABLE equipment_serial_numbers ADD COLUMN IF NOT EXISTS warranty_status text DEFAULT 'pending_delivery'
  CHECK (warranty_status IN ('pending_delivery','active','expired','voided','claimed'));

-- 9. Extend dispatches
ALTER TABLE dispatches ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE dispatches ADD COLUMN IF NOT EXISTS transporter_name text;
ALTER TABLE dispatches ADD COLUMN IF NOT EXISTS tracking_number text;
ALTER TABLE dispatches ADD COLUMN IF NOT EXISTS vehicle_number text;
ALTER TABLE dispatches ADD COLUMN IF NOT EXISTS driver_phone text;
ALTER TABLE dispatches ADD COLUMN IF NOT EXISTS dispatch_document_path text;
ALTER TABLE dispatches ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

-- 10. Extend dispatch_items
ALTER TABLE dispatch_items ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES products(id) ON DELETE SET NULL;

-- 11. Extend equipment_deliveries
ALTER TABLE equipment_deliveries ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES orders(id) ON DELETE SET NULL;
ALTER TABLE equipment_deliveries ADD COLUMN IF NOT EXISTS recipient_name text;
ALTER TABLE equipment_deliveries ADD COLUMN IF NOT EXISTS recipient_phone text;

-- 12. Extend warranties to enforce delivery-triggered start date
ALTER TABLE warranties ADD COLUMN IF NOT EXISTS delivery_id uuid REFERENCES equipment_deliveries(id) ON DELETE SET NULL;
ALTER TABLE warranties ADD COLUMN IF NOT EXISTS activated_at timestamptz;

-- 13. Indexes for fast inventory and serial lookups
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_equipment_serial_numbers_qr ON equipment_serial_numbers(qr_code_data);
CREATE INDEX IF NOT EXISTS idx_dispatches_status ON dispatches(status);
CREATE INDEX IF NOT EXISTS idx_dispatches_code ON dispatches(dispatch_code);
CREATE INDEX IF NOT EXISTS idx_warranties_start_date ON warranties(start_date);
CREATE INDEX IF NOT EXISTS idx_warranties_code ON warranties(warranty_code);
