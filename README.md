# SOLVIX - Solar Installation Management Platform

One system for the whole journey of a rooftop-solar job, from the customer's first enquiry to
warranty support and financial reporting. See [docs/workflow.md](docs/workflow.md).

## Stack

| Part | Technology |
|------|------------|
| Frontend (repo root) | React 19, Vite, React Router, Axios, Lucide icons |
| Backend (`backend/`) | Next.js 15 route handlers (REST API on port 3001) |
| Data | Supabase: PostgreSQL, Auth, Storage, Row Level Security |

## Getting started

1. **Database** - follow [database/README.md](database/README.md): run `database/solvix_schema.sql`,
   create the admin user in Supabase Auth, run `database/02_bootstrap_admin.sql`.
2. **Backend settings** - copy `backend/.env.example` to `backend/.env.local` and fill in
   `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`. Never commit this file.
3. **Run** (from the repo root):

   ```
   npm install
   npm run dev
   ```

   Frontend: http://localhost:5173 - API: http://localhost:3001. The frontend calls `/api/...` and
   Vite forwards it to the backend, so no CORS or URL settings are needed in development.

## Project layout

```
src/
  App.jsx                routes only
  pages/
    Landing.jsx          public website (loads its own fonts/animation)
    auth/                one sign-in page per user type
    admin/               overview, people & access, reports, activity log, catalogue
    sales/               leads, follow-ups, customers, quotations, orders
    survey/              site surveys, assignments, approvals
    installation/        jobs, technicians, schedule
    technician/          technician "My day"
    warehouse/           stock, purchase orders, packing, serial numbers, dispatch
    support/             tickets, warranties, claims
    finance/  subsidy/   dashboards
    customer/            customer portal
  components/            route guards, shared layout, public forms
  config/navigation.js   sidebar menu for every user type
  context/auth.jsx       signed-in user
  theme/                 light / dark mode (variables in theme.css, toggle button)
  services/api/          one API wrapper per module
backend/
  app/api/auth           sign in, register, refresh
  app/api/enquiries      public "Get a quote" endpoint
  app/api/v1/<module>    admin, sales, survey, installation, warehouse, support, finance, subsidy, customer
  lib/supabase/access.js role and department checks used by every module
database/                the schema, admin bootstrap and patches
docs/                    workflow, authentication, module notes
```

## Tests

```
cd backend && npm test        # business rules and access rules (no database needed)
cd backend && npm run e2e     # end-to-end API check against the running backend and your Supabase project
```

`npm run e2e` creates temporary test accounts and records, checks sign-in, role access and the
quote-to-order workflow, then deletes everything. Read the header of `backend/scripts/e2e-api.mjs` first.

## Documentation

- [Workflow and who uses what](docs/workflow.md)
- [Authentication and roles](docs/authentication-and-roles.md)
- Module notes: [sales](docs/sales-crm-documentation.md), [survey](docs/site-survey-documentation.md),
  [quotations & orders](docs/QUOTATION_ORDER_MODULE.md), [warehouse](docs/warehouse-inventory-documentation.md),
  [installation](docs/installation-module.md)
