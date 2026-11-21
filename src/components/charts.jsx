import { useId } from 'react';

// Small dependency-free SVG charts used by the dashboards. They only draw the
// numbers they are given; colours come from the theme (see dashboard-ui.css).

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const compact = (v) => new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(v);

export function ChartCard({ title, icon: Icon, note, children, className = '' }) {
  return (
    <section className={`sx-card ${className}`}>
      <div className="sx-card-head">
        {Icon && <Icon size={15} />}
        {title}
        {note && <small>{note}</small>}
      </div>
      <div className="sx-card-body">{children}</div>
    </section>
  );
}

/** Striped vertical bars. data: [{ label, value, value2? }] */
export function StripedBars({ data, height = 200, format = compact }) {
  const rows = (data || []).map((d) => ({ ...d, value: num(d.value), value2: d.value2 == null ? null : num(d.value2) }));
  if (!rows.length || rows.every((r) => !r.value && !r.value2)) return <div className="sx-empty">No data yet</div>;
  const W = 520, padL = 34, padB = 22, padT = 8;
  const max = Math.max(...rows.map((r) => Math.max(r.value, r.value2 || 0)), 1);
  const H = height, plotH = H - padB - padT;
  const slot = (W - padL) / rows.length;
  const dual = rows.some((r) => r.value2 != null);
  const bw = Math.min(dual ? 14 : 22, slot * 0.6 / (dual ? 2 : 1));
  const stripes = (x, h, cls) => {
    const out = [];
    for (let y = H - padB; y > H - padB - h; y -= 4) out.push(<rect key={`${x}-${y}`} x={x} y={y - 2.4} width={bw} height="2.4" rx="0.6" className={cls} />);
    return out;
  };
  return (
    <svg className="sx-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Bar chart">
      {[0, 0.5, 1].map((t) => (
        <g key={t}>
          <line x1={padL} x2={W} y1={padT + plotH * (1 - t)} y2={padT + plotH * (1 - t)} className="sx-gridline" />
          <text x={padL - 6} y={padT + plotH * (1 - t) + 3} textAnchor="end">{format(max * t)}</text>
        </g>
      ))}
      {rows.map((r, i) => {
        const cx = padL + slot * i + slot / 2;
        const x1 = dual ? cx - bw - 1 : cx - bw / 2;
        return (
          <g key={`${r.label}-${i}`}>
            <title>{`${r.label}: ${r.value}${r.value2 != null ? ` / ${r.value2}` : ''}`}</title>
            {stripes(x1, (r.value / max) * plotH, 'sx-stripe')}
            {dual && stripes(cx + 1, ((r.value2 || 0) / max) * plotH, 'sx-bar-bg')}
            <text x={cx} y={H - 6} textAnchor="middle">{String(r.label).slice(0, 8)}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** Smooth area/line chart. series: [{ name, values:[n], tone?: 'primary'|'muted' }], labels: [string] */
export function AreaLine({ labels = [], series = [], height = 210, format = compact }) {
  const uid = useId().replace(/:/g, '');
  const all = series.flatMap((s) => s.values.map(num));
  if (!labels.length || !all.length || all.every((v) => !v)) return <div className="sx-empty">No data yet</div>;
  const W = 560, H = height, padL = 36, padB = 22, padT = 8;
  const max = Math.max(...all, 1);
  const n = labels.length;
  const X = (i) => padL + ((W - padL - 6) * (n === 1 ? 0.5 : i / (n - 1)));
  const Y = (v) => padT + (H - padT - padB) * (1 - num(v) / max);
  const path = (vals) => vals.reduce((d, v, i) => {
    if (i === 0) return `M${X(0)},${Y(v)}`;
    const cx = (X(i - 1) + X(i)) / 2;
    return `${d} C${cx},${Y(vals[i - 1])} ${cx},${Y(v)} ${X(i)},${Y(v)}`;
  }, '');
  const step = Math.ceil(n / 7);
  return (
    <svg className="sx-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Line chart">
      <defs>
        <linearGradient id={`g${uid}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--chart-3)" stopOpacity="0.35" />
          <stop offset="1" stopColor="var(--chart-3)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <g key={t}>
          <line x1={padL} x2={W} y1={padT + (H - padT - padB) * (1 - t)} y2={padT + (H - padT - padB) * (1 - t)} className="sx-gridline" />
          <text x={padL - 6} y={padT + (H - padT - padB) * (1 - t) + 3} textAnchor="end">{format(max * t)}</text>
        </g>
      ))}
      {series.map((s, si) => {
        const vals = s.values.map(num);
        const main = si === 0;
        return (
          <g key={s.name}>
            {main && <path d={`${path(vals)} L${X(n - 1)},${H - padB} L${X(0)},${H - padB} Z`} fill={`url(#g${uid})`} />}
            <path d={path(vals)} fill="none" strokeWidth={main ? 2 : 1.5} strokeDasharray={main ? undefined : '4 3'}
              stroke={main ? 'var(--chart-3)' : 'var(--text-dim)'} strokeLinecap="round" />
          </g>
        );
      })}
      {labels.map((l, i) => (i % step === 0 ? <text key={`${l}-${i}`} x={X(i)} y={H - 6} textAnchor="middle">{l}</text> : null))}
    </svg>
  );
}

/** Ring made of ticks with a legend. items: [{ label, value, tone? }] */
export function TickDonut({ items, centerLabel = 'Total', centerValue, size = 190 }) {
  const rows = (items || []).map((i) => ({ ...i, value: num(i.value) }));
  const total = rows.reduce((s, r) => s + r.value, 0);
  const tones = ['var(--chart-1)', 'var(--text-dim)', 'var(--chart-3)', 'var(--c-amber)', 'var(--c-violet)', 'var(--chart-2)'];
  if (!total) return <div className="sx-empty">No data yet</div>;
  const ticks = 60, c = size / 2, r1 = c - 4, r2 = c - 18;
  const colorAt = (i) => {
    let acc = 0;
    for (let k = 0; k < rows.length; k++) {
      acc += rows[k].value / total * ticks;
      if (i < acc - 1e-6) return tones[k % tones.length];
    }
    return tones[0];
  };
  return (
    <>
      <div className="sx-donut-wrap" style={{ width: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="sx-chart" role="img" aria-label="Distribution">
          {Array.from({ length: ticks }, (_, i) => {
            const a = (i / ticks) * Math.PI * 2 - Math.PI / 2;
            return <line key={i} x1={c + Math.cos(a) * r2} y1={c + Math.sin(a) * r2} x2={c + Math.cos(a) * r1} y2={c + Math.sin(a) * r1}
              stroke={colorAt(i)} strokeWidth="2.4" strokeLinecap="round" />;
          })}
        </svg>
        <div className="sx-donut-center"><small>{centerLabel}</small><b>{centerValue ?? total}</b></div>
      </div>
      <div className="sx-legend">
        {rows.map((r, i) => (
          <div key={r.label} className="sx-legend-row">
            <i style={{ background: tones[i % tones.length] }} />
            {r.label}
            <b>{r.display ?? r.value}</b>
            <span className="sx-pct">{Math.round((r.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </>
  );
}

/** Tiny trend line. */
export function Sparkline({ values = [], className = 'sx-spark' }) {
  const v = values.map(num);
  if (v.length < 2) return null;
  const W = 96, H = 34, max = Math.max(...v), min = Math.min(...v), span = max - min || 1;
  const pts = v.map((x, i) => `${(i / (v.length - 1)) * W},${H - 3 - ((x - min) / span) * (H - 6)}`);
  return (
    <svg className={className} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <polyline points={pts.join(' ')} fill="none" stroke="var(--text-strong)" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** Horizontal progress rows. items: [{ label, value, max? }] */
export function ProgressList({ items }) {
  const rows = items || [];
  if (!rows.length) return <div className="sx-empty">No data yet</div>;
  const max = Math.max(...rows.map((r) => num(r.max ?? r.value)), 1);
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {rows.map((r) => (
        <div key={r.label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', marginBottom: 5 }}>
            <span>{r.label}</span><b>{r.display ?? r.value}</b>
          </div>
          <div className="sx-progress"><div style={{ width: `${(num(r.value) / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}
