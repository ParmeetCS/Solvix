# Authentication and roles

## Sign-in pages (one per user type)

| URL | Who | Lands on |
|-----|-----|----------|
| `/login/customer` | Customers | `/customer/dashboard` |
| `/login/sales` | Sales department | `/sales/dashboard` |
| `/login/technician` | Installation / survey staff | `/technician/dashboard` |
| `/login/staff` | Warehouse, support, accounts, subsidy | first module they hold |
| `/login/admin` | Administrators | `/admin/dashboard` |
| `/login/employee` | Chooser for the three employee portals | |

The backend (`POST /api/auth/login`) checks the password with Supabase, then verifies that the
account really belongs to the portal being used. A customer cannot sign in on the admin page, a
sales employee cannot sign in on the technician page, and so on.

## Account types

* `admin` - created only with `database/02_bootstrap_admin.sql`.
* `customer` - self-registered at `/signup`.
* `employee` - self-registered at `/register/employee`, then **must be approved**: an Administrator
  assigns a department. Until then the employee only sees `/pending-approval`.

## How access is enforced

1. **Frontend guards** (`src/components/route-guards.jsx`): `RequireAuth` for dashboards,
   `PublicOnly` for sign-in/landing pages. Signed-out visitors are sent to the right sign-in page.
2. **Backend guards** (`backend/lib/supabase/access.js` and the module helpers): every API call needs
   a valid token and the right department. There is no development bypass.
3. **Database**: Row Level Security on every table.

## Back button

* Signing in and out use history *replace*, so the sign-in page and dashboards don't pile up in Back.
* A signed-in user who presses Back to the landing page or a sign-in page is redirected to their own
  dashboard instead of seeing the public page. The public site stays reachable with `/?view=public`.
* After signing out, Back to a dashboard sends the user to their sign-in page.

## Sessions

The access token and refresh token are kept in `localStorage`. The access token expires after about
an hour; the API client silently refreshes it once on a 401 and signs the user out if that fails.
Signing out in one tab signs out all tabs.

## Data separation

All dashboards use the same Supabase database, but each module's API only answers to its own
department (plus admins) and customers only ever receive their own records.

## Forgot password

`/forgot-password` asks Supabase to email a recovery link; `/reset-password` receives it. The account that changes is the one the
link's token belongs to, verified with Supabase on the server, so a password can never be reset by guessing a user id.

Supabase setup (Authentication -> URL Configuration): add `http://localhost:5173/reset-password` (and your production URL) to
**Redirect URLs**. Supabase's built-in email sender allows only a few emails per hour; for real use connect your own SMTP
(Authentication -> Emails -> SMTP Settings).

## Light and dark mode

Every page has a sun/moon button (in the dashboard header, floating on sign-in and form pages). The choice is saved in the browser and
the first visit follows the device setting. On the landing page the hero's Morning/Night switch is the same control: Morning is light
mode, Night is dark mode. Colours come from CSS variables in `src/theme/theme.css` (light = the landing page's morning palette).

## Not built yet

The Finance and Subsidy screens are compact dashboards only. Invoice, payment, expense, technician-payment, report and
subsidy-application pages are not built, although their API routes and database functions exist and are tested at the database level.
