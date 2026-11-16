import { useState } from 'react';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { auth } from '../config/firebase';

export function AuthPanel({ user }: { user: User | null }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(undefined);
    try {
      await fn();
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message.replace('Firebase: ', '') : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (user) {
    return (
      <div className="auth">
        <span className="auth-name" title={user.email ?? ''}>
          {user.displayName || user.email}
        </span>
        <button className="btn-ghost" onClick={() => signOut(auth)}>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="auth">
      <button className="btn" onClick={() => setOpen((o) => !o)}>
        Sign in
      </button>
      {open && (
        <div className="auth-pop" role="dialog" aria-label="Sign in">
          <button className="btn wide" disabled={busy} onClick={() => run(() => signInWithPopup(auth, new GoogleAuthProvider()))}>
            Continue with Google
          </button>
          <div className="or">or</div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(() =>
                mode === 'signin'
                  ? signInWithEmailAndPassword(auth, email, password)
                  : createUserWithEmailAndPassword(auth, email, password),
              );
            }}
          >
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            />
            <button className="btn wide" disabled={busy} type="submit">
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>
          <button className="link" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
            {mode === 'signin' ? 'New here? Create an account' : 'Have an account? Sign in'}
          </button>
          {error && <p className="error">{error}</p>}
        </div>
      )}
    </div>
  );
}
