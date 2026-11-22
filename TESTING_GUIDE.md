# SOLVIX — Demo & Testing Guide

A step-by-step script to test (and demo) the whole project with sample data, from the first customer enquiry to warranty support and reports.

> **One-line pitch:** SOLVIX runs a rooftop-solar job end to end: enquiry → site survey → quotation → online payment → warehouse → installation → warranty → finance. Every team works in its own dashboard, all on the same live data.

---

## 1. Before you start (5 minutes)

1. Run the database script `database/solvix_schema.sql` in Supabase, then create the admin (see `database/README.md`).
2. Put your Supabase keys and the Razorpay **test** keys in `backend/.env.local`.
3. Start everything from the project folder:

```
npm install
npm run dev
```

Open **http://localhost:5173**. The backend runs on port 3001 (started by the same command).

**Tip for emails:** customers must confirm their email, so use a real inbox. With Gmail you can make many accounts from one address: `yourname+customer1@gmail.com`, `yourname+customer2@gmail.com` all arrive in the same inbox. Employee accounts need no confirmation, so any email works for them.

**Password for all demo accounts:** `Solvix@2026` (change it if you like; 6+ characters).

---

## 1b. Quick option: load mock data with SQL

Instead of typing everything by hand, you can fill the dashboards with about 10 records each:

1. (Optional) Create the customer and employee accounts from section 3, so the data is linked to them by email.
2. Open `database/seed_demo_data.sql`, change the emails at the top if yours differ, paste the whole file into the **Supabase SQL Editor** and run it.
3. It prints a table of counts at the end. To remove the demo data later, run `database/seed_demo_cleanup.sql`.

Note: the Warehouse list pages (inventory, purchase orders, serial numbers, dispatches, packing) and the Installation jobs list keep their working data in the server's memory, so they are filled by using the app (steps 5, 11 and 12), not by SQL. Their dashboards and every other module read the seeded data.

---

## 2. Who is who (the cast)

| # | Person (demo name) | Role | Signs in at | Sees |
|---|---|---|---|---|
| 1 | Admin (you) | Administrator | `/login/admin` | Everything, approves staff |
| 2 | Rohit Sharma | Sales & CRM | `/login/sales` | Leads, quotations, orders |
| 3 | Neha Verma | Site Survey & Engineering | `/login/technician` | Survey visits |
| 4 | Amit Singh | Installation & Technical Operations | `/login/technician` | Installation jobs |
| 5 | Pooja Nair | Warehouse & Logistics | `/login/staff` | Stock, packing, dispatch |
| 6 | Karan Mehta | Support & Warranty | `/login/staff` | Tickets, warranties |
| 7 | Sunita Rao | Accounts & Finance | `/login/staff` | Money dashboard |
| 8 | Vikas Joshi | Subsidy & Documentation | `/login/staff` | Subsidy dashboard |
| 9 | Raman Gupta | Customer | `/login/customer` | Own quotes, orders, warranty |
| 10 | Meera Kapoor | Customer (second record) | `/login/customer` | Own data only |

---

## 3. Step 0 — Create the accounts

### 3.1 Customers (sign up yourself)
Go to **/signup** → choose *Customer*.

| Field | Customer 1 | Customer 2 |
|---|---|---|
| Full name | Raman Gupta | Meera Kapoor |
| Email | yourname+raman@gmail.com | yourname+meera@gmail.com |
| Phone | 9876501001 | 9876501002 |
| Password | Solvix@2026 | Solvix@2026 |

Confirm each email from the inbox link, then sign in at `/login/customer`.

### 3.2 Employees (sign up, then Admin approves)
Go to **/register/employee**. Create one account per row:

| Full name | Email | Employee ID | Department to choose |
|---|---|---|---|
| Rohit Sharma | rohit.sales@solvix.test | EMP-001 | Sales & CRM |
| Neha Verma | neha.survey@solvix.test | EMP-002 | Site Survey & Engineering |
| Amit Singh | amit.install@solvix.test | EMP-003 | Installation & Technical Operations |
| Pooja Nair | pooja.store@solvix.test | EMP-004 | Warehouse & Logistics |
| Karan Mehta | karan.support@solvix.test | EMP-005 | Support & Warranty |
| Sunita Rao | sunita.accounts@solvix.test | EMP-006 | Accounts & Finance |
| Vikas Joshi | vikas.subsidy@solvix.test | EMP-007 | Subsidy & Documentation |

Until approved, an employee only sees the **"Access pending approval"** page. This is part of the demo: *no one gets in without the admin's approval.*

### 3.3 Admin approval
Sign in at **/login/admin** → **People & Access** → approve each employee. Check that the department matches the table above.

✅ **Check:** each employee can now sign in on their portal and sees only their own menu.

---

## 4. Step 1 — Admin prepares the catalogue (once)

**Admin → Product Catalogue.** The system already has sample items (for example *Solar PV Module 550W* `SP-550`, *On-Grid Inverter 5 kW* `INV-ONG-5`) and ready-made packages (*On-Grid Package 5 kW*, etc.). Add one custom product so the demo shows editing:

| Field | Value |
|---|---|
| Name | Mounting Structure 5 kW (GI) |
| SKU | MS-5KW |
| Unit | set |
| Price | 18000 |
| Tax rate | 12 |

---

## 5. Step 2 — Warehouse adds stock

Sign in as **Pooja (Warehouse)** at `/login/staff`.

**Products & Catalog → Add product** (these are the physical stock items):

| Name | SKU | Category | Manufacturer | Purchase price | Selling price | Min stock | Needs serial no. | Warranty (months) |
|---|---|---|---|---|---|---|---|---|
| Mono PERC Panel 550W | PNL-550-A | Solar panel | Waaree | 9500 | 12000 | 10 | Yes | 300 |
| Hybrid Inverter 5 kW | INV-5K-A | Inverter | Growatt | 24000 | 30000 | 3 | Yes | 60 |

**Purchase Orders → New** (to bring stock in):

| Field | Record 1 | Record 2 |
|---|---|---|
| Supplier | Waaree Energies | Growatt India |
| Supplier phone | 9810011111 | 9810022222 |
| Product / Qty | PNL-550-A × 40 | INV-5K-A × 6 |
| Expected delivery | 7 days from today | 7 days from today |

Open each purchase order and **Receive** it so the stock appears under **Stock & Inventory**.

**Serial & QR Registry → Register serial number** (use the **Scan QR** button to read a printed QR, or type):

| Product | Serial numbers |
|---|---|
| PNL-550-A | SN-WAA-550-0001, SN-WAA-550-0002, SN-WAA-550-0003, SN-WAA-550-0004 |
| INV-5K-A | SN-GRW-5K-0001, SN-GRW-5K-0002 |

(Use *Batch import* and paste several lines to show speed.)

✅ **Check:** the Warehouse dashboard shows total products, stock quantity and registered serials. The search/scan lookup finds `SN-WAA-550-0001`.

---

## 6. Step 3 — Enquiry arrives

### 6.1 Customer enquiry from the website
Open **/get-quote** (no sign-in needed) and submit:

| Field | Enquiry 1 | Enquiry 2 |
|---|---|---|
| Full name | Raman Gupta | Meera Kapoor |
| Phone | 9876501001 | 9876501002 |
| Email | (same as sign-up) | (same as sign-up) |
| Address | 14, Green Park, New Delhi 110016 | 22, Sector 15, Noida 201301 |
| System type | On-grid | Hybrid |
| Capacity | 5 kW | 3 kW |
| Monthly bill | 8500 | 5200 |
| Notes | 2-storey house, flat RCC roof | Frequent power cuts, wants battery |

✅ **Check:** **Admin → Overview** shows "New enquiries"; the lead appears *Unassigned*.

### 6.2 Sales logs a phone enquiry (third record)
Sign in as **Rohit (Sales)** → **My Leads → New Lead**:

| Field | Value |
|---|---|
| Customer name | Sandeep Malhotra |
| Phone | 9876501003 |
| Source | Phone call |
| System type | On-grid |
| Expected capacity | 10 kW |
| Monthly bill | 18000 |
| Priority | High |
| Estimated value | 550000 |

---

## 7. Step 4 — Sales manages the lead

1. **Admin → Enquiries & Leads:** assign Raman's and Meera's leads to **Rohit**.
2. Rohit opens Raman's lead → add a **follow-up** (tomorrow 11:00, "Call to confirm site visit") → change status to **Contacted**, then **Qualified**.
3. Check **Follow-ups** shows the reminder and the Sales dashboard counts it under "Follow-ups today".

---

## 8. Step 5 — Site survey

1. Rohit opens Raman's lead → **Request site survey** (or **Site Surveys → New request**), then assigns it to **Neha (Survey)**.
2. Sign in as **Neha** at `/login/technician` → **Site Surveys** → open the request → **Start inspection** and fill the form:

| Section | Field | Value |
|---|---|---|
| Property | Property type | Residential |
| | Connection | Three phase |
| | Sanctioned load | 8 kW |
| | Consumer / Meter no. | 1234567890 / MTR-55821 |
| Roof | Roof type / area | RCC flat / 60 sq m |
| | Usable area | 40 sq m |
| | Direction / tilt | South / 15° |
| | Shading | None |
| Electrical | Grid | Stable |
| | Earthing | Adequate |
| | Cable distance | 25 m |
| Recommendation | Capacity | 5 kW |
| | System type | On-grid |
| | Notes | Clear roof, no shade, bring ladder |

3. Optionally upload a roof photo, then **Submit** the survey.
4. Back as **Admin** (or Sales manager) → **Site Surveys → Approvals** → **Approve**.

✅ **Check:** the approved survey shows "Ready for quotation".

---

## 9. Step 6 — Quotation

Sign in as **Rohit (Sales)** → **Quotations → New quotation**:

| Field | Value |
|---|---|
| Customer | Raman Gupta |
| Lead / Survey | Raman's lead + approved survey |
| Package | On-Grid Package 5 kW |
| Extra item | Mounting Structure 5 kW (GI) × 1 |
| Discount | 5% |
| Validity | 15 days from today |

Save → **Submit for approval** → Admin approves (if your setup asks for it) → **Send to customer**.

Download the **PDF** to show the formal quotation.

✅ **Check:** status moves Draft → Approved → **Sent**. Totals include tax.

**Option: let the AI agent draft it.** In *New quotation*, pick the customer, lead and the approved survey, then click **Draft this quotation with AI**. The Google ADK agent reads the survey, picks a package, checks roof limit and warehouse stock, and saves a **Draft** quotation (marked "AI draft · review before sending") with its reasoning. You review, edit if needed, and send as usual. Add `GOOGLE_API_KEY` to `backend/.env.local` to use Gemini; without a key it runs in rule-based mode.

---

## 10. Step 7 — Customer accepts and pays (Razorpay test mode)

Sign in as **Raman** at `/login/customer` → **My Quotations** → open the quotation.

You will see the **"Accept & pay online"** card with two choices:

* **Pay in full**, or
* **Pay part now, rest later** (quick buttons for 30% / 50% / 75%, or type any amount).

**Demo path A — part payment:** choose *Pay part* → 30% → **Pay**. In the Razorpay window use the test details:

| Field | Value |
|---|---|
| Card number | 4111 1111 1111 1111 |
| Expiry | any future date (e.g. 12/30) |
| CVV | 123 |
| OTP (if asked) | 1234 |

(Or choose UPI and use `success@razorpay`.)

✅ **Check:**
* Order is created and moves to **Confirmed**; payment status shows **Partial**.
* **My Orders → order** shows paid amount, balance due and the payment in *Payment history*.
* Sales (**Orders → order**) and Finance see the same payment marked as verified.

**Demo path B — pay the balance:** on the order page, the same card appears again. Choose **Pay in full** (it shows the remaining balance) → payment status becomes **Paid** and the card disappears.

**Failure test:** close the Razorpay window or use the test card `4000 0000 0000 0002` (declined). The order must stay unchanged.

**Second customer:** repeat with Meera (hybrid 3 kW quotation) if you want a second order.

---

## 11. Step 8 — Warehouse packs and dispatches

Sign in as **Pooja** → **Order Packing**:

1. Open Raman's order → tick each item as packed.
2. Scan/enter the serial numbers for each item: panels `SN-WAA-550-0001` … `0004`, inverter `SN-GRW-5K-0001`.
3. Mark the order **Packed**.

**Dispatches & Delivery → New dispatch:**

| Field | Value |
|---|---|
| Order | Raman's order |
| Courier / vehicle | Own truck — DL1LA 4521 |
| Driver / phone | Ramesh Kumar / 9810033333 |
| Expected delivery | 2 days from today |

Mark it **In transit**, then **Delivered**.

✅ **Check:** stock drops, the serial numbers show **Dispatched / Delivered**, and the **warranty** records start from the delivery date.

---

## 12. Step 9 — Installation

1. Sign in as **Amit (Installation)** or use **Admin → Installations** → **New job from order** → pick Raman's order.
2. Fill the job:

| Field | Value |
|---|---|
| Technician | Amit Singh |
| Scheduled date | 3 days from today |
| Crew / notes | 2 helpers; bring earthing kit |

3. Amit opens **My Assignments → the job**:
   * **Equipment & Serials:** verify the delivered serial numbers.
   * **Checklist:** tick mounting, wiring, earthing, inverter set-up, testing.
   * Upload an after-installation photo.
   * Capture the **customer sign-off**, then **Complete job**.

✅ **Check:** Raman's **Installation Tracking** page shows the stages live, ending in **Completed**.

---

## 13. Step 10 — Warranty and support

1. Raman → **Warranty:** sees the panel and inverter warranties with serial numbers and expiry.
2. Raman → **Service Requests → New:**

| Field | Value |
|---|---|
| Category | Inverter issue |
| Priority | High |
| Subject | Inverter showing error E04 |
| Description | Error light blinking since morning |
| Equipment serial | SN-GRW-5K-0001 |

3. Sign in as **Karan (Support)** → **Service Tickets** → assign the ticket, add an update ("Technician visit booked"), then **Resolve**.
4. Optional: Karan opens **Warranty Claims** and raises a claim for the inverter.

✅ **Check:** Raman sees the ticket status change in real time.

---

## 14. Step 11 — Finance, subsidy and reports

* **Sunita (Finance)** → **Finance & Invoices:** order value, invoiced, **collected** (includes Raman's Razorpay payments), outstanding, profitability.
* **Vikas (Subsidy)** → **Subsidy & Documents:** shows the subsidy dashboard for the completed installation.
* **Admin → Reports & Analytics:** pipeline, revenue and conversion figures.
* **Admin → Overview:** the 10-stage pipeline chart and revenue donut now show real numbers. **Activity Log** lists every action (approvals, payments, dispatches).

---

## 15. Quick checklist (tick as you go)

- [ ] 2 customers, 7 employees created; all employees approved
- [ ] Catalogue edited; warehouse stock received; serial numbers registered (QR scan works)
- [ ] 3 leads: 2 from website, 1 from Sales
- [ ] Survey submitted and approved
- [ ] Quotation sent (PDF downloaded)
- [ ] Customer paid part online, then the balance
- [ ] Order packed, dispatched, delivered
- [ ] Installation completed with sign-off
- [ ] Warranty visible; support ticket resolved
- [ ] Finance and Admin dashboards updated
- [ ] Light/dark toggle works on every dashboard

## 16. Access-control demo (30 seconds, impresses judges)

* Sign in as Raman and try to open `/admin/dashboard` → **Access denied**.
* Sign in as Rohit (Sales) and try `/warehouse/dashboard` → **Access denied**.
* Raman and Meera each see **only their own** quotations and orders.

## 17. Troubleshooting

| Problem | Fix |
|---|---|
| Customer can't sign in | Confirm the email first (check spam) |
| "Account with this email already exists" | That email is registered; sign in or use a new `+tag` address |
| Employee stuck on "pending approval" | Admin must approve under People & Access |
| Payment window doesn't open | Check `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` in `backend/.env.local` and restart the backend |
| A page shows "This page hit a problem" | Note the message, press Reload, and report it |
| Charts look empty | They fill in as records are created — complete the steps above first |

## 18. Suggested 5-minute pitch order

1. Customer sends enquiry (30 s) → 2. Sales qualifies and the survey is done (60 s) → 3. Quotation sent, customer **pays part online** (60 s) → 4. Warehouse scans serial numbers and dispatches (45 s) → 5. Installation completed, warranty starts (45 s) → 6. Admin dashboard and finance reports (60 s).
