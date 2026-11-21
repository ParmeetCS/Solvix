# SOLVIX Site Survey & Solar Feasibility Module Documentation

## 1. Module Overview
The **Site Survey & Solar Feasibility Module** is an enterprise-grade technical inspection system within SOLVIX that bridges the CRM/Sales qualification process and the engineering quotation workflow.

It empowers:
- **Sales Specialists**: To submit site survey requests directly from qualified leads.
- **Survey Managers & Administrators**: To dispatch and assign field engineers, schedule visit slots, monitor surveyor workloads, and review technical feasibility submissions.
- **Field Survey Engineers**: To complete mobile-friendly digital site inspection forms, save in-progress drafts, record roof/electrical measurements, upload categorized photos (roof, electrical, shading, site), and submit feasibility reports.
- **Technical Reviewers**: To approve, reject, or request revisits with audit comments, feeding approved technical data directly into the Quotation generation engine.

---

## 2. Routes & Navigation

| Route | Purpose | Role Access |
|---|---|---|
| `/survey/dashboard` | Main operations dashboard with real-time KPI metrics, status charts, recent assignments, upcoming visits | Admin, Survey Manager, Surveyor, Sales |
| `/survey/requests` | Comprehensive survey requests pipeline with search, status & priority filtering | Admin, Survey Manager, Surveyor, Sales |
| `/survey/requests/:id` | Full survey request profile with customer info, specs, photo gallery, and audit timeline | Admin, Survey Manager, Assigned Surveyor, Sales |
| `/survey/requests/:id/inspection` | Mobile-friendly digital field survey form with draft saving & multi-step field inspection | Field Surveyor, Survey Manager, Admin |
| `/survey/assignments` | Surveyor workload capacity cards, dispatch controls, and assignment logs | Admin, Survey Manager |
| `/survey/schedule` | Calendar view of scheduled site visits, agenda by date, and visit rescheduling | Admin, Survey Manager, Surveyor |
| `/survey/approvals` | Technical review queue for submitted surveys (Approve, Reject, Request Revisit) | Admin, Survey Manager |

---

## 3. Database Schema & Integration

### Tables Reused & Extended

1. **`site_surveys`**:
   - `id` (uuid, PK)
   - `survey_code` (text, unique e.g., `SRV-2026-1011`)
   - `lead_id` (uuid, references `leads.id`)
   - `customer_id` (uuid, references `customers.id`)
   - `customer_name`, `contact_phone`, `contact_email`
   - `site_address`, `city`, `state`, `pincode`
   - `property_type` (`residential`, `commercial`, `industrial`, `institutional`, `agricultural`)
   - `electricity_connection_type` (`single_phase`, `three_phase`, `lt`, `ht`)
   - `monthly_electricity_bill` (numeric)
   - `sanctioned_load_kw` (numeric)
   - `roof_type` (`rcc_flat`, `metal_sheet`, `tiled`, `asbestos`, `shed`, `curved`, `ground`)
   - `roof_area_sqm`, `available_installation_area_sqm` (numeric)
   - `roof_direction` (`north`, `south`, `east`, `west`, `flat`, `mixed`, etc.)
   - `roof_tilt_degrees` (numeric)
   - `shading_conditions` (`none`, `partial_morning`, `partial_evening`, `nearby_trees`, `nearby_buildings`, `heavy`)
   - `roof_condition` (`excellent`, `good`, `fair`, `needs_repair`, `unsuitable`)
   - `structural_concerns` (text)
   - `grid_availability` (`stable`, `frequent_outages`, `highly_intermittent`, `off_grid`)
   - `main_panel_condition` (`good`, `acceptable`, `aged_needs_upgrade`, `dangerous`)
   - `earthing_availability` (`adequate`, `inadequate`, `dedicated_needed`, `not_available`)
   - `cable_distance_m` (numeric)
   - `recommended_capacity_kw` (numeric)
   - `recommended_system_type` (`on-grid`, `off-grid`, `hybrid`)
   - `potential_constraints`, `additional_requirements` (text)
   - `status` (`pending`, `assigned`, `scheduled`, `in_progress`, `submitted`, `approved`, `rejected`, `revisit_required`)
   - `priority` (`low`, `medium`, `high`, `urgent`)
   - `is_draft` (boolean), `draft_data` (jsonb)
   - `assigned_to` (uuid, references `profiles.id`)
   - `scheduled_date` (date), `scheduled_time` (text)
   - `completed_at` (timestamptz)

2. **`survey_assignments`**:
   - `id` (uuid, PK)
   - `survey_id` (uuid, references `site_surveys.id`)
   - `assigned_to` (uuid, references `profiles.id`)
   - `assigned_by` (uuid, references `profiles.id`)
   - `assigned_at` (timestamptz)
   - `scheduled_at` (timestamptz)
   - `status` (`assigned`, `rescheduled`, `completed`, `cancelled`)
   - `notes` (text)
   - `is_active` (boolean)

3. **`survey_photos`**:
   - `id` (uuid, PK)
   - `survey_id` (uuid, references `site_surveys.id`)
   - `storage_path` (text, private authenticated path in Supabase Storage `survey-attachments`)
   - `photo_type` (`roof`, `electrical`, `site`, `shading`, `other`)
   - `caption`, `description` (text)
   - `file_name`, `file_type`, `file_size_bytes`
   - `uploaded_at` (timestamptz), `uploaded_by` (uuid, references `profiles.id`)

4. **`survey_reports`**:
   - `id` (uuid, PK)
   - `survey_id` (uuid, references `site_surveys.id`)
   - `report_text`, `executive_summary` (text)
   - `recommended_capacity_kw` (numeric)
   - `estimated_cost` (numeric)
   - `feasibility_rating` (`feasible`, `partially_feasible`, `not_feasible`, `requires_special_engineering`)
   - `calculation_assumptions` (text)
   - `submitted_at` (timestamptz), `submitted_by` (uuid)

5. **`survey_approvals`**:
   - `id` (uuid, PK)
   - `survey_id` (uuid, references `site_surveys.id`)
   - `status` (`pending`, `approved`, `rejected`, `revision_requested`, `revisit_required`)
   - `reviewed_by` (uuid, references `profiles.id`)
   - `reviewed_at` (timestamptz)
   - `comments` (text)

---

## 4. Backend REST API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/survey/dashboard` | `GET` | Aggregated dashboard KPI figures, pipeline charts, and recent activity |
| `/api/v1/survey/requests` | `GET` | Filtered list of survey requests (search, status, priority, surveyor) |
| `/api/v1/survey/requests` | `POST` | Create a new site survey request directly |
| `/api/v1/survey/requests/:id` | `GET` | Retrieve complete survey details, attachments, report, and approvals |
| `/api/v1/survey/requests/:id` | `PATCH` | Update basic survey properties, notes, or priority |
| `/api/v1/survey/requests/:id/assign` | `POST` | Assign or reassign surveyor; records history and sends notification |
| `/api/v1/survey/requests/:id/schedule` | `POST` | Schedule or reschedule visit date, time window, and confirmed address |
| `/api/v1/survey/requests/:id/draft` | `POST` | Save draft inspection form data non-destructively for later resumption |
| `/api/v1/survey/requests/:id/submit` | `POST` | Finalize field inspection, update status to `submitted`, generate report |
| `/api/v1/survey/requests/:id/photos` | `GET` | List photographs and documents with secure signed URLs |
| `/api/v1/survey/requests/:id/photos` | `POST` | Upload and attach photo (validates <= 10MB, JPG/PNG/WEBP/PDF) |
| `/api/v1/survey/requests/:id/report` | `GET` | Generate structured solar feasibility report with explicit calculations |
| `/api/v1/survey/requests/:id/approval` | `POST` | Technical review decision: Approve, Reject, or Request Revisit |
| `/api/v1/survey/requests/:id/history` | `GET` | Full timeline audit log of all survey events |
| `/api/v1/survey/surveyors` | `GET` | Field engineers list with active workload and completed survey count |

---

## 5. Engineering Calculations & Documented Assumptions

The system clearly differentiates **measured values**, **surveyor estimates**, and **engineering calculations**:
- **Area Requirement**: 1 kWp crystalline silicon PV array requires approx **9.5 to 10 sqm** (~100 sq.ft) of shadow-free roof area.
- **Solar Insolation**: Sizing models are derived from **4.8 Peak Sun Hours (PSH)** daily average representative of North/Central Indian solar irradiance.
- **Performance Ratio (PR)**: Factored at **78%** to realistically account for thermal derating, DC/AC cable resistance, inverter conversion loss, and seasonal dust accumulation.
- **Specific Yield**: Calculated at **1,450 to 1,480 kWh / kWp / year**.
- **Environmental Offset**: Carbon mitigation calculated at **0.82 kg CO₂ / kWh** as per Central Electricity Authority (CEA) standard baseline.

---

## 6. Security & Storage Policies

1. **Role-Based Access Control**:
   - Non-admin surveyors can only access and update surveys assigned to their user ID.
   - Technical Reviewers and Admins possess full clearance to reassign and approve/reject surveys.
   - Customers have zero access to internal engineering reports.
2. **Supabase Storage**:
   - Uses private bucket `survey-attachments`.
   - File size enforced strictly at 10 MB.
   - Storage RLS enforces authenticated role access; files are accessed via time-limited signed URLs.
