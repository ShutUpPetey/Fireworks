import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db, signInWithGoogle, signOut, BOOTSTRAP_ADMIN_EMAIL, emailToKey, ref, get, set } from '../firebase';

export interface AuthUser {
  uid: string;
  email: string;
  name: string;
  role: 'admin' | 'member';
  joinedAt: number;
}

interface Props {
  children: (user: AuthUser) => React.ReactNode;
}

type AuthState = 'loading' | 'unauthenticated' | 'checking' | 'authorized' | 'unauthorized';

export default function AuthGate({ children }: Props) {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    // No Firebase configured — local-only mode, skip auth
    if (!auth || !db) {
      setAuthUser({ uid: 'local', email: 'local', name: 'Local User', role: 'admin', joinedAt: 0 });
      setAuthState('authorized');
      return;
    }

    const unsub = onAuthStateChanged(auth, async firebaseUser => {
      if (!firebaseUser?.email) {
        setAuthState('unauthenticated');
        setAuthUser(null);
        return;
      }

      setAuthState('checking');

      try {
        // 1. Already registered?
        const userSnap = await get(ref(db!, `allowed_users/${firebaseUser.uid}`));
        if (userSnap.exists()) {
          setAuthUser(userSnap.val() as AuthUser);
          setAuthState('authorized');
          return;
        }

        // 2. Bootstrap: very first user + admin email
        const allSnap = await get(ref(db!, 'allowed_users'));
        if (!allSnap.exists() && firebaseUser.email === BOOTSTRAP_ADMIN_EMAIL) {
          const adminUser: AuthUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName || 'Admin',
            role: 'admin',
            joinedAt: Date.now(),
          };
          await set(ref(db!, `allowed_users/${firebaseUser.uid}`), adminUser);
          setAuthUser(adminUser);
          setAuthState('authorized');
          return;
        }

        // 3. Pre-authorized via invite?
        const inviteKey = emailToKey(firebaseUser.email);
        const inviteSnap = await get(ref(db!, `invited_emails/${inviteKey}`));
        if (inviteSnap.exists()) {
          const newUser: AuthUser & { emailKey: string } = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            emailKey: inviteKey,
            name: firebaseUser.displayName || firebaseUser.email,
            role: 'member',
            joinedAt: Date.now(),
          };
          await set(ref(db!, `allowed_users/${firebaseUser.uid}`), newUser);
          setAuthUser(newUser);
          setAuthState('authorized');
          return;
        }

        setAuthState('unauthorized');
      } catch (e) {
        console.error('Auth check failed:', e);
        setError('Unable to verify access. Check your connection and try again.');
        setAuthState('unauthorized');
      }
    });

    return unsub;
  }, []);

  const handleSignIn = async () => {
    setError('');
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (e: any) {
      if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') {
        setError('Sign-in failed. Please try again.');
      }
    } finally {
      setSigningIn(false);
    }
  };

  if (authState === 'loading' || authState === 'checking') {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="text-slate-400 text-sm animate-pulse">Loading…</div>
      </div>
    );
  }

  if (authState === 'unauthenticated') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-900 gap-6">
        <div className="flex items-center gap-2.5">
          <span className="text-4xl">🎆</span>
          <span className="text-2xl font-bold text-white tracking-tight">FireworksFX</span>
        </div>
        <p className="text-slate-400 text-sm">Sign in to access your show planner</p>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          onClick={handleSignIn}
          disabled={signingIn}
          className="flex items-center gap-3 bg-white hover:bg-gray-50 disabled:opacity-60 text-gray-700 font-medium rounded-xl px-6 py-3 text-sm transition-colors shadow-lg"
        >
          <GoogleIcon />
          {signingIn ? 'Signing in…' : 'Sign in with Google'}
        </button>
      </div>
    );
  }

  if (authState === 'unauthorized') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-900 gap-4 text-center px-6">
        <span className="text-5xl">🔒</span>
        <h2 className="text-white text-lg font-semibold">Access not granted</h2>
        <p className="text-slate-400 text-sm max-w-xs">
          Your account hasn't been authorized. Ask the show admin to add your Google email address.
        </p>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          onClick={() => { signOut(); setAuthState('unauthenticated'); setError(''); }}
          className="mt-2 text-slate-400 hover:text-white text-sm underline underline-offset-2 transition-colors"
        >
          Sign out and try a different account
        </button>
      </div>
    );
  }

  return <>{children(authUser!)}</>;
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
      <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
      <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
      <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
    </svg>
  );
}
