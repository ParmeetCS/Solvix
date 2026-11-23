import {
  LayoutDashboard,
  Users2,
  CalendarClock,
  Compass,
  FileText,
  UserCheck,
  ShoppingCart,
  MessageSquare,
  Boxes,
  Truck,
  Wrench,
  ClipboardCheck,
  ScanLine,
  LifeBuoy,
  ShieldCheck,
  Coins,
  BarChart3,
  Users,
  Package,
  Layers,
  FileSpreadsheet,
  CheckSquare,
  QrCode,
  Ticket,
  FileCheck2,
  Landmark,
  ListTodo,
  MapPin,
  Hammer,
  ScrollText,
} from 'lucide-react';

// Administrator menu, in workflow order: enquiry -> survey -> quotation/order ->
// warehouse -> installation -> support -> finance, then company administration.
const ADMIN = [
  { group: 'Home', label: 'Overview', path: '/admin/dashboard', icon: LayoutDashboard },
  { group: 'Sales', label: 'Enquiries & Leads', path: '/sales/leads', icon: Users2 },
  { group: 'Sales', label: 'Customers', path: '/sales/customers', icon: UserCheck },
  { group: 'Sales', label: 'Site Surveys', path: '/survey/dashboard', icon: Compass },
  { group: 'Sales', label: 'Quotations', path: '/sales/quotations', icon: FileText },
  { group: 'Sales', label: 'Orders', path: '/sales/orders', icon: ShoppingCart },
  { group: 'Sales', label: 'Product Catalogue', path: '/admin/catalogue', icon: Package },
  { group: 'Operations', label: 'Warehouse & Inventory', path: '/warehouse/dashboard', icon: Boxes },
  { group: 'Operations', label: 'Installations & Technicians', path: '/installation/dashboard', icon: Wrench },
  { group: 'Operations', label: 'Warranty & Support', path: '/support/dashboard', icon: LifeBuoy },
  { group: 'Money', label: 'Finance & Invoices', path: '/finance/dashboard', icon: Coins },
  { group: 'Money', label: 'Subsidy & Documents', path: '/subsidy/dashboard', icon: Landmark },
  { group: 'Company', label: 'Reports & Analytics', path: '/admin/reports', icon: BarChart3 },
  { group: 'Company', label: 'People & Access', path: '/admin/people', icon: Users },
  { group: 'Company', label: 'Activity Log', path: '/admin/activity', icon: ScrollText },
];

const SALES = [
  { label: 'Overview', path: '/sales/dashboard', icon: LayoutDashboard },
  { label: 'My Leads', path: '/sales/leads', icon: Users2 },
  { label: 'Follow-ups', path: '/sales/follow-ups', icon: CalendarClock },
  { label: 'Site Surveys', path: '/survey/dashboard', icon: Compass },
  { label: 'Quotations', path: '/sales/quotations', icon: FileText },
  { label: 'Orders', path: '/sales/orders', icon: ShoppingCart },
  { label: 'Customers', path: '/sales/customers', icon: UserCheck },
  { label: 'WhatsApp Enquiries', path: '/sales/whatsapp-enquiries', icon: MessageSquare },
];

const TECHNICIAN = [
  { label: 'Overview', path: '/technician/dashboard', icon: LayoutDashboard },
  { label: 'My Assignments', path: '/installation/jobs', icon: ListTodo },
  { label: 'Site Surveys', path: '/survey/requests', icon: Compass },
  { label: 'Equipment Scanning', path: '/warehouse/serial-numbers', icon: ScanLine },
  { label: 'Installation Reports', path: '/installation/schedule', icon: ClipboardCheck },
];

// Site-survey engineers: their work is the survey module, not installation jobs.
const TECHNICIAN_SURVEY = [
  { label: 'Overview', path: '/technician/dashboard', icon: LayoutDashboard },
  { label: 'My Assignments', path: '/survey/requests', icon: ListTodo },
  { label: 'Survey Schedule', path: '/survey/schedule', icon: CalendarClock },
  { label: 'Survey Approvals', path: '/survey/approvals', icon: ClipboardCheck },
];

const CUSTOMER = [
  { label: 'Overview', path: '/customer/dashboard', icon: LayoutDashboard },
  { label: 'My Orders', path: '/customer/orders', icon: ShoppingCart },
  { label: 'My Quotations', path: '/customer/quotations', icon: FileText },
  { label: 'Installation Tracking', path: '/customer/installation', icon: MapPin },
  { label: 'Warranty', path: '/customer/warranty', icon: ShieldCheck },
  { label: 'Service Requests', path: '/customer/service-requests', icon: Hammer },
];

// Operations staff see the modules for their departments.
const STAFF_BY_MODULE = {
  warehouse: [
    { label: 'Warehouse Dashboard', path: '/warehouse/dashboard', icon: LayoutDashboard },
    { label: 'Products & Catalog', path: '/warehouse/products', icon: Package },
    { label: 'Stock & Inventory', path: '/warehouse/inventory', icon: Layers },
    { label: 'Purchase Orders', path: '/warehouse/purchase-orders', icon: FileSpreadsheet },
    { label: 'Order Packing', path: '/warehouse/packing', icon: CheckSquare },
    { label: 'Serial & QR Registry', path: '/warehouse/serial-numbers', icon: QrCode },
    { label: 'Dispatches & Delivery', path: '/warehouse/dispatches', icon: Truck },
  ],
  support: [
    { label: 'Support Dashboard', path: '/support/dashboard', icon: LifeBuoy },
    { label: 'Service Tickets', path: '/support/tickets', icon: Ticket },
    { label: 'Warranty Registry', path: '/support/warranties', icon: ShieldCheck },
    { label: 'Warranty Claims', path: '/support/claims', icon: FileCheck2 },
  ],
  finance: [{ label: 'Finance & Invoices', path: '/finance/dashboard', icon: Coins }],
  subsidy: [{ label: 'Subsidy & Documents', path: '/subsidy/dashboard', icon: Landmark }],
};

export const PORTAL_TITLE = {
  admin: 'Administrator',
  sales: 'Sales',
  technician: 'Technician',
  staff: 'Operations',
  customer: 'Customer',
};

export function getNavItems(user) {
  switch (user?.portal) {
    case 'admin': return ADMIN;
    case 'sales': return SALES;
    case 'technician': return user.modules?.includes('installation') ? TECHNICIAN : TECHNICIAN_SURVEY;
    case 'customer': return CUSTOMER;
    case 'staff':
      return Object.entries(STAFF_BY_MODULE)
        .filter(([m]) => user.modules?.includes(m))
        .flatMap(([, items]) => items);
    default: return [];
  }
}
