import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { authApi, apiError } from '../utils/api';
import { useAuth } from '../auth/AuthContext';
import AuthShell, { AuthTitle, AuthField, PasswordRules, passwordOk, SubmitButton } from '../auth/AuthShell';
import useDocumentTitle from '../utils/useDocumentTitle';

export default function ResetPassword() {
  useDocumentTitle('Choose a new password');
  const navigate = useNavigate();
  const { signedIn } = useAuth();
  const [params] = useSearchParams();
  const [token] = useState(() => params.get('token') || '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Take the token out of the address bar so it isn't left in history or shared by accident
  useEffect(() => { if (params.get('token')) window.history.replaceState(null, '', '/reset-password'); }, [params]);

  const submit = async e => {
    e.preventDefault();
    setError('');
    const x = {};
    if (!passwordOk(password)) x.password = 'Your password needs all three items below.';
    if (confirm !== password) x.confirm = 'The passwords don’t match.';
    setErrors(x);
    if (Object.keys(x).length) return;
    setLoading(true);
    try {
      const { data } = await authApi.reset(token, password);
      signedIn(data);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  const validToken = /^[a-f0-9]{64}$/.test(token);

  return (
    <AuthShell headline={['A fresh', 'start.']} lede="Choose a new password. Every other device signed in to your account will be signed out.">
      {!validToken ? (
        <div className="auth-form">
          <AuthTitle eyebrow="Reset password" title="Link not valid" />
          <div className="auth-alert error" role="alert">This reset link is incomplete or has expired. Request a new one and use the newest email.</div>
          <Link className="auth-submit" to="/forgot-password" style={{ textDecoration: 'none' }}>Request a new link<ArrowRight size={15} strokeWidth={1.7} /></Link>
        </div>
      ) : (
        <form className="auth-form" onSubmit={submit} noValidate>
          <AuthTitle eyebrow="Reset password" title="Choose a new password" />
          {error && (
            <div className="auth-alert error" role="alert">
              {error} <Link className="auth-link" to="/forgot-password">Request a new link</Link>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <AuthField id="rp-password" label="New password" type="password" value={password}
              onChange={e => { setPassword(e.target.value); setErrors(x => ({ ...x, password: undefined })); }}
              autoComplete="new-password" error={errors.password} autoFocus />
            <PasswordRules value={password} />
          </div>
          <AuthField id="rp-confirm" label="Confirm new password" type="password" value={confirm}
            onChange={e => { setConfirm(e.target.value); setErrors(x => ({ ...x, confirm: undefined })); }}
            autoComplete="new-password" error={errors.confirm} />
          <SubmitButton loading={loading} loadingText="Saving…">Save new password<ArrowRight size={15} strokeWidth={1.7} /></SubmitButton>
        </form>
      )}
    </AuthShell>
  );
}
