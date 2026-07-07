import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, get, remove } from 'firebase/database';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as _signOut } from 'firebase/auth';
import type { DatabaseReference } from 'firebase/database';
import { firebaseConfig } from './firebase-config';

export const BOOTSTRAP_ADMIN_EMAIL = 'matthewinder@gmail.com';
export const isConfigured = !firebaseConfig.apiKey.startsWith('YOUR_');
export const googleProvider = new GoogleAuthProvider();

export let showRef: DatabaseReference | null = null;
export let db: ReturnType<typeof getDatabase> | null = null;
export let auth: ReturnType<typeof getAuth> | null = null;

if (isConfigured) {
  try {
    const app = initializeApp(firebaseConfig);
    db = getDatabase(app);
    auth = getAuth(app);
    showRef = ref(db, 'fireworks-show');
  } catch (e) {
    console.warn('Firebase init failed — running in local-only mode', e);
  }
}

export function signInWithGoogle() {
  if (!auth) return Promise.reject(new Error('Firebase not configured'));
  return signInWithPopup(auth, googleProvider);
}

export function signOut() {
  return auth ? _signOut(auth) : Promise.resolve();
}

export function emailToKey(email: string) {
  return email.replace(/\./g, ',');
}

export { set, onValue, get, ref, remove };
