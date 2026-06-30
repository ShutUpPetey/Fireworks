// ─────────────────────────────────────────────────────────────────────────────
// Firebase Realtime Database configuration
//
// Setup steps (takes ~2 minutes):
//   1. Go to https://console.firebase.google.com → Create a project
//   2. Click "Add app" → Web → register the app → copy the config below
//   3. In the left sidebar: Build → Realtime Database → Create database
//      Choose a region → Start in TEST MODE (allows public read/write)
//   4. Optional: change rules for permanent access:
//      {
//        "rules": { ".read": true, ".write": true }
//      }
//
// Replace every "YOUR_..." value below with your project's values.
// ─────────────────────────────────────────────────────────────────────────────
export const firebaseConfig = {
  apiKey:            'YOUR_API_KEY',
  authDomain:        'YOUR_PROJECT_ID.firebaseapp.com',
  databaseURL:       'https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com',
  projectId:         'YOUR_PROJECT_ID',
  storageBucket:     'YOUR_PROJECT_ID.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId:             'YOUR_APP_ID',
};
