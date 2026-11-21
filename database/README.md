# SOLVIX Database

This folder contains the complete, single-file database schema for the SOLVIX
Solar Installation Management Platform.

## File

`database/solvix_complete_schema.sql` — one self-contained, executable SQL
script that creates the entire initial database structure (tables, indexes,
functions, triggers, Row Level Security policies) in one go.

## How to execute in Supabase

1. **Create a Supabase project**
   - Go to https://supabase.com and create a new project.
   - Note the project reference, URL, and API keys from
     **Project Settings → API**.

2. **Open the SQL Editor**
   - In the Supabase dashboard, open **SQL Editor** from the left sidebar.

3. **Open the schema file**
   - Copy the entire contents of
     `database/solvix_complete_schema.sql`
     and paste it into the SQL Editor query tab.

4. **Execute once**
   - Click **Run** to execute the complete script.
   - The script is designed for a **fresh project**. Do not blindly rerun it on
     a populated database — it does not drop existing tables or data.

5. **Verify all tables were created**
   - In the SQL Editor, run:
     ```sql
     select table_name
     from information_schema.tables
     where table_schema = 'public'
       and table_type = 'BASE TABLE'
     order by table_name;
     ```
   - You should see tables across sections A–L (profiles, departments, roles,
     customers, leads, quotations, orders, products, inventory, installations,
     warranties, service_tickets, invoices, notifications, etc.).

## Creating the first Admin (secure bootstrap)

Do NOT hardcode an Admin UUID or invent an authentication account.

1. Sign up a real user through Supabase Auth (or invite them via the Supabase
   dashboard **Authentication → Users**).
2. Copy the new user's `id` from **Authentication → Users**.
3. Create an `admin` role and assign it:
   ```sql
   insert into roles (name, code, is_system)
   values ('Administrator', 'admin', true)
   on conflict (code) do nothing;

   update profiles
   set role_id = (select id from roles where code = 'admin')
   where auth_user_id = '<REAL_AUTH_USER_ID>';
   ```
4. Create required departments and permissions as needed, then link them via
   `role_permissions` and `employee_departments`.

## Configuring Supabase environment variables

Create `backend/.env` (from `backend/.env.example`) with:

```
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

- `SUPABASE_URL` and `SUPABASE_ANON_KEY` — from Project Settings → API.
- `SUPABASE_SERVICE_ROLE_KEY` — the service_role key (server-side only, bypasses RLS).
- Never commit `.env` to Git. Only `.env.example` is tracked.

## Troubleshooting common SQL errors

| Error | Likely cause | Fix |
|-------|--------------|-----|
| `relation "auth.users" does not exist` | Supabase Auth not initialized | Ensure Auth is enabled in the Supabase project; `auth.users` is provided by Supabase automatically. |
| `permission denied for schema pgcrypto` | pgcrypto extension missing | The script runs `create extension if not exists pgcrypto`; ensure the database user can create extensions (Supabase postgres user can). |
| `duplicate key` / `already exists` | Script run more than once | The script uses `create table if not exists` and `create extension if not exists`. For a clean state, start from a fresh project. |
| RLS policy blocks access | Policies restrict non-admin access | Sign in as a user with the `admin` role, or adjust policies temporarily for testing. |

## Table groups

- **A. User & Department:** profiles, departments, roles, permissions, role_permissions, employee_departments
- **B. Customer & Lead:** customers, customer_addresses, leads, lead_assignments, follow_ups, customer_interactions
- **C. Site Survey:** site_surveys, survey_assignments, survey_photos, survey_reports, survey_approvals
- **D. Quotation & Order:** quotations, quotation_items, orders, order_status_history, payments
- **E. Product & Warehouse:** product_categories, products, warehouses, inventory, stock_movements, inventory_reservations, purchase_orders, purchase_order_items
- **F. Equipment & Dispatch:** equipment_serial_numbers, dispatches, dispatch_items, equipment_deliveries
- **G. Technician & Installation:** technicians, technician_assignments, installations, installation_tasks, installation_photos, installation_reports, customer_signatures
- **H. Warranty:** warranties, warranty_claims, warranty_history
- **I. Support & Service:** service_tickets, service_ticket_updates, repair_assignments, replacement_records, customer_feedback
- **J. Accounts & Finance:** invoices, invoice_items, expenses, project_costs, technician_payments, financial_transactions
- **K. Subsidy & Documentation:** subsidy_applications, subsidy_documents, documents, document_verification_history
- **L. Notifications & Activity:** notifications, activity_logs
