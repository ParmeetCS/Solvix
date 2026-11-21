import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import './App.css';
import SignUp from './components/SignUp';
import CustomerLogin from './components/CustomerLogin';
import EmployeeLogin from './components/EmployeeLogin';
import QuoteForm from './components/QuoteForm';
import RegisterCustomer from './pages/auth/RegisterCustomer';
import RegisterEmployee from './pages/auth/RegisterEmployee';
import NotFound from './pages/shared/NotFound';

// Sales & CRM Module Pages
import SalesDashboard from './pages/sales/SalesDashboard';
import LeadsList from './pages/sales/LeadsList';
import NewLead from './pages/sales/NewLead';
import LeadDetail from './pages/sales/LeadDetail';
import FollowUpsList from './pages/sales/FollowUpsList';
import WhatsAppEnquiries from './pages/sales/WhatsAppEnquiries';
import CustomersList from './pages/sales/CustomersList';
import CustomerDetail from './pages/sales/CustomerDetail';
import QuotationsList from './pages/sales/QuotationsList';
import QuotationBuilder from './pages/sales/QuotationBuilder';
import QuotationDetail from './pages/sales/QuotationDetail';
import OrdersList from './pages/sales/OrdersList';
import OrderDetail from './pages/sales/OrderDetail';

// Customer Portal Pages
import CustomerQuotations from './pages/customer/CustomerQuotations';
import CustomerQuotationDetail from './pages/customer/CustomerQuotationDetail';
import CustomerOrders from './pages/customer/CustomerOrders';
import CustomerOrderDetail from './pages/customer/CustomerOrderDetail';

// Admin Catalogue
import AdminCatalogue from './pages/admin/catalogue';

export default function App() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const onPopState = () => {
    setMobileOpen(false);
  };

  useEffect(() => {
    // Load Google Fonts
    const link1 = document.createElement('link');
    link1.rel = 'preconnect';
    link1.href = 'https://fonts.googleapis.com';
    document.head.appendChild(link1);

    const link2 = document.createElement('link');
    link2.rel = 'preconnect';
    link2.href = 'https://fonts.gstatic.com';
    link2.crossOrigin = '';
    document.head.appendChild(link2);

    const link3 = document.createElement('link');
    link3.rel = 'stylesheet';
    link3.href =
      'https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap';
    document.head.appendChild(link3);

    // Load external scripts then init
    function loadScript(src) {
      return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        s.onerror = reject;
        document.body.appendChild(s);
      });
    }

    const calm = matchMedia('(prefers-reduced-motion:reduce)').matches;

    // ===================================================================
    // 1. HERO ENGINE
    // ===================================================================
    const root = document.documentElement.style;
    const $ = id => document.getElementById(id);
    const SINK = 240, RISE = 820, DEPTH = 0.27;
    const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
    const smooth = (a, b, x) => { x = clamp((x - a) / (b - a)); return x * x * (3 - 2 * x); };
    let target = 1, from = 1, start = -1e9, queued = null, swapped = true, k = 1;
    let animating = false, clock = 0, phase = calm ? 'run' : 'wait';
    let heroPin, hero, bar, mini, spBar;
    let pinH = 1, heroH = 1, docMax = 1;

    const cv = $('fog');
    const gl = cv ? cv.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false }) : null;
    let U = {};

    if (gl) {
      const vs = `#version 300 es
void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.-1.,0,1);}`;
      const fs = `#version 300 es
precision highp float;
uniform vec2 R;uniform float T,S,K;out vec4 O;
float h(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;mat2 m=mat2(1.6,1.2,-1.2,1.6);p=mat2(.8,.6,-.6,.8)*p+5.3;for(int i=0;i<5;i++){s+=a*n(p);p=m*p;a*=.5;}return s;}
void main(){
  vec2 uv=gl_FragCoord.xy/R;uv.y=1.-uv.y;
  float asp=R.x/R.y;vec2 p=vec2(uv.x*asp,uv.y);
  float t=T*.05;
  vec2 w=vec2(fbm(p*1.3+vec2(t,-t*.6)),fbm(p*1.3+vec2(-t*.8,t)+7.));
  float d=fbm(p*1.9+w*1.7+vec2(t*1.6,-t*1.1+S*.5));
  float e=fbm(p*.9-w+vec2(-t,t*.5)+3.);
  float low=smoothstep(.70,1.04,uv.y+(d-.5)*.34);
  float side=smoothstep(.2,.0,uv.x+(e-.5)*.28)+smoothstep(.8,1.,uv.x+(e-.5)*.28);
  side*=smoothstep(.25,.6,uv.y)*.2;
  float wisps=smoothstep(.5,.78,d)*smoothstep(.22,.5,uv.y)*smoothstep(.86,.6,uv.y)*.18;
  float rest=clamp(low+side+wisps,0.,1.);
  float front=1.02-S*.68;
  float rise=smoothstep(front-.02,front+.26,uv.y+(d-.5)*.5);
  float haze=S*(.3+.46*d);
  float a=clamp(max(rest,max(rise*.97,haze)),0.,1.);
  vec3 dayA=vec3(.97,.93,.84),dayB=vec3(.79,.78,.71);
  vec3 nitA=vec3(.40,.45,.57),nitB=vec3(.15,.19,.29);
  vec3 c=mix(mix(dayB,dayA,d*1.15),mix(nitB,nitA,d*1.1),K);
  float porch=exp(-dot((uv-vec2(.72,.74))*vec2(1.7,2.6),(uv-vec2(.72,.74))*vec2(1.7,2.6))*3.2);
  c=mix(c,vec3(.86,.55,.27),K*porch*.42*(1.-S));
  O=vec4(c*a,a);
}`;
      const sh = (t, s) => {
        const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o);
        if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(o)); return o;
      };
      const pr = gl.createProgram();
      gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs));
      gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(pr); gl.useProgram(pr);
      for (const u of ['R', 'T', 'S', 'K']) U[u] = gl.getUniformLocation(pr, u);
    }

    function size() {
      if (!gl) return;
      const w = Math.round(Math.min(innerWidth, 960)), h = Math.round(w * innerHeight / innerWidth);
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; gl.viewport(0, 0, w, h); }
    }
    function measure() {
      heroPin = $('heroPin'); hero = $('hero'); bar = $('bar'); mini = $('mini'); spBar = $('sp');
      heroH = hero ? hero.offsetHeight : 1;
      pinH = heroPin ? heroPin.offsetHeight : 1;
      docMax = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    }
    const onResize = () => { size(); measure(); };
    addEventListener('resize', onResize); size(); measure();
    addEventListener('load', measure);
    addEventListener('popstate', onPopState);

    function show(n) {
      const setM = $('setM'), setN = $('setN');
      if (setM) setM.classList.toggle('is-on', !n);
      if (setN) setN.classList.toggle('is-on', !!n);
    }
    function pick(n) {
      if (n === target && queued === null) return;
      document.querySelectorAll('[data-t]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.t === n)));
      if (calm) { target = n; k = n; show(n); return; }
      if (phase !== 'run' || animating) queued = n; else begin(n, clock);
    }
    function begin(n, now) { target = n; from = k; start = now; swapped = false; animating = true; }
    document.querySelectorAll('[data-t]').forEach(b => b.addEventListener('click', () => pick(+b.dataset.t)));

    const cache = {};
    const put = (n, v) => { if (cache[n] !== v) { cache[n] = v; root.setProperty(n, v); } };
    const flags = {};
    const flag = (name, el, cls, on) => { if (flags[name] !== on) { flags[name] = on; if (el) el.classList.toggle(cls, on); } };
    let lastSp = '';

    function frame(now) {
      clock = now;
      if (window.location.pathname !== '/' && !document.getElementById('heroPin')) return;
      if (!heroPin || !hero || !bar || !mini || !spBar) { heroPin = $('heroPin'); hero = $('hero'); bar = $('bar'); mini = $('mini'); spBar = $('sp'); }
      const sy = window.scrollY || 0, p = clamp(sy / Math.max(1, pinH - heroH));
      const d = now - start; let y = 0, s = 0, dip = 0, k2 = k;
      if (phase === 'go') { phase = 'run'; target = from = k; start = now - SINK; swapped = true; animating = true; }
      if (phase === 'wait') { y = DEPTH; s = 1; dip = 1; }
      else if (animating) {
        const dd = now - start;
        if (dd < SINK) { const x = dd / SINK; y = x * x * (3 - 2 * x) * DEPTH; }
        else {
          if (!swapped) { swapped = true; show(target); }
          const x = clamp((dd - SINK) / RISE); y = Math.pow(1 - x, 3.4) * DEPTH;
        }
        s = smooth(0, SINK * .92, dd) * (1 - smooth(SINK + 70, SINK + RISE * .92, dd));
        dip = smooth(30, 190, dd) * (1 - smooth(330, 720, dd));
        k = from + (target - from) * smooth(120, 520, dd);
        k2 = from + (target - from) * smooth(340, 760, dd);
        if (dd >= SINK + RISE) {
          animating = false; k = k2 = target; y = s = dip = 0;
          if (queued !== null && queued !== target) { const q = queued; queued = null; begin(q, now); } else queued = null;
        }
      }
      y += smooth(0, 1, p) * .3;
      s = Math.max(s, smooth(.1, .8, p) * .95);
      put('--sink', (y * innerHeight).toFixed(1) + 'px');
      put('--k', k.toFixed(3)); put('--k2', k2.toFixed(3)); put('--dip', dip.toFixed(3));
      put('--hp', p.toFixed(3)); put('--veil', smooth(.72, .98, p).toFixed(3));
      flag('away', hero, 'away', p > .35);
      flag('stuck', bar, 'is-stuck', p > .5);
      flag('mini', mini, 'on', p > .85);
      const sp = (sy / docMax).toFixed(4);
      if (sp !== lastSp) { lastSp = sp; if (spBar) spBar.style.transform = 'scaleX(' + sp + ')'; }
      if (gl && sy < pinH) { gl.uniform2f(U.R, cv.width, cv.height); gl.uniform1f(U.T, now / 1000); gl.uniform1f(U.S, s); gl.uniform1f(U.K, k); gl.drawArrays(gl.TRIANGLES, 0, 3); }
    }
    let rafId;
    function loop(t) { frame(t); rafId = requestAnimationFrame(loop); }
    rafId = requestAnimationFrame(loop);

    // ===================================================================
    // 2. Load GSAP + Lenis, then init everything
    // ===================================================================
    const hasG = !!(window.gsap && window.ScrollTrigger);

    function heroIntro() {
      if (!(window.gsap && window.ScrollTrigger && !calm)) return;
      try {
        window.gsap.to('#bar', { y: 0, opacity: 1, duration: 1, ease: 'power3.out', delay: .35 });
        window.gsap.to('.w', { yPercent: 0, opacity: 1, duration: 1.15, ease: 'power4.out', stagger: .07, delay: .55 });
        window.gsap.to('.toggle,.cap', { y: 0, opacity: 1, duration: 1, ease: 'power3.out', stagger: .12, delay: 1.05, clearProps: 'transform,opacity' });
      } catch (e) { console.error(e); }
    }

    function initLenis(hasGsap) {
      if (!window.Lenis || calm) return null;
      try {
        const lenis = new window.Lenis({ lerp: .1, smoothWheel: true });
        if (hasGsap) {
          window.gsap.ticker.add(t => lenis.raf(t * 1000));
          window.gsap.ticker.lagSmoothing(0);
          lenis.on('scroll', window.ScrollTrigger.update);
        } else {
          requestAnimationFrame(function r(t) { lenis.raf(t); requestAnimationFrame(r); });
        }
        return lenis;
      } catch (e) { console.error(e); return null; }
    }

    function splitWords(el) {
      const walk = n => {
        [...n.childNodes].forEach(c => {
          if (c.nodeType === 3) {
            const frag = document.createDocumentFragment();
            c.textContent.split(/(\s+)/).forEach(t => {
              if (!t) return;
              if (/^\s+$/.test(t)) { frag.appendChild(document.createTextNode(' ')); return; }
              const o = document.createElement('span'); o.className = 'sw';
              const i = document.createElement('span'); i.className = 'si'; i.textContent = t;
              o.appendChild(i); frag.appendChild(o);
            });
            c.replaceWith(frag);
          } else if (c.nodeType === 1 && c.tagName !== 'BR') walk(c);
        });
      };
      walk(el); return el.querySelectorAll('.si');
    }

    function initMotion() {
      const { gsap, ScrollTrigger } = window;
      gsap.registerPlugin(ScrollTrigger);

      document.querySelectorAll('[data-split]').forEach(h => {
        const w = splitWords(h); gsap.set(w, { yPercent: 115 });
        ScrollTrigger.create({ trigger: h, start: 'top 86%', once: true, onEnter: () => gsap.to(w, { yPercent: 0, duration: 1.1, ease: 'power4.out', stagger: .045 }) });
      });

      gsap.set('[data-reveal]', { y: 36 });
      ScrollTrigger.batch('[data-reveal]', {
        start: 'top 92%', once: true,
        onEnter: b => gsap.to(b, { opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: .09, overwrite: true })
      });

      const storyText = $('storyText');
      if (storyText) {
        const sw = splitWords(storyText);
        gsap.fromTo(sw, { opacity: .14 }, {
          opacity: 1, stagger: .12, ease: 'none',
          scrollTrigger: { trigger: '#storyText', start: 'top 78%', end: 'bottom 52%', scrub: true }
        });
      }

      const mm = gsap.matchMedia();
      mm.add('(min-width:900px)', () => {
        const track = document.querySelector('.track'), dist = () => Math.max(0, track.scrollWidth - innerWidth);
        gsap.timeline({
          defaults: { ease: 'none' }, scrollTrigger: {
            trigger: '.hs', start: 'top top', end: () => '+=' + (dist() + innerHeight * .4),
            pin: true, scrub: .7, anticipatePin: 1, invalidateOnRefresh: true, refreshPriority: 1
          }
        }).to(track, { x: () => -dist() }, 0).to('.hs-prog i', { scaleX: 1 }, 0);
      });
      mm.add('(max-width:899px)', () => {
        gsap.set('.mcard', { opacity: 0, y: 40 });
        ScrollTrigger.batch('.mcard', {
          start: 'top 92%', once: true,
          onEnter: b => gsap.to(b, { opacity: 1, y: 0, duration: .9, ease: 'power3.out', stagger: .1 })
        });
      });

      const no = $('stepNo');
      const setNo = i => {
        if (no) {
          no.textContent = String(i + 1).padStart(2, '0');
          gsap.fromTo(no, { yPercent: 35, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .5, ease: 'power3.out' });
        }
      };
      gsap.utils.toArray('.step').forEach((st, i) => ScrollTrigger.create({
        trigger: st, start: 'top 62%', end: 'bottom 62%',
        onToggle: s => st.classList.toggle('active', s.isActive),
        onEnter: () => setNo(i), onEnterBack: () => setNo(i)
      }));
      gsap.to('.rail i', { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.steps', start: 'top 62%', end: 'bottom 62%', scrub: true } });

      document.querySelectorAll('[data-count]').forEach(el => {
        const t = +el.dataset.count, o = { v: 0 }; el.textContent = '0';
        ScrollTrigger.create({
          trigger: el, start: 'top 90%', once: true,
          onEnter: () => gsap.to(o, { v: t, duration: 1.6, ease: 'power2.out', onUpdate: () => { el.textContent = Math.round(o.v); } })
        });
      });

      const line = $('gLine'), dot = $('gDot'), clip = $('gClipR'), kw = $('gKw');
      if (line && dot && clip && kw) {
        const len = line.getTotalLength();
        line.style.strokeDasharray = len; line.style.strokeDashoffset = len; clip.setAttribute('width', 0);
        ScrollTrigger.create({
          trigger: '.gen', start: 'top 80%', end: 'bottom 40%', scrub: .5, onUpdate: s => {
            const pr = s.progress, pt = line.getPointAtLength(len * pr);
            line.style.strokeDashoffset = len * (1 - pr);
            dot.setAttribute('transform', 'translate(' + pt.x + ' ' + pt.y + ')'); dot.style.opacity = pr > .01 ? 1 : 0;
            clip.setAttribute('width', pt.x);
            kw.textContent = (Math.max(0, 290 - pt.y) / 240 * 8).toFixed(1) + ' kW';
          }
        });
      }

      if (matchMedia('(hover:hover)').matches) {
        document.querySelectorAll('.mag').forEach(el => {
          const xt = gsap.quickTo(el, 'x', { duration: .5, ease: 'power3' }), yt = gsap.quickTo(el, 'y', { duration: .5, ease: 'power3' });
          el.addEventListener('pointermove', e => { const r = el.getBoundingClientRect(); xt((e.clientX - r.left - r.width / 2) * .28); yt((e.clientY - r.top - r.height / 2) * .4); });
          el.addEventListener('pointerleave', () => { xt(0); yt(0); });
        });
      }

      ScrollTrigger.sort();
      ScrollTrigger.addEventListener('refresh', measure);
      ScrollTrigger.refresh();
    }

    // ===================================================================
    // 3. SECTION UI
    // ===================================================================
    document.querySelectorAll('.mcard').forEach(c => {
      c.addEventListener('pointermove', e => {
        const r = c.getBoundingClientRect();
        c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        c.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });

    // Roles tabs
    (function roles() {
      const tabs = [...document.querySelectorAll('[role=tab]')], panels = [...document.querySelectorAll('.panel')];
      let cur = 0;
      function activate(i, focus) {
        cur = i;
        tabs.forEach((t, j) => { t.setAttribute('aria-selected', String(j === i)); t.tabIndex = j === i ? 0 : -1; });
        panels.forEach((p, j) => { p.hidden = j !== i; p.classList.remove('live'); });
        const p = panels[i];
        requestAnimationFrame(() => requestAnimationFrame(() => p.classList.add('live')));
        if (window.gsap && window.ScrollTrigger && !calm) {
          window.gsap.fromTo(p.querySelectorAll('.pinfo>*,[data-in]'), { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: .75, stagger: .06, ease: 'power3.out', clearProps: 'transform,opacity' });
        }
        if (focus) tabs[i].focus();
      }
      tabs.forEach((t, i) => {
        t.addEventListener('click', () => activate(i));
        t.addEventListener('keydown', e => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            e.preventDefault(); activate((i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length, true);
          }
        });
      });
      const rolesEl = $('roles');
      if (rolesEl) {
        new IntersectionObserver(es => es.forEach(en => panels[cur].classList.toggle('live', en.isIntersecting)), { threshold: .25 }).observe(rolesEl);
      }
    })();

    // ===================================================================
    // 4. Load scripts and wire up everything
    // ===================================================================
    Promise.all([
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js'),
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js'),
      loadScript('https://cdn.jsdelivr.net/npm/lenis@1/dist/lenis.min.js'),
    ]).then(() => {
      if (window.location.pathname !== '/') return;
      const gsapLoaded = !!(window.gsap && window.ScrollTrigger);

      if (gsapLoaded && !calm) {
        try {
          window.gsap.set('#bar', { y: -28, opacity: 0 });
          window.gsap.set('.w', { yPercent: 70, opacity: 0 });
          window.gsap.set('.toggle,.cap', { y: 34, opacity: 0 });
        } catch (e) { console.error(e); }
      }

      const lenis = initLenis(gsapLoaded);

      document.addEventListener('click', e => {
        const a = e.target.closest('a[href^="#"]'); if (!a) return;
        const id = a.getAttribute('href');
        if (id === '#') {
          e.preventDefault();
          lenis ? lenis.scrollTo(0, { duration: 1.6 }) : scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' });
          return;
        }
        const el = document.querySelector(id); if (!el) return;
        e.preventDefault();
        lenis ? lenis.scrollTo(el, { offset: -30, duration: 1.6 }) : el.scrollIntoView({ behavior: calm ? 'auto' : 'smooth' });
      });

      if (!calm) {
        const imgs = [...document.querySelectorAll('.hero img')];
        const decoded = Promise.all(imgs.map(i => i.decode ? i.decode().catch(() => { }) : Promise.resolve()));
        Promise.race([decoded, new Promise(r => setTimeout(r, 3500))]).then(() => {
          phase = 'go';
          heroIntro();
        });
      }

      if (gsapLoaded && !calm) {
        document.documentElement.classList.add('js-anim');
        try { initMotion(); } catch (err) {
          console.error(err); document.documentElement.classList.remove('js-anim');
        }
      }

      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
          measure();
          if (window.ScrollTrigger) window.ScrollTrigger.refresh();
        });
      }
    }).catch(console.error);

    // Cleanup
    return () => {
      cancelAnimationFrame(rafId);
      removeEventListener('resize', onResize);
      removeEventListener('load', measure);
      removeEventListener('popstate', onPopState);
    };
  }, []);

  return (
    <>
      {/* SVG symbol definitions */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <symbol id="sun" viewBox="0 0 40 40">
            <path id="ray" d="M18.3 3.5h3.4l.9 8.4h-5.2Z" />
            <use href="#ray" transform="rotate(30 20 20)" />
            <use href="#ray" transform="rotate(60 20 20)" />
            <use href="#ray" transform="rotate(90 20 20)" />
            <use href="#ray" transform="rotate(120 20 20)" />
            <use href="#ray" transform="rotate(150 20 20)" />
            <use href="#ray" transform="rotate(180 20 20)" />
            <use href="#ray" transform="rotate(210 20 20)" />
            <use href="#ray" transform="rotate(240 20 20)" />
            <use href="#ray" transform="rotate(270 20 20)" />
            <use href="#ray" transform="rotate(300 20 20)" />
            <use href="#ray" transform="rotate(330 20 20)" />
          </symbol>
          <symbol id="arrow" viewBox="0 0 24 24">
            <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </symbol>
        </defs>
      </svg>

      {/* Scroll progress bar */}
      <div id="sp" aria-hidden="true"></div>

      {/* NAV */}
      <header className="bar" id="bar">
        <a className="logo" href="#" aria-label="Solvix, back to top" onClick={(e) => { e.preventDefault(); navigate('/'); setMobileOpen(false); }}>
          <svg className="sun" viewBox="0 0 40 40" aria-hidden="true">
            <use href="#sun" width="40" height="40" />
          </svg>
          Solvix
        </a>
        <ul className="links">
          <li><a href="#" onClick={(e) => { e.preventDefault(); navigate('/'); setMobileOpen(false); }}>Home</a></li>
          <li><a href="#flow" onClick={() => setMobileOpen(false)}>How It Works</a></li>
          <li><a href="#platform" onClick={() => setMobileOpen(false)}>Features</a></li>
          <li><a href="#solutions" onClick={() => setMobileOpen(false)}>Solutions</a></li>
          <li><a href="#story" onClick={() => setMobileOpen(false)}>About Us</a></li>
          <li><a href="#contact" onClick={() => setMobileOpen(false)}>Contact</a></li>
        </ul>
        <div className="side">
          <a className="cta cta-signup" href="/signup" onClick={(e) => { e.preventDefault(); navigate('/signup'); setMobileOpen(false); }}>Sign Up</a>
          <a className="cta" href="/get-quote" onClick={(e) => { e.preventDefault(); navigate('/get-quote'); setMobileOpen(false); }}>Get a Quote</a>
        </div>
        <button className="menu-toggle" aria-label="Toggle menu" aria-expanded={mobileOpen} onClick={() => setMobileOpen(!mobileOpen)}>
          <span aria-hidden="true">{mobileOpen ? '\u2715' : '\u2630'}</span>
        </button>
      </header>

      {mobileOpen && (
        <div className="mobile-menu open" role="navigation" aria-label="Mobile menu">
          <button className="mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close menu">
            <span aria-hidden="true">\u2715</span>
          </button>
          <nav>
            <a href="#" onClick={(e) => { e.preventDefault(); navigate('/'); setMobileOpen(false); }}>Home</a>
            <a href="#flow" onClick={() => setMobileOpen(false)}>How It Works</a>
            <a href="#platform" onClick={() => setMobileOpen(false)}>Features</a>
            <a href="#solutions" onClick={() => setMobileOpen(false)}>Solutions</a>
            <a href="#story" onClick={() => setMobileOpen(false)}>About Us</a>
            <a href="#contact" onClick={() => setMobileOpen(false)}>Contact</a>
          </nav>
          <div className="acct">
            <a className="cta-btn cta-signup" href="/signup" onClick={(e) => { e.preventDefault(); navigate('/signup'); setMobileOpen(false); }}>Sign Up</a>
            <a className="cta-btn" href="/get-quote" onClick={(e) => { e.preventDefault(); navigate('/get-quote'); setMobileOpen(false); }}>Get a Quote</a>
          </div>
        </div>
      )}

      <Routes>
        <Route path="/" element={
          <>
            {/* HERO */}
            <div className="hero-pin" id="heroPin">
              <main className="hero" id="hero">
                <div className="layer sky">
                  <img id="skyM" alt=""
                    src="https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261102_040343_a73684b4-3f71-4613-a843-c8be80fb1211.png&w=1600&q=80" />
                  <img id="skyN" alt=""
                    src="https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261102_040308_f31964ab-ed8e-4ea4-90eb-3226c0859936.png&w=1600&q=80" />
                </div>
                <div className="layer home">
                  <div className="set" id="setM">
                    <div className="layer ground">
                      <img alt=""
                        src="https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261102_040259_1be34093-835e-4de4-b3a8-f875e6a74591.png&w=2560&q=85" />
                    </div>
                    <img className="cut" alt="A charcoal farmhouse with solar panels in soft morning light"
                      src="https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261102_040416_e3b05fa4-cc80-4a43-afde-8a0a053933e9.png&w=2560&q=85"
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 62%' }} />
                  </div>
                  <div className="set is-on" id="setN">
                    <div className="layer ground">
                      <img alt=""
                        src="https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261102_040211_c8fd4865-285e-4c1f-8a37-4bfe0771357b.png&w=2560&q=85" />
                    </div>
                    <img className="cut" alt="The same farmhouse at dusk with warm amber windows"
                      src="https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261102_040415_2ab95096-8c39-449f-b36c-17c2813815a4.png&w=2560&q=85"
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 62%' }} />
                  </div>
                </div>
                <div className="tilt"></div>
                <canvas id="fog" aria-hidden="true"></canvas>
                <div className="veil"></div>
                <div className="ui">
                  <h1>
                    <span className="l1">
                      <span className="w">0</span> <span className="w">Electricity</span> <span className="w">Bills</span>
                    </span>
                    <span className="l2">
                      <i><span className="w">for</span> <span className="w">the</span> <span className="w">next</span></i>{' '}
                      <span className="y"><span className="w">7</span> <span className="w">Years</span></span>
                    </span>
                  </h1>
                  <div className="dock">
                    <div className="toggle" role="group" aria-label="Time of day">
                      <button data-t="0" aria-pressed="false"><b>Morning</b><small>0 for Electricity</small></button>
                      <button data-t="1" aria-pressed="true"><b>Night</b><small>0 for Electricity</small></button>
                    </div>
                    <p className="cap">Forget the energy market, weather conditions and seasons. Our Smart <br />Controller guarantees
                      you get no electricity bill for seven years.</p>
                  </div>
                </div>
              </main>
            </div>

            {/* SITE SECTIONS */}
            <div className="site">

              {/* Ticker */}
              <div className="ticker" aria-hidden="true">
                <div className="tick-track">
                  <div className="grp">
                    <span>Leads</span><svg className="sun"><use href="#sun" width="22" height="22" /></svg>
                    <span>Quotations</span><svg className="sun"><use href="#sun" width="22" height="22" /></svg>
                    <span>Inventory</span><svg className="sun"><use href="#sun" width="22" height="22" /></svg>
                    <span>Installations</span><svg className="sun"><use href="#sun" width="22" height="22" /></svg>
                    <span>Warranty</span><svg className="sun"><use href="#sun" width="22" height="22" /></svg>
                    <span>Finance</span><svg className="sun"><use href="#sun" width="22" height="22" /></svg>
                    <span>Analytics</span><svg className="sun"><use href="#sun" width="22" height="22" /></svg>
                  </div>
                  <div className="grp">
                    <span>Leads</span><svg className="sun"><use href="#sun" width="22" height="22" /></svg>
                    <span>Quotations</span><svg className="sun"><use href="#sun" width="22" height="22" /></svg>
                    <span>Inventory</span><svg className="sun"><use href="#sun" width="22" height="22" /></svg>
                    <span>Installations</span><svg className="sun"><use href="#sun" width="22" height="22" /></svg>
                    <span>Warranty</span><svg className="sun"><use href="#sun" width="22" height="22" /></svg>
                    <span>Finance</span><svg className="sun"><use href="#sun" width="22" height="22" /></svg>
                    <span>Analytics</span><svg className="sun"><use href="#sun" width="22" height="22" /></svg>
                  </div>
                </div>
              </div>

              {/* Story */}
              <section className="sec story" id="story">
                <div className="wrap">
                  <span className="eyebrow" data-reveal="">Why SIMS</span>
                  <p className="big" id="storyText">Solar companies don&#39;t lose money on panels. They lose it in the gaps: a lead that
                    went quiet, a quote built by hand, a part nobody can trace, a warranty nobody remembers. <em>SIMS closes every
                      gap.</em></p>
                  <ul className="pains">
                    <li data-reveal="">Lost customer leads</li>
                    <li data-reveal="">Manual quotation errors</li>
                    <li data-reveal="">Unorganised inventory</li>
                    <li data-reveal="">No equipment traceability</li>
                    <li data-reveal="">Messy installation scheduling</li>
                    <li data-reveal="">Missed warranties</li>
                    <li data-reveal="">Unclear project profit</li>
                  </ul>
                </div>
              </section>

              {/* Modules */}
              <section className="hs" id="platform">
                <div className="hs-in">
                  <div className="hs-head wrap">
                    <span className="eyebrow" data-reveal="">The platform</span>
                    <h2 className="display" data-split="">Seven modules. <em>One source of truth.</em></h2>
                    <p className="lead" data-reveal="">Customer, sales, stock, crews, service and finance all live in the same system, so
                      nothing has to be re-typed, chased or guessed.</p>
                  </div>
                  <div className="track">
                    {/* Card 01 */}
                    <article className="mcard">
                      <div className="top">
                        <div className="ico"><svg viewBox="0 0 24 24">
                          <circle cx="9" cy="8" r="3.2" />
                          <path d="M3 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
                          <circle cx="17.5" cy="9" r="2.4" />
                          <path d="M17 14c2.4.2 4 1.8 4 4.2" />
                        </svg></div><span className="no">01</span>
                      </div>
                      <div>
                        <h3><small>CRM</small>Capture every enquiry. Never lose a lead.</h3>
                        <p>Every enquiry gets an owner, a status and a next step, so follow-ups happen on time.</p>
                        <ul className="tags">
                          <li>Lead pipeline</li><li>Reminders</li><li>Customer history</li>
                        </ul>
                      </div>
                    </article>
                    {/* Card 02 */}
                    <article className="mcard">
                      <div className="top">
                        <div className="ico"><svg viewBox="0 0 24 24">
                          <path d="M6 3h8l4 4v14H6z" />
                          <path d="M14 3v4h4M9 12h6M9 16h6" />
                        </svg></div><span className="no">02</span>
                      </div>
                      <div>
                        <h3><small>Sales &amp; Quotations</small>Quotes that add up, every time.</h3>
                        <p>Build quotations from live stock and pricing instead of hand-typed spreadsheets.</p>
                        <ul className="tags">
                          <li>Templates</li><li>Versions</li><li>Approvals</li>
                        </ul>
                      </div>
                    </article>
                    {/* Card 03 */}
                    <article className="mcard">
                      <div className="top">
                        <div className="ico"><svg viewBox="0 0 24 24">
                          <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z" />
                          <path d="M3 7.5 12 12l9-4.5M12 12v9" />
                        </svg></div><span className="no">03</span>
                      </div>
                      <div>
                        <h3><small>Inventory</small>Know every panel by its serial number.</h3>
                        <p>Track stock, suppliers and equipment from the shelf to the roof it ends up on.</p>
                        <ul className="tags">
                          <li>Stock levels</li><li>Traceability</li><li>Suppliers</li>
                        </ul>
                      </div>
                    </article>
                    {/* Card 04 */}
                    <article className="mcard">
                      <div className="top">
                        <div className="ico"><svg viewBox="0 0 24 24">
                          <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
                          <path d="M3.5 10h17M8 3v4M16 3v4M9 15l2 2 4-4" />
                        </svg></div><span className="no">04</span>
                      </div>
                      <div>
                        <h3><small>Projects &amp; Workforce</small>Crews, sites and schedules in sync.</h3>
                        <p>Plan surveys and installations, assign technicians and watch progress as it happens.</p>
                        <ul className="tags">
                          <li>Scheduling</li><li>Checklists</li><li>Progress</li>
                        </ul>
                      </div>
                    </article>
                    {/* Card 05 */}
                    <article className="mcard">
                      <div className="top">
                        <div className="ico"><svg viewBox="0 0 24 24">
                          <path d="M12 3 4.5 6v5.5c0 4.4 3 7.7 7.5 9.5 4.5-1.8 7.5-5.1 7.5-9.5V6z" />
                          <path d="m9 12 2.2 2.2L15.5 10" />
                        </svg></div><span className="no">05</span>
                      </div>
                      <div>
                        <h3><small>Warranty &amp; Service</small>Warranties that remember themselves.</h3>
                        <p>Warranty terms attach to the serial number, with reminders and service tickets to match.</p>
                        <ul className="tags">
                          <li>Warranty terms</li><li>Expiry alerts</li><li>Service tickets</li>
                        </ul>
                      </div>
                    </article>
                    {/* Card 06 */}
                    <article className="mcard">
                      <div className="top">
                        <div className="ico"><svg viewBox="0 0 24 24">
                          <rect x="3" y="6" width="18" height="13" rx="2.5" />
                          <path d="M3 10h18M16 14.5h2" />
                        </svg></div><span className="no">06</span>
                      </div>
                      <div>
                        <h3><small>Finance</small>See profit per project, not per guess.</h3>
                        <p>Invoices, payments and project costs roll up into a margin you can trust.</p>
                        <ul className="tags">
                          <li>Invoicing</li><li>Payments</li><li>Project costing</li>
                        </ul>
                      </div>
                    </article>
                    {/* Card 07 */}
                    <article className="mcard">
                      <div className="top">
                        <div className="ico"><svg viewBox="0 0 24 24">
                          <path d="M4 20v-7M10 20V5M16 20v-10M2.5 20h19" />
                        </svg></div><span className="no">07</span>
                      </div>
                      <div>
                        <h3><small>Analytics</small>Decisions from data, not hunches.</h3>
                        <p>Dashboards for conversion, utilisation, stock and profitability, ready when management asks.</p>
                        <ul className="tags">
                          <li>Dashboards</li><li>Reports</li><li>Trends</li>
                        </ul>
                      </div>
                    </article>
                  </div>
                  <div className="hs-prog" aria-hidden="true"><i></i></div>
                </div>
              </section>

              {/* Lifecycle */}
              <section className="sec flow" id="flow">
                <div className="wrap flow-grid">
                  <div className="flow-side">
                    <div className="sticky">
                      <span className="eyebrow" data-reveal="">How it works</span>
                      <h2 className="display" data-split="">From first enquiry to <em>final report.</em></h2>
                      <p className="lead" data-reveal="">One continuous record follows every job through seven stages, with no hand-offs
                        lost in between.</p>
                      <div className="stepno" aria-hidden="true"><b id="stepNo">01</b><span>/ 07</span></div>
                    </div>
                  </div>
                  <ol className="steps">
                    <div className="rail" aria-hidden="true"><i></i></div>
                    <li className="step"><span className="n">01</span>
                      <h3>Enquiry</h3>
                      <p>A lead is captured, assigned to a salesperson and followed up on schedule.</p>
                      <ul className="tags"><li>CRM</li></ul>
                    </li>
                    <li className="step"><span className="n">02</span>
                      <h3>Quotation</h3>
                      <p>The system is sized and priced from live stock, then sent for approval and to the customer.</p>
                      <ul className="tags"><li>Sales</li><li>Inventory</li></ul>
                    </li>
                    <li className="step"><span className="n">03</span>
                      <h3>Procurement</h3>
                      <p>Materials are reserved against the project and shortages are flagged before they delay a crew.</p>
                      <ul className="tags"><li>Inventory</li><li>Finance</li></ul>
                    </li>
                    <li className="step"><span className="n">04</span>
                      <h3>Installation</h3>
                      <p>Technicians get the schedule and checklist, and record serial numbers on site as they go.</p>
                      <ul className="tags"><li>Projects</li><li>Workforce</li></ul>
                    </li>
                    <li className="step"><span className="n">05</span>
                      <h3>Commissioning</h3>
                      <p>The finished system is handed over and its documents land in the customer&#39;s portal.</p>
                      <ul className="tags"><li>Projects</li><li>Customer portal</li></ul>
                    </li>
                    <li className="step"><span className="n">06</span>
                      <h3>Warranty &amp; service</h3>
                      <p>Warranty clocks start automatically and service requests are tracked to resolution.</p>
                      <ul className="tags"><li>Warranty</li><li>Service</li></ul>
                    </li>
                    <li className="step"><span className="n">07</span>
                      <h3>Reporting</h3>
                      <p>Profit per project, team performance and pipeline health, straight from the same records.</p>
                      <ul className="tags"><li>Finance</li><li>Analytics</li></ul>
                    </li>
                  </ol>
                </div>
              </section>

              {/* Roles */}
              <section className="sec roles" id="roles">
                <div className="wrap">
                  <div className="roles-head">
                    <span className="eyebrow" data-reveal="">Role-based access</span>
                    <h2 className="display" data-split="">One platform. <em>Four views.</em></h2>
                    <div className="tabs" role="tablist" aria-label="Choose a role" data-reveal="">
                      <button role="tab" id="t0" aria-selected="true" aria-controls="p0">Administrator</button>
                      <button role="tab" id="t1" aria-selected="false" aria-controls="p1" tabIndex={-1}>Sales</button>
                      <button role="tab" id="t2" aria-selected="false" aria-controls="p2" tabIndex={-1}>Technician</button>
                      <button role="tab" id="t3" aria-selected="false" aria-controls="p3" tabIndex={-1}>Customer</button>
                    </div>
                  </div>

                  {/* Panel 0: Admin */}
                  <div className="panel" id="p0" role="tabpanel" aria-labelledby="t0">
                    <div className="pinfo">
                      <h3>The whole business at a glance.</h3>
                      <p>Administrators see every project, every rupee and every risk, and control who can do what.</p>
                      <ul className="ticks">
                        <li>Company-wide dashboards and project profitability</li>
                        <li>User, role and permission management</li>
                        <li>Approvals for quotations, purchases and discounts</li>
                        <li>Audit trail across stock, pricing and payments</li>
                      </ul>
                    </div>
                    <div className="mock">
                      <div className="mbar"><i></i><i></i><i></i><b>Admin · Overview</b><span>Illustrative data</span></div>
                      <div className="kpis">
                        <div className="kpi"><small>Active projects</small><b>24</b><span>+4 this month</span></div>
                        <div className="kpi"><small>Quotes pending</small><b>11</b><span>3 need approval</span></div>
                        <div className="kpi"><small>Low-stock items</small><b>5</b><span>Reorder suggested</span></div>
                        <div className="kpi"><small>Average margin</small><b>18.4%</b><span>+1.2 pts</span></div>
                      </div>
                      <div className="chart"><small>Profit by month</small>
                        <div className="bars">
                          <div className="b"><i style={{ '--h': '38%', '--d': 0 }}></i></div>
                          <div className="b"><i style={{ '--h': '46%', '--d': 1 }}></i></div>
                          <div className="b"><i style={{ '--h': '42%', '--d': 2 }}></i></div>
                          <div className="b"><i style={{ '--h': '58%', '--d': 3 }}></i></div>
                          <div className="b"><i style={{ '--h': '52%', '--d': 4 }}></i></div>
                          <div className="b"><i style={{ '--h': '66%', '--d': 5 }}></i></div>
                          <div className="b"><i style={{ '--h': '61%', '--d': 6 }}></i></div>
                          <div className="b"><i style={{ '--h': '74%', '--d': 7 }}></i></div>
                          <div className="b"><i style={{ '--h': '70%', '--d': 8 }}></i></div>
                          <div className="b"><i style={{ '--h': '82%', '--d': 9 }}></i></div>
                          <div className="b"><i style={{ '--h': '78%', '--d': 10 }}></i></div>
                          <div className="b"><i style={{ '--h': '92%', '--d': 11 }}></i></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Panel 1: Sales */}
                  <div className="panel" id="p1" role="tabpanel" aria-labelledby="t1" hidden>
                    <div className="pinfo">
                      <h3>Every lead, one pipeline.</h3>
                      <p>Sales teams log enquiries, build quotations and keep customers moving, without a spreadsheet in sight.</p>
                      <ul className="ticks">
                        <li>Log enquiries and schedule follow-ups</li>
                        <li>Build and send quotations from live pricing</li>
                        <li>See each customer&#39;s full history</li>
                        <li>Track conversion from enquiry to order</li>
                      </ul>
                    </div>
                    <div className="mock">
                      <div className="mbar"><i></i><i></i><i></i><b>Sales · Pipeline</b><span>Illustrative data</span></div>
                      <div className="kanban">
                        <div className="col">
                          <h5>New</h5>
                          <div className="lc" data-in=""><b>Residential</b>5 kW rooftop</div>
                          <div className="lc" data-in=""><b>Commercial</b>40 kW rooftop</div>
                          <div className="lc" data-in=""><b>Residential</b>3 kW rooftop</div>
                        </div>
                        <div className="col">
                          <h5>Quoted</h5>
                          <div className="lc" data-in=""><b>Residential</b>8 kW + battery</div>
                          <div className="lc" data-in=""><b>Farm</b>15 kW pump</div>
                        </div>
                        <div className="col">
                          <h5>Negotiating</h5>
                          <div className="lc" data-in=""><b>Commercial</b>60 kW rooftop</div>
                          <div className="lc" data-in=""><b>Residential</b>6 kW rooftop</div>
                        </div>
                        <div className="col win">
                          <h5>Won</h5>
                          <div className="lc" data-in=""><b>Residential</b>10 kW rooftop</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Panel 2: Technician */}
                  <div className="panel" id="p2" role="tabpanel" aria-labelledby="t2" hidden>
                    <div className="pinfo">
                      <h3>Today&#39;s jobs, in hand.</h3>
                      <p>Technicians see what is scheduled, tick off the checklist and record exactly which equipment went where.</p>
                      <ul className="ticks">
                        <li>Assigned installations and site checklists</li>
                        <li>Serial numbers recorded on site</li>
                        <li>Progress updates the office sees instantly</li>
                        <li>Service issues raised from the field</li>
                      </ul>
                    </div>
                    <div className="mock">
                      <div className="mbar"><i></i><i></i><i></i><b>Technician · Today</b><span>Illustrative data</span></div>
                      <div className="jobs">
                        <div className="job" data-in=""><span className="ck done"></span>Site survey, 3 kW rooftop<small>9:00</small></div>
                        <div className="job" data-in=""><span className="ck done"></span>Mount rails, 8 kW system<small>11:30</small></div>
                        <div className="job" data-in=""><span className="ck"></span>Fit panels and scan serials<small>1:30</small></div>
                        <div className="job" data-in=""><span className="ck"></span>Inverter commissioning<small>4:00</small></div>
                      </div>
                      <div className="mrow"><span>Serial numbers scanned</span><b>12 / 16</b></div>
                      <div className="pg"><i style={{ '--w': '75%' }}></i></div>
                    </div>
                  </div>

                  {/* Panel 3: Customer */}
                  <div className="panel" id="p3" role="tabpanel" aria-labelledby="t3" hidden>
                    <div className="pinfo">
                      <h3>Always know where your system stands.</h3>
                      <p>Customers follow their installation, find their documents and ask for service, all in one place.</p>
                      <ul className="ticks">
                        <li>Live installation progress</li>
                        <li>Documents and warranty details on file</li>
                        <li>Service requests with status updates</li>
                        <li>Invoices and payment history</li>
                      </ul>
                    </div>
                    <div className="mock">
                      <div className="mbar"><i></i><i></i><i></i><b>Customer · My system</b><span>Illustrative data</span></div>
                      <div className="cs d" data-in="">Enquiry received</div>
                      <div className="cs d" data-in="">Quotation approved</div>
                      <div className="cs d" data-in="">Materials delivered</div>
                      <div className="cs n" data-in="">Installation in progress</div>
                      <div className="cs" data-in="">Commissioning</div>
                      <div className="mrow"><span>Overall progress</span><b>68%</b></div>
                      <div className="pg"><i style={{ '--w': '68%' }}></i></div>
                      <div className="wrow">
                        <div className="wc"><small>Panel warranty</small><b>25 years</b></div>
                        <div className="wc"><small>Inverter warranty</small><b>10 years</b></div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Solutions */}
              <section className="sec solutions" id="solutions">
                <div className="wrap">
                  <span className="eyebrow" data-reveal="">Solutions</span>
                  <h2 className="display" data-split="">Built for every <em>team in the field.</em></h2>
                  <p className="lead" data-reveal="">SOLVIX gives each department the tools it needs, on a single shared record&mdash;from first enquiry to final report.</p>
                  <div className="sol-grid">
                    <article className="solution-card">
                      <h3>Sales Teams</h3>
                      <p>Capture enquiries, build quotations from live pricing, and track conversion from first contact to signed order.</p>
                      <a href="/get-quote">Get a quote &rarr;</a>
                    </article>
                    <article className="solution-card">
                      <h3>Survey Teams</h3>
                      <p>Schedule site surveys, record roof and shading details, and convert surveys into scoped projects.</p>
                      <a href="#platform">Explore modules &rarr;</a>
                    </article>
                    <article className="solution-card">
                      <h3>Warehouse Teams</h3>
                      <p>Track stock, suppliers and every panel by its serial number, from the shelf to the roof.</p>
                      <a href="#platform">Explore modules &rarr;</a>
                    </article>
                    <article className="solution-card">
                      <h3>Installation Teams</h3>
                      <p>Assign crews and schedules, run site checklists, and record serial numbers as work happens.</p>
                      <a href="#platform">Explore modules &rarr;</a>
                    </article>
                    <article className="solution-card">
                      <h3>Customer Support</h3>
                      <p>Give customers live installation progress, documents, warranty details and service requests in one portal.</p>
                      <a href="#roles">Customer portal &rarr;</a>
                    </article>
                    <article className="solution-card">
                      <h3>Accounts &amp; Finance</h3>
                      <p>Roll up invoices, payments and project costs into margins you can trust, with per-project profitability.</p>
                      <a href="#platform">Explore modules &rarr;</a>
                    </article>
                  </div>
                </div>
              </section>

              {/* Contact */}
              <section className="sec contact" id="contact">
                <div className="wrap">
                  <span className="eyebrow" data-reveal="">Contact</span>
                  <h2 className="display" data-split="">Get in <em>touch.</em></h2>
                  <p className="lead" data-reveal="">Reach the SOLVIX team. Project enquiries are handled through the quotation form below.</p>
                  <div className="contact-grid">
                    <div className="contact-item">
                      <span className="label">General enquiries</span>
                      <div className="value placeholder">[Email address]</div>
                    </div>
                    <div className="contact-item">
                      <span className="label">Sales &amp; quotations</span>
                      <div className="value placeholder">[Phone number]</div>
                    </div>
                    <div className="contact-item">
                      <span className="label">Office</span>
                      <div className="value placeholder">[Office address]</div>
                    </div>
                  </div>
                  <p style={{ marginTop: 32, textAlign: 'center' }}>
                    <a className="btn primary mag" href="/get-quote" onClick={(e) => { e.preventDefault(); navigate('/get-quote'); }}>Submit an enquiry <svg style={{ width: 18, height: 18 }}><use href="#arrow" /></svg></a>
                  </p>
                </div>
              </section>

              {/* Numbers */}
              <section className="stats">
                <div className="wrap stat-grid">
                  <div className="stat"><b data-count="7">7</b><span>Integrated modules</span></div>
                  <div className="stat"><b data-count="4">4</b><span>Role-based portals</span></div>
                  <div className="stat"><b data-count="7">7</b><span>Lifecycle stages tracked</span></div>
                  <div className="stat"><b data-count="1">1</b><span>Source of truth</span></div>
                </div>
              </section>

              {/* Future */}
              <section className="sec future" id="future">
                <div className="wrap fut-grid">
                  <div>
                    <span className="eyebrow" data-reveal="">Roadmap</span>
                    <h2 className="display" data-split="">Ready for <em>what&#39;s next.</em></h2>
                    <p className="lead" data-reveal="">Clean, connected data is the foundation for the next layer: forecasting how much
                      each system will generate and flagging when it falls short.</p>
                    <ul className="chips" data-reveal="">
                      <li>Artificial intelligence</li>
                      <li>Generation prediction</li>
                      <li>Performance monitoring</li>
                      <li>Intelligent analytics</li>
                    </ul>
                  </div>
                  <figure className="gen" data-reveal="">
                    <svg viewBox="0 0 600 340" role="img"
                      aria-label="Illustration: a solar generation curve over a day, with a predicted curve beside it">
                      <defs>
                        <linearGradient id="gFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0" style={{ stopColor: 'var(--accent)', stopOpacity: .4 }} />
                          <stop offset="1" style={{ stopColor: 'var(--accent)', stopOpacity: 0 }} />
                        </linearGradient>
                        <clipPath id="gClip">
                          <rect id="gClipR" x="0" y="0" width="600" height="340" />
                        </clipPath>
                      </defs>
                      <line className="gl" x1="20" y1="290" x2="580" y2="290" />
                      <line className="gl" x1="20" y1="210" x2="580" y2="210" strokeDasharray="3 6" />
                      <line className="gl" x1="20" y1="130" x2="580" y2="130" strokeDasharray="3 6" />
                      <line className="gl" x1="20" y1="50" x2="580" y2="50" strokeDasharray="3 6" />
                      <path d="M20 290 C 130 290, 180 50, 310 50 S 490 290, 580 290 L580 290 L20 290 Z" fill="url(#gFill)" clipPath="url(#gClip)" />
                      <path d="M20 290 C 120 288, 190 62, 310 60 S 480 280, 580 290" fill="none" stroke="var(--muted)" strokeWidth="2" strokeDasharray="5 7" opacity=".8" />
                      <path id="gLine" d="M20 290 C 130 290, 180 50, 310 50 S 490 290, 580 290" fill="none" stroke="var(--accent)" strokeWidth="3.5" strokeLinecap="round" />
                      <g id="gDot">
                        <circle r="16" style={{ fill: 'var(--accent)', opacity: .25 }} />
                        <circle r="7" style={{ fill: 'var(--accent)' }} />
                      </g>
                      <text className="ax" x="20" y="314">6 am</text>
                      <text className="ax" x="160" y="314" textAnchor="middle">9 am</text>
                      <text className="ax" x="300" y="314" textAnchor="middle">12 pm</text>
                      <text className="ax" x="440" y="314" textAnchor="middle">3 pm</text>
                      <text className="ax" x="580" y="314" textAnchor="end">6 pm</text>
                    </svg>
                    <figcaption>
                      <span>Solid: generation so far · Dashed: predicted</span>
                      <span>Output now <b id="gKw">0.0 kW</b></span>
                    </figcaption>
                  </figure>
                </div>
              </section>

              {/* Closing CTA */}
              <section className="sec cta-sec" id="demo">
                <div className="orb o1"></div>
                <div className="orb o2"></div>
                <div className="wrap">
                  <h2 className="display" data-split="">Run your solar business like a <em>system.</em></h2>
                  <p className="lead" data-reveal="">From the first enquiry to the final report, see how SIMS keeps every project, part
                    and payment in one place.</p>
                  <div className="btns" data-reveal="">
                    <a className="btn primary mag" href="#">Request a demo <svg><use href="#arrow" /></svg></a>
                    <a className="btn ghost mag" href="#platform">Explore the modules</a>
                  </div>
                </div>
              </section>

              {/* Footer */}
              <footer id="foot">
                <div className="wrap">
                  <div className="foot">
                    <div>
                      <a className="logo" href="#">
                        <svg className="sun" viewBox="0 0 40 40" aria-hidden="true"><use href="#sun" width="40" height="40" /></svg>
                        Solvix
                      </a>
                      <p>Solar, run as a system.</p>
                    </div>
                    <div>
                      <h6>Platform</h6>
                      <ul>
                        <li><a href="#platform">CRM</a></li>
                        <li><a href="#platform">Quotations</a></li>
                        <li><a href="#platform">Inventory</a></li>
                        <li><a href="#platform">Projects</a></li>
                        <li><a href="#platform">Warranty</a></li>
                        <li><a href="#platform">Finance &amp; analytics</a></li>
                      </ul>
                    </div>
                    <div>
                      <h6>Explore</h6>
                      <ul>
                        <li><a href="#story">About</a></li>
                        <li><a href="#flow">How it works</a></li>
                        <li><a href="#solutions">Solutions</a></li>
                        <li><a href="#roles">Roles</a></li>
                        <li><a href="#contact">Contact</a></li>
                        <li><a href="#future">Roadmap</a></li>
                      </ul>
                    </div>
                    <div>
                      <h6>Get started</h6>
                      <ul>
                        <li><a href="#demo">Request a demo</a></li>
                        <li><a href="#demo">Instant quote</a></li>
                      </ul>
                    </div>
                  </div>
                  <p className="legal" style={{ maxWidth: 'none' }}>&copy; 2026 Solvix. Dashboard figures on this page are illustrative.</p>
                </div>
              </footer>
            </div>
          </>
        } />
        <Route path="/signup" element={<SignUp navigate={navigate} initialRole="customer" initialMode="signup" />} />
        <Route path="/login/customer" element={<SignUp navigate={navigate} initialRole="customer" initialMode="signin" />} />
        <Route path="/login/employee" element={<SignUp navigate={navigate} initialRole="employee" initialMode="signin" />} />
        <Route path="/get-quote" element={<QuoteForm navigate={navigate} />} />
        <Route path="/register/customer" element={<RegisterCustomer />} />
        <Route path="/register/employee" element={<RegisterEmployee />} />

        {/* Sales & CRM Module Routes */}
        <Route path="/sales/dashboard" element={<SalesDashboard />} />
        <Route path="/sales/leads" element={<LeadsList />} />
        <Route path="/sales/leads/new" element={<NewLead />} />
        <Route path="/sales/leads/:id" element={<LeadDetail />} />
        <Route path="/sales/follow-ups" element={<FollowUpsList />} />
        <Route path="/sales/whatsapp-enquiries" element={<WhatsAppEnquiries />} />
        <Route path="/sales/customers" element={<CustomersList />} />
        <Route path="/sales/customers/:id" element={<CustomerDetail />} />

        {/* Quotations & Orders Module Routes */}
        <Route path="/sales/quotations" element={<QuotationsList />} />
        <Route path="/sales/quotations/new" element={<QuotationBuilder />} />
        <Route path="/sales/quotations/:id/edit" element={<QuotationBuilder />} />
        <Route path="/sales/quotations/:id" element={<QuotationDetail />} />
        <Route path="/sales/orders" element={<OrdersList />} />
        <Route path="/sales/orders/:id" element={<OrderDetail />} />

        {/* Customer Portal Routes */}
        <Route path="/customer/quotations" element={<CustomerQuotations />} />
        <Route path="/customer/quotations/:id" element={<CustomerQuotationDetail />} />
        <Route path="/customer/orders" element={<CustomerOrders />} />
        <Route path="/customer/orders/:id" element={<CustomerOrderDetail />} />

        {/* Admin Catalogue Routes */}
        <Route path="/admin/catalogue" element={<AdminCatalogue />} />

        <Route path="*" element={<NotFound />} />
      </Routes>

      {/* Mini floating toggle */}
      <div className="mini" id="mini" role="group" aria-label="Time of day">
        <button data-t="0" aria-pressed="false">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" />
          </svg>
          <span>Morning</span>
        </button>
        <button data-t="1" aria-pressed="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" />
          </svg>
          <span>Night</span>
        </button>
      </div>
    </>
  );
}
