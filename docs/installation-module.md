# SOLVIX — Installation, Technician Assignment & Project Execution Module (Module 9)

## Overview

The **Installation and Technical Operations Module** manages the complete project execution lifecycle of a solar installation project once an order has been confirmed and equipment delivered from the warehouse. It connects the back-office operations team, field engineering technicians, and the customer through structured digital workflows.

---

## Technical Stack & Architecture

- **Frontend:** React + Vite, React Router DOM, Tailwind CSS (preflight disabled), Lucide React
- **Backend:** Next.js 15 App Router Route Handlers (`/api/v1/installation/*`), Zod validation
- **Database:** Supabase PostgreSQL with Section G tables (`technicians`, `technician_assignments`, `installations`, `installation_tasks`, `installation_photos`, `installation_reports`, `customer_signatures`)
- **Security & RBAC:** Scoped technician access (`/api/v1/installation/my-jobs`), authorized manager operations, digital signature evidence, technical safety disclaimer enforcement.

---

## Routes & Pages

| Route | Component | Purpose |
|---|---|---|
| `/installation/dashboard` | `InstallationDashboard.jsx` | Operations cockpit: KPIs, pipeline progress, technician workloads, upcoming visits, "+ New Job from Order" modal |
| `/installation/jobs` | `InstallationJobsList.jsx` | Full filterable directory of installation projects with search, status, and technician filters |
| `/installation/jobs/:id` | `InstallationJobDetail.jsx` | 6-step project command center (Overview, Equipment Verification, Checklist, Photos, Commissioning, Completion) |
| `/installation/assignments` | `InstallationAssignments.jsx` | Multi-technician assignment cockpit with lead technician designation and double-booking conflict prevention |
| `/installation/schedule` | `InstallationSchedule.jsx` | Visual timeline of installation visits, date filtering, and reschedule modal |
| `/installation/technicians` | `TechniciansList.jsx` | Field technician team directory, skills, certifications, active workload meters, and availability toggle |
| `/installation/technicians/:id` | `TechnicianDetail.jsx` | Individual technician profile, contact details, daily capacity, and assignment history |
| `/technician/dashboard` | `TechnicianDashboard.jsx` | **Mobile-friendly field technician app** for smartphones/tablets: today's site visits, click-to-call, checklist, serial scan |

---

## REST API Endpoints (`/api/v1/installation/`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/installation/dashboard` | Aggregated KPIs (Total, Pending, Scheduled, In Progress, Completed, Delayed, Upcoming), technician workloads, recent activity |
| `GET` | `/installation/jobs` | Scoped list of installation jobs with search, status, technician, and date filters |
| `POST` | `/installation/jobs` | Create installation project from an eligible confirmed order (prevents duplicate jobs) |
| `GET` | `/installation/jobs/:id` | Full installation job bundle (customer, site address, survey info, BOM, serials, team, tasks, photos, commissioning, signature) |
| `PATCH` | `/installation/jobs/:id` | Update general job notes and metadata |
| `POST` | `/installation/jobs/:id/status` | Advance or update installation status with prerequisite checks |
| `POST` | `/installation/jobs/:id/assign` | Assign multi-technician team, designate lead installer, check double-booking |
| `POST` | `/installation/jobs/:id/schedule` | Schedule or reschedule project visit dates |
| `POST` | `/installation/jobs/:id/equipment-verify` | Verify delivered equipment serial numbers from Warehouse records, record missing/damaged items or authorized exceptions |
| `GET` | `/installation/jobs/:id/tasks` | Get the 11 digital checklist tasks |
| `POST` | `/installation/jobs/:id/tasks` | Update checklist task completion status, author, remarks, and photo evidence |
| `GET` | `/installation/jobs/:id/photos` | List associated photographs categorized by milestone |
| `POST` | `/installation/jobs/:id/photos` | Upload milestone photograph (pre-install, progress, panel, inverter, earthing, wiring, completion) |
| `POST` | `/installation/jobs/:id/commissioning` | Submit verified electrical test values (Voc, Isc, Grid V, Earth resistance in Ohm, insulation test result) with safety disclaimer |
| `POST` | `/installation/jobs/:id/signature` | Capture customer digital acknowledgement signature evidence via canvas |
| `GET` | `/installation/jobs/:id/report` | Fetch compiled installation completion report |
| `POST` | `/installation/jobs/:id/report` | Validate all 4 completion prerequisites, compile official completion report, transition status to `completed` |
| `GET` | `/installation/technicians` | List all certified technicians with availability, workload percentages, and active assignments |
| `GET` | `/installation/technicians/:id` | Get technician profile and assignment history |
| `PATCH` | `/installation/technicians/:id/availability` | Toggle availability status or update daily capacity |
| `GET` | `/installation/my-jobs` | Scoped personal queue for field technicians (today's visits, active in-progress jobs, pending checklist items) |
| `GET` | `/installation/eligible-orders` | Fetch confirmed / delivered orders ready for installation project generation |

---

## 11 Standard Digital Checklist Tasks

1. **Site readiness verified**: Terrace access, parapet height, structural stability, scaffolding barricades.
2. **Mounting structure installed**: South tilt alignment, HDGI/Aluminium anchor fastener torque check.
3. **Solar panels installed**: Mid-clamp and end-clamp torque verification, inter-panel spacing.
4. **Inverter installed**: Shaded wall mount, ventilation clearance, IP-65 weather sealing.
5. **Battery installed (where applicable)**: Battery rack, DC fuse isolator, lithium/lead-acid terminal torque.
6. **Electrical connections checked**: DC MC4 crimping, polarity check, dedicated AC isolator.
7. **Earthing checked**: Separate earthing pits for AC, DC, and Lightning Arrestor measured with earth tester (&lt; 2.0 Ohm).
8. **Protection equipment checked**: DCDB (Type II Surge Protection Device + DC Fuses), ACDB (SPD + MCB).
9. **Wiring inspected**: UV-resistant solar cables, neat tagging, rigid conduit pipe routing.
10. **System testing completed**: Voc, Isc, anti-islanding trip time (&lt; 20ms), grid synchronization.
11. **Customer demonstration completed**: App monitoring onboarding, emergency shutdown procedure, panel cleaning.

> **Safety Notice:** Digital checklists are supervisory verification tools and do not substitute for qualified technical or electrical engineering protocols.

---

## Warranty Milestone Integrity

In strict adherence to Prompt 9 requirements:
- **Warranty start dates are NOT modified upon installation completion.**
- The warranty clock starts strictly from the **actual equipment delivery milestone** as established in Prompt 8.
- Serial numbers recorded in `equipment_serial_numbers` retain their `warranty_start_date` anchored to the dispatch/delivery timestamp.

---

## Verification & Testing

The module includes an automated end-to-end test suite (`backend/tests/test_installation_module.mjs`) covering all 12 Prompt 9 verification items:
- 32/32 tests passing.
- Full frontend and backend production build verified (`npm run build`).
