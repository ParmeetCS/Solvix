# SOLVIX database

Two files. Run them once, in order, on a **new, empty** Supabase project.

| Order | File | Purpose |
|------:|------|---------|
| 1 | `solvix_schema.sql` | Everything: tables, constraints, functions, Row Level Security, grants, seed roles and departments |
| 2 | `02_bootstrap_admin.sql` | Promotes the first Administrator (after you create the user in Supabase Auth) |

## Setup

1. Create a Supabase project and copy **Project URL**, **anon key** and **service_role key**
   from *Project Settings → API*.
2. *SQL Editor* → paste `solvix_schema.sql` → **Run**. You should see
   `SOLVIX schema created successfully.`
3. *Authentication → Users → Add user*: create the administrator with **Auto Confirm User** ticked.
4. Edit the email in `02_bootstrap_admin.sql` and run it.
5. Put the credentials in `backend/.env.local` (never commit it):

   ```
   SUPABASE_URL=https://<project-ref>.supabase.co
   SUPABASE_ANON_KEY=<anon key>
   SUPABASE_SERVICE_ROLE_KEY=<service_role key>
   ```
6. *Authentication → Providers → Email*: for customer self-sign-up to work end to end either
   turn **Confirm email** off, or keep it on and let customers confirm by email before signing in.

## Security model

* The Next.js backend uses the `service_role` key and checks the caller's account type and
  department on every request (see `backend/lib/supabase/access.js`).
* Row Level Security is **enabled on every table** with no open policies. Customers can only
  see their own orders, invoices and subsidy applications; finance and subsidy staff only
  their own areas; `anon` has no privileges at all.
* Storage buckets `survey-attachments`, `subsidy-documents` and `finance-documents` are
  private and have no storage policies, so only the backend can read or write them.
* `financial_transactions` is append-only and payments, invoices and expenses can't be deleted;
  corrections are recorded as reversals, refunds or voids.

## Roles and departments

`profiles.account_type` is `admin`, `employee` or `customer`. Employees reach a dashboard only
after an Administrator assigns a department (seeded codes: `SALES`, `SURVEY`, `INSTALLATION`,
`WAREHOUSE`, `SUPPORT`, `FINANCE`, `SUBSIDY`).

## Money rules enforced in the database

* Invoice totals are always computed from line items inside the database.
* One active invoice per order and billing event unless a *supplementary* invoice with a reason is created.
* A payment counts as **collected** only after it is `verified` (gateway or authorised manual reconciliation).
* Duplicate payment references and over-payments are rejected.
