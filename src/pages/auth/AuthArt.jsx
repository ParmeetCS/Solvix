import {
  Boxes, Briefcase, Check, Clock, Compass, FileText, KeyRound, LifeBuoy, Lock, Mail, Package, ScanLine,
  ShieldCheck, ShoppingCart, Truck, UserCheck, Users2, Wrench, Zap,
} from 'lucide-react';

// Small illustrations for the dark side panel. Each one shows what the screen is about
// (a project tracker for customers, a pipeline for sales, ...). They carry no data or numbers.

/** Horizontal progress steps: the first `done` are complete, the next one is in progress. */
function Stepper({ title, steps, done, icon: Icon }) {
  return (
    <div className="art-card">
      <div className="art-head"><b>{title}</b>{Icon && <span className="art-badge"><Icon size={13} /></span>}</div>
      <ol className="art-steps">
        {steps.map((label, i) => {
          const state = i < done ? 'done' : i === done ? 'now' : 'todo';
          return (
            <li key={label} className={`art-step ${state}`}>
              <span className="art-dot">{state === 'done' ? <Check size={12} strokeWidth={3} /> : i + 1}</span>
              <span className="art-label">{label}</span>
            </li>
          );
        })}
      </ol>
      <div className="art-track"><i style={{ width: `${Math.min(100, ((done + 0.5) / steps.length) * 100)}%` }} /></div>
    </div>
  );
}

function Pipeline() {
  const cols = [['New', 2], ['Quoted', 2], ['Won', 1]];
  return (
    <div className="art-card">
      <div className="art-head"><b>Lead pipeline</b><span className="art-badge"><Briefcase size={13} /></span></div>
      <div className="art-cols">
        {cols.map(([name, n]) => (
          <div key={name} className="art-col">
            <small>{name}</small>
            {Array.from({ length: n }).map((_, i) => (
              <div key={i} className={`art-lead ${name === 'Won' ? 'won' : ''}`}><i /><i /></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Checklist() {
  const rows = [['Site survey', true], ['Mount rails', true], ['Fit panels', true], ['Scan serial numbers', false], ['Commissioning', false]];
  return (
    <div className="art-card">
      <div className="art-head"><b>Installation checklist</b><span className="art-badge"><Wrench size={13} /></span></div>
      <ul className="art-list">
        {rows.map(([label, ok]) => (
          <li key={label} className={ok ? 'ok' : ''}><span className="art-tick">{ok && <Check size={11} strokeWidth={3} />}</span>{label}</li>
        ))}
      </ul>
    </div>
  );
}

function Stock() {
  const rows = [[Package, 'Solar panels', 'Packed'], [Boxes, 'Inverter', 'Reserved'], [Truck, 'Mounting kit', 'Dispatched'], [ScanLine, 'Serial numbers', 'Scanned']];
  return (
    <div className="art-card">
      <div className="art-head"><b>Stock and dispatch</b><span className="art-badge"><Boxes size={13} /></span></div>
      <ul className="art-list rows">
        {rows.map(([Icon, label, status]) => (
          <li key={label}><Icon size={14} /><span>{label}</span><em>{status}</em></li>
        ))}
      </ul>
    </div>
  );
}

function Modules() {
  const tiles = [[Users2, 'Leads'], [Compass, 'Surveys'], [FileText, 'Quotations'], [ShoppingCart, 'Orders'], [Wrench, 'Installations'], [LifeBuoy, 'Support']];
  return (
    <div className="art-card">
      <div className="art-head"><b>Enquiry to installation</b><span className="art-badge"><ShieldCheck size={13} /></span></div>
      <div className="art-tiles three">
        {tiles.map(([Icon, label]) => (
          <div key={label} className="art-tile"><Icon size={18} /><small>{label}</small></div>
        ))}
      </div>
    </div>
  );
}

function Departments({ highlight = true }) {
  const tiles = [[Briefcase, 'Sales'], [Wrench, 'Technicians'], [Boxes, 'Operations']];
  return (
    <div className="art-card">
      <div className="art-head"><b>Your department</b><span className="art-badge"><UserCheck size={13} /></span></div>
      <div className="art-tiles three">
        {tiles.map(([Icon, label], i) => (
          <div key={label} className={`art-tile ${highlight && i === 0 ? 'on' : ''}`}><Icon size={20} /><small>{label}</small></div>
        ))}
      </div>
      <div className="art-note"><Check size={12} strokeWidth={3} /> Each team sees only its own tools</div>
    </div>
  );
}

function Locked() {
  return (
    <div className="art-card art-center">
      <div className="art-lock"><Lock size={26} /></div>
      <small>Each team sees only its own tools</small>
      <div className="art-tiles three">
        {[[Briefcase, 'Sales'], [Wrench, 'Technicians'], [Boxes, 'Operations']].map(([Icon, l]) => (
          <div key={l} className="art-tile"><Icon size={16} /><small>{l}</small></div>
        ))}
      </div>
    </div>
  );
}

const ART = {
  customer: () => <Stepper title="Your solar project" icon={Zap} steps={['Quotation', 'Order', 'Delivery', 'Install', 'Warranty']} done={3} />,
  'signup-customer': () => <Stepper title="Your solar project" icon={Zap} steps={['Quotation', 'Order', 'Delivery', 'Install', 'Warranty']} done={0} />,
  sales: () => <Pipeline />,
  technician: () => <Checklist />,
  staff: () => <Stock />,
  admin: () => <Modules />,
  employee: () => <Departments />,
  'signup-employee': () => <Stepper title="Access request" icon={UserCheck} steps={['Request sent', 'Admin review', 'Department set', 'Dashboard']} done={0} />,
  forgot: () => <Stepper title="Reset your password" icon={KeyRound} steps={['Enter email', 'Open link', 'New password', 'Sign in']} done={0} />,
  reset: () => <Stepper title="Reset your password" icon={Mail} steps={['Enter email', 'Open link', 'New password', 'Sign in']} done={2} />,
  pending: () => <Stepper title="Access request" icon={Clock} steps={['Request sent', 'Admin review', 'Department set', 'Dashboard']} done={1} />,
  denied: () => <Locked />,
};

export default function AuthArt({ name }) {
  const Art = ART[name] || ART.customer;
  return <div className="art" aria-hidden="true"><Art /></div>;
}
