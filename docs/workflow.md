# SOLVIX business workflow

Every module reads and writes the same Supabase database, so a record created in one step is
the starting point of the next. The Admin overview (`/admin/dashboard`) shows how many records
sit at each stage.

| # | Step | Who | Where in the app |
|--:|------|-----|------------------|
| 1 | **Customer enquiry** - website "Get a quote", or sales logs a call / WhatsApp enquiry | Customer, Sales | `/get-quote` -> `POST /api/enquiries` creates an unassigned lead; `/sales/whatsapp-enquiries` |
| 2 | **Lead management** - contact the customer, verify requirements, update status | Sales | `/sales/leads`, `/sales/follow-ups` (Sales also sees the unassigned queue; Admin assigns) |
| 3 | **Site survey** - technician visits, measures, photographs | Technician | `/survey/requests`, inspection form |
| 4 | **Survey approval** - manager reviews | Manager / Admin | `/survey/approvals` |
| 5 | **Quotation** - generated from the approved survey and package BOM | Sales | `/sales/quotations`; catalogue at `/admin/catalogue` |
| 6 | **Customer acceptance and payment** | Customer, Sales | `/customer/quotations`, payments on `/sales/orders/:id` |
| 7 | **Order confirmation** - quotation becomes an order, stock reserved | Sales | `/sales/orders` |
| 8 | **Warehouse preparation** - receive, pack, verify serial numbers | Warehouse | `/warehouse/packing`, `/warehouse/serial-numbers` |
| 9 | **Dispatch and delivery** - warranty records start | Warehouse | `/warehouse/dispatches` |
| 10 | **Installation** - checklist, photos, tests, customer signature | Technician | `/technician/dashboard`, `/installation/jobs` |
| 11 | **Installation completion** - installed products linked to the customer | Installation | `/installation/jobs/:id` |
| 12 | **Warranty and after-sales** - customer tracks warranty, raises requests | Customer, Support | `/customer/warranty`, `/customer/service-requests`, `/support/*` |
| 13 | **Financial reporting** - profitability, revenue, expenses, outstanding | Finance, Admin | `/finance/dashboard`, `/admin/reports` |

## Menus by user type

- **Admin**: Overview - Enquiries & Leads - Customers - Site Surveys - Quotations - Orders - Product Catalogue -
  Warehouse - Installations - Warranty & Support - Finance - Subsidy - Reports - People & Access - Activity Log
- **Sales**: Overview - My Leads - Follow-ups - Site Surveys - Quotations - Orders - Customers - WhatsApp Enquiries
- **Technician**: Overview - My Assignments - Site Surveys - Equipment Scanning - Installation Reports
- **Customer**: Overview - My Orders - My Quotations - Installation Tracking - Warranty - Service Requests
- **Operations staff** (warehouse, support, accounts, subsidy): the menu for their own department only

The Admin portal deliberately has no separate "customers", "leads", "inventory", "projects" or
"finance" pages. The department modules own that data and the Admin menu links straight to them,
so there is one screen per job rather than two.
