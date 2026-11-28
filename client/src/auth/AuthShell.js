import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Check } from 'lucide-react';
import TopographicBackground from '../components/TopographicBackground';
import { LogoMark, Wordmark } from '../components/Brand';
import './auth.css';

// Two-panel frame shared by sign in, sign up and password reset
export default function AuthShell({ headline = ['Every mile,', 'accounted for.'], lede, points, children }) {
  return (
    <div className="auth-root">
      <TopographicBackground forceDark />
      <section className="auth-brand">
        <Link to="/" className="auth-home" aria-label="TruckFlow home">
          <LogoMark size={44} className="auth-logo" />
          <Wordmark size={32} />
        </Link>

        <svg className="auth-route" viewBox="0 0 560 260" aria-hidden="true">
          <path d="M20 220 C 140 220, 160 80, 300 90 S 460 40, 540 30" fill="none" stroke="rgba(205,176,122,0.55)" strokeWidth="1.2" strokeDasharray="2 7" strokeLinecap="round" />
          <path d="M20 240 C 180 240, 240 160, 360 150 S 500 120, 540 110" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
          <circle cx="20" cy="220" r="5" fill="#0A0A0B" stroke="#D8BC86" strokeWidth="1.4" />
          <circle cx="300" cy="90" r="3" fill="#D8BC86" />
          <circle cx="540" cy="30" r="5" fill="#D8BC86" />
        </svg>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 520 }}>
          <h1 className="auth-headline"><span>{headline[0]}</span><span>{headline[1]}</span></h1>
          {lede && <p className="auth-lede">{lede}</p>}
          {points && (
            <ul className="auth-points">
              {points.map(p => <li key={p}><Check size={16} strokeWidth={2.2} />{p}</li>)}
            </ul>
          )}
        </div>
      </section>

      <main className="auth-main">{children}</main>
    </div>
  );
}

export function AuthTitle({ eyebrow, title, children }) {
  return (
    <div className="auth-title">
      {eyebrow && <div className="auth-label">{eyebrow}</div>}
      <h2>{title}</h2>
      {children && <p>{children}</p>}
    </div>
  );
}

export function AuthField({ id, label, error, hint, aside, type = 'text', inputRef, ...input }) {
  const [show, setShow] = useState(false);
  const isPw = type === 'password';
  return (
    <div className="auth-fieldset">
      <div className="auth-row">
        <label className="auth-label" htmlFor={id}>{label}</label>
        {aside}
      </div>
      <div className={`auth-field${error ? ' has-error' : ''}`}>
        <input
          id={id}
          ref={inputRef}
          type={isPw && show ? 'text' : type}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
          {...input}
        />
        {isPw && (
          <button type="button" className="auth-eye" onClick={() => setShow(s => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
            {show ? <EyeOff size={17} strokeWidth={1.5} /> : <Eye size={17} strokeWidth={1.5} />}
          </button>
        )}
      </div>
      {error ? <div className="auth-field-error" id={`${id}-err`}>{error}</div>
        : hint ? <div className="auth-hint" id={`${id}-hint`}>{hint}</div> : null}
    </div>
  );
}

// Same rules the server enforces
export const PASSWORD_RULES = [
  ['10+ characters', pw => pw.length >= 10],
  ['A letter', pw => /[A-Za-z]/.test(pw)],
  ['A number or symbol', pw => /[0-9\W_]/.test(pw)],
];
export const passwordOk = pw => PASSWORD_RULES.every(([, test]) => test(pw)) && new TextEncoder().encode(pw).length <= 72;

export function PasswordRules({ value }) {
  return (
    <ul className="auth-rules" aria-label="Password requirements">
      {PASSWORD_RULES.map(([label, test]) => {
        const ok = test(value);
        return <li key={label} className={ok ? 'ok' : ''}><i />{label}<span className="sr-only">{ok ? ' (done)' : ''}</span></li>;
      })}
    </ul>
  );
}

export function SubmitButton({ loading, loadingText, children }) {
  return (
    <button type="submit" className="auth-submit" disabled={loading}>
      {loading ? <><div className="spinner" />{loadingText}</> : children}
    </button>
  );
}
