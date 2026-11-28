import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Package, FileText, Receipt, Truck, BarChart3, Smartphone,
  ShieldCheck, Lock, KeyRound, FolderLock, Route, MapPin, CalendarClock,
} from 'lucide-react';
import TopographicBackground from '../components/TopographicBackground';
import { LogoMark, Wordmark } from '../components/Brand';
import { useAuth } from '../auth/AuthContext';
import './landing.css';

const STATUSES = [
  ['Pending', 'var(--yellow)', 'Booked and waiting for pickup'],
  ['In Transit', 'var(--blue)', 'On the road'],
  ['Delivered', 'var(--green)', 'Dropped, paperwork in'],
  ['Invoiced', 'var(--accent)', 'Invoice sent to the broker'],
  ['Paid', 'var(--green)', 'Money in the bank'],
];

const FEATURES = [
  {
    icon: Package, title: 'Loads, start to finish',
    body: 'Pickup and delivery addresses, appointment times, rate, commodity and weight. Miles are worked out from the addresses, and rate per mile follows.',
    wide: true,
  },
  { icon: FileText, title: 'Paperwork on the load', body: 'Attach BOLs, rate confirmations, lumper receipts and detention slips. Preview them right in the app, named by broker and date.' },
  { icon: Receipt, title: 'Invoices in one click', body: 'A clean PDF invoice with your company header and MC number. The load moves to Invoiced on its own.' },
  { icon: Truck, title: 'Fleet and compliance', body: 'Drivers, trucks, trailers and brokers in one list, with CDL, insurance and registration expiry dates where you can see them.' },
  { icon: Smartphone, title: 'Made for the phone too', body: 'Add a load from the truck stop. The whole app works on a phone, with a quick add button always in reach.' },
  { icon: BarChart3, title: 'Know your numbers', body: 'Revenue by week or month, by driver and by broker. Rate per mile, what’s still owed, and a CSV export for your accountant.', full: true },
];

const STEPS = [
  ['Create your company account', 'Your name, your company and a password. You get a private workspace that only your company can see.'],
  ['Add your fleet', 'Enter your drivers, trucks, trailers and the brokers you haul for. It takes a few minutes, once.'],
  ['Book loads and get paid', 'Log each load, attach the paperwork, send the invoice and mark it paid when the money lands.'],
];

const SECURITY = [
  [FolderLock, 'A private workspace per company', 'Every request is checked on our server against your company. Other TruckFlow customers can’t see or change your loads, drivers, brokers or files.'],
  [KeyRound, 'Passwords stored as hashes', 'We never keep your password itself, only a bcrypt hash of it. Reset links expire after 30 minutes and work once.'],
  [Lock, 'Locked-down sessions', 'You stay signed in with a secure cookie that page scripts can’t read. Repeated wrong passwords pause the account, and you can sign out every device at once.'],
  [ShieldCheck, 'Private documents', 'Rate cons and BOLs are never on a public link. Only signed-in people from your company can open them.'],
];

function HeroMock() {
  const rows = [
    ['TF-00128', 'Chicago, IL', 'Dallas, TX', '$3,450', 'In Transit', 'var(--blue)'],
    ['TF-00127', 'Joliet, IL', 'Memphis, TN', '$1,980', 'Delivered', 'var(--green)'],
    ['TF-00126', 'Gary, IN', 'Columbus, OH', '$1,240', 'Invoiced', 'var(--accent)'],
    ['TF-00125', 'Elk Grove, IL', 'Atlanta, GA', '$2,760', 'Paid', 'var(--green)'],
  ];
  return (
    <div className="lp-mock" aria-hidden="true">
      <div className="lp-mock-bar"><i /><i /><i /><span>truckflow · Dashboard</span></div>
      <div className="lp-mock-body">
        <div className="lp-mock-hero">
          <div className="lp-k">Revenue · this month</div>
          <div className="lp-v">$48,920</div>
          <svg viewBox="0 0 300 70" className="lp-spark" preserveAspectRatio="none">
            <defs>
              <linearGradient id="lpSpark" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#D8BC86" stopOpacity=".35" />
                <stop offset="1" stopColor="#D8BC86" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0 58 L30 52 L60 55 L90 40 L120 44 L150 30 L180 34 L210 22 L240 26 L270 12 L300 8 L300 70 L0 70 Z" fill="url(#lpSpark)" />
            <path d="M0 58 L30 52 L60 55 L90 40 L120 44 L150 30 L180 34 L210 22 L240 26 L270 12 L300 8" fill="none" stroke="#D8BC86" strokeWidth="2" strokeLinejoin="round" />
            <circle cx="300" cy="8" r="3.5" fill="#D8BC86" />
          </svg>
          <div className="lp-mock-foot"><span>14 loads</span><span>$2.71 / mile</span></div>
        </div>
        <div className="lp-mock-side">
          <div className="lp-mock-tile"><div className="lp-k">Awaiting invoice</div><div className="lp-v sm">3</div></div>
          <div className="lp-mock-tile"><div className="lp-k">Miles</div><div className="lp-v sm">18,052</div></div>
        </div>
        <div className="lp-mock-list">
          {rows.map(([num, from, to, rate, status, color]) => (
            <div className="lp-mock-row" key={num}>
              <span className="lp-mono">{num}</span>
              <span className="lp-route">{from}<ArrowRight size={12} />{to}</span>
              <span className="lp-status"><i style={{ background: color, boxShadow: `0 0 10px ${color}` }} />{status}</span>
              <span className="lp-mono lp-rate">{rate}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const { status } = useAuth();
  const signedIn = status === 'in';

  useEffect(() => {
    const prev = document.title;
    document.title = 'TruckFlow · Fleet management for small carriers';
    return () => { document.title = prev; };
  }, []);

  const primaryCta = signedIn
    ? <Link to="/dashboard" className="lp-btn lp-btn-gold">Open your dashboard<ArrowRight size={16} /></Link>
    : <Link to="/signup" className="lp-btn lp-btn-gold">Create your company account<ArrowRight size={16} /></Link>;

  return (
    <div className="lp">
      <TopographicBackground forceDark />
      <a href="#main" className="lp-skip">Skip to content</a>

      <header className="lp-nav-wrap">
        <nav className="lp-nav" aria-label="Main">
          <Link to="/" className="lp-brand" aria-label="TruckFlow home">
            <LogoMark size={32} className="lp-logo" />
            <Wordmark size={25} />
          </Link>
          <div className="lp-links">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#security">Security</a>
          </div>
          <div className="lp-nav-cta">
            {signedIn ? (
              <Link to="/dashboard" className="lp-btn lp-btn-gold lp-btn-sm">Dashboard<ArrowRight size={14} /></Link>
            ) : (
              <>
                <Link to="/login" className="lp-btn lp-btn-ghost lp-btn-sm">Sign in</Link>
                <Link to="/signup" className="lp-btn lp-btn-gold lp-btn-sm">Get started</Link>
              </>
            )}
          </div>
        </nav>
      </header>

      <main id="main">
        {/* Hero */}
        <section className="lp-hero">
          <div className="lp-hero-copy">
            <div className="lp-eyebrow">For owner-operators and small carriers</div>
            <h1 className="lp-h1"><span>Every mile,</span><span className="lp-gold">accounted for.</span></h1>
            <p className="lp-lede">
              TruckFlow keeps your loads, drivers, equipment, paperwork and invoices in one quiet place, from the rate confirmation to the day you get paid.
            </p>
            <div className="lp-ctas">
              {primaryCta}
              {!signedIn && <Link to="/login" className="lp-btn lp-btn-ghost">Sign in</Link>}
            </div>
            <ul className="lp-proof">
              <li><Lock size={14} />Private workspace for your company</li>
              <li><Smartphone size={14} />Works on your phone</li>
            </ul>
          </div>
          <HeroMock />
        </section>

        {/* Load lifecycle */}
        <section className="lp-section lp-pipeline" aria-labelledby="pipe-h">
          <div className="lp-sec-head">
            <div className="lp-eyebrow">One board for every load</div>
            <h2 id="pipe-h" className="lp-h2">See where every load stands.</h2>
          </div>
          <ol className="lp-stages">
            {STATUSES.map(([name, color, sub]) => (
              <li key={name}>
                <span className="lp-stage-dot" style={{ background: color, boxShadow: `0 0 14px ${color}` }} />
                <strong>{name}</strong>
                <span>{sub}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* Features */}
        <section id="features" className="lp-section" aria-labelledby="feat-h">
          <div className="lp-sec-head">
            <div className="lp-eyebrow">What’s inside</div>
            <h2 id="feat-h" className="lp-h2">Everything a small fleet runs on.</h2>
            <p className="lp-sub">No spreadsheets passed around, no folders of PDFs on the dashboard of the truck.</p>
          </div>
          <div className="lp-bento">
            {FEATURES.map(({ icon: Icon, title, body, wide, full }) => (
              <article key={title} className={`lp-card${wide ? ' is-wide' : ''}${full ? ' is-full' : ''}`}>
                <span className="lp-icon"><Icon size={19} strokeWidth={1.8} /></span>
                <h3>{title}</h3>
                <p>{body}</p>
                {title === 'Loads, start to finish' && (
                  <div className="lp-load-chip" aria-hidden="true">
                    <span><MapPin size={13} />Chicago, IL</span>
                    <Route size={14} className="lp-chip-route" />
                    <span><MapPin size={13} />Dallas, TX</span>
                    <span className="lp-chip-sep" />
                    <span><CalendarClock size={13} />Tue 8:00 AM</span>
                    <span className="lp-mono">967 mi</span>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="lp-section" aria-labelledby="how-h">
          <div className="lp-sec-head">
            <div className="lp-eyebrow">Getting started</div>
            <h2 id="how-h" className="lp-h2">Up and running before your next pickup.</h2>
          </div>
          <ol className="lp-steps">
            {STEPS.map(([title, body], i) => (
              <li key={title}>
                <span className="lp-step-n">{i + 1}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Security */}
        <section id="security" className="lp-section lp-security" aria-labelledby="sec-h">
          <div className="lp-sec-head">
            <div className="lp-eyebrow">Security</div>
            <h2 id="sec-h" className="lp-h2">Your company’s data stays yours.</h2>
            <p className="lp-sub">Rates, customers and driver details are the business. TruckFlow is built so they stay private.</p>
          </div>
          <div className="lp-sec-grid">
            {SECURITY.map(([Icon, title, body]) => (
              <div key={title} className="lp-sec-item">
                <span className="lp-icon"><Icon size={18} strokeWidth={1.8} /></span>
                <div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Final call to action */}
        <section className="lp-final" aria-labelledby="final-h">
          <h2 id="final-h" className="lp-h2">Run the whole fleet <span className="lp-gold">from one place.</span></h2>
          <p className="lp-sub">Set up your company in a minute. Bring your loads over at your own pace.</p>
          <div className="lp-ctas" style={{ justifyContent: 'center' }}>{primaryCta}</div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-brand"><LogoMark size={26} className="lp-logo" /><Wordmark size={21} /></div>
        <div className="lp-foot-links">
          {signedIn ? <Link to="/dashboard">Dashboard</Link> : <><Link to="/login">Sign in</Link><Link to="/signup">Create account</Link></>}
        </div>
        <div className="lp-copy">© {new Date().getFullYear()} TruckFlow</div>
      </footer>
    </div>
  );
}
