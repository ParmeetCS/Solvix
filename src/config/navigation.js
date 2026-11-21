import {
  LayoutDashboard, Users2, CalendarClock, Compass, FileText, UserCheck, ShoppingCart, MessageSquare,
  Boxes, Truck, Wrench, ClipboardCheck, ScanLine, LifeBuoy, ShieldCheck, Coins, BarChart3, Settings,
  Users, Package, Layers, FileSpreadsheet, CheckSquare, QrCode, Ticket, FileCheck2, Landmark, ListTodo,
  MapPin, Hammer,
} from 'lucide-react';

const ADMIN = [
  { label: 'Overview', path: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Customers & Leads', path: '/admin/customers', icon: Users2 },
  { label: 'Quotations & Orders', path: '/sales/quotations', icon: FileText },
  { label: 'Site Surveys', path: '/survey/dashboard', icon: Compass },
  { label: 'Inventory & Serial Numbers', path: '/warehouse/dashboard', icon: Boxes },
  { label: 'Installations & Technicians', path: '/installation/dashboard', icon: Wrench },
  { label: 'Warranty & Services', path: '/support/dashboard', icon: LifeBuoy },
  { label: 'Finance & Invoices', path: '/finance/dashboard', icon: Coins },
  { label: 'Subsidy & Documents', path: '/subsidy/dashboard', icon: Landmark },
  { label: 'Reports & Analytics', path: '/admin/reports', icon: BarChart3 },
  { label: 'Employees & Access', path: '/admin/employees', icon: Users },
  { label: 'Settings', path: '/admin/settings', icon: Settings },
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
    case 'technician': return TECHNICIAN;
    case 'customer': return CUSTOMER;
    case 'staff':
      return Object.entries(STAFF_BY_MODULE)
        .filter(([m]) => user.modules?.includes(m))
        .flatMap(([, items]) => items);
    default: return [];
  }
}
