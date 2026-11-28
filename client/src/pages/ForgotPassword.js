import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { authApi, apiError } from '../utils/api';
import AuthShell, { AuthTitle, AuthField, SubmitButton } from '../auth/AuthShell';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.forgot(email.trim());
      setSentTo(email.trim());
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell headline={['Back on', 'the road.']} lede="We’ll email you a link to choose a new password.">
      {sentTo ? (
        <div className="auth-form">
          <AuthTitle eyebrow="Check your email" title="Link sent" />
          <div className="auth-alert success" role="status">
            If <strong>{sentTo}</strong> has a TruckFlow account, a reset link is on its way. It works once and expires in 30 minutes.
          </div>
          <p className="auth-hint" style={{ margin: 0 }}>No email after a few minutes? Check your spam folder, or <button type="button" className="auth-link" style={{ background: 'none', border: 0, padding: 0, font: 'inherit', cursor: 'pointer' }} onClick={() => setSentTo('')}>try again</button>.</p>
          <div className="auth-sep" />
          <div className="auth-foot"><Link className="auth-link" to="/login"><ArrowLeft size={14} style={{ verticalAlign: '-2px' }} /> Back to sign in</Link></div>
        </div>
      ) : (
        <form className="auth-form" onSubmit={submit} noValidate>
          <AuthTitle eyebrow="Forgot password" title="Reset your password">
            Enter the email you sign in with.
          </AuthTitle>
          {error && <div className="auth-alert error" role="alert">{error}</div>}
          <AuthField id="fp-email" label="Email" type="email" placeholder="you@company.com"
            value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" autoFocus required />
          <SubmitButton loading={loading} loadingText="Sending…">Send reset link<ArrowRight size={15} strokeWidth={1.7} /></SubmitButton>
          <div className="auth-sep" />
          <div className="auth-foot"><Link className="auth-link" to="/login"><ArrowLeft size={14} style={{ verticalAlign: '-2px' }} /> Back to sign in</Link></div>
        </form>
      )}
    </AuthShell>
  );
}
