import { lazy, Suspense } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import './App.css';
import RoleLogin, { EmployeePortalChooser } from './pages/auth/RoleLogin';
import { RequireAuth, PublicOnly, PendingOnly } from './components/route-guards';
import { ThemeToggle } from './theme/theme';

// Each screen is downloaded only when it is opened.
const Landing = lazy(() => import('./pages/Landing'));
const SignUp = lazy(() => import('./components/SignUp'));
const QuoteForm = lazy(() => import('./components/QuoteForm'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));
const NotFound = lazy(() => import('./pages/shared/NotFound'));
const PendingApproval = lazy(() => import('./pages/pending-approval'));
const AccessDenied = lazy(() => import('./pages/access-denied'));
const Profile = lazy(() => import('./pages/profile'));
const CustomerDashboard = lazy(() => import('./pages/customer/CustomerDashboard'));
const SalesDashboard = lazy(() => import('./pages/sales/SalesDashboard'));
const LeadsList = lazy(() => import('./pages/sales/LeadsList'));
const NewLead = lazy(() => import('./pages/sales/NewLead'));
const LeadDetail = lazy(() => import('./pages/sales/LeadDetail'));
const FollowUpsList = lazy(() => import('./pages/sales/FollowUpsList'));
const WhatsAppEnquiries = lazy(() => import('./pages/sales/WhatsAppEnquiries'));
const CustomersList = lazy(() => import('./pages/sales/CustomersList'));
const CustomerDetail = lazy(() => import('./pages/sales/CustomerDetail'));
const QuotationsList = lazy(() => import('./pages/sales/QuotationsList'));
const QuotationBuilder = lazy(() => import('./pages/sales/QuotationBuilder'));
const QuotationDetail = lazy(() => import('./pages/sales/QuotationDetail'));
const OrdersList = lazy(() => import('./pages/sales/OrdersList'));
const OrderDetail = lazy(() => import('./pages/sales/OrderDetail'));
const CustomerQuotations = lazy(() => import('./pages/customer/CustomerQuotations'));
const CustomerQuotationDetail = lazy(() => import('./pages/customer/CustomerQuotationDetail'));
const CustomerOrders = lazy(() => import('./pages/customer/CustomerOrders'));
const CustomerOrderDetail = lazy(() => import('./pages/customer/CustomerOrderDetail'));
const SupportDashboard = lazy(() => import('./pages/support/SupportDashboard'));
const TicketsList = lazy(() => import('./pages/support/TicketsList'));
const NewTicket = lazy(() => import('./pages/support/NewTicket'));
const TicketDetail = lazy(() => import('./pages/support/TicketDetail'));
const WarrantiesList = lazy(() => import('./pages/support/WarrantiesList'));
const WarrantyDetail = lazy(() => import('./pages/support/WarrantyDetail'));
const WarrantyClaimsList = lazy(() => import('./pages/support/WarrantyClaimsList'));
const AdminCatalogue = lazy(() => import('./pages/admin/catalogue'));
const CustomerInstallation = lazy(() => import('./pages/customer/CustomerInstallation'));
const CustomerWarranty = lazy(() => import('./pages/customer/CustomerWarranty'));
const CustomerServiceRequests = lazy(() => import('./pages/customer/CustomerServiceRequests'));
const TechnicianDashboard = lazy(() => import('./pages/technician/TechnicianDashboard'));
const SurveyDashboard = lazy(() => import('./pages/survey/SurveyDashboard'));
const SurveyRequestsList = lazy(() => import('./pages/survey/SurveyRequestsList'));
const SurveyAssignments = lazy(() => import('./pages/survey/SurveyAssignments'));
const SurveySchedule = lazy(() => import('./pages/survey/SurveySchedule'));
const SurveyApprovals = lazy(() => import('./pages/survey/SurveyApprovals'));
const SurveyDetail = lazy(() => import('./pages/survey/SurveyDetail'));
const SurveyInspectionForm = lazy(() => import('./pages/survey/SurveyInspectionForm'));
const InstallationDashboard = lazy(() => import('./pages/installation/InstallationDashboard'));
const InstallationJobsList = lazy(() => import('./pages/installation/InstallationJobsList'));
const InstallationJobDetail = lazy(() => import('./pages/installation/InstallationJobDetail'));
const InstallationAssignments = lazy(() => import('./pages/installation/InstallationAssignments'));
const InstallationSchedule = lazy(() => import('./pages/installation/InstallationSchedule'));
const TechniciansList = lazy(() => import('./pages/installation/TechniciansList'));
const TechnicianDetail = lazy(() => import('./pages/installation/TechnicianDetail'));
const WarehouseDashboard = lazy(() => import('./pages/warehouse/WarehouseDashboard'));
const ProductsList = lazy(() => import('./pages/warehouse/ProductsList'));
const ProductForm = lazy(() => import('./pages/warehouse/ProductForm'));
const InventoryList = lazy(() => import('./pages/warehouse/InventoryList'));
const InventoryDetail = lazy(() => import('./pages/warehouse/InventoryDetail'));
const PurchaseOrdersList = lazy(() => import('./pages/warehouse/PurchaseOrdersList'));
const NewPurchaseOrder = lazy(() => import('./pages/warehouse/NewPurchaseOrder'));
const PackingQueue = lazy(() => import('./pages/warehouse/PackingQueue'));
const OrderPacking = lazy(() => import('./pages/warehouse/OrderPacking'));
const SerialNumbersList = lazy(() => import('./pages/warehouse/SerialNumbersList'));
const SerialRegistration = lazy(() => import('./pages/warehouse/SerialRegistration'));
const DispatchesList = lazy(() => import('./pages/warehouse/DispatchesList'));
const NewDispatch = lazy(() => import('./pages/warehouse/NewDispatch'));
const DispatchDetail = lazy(() => import('./pages/warehouse/DispatchDetail'));
const FinanceDashboard = lazy(() => import('./pages/finance/FinanceDashboard'));
const SubsidyDashboard = lazy(() => import('./pages/subsidy/SubsidyDashboard'));
const AdminOverview = lazy(() => import('./pages/admin/AdminOverview'));
const AdminPeople = lazy(() => import('./pages/admin/AdminPeople'));
const AdminActivity = lazy(() => import('./pages/admin/AdminActivity'));
const AdminReports = lazy(() => import('./pages/admin/AdminReports'));













export default function App() {
  const navigate = useNavigate();

  return (
    <>
      <Suspense fallback={<div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--app-bg)', color: 'var(--text-muted)' }}>Loading…</div>}>
      <Routes>
        <Route path="/" element={<PublicOnly><Landing /></PublicOnly>} />
        {/* Public: a separate sign-in page for every user type */}
        <Route path="/signup" element={<PublicOnly><SignUp navigate={navigate} initialRole="customer" initialMode="signup" /></PublicOnly>} />
        <Route path="/get-quote" element={<QuoteForm navigate={navigate} />} />
        <Route path="/register/customer" element={<PublicOnly><SignUp navigate={navigate} initialRole="customer" initialMode="signup" /></PublicOnly>} />
        <Route path="/register/employee" element={<PublicOnly><SignUp navigate={navigate} initialRole="employee" initialMode="signup" /></PublicOnly>} />
        <Route path="/login/customer" element={<PublicOnly><RoleLogin portal="customer" /></PublicOnly>} />
        <Route path="/login/sales" element={<PublicOnly><RoleLogin portal="sales" /></PublicOnly>} />
        <Route path="/login/technician" element={<PublicOnly><RoleLogin portal="technician" /></PublicOnly>} />
        <Route path="/login/staff" element={<PublicOnly><RoleLogin portal="staff" /></PublicOnly>} />
        <Route path="/login/admin" element={<PublicOnly><RoleLogin portal="admin" /></PublicOnly>} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/login/employee" element={<PublicOnly><EmployeePortalChooser /></PublicOnly>} />

        {/* Signed-in utility pages */}
        <Route path="/pending-approval" element={<PendingOnly><PendingApproval /></PendingOnly>} />
        <Route path="/access-denied" element={<AccessDenied />} />
        <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />

        {/* Customer portal */}
        <Route path="/customer/dashboard" element={<RequireAuth portals={['customer']}><CustomerDashboard /></RequireAuth>} />
        <Route path="/customer/orders" element={<RequireAuth portals={['customer']}><CustomerOrders /></RequireAuth>} />
        <Route path="/customer/orders/:id" element={<RequireAuth portals={['customer']}><CustomerOrderDetail /></RequireAuth>} />
        <Route path="/customer/quotations" element={<RequireAuth portals={['customer']}><CustomerQuotations /></RequireAuth>} />
        <Route path="/customer/quotations/:id" element={<RequireAuth portals={['customer']}><CustomerQuotationDetail /></RequireAuth>} />
        <Route path="/customer/installation" element={<RequireAuth portals={['customer']}><CustomerInstallation /></RequireAuth>} />
        <Route path="/customer/warranty" element={<RequireAuth portals={['customer']}><CustomerWarranty /></RequireAuth>} />
        <Route path="/customer/service-requests" element={<RequireAuth portals={['customer']}><CustomerServiceRequests /></RequireAuth>} />

        {/* Sales team (and admins) */}
        <Route path="/sales/dashboard" element={<RequireAuth module="sales"><SalesDashboard /></RequireAuth>} />
        <Route path="/sales/leads" element={<RequireAuth module="sales"><LeadsList /></RequireAuth>} />
        <Route path="/sales/leads/new" element={<RequireAuth module="sales"><NewLead /></RequireAuth>} />
        <Route path="/sales/leads/:id" element={<RequireAuth module="sales"><LeadDetail /></RequireAuth>} />
        <Route path="/sales/follow-ups" element={<RequireAuth module="sales"><FollowUpsList /></RequireAuth>} />
        <Route path="/sales/whatsapp-enquiries" element={<RequireAuth module="sales"><WhatsAppEnquiries /></RequireAuth>} />
        <Route path="/sales/customers" element={<RequireAuth module="sales"><CustomersList /></RequireAuth>} />
        <Route path="/sales/customers/:id" element={<RequireAuth module="sales"><CustomerDetail /></RequireAuth>} />
        <Route path="/sales/quotations" element={<RequireAuth module="sales"><QuotationsList /></RequireAuth>} />
        <Route path="/sales/quotations/new" element={<RequireAuth module="sales"><QuotationBuilder /></RequireAuth>} />
        <Route path="/sales/quotations/:id/edit" element={<RequireAuth module="sales"><QuotationBuilder /></RequireAuth>} />
        <Route path="/sales/quotations/:id" element={<RequireAuth module="sales"><QuotationDetail /></RequireAuth>} />
        <Route path="/sales/orders" element={<RequireAuth module="sales"><OrdersList /></RequireAuth>} />
        <Route path="/sales/orders/:id" element={<RequireAuth module="sales"><OrderDetail /></RequireAuth>} />

        {/* Technician */}
        <Route path="/technician/dashboard" element={<RequireAuth module="technician"><TechnicianDashboard /></RequireAuth>} />

        {/* Site survey */}
        <Route path="/survey/dashboard" element={<RequireAuth module="survey"><SurveyDashboard /></RequireAuth>} />
        <Route path="/survey/requests" element={<RequireAuth module="survey"><SurveyRequestsList /></RequireAuth>} />
        <Route path="/survey/requests/:id" element={<RequireAuth module="survey"><SurveyDetail /></RequireAuth>} />
        <Route path="/survey/requests/:id/inspection" element={<RequireAuth module="survey"><SurveyInspectionForm /></RequireAuth>} />
        <Route path="/survey/assignments" element={<RequireAuth module="survey"><SurveyAssignments /></RequireAuth>} />
        <Route path="/survey/schedule" element={<RequireAuth module="survey"><SurveySchedule /></RequireAuth>} />
        <Route path="/survey/approvals" element={<RequireAuth module="survey"><SurveyApprovals /></RequireAuth>} />

        {/* Installation */}
        <Route path="/installation/dashboard" element={<RequireAuth module="installation"><InstallationDashboard /></RequireAuth>} />
        <Route path="/installation/jobs" element={<RequireAuth module="installation"><InstallationJobsList /></RequireAuth>} />
        <Route path="/installation/jobs/:id" element={<RequireAuth module="installation"><InstallationJobDetail /></RequireAuth>} />
        <Route path="/installation/assignments" element={<RequireAuth module="installation"><InstallationAssignments /></RequireAuth>} />
        <Route path="/installation/schedule" element={<RequireAuth module="installation"><InstallationSchedule /></RequireAuth>} />
        <Route path="/installation/technicians" element={<RequireAuth module="installation"><TechniciansList /></RequireAuth>} />
        <Route path="/installation/technicians/:id" element={<RequireAuth module="installation"><TechnicianDetail /></RequireAuth>} />

        {/* Warehouse */}
        <Route path="/warehouse/dashboard" element={<RequireAuth module="warehouse"><WarehouseDashboard /></RequireAuth>} />
        <Route path="/warehouse/products" element={<RequireAuth module="warehouse"><ProductsList /></RequireAuth>} />
        <Route path="/warehouse/products/new" element={<RequireAuth module="warehouse"><ProductForm /></RequireAuth>} />
        <Route path="/warehouse/products/:id" element={<RequireAuth module="warehouse"><ProductForm /></RequireAuth>} />
        <Route path="/warehouse/inventory" element={<RequireAuth module="warehouse"><InventoryList /></RequireAuth>} />
        <Route path="/warehouse/inventory/:id" element={<RequireAuth module="warehouse"><InventoryDetail /></RequireAuth>} />
        <Route path="/warehouse/purchase-orders" element={<RequireAuth module="warehouse"><PurchaseOrdersList /></RequireAuth>} />
        <Route path="/warehouse/purchase-orders/new" element={<RequireAuth module="warehouse"><NewPurchaseOrder /></RequireAuth>} />
        <Route path="/warehouse/packing" element={<RequireAuth module="warehouse"><PackingQueue /></RequireAuth>} />
        <Route path="/warehouse/packing/:orderId" element={<RequireAuth module="warehouse"><OrderPacking /></RequireAuth>} />
        <Route path="/warehouse/serial-numbers" element={<RequireAuth module="warehouse"><SerialNumbersList /></RequireAuth>} />
        <Route path="/warehouse/serial-numbers/register" element={<RequireAuth module="warehouse"><SerialRegistration /></RequireAuth>} />
        <Route path="/warehouse/dispatches" element={<RequireAuth module="warehouse"><DispatchesList /></RequireAuth>} />
        <Route path="/warehouse/dispatches/new" element={<RequireAuth module="warehouse"><NewDispatch /></RequireAuth>} />
        <Route path="/warehouse/dispatches/:id" element={<RequireAuth module="warehouse"><DispatchDetail /></RequireAuth>} />

        {/* Support & warranty */}
        <Route path="/support/dashboard" element={<RequireAuth module="support"><SupportDashboard /></RequireAuth>} />
        <Route path="/support/tickets" element={<RequireAuth module="support"><TicketsList /></RequireAuth>} />
        <Route path="/support/tickets/new" element={<RequireAuth module="support"><NewTicket /></RequireAuth>} />
        <Route path="/support/tickets/:id" element={<RequireAuth module="support"><TicketDetail /></RequireAuth>} />
        <Route path="/support/warranties" element={<RequireAuth module="support"><WarrantiesList /></RequireAuth>} />
        <Route path="/support/warranties/:id" element={<RequireAuth module="support"><WarrantyDetail /></RequireAuth>} />
        <Route path="/support/claims" element={<RequireAuth module="support"><WarrantyClaimsList /></RequireAuth>} />

        {/* Finance & subsidy */}
        <Route path="/finance/dashboard" element={<RequireAuth module="finance"><FinanceDashboard /></RequireAuth>} />
        <Route path="/subsidy/dashboard" element={<RequireAuth module="subsidy"><SubsidyDashboard /></RequireAuth>} />

        {/* Administrator console (everything else an admin does lives in the department modules) */}
        <Route path="/admin/dashboard" element={<RequireAuth portals={['admin']}><AdminOverview /></RequireAuth>} />
        <Route path="/admin/catalogue" element={<RequireAuth portals={['admin']}><AdminCatalogue /></RequireAuth>} />
        <Route path="/admin/people" element={<RequireAuth portals={['admin']}><AdminPeople /></RequireAuth>} />
        <Route path="/admin/activity" element={<RequireAuth portals={['admin']}><AdminActivity /></RequireAuth>} />
        <Route path="/admin/reports" element={<RequireAuth portals={['admin']}><AdminReports /></RequireAuth>} />

        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
      <ThemeToggle floating />
    </>
  );
}
