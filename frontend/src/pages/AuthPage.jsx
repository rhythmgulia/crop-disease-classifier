import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Leaf, ShieldCheck, Sparkles } from 'lucide-react';
import { signIn, signUp } from '../api/client';

export default function AuthPage({ onAuthenticated, onBack, initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode);
  const [role, setRole] = useState('farmer');
  const [form, setForm] = useState({ name: '', email: '', password: '', invite_code: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault(); setError('');
    if (mode === 'signup') {
      const password = form.password;
      const strongEnough = password.length >= 8 && password.length <= 20 &&
        /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9\s]/.test(password);
      if (!strongEnough) {
        setError('Use 8–20 characters, including an uppercase letter, a number, and a symbol.');
        return;
      }
    }
    setBusy(true);
    try {
      const payload = mode === 'login'
        ? await signIn({ email: form.email, password: form.password })
        : await signUp({ ...form, role });
      localStorage.setItem('agrovision_token', payload.access_token);
      onAuthenticated(payload.user);
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not connect to the service. Please try again.');
    } finally { setBusy(false); }
  }

  return <div className="auth-screen" id="top">
    <div className="auth-main">
    <aside className="auth-story">
      <div className="brand-lockup"><span className="brand-mark"><Leaf size={21}/></span><span>Wisteria</span></div>
      <div className="story-copy">
        <div className="eyebrow"><Sparkles size={14}/> AI crop health, with human expertise</div>
        <h1>Know your crops.<br/><em>Grow with confidence.</em></h1>
        <p>Get an instant AI diagnosis, then let an agronomist confirm it. Clear next steps for every scan, all in one place.</p>
        <div className="story-orbit"><div className="leaf-art"><Leaf size={116} strokeWidth={1}/><span/><span/><span/></div><div className="floating-note"><ShieldCheck size={17}/><span><b>Expert checked</b><small>Diagnosis approved</small></span><i>✓</i></div></div>
      </div>
      <div className="story-foot"><span>Plant health, made clearer.</span><span>01 / 03</span></div>
    </aside>
    <main className="auth-panel">
      <div className="auth-form-wrap" id="signin">
        {onBack && <button type="button" className="auth-back" onClick={onBack}><ArrowLeft size={15}/> Back to home</button>}
        <div className="auth-mobile-brand"><span className="brand-mark"><Leaf size={20}/></span> Wisteria</div>
        <div className="auth-heading"><span className="eyebrow">WELCOME TO WISTERIA</span><h2>{mode === 'login' ? 'Good to see you again' : 'Create your account'}</h2><p>{mode === 'login' ? 'Sign in to continue to your workspace.' : 'Set up a secure workspace for your crop health.'}</p></div>
        {mode === 'signup' && <div className="role-switch" aria-label="Choose account type"><button type="button" className={role === 'farmer' ? 'selected' : ''} onClick={() => setRole('farmer')}>Farmer</button><button type="button" className={role === 'agronomist' ? 'selected' : ''} onClick={() => setRole('agronomist')}>Agronomist</button></div>}
        <form className="auth-form" onSubmit={submit}>
          {mode === 'signup' && <label>Full name<input autoComplete="name" value={form.name} onChange={e => setForm({...form, name:e.target.value})} placeholder="Your name" required minLength={2}/></label>}
          <label>Email address<input type="email" autoComplete="email" value={form.email} onChange={e => setForm({...form, email:e.target.value})} placeholder="you@example.com" required/></label>
          <label>Password<input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={form.password} onChange={e => setForm({...form, password:e.target.value})} placeholder={mode === 'signup' ? '8–20 characters, uppercase, number, symbol' : 'Your password'} required minLength={mode === 'signup' ? 8 : undefined} maxLength={mode === 'signup' ? 20 : undefined} title="Use 8–20 characters, including an uppercase letter, a number, and a symbol."/>{mode === 'signup' && <small className="password-hint">8–20 characters, including at least one uppercase letter, number, and symbol.</small>}</label>
          {mode === 'signup' && role === 'agronomist' && <label>Agronomist invite code<input value={form.invite_code} onChange={e => setForm({...form, invite_code:e.target.value})} placeholder="Provided by your administrator" required/></label>}
          {error && <div className="auth-error" role="alert">{error}</div>}
          <button className="auth-submit" type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}<ArrowRight size={17}/></button>
        </form>
        <p className="auth-toggle">{mode === 'login' ? 'New to Wisteria?' : 'Already have an account?'} <button type="button" onClick={() => {setMode(mode === 'login' ? 'signup' : 'login'); setError('');}}> {mode === 'login' ? 'Create account' : 'Sign in'}</button></p>
        <p className="auth-privacy">Your account and scan history stay private to your workspace.</p>
      </div>
    </main>
    </div>
  </div>;
}
