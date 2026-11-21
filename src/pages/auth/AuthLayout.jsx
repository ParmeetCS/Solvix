import { Sun } from 'lucide-react';
import AuthArt from './AuthArt';
import './auth.css';
import './auth-layout.css';

// What the dark side panel says on each authentication screen. Wording describes what the
// portal really offers; nothing here is a statistic.
const PANELS = {
  customer: { title: 'Welcome back to SOLVIX', text: 'Follow your solar project from quotation to warranty. Check your orders, installation progress and service requests in one place.' },
  sales: { title: 'Turn enquiries into installed systems', text: 'Leads, follow-ups, site surveys, quotations and orders for the sales team, all on one shared record.' },
  technician: { title: 'Your jobs, surveys and checklists', text: 'See your assignments, complete site surveys and installation checklists, and record equipment serial numbers on site.' },
  staff: { title: 'Warehouse, support and accounts together', text: 'Stock and dispatch, warranty and service, payments and subsidy documents, with each team seeing its own tools.' },
  admin: { title: 'Run the whole business from one console', text: 'Approve employees, follow every stage from enquiry to installation, and review reports across all modules.' },
  employee: { title: 'One platform for every team', text: 'Pick your department to sign in, or request access and an administrator will set you up.' },
  'signup-customer': { title: 'Create your SOLVIX account', text: 'Request a quote, track your installation and keep your warranty and service requests together.' },
  'signup-employee': { title: 'Join your team on SOLVIX', text: 'Request access for your department. An administrator reviews every request before you can sign in.' },
  forgot: { title: 'Locked out? It happens.', text: 'Enter the email you registered with and we will send you a link to choose a new password.' },
  reset: { title: 'Choose a new password', text: 'Pick something you do not use anywhere else. You will be signed out of old sessions when you sign in again.' },
  pending: { title: 'Almost there', text: 'Your request has been received. As soon as an administrator assigns your department, your dashboard opens.' },
  denied: { title: 'This area is for another team', text: 'Each department sees only its own tools. You can head back to your own dashboard at any time.' },
};

/**
 * Shared frame for every authentication screen: the form on the left, a brand panel on the right.
 * `panel` is a key of PANELS, or an object with { title, text }.
 */
export default function AuthLayout({ panel = 'customer', children }) {
  const content = typeof panel === 'string' ? PANELS[panel] || PANELS.customer : panel;
  return (
    <div className="auth-page" data-theme="light">
      <div className="auth-shell">
        <div className="auth-form-side">{children}</div>
        <aside className="auth-panel">
          <div className="auth-panel-brand"><span><Sun size={16} /></span>SOLVIX</div>
          <h2>{content.title}</h2>
          <p>{content.text}</p>
          <AuthArt name={typeof panel === 'string' ? panel : 'customer'} />
          <div className="auth-panel-foot">Illustrative preview</div>
        </aside>
      </div>
    </div>
  );
}
