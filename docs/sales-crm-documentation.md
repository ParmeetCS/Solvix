# SOLVIX Sales & CRM Module — Technical Deliverable

## 1. Overview
The Sales & Customer Relationship Management (CRM) module provides an end-to-end workflow to capture, qualify, track, follow up, and hand off solar project leads to survey and quotation teams.

All figures and records query directly from Supabase PostgreSQL tables without mock placeholders or duplicate schemas.

---

## 2. Frontend Routes & Components
Located in `src/pages/sales/`:

| Route | Component | Purpose |
| :--- | :--- | :--- |
| `/sales/dashboard` | `SalesDashboard.jsx` | Live sales figures, pipeline stage counts, upcoming follow-ups, acquisition distribution, and conversion rates |
| `/sales/leads` | `LeadsList.jsx` | Searchable & filterable lead pipeline table with pagination, priority indicators, and assignee scopes |
| `/sales/leads/new` | `NewLead.jsx` | Lead creation form with real-time duplicate phone/email detection and immediate employee assignment |
| `/sales/leads/:id` | `LeadDetail.jsx` | Full lead overview with status updating, lost reason logging, re-assignment modal, follow-up scheduling, and survey handoff |
| `/sales/follow-ups` | `FollowUpsList.jsx` | Tabbed follow-ups (overdue, pending, upcoming, completed) with quick completion and rescheduling modals |
| `/sales/whatsapp-enquiries` | `WhatsAppEnquiries.jsx` | Centralized WhatsApp inbox, click-to-chat links (`wa.me/<phone>`), and 1-click conversion to lead |
| `/sales/customers` | `CustomersList.jsx` | Directory of verified solar customers with search, account registration, and linked lead summaries |
| `/sales/customers/:id` | `CustomerDetail.jsx` | 360° customer profile displaying addresses, past leads, quotations, installation orders, and interaction timeline |

All pages share the unified `SalesLayout.jsx` sidebar and night-first theme styling defined in `crm.css`.

---

## 3. Backend APIs
Located in `backend/app/api/v1/sales/`:

### Authentication & Authorization (`salesAuth.js`)
All endpoints enforce centralized RBAC via Bearer tokens:
- **Administrators**: Full organization-wide view and management across all leads, assignments, and reps.
- **Sales Specialists**: Scoped to view and manage leads and follow-ups assigned to their profile, or within the Sales department.
- **Unauthorized / Suspended / Other Roles**: Promptly rejected with `401 Unauthorized` or `403 Forbidden`.
- **Activity Auditing**: Critical operations (`LEAD_CREATED`, `LEAD_STATUS_CHANGED`, `LEAD_REASSIGNED`, `FOLLOW_UP_SCHEDULED`, `CUSTOMER_REGISTERED`, `SURVEY_REQUESTED`) automatically log to `activity_logs`.

### API Endpoints
1. `GET /api/v1/sales/dashboard` — Live counts (total, new, contacted, qualified, converted, lost, due today, overdue), funnel breakdown, sources, recent leads, and rep conversion performance.
2. `GET /api/v1/sales/leads` — Paginated leads list with query filters (`search`, `status`, `source`, `priority`, `assigned_to`, `check_duplicate`).
3. `POST /api/v1/sales/leads` — Lead creation with duplicate detection on phone/email.
4. `GET /api/v1/sales/leads/[id]` — Detailed lead data, assignment history, scheduled follow-ups, and interaction timeline.
5. `PATCH /api/v1/sales/leads/[id]` — Field editing, status progression, and mandatory lost reason logging.
6. `POST /api/v1/sales/leads/[id]/assign` — Lead assignment and reassignment audit logging in `lead_assignments`.
7. `POST /api/v1/sales/leads/[id]/survey-request` — Handoff for qualified leads into `site_surveys` table.
8. `GET /api/v1/sales/employees` — Active sales staff listing with current active lead workload counts.
9. `GET /api/v1/sales/follow-ups` — Follow-up listing filtered by `filter=overdue|upcoming|pending|completed|all`.
10. `POST /api/v1/sales/follow-ups` — Schedule a new follow-up and auto-update lead status to `follow_up_required`.
11. `PATCH /api/v1/sales/follow-ups/[id]` — Mark completed with outcome, or reschedule.
12. `GET /api/v1/sales/interactions` — List customer and lead touchpoint history.
13. `POST /api/v1/sales/interactions` — Log interaction (Phone call, WhatsApp, Meeting, Site Visit, Email).
14. `GET /api/v1/sales/whatsapp-enquiries` — Centralized WhatsApp enquiry log.
15. `POST /api/v1/sales/whatsapp-enquiries` — Manual or webhook entry for WhatsApp message.
16. `POST /api/v1/sales/whatsapp-enquiries/[id]/convert` — Convert enquiry into a formal lead and link records.
17. `GET /api/v1/sales/customers` — List registered customers with duplicate detection.
18. `POST /api/v1/sales/customers` — Register customer or link to existing customer (prevents duplicate customer profiles).
19. `GET /api/v1/sales/customers/[id]` — 360° profile aggregating addresses, leads, quotations, orders, and interactions.

---

## 4. Database Migrations
File: `database/migrations/001_crm_sales_module.sql`
- Safely extends `leads` check constraints (`source`, `status`) to support modern channels (`social_media`) and stages (`survey_requested`, `follow_up_required`).
- Adds CRM-specific columns to `leads` (`customer_name`, `phone`, `email`, `address`, `system_type`, `expected_capacity_kw`, `monthly_electricity_bill`, `additional_requirements`, `priority`, `lost_reason`).
- Extends `follow_ups` with `follow_up_type` (`phone_call`, `whatsapp`, `email`, `meeting`, `other`).
- Adds the integration-ready `whatsapp_enquiries` table with full Row Level Security (RLS) policies and indexes.

---

## 5. WhatsApp API Integration Architecture
The WhatsApp module is **architecture-ready**:
- **Current Mode**: Supports manual entry of WhatsApp enquiries and direct click-to-chat links via standard `https://wa.me/<E.164-phone>?text=...`.
- **Future Live Webhook**:
  - Connect your webhook URL to `POST /api/v1/sales/whatsapp-enquiries`.
  - Provide Meta Cloud API or Twilio credentials in `backend/.env` (`WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`).
  - Webhook payloads will auto-insert into `whatsapp_enquiries` with `raw_payload`, triggering real-time notifications without altering frontend UI.
