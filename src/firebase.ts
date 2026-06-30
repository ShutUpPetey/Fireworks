import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue } from 'firebase/database';
import type { DatabaseReference } from 'firebase/database';
import { firebaseConfig } from './firebase-config';

export const isConfigured = !firebaseConfig.apiKey.startsWith('YOUR_');

export let showRef: DatabaseReference | null = null;

if (isConfigured) {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getDatabase(app);
    showRef = ref(db, 'fireworks-show');
  } catch (e) {
    console.warn('Firebase init failed — running in local-only mode', e);
  }
}

export { set, onValue };
