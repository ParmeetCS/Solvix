# Quotation and Order Module

## Overview
This module adds complete solar quotation, BOM (Bill of Materials), customer acceptance, order conversion, payment recording, and warehouse handoff functionality on top of the existing Sales/CRM and Site Survey modules.

## API Routes

### Staff APIs
- `GET /api/v1/sales/quotations` — List quotations (staff/admin)
- `POST /api/v1/sales/quotations` — Create quotation
- `GET /api/v1/sales/quotations/[id]` — Quotation detail (staff)
- `PATCH /api/v1/sales/quotations/[id]` — Update quotation status
- `POST /api/v1/sales/quotations/[id]/convert` — Convert to order
- `GET /api/v1/sales/orders` — List orders (staff/admin)
- `GET /api/v1/sales/orders/[id]` — Order detail (staff)
- `PATCH /api/v1/sales/orders/[id]` — Update order status
- `POST /api/v1/sales/orders/[id]/payments` — Record payment
- `GET /api/v1/sales/catalogue/*` — Admin catalogue management

### Customer APIs
- `GET /api/v1/customer/quotations` — List customer's quotations
- `GET /api/v1/customer/quotations/[id]` — View quotation (records "viewed" status)
- `GET /api/v1/customer/quotations/[id]/pdf` — Download PDF quotation
- `POST /api/v1/customer/quotations/[id]/accept` — Accept quotation (auto-creates order)
- `POST /api/v1/customer/quotations/[id]/reject` — Reject quotation

### Customer Portal (static pages)
- `src/pages/customer/QuotationsList.jsx` — Customer's quotation list
- `src/pages/customer/QuotationDetail.jsx` — Quotation detail view
- `src/pages/customer/OrderDetail.jsx` — Order detail and payments

### Admin Catalogue (standalone + API prefix)
- `GET /admin/catalogue` — Product catalogue page
- `GET /admin/catalogue/*` — API routes under `/api/v1/admin/catalogue/*`

## Workflow
```
Draft → Pending Approval → Approved → Sent → Viewed → Accepted/Rejected → Expired
                                    ↑
                    Converted to Order (idempotent RPC)
```

### Status transitions
| From → To | Condition |
|---|---|
| Draft → Pending Approval | — |
| Pending Approval → Approved | Staff approval |
| Approved → Sent | Staff send |
| Sent → Viewed | Customer opens PDF |
| Sent/Viewed → Accepted | Customer accepts |
| Sent/Viewed → Rejected | Staff or customer with reason |
| Any → Expired | Validity date passed (RPC) |
| Accepted → Converted to Order | `convert_quotation_to_order()` RPC |

### Idempotent conversion
Calling `convert_quotation_to_order()` repeatedly returns the existing order without creating duplicates. The RPC is atomic: order, quotation status history, and quotation status update all complete in one transaction.

### Payment recording
- `record_order_payment()` RPC records payments and recalculates `balance_due`
- Payment status auto-updates: `pending` → `partial` → `paid`
- When `paid` status reached, order status auto-confirms: `pending_payment` → `confirmed`
- Manual payments use `gateway_verified=false`; verified gateway calls must set `p_gateway_verified=true`

### Warehouse handoff
When an order status is `confirmed`, `processing`, `awaiting_dispatch`, or `paid`, a `warehouse_handoff_at` timestamp is set (via trigger or admin action), making the order available to warehouse operations. The orders list supports a `warehouse_ready=true` filter.

## Database Migration: `002_quotation_order_module.sql`
Added in additive fashion (does not alter base schema):

### New tables/extensions
- `product_packages` — Configurable 1–5 kW package definitions
- `package_items` — Component items within each package
- `quotation_status_history` — Audit trail for quotation status changes
- `quotation_comments` — Internal/external comments on quotations

### Extended tables
- `quotations`: `package_id`, `system_type`, `system_capacity_kw`, `total_amount`, `tax_amount`, `validity_date`, `status` constraint extension
- `orders`: `quotation_id`, `created_by`, `advance_paid`, `balance_due`, `payment_status`, `status` constraint extension
- `payments`: `gateway_verified`, `status` field enhancements
- `order_status_history` — Audit trail for order status changes

### RLS policies
- Packages: authenticated staff may read; only admins write
- Package items: authenticated staff may read; only admins write
- Quotation status history: authenticated users may read; creators may insert
- Quotation comments: customers may insert non-internal comments; admins may insert all
- Orders: staff may CRUD their own; admins may all

### RPC functions (security definer)
| Function | Purpose |
|---|---|
| `current_customer_id()` | Resolves customer ID from profile/email |
| `is_staff()` | Checks if current user has staff role |
| `save_product_package()` | Create/update package with composition |
| `convert_quotation_to_order()` | Atomic quotation → order conversion (idempotent) |
| `record_order_payment()` | Record payment, recalculate balances |
| `expire_quotations()` | Mark past-validity quotations as expired |

### Seed data
- 10 generic product packages (1–5 kW, on-grid/off-grid/hybrid)
- 9 product categories, ~15 base products (populate packages from these)

## Security
- **Security-definer RPCs**: Only `service_role` may execute. `revoke all from public/anon/authenticated`; `grant execute to service_role`.
- **Customer quotation access**: Only quotations with issued statuses (`sent`, `viewed`, `accepted`, `rejected`, `expired`, `converted_to_order`) are exposed. Drafts and internal-review quotations return 404.
- **Customer order access**: Orders are access-controlled via `created_by` (quotation owner). Customers may only access orders linked to their `customer_id`.
- **No duplicate conversion**: RPC returns `already_exists=true` on repeat calls.

## Frontend
- `src/pages/sales/QuotationsList.jsx` — Staff quotation list with status badges
- `src/pages/sales/QuotationDetail.jsx` — Workflow actions, comments, acceptance
- `src/pages/sales/OrderDetail.jsx` — Payments, statuses, warehouse handoff
- `src/pages/sales/OrdersList.jsx` — Staff order listing with filters
- `src/pages/sales/QuotationBuilder.jsx` — Package/BOM builder with capacity validation (1–5 kW)
- `src/components/quotation/` — Shared quotation UI components
- `src/lib/quotation.js` — Shared calculation and access helpers
- `src/services/api/quotations.js` — Frontend API surface (reads `{success, message, data}` envelope)
- PDF generation: `backend/lib/pdf/quotationPdf.js` — Helvetica-based PDF 1.4, currency `INR`

## Backend (Next.js App Router)
- Route handlers in `backend/app/api/v1/sales/quotations/`, `orders/`, `catalogue/`, `customer/quotations/`
- Route handlers in `backend/app/api/v1/customer/quotations/`, `orders/`
- Helpers in `backend/lib/quotation/data.js`, `workflow.js`, `http.js`
- Role helpers in `backend/lib/supabase/roles.js`
- PDF generation in `backend/lib/pdf/quotationPdf.js`

## Tests
Run: `npm test --workspace=backend`
- 27 tests covering: calculations, codes, BOM, PDF generation, quotation workflow, order workflow
- All tests pass after fixes

## Known Pre-existing Issues (not related to this module)
- (Resolved) the old `/api/admin/*` routes were replaced by `/api/v1/admin/*`.
- Full production build may require resolving those pre-existing admin route issues
- No `.env` or Supabase credentials configured for live DB integration tests