import { useState } from 'react';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';
import { request } from '../lib/api';
import { IconButton } from '../components/IconButton';

export function LoginPage({ onLogin }) {
  // Keep credentials and form feedback local to this page.
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      // Refresh the app's auth status after the server accepts the credentials.
      await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
      setPassword('');
      onLogin();
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }

  return <main className="login-page">
    <div className="login-brand"><Link className="logo" to="/"><span className="logo-mark">lr</span> MJ Pluse</Link><img src="/assets/eye.gif" alt="" width="96" height="96" /></div>
    <section className="login-content" aria-labelledby="login-title">
      <p className="kicker">YOUR SPACE</p><h1 id="login-title">Welcome back</h1>
      <form className="login-form" onSubmit={submit}>
        <label htmlFor="login-username">Username</label>
        <input id="login-username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} value={username} onChange={event => setUsername(event.target.value)} maxLength={100} required disabled={busy} />
        <label htmlFor="login-password">Password</label>
        <div className="login-password"><input id="login-password" name="password" type={visible ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} maxLength={256} required disabled={busy} /><IconButton icon={visible ? EyeOff : Eye} label={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible(current => !current)} disabled={busy} /></div>
        {error && <p className="login-error" role="alert">{error}</p>}
        <button className="primary-button command-button" type="submit" disabled={busy}><LogIn size={17} aria-hidden="true" />{busy ? 'Signing in...' : 'Sign in'}</button>
      </form>
    </section>
  </main>;
}