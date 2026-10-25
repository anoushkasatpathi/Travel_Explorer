// Firebase setup (Auth + Firestore).
//
// Config comes from EXPO_PUBLIC_FIREBASE_* variables in .env (see .env.example).
// If any required value is missing, `firebaseEnabled` is false and the app keeps
// working exactly like before: local-only, data stored with AsyncStorage.

import { getApp, getApps, initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';
import { createAuth } from './firebaseAuth'; // .native.js / .web.js picked by Metro

const env = (v) => (v || '').trim();
const isPlaceholder = (v) => !v || v.startsWith('your_');

export const firebaseConfig = {
  apiKey: env(process.env.EXPO_PUBLIC_FIREBASE_API_KEY),
  authDomain: env(process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN),
  projectId: env(process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID),
  storageBucket: env(process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: env(process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
  appId: env(process.env.EXPO_PUBLIC_FIREBASE_APP_ID),
};

const REQUIRED = ['apiKey', 'authDomain', 'projectId', 'appId'];
export const missingFirebaseKeys = REQUIRED.filter((k) => isPlaceholder(firebaseConfig[k]));

let app = null;
let auth = null;
let db = null;
let initError = null;

if (missingFirebaseKeys.length === 0) {
  try {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    auth = createAuth(app);
    // Long-polling auto-detection makes Firestore realtime listeners reliable
    // on mobile networks/proxies where WebChannel streaming is blocked.
    db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
  } catch (e) {
    initError = e;
    app = auth = db = null;
    console.warn('Firebase failed to initialise, using local mode:', e.message);
  }
}

export const firebaseEnabled = !!(app && auth && db);
export { app, auth, db, initError };
