/**
 * Firebase initialisation. All client-side Firebase access (Auth + Firestore)
 * is created here once and re-used across the app.
 *
 * Configuration is sourced from Vite environment variables (`VITE_FIREBASE_*`)
 * which are wired up in Replit Secrets. The values are public — Firebase web
 * SDK keys are intended to be exposed; access is enforced by Firebase Auth
 * rules and Firestore security rules.
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  type Auth,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
};

function assertConfig() {
  for (const [k, v] of Object.entries(cfg)) {
    if (!v) {
      // Surface a clear error rather than letting Firebase throw a cryptic one.
      throw new Error(
        `Missing Firebase config value for VITE_FIREBASE_${k
          .replace(/[A-Z]/g, (l) => `_${l}`)
          .toUpperCase()
          .replace(/^_/, "")}`,
      );
    }
  }
}

let _app: FirebaseApp | null = null;

export function firebaseApp(): FirebaseApp {
  if (_app) return _app;
  assertConfig();
  _app = getApps().length ? getApp() : initializeApp(cfg);
  return _app;
}

let _auth: Auth | null = null;
export function firebaseAuth(): Auth {
  if (_auth) return _auth;
  _auth = getAuth(firebaseApp());
  // Persist the signed-in user across reloads/tabs.
  void setPersistence(_auth, browserLocalPersistence).catch(() => {
    /* persistence may fail in private mode — fall back to in-memory */
  });
  return _auth;
}

let _db: Firestore | null = null;
export function firestore(): Firestore {
  if (_db) return _db;
  _db = getFirestore(firebaseApp());
  return _db;
}

/**
 * Map a 10-digit phone number to a synthetic email so it can be used with
 * Firebase Auth's email/password provider. The address is never sent — it's
 * just a stable opaque identifier.
 */
export function phoneToEmail(phone: string): string {
  return `${phone}@nv.users.local`;
}
