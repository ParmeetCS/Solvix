# SOLVIX Warehouse, Inventory, Serial Number & Dispatch Management Module

## 1. Architectural Overview & Domain Model

The **SOLVIX Warehouse & Inventory Management System** coordinates equipment procurement, stock tracking across regional distribution hubs, BOM-driven order preparation, serialized item identity tracking (with QR payloads), dispatch logistics, and equipment delivery confirmations.

```
       +-----------------------+
       |   Supplier POs        |
       +-----------+-----------+
                   | (Goods Receipt Verification)
                   v
       +-----------------------+        (Reserve)        +------------------------+
       | Multi-Warehouse Stock | --------------------->  | Order Packing & BOM    |
       |  (On-Hand, Available) |                         |  (Serial Attachments)  |
       +-----------+-----------+                         +-----------+------------+
                   |                                                 |
                   | (Atomic Deduction upon Dispatch)                |
                   v                                                 v
       +-----------------------+                         +------------------------+
       |  Stock Movements Log  |                         | Outbound Dispatch      |
       |  (Audit History)      |                         |  (In-Transit Carrier)  |
       +-----------------------+                         +-----------+------------+
                                                                     |
                                                                     | (Equipment Delivery Confirmation)
                                                                     v
                                                         +------------------------+
                                                         |  WARRANTY CLOCK START  |
                                                         | (Strictly Delivery Dt) |
                                                         +------------------------+
```

### Critical Business Rules Enforced
1. **Warranty Coverage Clock**:
   - The customer warranty clock **strictly starts on the actual verified equipment delivery date** (`equipment_deliveries.delivered_at`).
   - It **NEVER** starts on purchase order placement, packing completion, dispatch release, or installation commissioning.
   - Upon delivery confirmation, the system creates active warranty certificates whose `start_date` equals `delivered_at` and `expiry_date` equals `start_date + duration_months`.
2. **Stock Availability & Non-Negative Inventory**:
   - Stock operations (`stock_in`, `stock_out`, `adjustment`, `transfer`) never allow negative available stock through ordinary operations.
   - Concurrent modifications are guarded with transactional database constraints.
3. **Inventory Reservation vs. Stock Deduction**:
   - Reserving items for confirmed orders increases `quantity_reserved` while leaving `quantity_on_hand` untouched.
   - Stock is deducted from `quantity_on_hand` (and reservation released) **only when the dispatch shipment is authorized and transitioned to `in_transit`**.
4. **Double-Reservation Prevention**:
   - Re-attempting packing reservation on an already secured order rejects duplicate stock locking.
5. **PO Goods Receiving**:
   - Merely issuing a purchase order to a supplier does **NOT** increase warehouse stock. Stock only increases upon verified receipt of physical cartons (with support for partial deliveries).

---

## 2. Database Schema Reference

Defined in `database/migrations/003_warehouse_inventory_module.sql`:

| Table | Purpose |
|---|---|
| `products` | Master solar catalog (panels, inverters, batteries, structures, cables, accessories) with prices, min thresholds, specs. |
| `warehouses` | Regional logistics facilities (e.g., Delhi Central Hub, Mumbai Logistics Park, Bengaluru Distribution Center). |
| `inventory` | Stock balances per `(product_id, warehouse_id)`: `quantity_on_hand`, `quantity_reserved`, `quantity_available`, `bin_location`. |
| `stock_movements` | Immutable audit ledger tracking every stock delta (`stock_in`, `stock_out`, `reservation`, `adjustment`, `transfer`). |
| `inventory_reservations` | Active reservation locks tying product quantities to confirmed sales orders. |
| `purchase_orders` | Supplier procurement records (`draft`, `ordered`, `partially_received`, `received`). |
| `purchase_order_items` | Line items tracking `quantity_ordered` vs. `quantity_received`. |
| `equipment_serial_numbers` | Unique hardware registry with QR payloads, manufacturing dates, and lifecycle statuses (`in_stock`, `reserved`, `dispatched`, `delivered`, `defective`). |
| `dispatches` | Outbound shipment manifests with carriers, tracking numbers, driver phone, and vehicle registration. |
| `dispatch_items` | Packed goods associated with dispatches and serial number arrays. |
| `equipment_deliveries` | Verified recipient proof of delivery records (`delivered_at`, `recipient_name`, `signature_url`). |
| `warranties` | Activated warranty records calculated from the confirmed equipment delivery date. |

---

## 3. REST API Specification

### A. Dashboard & Metrics
- **`GET /api/v1/warehouse/dashboard`**: Returns 8 KPI metrics (total products, stock quantity, low-stock warnings, out-of-stock items, orders pending packing, pending dispatches, registered serials, movement count), facility breakdown, and low-stock alerts.

### B. Products Catalog
- **`GET /api/v1/warehouse/products`**: Filter by category (`solar_panel`, `inverter`, `battery`, etc.), status, search string.
- **`POST /api/v1/warehouse/products`**: Create product with SKU, prices, warranty months, and solar specifications.
- **`GET /api/v1/warehouse/products/:id`**: Single product profile with stock across warehouses.
- **`PATCH /api/v1/warehouse/products/:id`**: Update product specifications.
- **`GET /api/v1/warehouse/categories`**: Solar product category taxonomy.

### C. Inventory & Stock Operations
- **`GET /api/v1/warehouse/inventory`**: Stock levels per warehouse, bin locations, and threshold statuses.
- **`POST /api/v1/warehouse/inventory`**: Executes atomic operations:
  - `stock_in`: Inward receipt from suppliers.
  - `stock_out`: Internal issue / damaged item write-off.
  - `adjustment`: Physical cycle count reconciliation (restricted to Warehouse Managers/Admins).
  - `transfer`: Inter-warehouse facility inventory transfer.
- **`GET /api/v1/warehouse/inventory/:id`**: Specific inventory balance with full audit movement trail.

### D. Purchase Orders & Goods Receipt
- **`GET /api/v1/warehouse/purchase-orders`**: List POs with status filters.
- **`POST /api/v1/warehouse/purchase-orders`**: Create multi-line procurement order.
- **`POST /api/v1/warehouse/purchase-orders/:id/receive`**: Verified goods receipt with partial delivery handling and verified inventory increment.

### E. Order Preparation & Packing
- **`GET /api/v1/warehouse/packing`**: Orders eligible for warehouse preparation.
- **`GET /api/v1/warehouse/packing/:orderId`**: Order details, BOM retrieval, stock availability check, and packing checklist.
- **`POST /api/v1/warehouse/packing/:orderId`**:
  - `action: 'reserve'`: Reserves inventory for BOM line items without reducing quantity on hand.
  - `action: 'complete_packing'`: Validates all checklist items and records assigned equipment serial numbers.

### F. Serial Numbers & QR Code Scanner
- **`GET /api/v1/warehouse/serial-numbers`**: Registry of serialized units.
- **`POST /api/v1/warehouse/serial-numbers`**: Register single serial or batch CSV/list. Enforces uniqueness.
- **`GET /api/v1/warehouse/serial-numbers/lookup`**: Instant lookup utility via serial number or scanned QR code text.

### G. Dispatches & Equipment Delivery Confirmation
- **`GET /api/v1/warehouse/dispatches`**: List dispatches by status.
- **`POST /api/v1/warehouse/dispatches`**: Create dispatch, attach serial numbers, and authorize release.
- **`GET /api/v1/warehouse/dispatches/:id`**: Dispatch profile, printable delivery challan, and activated warranties.
- **`POST /api/v1/warehouse/dispatches/:id/deliver`**: Confirm physical equipment handover, record recipient name, and **activate customer warranty certificates starting on the exact delivery date**.

---

## 4. Frontend User Interface Routes

| Route | Page Component | Features |
|---|---|---|
| `/warehouse/dashboard` | `WarehouseDashboard.jsx` | 8 KPI cards, low-stock warning banner, regional warehouse cards, recent stock movement list. |
| `/warehouse/products` | `ProductsList.jsx` | Category tabs, search by SKU/name, prices, stock levels, status tags. |
| `/warehouse/products/new` | `ProductForm.jsx` | Product creation with solar specifications (wattage, phase, capacity) and warranty months. |
| `/warehouse/products/:id` | `ProductForm.jsx` | Product editing. |
| `/warehouse/inventory` | `InventoryList.jsx` | Multi-warehouse inventory master table, interactive modals for Stock-In, Stock-Out, Adjustment, and Transfer. |
| `/warehouse/inventory/:id` | `InventoryDetail.jsx` | Facility location details, on-hand vs. reserved breakdown, immutable stock movement audit history. |
| `/warehouse/purchase-orders` | `PurchaseOrdersList.jsx` | PO list with status badges, modal for verified partial/full goods receipt. |
| `/warehouse/purchase-orders/new` | `NewPurchaseOrder.jsx` | PO builder with dynamic line item rows, supplier contact details, and price auto-fill. |
| `/warehouse/packing` | `PackingQueue.jsx` | Confirmed sales orders ready for packing. |
| `/warehouse/packing/:orderId` | `OrderPacking.jsx` | BOM checklist, stock reservation toggle, interactive item checkboxes, and serial number attacher. |
| `/warehouse/serial-numbers` | `SerialNumbersList.jsx` | Serial registry, status filters, live QR Code verification simulator modal. |
| `/warehouse/serial-numbers/register` | `SerialRegistration.jsx` | Single registration and rapid batch paste import with automatic duplicate validation. |
| `/warehouse/dispatches` | `DispatchesList.jsx` | Outbound logistics table with transporter, tracking number, and delivery status. |
| `/warehouse/dispatches/new` | `NewDispatch.jsx` | Shipment manifest builder, carrier assignment, serial number allocation, and stock deduction authorization. |
| `/warehouse/dispatches/:id` | `DispatchDetail.jsx` | Dispatch manifest, printable delivery challan, and **"Confirm Equipment Delivery"** modal that activates warranties. |

---

## 5. Automated Verification & Test Results

The module includes an automated end-to-end test suite in `backend/tests/test_warehouse_module.mjs` verifying all 12 test scenarios:

```
=================================================================
SOLVIX WAREHOUSE, INVENTORY, SERIALS & DISPATCH TEST SUITE
=================================================================

TEST 1: Product Creation & Solar Specifications
  ✓ PASS: Product created with generated UUID
  ✓ PASS: Product SKU is preserved
  ✓ PASS: Solar category assigned correctly
  ✓ PASS: Warranty duration set to 300 months
  ✓ PASS: Initial inventory records auto-initialized across regional facilities
  ✓ PASS: Newly created product has initial quantity_on_hand = 0

TEST 2 & 3: Purchase Order Creation & Verified Goods Receipt
  ✓ PASS: Purchase order created successfully
  ✓ PASS: PO created in ordered state
  ✓ PASS: CRITICAL: Stock quantity_on_hand did NOT increase upon PO creation
Sub-test: Partial Goods Receipt (40 of 100)
  ✓ PASS: PO status updated to partially_received
  ✓ PASS: Inventory quantity_on_hand increased to exactly 40 units after verified receipt
Sub-test: Finalizing Receipt (remaining 60 units)
  ✓ PASS: PO status transitioned to received in full
  ✓ PASS: Inventory quantity_on_hand reached full 100 units

TEST 4: Stock Adjustment & Audit Trail
  ✓ PASS: Stock adjustment executed
  ✓ PASS: Quantity on hand updated to physical count (95)
  ✓ PASS: Negative movement delta of -5 recorded in movement log
  ✓ PASS: Non-negative stock guard prevented withdrawing more stock than available

TEST 5: Low-Stock Alerts & Thresholds
  ✓ PASS: Product identified in low-stock alerts list
  ✓ PASS: Alert shows 20 available against threshold 25

TEST 6 & 7: Inventory Reservation & Double-Reservation Prevention
  ✓ PASS: Stock reserved for order successfully
  ✓ PASS: quantity_on_hand remains 100 (unreduced by reservation)
  ✓ PASS: quantity_reserved increased to 12
  ✓ PASS: quantity_available reduced to 88 (100 - 12)
  ✓ PASS: Duplicate reservation safely recognized and skipped
  ✓ PASS: Double reservation prevented: quantity_reserved remains 12 (not 24)

TEST 8, 9 & 10: Serial Numbers, Duplicate Rejection & QR Lookup
  ✓ PASS: Single serial registered with unique ID
  ✓ PASS: QR code payload generated containing serial number
  ✓ PASS: Duplicate serial number registration was rejected
  ✓ PASS: Batch registration registered all 3 serial numbers
  ✓ PASS: Lookup by serial string succeeded
  ✓ PASS: Lookup returns product description
  ✓ PASS: Lookup by full QR payload succeeded

TEST 11: Dispatch Execution & Single Stock Deduction
  ✓ PASS: Dispatch created and authorized
  ✓ PASS: Dispatch status marked in_transit
  ✓ PASS: Stock deducted from quantity_on_hand: 100 - 12 = 88
  ✓ PASS: Reserved stock released back to 0 upon dispatch
  ✓ PASS: Available stock is exactly 88
  ✓ PASS: Attached serial numbers transitioned to status: dispatched

TEST 12: Equipment Delivery Confirmation & Warranty Clock Trigger
CRITICAL RULE: Warranty clock starts strictly on EQUIPMENT DELIVERY date
  ✓ PASS: Dispatch status updated to delivered
  ✓ PASS: Delivery record created with delivered_at timestamp
  ✓ PASS: Warranties activated for serial-tracked items
  ✓ PASS: Warranty record generated for serial SN-VIK-550-2026-00001
  ✓ PASS: CRITICAL: Warranty start_date (2026-11-21) equals equipment delivery date (2026-11-21)
  ✓ PASS: Warranty expiry_date (2051-11-21) is exactly 300 months after delivery date
  ✓ PASS: Serial number status is delivered

======================================================
WAREHOUSE TEST RUN COMPLETE: 45 PASSED, 0 FAILED
======================================================
```
